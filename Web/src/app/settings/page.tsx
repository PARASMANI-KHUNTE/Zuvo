"use client";
import React, { useState, useEffect, useRef } from "react";
import { User, Lock, Bell, Moon, Shield, Webhook, Save, Loader2, Image as ImageIcon, CheckCircle2, AlertCircle } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import apiClient from "@/lib/api";

const SETTINGS_TABS = [
    { id: "account", label: "Account Overview", icon: User },
    { id: "privacy", label: "Privacy & Security", icon: Lock },
    { id: "notifications", label: "Notifications", icon: Bell },
    { id: "appearance", label: "Appearance", icon: Moon },
    { id: "dev", label: "Developer Options", icon: Webhook },
];

export default function SettingsPage() {
    const { user, loading: authLoading, setUser } = useAuth();
    const [activeTab, setActiveTab] = useState("account");
    const [saving, setSaving] = useState(false);
    const [status, setStatus] = useState<{ type: "success" | "error"; message: string } | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Change password state
    const [pwForm, setPwForm] = useState({ currentPassword: "", newPassword: "", confirmPassword: "" });
    const [pwSaving, setPwSaving] = useState(false);
    const [pwStatus, setPwStatus] = useState<{ type: "success" | "error"; message: string } | null>(null);

    const [formData, setFormData] = useState({
        name: "",
        username: "",
        bio: "",
        website: "",
        location: ""
    });

    useEffect(() => {
        if (user) {
            setFormData({
                name: user.name || "",
                username: user.username || "",
                bio: user.bio || "",
                website: user.website || "",
                location: user.location || ""
            });
        }
    }, [user]);

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        setStatus(null);

        try {
            const res = await apiClient.put("/auth/profile", formData);
            if (res.data.success) {
                // Update context
                setUser({ ...user, ...res.data.data });
                setStatus({ type: "success", message: "Profile updated successfully!" });
            }
        } catch (err: any) {
            setStatus({ type: "error", message: err.response?.data?.message || "Failed to update profile" });
        } finally {
            setSaving(false);
        }
    };

    const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setSaving(true);
        setStatus(null);

        try {
            const formDataMedia = new FormData();
            formDataMedia.append("file", file);
            const uploadRes = await apiClient.post("/media/upload", formDataMedia, {
                headers: { "Content-Type": "multipart/form-data" }
            });

            const avatarUrl = uploadRes.data.data.url;
            await apiClient.put("/auth/profile", { avatar: avatarUrl });

            setUser({ ...user, avatar: avatarUrl });
            setStatus({ type: "success", message: "Avatar updated!" });
        } catch (err) {
            setStatus({ type: "error", message: "Failed to upload avatar" });
        } finally {
            setSaving(false);
        }
    };

    const handleChangePassword = async (e: React.FormEvent) => {
        e.preventDefault();
        const { currentPassword, newPassword, confirmPassword } = pwForm;
        if (newPassword !== confirmPassword) {
            setPwStatus({ type: "error", message: "New passwords do not match." });
            return;
        }
        setPwSaving(true);
        setPwStatus(null);
        try {
            await apiClient.put("/auth/change-password", { currentPassword, newPassword });
            setPwStatus({ type: "success", message: "Password changed successfully!" });
            setPwForm({ currentPassword: "", newPassword: "", confirmPassword: "" });
        } catch (err: any) {
            setPwStatus({ type: "error", message: err.response?.data?.message || "Failed to change password." });
        } finally {
            setPwSaving(false);
        }
    };

    if (authLoading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4">
                <Loader2 className="w-8 h-8 text-primary animate-spin" />
                <p className="text-slate-500 font-medium">Loading settings...</p>
            </div>
        );
    }

    return (
        <div className="w-full max-w-5xl mx-auto flex flex-col md:flex-row gap-8 pb-20 items-start mt-8">

            {/* Left Sidebar Nav */}
            <div className="w-full md:w-72 glass-panel p-4 rounded-2xl flex-shrink-0 border border-white/5">
                <h1 className="text-xl font-bold text-white mb-6 px-2">Settings</h1>
                <nav className="flex flex-col gap-1">
                    {SETTINGS_TABS.map((tab) => {
                        const Icon = tab.icon;
                        const isActive = activeTab === tab.id;
                        return (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all font-medium text-sm w-full text-left ${isActive
                                    ? "bg-primary text-white shadow-[0_0_15px_rgba(235,54,120,0.3)]"
                                    : "text-slate-400 hover:bg-white/5 hover:text-slate-200"
                                    }`}
                            >
                                <Icon className="w-5 h-5" />
                                {tab.label}
                            </button>
                        );
                    })}
                </nav>
            </div>

            {/* Right Content Area */}
            <div className="flex-1 w-full space-y-6">

                {activeTab === "account" && (
                    <div className="space-y-6">
                        <div className="glass-panel p-6 md:p-8 rounded-2xl border border-white/5">
                            <h2 className="text-lg font-bold text-white border-b border-white/10 pb-4 mb-6">Profile Information</h2>

                            <div className="flex items-center gap-6 mb-8">
                                <div className="relative group cursor-pointer" onClick={() => fileInputRef.current?.click()}>
                                    <img
                                        src={user?.avatar || "https://api.dicebear.com/7.x/avataaars/svg?seed=me"}
                                        alt="Avatar"
                                        className="w-24 h-24 rounded-full border-4 border-[#020617] object-cover group-hover:opacity-50 transition-opacity bg-slate-800"
                                    />
                                    <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity text-white text-xs font-bold pointer-events-none bg-black/40 rounded-full">
                                        <ImageIcon className="w-5 h-5" />
                                    </div>
                                    <input type="file" ref={fileInputRef} hidden onChange={handleAvatarChange} accept="image/*" />
                                </div>
                                <div className="space-y-1">
                                    <h3 className="font-bold text-white">{formData.name || "Anonymous User"}</h3>
                                    <p className="text-slate-500 text-sm">@{formData.username}</p>
                                    <button
                                        onClick={() => fileInputRef.current?.click()}
                                        className="text-primary text-xs font-bold hover:underline"
                                    >
                                        Change Avatar
                                    </button>
                                </div>
                            </div>

                            <form className="space-y-4" onSubmit={handleSave}>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="space-y-1.5">
                                        <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Display Name</label>
                                        <input
                                            type="text"
                                            value={formData.name}
                                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                            className="form-input"
                                        />
                                    </div>
                                    <div className="space-y-1.5 opacity-50">
                                        <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Username</label>
                                        <input
                                            type="text"
                                            value={formData.username}
                                            disabled
                                            className="form-input cursor-not-allowed"
                                        />
                                    </div>
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Bio</label>
                                    <textarea
                                        rows={3}
                                        value={formData.bio}
                                        onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                                        className="form-input resize-none"
                                    />
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="space-y-1.5">
                                        <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Location</label>
                                        <input
                                            type="text"
                                            value={formData.location}
                                            onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                                            className="form-input"
                                        />
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Portfolio / Website</label>
                                        <input
                                            type="url"
                                            value={formData.website}
                                            onChange={(e) => setFormData({ ...formData, website: e.target.value })}
                                            className="form-input"
                                        />
                                    </div>
                                </div>

                                {status && (
                                    <div className={`p-3 rounded-xl flex items-center gap-2 text-sm ${status.type === 'success' ? 'bg-green-500/10 text-green-500' : 'bg-red-500/10 text-red-500'}`}>
                                        {status.type === 'success' ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
                                        {status.message}
                                    </div>
                                )}

                                <div className="pt-4 border-t border-white/10 flex justify-end">
                                    <button
                                        type="submit"
                                        disabled={saving}
                                        className="btn-primary w-full md:w-auto px-8 py-2.5 rounded-xl flex items-center justify-center gap-2 disabled:opacity-50"
                                    >
                                        {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Save className="w-4 h-4" /> Save Changes</>}
                                    </button>
                                </div>
                            </form>
                        </div>

                        {/* Change Password Section */}
                        <div className="glass-panel p-6 md:p-8 rounded-2xl border border-white/5">
                            <h2 className="text-lg font-bold text-white border-b border-white/10 pb-4 mb-6 flex items-center gap-2"><Lock className="w-4 h-4 text-primary" /> Change Password</h2>
                            <form className="space-y-4" onSubmit={handleChangePassword}>
                                <div className="space-y-1.5">
                                    <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Current Password</label>
                                    <input type="password" value={pwForm.currentPassword} onChange={e => setPwForm({ ...pwForm, currentPassword: e.target.value })} className="form-input" placeholder="••••••••" required />
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="space-y-1.5">
                                        <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">New Password</label>
                                        <input type="password" value={pwForm.newPassword} onChange={e => setPwForm({ ...pwForm, newPassword: e.target.value })} className="form-input" placeholder="Min. 6 characters" required minLength={6} />
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Confirm New Password</label>
                                        <input type="password" value={pwForm.confirmPassword} onChange={e => setPwForm({ ...pwForm, confirmPassword: e.target.value })} className="form-input" placeholder="Repeat new password" required minLength={6} />
                                    </div>
                                </div>
                                {pwStatus && (
                                    <div className={`p-3 rounded-xl flex items-center gap-2 text-sm ${pwStatus.type === 'success' ? 'bg-green-500/10 text-green-500' : 'bg-red-500/10 text-red-500'}`}>
                                        {pwStatus.type === 'success' ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
                                        {pwStatus.message}
                                    </div>
                                )}
                                <div className="pt-4 border-t border-white/10 flex justify-end">
                                    <button type="submit" disabled={pwSaving} className="btn-primary w-full md:w-auto px-8 py-2.5 rounded-xl flex items-center justify-center gap-2 disabled:opacity-50">
                                        {pwSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Lock className="w-4 h-4" /> Update Password</>}
                                    </button>
                                </div>
                            </form>
                        </div>

                        {/* Danger Zone */}
                        <div className="glass-panel p-6 rounded-2xl border border-red-500/20 bg-red-500/5">
                            <h2 className="text-red-500 font-bold mb-2">Danger Zone</h2>
                            <p className="text-sm text-slate-400 mb-4">Permanently delete your account and all associated data. This action cannot be undone.</p>
                            <button className="px-4 py-2 text-sm font-bold text-red-500 border border-red-500/50 rounded-lg hover:bg-red-500/20 transition-colors">
                                Delete Account
                            </button>
                        </div>
                    </div>
                )}

                {activeTab === "appearance" && (
                    <div className="glass-panel p-6 md:p-8 rounded-2xl border border-white/5 space-y-6">
                        <h2 className="text-lg font-bold text-white border-b border-white/10 pb-4 mb-6">Theme Settings</h2>

                        <div className="space-y-4">
                            <p className="text-sm text-slate-300">Choose your preferred application theme. Note: Zuvo heavily relies on dark gradients.</p>

                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <button className="glass-panel border-2 border-primary p-4 rounded-xl relative overflow-hidden text-left hover:border-primary transition-all">
                                    <div className="absolute inset-0 bg-gradient-to-br from-slate-900 to-black pointer-events-none" />
                                    <div className="relative z-10 flex flex-col gap-2">
                                        <span className="font-bold text-white">Neon Dark</span>
                                        <span className="text-xs text-primary">Active</span>
                                        <div className="h-10 w-full mt-2 rounded bg-white/5 border border-white/10" />
                                    </div>
                                </button>

                                <button className="glass-panel border-2 border-transparent hover:border-white/20 p-4 rounded-xl relative overflow-hidden text-left transition-all opacity-50 cursor-not-allowed">
                                    <div className="absolute inset-0 bg-[#f8fafc] pointer-events-none" />
                                    <div className="relative z-10 flex flex-col gap-2">
                                        <span className="font-bold text-slate-900">Light Mode</span>
                                        <span className="text-xs text-slate-500">Coming Soon</span>
                                        <div className="h-10 w-full mt-2 rounded bg-black/10 border border-black/10" />
                                    </div>
                                </button>

                                <button className="glass-panel border-2 border-transparent hover:border-white/20 p-4 rounded-xl relative overflow-hidden text-left transition-all opacity-50 cursor-not-allowed">
                                    <div className="absolute inset-0 bg-[#0f172a] pointer-events-none" />
                                    <div className="relative z-10 flex flex-col gap-2">
                                        <span className="font-bold text-slate-200">System Preference</span>
                                        <span className="text-xs text-slate-500">Coming Soon</span>
                                        <div className="h-10 w-full mt-2 rounded bg-white/10 border border-white/20" />
                                    </div>
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {activeTab === "privacy" && (
                    <div className="glass-panel p-8 rounded-2xl border border-white/5 space-y-6">
                        <h2 className="text-lg font-bold text-white border-b border-white/10 pb-4 mb-6">Privacy & Security</h2>
                        <div className="space-y-4">
                            <div className="flex items-center justify-between p-4 bg-white/5 rounded-xl border border-white/5">
                                <div>
                                    <p className="font-bold text-slate-200">Private Account</p>
                                    <p className="text-xs text-slate-500">Only people you approve can see your posts.</p>
                                </div>
                                <div className="w-12 h-6 bg-slate-700 rounded-full relative cursor-pointer"><div className="absolute left-1 top-1 w-4 h-4 bg-white rounded-full"></div></div>
                            </div>
                            <div className="flex items-center justify-between p-4 bg-white/5 rounded-xl border border-white/5">
                                <div>
                                    <p className="font-bold text-slate-200">Two-Factor Authentication</p>
                                    <p className="text-xs text-slate-500">Add an extra layer of security to your account.</p>
                                </div>
                                <button className="text-xs font-bold text-primary hover:underline">Enable</button>
                            </div>
                        </div>
                    </div>
                )}

                {activeTab === "notifications" && (
                    <div className="glass-panel p-8 rounded-2xl border border-white/5 space-y-6">
                        <h2 className="text-lg font-bold text-white border-b border-white/10 pb-4 mb-6">Notification Preferences</h2>
                        <div className="space-y-4">
                            {["Email Notifications", "Push Notifications", "In-app Badges", "Direct Messages"].map(pref => (
                                <div key={pref} className="flex items-center justify-between p-4 bg-white/5 rounded-xl border border-white/5">
                                    <p className="font-bold text-slate-200">{pref}</p>
                                    <div className="w-12 h-6 bg-primary rounded-full relative cursor-pointer shadow-neon-pink"><div className="absolute right-1 top-1 w-4 h-4 bg-white rounded-full"></div></div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {activeTab === "dev" && (
                    <div className="glass-panel p-8 rounded-2xl border border-white/5 space-y-6">
                        <h2 className="text-lg font-bold text-white border-b border-white/10 pb-4 mb-6">Developer Options</h2>
                        <div className="space-y-4">
                            <div className="p-4 bg-slate-900/50 rounded-xl border border-primary/20">
                                <p className="text-xs text-primary font-mono mb-2">API KEY</p>
                                <div className="flex gap-2">
                                    <input type="password" value="••••••••••••••••••••••••" readOnly className="flex-1 bg-black/40 border border-white/10 rounded px-3 py-1.5 font-mono text-xs text-slate-400" />
                                    <button className="text-xs font-bold text-primary opacity-50 cursor-not-allowed">Copy</button>
                                </div>
                            </div>
                            <p className="text-xs text-slate-500">Use this token to authenticate with the Zuvo Public API. Keep it secret.</p>
                        </div>
                    </div>
                )}

            </div>
        </div>
    );
}
