import { NextResponse } from "next/server";
import { connectDB } from "@/db/mongoose";
import { User } from "@/models/user.model";
import { IUser, Job } from "@/lib/types";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    await connectDB();
    const { userId } = await params;
    const user: IUser | null = await User.findById(userId);

    if (!user) {
      return NextResponse.json(
        { success: false, message: "User not found" },
        { status: 404 }
      );
    }

    const res = await fetch(
      `${process.env.NEXT_PUBLIC_BACKEND_URL}/jobs/team/${userId}`,
      {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      }
    );

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
