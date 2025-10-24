"""
Background tasks for processing evaluation jobs.
"""

import sys
from pathlib import Path
import asyncio
from datetime import datetime, timezone
from typing import List, Dict, Any, Union
import math
import httpx
import os
import json

from app.models.db_schema import (
    Job,
    JobStatus,
    EvalCaseResult,
    MetricBreakdown,
    ScoreSummary,
    init_db,
)
from app.services.ragas import validate_dataset, evaluate_dataset
from langchain_mistralai import ChatMistralAI
from dotenv import load_dotenv

load_dotenv()
DEBUG_LOG = os.getenv("DEBUG", "false").lower() == "true"


# Add the server directory to Python path
server_dir = Path(__file__).resolve().parent.parent.parent
if str(server_dir) not in sys.path:
    sys.path.insert(0, str(server_dir))


# -------------- Helper functions --------------
def _normalize_dataset_input(
    dataset: Union[List[Dict[str, Any]], Dict[str, List[Any]]],
) -> List[Dict[str, str]]:
    """Normalize incoming dataset to a list of {question, answer} dicts.

    Supports two shapes:
      1) List[ {"question": str, "answer"|"ground_truth"|"ground_truths": str} ]
      2) Dict with parallel lists: {"question": [...], "ground_truths"|"answers": [...]}.

    Returns a list of dicts with canonical keys: {"question": str, "answer": str}.
    """
    normalized: List[Dict[str, str]] = []

    # Case 2: dict of lists
    if isinstance(dataset, dict):
        questions = dataset.get("question") or dataset.get("questions") or []
        gts = dataset.get("ground_truths") or dataset.get("answers") or []
        if not isinstance(questions, list) or not isinstance(gts, list):
            return normalized
        for q, gt in zip(questions, gts):
            normalized.append({"question": str(q), "answer": str(gt)})
        return normalized

    # Case 1: list of dicts
    if isinstance(dataset, list):
        for item in dataset:
            if not isinstance(item, dict):
                continue
            q = item.get("question")
            # Look for multiple possible keys for the ground truth
            gt = item.get("answer")
            if gt is None:
                gt = item.get("ground_truth")
            if gt is None:
                gt = item.get("ground_truths")
            if q is None or gt is None:
                continue
            normalized.append({"question": str(q), "answer": str(gt)})
    return normalized


async def query_participant_backend(
    submission_url: str, question: str, top_k: int = 5, timeout: int = 60
) -> dict:
    """Call participant's RAG endpoint with a question and parse flexible responses.

    Request body: send canonical keys that most teams expect. We keep it minimal to
    avoid breaking strict schemas.
    Response parsing: tolerate variations in key names and nesting.
    """

    def _extract_answer_contexts(payload: Any) -> tuple[str | None, list[str]]:
        """Extract answer and contexts from various possible response shapes."""
        candidates = []
        if isinstance(payload, dict):
            candidates.append(payload)
            for key in ("data", "result", "response"):
                val = payload.get(key)
                if isinstance(val, dict):
                    candidates.append(val)

        answer = None
        contexts: list[str] = []

        for d in candidates:
            if not isinstance(d, dict):
                continue

            # Answer candidates
            for akey in ("answer", "response", "output", "result", "text"):
                if akey in d:
                    val = d[akey]
                    if isinstance(val, (str, int, float)):
                        answer = str(val)
                        break
                    if isinstance(val, dict) and isinstance(
                        val.get("text"), (str, int, float)
                    ):
                        answer = str(val["text"])
                        break
            # Context candidates
            ctx_raw = None
            for ckey in (
                "contexts",
                "context",
                "documents",
                "docs",
                "passages",
                "sources",
            ):
                if ckey in d:
                    ctx_raw = d[ckey]
                    break
            if ctx_raw is not None:
                tmp: list[str] = []
                if isinstance(ctx_raw, list):
                    for c in ctx_raw:
                        if isinstance(c, str):
                            tmp.append(c)
                        elif isinstance(c, dict):
                            for tkey in (
                                "text",
                                "content",
                                "chunk",
                                "snippet",
                                "page_content",
                                "body",
                            ):
                                if isinstance(c.get(tkey), (str, int, float)):
                                    tmp.append(str(c[tkey]))
                                    break
                        elif isinstance(c, (int, float)):
                            tmp.append(str(c))
                elif isinstance(ctx_raw, (str, int, float)):
                    tmp = [str(ctx_raw)]
                contexts = tmp

            if answer is not None or contexts:
                break

        return answer, contexts

    async with httpx.AsyncClient(timeout=httpx.Timeout(timeout)) as client:
        try:
            resp = await client.post(
                submission_url,
                json={"query": question, "top_k": top_k},
            )
            resp.raise_for_status()
            data = resp.json() or {}
            ans, ctxs = _extract_answer_contexts(data)
            if DEBUG_LOG:
                print(
                    {
                        "participant_status": resp.status_code,
                        "response_keys": (
                            list(data.keys())
                            if isinstance(data, dict)
                            else type(data).__name__
                        ),
                        "ctx_count": len(ctxs),
                        "has_answer": bool(ans),
                    }
                )
            return {"answer": ans, "contexts": ctxs or [], "error": None}
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


