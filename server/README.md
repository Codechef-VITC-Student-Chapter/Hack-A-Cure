# Hack-A-Cure Server — Dev Setup

FastAPI backend for evaluating RAG systems with background workers (RQ), MongoDB (Beanie ODM), and RAGAS (Gemini/Groq evaluators).

## Prerequisites

- Python 3.11+ (3.12 recommended)
- Node.js 18+ (only if working on the client folder)
- Redis 6+ (for background jobs via RQ)
- MongoDB 5+ (local or remote)
- API keys (as needed)
	- Google Generative AI: `GOOGLE_API_KEY`
	- Groq: `GROQ_API_KEY` and model `GROQ_API_MODEL` (e.g., `llama-3.1-70b-versatile`)

If you run MongoDB on Windows and the server in WSL, ensure you know your Windows host IP (e.g., `10.255.255.254` or similar), and set `MONGO_URI` accordingly.

## Repo Structure (server)

```
server/
	app/
		main.py               # FastAPI app and routes
		models/
			db_schema.py        # Beanie ODM models (MongoDB)
			api_schema.py       # Pydantic API models
		services/
			queue.py            # Redis/RQ queue helpers
			tasks.py            # Background evaluation workflow
			llm.py              # LLM/Embeddings config (Gemini/Groq)
			ragas.py            # RAGAS dataset validation and evaluation
	scripts/
		test_data.py          # Seed Mongo with allowed datasets from benchmark.json
	requirements.txt
	.env (create this)
```

## 1) Create and activate a virtual environment

```bash
cd server
python3 -m venv venv
source venv/bin/activate
pip install --upgrade pip
pip install -r requirements.txt
```

## 2) Configure environment variables (.env)

Create `server/.env`:

```ini
# MongoDB — if Mongo runs on Windows and server is in WSL, use the Windows IP
MONGO_URI=mongodb://10.255.255.254:27017/hackacure

# Redis (adjust as needed)
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_DB=0
# REDIS_USERNAME=
# REDIS_PASSWORD=
# Optional single URL form (prefer for cloud Redis)
# REDIS_URL=rediss://:PASSWORD@HOST:PORT/0

# LLM / Evaluators
GOOGLE_API_KEY=your_google_api_key
GROQ_API_KEY=your_groq_api_key
GROQ_API_MODEL=openai/gpt-oss-20b
```

Notes:
- If MongoDB is local in WSL, you can use `mongodb://localhost:27017/hackacure`.
- On Windows+WSL setups, ensure MongoDB listens on all interfaces (bindIp: 0.0.0.0) or the Windows host IP is reachable from WSL.

## 3) Start dependencies

Make sure Redis and MongoDB are running.

```bash
# Redis (Linux example)
sudo systemctl start redis-server

# MongoDB (Linux example)
sudo systemctl start mongod
```

For Windows MongoDB + WSL server, ensure the Windows MongoDB service is running and your `.env` uses the Windows host IP.

## 4) Seed the database (optional)

If you have a `benchmark.json` with multiple datasets (medqa, medmcqa, mmlu, pubmedqa, bioasq), use the script to insert QA pairs into MongoDB:

```bash
cd server
python scripts/test_data.py
```

What it does:
- Loads allowed datasets from `benchmark.json`
- Extracts questions and correct answers (stores only the answer text)
- Adds a `dataset` field and `created_at`
- Inserts into the `qa_pairs` collection

## 5) Run the API server

In one terminal:

```bash
cd server
source venv/bin/activate
uvicorn app.main:app --reload
```

## 6) Run the background worker (RQ)

In another terminal (project root or server dir):

- If you have a REDIS_URL in your .env (recommended for cloud Redis):

```bash
# Load env (adjust if you use a different shell)
set -a && source .env && set +a

# Option A: pass URL explicitly
rq worker evaluation_jobs --url "$REDIS_URL"

# Option B: use RQ_REDIS_URL env var
export RQ_REDIS_URL="$REDIS_URL"
rq worker evaluation_jobs
```

- If you use host/port variables instead of REDIS_URL, ensure your app is configured accordingly. For TLS (most cloud providers), REDIS_URL should start with `rediss://`.

The worker consumes jobs from the `evaluation_jobs` queue and executes the evaluation workflow.

## 7) Submit a job

Use your RAG endpoint URL that accepts JSON `{ "question": string, "top_k": number }` and returns `{ "answer": string, "contexts": string[] }`.

```bash
curl -X POST http://localhost:8000/jobs \
	-H 'Content-Type: application/json' \
	-d '{
		"team_id": "team-foo",
		"submission_url": "http://localhost:9000/ask",
		"top_k": 5
	}'
```

You should get back a `job_id` and status `queued`.

## 8) Check job status

```bash
curl http://localhost:8000/jobs/<job_id>
```

Response includes status and progress fields. When complete, aggregate scores and per-case results are saved in MongoDB.

## Using random QA pairs

If you want 25 random QA pairs per job, you can use MongoDB `$sample` via Motor collection in `app/main.py`:

```python
collection = QuestionAnswerPair.get_motor_collection()
qa_docs = await collection.aggregate([{"$sample": {"size": 25}}]).to_list(length=25)
dataset = [{"question": d["question"], "answer": d["answer"]} for d in qa_docs]
```

## Troubleshooting

- Mongo connection refused from WSL:
	- Use the Windows host IP in `MONGO_URI` (e.g., `mongodb://10.255.255.254:27017/hackacure`).
	- Ensure MongoDB is listening on external interfaces (`bindIp: 0.0.0.0`).

- Redis auth/host issues:
	- Set `REDIS_HOST`, `REDIS_PORT`, `REDIS_DB`, `REDIS_USERNAME`, `REDIS_PASSWORD` in `.env` and ensure Redis is reachable.

- Gemini/Groq deprecation warnings in local test scripts:
	- Prefer modern RAGAS providers or use LangChain models directly (wrappers deprecated).

- RQ worker can’t find tasks:
	- Ensure PYTHONPATH includes `server` when starting the worker from project root; or `cd server` first.


