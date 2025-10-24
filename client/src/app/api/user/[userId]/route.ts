//fetching the information for the specific userID from db

import { NextResponse } from "next/server";
import { connectDB } from "@/db/mongoose";
import { User } from "@/models/user.model";


export async function GET( request: Request,{ params }: { params: { userId: string } }){
    try{
        await connectDB();
        let {userId}= params;
        let user=await User.findById(userId);
        if(user){
        return NextResponse.json({success:true,data:user});
        } else{
        return NextResponse.json({success:false,data:"User doesn't exists!!"});
        }
    } catch(err){
        return NextResponse.json({success:false,data:String(err)},{status:500});
    }
}