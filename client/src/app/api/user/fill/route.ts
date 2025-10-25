import { NextResponse } from "next/server";
import createUsers from "@/lib/createUsers"; // your function

export async function POST(req: Request) {
  try {
    // const secret = req.headers.get("x-admin-secret");
    // if (secret !== process.env.ADMIN_SECRET) {
    //   return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    // }

    await createUsers();
    return NextResponse.json({ success: true, message: "Users created successfully" });
  } catch (err) {
    return NextResponse.json({ success: false, error: String(err) }, { status: 500 });
  }
}
