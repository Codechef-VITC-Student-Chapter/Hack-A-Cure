import { IUser } from "@/lib/types";
import mongoose, { Schema } from "mongoose";

export const UserSchema = new Schema<IUser>(
  {
    name: { type: String, required: true },
    email: { type: String, required: true },
    teamName: { type: String, required: true },
    password: { type: String, required: true },
    jobIds: [{ type: Schema.Types.ObjectId, ref: "Job" }],
    bestScore: { type: Number, default: 0 },
    submissionsLeft: { type: Number, default: 10 },
    url: { type: String },
  },
  { timestamps: true }
);

export const User =
  mongoose.models.User || mongoose.model<IUser>("User", UserSchema, "users");
