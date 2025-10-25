import { Document, Types } from "mongoose";

// ========== USER MODEL ==========

export interface IUser extends Document {
  name: string;
  email: string;
  teamName: string;
  password: string;
  jobIds: Types.ObjectId[];
  bestScore: number;
  submissionsLeft: number;
  url: string;
}

// ========== ENUMS ==========

export enum JobStatus {
  NEW = "new",
  QUEUED = "queued",
  RUNNING = "running",
  COMPLETED = "completed",
  FAILED = "failed",
}

// ========== DATABASE MODELS ==========

// --- Question/Answer Dataset ---
export interface QuestionAnswerPair {
  question: string;
  answer: string;
  dataset: string;
  created_at: string; // ISO datetime
}

// --- Score Summary ---
export interface ScoreSummary {
  avg_answer_correctness: number;
  avg_context_relevance: number;
  avg_answer_relevancy: number;
  avg_faithfulness: number;
  overall_score: number;
}

// --- Per-question metric breakdown ---
export interface MetricBreakdown {
  context_relevance: number;
  answer_correctness: number;
  answer_relevancy: number;
  faithfulness: number;
}

// --- Per-question result ---
export interface EvalCaseResult {
  question: string;
  ground_truth: string;
  predicted_answer?: string;
  metrics: MetricBreakdown;
  error?: string;
}

// --- Job Schema ---
export interface Job {
  team_id: string;
  submission_url: string;
  status: JobStatus;
  total_cases: number;
  processed_cases: number;
  top_k: number;
  total_score: number;
  scores?: ScoreSummary;
  results: EvalCaseResult[];
  created_at: string;
  started_at?: string;
  finished_at?: string;
  error_message?: string;
  _id?: Types.ObjectId; // MongoDB document ID
}

// ========== API MODELS ==========

// --- Submission ---
export interface SubmissionRequest {
  team_id: string;
  submission_url: string;
  top_k?: number; // default = 5
}

export interface SubmissionResponse {
  job_id: string;
  status: JobStatus;
}

// --- Job status / details ---
export interface JobStatusResponse {
  job_id: string;
  team_id: string;
  status: JobStatus;
  dataset_name: string;
  total_cases: number;
  processed_cases: number;
  created_at: string;
  started_at?: string;
  finished_at?: string;
  error_message?: string;
}

export interface JobDetailResponse {
  job_id: string;
  team_id: string;
  submission_url: string;
  status: JobStatus;
  dataset_name: string;
  total_cases: number;
  processed_cases: number;
  created_at: string;
  started_at?: string;
  finished_at?: string;
  scores?: ScoreSummary;
  results: EvalCaseResult[];
  error_message?: string;
}

export interface TeamJobsResponse {
  team_id: string;
  jobs: Job[];
}
