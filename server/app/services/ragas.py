from typing import List, Dict, Any
import math

from ragas import evaluate as ragas_evaluate
from ragas.metrics import (
    answer_relevancy,
    answer_correctness,
    faithfulness,
    ContextRelevance,
)
from datasets import Dataset as HFDataset
from app.services.llm import evaluator_llm, evaluator_embeddings
from app.models.db_schema import QuestionAnswerPair
from typing import Tuple
from motor.motor_asyncio import AsyncIOMotorCollection


def _compute_bucket_counts(total: int) -> Dict[str, int]:
    """Return per-dataset counts for the requested total based on presets.

    Supports totals of 25 and 100 with the explicit mappings. For other totals
    we scale the 100-question ratios and round, adjusting the largest bucket to
    ensure the counts sum to `total`.
    """
    presets = {
        100: {"mmlu": 14, "medqa": 17, "medmcqa": 54, "pubmedqa": 7, "bioasq": 8},
        25: {"mmlu": 4, "medqa": 4, "medmcqa": 14, "pubmedqa": 2, "bioasq": 2},
    }

    if total in presets:
        return presets[total].copy()

    # Scale from 100-question proportions
    base = presets[100]
    ratios = {k: v / 100.0 for k, v in base.items()}
    raw = {k: ratios[k] * total for k in ratios}
    rounded = {k: int(round(v)) for k, v in raw.items()}

    # Adjust to ensure sum equals total
    diff = total - sum(rounded.values())
    if diff != 0:
        # add/subtract from the largest ratio bucket (medmcqa by design)
        key = max(ratios.keys(), key=lambda k: ratios[k])
        rounded[key] += diff

    return rounded


async def _sample_from_collection(
    collection: AsyncIOMotorCollection, dataset_name: str, n: int
) -> List[Dict[str, Any]]:
    """Return up to n random documents for dataset_name from collection."""
    if n <= 0:
        return []
    filt = {"dataset": dataset_name}
    count = await collection.count_documents(filt)
    if count == 0:
        return []
    sample_size = n if n <= count else count
    cursor = collection.aggregate(
        [{"$match": filt}, {"$sample": {"size": sample_size}}]
    )
    docs = await cursor.to_list(length=sample_size)
    return docs


async def build_dataset_from_db(total_questions: int = 25) -> Dict[str, Any]:
    """Build a RAGAS-compatible dataset dict by sampling QA pairs from MongoDB.

    The function samples questions from the five allowed datasets in the
    proportions requested by the project. It returns a dict with keys:
      - question: List[str]
      - answer: List[str] (empty strings, to be filled by participant)
      - contexts: List[List[str]] (empty lists)
      - ground_truths: List[str]

    This is async and uses the QuestionAnswerPair motor collection.
    """
    counts = _compute_bucket_counts(total_questions)
    collection = QuestionAnswerPair.get_pymongo_collection()

    questions_out: List[str] = []
    gts_out: List[str] = []

    for ds, n in counts.items():
        docs = await _sample_from_collection(collection, ds, n)
        for d in docs:
            q_text = d.get("question")
            gt = d.get("answer")
            if not q_text or gt is None:
                continue
            questions_out.append(str(q_text))
            gts_out.append(str(gt))

    return {
        "question": questions_out,
        "ground_truths": gts_out,
    }


def validate_dataset(dataset: Dict[str, Any]) -> bool:
    """Return True if dataset dict is valid for RAGAS, else False.

    Accepts either legacy or new key names and enforces consistent lengths:
      - question: List[str]
      - answer or response: List[str]
      - contexts: List[List[str]]
      - ground_truths or reference: List[str]
    """
    try:
        if "question" not in dataset or "contexts" not in dataset:
            return False

        ans_key = (
            "answer"
            if "answer" in dataset
            else ("response" if "response" in dataset else None)
        )
        gt_key = (
            "ground_truths"
            if "ground_truths" in dataset
            else ("reference" if "reference" in dataset else None)
        )
        if ans_key is None or gt_key is None:
            return False

        questions = dataset["question"]
        answers = dataset[ans_key]
        contexts = dataset["contexts"]
        gts = dataset[gt_key]
        if not (
            isinstance(questions, list)
            and isinstance(answers, list)
            and isinstance(contexts, list)
            and isinstance(gts, list)
        ):
            return False
        n = len(questions)
        if not (len(answers) == n and len(contexts) == n and len(gts) == n):
            return False
        if any(not isinstance(c, list) for c in contexts):
            return False
        return True
    except Exception:
        return False


def evaluate_dataset(dataset: Dict[str, Any]) -> Dict[str, Any]:
    """Validate, then evaluate dataset as a whole with RAGAS.

    Internally converts to ragas.Dataset.from_dict and runs evaluate() with
    selected metrics and your Gemini-backed LLM + embeddings.
    """
    # Normalize keys for ragas: ensure 'response' and 'reference' exist
    ds = dict(dataset)
    if "reference" not in ds and "ground_truths" in ds:
        ds["reference"] = ds["ground_truths"]

    if not validate_dataset(ds):
        return {"ok": False, "error": "invalid_dataset"}

    # RAGAS expects a HuggingFace Dataset; use HF Dataset API.
    ragas_ds = HFDataset.from_dict(ds)

    metrics = [
        answer_relevancy,
        faithfulness,
        answer_correctness,
        ContextRelevance(llm=evaluator_llm),
    ]
    result = ragas_evaluate(
        dataset=ragas_ds,
        metrics=metrics,
        llm=evaluator_llm,
        embeddings=evaluator_embeddings,
    )

    # Attempt to compute aggregates if possible
    aggregates: Dict[str, float] = {}
    per_sample = None
    try:
        df = result.to_pandas()
        per_sample = df.to_dict(orient="records")
        for col in [
            "answer_relevancy",
            "answer_correctness",
            "faithfulness",
            "nv_context_relevance",
        ]:
            if col in df.columns:
                val = float(df[col].mean())
                if not math.isfinite(val):
                    val = 0.0
                # Clamp just in case
                aggregates[col] = max(0.0, min(1.0, val))
    except Exception:
        pass

    return {
        "ok": True,
        "size": len(dataset.get("question", [])),
        "scores": aggregates,
        "results": per_sample,
    }
