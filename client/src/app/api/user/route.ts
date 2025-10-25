import { NextResponse } from "next/server";
import { connectDB } from "@/db/mongoose";
import { User } from "@/models/user.model";
import Redis from "ioredis";

const redis = new Redis(process.env.REDIS_URL!);
const CACHE_KEY = "leaderboard";
const CACHE_TTL = 15;

export async function GET() {
  try {
    const cached = await redis.get(CACHE_KEY);
    if (cached) {
      console.log("Serving leaderboard from Redis");
      const users = JSON.parse(cached);
      return NextResponse.json({ success: true, data: users });
    }

    await connectDB();
    const users = await User.find().sort({ bestScore: -1 });

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
