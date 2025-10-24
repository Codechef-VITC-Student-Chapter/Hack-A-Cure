from datetime import datetime, timezone
from uuid import uuid4

from fastapi import FastAPI, HTTPException
from app.utils.dummy_data import generate_dummy_results

from app.models import JobStatus
from app.models.api_schema import (
    SubmissionRequest,
    SubmissionResponse,
    JobStatusResponse,
    JobDetailResponse,
)

import os
from dotenv import load_dotenv
from beanie import PydanticObjectId

load_dotenv()
MONGO_URI = os.getenv("MONGO_URI")


app = FastAPI()


# NOTE: This is a dummy API version without database.
# TODO: When implementing for real, initialize MongoDB/Beanie here and register document models.
from motor.motor_asyncio import AsyncIOMotorClient
from beanie import init_beanie
from app.models import Job

@app.on_event("startup")
async def on_startup():
    client = AsyncIOMotorClient(MONGO_URI)
    db = client.get_default_database() or client["hackacure"]
    await init_beanie(database=db, document_models=[Job])


@app.get("/")
async def server_root():
    return {"message": "HackACure RAG Eval API"}


# Submit a new job to evaluate
@app.post("/jobs", response_model=SubmissionResponse)
async def submit_job(payload: SubmissionRequest):
    """Create a new evaluation job (dummy)."""
    new_job = Job(
        team_id=payload.team_id,
        submission_url=payload.submission_url,
        status=JobStatus.QUEUED,
    )
    await new_job.insert()
    return SubmissionResponse(job_id=str(new_job.id), status=new_job.status)

@app.get("/jobs", response_model=list[JobStatusResponse])
async def get_all_jobs():
    """Return all jobs currently stored in MongoDB."""
    jobs = await Job.find_all().to_list()
    if not jobs:
        raise HTTPException(status_code=404, detail="No jobs found")

    return [
        JobStatusResponse(
            job_id=str(j.id),
            team_id=j.team_id,
            status=j.status,
            dataset_name="default",
            total_cases=j.total_cases,
            processed_cases=j.processed_cases,
            created_at=j.created_at,
            started_at=j.started_at,
            finished_at=j.finished_at,
            error_message=None,
        )
        for j in jobs
    ]


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
        raise HTTPException(status_code=404, detail=f"No jobs found for team '{team_id}'")
    
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


# Get job result (full details) by id
@app.get("/jobs/{job_id}/result", response_model=JobDetailResponse)
async def get_job_result(job_id: str):
    """Return final job results (dummy).

    TODO: Fetch Job by id, ensure it is COMPLETED (or return partial results during RUNNING),
    and return the stored scores and per-case results.
    """
    try:
        job_obj_id = PydanticObjectId(job_id)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid job ID format")

    job = await Job.get(PydanticObjectId(job_id))
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")

    job = await Job.get(job.id)
    if job.status != JobStatus.COMPLETED or job.status != JobStatus.RUNNING:
        raise HTTPException(status_code=400, detail="Job not completed yet")
    
    score = None
    if job.total_score:
        score = {"total_score": job.total_score}

    return JobDetailResponse(
        job_id=str(job.id),
        team_id=job.team_id,
        submission_url=job.submission_url,
        status=job.status,
        dataset_name="default",
        total_cases=job.total_cases,
        processed_cases=job.processed_cases,
        created_at=job.created_at,
        started_at=job.started_at,
        finished_at=job.finished_at,
        scores=score,
        results=job.results,
        error_message=None,
    )
