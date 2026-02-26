"use client";
import React from "react";
import { motion } from "framer-motion";
import { Mail, Lock, ArrowRight, Github } from "lucide-react";
import Link from "next/link";

export default function LoginPage() {
    return (
        <div className="min-h-[80vh] flex items-center justify-center p-6">
            <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="glass-panel max-w-md w-full p-8 space-y-8"
            >
                <div className="text-center space-y-2">
                    <h1 className="text-3xl font-bold tracking-tight">Welcome Back</h1>
                    <p className="text-slate-400 text-sm">Log in to your Zuvo account to continue.</p>
                </div>

                <form className="space-y-4">
                    <div className="space-y-2">
                        <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider ml-1">Email Address</label>
                        <div className="relative group">
                            <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 group-focus-within:text-primary transition-colors" />
                            <input
                                type="email"
                                placeholder="name@example.com"
                                className="w-full bg-white/5 border border-white/10 rounded-xl py-3 pl-12 pr-4 outline-none focus:border-primary/50 transition-all text-sm"
                            />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider ml-1">Password</label>
                        <div className="relative group">
                            <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 group-focus-within:text-primary transition-colors" />
                            <input
                                type="password"
                                placeholder="••••••••"
                                className="w-full bg-white/5 border border-white/10 rounded-xl py-3 pl-12 pr-4 outline-none focus:border-primary/50 transition-all text-sm"
                            />
                        </div>
                    </div>

                    <div className="flex items-center justify-end">
                        <Link href="#" className="text-xs text-primary hover:underline">Forgot password?</Link>
                    </div>

                    <button className="btn-primary w-full flex items-center justify-center gap-2 group">
                        Sign In <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                    </button>
                </form>

                <div className="relative py-4">
                    <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-white/5" /></div>
                    <div className="relative flex justify-center text-xs uppercase"><span className="bg-[#020617] px-2 text-slate-500 font-medium">Or continue with</span></div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <button className="flex items-center justify-center gap-2 py-2.5 rounded-xl border border-white/10 hover:bg-white/5 transition-all text-sm font-medium">
                        <Github className="w-4 h-4" /> Github
                    </button>
                    <button className="flex items-center justify-center gap-2 py-2.5 rounded-xl border border-white/10 hover:bg-white/5 transition-all text-sm font-medium">
                        <img src="https://www.google.com/favicon.ico" className="w-4 h-4 grayscale" alt="Google" /> Google
                    </button>
                </div>

                <p className="text-center text-sm text-slate-500">
                    Don't have an account? <Link href="/auth/register" className="text-primary hover:underline font-semibold">Sign up</Link>
                </p>
            </motion.div>
        </div>
    );
}
