"""
Background tasks for processing evaluation jobs.
"""

import sys
from pathlib import Path
import asyncio
from datetime import datetime, timezone
from typing import List, Dict, Any
import httpx

from app.models.db_schema import (
    Job,
    JobStatus,
    EvalCaseResult,
    MetricBreakdown,
    ScoreSummary,
    init_db,
)
from app.services.ragas import validate_dataset, evaluate_dataset


# Add the server directory to Python path
server_dir = Path(__file__).resolve().parent.parent.parent
if str(server_dir) not in sys.path:
    sys.path.insert(0, str(server_dir))


# -------------- Helper functions --------------
async def query_participant_backend(
    submission_url: str, question: str, top_k: int = 5, timeout: int = 30
) -> dict:
    """Call participant's RAG endpoint with a question and top_k parameter.

    Expected JSON response shape:
      {"answer": str, "contexts": List[str]}
    """
    async with httpx.AsyncClient(timeout=timeout) as client:
        try:
            resp = await client.post(
                submission_url, json={"question": question, "top_k": top_k}
            )
            resp.raise_for_status()
            data = resp.json() or {}
            return {
                "answer": data.get("answer"),
                "contexts": data.get("contexts", []),
                "error": None,
            }
        except httpx.TimeoutException:
            return {"answer": None, "contexts": [], "error": "timeout"}
        except httpx.HTTPStatusError as e:
            return {
                "answer": None,
                "contexts": [],
                "error": f"http_{e.response.status_code}",
            }
        except Exception as e:
            return {"answer": None, "contexts": [], "error": str(e)}


def build_ragas_dataset_from_responses(
    dataset: List[Dict[str, Any]], responses: List[dict]
) -> Dict[str, Any]:
    """Build RAGAS-compatible dataset dict from original QA pairs and participant responses.

    Args:
        dataset: Original list of {"question": str, "answer": str} dicts
        responses: List of {"answer": str|None, "contexts": List[str], "error": str|None}

    Returns:
        Dict with keys: question, answer, contexts, ground_truths (all lists)
    """
    questions = []
    answers = []
    contexts_list = []
    ground_truths = []

    for item, resp in zip(dataset, responses):
        # Only include samples where participant returned valid response
        if resp["error"] is None and resp["answer"]:
            questions.append(str(item.get("question", "")))
            answers.append(str(resp["answer"]))
            contexts_list.append(resp["contexts"] if resp["contexts"] else [])
            ground_truths.append(str(item.get("answer", "")))

    return {
        "question": questions,
        "answer": answers,
        "contexts": contexts_list,
        "ground_truths": ground_truths,
    }


def map_ragas_to_metric_breakdown(ragas_row: dict) -> MetricBreakdown:
    """Convert RAGAS per-sample result to MetricBreakdown."""
    return MetricBreakdown(
        context_precision=ragas_row.get("context_precision", 0.0),
        context_recall=ragas_row.get("context_recall", 0.0),
        answer_relevancy=ragas_row.get("answer_relevancy", 0.0),
        faithfulness=ragas_row.get("faithfulness", 0.0),
    )


def build_score_summary(ragas_scores: dict) -> ScoreSummary:
    """Convert RAGAS aggregated scores to ScoreSummary with weighted overall score.

    Weights:
    - Answer Relevancy: 30%
    - Answer Correctness: 30%
    - Context Relevance (nv_context_relevance): 25%
    - Faithfulness: 15%
    """
    # Try new metric names first, fall back to old names
    rel = ragas_scores.get("answer_relevancy", 0.0)
    correctness = ragas_scores.get(
        "answer_correctness", ragas_scores.get("faithfulness", 0.0)
    )
    context_rel = ragas_scores.get(
        "nv_context_relevance", ragas_scores.get("context_precision", 0.0)
    )
    fai = ragas_scores.get("faithfulness", 0.0)

    # Weighted overall score
    overall = (rel * 0.30) + (correctness * 0.30) + (context_rel * 0.25) + (fai * 0.15)

    # Store in ScoreSummary (keeping field names for compatibility)
    return ScoreSummary(
        avg_context_precision=context_rel,  # Now stores nv_context_relevance
        avg_context_recall=fai,  # Now stores faithfulness
        avg_answer_relevancy=rel,
        avg_faithfulness=correctness,  # Now stores answer_correctness
        overall_score=overall,
    )


