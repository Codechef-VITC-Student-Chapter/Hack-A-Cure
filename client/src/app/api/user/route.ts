import { NextResponse } from "next/server";
import { connectDB } from "@/db/mongoose";
import { User } from "@/models/user.model";

export async function GET(){
    try{
        await connectDB();
        const users=await User.find().sort({bestScore:-1}); 
        return NextResponse.json({success:true,data:users});

    } catch(error){
        return NextResponse.json({success:false,error:String(error)},{status:500});
    }
}
