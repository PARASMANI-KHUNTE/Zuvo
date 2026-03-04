"use client";
import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Mail, ArrowRight, Loader2, ArrowLeft, CheckCircle2 } from "lucide-react";
import Link from "next/link";
import apiClient from "@/lib/api";

export default function ForgotPasswordPage() {
    const [email, setEmail] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [sent, setSent] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);
        try {
            await apiClient.post("/auth/forgot-password", { email });
            setSent(true);
        } catch (err: any) {
            setError(err.response?.data?.message || "Failed to send OTP. Please try again.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-[80vh] flex items-center justify-center p-6">
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="glass-panel max-w-md w-full p-10 space-y-8 relative overflow-hidden"
            >
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-primary via-secondary to-accent" />

                <AnimatePresence mode="wait">
                    {!sent ? (
                        <motion.div key="form" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-7">
                            <div className="space-y-2">
                                <Link href="/auth/login" className="flex items-center gap-2 text-slate-500 hover:text-white transition-colors text-sm w-fit">
                                    <ArrowLeft className="w-4 h-4" /> Back to login
                                </Link>
                                <h1 className="text-3xl font-extrabold tracking-tight pt-2">Forgot Password?</h1>
                                <p className="text-slate-400 text-sm">Enter your email and we&apos;ll send a one-time OTP to reset your password.</p>
                            </div>

                            {error && (
                                <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-3">
                                    <p className="text-red-400 text-sm font-medium text-center">{error}</p>
                                </div>
                            )}

                            <form className="space-y-5" onSubmit={handleSubmit}>
                                <div className="space-y-2">
                                    <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider ml-1">Email Address</label>
                                    <div className="relative group">
                                        <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 group-focus-within:text-primary transition-colors" />
                                        <input
                                            type="email"
                                            required
                                            value={email}
                                            onChange={e => setEmail(e.target.value)}
                                            placeholder="name@example.com"
                                            className="w-full bg-white/5 border border-white/10 rounded-xl py-3 pl-12 pr-4 outline-none focus:border-primary/60 transition-all text-sm"
                                        />
                                    </div>
                                </div>

                                <button
                                    type="submit"
                                    disabled={loading}
                                    className="btn-primary w-full flex items-center justify-center gap-2 group h-[50px] font-bold text-base"
                                >
                                    {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <>Send OTP <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" /></>}
                                </button>
                            </form>
                        </motion.div>
                    ) : (
                        <motion.div key="success" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="text-center space-y-6 py-4">
                            <div className="w-20 h-20 bg-emerald-500/10 rounded-full flex items-center justify-center mx-auto border border-emerald-500/20">
                                <CheckCircle2 className="w-10 h-10 text-emerald-400" />
                            </div>
                            <div className="space-y-2">
                                <h2 className="text-2xl font-bold">Check Your Email</h2>
                                <p className="text-slate-400 text-sm">We sent a 6-digit OTP to <span className="text-white font-semibold">{email}</span>.</p>
                                <p className="text-slate-500 text-xs">The OTP expires in 10 minutes.</p>
                            </div>
                            <Link
                                href={`/auth/reset-password?email=${encodeURIComponent(email)}`}
                                className="btn-primary w-full flex items-center justify-center gap-2 group h-[50px] font-bold text-base"
                            >
                                Enter OTP <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                            </Link>
                            <button onClick={() => setSent(false)} className="text-sm text-slate-500 hover:text-white transition-colors">
                                Didn&apos;t receive it? Try again
                            </button>
                        </motion.div>
                    )}
                </AnimatePresence>
            </motion.div>
        </div>
    );
}
