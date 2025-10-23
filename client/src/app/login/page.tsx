"use client";

import { signIn, useSession } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { useState, useEffect } from "react";

export default function LoginPage() {
    const [name, setName] = useState("");
    const [password, setPassword] = useState("");
    const [errorMsg, setErrorMsg] = useState("");
    const searchParams = useSearchParams();
    const router = useRouter();
    const { data: session, status }= useSession()

    useEffect(() => {
        if (status === "authenticated") {
            router.push("/");
        }
    }, [status, router]);

    useEffect(() => {
        const error = searchParams.get("error");
        if (error === "CredentialsSignin") {
            setErrorMsg("Invalid team name or password");
        }
    }, [searchParams]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        const res = await signIn("credentials", {
            name,
            password,
            redirect: false,
        });

        if (res?.error) {
            setErrorMsg("Invalid team name or password");
        } else {
            router.push("/");
        }
    };

    return (
        <form
            onSubmit={handleSubmit}
            className="flex flex-col gap-4 w-64 mx-auto mt-20"
        >
            {status || session}
            {errorMsg && <p className="text-red-500 text-sm">{errorMsg}</p>}
            <input
                type="text"
                placeholder="Name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="border p-2 rounded"
            />
            <input
                type="password"
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="border p-2 rounded"
            />
            <button
                type="submit"
                className="bg-blue-500 text-white p-2 rounded"
            >
                Login
            </button>
        </form>
    );
}
