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
  }

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
              <Button variant="outline">Leaderboard</Button>
            </Link>
            <Button variant="outline" onClick={() => signOut()}>
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
                  <Button onClick={handleRefreshSubmissions} variant="outline" size="sm">
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
                <CardTitle>Contest Rules & Guidelines</CardTitle>
              </CardHeader>
              <CardContent>
                <Accordion type="single" collapsible className="w-full">
                  <AccordionItem value="rules">
                    <AccordionTrigger>Contest Rules</AccordionTrigger>
                    <AccordionContent className="space-y-3 text-sm">
                      <p>
                        <strong>1. Eligibility:</strong> Teams of 1-5 members
                        can participate. Each team can make up to 10
                        submissions.
                      </p>
                      <p>
                        <strong>2. Submission Format:</strong> Submit a POST
                        endpoint that accepts JSON with a "question" field and
                        returns a JSON response with an "answer" field.
                      </p>
                      <p>
                        <strong>3. Evaluation:</strong> Models are evaluated on
                        accuracy, response quality, and latency.
                      </p>
                      <p>
                        <strong>4. Deadline:</strong> All submissions must be
                        made before the competition deadline.
                      </p>
                    </AccordionContent>
                  </AccordionItem>

                  <AccordionItem value="format">
                    <AccordionTrigger>Submission Format</AccordionTrigger>
                    <AccordionContent className="space-y-3 text-sm">
                      <p>
                        <strong>Request Format:</strong>
                      </p>
                      <pre className="bg-card p-3 rounded text-xs overflow-x-auto">
                        {`POST /predict
Content-Type: application/json

{
  "question": "What is the capital of France?"
}`}
                      </pre>
                      <p>
                        <strong>Response Format:</strong>
                      </p>
                      <pre className="bg-card p-3 rounded text-xs overflow-x-auto">
                        {`{
  "answer": "Paris",
  "confidence": 0.95,
  "sources": ["textbook_1.pdf"]
}`}
                      </pre>
                    </AccordionContent>
                  </AccordionItem>

                  <AccordionItem value="criteria">
                    <AccordionTrigger>Evaluation Criteria</AccordionTrigger>
                    <AccordionContent className="space-y-3 text-sm">
                      <p>
                        <strong>Accuracy (40%):</strong> How correctly your
                        model answers the test questions.
                      </p>
                      <p>
                        <strong>Response Quality (40%):</strong> Relevance and
                        completeness of answers.
                      </p>
                      <p>
                        <strong>Latency (20%):</strong> Response time (faster is
                        better, max 5 seconds).
                      </p>
                    </AccordionContent>
                  </AccordionItem>

                  <AccordionItem value="timeline">
                    <AccordionTrigger>Timeline</AccordionTrigger>
                    <AccordionContent className="space-y-3 text-sm">
                      <p>
                        <strong>Start Date:</strong> January 1, 2025
                      </p>
                      <p>
                        <strong>End Date:</strong> March 31, 2025
                      </p>
                      <p>
                        <strong>Results:</strong> April 15, 2025
                      </p>
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
