from datetime import datetime, timezone
from enum import Enum
from typing import List, Optional
from beanie import Document
from pydantic import BaseModel, Field, HttpUrl


# --- Job Status ---
class JobStatus(str, Enum):
    NEW = "new"
    QUEUED = "queued"
    RUNNING = "running"
    COMPLETED = "completed"
    FAILED = "failed"


# --- Per-question metric breakdown ---
class MetricBreakdown(BaseModel):
    context_precision: float = Field(ge=0.0, le=1.0, default=0.0)
    context_recall: float = Field(ge=0.0, le=1.0, default=0.0)
    answer_relevancy: float = Field(ge=0.0, le=1.0, default=0.0)
    faithfulness: float = Field(ge=0.0, le=1.0, default=0.0)


# --- Per-question result ---
class EvalCaseResult(BaseModel):
    question: str
    ground_truth: str
    predicted_answer: Optional[str] = None
    metrics: MetricBreakdown = Field(default_factory=MetricBreakdown)
    error: Optional[str] = None


# --- Job Schema ---
class Job(Document):
    team_id: str
    submission_url: HttpUrl
    status: JobStatus = JobStatus.NEW
    total_cases: int = 0
    processed_cases: int = 0
    total_score: float = 0.0  # aggregate score across all questions
    results: List[EvalCaseResult] = Field(default_factory=list)
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    started_at: Optional[datetime] = None
    finished_at: Optional[datetime] = None

    class Settings:
        name = "jobs"


# --- Question/Answer Dataset ---
class QuestionAnswerPair(Document):
    question: str
    answer: str
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

    class Settings:
        name = "qa_pairs"
