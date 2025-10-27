import { IUser } from "@/models/user.model";

declare module "next-auth" {
  interface Session {
    user: IUser;
  }

  interface JWT {
    user: IUser;
  }
}
