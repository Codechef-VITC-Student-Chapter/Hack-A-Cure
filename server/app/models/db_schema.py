import os
from datetime import datetime, timezone
from enum import Enum
from typing import List, Optional
from beanie import Document
from pydantic import BaseModel, Field, HttpUrl
from beanie import init_beanie
from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv

load_dotenv()

# MongoDB configuration (adjust as needed)
MONGO_URI = os.getenv("MONGO_URI", "mongodb://localhost:27017/hackacure")


async def init_db():
    """Initialize database connection."""
    client = AsyncIOMotorClient(MONGO_URI)
    db = client.get_database("AppData")
    # Deferred import via globals to avoid NameError before class definitions
    await init_beanie(database=db, document_models=[Job, QuestionAnswerPair])


# --- Question/Answer Dataset ---
class QuestionAnswerPair(Document):
    question: str
    answer: str
    dataset: str
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

    class Settings:
        name = "qa_pairs"


# --- Score Summary ---
class ScoreSummary(BaseModel):
    avg_answer_correctness: float = Field(ge=0.0, le=1.0, default=0.0)
    avg_context_relevance: float = Field(ge=0.0, le=1.0, default=0.0)
    avg_answer_relevancy: float = Field(ge=0.0, le=1.0, default=0.0)
    avg_faithfulness: float = Field(ge=0.0, le=1.0, default=0.0)
    overall_score: float = Field(ge=0.0, le=1.0, default=0.0)


# --- Per-question metric breakdown ---
class MetricBreakdown(BaseModel):
    context_relevance: float = Field(ge=0.0, le=1.0, default=0.0)
    answer_correctness: float = Field(ge=0.0, le=1.0, default=0.0)
    answer_relevancy: float = Field(ge=0.0, le=1.0, default=0.0)
    faithfulness: float = Field(ge=0.0, le=1.0, default=0.0)


# --- Per-question result ---
class EvalCaseResult(BaseModel):
    question: str
    ground_truth: str
    predicted_answer: Optional[str] = None
    metrics: MetricBreakdown = Field(default_factory=MetricBreakdown)
    error: Optional[str] = None


# --- Job Status ---
class JobStatus(str, Enum):
    NEW = "new"
    QUEUED = "queued"
    RUNNING = "running"
    COMPLETED = "completed"
    FAILED = "failed"


# --- Job Schema ---
class Job(Document):
    team_id: str
    submission_url: HttpUrl
    status: JobStatus = JobStatus.NEW
    total_cases: int = 0
    processed_cases: int = 0
    top_k: int = Field(
        default=5, description="Number of top context chunks to retrieve"
    )
    total_score: float = 0.0  # aggregate score across all questions
    scores: Optional[ScoreSummary] = None  # detailed aggregate metrics
    results: List[EvalCaseResult] = Field(default_factory=list)
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    started_at: Optional[datetime] = None
    finished_at: Optional[datetime] = None
    error_message: Optional[str] = None

    class Settings:
        name = "jobs"
