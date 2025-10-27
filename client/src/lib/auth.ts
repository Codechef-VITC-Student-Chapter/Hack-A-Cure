import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcrypt";
import { connectDB } from "@/db/mongoose";
import { User } from "@/models/user.model";
import type { IUser } from "@/lib/types";

// Centralized NextAuth options so API routes can reuse getServerSession(authOptions)
export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "text" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        await connectDB();

        if (!credentials?.email || !credentials?.password) return null;

        const user = await User.findOne({ email: credentials.email });
        if (!user) return null;

        const isValid = await bcrypt.compare(
          credentials.password,
          user.password
        );
        if (!isValid) return null;

        const sessionUser: Partial<IUser> & { id: string } = {
          id: user._id.toString(),
          name: user.name,
          email: user.email,
          teamName: user.teamName,
          url: user.url,
          bestScore: user.bestScore,
          submissionsLeft: user.submissionsLeft,
        };
        // NextAuth expects a User-like object; we'll return a plain object and
        // attach it to token in the jwt callback.
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        return sessionUser as any;
      },
    }),
  ],
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60,
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        token.user = user as any;
      }
      return token;
    },
    async session({ session, token }) {
      // Augmented in src/types/next-auth.d.ts
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (session as any).user = token.user as any;
      return session;
    },
  },
  pages: {
    signIn: "/login",
  },
  secret: process.env.NEXTAUTH_SECRET,
};
