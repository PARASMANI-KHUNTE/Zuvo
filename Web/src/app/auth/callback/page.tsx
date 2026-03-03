"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import apiClient from "@/lib/api";
import { Loader2 } from "lucide-react";

export default function AuthCallbackPage() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const { login, user } = useAuth();
    const processed = useRef(false);
    const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
    const [message, setMessage] = useState("Completing authentication...");

    useEffect(() => {
        if (processed.current) return;

        const token = searchParams.get("token");
        const error = searchParams.get("error");

        if (error) {
            console.error("OAuth Callback: Error from backend:", error);
            setStatus("error");
            setMessage("Authentication failed: " + error);
            setTimeout(() => router.push("/auth/login?error=" + error), 2000);
            return;
        }

        processed.current = true;

        const handleLogin = async () => {
            try {
                setStatus("loading");

                let activeToken = token;
                if (!activeToken) {
                    const refreshRes = await apiClient.post("/auth/refresh-token");
                    activeToken = refreshRes.data?.accessToken;
                }

                if (!activeToken) {
                    throw new Error("Missing access token");
                }

                const response = await apiClient.get("/auth/me", {
                    headers: { Authorization: `Bearer ${activeToken}` }
                });

                if (response.data?.success && response.data?.data) {
                    const userData = response.data.data;
                    setStatus("success");
                    setMessage(`Welcome back, ${userData.name || "User"}!`);
                    login(userData, activeToken as string);

                    setTimeout(() => {
                        window.location.href = userData.hasSetUsername === false ? "/auth/onboarding" : "/";
                    }, 500);
                } else {
                    throw new Error("Profile fetch failed");
                }
            } catch (err) {
                console.error("OAuth Callback Error:", err);
                setStatus("error");
                setMessage("Authentication failed. Please try logging in again.");
                setTimeout(() => router.push("/auth/login?error=callback_error"), 2000);
            }
        };

        handleLogin();
    }, [searchParams, login, router]);

    // Separate effect for redirection to ensure it happens after state updates
    useEffect(() => {
        if (status === "success" && user) {
            // Hard redirect to clear any potential SPA state hangs
            const target = user.hasSetUsername === false ? "/auth/onboarding" : "/";
            window.location.href = target;
        }
    }, [status, user]);

    return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-[#0A0A0B] text-white p-4">
            <div className="glass-panel p-10 rounded-3xl border border-white/10 flex flex-col items-center gap-6 max-w-sm w-full text-center shadow-2xl">
                {status === "loading" && <Loader2 className="w-12 h-12 text-primary animate-spin" />}

                {status === "success" && (
                    <div className="w-16 h-16 rounded-full bg-green-500/20 flex items-center justify-center text-green-500 shadow-neon-cyan animate-bounce">
                        <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                        </svg>
                    </div>
                )}

                {status === "error" && (
                    <div className="w-16 h-16 rounded-full bg-red-500/20 flex items-center justify-center text-red-500">
                        <span className="text-3xl font-bold">!</span>
                    </div>
                )}

                <div className="space-y-2">
                    <h1 className="text-2xl font-bold tracking-tight">
                        {status === "success" ? "Login Successful" : status === "error" ? "Login Failed" : "Authenticating"}
                    </h1>
                    <p className="text-slate-500 text-sm">
                        {message}
                    </p>
                </div>

                {status === "loading" && (
                    <div className="w-full bg-white/5 h-1 rounded-full overflow-hidden mt-2">
                        <div className="bg-primary h-full animate-progress-buffer" style={{ width: '40%' }}></div>
                    </div>
                )}
            </div>
        </div>
    );
}
