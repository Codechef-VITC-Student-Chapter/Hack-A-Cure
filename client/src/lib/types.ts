import { Types } from "mongoose";

export interface IUser {
  name: string;
  email: string;
  teamName: string;
  password: string;
  jobIds: Types.ObjectId[];
  bestScore: number;
  submissionsLeft: number;
  url: string;
}
