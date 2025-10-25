import os
import traceback
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
from app.services import enqueue_evaluation_job, build_dataset_from_db
from dotenv import load_dotenv
from beanie import PydanticObjectId

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
    2. Fetches `25 or 100` QuestionAnswerPair documents as the test dataset
    3. Enqueues a background worker task with that dataset
    4. Returns the job ID immediately
    """
    try:
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

        # Build dataset: always fetch 25 QA pairs
        try:
            dataset = await build_dataset_from_db()
        except Exception as e:
            job.status = JobStatus.FAILED
            await job.save()
            raise HTTPException(
                status_code=500, detail=f"Failed to build dataset: {str(e)}"
            )

        # Enqueue the evaluation task with dataset
        try:
            rq_job_id = enqueue_evaluation_job(
                job_id=job_id,
                team_id=payload.team_id,
                submission_url=str(payload.submission_url),
                dataset=dataset,
                top_k=payload.top_k,
            )
        except Exception as e:
            job.status = JobStatus.FAILED
            await job.save()
            raise HTTPException(
                status_code=500, detail=f"Failed to enqueue job: {str(e)}"
            )

        if not rq_job_id:
            job.status = JobStatus.FAILED
            await job.save()
            raise HTTPException(
                status_code=500, detail="Failed to enqueue evaluation job"
            )

        return SubmissionResponse(
            job_id=job_id,
            status=JobStatus.QUEUED,
        )

    except HTTPException:
        # Re-raise FastAPI HTTP exceptions as is
        raise
    except Exception as e:
        # Catch-all for unexpected errors
        traceback.print_exc()
        raise HTTPException(
            status_code=500, detail=f"Unexpected error while submitting job: {str(e)}"
        )


# Get job status by id
@app.get("/jobs/{job_id}", response_model=JobStatusResponse)
async def get_job_status(job_id: str):
    """Return the current status of a job stored in MongoDB."""
    try:
        job_obj_id = PydanticObjectId(job_id)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid job ID format")

    job = await Job.get(job_obj_id)
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")

    return JobStatusResponse(
        job_id=str(job.id),
        team_id=job.team_id,
        status=job.status,
        dataset_name="default",
        total_cases=job.total_cases,
        processed_cases=job.processed_cases,
        created_at=job.created_at,
        started_at=job.started_at,
        finished_at=job.finished_at,
        error_message=None,
    )


# Get all jobs for a specific team
@app.get("/jobs/team/{team_id}", response_model=list[JobStatusResponse])
async def get_team_jobs(team_id: str):
    """Return a list of all jobs for a given team."""
    jobs = await Job.find(Job.team_id == team_id).to_list()
    if not jobs:
        raise HTTPException(
            status_code=404, detail=f"No jobs found for team '{team_id}'"
        )

    job = []
    for i in jobs:
        job.append(
            JobStatusResponse(
                job_id=str(i.id),
                team_id=i.team_id,
                status=i.status,
                dataset_name="default",
                total_cases=i.total_cases,
                processed_cases=i.processed_cases,
                created_at=i.created_at,
                started_at=i.started_at,
                finished_at=i.finished_at,
                error_message=None,
            )
        )
    return job
