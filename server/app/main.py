import os
from datetime import datetime, timezone
from contextlib import asynccontextmanager
from fastapi import FastAPI, HTTPException
from app.models import JobStatus
from app.models.api_schema import (
    SubmissionRequest,
    SubmissionResponse,
    JobStatusResponse,
    TeamJobsResponse,
)
from app.models.db_schema import Job, init_db, QuestionAnswerPair
from app.services import enqueue_evaluation_job
from dotenv import load_dotenv

load_dotenv()

MONGO_URI = os.getenv("MONGO_URI")
if not MONGO_URI:
    raise Exception("No MONGO_URI env variable found")

app = FastAPI(title="HackACure RAG Eval API")


@asynccontextmanager
async def lifespan(app: FastAPI):
    await init_db()
    yield


app = FastAPI(lifespan=lifespan)


@app.get("/")
async def server_root():
    """API root endpoint."""
    return {"message": "HackACure RAG Eval API", "version": "1.0.0"}


@app.post("/jobs", response_model=SubmissionResponse)
async def submit_job(payload: SubmissionRequest):
    """
    Create a new evaluation job.

    This endpoint:
    1. Creates a Job document in the database with status=QUEUED
    2. Fetches `total_cases` QuestionAnswerPair documents as the test dataset
    3. Enqueues a background worker task with that dataset
    4. Returns the job ID immediately

    Args:
        payload: SubmissionRequest with team_id and submission_url

    Returns:
        SubmissionResponse with job_id and status
    """
    job = Job(
        team_id=payload.team_id,
        submission_url=payload.submission_url,
        status=JobStatus.QUEUED,
        total_cases=25,
        top_k=payload.top_k,
        processed_cases=0,
        created_at=datetime.now(timezone.utc),
    )

    # Save the job to get its ID
    await job.insert()
    job_id = str(job.id)

    # Build dataset: always fetch 25 QA pairs and pass as list of dicts
    qa_pairs = await QuestionAnswerPair.find_all().limit(25).to_list()
    dataset = [{"question": qa.question, "answer": qa.answer} for qa in qa_pairs]
    print(dataset)
    # # Enqueue the evaluation task with dataset
    # rq_job_id = enqueue_evaluation_job(
    #     job_id=job_id,
    #     team_id=payload.team_id,
    #     submission_url=str(payload.submission_url),
    #     dataset=dataset,
    #     top_k=payload.top_k,
    # )

    # if not rq_job_id:
    #     # If enqueueing failed, update job status
    #     job.status = JobStatus.FAILED
    #     await job.save()
    #     raise HTTPException(status_code=500, detail="Failed to enqueue evaluation job")

    return SubmissionResponse(
        job_id=job_id,
        status=JobStatus.QUEUED,
    )


# Get Job Status by team id
@app.get("/jobs/team/{team_id}", response_model=TeamJobsResponse)
async def get_all_jobs_of_team(team_id: str):
    print("Get all the jobs having a particular team_id")


# Get job status by job id
@app.get("/jobs/{job_id}", response_model=JobStatusResponse)
async def get_job_status(job_id: str):
    print("Get Job details with job_id")
