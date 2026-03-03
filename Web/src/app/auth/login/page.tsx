"use client";
import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Mail, Lock, ArrowRight, Github, Loader2, Eye, EyeOff, AlertTriangle } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import apiClient from "@/lib/api";
import { useAuth } from "@/context/AuthContext";

const GOOGLE_OAUTH_URL = `${process.env.NEXT_PUBLIC_API_URL?.replace("/api/v1", "") ?? "http://localhost:5000"}/api/v1/auth/google`;

export default function LoginPage() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const { checkAuth, login } = useAuth();

    const [formData, setFormData] = useState({ email: "", password: "" });
    const [loading, setLoading] = useState(false);
    const getErrorMessage = (code: string | null) => {
        switch (code) {
            case "service_unavailable": return "Authentication service is temporarily unavailable. Please try again later.";
            case "oauth_failed": return "Google authentication failed. Please try again.";
            case "user_not_found": return "We couldn't find your account. If you just deleted it, please wait for the grace period or sign up for a new one.";
            case "account_deleted": return "This account has been permanently deleted and cannot be reactivated.";
            default: return null;
        }
    };

    const [error, setError] = useState<string | null>(getErrorMessage(searchParams.get("error")));
    const [showPassword, setShowPassword] = useState(false);
    // Special state for unverified email (403)
    const [unverified, setUnverified] = useState(false);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
        setError(null);
        setUnverified(false);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);
        setUnverified(false);

        try {
            const res = await apiClient.post("/auth/login", formData);
            // Store access token and user data in context immediately
            if (res.data?.accessToken && res.data?.user) {
                login(res.data.user, res.data.accessToken);
            } else {
                await checkAuth();
            }
            router.push("/");
        } catch (err: any) {
            const status = err.response?.status;
            const message = err.response?.data?.message;
            if (status === 403) {
                setUnverified(true);
                setError(message || "Account not verified. Please check your email.");
            } else {
                setError(message || "Login failed. Please check your credentials.");
            }
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

                <div className="text-center space-y-2">
                    <h1 className="text-4xl font-extrabold tracking-tight">Welcome Back</h1>
                    <p className="text-slate-400">Sign in to your Zuvo account.</p>
                </div>

                <form className="space-y-5" onSubmit={handleSubmit}>
                    {/* Error Banner */}
                    <AnimatePresence>
                        {error && (
                            <motion.div
                                initial={{ opacity: 0, y: -8 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0 }}
                                className={`rounded-xl p-3 border text-sm ${unverified
                                    ? "bg-amber-500/10 border-amber-500/20 text-amber-400"
                                    : "bg-red-500/10 border-red-500/20 text-red-400"
                                    }`}
                            >
                                <div className="flex items-start gap-2">
                                    <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
                                    <div>
                                        <p className="font-medium">{error}</p>
                                        {unverified && (
                                            <p className="text-xs mt-1 opacity-80">
                                                Check your inbox for the verification link, or{" "}
                                                <button
                                                    type="button"
                                                    className="underline font-semibold"
                                                    onClick={() => router.push(`/auth/forgot-password`)}
                                                >
                                                    resend it
                                                </button>
                                                .
                                            </p>
                                        )}
                                    </div>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>

                    {/* Email */}
                    <div className="space-y-2">
                        <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider ml-1">Email Address</label>
                        <div className="relative group">
                            <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 group-focus-within:text-primary transition-colors" />
                            <input
                                type="email"
                                name="email"
                                required
                                value={formData.email}
                                onChange={handleChange}
                                placeholder="name@example.com"
                                className="w-full bg-white/5 border border-white/10 rounded-xl py-3 pl-12 pr-4 outline-none focus:border-primary/60 transition-all text-sm"
                            />
                        </div>
                    </div>

                    {/* Password */}
                    <div className="space-y-2">
                        <div className="flex items-center justify-between ml-1 mr-1">
                            <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Password</label>
                            <Link href="/auth/forgot-password" className="text-xs text-primary hover:underline transition-colors">
                                Forgot password?
                            </Link>
                        </div>
                        <div className="relative group">
                            <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 group-focus-within:text-primary transition-colors" />
                            <input
                                type={showPassword ? "text" : "password"}
                                name="password"
                                required
                                value={formData.password}
                                onChange={handleChange}
                                placeholder="••••••••"
                                className="w-full bg-white/5 border border-white/10 rounded-xl py-3 pl-12 pr-12 outline-none focus:border-primary/60 transition-all text-sm"
                            />
                            <button
                                type="button"
                                onClick={() => setShowPassword(p => !p)}
                                className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white transition-colors"
                                aria-label="Toggle password visibility"
                            >
                                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                            </button>
                        </div>
                    </div>

                    {/* Submit */}
                    <button
                        type="submit"
                        disabled={loading}
                        className="btn-primary w-full flex items-center justify-center gap-2 group h-[50px] font-bold text-base mt-2"
                    >
                        {loading ? (
                            <Loader2 className="w-5 h-5 animate-spin" />
                        ) : (
                            <>Sign In <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" /></>
                        )}
                    </button>
                </form>

                {/* Social Login */}
                <div className="flex justify-center">
                    <a
                        href={GOOGLE_OAUTH_URL}
                        className="flex items-center justify-center gap-3 py-3 px-8 rounded-xl border border-white/10 hover:bg-white/5 transition-all text-sm font-bold glass-panel group w-full"
                    >
                        <img src="https://www.google.com/favicon.ico" className="w-4 h-4 grayscale group-hover:grayscale-0 transition-all" alt="Google" />
                        Continue with Google
                    </a>
                </div>

                <p className="text-center text-sm text-slate-500">
                    Don't have an account?{" "}
                    <Link href="/auth/register" className="text-primary hover:underline font-bold transition-colors">
                        Sign up for free
                    </Link>
                </p>
            </motion.div>
        </div>
    );
}
