"use client";

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { User, AtSign, ArrowRight, Loader2, CheckCircle2, XCircle, Sparkles } from "lucide-react";
import { useRouter } from "next/navigation";
import apiClient from "@/lib/api";
import { useAuth } from "@/context/AuthContext";

export default function OnboardingPage() {
    const router = useRouter();
    const { user, checkAuth } = useAuth();
    const [username, setUsername] = useState("");
    const [status, setStatus] = useState<"idle" | "checking" | "available" | "taken">("idle");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);

    // Redirect if already has username
    useEffect(() => {
        if (user && user.hasSetUsername) {
            router.push("/");
        }
    }, [user, router]);

    // Live Validation
    useEffect(() => {
        if (!username || username.length < 3) {
            setStatus("idle");
            return;
        }
        const timer = setTimeout(async () => {
            setStatus("checking");
            try {
                const res = await apiClient.get(`/auth/check-username/${username}`);
                setStatus(res.data.available ? "available" : "taken");
            } catch {
                setStatus("idle");
            }
        }, 500);
        return () => clearTimeout(timer);
    }, [username]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (status !== "available") return;

        setLoading(true);
        setError(null);
        try {
            await apiClient.put("/auth/profile", {
                username: username.toLowerCase(),
                hasSetUsername: true
            });
            setSuccess(true);
            await checkAuth();
            setTimeout(() => {
                window.location.href = "/";
            }, 2000);
        } catch (err: any) {
            setError(err.response?.data?.message || "Failed to set username. Please try again.");
            setLoading(false);
        }
    };

    if (!user) return null;

    return (
        <div className="min-h-screen flex items-center justify-center p-6 bg-[#020617]">
            <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="glass-panel max-w-lg w-full p-10 space-y-8 relative overflow-hidden"
            >
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-primary via-secondary to-accent" />

                <div className="text-center space-y-4">
                    <div className="inline-flex items-center justify-center p-3 rounded-2xl bg-primary/10 mb-2">
                        <Sparkles className="w-8 h-8 text-primary shadow-neon-cyan" />
                    </div>
                    <h1 className="text-4xl font-extrabold tracking-tight">Final Step!</h1>
                    <p className="text-slate-400">Welcome to Zuvo, <span className="text-white font-semibold">{user.name}</span>. Choose a unique username to represent you in the decentralized world.</p>
                </div>

                {success ? (
                    <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="bg-emerald-500/10 border border-emerald-500/20 rounded-2xl p-8 text-center space-y-4"
                    >
                        <div className="w-16 h-16 bg-emerald-500/20 rounded-full flex items-center justify-center mx-auto">
                            <CheckCircle2 className="w-8 h-8 text-emerald-400" />
                        </div>
                        <div className="space-y-1">
                            <h3 className="text-xl font-bold text-white">All Set!</h3>
                            <p className="text-slate-400">Your profile is now active as <span className="text-emerald-400">@{username}</span></p>
                        </div>
                        <p className="text-emerald-400/70 text-xs italic">Redirecting to your feed...</p>
                    </motion.div>
                ) : (
                    <form className="space-y-6" onSubmit={handleSubmit}>
                        {error && (
                            <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-3 text-center">
                                <p className="text-red-400 text-sm font-medium">{error}</p>
                            </div>
                        )}

                        <div className="space-y-3">
                            <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider ml-1 flex justify-between items-center">
                                <span>Choose Username</span>
                                {status === "checking" && <Loader2 className="w-3 h-3 animate-spin text-slate-400" />}
                                {status === "available" && <span className="text-emerald-400 flex items-center gap-1 text-[10px] normal-case font-normal"><CheckCircle2 className="w-3 h-3" /> Available</span>}
                                {status === "taken" && <span className="text-red-400 flex items-center gap-1 text-[10px] normal-case font-normal"><XCircle className="w-3 h-3" /> Taken</span>}
                            </label>

                            <div className="relative group">
                                <AtSign className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500 group-focus-within:text-primary transition-colors" />
                                <input
                                    type="text"
                                    required
                                    value={username}
                                    onChange={(e) => setUsername(e.target.value.replace(/[^a-zA-Z0-9_]/g, "").toLowerCase())}
                                    placeholder="yourname"
                                    className={`w-full bg-white/5 border rounded-2xl py-4 pl-12 pr-4 outline-none transition-all text-lg font-medium tracking-wide ${status === "available" ? "border-emerald-500/40 focus:border-emerald-500/60" :
                                            status === "taken" ? "border-red-500/40 focus:border-red-500/60" :
                                                "border-white/10 focus:border-primary/60"
                                        }`}
                                />
                            </div>
                            <p className="text-[11px] text-slate-500 ml-1">Use letters, numbers, and underscores. Min 3 characters.</p>
                        </div>

                        <button
                            type="submit"
                            disabled={loading || status !== "available"}
                            className="btn-primary w-full flex items-center justify-center gap-3 group h-[60px] font-bold text-lg disabled:opacity-50 disabled:cursor-not-allowed shadow-neon-cyan/20"
                        >
                            {loading ? (
                                <Loader2 className="w-6 h-6 animate-spin" />
                            ) : (
                                <>
                                    Claim Username
                                    <ArrowRight className="w-6 h-6 group-hover:translate-x-1 transition-transform" />
                                </>
                            )}
                        </button>
                    </form>
                )}

                <div className="text-center pt-2">
                    <p className="text-xs text-slate-600 italic">This username will be your identity across the Zuvo network.</p>
                </div>
            </motion.div>
        </div>
    );
}
