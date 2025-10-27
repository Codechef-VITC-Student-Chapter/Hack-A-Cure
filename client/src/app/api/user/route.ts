import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { connectDB } from "@/db/mongoose";
import { User } from "@/models/user.model";
import Redis from "ioredis";
import { IUser, Job } from "@/lib/types";

const redis = new Redis(process.env.REDIS_URL!);
const CACHE_KEY = "leaderboard";
const CACHE_TTL = 10 * 60;

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    const cached = await redis.get(CACHE_KEY);
    if (cached) {
      console.log("Serving leaderboard from Redis");
      const users = JSON.parse(cached);
      return NextResponse.json({ success: true, data: users });
    }

    await connectDB();
    let users = await User.find().sort({ bestScore: -1 });

    await Promise.all(
      users.map(async (user: IUser) => {
        const res = await fetch(
          `${process.env.BACKEND_URL}/jobs/team/${user._id as string}`,
          {
            method: "GET",
            headers: {
              "Content-Type": "application/json",
            },
          }
        );

        if (!res.ok) {
          throw new Error("Failed to fetch jobs");
        }

        const jobs: Job[] = await res.json();

        const maxScore = jobs.reduce(
          (max, job) => (job.total_score > max ? job.total_score : max),
          0
        );
        user.bestScore = maxScore;

        await user.save();
      })
    );

    users = await User.find().sort({ bestScore: -1 }).lean();

    await redis.set(CACHE_KEY, JSON.stringify(users), "EX", CACHE_TTL);
    console.log("📦 Cached leaderboard in Redis");

    return NextResponse.json({ success: true, data: users });
  } catch (error) {
    console.error("Error fetching leaderboard:", error);
    return NextResponse.json(
      { success: false, error: String(error) },
      { status: 500 }
    );
  }
}
