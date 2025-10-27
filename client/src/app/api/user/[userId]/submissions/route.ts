import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { connectDB } from "@/db/mongoose";
import { User } from "@/models/user.model";
import { IUser, Job } from "@/lib/types";

export async function GET(
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
    const user: IUser | null = await User.findById(userId);

    if (!user) {
      return NextResponse.json(
        { success: false, message: "User not found" },
        { status: 404 }
      );
    }

    const res = await fetch(`${process.env.BACKEND_URL}/jobs/team/${userId}`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    });

    if (!res.ok) {
      throw new Error("Failed to create job");
    }

    const jobs: Job[] = await res.json();

    const maxScore = jobs.reduce(
      (max, job) => (job.total_score > max ? job.total_score : max),
      0
    );
    user.bestScore = maxScore;

    await user.save();

    return NextResponse.json({ success: true, jobs });
  } catch (err) {
    return NextResponse.json(
      { success: false, data: String(err) },
      { status: 500 }
    );
  }
}
