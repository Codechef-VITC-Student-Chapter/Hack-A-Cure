from __future__ import annotations

from datetime import datetime
from typing import List, Optional

from pydantic import BaseModel, Field, HttpUrl

from .db_schema import EvalCaseResult, JobStatus, ScoreSummary, Job


# -------- Submission --------


class SubmissionRequest(BaseModel):
    """Participant submission payload to start an evaluation job."""

    team_id: str = Field(..., description="ID of the team")
    submission_url: HttpUrl = Field(
        ..., description="Public URL of the RAG backend endpoint to evaluate"
    )
    top_k: int = Field(
        default=5, description="Number of top context chunks to retrieve", ge=1, le=20
    )


class SubmissionResponse(BaseModel):
    job_id: str
    status: JobStatus


# -------- Job status / details --------


class JobStatusResponse(BaseModel):
    job_id: str
    team_id: str
    status: JobStatus
    dataset_name: str
    total_cases: int
    processed_cases: int
    created_at: datetime
    started_at: Optional[datetime] = None
    finished_at: Optional[datetime] = None
    error_message: Optional[str] = None


class JobDetailResponse(BaseModel):
    job_id: str
    team_id: str
    submission_url: HttpUrl
    status: JobStatus
    dataset_name: str
    total_cases: int
    processed_cases: int
    created_at: datetime
    started_at: Optional[datetime] = None
    finished_at: Optional[datetime] = None
    scores: Optional[ScoreSummary] = None
    results: List[EvalCaseResult] = Field(default_factory=list)
    error_message: Optional[str] = None


class TeamJobsResponse(BaseModel):
    team_id: str
    jobs: List[Job]
