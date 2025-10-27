import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { connectDB } from "@/db/mongoose";
import { User } from "@/models/user.model";
import { SubmissionRequest, SubmissionResponse } from "@/lib/types";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    await connectDB();
    const { team_id, submission_url, top_k }: SubmissionRequest =
      await req.json();
    const { userId } = await params;
    // Restrict to own submissions
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const sessionUserId = session.user.id || session.user?._id;
    if (!sessionUserId || sessionUserId !== userId) {
      return NextResponse.json(
        { success: false, error: "Forbidden" },
        { status: 403 }
      );
    }
    const updatedUser = await User.findById(userId);

    if (!updatedUser) {
      return NextResponse.json(
        { success: false, message: "User not found" },
        { status: 404 }
      );
    }

    if (updatedUser.submissionsLeft > 0) {
      const res = await fetch(`${process.env.BACKEND_URL}/jobs`, {
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

      const { job_id }: SubmissionResponse = await res.json();

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
