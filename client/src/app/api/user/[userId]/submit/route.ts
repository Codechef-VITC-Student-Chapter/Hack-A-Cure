import { NextResponse } from "next/server";
import { connectDB } from "@/db/mongoose";
import { User } from "@/models/user.model";
import { IUser, SubmissionRequest, SubmissionResponse } from "@/lib/types";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    await connectDB();
    const { team_id, submission_url, top_k }: SubmissionRequest =
      await req.json();
    const { userId } = await params;
    const updatedUser = await User.findById(userId);

    if (!updatedUser) {
      return NextResponse.json(
        { success: false, message: "User not found" },
        { status: 404 }
      );
    }

    if (updatedUser.submissionsLeft > 0) {
      const res = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/jobs`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          team_id,
          submission_url,
          top_k,
        }),
      });

      if (!res.ok) {
        throw new Error("Failed to create job");
      }

      const { job_id } : SubmissionResponse = await res.json();

      updatedUser.url = submission_url;
      updatedUser.submissionsLeft -= 1;
      updatedUser.jobIds.push(job_id);

      await updatedUser.save();
    }

    return NextResponse.json({ success: true, user: updatedUser });
  } catch (err) {
    return NextResponse.json(
      { success: false, data: String(err) },
      { status: 500 }
    );
  }
}
