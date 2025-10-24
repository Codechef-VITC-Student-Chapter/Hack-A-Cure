import { NextResponse } from "next/server";
import bcrypt from "bcrypt";
import { User } from "@/models/user.model";
import { connectDB } from "@/db/mongoose";

export async function POST(req: Request) {
  try {
    await connectDB();
    const { name, teamName, email, password, url } = await req.json();

    if (!name || !teamName || !email || !password)
      return NextResponse.json({ error: "Missing fields" }, { status: 400 });

    const existing = await User.findOne({ $or: [{ teamName }, { email }] });
    if (existing) {
      if (existing.teamName === teamName)
        return NextResponse.json({ error: "Team already exists" }, { status: 400 });
      if (existing.email === email)
        return NextResponse.json({ error: "Email already registered" }, { status: 400 });
    }

    const hashed = await bcrypt.hash(password, 10);

    const newUser = await User.create({
      name,
      teamName,
      email,
      password: hashed,
      url: url || "",
      jobIds: [],
      bestScore: 0,
    });

    return NextResponse.json(
      { message: "Signup successful", user: { id: newUser._id, teamName: newUser.teamName, email: newUser.email } },
      { status: 201 }
    );
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
