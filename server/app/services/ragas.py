from typing import List, Dict, Any

from ragas import Dataset
from ragas import evaluate as ragas_evaluate
from ragas.metrics import (
    answer_relevancy,
    faithfulness,
    context_recall,
    context_precision,
)
from app.services.llm import evaluator_llm, evaluator_embeddings


def validate_dataset(dataset: Dict[str, Any]) -> bool:
    """Return True if dataset dict is valid for RAGAS, else False.

    Required keys:
      - question: List[str]
      - answer: List[str]
      - contexts: List[List[str]]
      - ground_truths: List[str]
    All lists must be same length and contexts must be a list of lists.
    """
    try:
        required = ["question", "answer", "contexts", "ground_truths"]
        if any(k not in dataset for k in required):
            return False
        questions = dataset["question"]
        answers = dataset["answer"]
        contexts = dataset["contexts"]
        gts = dataset["ground_truths"]
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
    if not validate_dataset(dataset):
        return {"ok": False, "error": "invalid_dataset"}

    ragas_ds = Dataset.from_dict(dataset)

    metrics = [answer_relevancy, faithfulness, context_precision, context_recall]
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
            "faithfulness",
            "context_precision",
            "context_recall",
        ]:
            if col in df.columns:
                aggregates[col] = float(df[col].mean())
    except Exception:
        pass

    return {
        "ok": True,
        "size": len(dataset.get("question", [])),
        "scores": aggregates,
        "results": per_sample,
    }
