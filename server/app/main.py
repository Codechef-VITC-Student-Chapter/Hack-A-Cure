from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
from datetime import datetime, timezone
import os, traceback
from dotenv import load_dotenv
from beanie import PydanticObjectId
from app.models import JobStatus
from app.models.api_schema import (
    SubmissionRequest,
    SubmissionResponse,
    JobStatusResponse,
)
from app.models.db_schema import Job, init_db
from app.services import enqueue_evaluation_job, build_dataset_from_db

load_dotenv()

MONGO_URI = os.getenv("MONGO_URI")
if not MONGO_URI:
    raise Exception("No MONGO_URI env variable found")


@asynccontextmanager
async def lifespan(app: FastAPI):
    await init_db()
    yield


app = FastAPI(lifespan=lifespan, title="HackACure RAG Eval API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        os.getenv("CLIENT_URL"),
    ],  # or ["*"] during dev
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/")
async def server_root():
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
            dataset = await build_dataset_from_db(5)
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
@app.get("/jobs/{job_id}", response_model=Job)
async def get_job_status(job_id: str):
    """Return the current status of a job stored in MongoDB."""
    try:
        job_obj_id = PydanticObjectId(job_id)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid job ID format")

    job = await Job.get(job_obj_id)
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")

    return job


# Get all jobs for a specific team
@app.get("/jobs/team/{team_id}", response_model=list[Job])
async def get_team_jobs(team_id: str):
    """Return a list of all jobs for a given team."""
    jobs = await Job.find(Job.team_id == team_id).to_list()
    return jobs