# -------------- Runner --------------
async def run_evaluation_async(
    job_id: str,
    team_id: str,
    submission_url: str,
    dataset: List[Dict[str, Any]],
    top_k: int = 5,
) -> None:
    """Run evaluation over provided dataset using RAGAS and update Job document."""
    # Ensure DB is initialized in this worker process
    await init_db()

    job = await Job.get(job_id)
    if not job:
        print(f"Job {job_id} not found")
        return

    try:
        job.status = JobStatus.RUNNING
        job.started_at = datetime.now(timezone.utc)
        job.total_cases = len(dataset)
        await job.save()

        # Step 1: Query participant endpoint for all questions
        print(
            f"[{job_id}] Querying participant endpoint for {len(dataset)} questions (top_k={top_k})..."
        )
        responses: List[dict] = []

        for idx, item in enumerate(dataset):
            q = str(item.get("question", ""))
            print(f"[{job_id}] {idx+1}/{len(dataset)}: {q[:60]}...")

            resp = await query_participant_backend(submission_url, q, top_k=top_k)
            responses.append(resp)

            # Update progress and save after each query
            job.processed_cases = idx + 1
            await job.save()
            await asyncio.sleep(0.1)  # Small delay to avoid rate limits

        # Step 2: Build RAGAS dataset from responses
        print(f"[{job_id}] Building RAGAS dataset...")
        ragas_dataset = build_ragas_dataset_from_responses(dataset, responses)

        if not validate_dataset(ragas_dataset):
            raise ValueError("Built dataset is invalid for RAGAS evaluation")

        valid_count = len(ragas_dataset["question"])
        print(f"[{job_id}] Valid responses: {valid_count}/{len(dataset)}")

        # Step 3: Run RAGAS evaluation on the whole dataset
        print(f"[{job_id}] Running RAGAS evaluation (this may take a while)...")
        ragas_result = evaluate_dataset(ragas_dataset)

        if not ragas_result.get("ok"):
            raise ValueError(f"RAGAS evaluation failed: {ragas_result.get('error')}")

        # Step 4: Build EvalCaseResult objects with RAGAS metrics
        results: List[EvalCaseResult] = []
        ragas_per_sample = ragas_result.get("results", [])

        valid_idx = 0  # Track index in valid responses
        for idx, (item, resp) in enumerate(zip(dataset, responses)):
            q = str(item.get("question", ""))
            gt = str(item.get("answer", ""))

            if resp["error"]:
                # Error case - no metrics
                result = EvalCaseResult(
                    question=q,
                    ground_truth=gt,
                    predicted_answer=None,
                    error=resp["error"],
                )
            else:
                # Valid response - get RAGAS metrics if available
                metrics = MetricBreakdown()  # Default zeros
                if ragas_per_sample and valid_idx < len(ragas_per_sample):
                    metrics = map_ragas_to_metric_breakdown(ragas_per_sample[valid_idx])
                    valid_idx += 1

                result = EvalCaseResult(
                    question=q,
                    ground_truth=gt,
                    predicted_answer=resp["answer"],
                    metrics=metrics,
                    error=None,
                )

            results.append(result)

            # Save job after adding each result to persist progress
            job.results = results
            await job.save()

        # Step 5: Finalize job with aggregated scores
        scores = build_score_summary(ragas_result.get("scores", {}))

        job.results = results
        job.scores = scores
        job.total_score = scores.overall_score
        job.status = JobStatus.COMPLETED
        job.finished_at = datetime.now(timezone.utc)
        await job.save()

        print(f"[{job_id}] Evaluation complete!")
        print(f"  Valid responses: {valid_count}/{len(dataset)}")
        print(f"  Overall score: {scores.overall_score:.4f}")
        print(f"  Context Precision: {scores.avg_context_precision:.4f}")
        print(f"  Context Recall: {scores.avg_context_recall:.4f}")
        print(f"  Answer Relevancy: {scores.avg_answer_relevancy:.4f}")
        print(f"  Faithfulness: {scores.avg_faithfulness:.4f}")

    except Exception as e:
        job.status = JobStatus.FAILED
        job.finished_at = datetime.now(timezone.utc)
        job.error_message = str(e)
        await job.save()
        print(f"[{job_id}] Job failed: {e}")
        raise


def run_evaluation_task(
    job_id: str,
    team_id: str,
    submission_url: str,
    dataset: List[Dict[str, Any]],
    top_k: int = 5,
) -> dict:
    """Entry-point for RQ worker to execute evaluation."""
    print(
        f"Starting job {job_id} for team {team_id} with {len(dataset)} test cases (top_k={top_k})"
    )
    asyncio.run(run_evaluation_async(job_id, team_id, submission_url, dataset, top_k))
    print(f"Completed job {job_id}")
    return {"status": "completed", "job_id": job_id}
