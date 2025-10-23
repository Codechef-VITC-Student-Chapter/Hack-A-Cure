"use client";

import { IUser } from "@/lib/types";
import { useSession, signOut } from "next-auth/react";
import { useRouter } from "next/navigation";

export default function HomePage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  return (
    <div className="min-h-screen flex flex-col">
      <nav className="bg-gray-800 text-white px-6 py-4 flex justify-between items-center">
        <h1 className="text-xl font-bold cursor-pointer" onClick={() => router.push("/")}>
          Test
        </h1>
        <div className="flex gap-4 items-center">
          {status === "loading" ? (
            <p>Loading...</p>
          ) : session ? (
            <>
              <span>Hello {session?.user?.name}</span>
              <button
                className="bg-red-500 px-3 py-1 rounded hover:bg-red-600"
                onClick={() => signOut({ callbackUrl: "/" })}
              >
                Logout
              </button>
            </>
          ) : (
            <>
              <button
                className="bg-blue-500 px-3 py-1 rounded hover:bg-blue-600"
                onClick={() => router.push("/login")}
              >
                Login
              </button>
              <button
                className="bg-green-500 px-3 py-1 rounded hover:bg-green-600"
                onClick={() => router.push("/signup")}
              >
                Sign Up
              </button>
            </>
          )}
        </div>
      </nav>

      <main className="flex-1 flex justify-center items-center text-2xl">
        {session ? (
          <p>Welcome back, {session?.user?.name}!</p>
        ) : (
          <p>Please login or signup to continue.</p>
        )}
      </main>
    </div>
  );
}
