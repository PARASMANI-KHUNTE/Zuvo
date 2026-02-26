"use client";
import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
    Mail, Lock, User, ArrowRight, Github, AtSign,
    Loader2, Eye, EyeOff, CheckCircle2, XCircle
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import apiClient from "@/lib/api";
import { useAuth } from "@/context/AuthContext";

export default function RegisterPage() {
    const router = useRouter();
    const { checkAuth, login } = useAuth();

    const [formData, setFormData] = useState({
        name: "",
        email: "",
        username: "",
        password: "",
    });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);
    const [showPassword, setShowPassword] = useState(false);

    // Live Validation States
    const [usernameStatus, setUsernameStatus] = useState<"idle" | "checking" | "available" | "taken">("idle");
    const [emailStatus, setEmailStatus] = useState<"idle" | "checking" | "available" | "taken">("idle");

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
        setError(null);
        if (name === "username") setUsernameStatus("idle");
        if (name === "email") setEmailStatus("idle");
    };

    // Debounced Username Check
    useEffect(() => {
        if (!formData.username || formData.username.length < 3) return;
        const timer = setTimeout(async () => {
            setUsernameStatus("checking");
            try {
                const res = await apiClient.get(`/auth/check-username/${formData.username}`);
                setUsernameStatus(res.data.available ? "available" : "taken");
            } catch {
                setUsernameStatus("idle");
            }
        }, 500);
        return () => clearTimeout(timer);
    }, [formData.username]);

    // Debounced Email Check
    useEffect(() => {
        if (!formData.email || !formData.email.includes("@")) return;
        const timer = setTimeout(async () => {
            setEmailStatus("checking");
            try {
                const res = await apiClient.get(`/auth/check-email/${formData.email}`);
                setEmailStatus(res.data.available ? "available" : "taken");
            } catch {
                setEmailStatus("idle");
            }
        }, 500);
        return () => clearTimeout(timer);
    }, [formData.email]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (usernameStatus === "taken") { setError("Username is already taken"); return; }
        if (emailStatus === "taken") { setError("Email is already registered"); return; }

        setLoading(true);
        setError(null);
        try {
            await apiClient.post("/auth/register", formData);
            setSuccess(true);
            // After registration, auto-login using credentials
            try {
                const loginRes = await apiClient.post("/auth/login", {
                    email: formData.email,
                    password: formData.password
                });
                if (loginRes.data?.accessToken && loginRes.data?.user) {
                    login(loginRes.data.user, loginRes.data.accessToken);
                }
            } catch {
                // Login may fail if email verification is required — that's fine
            }
            setTimeout(() => router.push("/"), 2000);
        } catch (err: any) {
            setError(err.response?.data?.message || "Registration failed. Please try again.");
        } finally {
            setLoading(false);
        }
    };

    const fieldClass = (status: "idle" | "checking" | "available" | "taken") => {
        const base = "w-full bg-white/5 border rounded-xl py-3 pl-12 pr-4 outline-none transition-all text-sm";
        if (status === "available") return `${base} border-emerald-500/40 focus:border-emerald-500/60`;
        if (status === "taken") return `${base} border-red-500/40 focus:border-red-500/60`;
        return `${base} border-white/10 focus:border-primary/60`;
    };

    return (
        <div className="min-h-[90vh] flex items-center justify-center p-6 py-12">
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="glass-panel max-w-lg w-full p-10 space-y-8 relative overflow-hidden"
            >
                {/* Top accent line */}
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-primary via-secondary to-accent" />

                <div className="text-center space-y-2">
                    <h1 className="text-4xl font-extrabold tracking-tight">Create Your Account</h1>
                    <p className="text-slate-400">Join the decentralized future of Zuvo.</p>
                </div>

                {success ? (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="bg-emerald-500/10 border border-emerald-500/20 rounded-2xl p-8 text-center space-y-4"
                    >
                        <div className="w-16 h-16 bg-emerald-500/20 rounded-full flex items-center justify-center mx-auto">
                            <CheckCircle2 className="w-8 h-8 text-emerald-400" />
                        </div>
                        <div className="space-y-1">
                            <h3 className="text-xl font-bold text-white">Welcome to Zuvo!</h3>
                            <p className="text-slate-400">Your account has been created successfully.</p>
                        </div>
                        <p className="text-emerald-400/70 text-xs italic">Redirecting to your feed...</p>
                    </motion.div>
                ) : (
                    <form className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-5" onSubmit={handleSubmit}>
                        {error && (
                            <div className="col-span-full bg-red-500/10 border border-red-500/20 rounded-xl p-3 text-center">
                                <p className="text-red-400 text-sm font-medium">{error}</p>
                            </div>
                        )}

                        {/* Full Name */}
                        <div className="space-y-2 col-span-full">
                            <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider ml-1">Full Name</label>
                            <div className="relative group">
                                <User className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 group-focus-within:text-primary transition-colors" />
                                <input
                                    type="text"
                                    name="name"
                                    required
                                    value={formData.name}
                                    onChange={handleChange}
                                    placeholder="John Doe"
                                    className="w-full bg-white/5 border border-white/10 rounded-xl py-3 pl-12 pr-4 outline-none focus:border-primary/60 transition-all text-sm"
                                />
                            </div>
                        </div>

                        {/* Username */}
                        <div className="space-y-2">
                            <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider ml-1 flex justify-between items-center">
                                <span>Username</span>
                                {usernameStatus === "checking" && <Loader2 className="w-3 h-3 animate-spin text-slate-400" />}
                                {usernameStatus === "available" && <span className="text-emerald-400 flex items-center gap-1 text-[10px] normal-case font-normal"><CheckCircle2 className="w-3 h-3" /> Available</span>}
                                {usernameStatus === "taken" && <span className="text-red-400 flex items-center gap-1 text-[10px] normal-case font-normal"><XCircle className="w-3 h-3" /> Taken</span>}
                            </label>
                            <div className="relative group">
                                <AtSign className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 group-focus-within:text-primary transition-colors" />
                                <input
                                    type="text"
                                    name="username"
                                    required
                                    value={formData.username}
                                    onChange={handleChange}
                                    placeholder="johndoe"
                                    className={fieldClass(usernameStatus)}
                                />
                            </div>
                        </div>

                        {/* Email */}
                        <div className="space-y-2">
                            <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider ml-1 flex justify-between items-center">
                                <span>Email</span>
                                {emailStatus === "checking" && <Loader2 className="w-3 h-3 animate-spin text-slate-400" />}
                                {emailStatus === "available" && <span className="text-emerald-400 flex items-center gap-1 text-[10px] normal-case font-normal"><CheckCircle2 className="w-3 h-3" /> Available</span>}
                                {emailStatus === "taken" && <span className="text-red-400 flex items-center gap-1 text-[10px] normal-case font-normal"><XCircle className="w-3 h-3" /> Already registered</span>}
                            </label>
                            <div className="relative group">
                                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 group-focus-within:text-primary transition-colors" />
                                <input
                                    type="email"
                                    name="email"
                                    required
                                    value={formData.email}
                                    onChange={handleChange}
                                    placeholder="name@example.com"
                                    className={fieldClass(emailStatus)}
                                />
                            </div>
                        </div>

                        {/* Password */}
                        <div className="space-y-2 col-span-full">
                            <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider ml-1 block">Secure Password</label>
                            <div className="relative group">
                                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 group-focus-within:text-primary transition-colors" />
                                <input
                                    type={showPassword ? "text" : "password"}
                                    name="password"
                                    required
                                    minLength={6}
                                    value={formData.password}
                                    onChange={handleChange}
                                    placeholder="Min. 6 characters"
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
                            disabled={loading || usernameStatus === "taken" || emailStatus === "taken"}
                            className="btn-primary col-span-full flex items-center justify-center gap-2 group mt-2 h-[50px] font-bold text-base disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {loading ? (
                                <Loader2 className="w-5 h-5 animate-spin" />
                            ) : (
                                <>
                                    Complete Sign Up
                                    <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                                </>
                            )}
                        </button>
                    </form>
                )}

                {/* Divider */}
                <div className="relative py-2">
                    <div className="absolute inset-0 flex items-center">
                        <div className="w-full border-t border-white/5" />
                    </div>
                    <div className="relative flex justify-center text-xs uppercase">
                        <span className="bg-[#020617] px-4 text-slate-500 font-medium">Fast Connect</span>
                    </div>
                </div>

                {/* Social Login */}
                <div className="grid grid-cols-2 gap-4">
                    <button type="button" className="flex items-center justify-center gap-3 py-3 rounded-xl border border-white/10 hover:bg-white/5 transition-all text-sm font-bold glass-panel group">
                        <Github className="w-5 h-5 text-slate-400 group-hover:text-white transition-colors" />
                        Github
                    </button>
                    <button type="button" className="flex items-center justify-center gap-3 py-3 rounded-xl border border-white/10 hover:bg-white/5 transition-all text-sm font-bold glass-panel group">
                        <img src="https://www.google.com/favicon.ico" className="w-4 h-4 grayscale group-hover:grayscale-0 transition-all" alt="Google" />
                        Google
                    </button>
                </div>

                <p className="text-center text-sm text-slate-500">
                    Already part of Zuvo?{" "}
                    <Link href="/auth/login" className="text-primary hover:underline font-bold transition-colors">
                        Sign in here
                    </Link>
                </p>
            </motion.div>
        </div>
    );
}
