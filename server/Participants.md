## Participant Query API: Integration Guide

This document explains how to expose a single HTTP endpoint that your evaluation server will call to query your RAG system.

### TL;DR (contract)

- Method: POST
- URL: The “submission_url” you provide when submitting a job
- Request body (JSON):
  - query: string (required) — the user question
  - top_k: integer — how many context chunks you may retrieve
- Response body (JSON):
  - answer: string (required) — your model’s answer
  - contexts: string[] (required, can be empty) — short text snippets you used to derive the answer
- Timeout: 60 seconds total per request
- Status code: 200 on success; non-2xx will be treated as an error

---

## 1) Why this shape?

Your backend is called by the evaluator here:
- The evaluator posts JSON to your endpoint with keys:
  - query: the question text
  - top_k: an integer you can use to limit retrieval results
- It expects JSON back with:
  - answer: your answer as a plain string
  - contexts: an array of strings; each is a short chunk (e.g., 1–3 sentences) you retrieved and used

This contract matches the evaluator’s code:
- Request payload: `{"query": question, "top_k": top_k}`
- Response parsing: it reads `answer` and `contexts` directly and drops the sample if answer is missing.

If your response doesn’t include an answer or returns a different shape (e.g., contexts as objects), your sample won’t be evaluated.

---

## 2) Request details

- Method: POST
- Headers: Content-Type: application/json
- Body:
  - query: string (required)
  - top_k: integer (optional; default your choice; evaluator often sends 5)

Example request body:
{
  "query": "What is the first-line treatment for H. pylori?",
  "top_k": 5
}

Timeout: You have up to 60 seconds to respond for each request.

Note: The evaluator will send many requests sequentially (one per question), with a tiny delay between them.

---

## 3) Response details

- Status: 200 OK for successful answers
- Body (JSON):
  - answer (string, required): the model’s answer
  - contexts (string[], required): zero or more short text snippets used to derive the answer

Example success response:
{
  "answer": "Triple therapy with a PPI, clarithromycin, and amoxicillin for 14 days.",
  "contexts": [
    "Guidelines recommend clarithromycin-based triple therapy where local resistance is low.",
    "PPI plus two antibiotics improves eradication and symptom control."
  ]
}

Keep contexts as an array of strings, not objects. If you return objects, the evaluator won’t parse them.

Example error response (not recommended):
- Avoid non-200 statuses; the evaluator will mark this sample as error and skip it.
- If you must, still return 200 with a fallback answer and empty contexts to ensure evaluation proceeds.

---

## 4) Reference implementation examples

### Python (FastAPI)
from fastapi import FastAPI
from pydantic import BaseModel
from typing import List

app = FastAPI()

class QueryRequest(BaseModel):
    query: str
    top_k: int | None = 5

class QueryResponse(BaseModel):
    answer: str
    contexts: List[str]

@app.post("/query", response_model=QueryResponse)
def query_route(req: QueryRequest):
    # 1) Retrieve top_k passages/snippets here...
    # 2) Generate an answer using your model...
    # Placeholder example:
    contexts = [
        "Short, relevant snippet 1.",
        "Short, relevant snippet 2."
    ][: max(0, req.top_k or 0)]
    answer = "Your concise answer here."

    return QueryResponse(answer=answer, contexts=contexts)

### Node.js (Express)
const express = require("express");
const app = express();
app.use(express.json());

app.post("/query", async (req, res) => {
  const { query, top_k } = req.body || {};
  if (!query) return res.status(400).json({ error: "query is required" });

  const k = Number.isInteger(top_k) ? top_k : 5;
  // 1) Retrieve top_k documents
  // 2) Generate answer
  const contexts = ["Short, relevant snippet 1.", "Short, relevant snippet 2."].slice(0, Math.max(0, k));
  const answer = "Your concise answer here.";

  res.json({ answer, contexts });
});

app.listen(3000, () => console.log("Listening on 3000"));

---

## 5) Scoring and how to do well

The evaluator computes RAGAS metrics over your responses:
- Answer Relevancy
- Answer Correctness (requires your answer to match the ground truth semantically)
- Faithfulness (answer should be supported by your contexts)
- Context Relevance (quality/fit of the provided contexts)

Weights used for overall score:
- Answer Relevancy: 30%
- Answer Correctness: 30%
- Context Relevance: 25%
- Faithfulness: 15%

Tips:
- Return concise, correct answers (avoid hedging).
- Provide high-quality, directly relevant context snippets.
- Use top_k to limit contexts to the best few (e.g., 3–5).

---

## 6) Operational notes

- The evaluator expects your endpoint to be reachable from the evaluation server (publicly accessible URL).
- It sends one question per request; respond within 60s.
- Non-200 responses or missing answer will mark the sample as invalid and it won’t be counted.
- contexts can be empty, but metrics relying on them may suffer. Prefer 1–5 short snippets.

---

## 7) Checklist

- [ ] POST route accepting application/json
- [ ] Request shape: { "query": string, "top_k": number }
- [ ] Response shape: { "answer": string, "contexts": string[] }
- [ ] 200 status on success
- [ ] Respond within 60 seconds
- [ ] Contexts are plain strings (not objects), short and relevant

---

## 8) Example cURL (optional)

- Request:
  curl -X POST https://your-host/query \
    -H "Content-Type: application/json" \
    -d '{"query":"When to give Tdap booster?", "top_k":3}'

- Expected response:
  {
    "answer": "Tdap booster is recommended once every 10 years in adulthood.",
    "contexts": [
      "Adults should receive a Td or Tdap booster every 10 years.",
      "A single Tdap dose is recommended in adulthood, with Td or Tdap thereafter."
    ]
  }

This is everything your participants need to make their endpoint work smoothly with your evaluator. If you anticipate variations (camelCase like topK or fields like response/contexts objects), we can relax the evaluator parsing; but with the current code, please stick to the shapes above.