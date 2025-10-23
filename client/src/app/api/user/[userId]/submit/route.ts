import { NextResponse } from "next/server";
import { connectDB } from "@/db/mongoose";
import { User } from "@/models/user.model";

export  async function POST(req: Request, { params }: { params: { userId: string } }) {
    try {
        await connectDB();
        let { url } = await req.json();
        let { userId } = params;
        let updatedUser = await User.findByIdAndUpdate(userId, { $set: { url: url } },{ new: true });

        if (!updatedUser) {
            return NextResponse.json({ success: false, message: "User not found" }, { status: 404 });
        }

        return NextResponse.json({ success: true, user: updatedUser });

    } catch (err) {
        return NextResponse.json({ success: false, data: String(err) }, { status: 500 });
    }
}