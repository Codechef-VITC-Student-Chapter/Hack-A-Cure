import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { connectDB } from "@/db/mongoose";
import { User } from "@/models/user.model";

export async function GET(
  request: Request,
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
    // Only allow the user to fetch their own record
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const sessionUserId = session.user.id || session.user?._id;
    if (!sessionUserId || sessionUserId !== userId) {
      return NextResponse.json(
        { success: false, error: "Forbidden" },
        { status: 403 }
      );
    }
    const user = await User.findById(userId);
    if (user) {
      return NextResponse.json({ success: true, data: user });
    } else {
      return NextResponse.json({
        success: false,
        data: "User doesn't exist",
      });
    }
  } catch (err) {
    return NextResponse.json(
      { success: false, data: String(err) },
      { status: 500 }
    );
  }
}