async def generate_with_mistral(question: str, num_contexts: int = 3) -> dict:
    """Generate an answer and supporting contexts locally using a Mistral model via Groq.

    This is a drop-in replacement for `query_participant_backend` when you want to
    test the evaluation pipeline without calling a participant endpoint.

    Returns a dict shaped like:
      {"answer": str|None, "contexts": List[str], "error": str|None}

    Requirements:
      - env GROQ_API_KEY must be set (preferred) or MISTRAL_API_KEY as fallback
      - optionally env GROQ_API_MODEL (defaults to "mixtral-8x7b-32768");
        MISTRAL_API_MODEL is also accepted as a fallback
    """
    api_key = os.getenv("MISTRAL_API_KEY")
    model_name = os.getenv("MISTRAL_API_MODEL") or "ministral-3b-latest"

    if not api_key:
        return {"answer": None, "contexts": [], "error": "missing_api_key"}

    # Clamp contexts between 1 and 5 for sanity
    n_ctx = max(1, min(int(num_contexts or 3), 5))

    try:
        llm = ChatMistralAI(
            model=model_name, api_key=api_key, temperature=0.2, max_tokens=None
        )

        prompt = (
            "You are a helpful medical QA assistant.\n"
            "Answer the user's question concisely and provide a few short supporting"
            " context snippets that justify the answer.\n\n"
            "Return ONLY a compact JSON object with keys 'answer' and 'contexts',"
            f" where 'contexts' is an array of up to {n_ctx} short strings.\n\n"
            "Question: " + question
        )

        # LangChain ChatGroq's .invoke returns a BaseMessage with .content
        msg = llm.invoke(prompt)
        raw = msg.content if isinstance(msg, dict) is False else msg.get("content", "")
        if DEBUG_LOG:
            print({"mistral_preview": str(raw)[:120]})

        # Try to extract JSON if the model wrapped it in code fences
        text = str(raw).strip()
        if text.startswith("```"):
            # remove leading/trailing fences if present
            text = text.strip("`")
            # drop potential language tag like json\n
            # If there's a newline early, drop the first line tag
            parts = text.split("\n", 1)
            text = parts[1] if len(parts) > 1 else parts[0]

        data = None
        try:
            data = json.loads(text)
        except Exception:
            # Fallback: try to coerce into expected shape with plain text
            # If the model didn't return JSON, use the full text as the answer
            # and synthesize a couple of short context snippets from it.
            rough = text.replace("\n\n", "\n").split("\n")
            snippets = [s.strip() for s in rough if s.strip()][:n_ctx]
            data = {"answer": text, "contexts": snippets}

        answer = data.get("answer") if isinstance(data, dict) else None
        contexts = data.get("contexts", []) if isinstance(data, dict) else []

        # Normalize types
        if answer is not None:
            answer = str(answer)
        if not isinstance(contexts, list):
            contexts = [str(contexts)] if contexts is not None else []
        contexts = [str(c) for c in contexts][:n_ctx]

        return {"answer": answer, "contexts": contexts, "error": None}

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

    def _safe_01(x: Any) -> float:
        try:
            v = float(0.0 if x is None else x)
            if not math.isfinite(v):
                return 0.0
            return max(0.0, min(1.0, v))
        except Exception:
            return 0.0

    return MetricBreakdown(
        context_relevance=_safe_01(ragas_row.get("nv_context_relevance", 0.0)),
        answer_correctness=_safe_01(ragas_row.get("answer_correctness", 0.0)),
        answer_relevancy=_safe_01(ragas_row.get("answer_relevancy", 0.0)),
        faithfulness=_safe_01(ragas_row.get("faithfulness", 0.0)),
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
    def _safe_01(x: Any) -> float:
        try:
            v = float(0.0 if x is None else x)
            if not math.isfinite(v):
                return 0.0
            return max(0.0, min(1.0, v))
        except Exception:
            return 0.0

    rel = _safe_01(ragas_scores.get("answer_relevancy", 0.0))
    correctness = _safe_01(
        ragas_scores.get("answer_correctness", ragas_scores.get("faithfulness", 0.0))
    )
    context_rel = _safe_01(
        ragas_scores.get(
            "nv_context_relevance", ragas_scores.get("context_precision", 0.0)
        )
    )
    fai = _safe_01(ragas_scores.get("faithfulness", 0.0))

    # Weighted overall score
    overall = (rel * 0.30) + (correctness * 0.30) + (context_rel * 0.25) + (fai * 0.15)

    # Store in ScoreSummary (keeping field names for compatibility)
    return ScoreSummary(
        avg_context_relevance=context_rel,
        avg_answer_correctness=correctness,
        avg_answer_relevancy=rel,
        avg_faithfulness=fai,
        overall_score=overall,
    )


# -------------- Runner --------------
async def run_evaluation_async(
    job_id: str,
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
        # Normalize dataset shape from dict-of-lists or list-of-dicts
        norm_dataset = _normalize_dataset_input(dataset)
        job.total_cases = len(norm_dataset)
        await job.save()

        # Step 1: Query participant endpoint for all questions
        print(
            f"[{job_id}] Querying participant endpoint for {len(norm_dataset)} questions (top_k={top_k})..."
        )
        responses: List[dict] = []
        for idx, item in enumerate(norm_dataset):
            q = str(item.get("question", ""))
            if DEBUG_LOG:
                print(f"[{job_id}] {idx+1}/{len(norm_dataset)}")

            resp = await query_participant_backend(submission_url, q, top_k=top_k)
            # resp = await generate_with_mistral(question=q, num_contexts=top_k)
            # await asyncio.sleep(1)
            if DEBUG_LOG:
                print(
                    {
                        "resp_has_answer": bool(resp.get("answer")),
                        "contexts_len": len(resp.get("contexts", [])),
                    }
                )
            responses.append(resp)

            # Update progress and save after each query
            job.processed_cases = idx + 1
            await job.save()
            await asyncio.sleep(0.1)  # Small delay to avoid rate limits

        # Step 2: Build RAGAS dataset from responses
        print(f"[{job_id}] Building RAGAS dataset...")
        ragas_dataset = build_ragas_dataset_from_responses(norm_dataset, responses)

        if not validate_dataset(ragas_dataset):
            raise ValueError("Built dataset is invalid for RAGAS evaluation")

        valid_count = len(ragas_dataset["question"])
        print(f"[{job_id}] Valid responses: {valid_count}/{len(norm_dataset)}")

        # Step 3: Run RAGAS evaluation on the whole dataset
        print(f"[{job_id}] Running RAGAS evaluation (this may take a while)...")
        ragas_result = evaluate_dataset(ragas_dataset)
        # print(ragas_result)

        if not ragas_result.get("ok"):
            raise ValueError(f"RAGAS evaluation failed: {ragas_result.get('error')}")

        # Step 4: Build EvalCaseResult objects with RAGAS metrics
        results: List[EvalCaseResult] = []
        ragas_per_sample = ragas_result.get("results", [])

        valid_idx = 0  # Track index in valid responses
        for idx, (item, resp) in enumerate(zip(norm_dataset, responses)):
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
        print(f"  Valid responses: {valid_count}/{len(norm_dataset)}")
        print(f"  Overall score: {scores.overall_score:.4f}")
        print(f"  Context Relevance: {scores.avg_context_relevance:.4f}")
        print(f"  Answer Correctness: {scores.avg_answer_correctness:.4f}")
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
    asyncio.run(run_evaluation_async(job_id, submission_url, dataset, top_k))
    print(f"Completed job {job_id}")
    return {"status": "completed", "job_id": job_id}
