"""Queue service for managing RQ (Redis Queue) jobs using env-configured Redis."""

import os
from typing import Optional, List, Dict, Any
from redis import Redis
from rq import Queue
import pickle

# Redis connection configuration from environment
REDIS_HOST = os.getenv("REDIS_HOST", "localhost")
REDIS_PORT = int(os.getenv("REDIS_PORT", "6379"))
REDIS_DB = int(os.getenv("REDIS_DB", 0))
REDIS_USERNAME = os.getenv("REDIS_USERNAME")
REDIS_PASSWORD = os.getenv("REDIS_PASSWORD")
QUEUE_NAME = os.getenv("RQ_QUEUE_NAME", "evaluation_jobs")

# Initialize Redis connection
redis_conn = Redis(
    host=REDIS_HOST,
    port=REDIS_PORT,
    db=REDIS_DB,
    username=REDIS_USERNAME,
    password=REDIS_PASSWORD,
)

# Initialize RQ Queue
evaluation_queue = Queue(QUEUE_NAME, connection=redis_conn)


def get_queue() -> Queue:
    """Get the evaluation queue instance."""
    return evaluation_queue


def get_redis_connection() -> Redis:
    """Get the Redis connection instance."""
    return redis_conn


def enqueue_evaluation_job(
    job_id: str,
    team_id: str,
    submission_url: str,
    dataset: List[Dict[str, Any]],
    top_k: int = 5,
) -> Optional[str]:
    """
    Enqueue an evaluation job to be processed by workers.

    Args:
        job_id: Unique identifier for the job
        team_id: ID of the team submitting
        submission_url: URL of the RAG backend to evaluate
        dataset: List of dicts with keys {"question", "answer"} to test the endpoint
        top_k: Number of top context chunks to retrieve


        RQ job ID if successful, None otherwise
    """
    # Print dataset size and approximate payload size prior to enqueueing
    try:
        if isinstance(dataset, dict):
            ds_len = len(dataset.get("question", []))
        else:
            ds_len = len(dataset)
    except Exception:
        ds_len = -1

    try:
        payload = (job_id, team_id, str(submission_url), dataset, int(top_k))
        payload_size_bytes = len(
            pickle.dumps(payload, protocol=pickle.HIGHEST_PROTOCOL)
        )
    except Exception:
        payload_size_bytes = -1

    kb = (payload_size_bytes / 1024.0) if payload_size_bytes >= 0 else -1
    mb = (payload_size_bytes / (1024.0 * 1024.0)) if payload_size_bytes >= 0 else -1
    print(
        f"[enqueue] job_id={job_id} team_id={team_id} dataset_items={ds_len} "
        f"approx_payload_size={payload_size_bytes} bytes (~{kb:.1f} KB, ~{mb:.2f} MB)"
        if payload_size_bytes >= 0
        else f"[enqueue] job_id={job_id} team_id={team_id} dataset_items={ds_len} (payload size estimation failed)"
    )
    from app.services.tasks import run_evaluation_task

    try:
        # IMPORTANT: Pass our function arguments positionally to avoid
        # clashing with RQ's reserved 'job_id' keyword (which sets the RQ job id).
        rq_job = evaluation_queue.enqueue(
            run_evaluation_task,
            job_id,  # function arg 1: job_id
            team_id,  # function arg 2: team_id
            submission_url,  # function arg 3: submission_url
            dataset,  # function arg 4: dataset
            top_k,  # function arg 5: top_k
            job_timeout="30m",  # 30 minutes timeout
            result_ttl=86400,  # Keep results for 24 hours
            failure_ttl=86400,  # Keep failed job info for 24 hours
        )
        return rq_job.get_id()
    except Exception as e:
        print(f"Error enqueueing job: {e}")
        return None


def get_job_info(rq_job_id: str) -> Optional[dict]:
    """
    Get information about an RQ job.

    Args:
        rq_job_id: The RQ job ID

    Returns:
        Dictionary with job info or None if not found
    """
    from rq.job import Job

    try:
        job = Job.fetch(rq_job_id, connection=redis_conn)
        return {
            "id": job.get_id(),
            "status": job.get_status(),
            "result": job.result,
            "exc_info": job.exc_info,
            "started_at": job.started_at,
            "ended_at": job.ended_at,
        }
    except Exception as e:
        print(f"Error fetching job {rq_job_id}: {e}")
        return None
