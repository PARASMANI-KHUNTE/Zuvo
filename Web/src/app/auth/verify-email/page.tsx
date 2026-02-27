"use client";
import React, { useEffect, useState, Suspense } from "react";
import { motion } from "framer-motion";
import { CheckCircle2, XCircle, Loader2, ArrowRight } from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import apiClient from "@/lib/api";

function VerifyEmailContent() {
    const searchParams = useSearchParams();
    const token = searchParams.get("token");

    const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
    const [message, setMessage] = useState("");

    useEffect(() => {
        if (!token) {
            setStatus("error");
            setMessage("No verification token found. Please check your email link.");
            return;
        }

        const verify = async () => {
            try {
                const res = await apiClient.get(`/auth/verify-email?token=${token}`);
                setMessage(res.data.message || "Email verified successfully!");
                setStatus("success");
            } catch (err: any) {
                setMessage(err.response?.data?.message || "Verification failed. The link may have expired.");
                setStatus("error");
            }
        };

        verify();
    }, [token]);

    return (
        <div className="text-center space-y-6">
            {status === "loading" && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
                    <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center mx-auto border border-primary/20">
                        <Loader2 className="w-10 h-10 text-primary animate-spin" />
                    </div>
                    <div>
                        <h2 className="text-2xl font-bold">Verifying Your Email</h2>
                        <p className="text-slate-400 text-sm mt-1">Please wait a moment...</p>
                    </div>
                </motion.div>
            )}

            {status === "success" && (
                <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="space-y-6">
                    <div className="w-20 h-20 bg-emerald-500/10 rounded-full flex items-center justify-center mx-auto border border-emerald-500/20">
                        <CheckCircle2 className="w-10 h-10 text-emerald-400" />
                    </div>
                    <div className="space-y-2">
                        <h2 className="text-2xl font-bold">Email Verified!</h2>
                        <p className="text-slate-400 text-sm">{message}</p>
                        <p className="text-slate-500 text-xs">You can now sign in to your Zuvo account.</p>
                    </div>
                    <Link
                        href="/auth/login"
                        className="btn-primary w-full flex items-center justify-center gap-2 group h-[50px] font-bold"
                    >
                        Sign In Now <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                    </Link>
                </motion.div>
            )}

            {status === "error" && (
                <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="space-y-6">
                    <div className="w-20 h-20 bg-red-500/10 rounded-full flex items-center justify-center mx-auto border border-red-500/20">
                        <XCircle className="w-10 h-10 text-red-400" />
                    </div>
                    <div className="space-y-2">
                        <h2 className="text-2xl font-bold">Verification Failed</h2>
                        <p className="text-slate-400 text-sm">{message}</p>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                        <Link href="/auth/register" className="py-3 rounded-xl border border-white/10 hover:bg-white/5 transition-all text-sm font-bold text-center">
                            Re-register
                        </Link>
                        <Link href="/auth/login" className="btn-primary flex items-center justify-center text-sm font-bold h-[46px]">
                            Sign In
                        </Link>
                    </div>
                </motion.div>
            )}
        </div>
    );
}

export default function VerifyEmailPage() {
    return (
        <div className="min-h-[80vh] flex items-center justify-center p-6">
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="glass-panel max-w-md w-full p-10 relative overflow-hidden"
            >
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-primary via-secondary to-accent" />
                <Suspense fallback={
                    <div className="flex justify-center py-8">
                        <Loader2 className="w-6 h-6 animate-spin text-primary" />
                    </div>
                }>
                    <VerifyEmailContent />
                </Suspense>
            </motion.div>
        </div>
    );
}
