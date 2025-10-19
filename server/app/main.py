from datetime import datetime, timezone
from uuid import uuid4

from fastapi import FastAPI

from app.models import JobStatus
from app.models.api_schema import (
    SubmissionRequest,
    SubmissionResponse,
    JobStatusResponse,
    JobDetailResponse,
)

app = FastAPI()


# NOTE: This is a dummy API version without database.
# TODO: When implementing for real, initialize MongoDB/Beanie here and register document models.
# from motor.motor_asyncio import AsyncIOMotorClient
# from beanie import init_beanie
# from app.models import Job
# @app.on_event("startup")
# async def on_startup():
#     client = AsyncIOMotorClient(MONGO_URI)
#     db = client.get_default_database() or client["hackacure"]
#     await init_beanie(database=db, document_models=[Job])


@app.get("/")
async def server_root():
    return {"message": "HackACure RAG Eval API"}


# NOTE: Dummy implementation only. No background evaluation is performed here.
# TODO: Implement a background task that loads dataset, invokes participant backend for each Q,
#       computes metrics (answer_relevancy, faithfulness, context precision/recall, context_f1),
#       aggregates ScoreSummary, and persists results to the Job document.


# Submit a new job to evaluate
@app.post("/jobs", response_model=SubmissionResponse)
async def submit_job(payload: SubmissionRequest):
    """Create a new evaluation job (dummy).

    TODO: Persist a Job document with status=QUEUED, then enqueue a background worker
    to process the evaluation. Return the created job's id.
    """
    dummy_job_id = f"job_{uuid4().hex[:8]}"
    return SubmissionResponse(job_id=dummy_job_id, status=JobStatus.QUEUED)


# Get job status by id
@app.get("/jobs/{job_id}", response_model=JobStatusResponse)
async def get_job_status(job_id: str):
    """Return the current status of a job (dummy).

    TODO: Fetch Job by id from database and map fields to JobStatusResponse.
    """
    now = datetime.now(timezone.utc)
    return JobStatusResponse(
        job_id=job_id,
        team_name="<team-name>",
        status=JobStatus.QUEUED,
        dataset_name="default",
        total_cases=0,
        processed_cases=0,
        created_at=now,
        started_at=None,
        finished_at=None,
        error_message=None,
    )


# Get job result (full details) by id
@app.get("/jobs/{job_id}/result", response_model=JobDetailResponse)
async def get_job_result(job_id: str):
    """Return final job results (dummy).

    TODO: Fetch Job by id, ensure it is COMPLETED (or return partial results during RUNNING),
    and return the stored scores and per-case results.
    """
    now = datetime.now(timezone.utc)
    return JobDetailResponse(
        job_id=job_id,
        team_name="<team-name>",
        submission_url="https://example.com/rag-endpoint",
        status=JobStatus.COMPLETED,
        dataset_name="default",
        total_cases=0,
        processed_cases=0,
        created_at=now,
        started_at=now,
        finished_at=now,
        scores=None,
        results=[],
        error_message=None,
    )
