"use client";
import React, { useState, useRef, Suspense } from "react";
import { motion } from "framer-motion";
import { Lock, ArrowRight, Loader2, Eye, EyeOff, CheckCircle2 } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import apiClient from "@/lib/api";

function ResetPasswordForm() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const emailFromQuery = searchParams.get("email") || "";

    const [email, setEmail] = useState(emailFromQuery);
    const [otp, setOtp] = useState(["", "", "", "", "", ""]);
    const [newPassword, setNewPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);
    const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

    const handleOtpChange = (index: number, value: string) => {
        if (value.length > 1) value = value.slice(-1);
        if (!/^\d*$/.test(value)) return;

        const newOtp = [...otp];
        newOtp[index] = value;
        setOtp(newOtp);
        setError(null);

        if (value && index < 5) {
            inputRefs.current[index + 1]?.focus();
        }
    };

    const handleOtpKeyDown = (index: number, e: React.KeyboardEvent) => {
        if (e.key === "Backspace" && !otp[index] && index > 0) {
            inputRefs.current[index - 1]?.focus();
        }
    };

    const handleOtpPaste = (e: React.ClipboardEvent) => {
        e.preventDefault();
        const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
        const newOtp = [...otp];
        pasted.split("").forEach((char, i) => { newOtp[i] = char; });
        setOtp(newOtp);
        inputRefs.current[Math.min(pasted.length, 5)]?.focus();
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const otpString = otp.join("");
        if (otpString.length < 6) { setError("Please enter the complete 6-digit OTP."); return; }

        setLoading(true);
        setError(null);
        try {
            await apiClient.post("/auth/reset-password", {
                email,
                otp: otpString,
                newPassword
            });
            setSuccess(true);
            setTimeout(() => router.push("/auth/login"), 3000);
        } catch (err: any) {
            setError(err.response?.data?.message || "Invalid or expired OTP. Please try again.");
        } finally {
            setLoading(false);
        }
    };

    if (success) {
        return (
            <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="text-center space-y-6 py-4">
                <div className="w-20 h-20 bg-emerald-500/10 rounded-full flex items-center justify-center mx-auto border border-emerald-500/20">
                    <CheckCircle2 className="w-10 h-10 text-emerald-400" />
                </div>
                <div className="space-y-2">
                    <h2 className="text-2xl font-bold">Password Reset!</h2>
                    <p className="text-slate-400 text-sm">Your password has been successfully updated.</p>
                    <p className="text-slate-500 text-xs italic">Redirecting to login...</p>
                </div>
                <Link href="/auth/login" className="btn-primary w-full flex items-center justify-center gap-2 group h-[50px] font-bold">
                    Sign In Now <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </Link>
            </motion.div>
        );
    }

    return (
        <form className="space-y-6" onSubmit={handleSubmit}>
            <div className="space-y-2">
                <h1 className="text-3xl font-extrabold tracking-tight">Reset Password</h1>
                <p className="text-slate-400 text-sm">Enter the OTP sent to your email and choose a new password.</p>
            </div>

            {error && (
                <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-3">
                    <p className="text-red-400 text-sm font-medium text-center">{error}</p>
                </div>
            )}

            {/* Email (if not pre-filled) */}
            {!emailFromQuery && (
                <div className="space-y-2">
                    <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider ml-1">Email Address</label>
                    <input
                        type="email"
                        required
                        value={email}
                        onChange={e => setEmail(e.target.value)}
                        placeholder="name@example.com"
                        className="w-full bg-white/5 border border-white/10 rounded-xl py-3 px-4 outline-none focus:border-primary/60 transition-all text-sm"
                    />
                </div>
            )}

            {/* OTP Input */}
            <div className="space-y-3">
                <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider block ml-1">6-Digit OTP</label>
                <div className="flex gap-3 justify-center" onPaste={handleOtpPaste}>
                    {otp.map((digit, i) => (
                        <input
                            key={i}
                            ref={el => { inputRefs.current[i] = el; }}
                            type="text"
                            inputMode="numeric"
                            maxLength={1}
                            value={digit}
                            onChange={e => handleOtpChange(i, e.target.value)}
                            onKeyDown={e => handleOtpKeyDown(i, e)}
                            className={`w-12 h-14 text-center text-xl font-bold bg-white/5 border rounded-xl outline-none transition-all ${digit ? "border-primary/60 text-white" : "border-white/10 text-slate-500"
                                } focus:border-primary focus:bg-primary/5`}
                        />
                    ))}
                </div>
                <p className="text-xs text-slate-500 text-center">
                    Didn&apos;t get one?{" "}
                    <Link href="/auth/forgot-password" className="text-primary hover:underline">
                        Request a new OTP
                    </Link>
                </p>
            </div>

            {/* New Password */}
            <div className="space-y-2">
                <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider ml-1 block">New Password</label>
                <div className="relative group">
                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 group-focus-within:text-primary transition-colors" />
                    <input
                        type={showPassword ? "text" : "password"}
                        required
                        minLength={6}
                        value={newPassword}
                        onChange={e => setNewPassword(e.target.value)}
                        placeholder="Min. 6 characters"
                        className="w-full bg-white/5 border border-white/10 rounded-xl py-3 pl-12 pr-12 outline-none focus:border-primary/60 transition-all text-sm"
                    />
                    <button
                        type="button"
                        onClick={() => setShowPassword(p => !p)}
                        className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white transition-colors"
                    >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                </div>
            </div>

            <button
                type="submit"
                disabled={loading || otp.join("").length < 6}
                className="btn-primary w-full flex items-center justify-center gap-2 group h-[50px] font-bold text-base disabled:opacity-50"
            >
                {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <>Reset Password <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" /></>}
            </button>
        </form>
    );
}

export default function ResetPasswordPage() {
    return (
        <div className="min-h-[80vh] flex items-center justify-center p-6">
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="glass-panel max-w-md w-full p-10 space-y-8 relative overflow-hidden"
            >
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-primary via-secondary to-accent" />
                <Suspense fallback={<div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>}>
                    <ResetPasswordForm />
                </Suspense>
            </motion.div>
        </div>
    );
}
