import { Job, SubmissionRequest } from "./types";

export const addNewSubmission = async (newSubmission: SubmissionRequest) => {
  const response = await fetch(`/api/user/${newSubmission.team_id}/submit`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(newSubmission),
  });

  const data = await response.json();

  return data;
};

export const getAllTeamJobs = async (teamId: string) => {
  const response = await fetch(`/api/user/${teamId}/submissions`);

  const { jobs }: { jobs: Job[] } = await response.json();
  jobs.sort(
    (a, b) =>
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );

  return jobs;
};

export const getAllTeams = async () => {
  const response = await fetch(`/api/user`);
  const data = await response.json();
  return data;
};
