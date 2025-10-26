"use client";

import type React from "react";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import Link from "next/link";
import { signOut, useSession } from "next-auth/react";
import { useTeamStore } from "@/stores/teamStore";
import { Job, SubmissionRequest } from "@/lib/types";
import { formatDateTime } from "@/lib/utils";
import { addNewSubmission, getAllTeamJobs } from "@/lib/apiUtils";

export default function DashboardPage() {
  const router = useRouter();
  const { data: session, status } = useSession();

  const [jobs, setJobs] = useState<Job[] | []>([]);
  const [newUrl, setNewUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;

  const { teamDetails, fetchTeamDetails, setTeamDetails } = useTeamStore();

  useEffect(() => {
    if (status === "loading") return;
    if (status === "unauthenticated") router.push("/");

    if (session?.user?.email) {
      fetchTeamDetails(session.user.id);

      const fetchJobs = async () => {
        const data = await getAllTeamJobs(session.user.id);
        setJobs(data);
      };

      fetchJobs();
    }
  }, [router, status]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!newUrl) {
      alert("Please enter a valid URL");
      return;
    }

    if (teamDetails?.submissionsLeft! <= 0) {
      alert("You have reached the maximum of 10 submissions");
      return;
    }

    setLoading(true);

    try {
      const newSubmission: SubmissionRequest = {
        team_id: session?.user.id,
        submission_url: newUrl,
        top_k: 5,
      };

      const { success, user } = await addNewSubmission(newSubmission);
      if (success) setTeamDetails(user);
      else throw new Error("Submission failed");

      const updatedJobs = await getAllTeamJobs(session!.user.id);
      setJobs(updatedJobs);

      setNewUrl("");
      alert("Submission added successfully!");
    } catch (error) {
      alert("Failed to submit. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleRefreshSubmissions = async () => {
    if (session?.user.id) {
      const updatedJobs = await getAllTeamJobs(session.user.id);
      setJobs(updatedJobs);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "completed":
        return "bg-green-500/20 text-green-400";
      case "queued":
        return "bg-yellow-500/20 text-yellow-400";
      case "failed":
        return "bg-red-500/20 text-red-400";
      default:
        return "bg-gray-500/20 text-gray-400";
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case "completed":
        return "✓ Evaluated";
      case "queued":
        return "⏳ Queued";
      case "failed":
        return "✗ Failed";
      default:
        return status;
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border sticky top-0 bg-background/95 backdrop-blur">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <div>
            <Link href="/">
              <h1 className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-500">
                Hack-A-Cure
              </h1>
            </Link>
            <p className="text-sm text-muted-foreground">
              Welcome, {teamDetails?.teamName}
            </p>
          </div>

          <div className="flex items-center gap-4">
            <Badge
              variant={
                teamDetails?.submissionsLeft! < 3 ? "destructive" : "secondary"
              }
            >
              Submissions: {teamDetails?.submissionsLeft} / 10
            </Badge>
            <Link href="/leaderboard">
              <Button variant="outline" className="hover:bg-[rgb(30,86,213)] hover:text-white">Leaderboard</Button>
            </Link>
            <Button variant="outline" className="hover:bg-[rgb(30,86,213)] hover:text-white" onClick={() => signOut()}>
              Logout
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-8">
        <Tabs defaultValue="submission" className="space-y-6">
          <TabsList className="grid w-full max-w-md grid-cols-2">
            <TabsTrigger value="submission">Submit</TabsTrigger>
            <TabsTrigger value="rules">Rules & Guidelines</TabsTrigger>
          </TabsList>

          {/* Submission Tab */}
          <TabsContent value="submission" className="space-y-6">
            {/* Submission Form */}
            <Card>
              <CardHeader>
                <CardTitle>Submit Your RAG Endpoint</CardTitle>
                <CardDescription>
                  Submit your model's API endpoint for evaluation. You have{" "}
                  {teamDetails?.submissionsLeft} submissions remaining.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="url">API Endpoint URL</Label>
                    <Input
                      id="url"
                      type="url"
                      placeholder="https://your-api-url.com/predict"
                      value={newUrl}
                      onChange={(e) => setNewUrl(e.target.value)}
                      disabled={loading || teamDetails?.submissionsLeft === 0}
                    />
                    <p className="text-xs text-muted-foreground">
                      Must be a POST endpoint that accepts JSON with a
                      "question" field
                    </p>
                  </div>

                  <Button
                    type="submit"
                    disabled={loading || teamDetails?.submissionsLeft === 0}
                  >
                    {loading ? "Submitting..." : "Submit Endpoint"}
                  </Button>
                </form>
              </CardContent>
            </Card>

            {/* Info Cards */}
            <div className="grid md:grid-cols-2 gap-4">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium">
                    Submission Limit
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">10</div>
                  <p className="text-xs text-muted-foreground mt-1">per team</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium">
                    Last Submission
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-sm font-mono">
                    {jobs && jobs.length > 0
                      ? formatDateTime(jobs[0].created_at, timeZone)
                      : "No submissions yet"}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Previous Submissions */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Previous Submissions</CardTitle>
                    <CardDescription>
                      Your submission history and evaluation results
                    </CardDescription>
                  </div>
                  <Button
                    onClick={handleRefreshSubmissions}
                    variant="outline"
                    size="sm"
                  >
                    Refresh
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border">
                        <th className="text-left py-3 px-4 font-medium">#</th>
                        <th className="text-left py-3 px-4 font-medium">
                          API URL
                        </th>
                        <th className="text-left py-3 px-4 font-medium">
                          Date Submitted
                        </th>
                        <th className="text-left py-3 px-4 font-medium">
                          Status
                        </th>
                        <th className="text-left py-3 px-4 font-medium">
                          Score
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {jobs.map((job, i) => (
                        <tr
                          key={i}
                          className="border-b border-border hover:bg-card/50 transition"
                        >
                          <td className="py-3 px-4">{i + 1}</td>
                          <td className="py-3 px-4 font-mono text-xs truncate max-w-xs">
                            {job.submission_url}
                          </td>
                          <td className="py-3 px-4 text-xs">
                            {formatDateTime(job.created_at, timeZone)}
                          </td>
                          <td className="py-3 px-4">
                            <Badge className={getStatusColor(job.status)}>
                              {getStatusLabel(job.status)}
                            </Badge>
                          </td>
                          <td className="py-3 px-4 font-bold">
                            {job.total_score ? `${job.total_score}` : "—"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Rules Tab */}
          <TabsContent value="rules" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Participant Query API: Integration Guide</CardTitle>
              </CardHeader>
              <CardContent>
                <Accordion type="single" collapsible className="w-full">
                  <AccordionItem value="contract">
                    <AccordionTrigger>
                      API Contract: TL;DR for Request & Response Structure
                    </AccordionTrigger>
                    <AccordionContent className="space-y-3 text-sm">
                      <p>
                        <strong>Method:</strong> POST
                      </p>
                      <p>
                        <strong>URL:</strong> The “submission_url” you provide
                        when submitting a job
                      </p>
                      <p>
                        <strong>Request Body (JSON):</strong>
                      </p>
                      <pre className="bg-card p-3 rounded text-xs overflow-x-auto">
                        {`{
  "query": "string (required)",
  "top_k": "integer (optional)"
}`}
                      </pre>
                      <p>
                        <strong>Response Body (JSON):</strong>
                      </p>
                      <pre className="bg-card p-3 rounded text-xs overflow-x-auto">
                        {`{
  "answer": "string (required)",
  "contexts": ["string", "..."] 
}`}
                      </pre>
                      <p>
                        <strong>Timeout:</strong> 60 seconds per request
                      </p>
                      <p>
                        <strong>Status code:</strong> 200 on success; non-2xx
                        treated as error
                      </p>
                    </AccordionContent>
                  </AccordionItem>

                  <AccordionItem value="request-details">
                    <AccordionTrigger>
                      Request Details: How the Evaluator Calls Your Endpoint
                    </AccordionTrigger>
                    <AccordionContent className="space-y-3 text-sm">
                      <p>The evaluator posts JSON to your endpoint:</p>
                      <pre className="bg-card p-3 rounded text-xs overflow-x-auto">
                        {`{
  "query": "user question",
  "top_k": 5
}`}
                      </pre>
                      <p>
                        Headers: <code>Content-Type: application/json</code>
                      </p>
                      <p>Timeout: 60 seconds per request</p>
                    </AccordionContent>
                  </AccordionItem>

                  <AccordionItem value="response-details">
                    <AccordionTrigger>
                      Response Details: Expected JSON Shape & Content Rules
                    </AccordionTrigger>
                    <AccordionContent className="space-y-3 text-sm">
                      <p>Status: 200 OK for successful answers</p>
                      <pre className="bg-card p-3 rounded text-xs overflow-x-auto">
                        {`{
  "answer": "Your concise answer",
  "contexts": ["Snippet 1", "Snippet 2"]
}`}
                      </pre>
                      <p>
                        Keep contexts as an array of plain strings, not objects.
                      </p>
                    </AccordionContent>
                  </AccordionItem>

                  <AccordionItem value="examples">
                    <AccordionTrigger>
                      Reference Implementation Examples: Python FastAPI &
                      Node.js Express
                    </AccordionTrigger>
                    <AccordionContent className="space-y-3 text-sm">
                      <p>
                        <strong>Python (FastAPI)</strong>
                      </p>
                      <pre className="bg-card p-3 rounded text-xs overflow-x-auto">
                        {`from fastapi import FastAPI
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
    contexts = ["Snippet 1", "Snippet 2"][: max(0, req.top_k or 0)]
    answer = "Your concise answer here."
    return QueryResponse(answer=answer, contexts=contexts)`}
                      </pre>

                      <p>
                        <strong>Node.js (Express)</strong>
                      </p>
                      <pre className="bg-card p-3 rounded text-xs overflow-x-auto">
                        {`const express = require("express");
const app = express();
app.use(express.json());

app.post("/query", async (req, res) => {
  const { query, top_k } = req.body || {};
  if (!query) return res.status(400).json({ error: "query is required" });
  const k = Number.isInteger(top_k) ? top_k : 5;
  const contexts = ["Snippet 1", "Snippet 2"].slice(0, Math.max(0, k));
  const answer = "Your concise answer here.";
  res.json({ answer, contexts });
});

app.listen(3000, () => console.log("Listening on 3000"));`}
                      </pre>
                    </AccordionContent>
                  </AccordionItem>

                  <AccordionItem value="scoring">
                    <AccordionTrigger>
                      Scoring Guidelines: How the Evaluator Computes Metrics
                    </AccordionTrigger>
                    <AccordionContent className="space-y-3 text-sm">
                      <ul className="list-disc ml-5">
                        <li>Answer Relevancy: 30%</li>
                        <li>Answer Correctness: 30%</li>
                        <li>Context Relevance: 25%</li>
                        <li>Faithfulness: 15%</li>
                      </ul>
                      <p>Tips:</p>
                      <ul className="list-disc ml-5">
                        <li>Return concise, correct answers</li>
                        <li>
                          Provide high-quality, directly relevant context
                          snippets
                        </li>
                        <li>
                          Use <code>top_k</code> to limit contexts (3–5 is
                          ideal)
                        </li>
                      </ul>
                    </AccordionContent>
                  </AccordionItem>

                  <AccordionItem value="operational">
                    <AccordionTrigger>
                      Operational Notes: Endpoint Requirements & Best Practices
                    </AccordionTrigger>
                    <AccordionContent className="space-y-3 text-sm">
                      <ul className="list-disc ml-5">
                        <li>Endpoint must be publicly accessible</li>
                        <li>
                          Evaluator sends one question per request, 60s timeout
                        </li>
                        <li>
                          Non-200 responses or missing answer mark the sample
                          invalid
                        </li>
                        <li>
                          <code>contexts</code> can be empty, but quality
                          affects scoring
                        </li>
                      </ul>
                    </AccordionContent>
                  </AccordionItem>

                  <AccordionItem value="checklist">
                    <AccordionTrigger>
                      Integration Checklist: Things to Verify Before Submitting
                    </AccordionTrigger>
                    <AccordionContent className="space-y-3 text-sm">
                      <ul className="list-disc ml-5">
                        <li>POST route accepting application/json</li>
                        <li>
                          Request shape:{" "}
                          {`{ "query": string, "top_k": number }`}
                        </li>
                        <li>
                          Response shape:{" "}
                          {`{ "answer": string, "contexts": string[] }`}
                        </li>
                        <li>200 status on success</li>
                        <li>Respond within 60 seconds</li>
                        <li>Contexts are plain strings, short and relevant</li>
                      </ul>
                    </AccordionContent>
                  </AccordionItem>

                  <AccordionItem value="curl">
                    <AccordionTrigger>
                      Example cURL Request & Expected Response
                    </AccordionTrigger>
                    <AccordionContent className="space-y-3 text-sm">
                      <pre className="bg-card p-3 rounded text-xs overflow-x-auto">
                        {`curl -X POST https://your-host/query \\
  -H "Content-Type: application/json" \\
  -d '{"query":"When to give Tdap booster?", "top_k":3}'

Response:
{
  "answer": "Tdap booster is recommended once every 10 years in adulthood.",
  "contexts": [
    "Adults should receive a Td or Tdap booster every 10 years.",
    "A single Tdap dose is recommended in adulthood, with Td or Tdap thereafter."
  ]
}`}
                      </pre>
                    </AccordionContent>
                  </AccordionItem>
                </Accordion>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
