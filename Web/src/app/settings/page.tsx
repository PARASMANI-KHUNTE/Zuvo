"use client";
import React, { useState, useEffect, useRef } from "react";
import { User, Lock, Bell, Moon, Shield, Webhook, Save, Loader2, Image as ImageIcon, CheckCircle2, AlertCircle, Twitter, Instagram, Github, MapPin, Globe, Camera } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import apiClient from "@/lib/api";
import imageCompression from "browser-image-compression";

const compressImage = async (file: File): Promise<File> => {
    const options = {
        maxSizeMB: 1,
        maxWidthOrHeight: 1920,
        useWebWorker: true,
        fileType: file.type as string,
    };
    try {
        return await imageCompression(file, options);
    } catch {
        return file; // fallback to original if compression fails
    }
};

const SETTINGS_TABS = [
    { id: "account", label: "Account Overview", icon: User },
    { id: "privacy", label: "Privacy & Security", icon: Lock },
    { id: "notifications", label: "Notifications", icon: Bell },
];

export default function SettingsPage() {
    const { user, loading: authLoading, setUser } = useAuth();
    const [activeTab, setActiveTab] = useState("account");
    const [saving, setSaving] = useState(false);
    const [status, setStatus] = useState<{ type: "success" | "error"; message: string } | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const bannerInputRef = useRef<HTMLInputElement>(null);

    // Change password state
    const [pwForm, setPwForm] = useState({ currentPassword: "", newPassword: "", confirmPassword: "" });
    const [pwSaving, setPwSaving] = useState(false);
    const [pwStatus, setPwStatus] = useState<{ type: "success" | "error"; message: string } | null>(null);

    const [formData, setFormData] = useState({
        name: "",
        username: "",
        bio: "",
        website: "",
        location: "",
        socials: {
            twitter: "",
            instagram: "",
            github: ""
        },
        isPrivate: false
    });

    useEffect(() => {
        if (user) {
            setFormData({
                name: user.name || "",
                username: user.username || "",
                bio: user.bio || "",
                website: user.website || "",
                location: user.location || "",
                socials: {
                    twitter: user.socials?.twitter || "",
                    instagram: user.socials?.instagram || "",
                    github: user.socials?.github || ""
                },
                isPrivate: user.isPrivate || false
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
            const compressed = await compressImage(file);
            const formDataMedia = new FormData();
            formDataMedia.append("file", compressed);
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

    const handleBannerChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setSaving(true);
        setStatus(null);

        try {
            const compressed = await compressImage(file);
            const formDataMedia = new FormData();
            formDataMedia.append("file", compressed);
            const uploadRes = await apiClient.post("/media/upload", formDataMedia, {
                headers: { "Content-Type": "multipart/form-data" }
            });

            const bannerUrl = uploadRes.data.data.url;
            await apiClient.put("/auth/profile", { banner: bannerUrl });

            setUser({ ...user, banner: bannerUrl });
            setStatus({ type: "success", message: "Header image updated!" });
        } catch (err) {
            setStatus({ type: "error", message: "Failed to upload header image" });
        } finally {
            setSaving(false);
        }
    };

    const handleSavePrivacy = async (privateValue: boolean) => {
        setFormData(prev => ({ ...prev, isPrivate: privateValue }));
        try {
            const res = await apiClient.put("/auth/profile", { isPrivate: privateValue });
            if (res.data.success) {
                setUser({ ...user, isPrivate: privateValue });
            }
        } catch (err) {
            console.error("Failed to update privacy", err);
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
                    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                        <div className="glass-panel overflow-hidden rounded-2xl border border-white/5 relative">
                            <div className="h-40 w-full relative group bg-slate-800">
                                <img
                                    src={user?.banner || "/default-banner.jpg"}
                                    alt="Banner"
                                    className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                                />
                                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center cursor-pointer" onClick={() => bannerInputRef.current?.click()}>
                                    <div className="flex items-center gap-2 bg-white/10 backdrop-blur-md px-4 py-2 rounded-full border border-white/20 text-white text-sm font-bold">
                                        <Camera className="w-4 h-4" />
                                        Change Cover
                                    </div>
                                </div>
                                <input type="file" ref={bannerInputRef} hidden onChange={handleBannerChange} accept="image/*" />
                            </div>

                            <div className="p-6 md:p-8 pt-0 relative">
                                <div className="relative -mt-12 mb-6 flex items-end justify-between">
                                    <div className="relative group cursor-pointer" onClick={() => fileInputRef.current?.click()}>
                                        <img
                                            src={user?.avatar || "https://api.dicebear.com/7.x/avataaars/svg?seed=me"}
                                            alt="Avatar"
                                            className="w-28 h-28 rounded-2xl border-4 border-[#020617] object-cover group-hover:brightness-75 transition-all bg-slate-900 shadow-2xl"
                                        />
                                        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity text-white pointer-events-none">
                                            <Camera className="w-6 h-6" />
                                        </div>
                                        <input type="file" ref={fileInputRef} hidden onChange={handleAvatarChange} accept="image/*" />
                                    </div>
                                    <div className="pb-2">
                                        <h3 className="text-2xl font-black text-white">{formData.name || "Anonymous User"}</h3>
                                        <p className="text-slate-400 font-medium">@{formData.username}</p>
                                    </div>
                                </div>

                                <form className="space-y-8" onSubmit={handleSave}>
                                    <div className="space-y-6">
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                            <div className="space-y-2">
                                                <label className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                                                    <User className="w-3 h-3 text-primary" /> Display Name
                                                </label>
                                                <input
                                                    type="text"
                                                    value={formData.name}
                                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                                    className="form-input focus:ring-2 focus:ring-primary/20 transition-all border-white/10"
                                                    placeholder="Enter your name"
                                                />
                                            </div>
                                            <div className="space-y-2 opacity-60 group">
                                                <label className="text-xs font-bold text-slate-400 uppercase tracking-widest">Username</label>
                                                <input
                                                    type="text"
                                                    value={formData.username}
                                                    disabled
                                                    className="form-input cursor-not-allowed bg-black/20"
                                                />
                                                <p className="text-[10px] text-slate-500 italic mt-1">Username cannot be changed currently.</p>
                                            </div>
                                        </div>

                                        <div className="space-y-2">
                                            <label className="text-xs font-bold text-slate-400 uppercase tracking-widest">Bio</label>
                                            <textarea
                                                rows={3}
                                                value={formData.bio}
                                                onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                                                className="form-input resize-none focus:ring-2 focus:ring-primary/20 transition-all border-white/10"
                                                placeholder="Tell us about yourself..."
                                            />
                                        </div>

                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                            <div className="space-y-2">
                                                <label className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                                                    <MapPin className="w-3 h-3 text-primary" /> Location
                                                </label>
                                                <input
                                                    type="text"
                                                    value={formData.location}
                                                    onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                                                    className="form-input border-white/10"
                                                    placeholder="San Francisco, CA"
                                                />
                                            </div>
                                            <div className="space-y-2">
                                                <label className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                                                    <Globe className="w-3 h-3 text-primary" /> Website
                                                </label>
                                                <input
                                                    type="url"
                                                    value={formData.website}
                                                    onChange={(e) => setFormData({ ...formData, website: e.target.value })}
                                                    className="form-input border-white/10"
                                                    placeholder="https://yourwebsite.com"
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    <div className="space-y-6 pt-6 border-t border-white/5">
                                        <h4 className="text-sm font-bold text-white uppercase tracking-widest">Social Presence</h4>
                                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                            <div className="relative group">
                                                <Twitter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 group-focus-within:text-sky-500 transition-colors" />
                                                <input
                                                    type="text"
                                                    value={formData.socials.twitter}
                                                    onChange={(e) => setFormData({ ...formData, socials: { ...formData.socials, twitter: e.target.value } })}
                                                    className="form-input pl-10 border-white/10"
                                                    placeholder="Twitter handle"
                                                />
                                            </div>
                                            <div className="relative group">
                                                <Instagram className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 group-focus-within:text-pink-500 transition-colors" />
                                                <input
                                                    type="text"
                                                    value={formData.socials.instagram}
                                                    onChange={(e) => setFormData({ ...formData, socials: { ...formData.socials, instagram: e.target.value } })}
                                                    className="form-input pl-10 border-white/10"
                                                    placeholder="Instagram handle"
                                                />
                                            </div>
                                            <div className="relative group">
                                                <Github className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 group-focus-within:text-white transition-colors" />
                                                <input
                                                    type="text"
                                                    value={formData.socials.github}
                                                    onChange={(e) => setFormData({ ...formData, socials: { ...formData.socials, github: e.target.value } })}
                                                    className="form-input pl-10 border-white/10"
                                                    placeholder="Github username"
                                                />
                                            </div>
                                        </div>
                                    </div>



                                    {status && (
                                        <div className={`p-4 rounded-2xl flex items-center gap-3 text-sm animate-in zoom-in-95 duration-300 ${status.type === 'success' ? 'bg-green-500/10 text-green-500 border border-green-500/20' : 'bg-red-500/10 text-red-500 border border-red-500/20'}`}>
                                            {status.type === 'success' ? <CheckCircle2 className="w-5 h-5 font-bold" /> : <AlertCircle className="w-5 h-5 font-bold" />}
                                            <span className="font-bold">{status.message}</span>
                                        </div>
                                    )}

                                    <div className="pt-4 flex justify-end">
                                        <button
                                            type="submit"
                                            disabled={saving}
                                            className="btn-primary w-full md:w-auto px-10 py-3 rounded-2xl flex items-center justify-center gap-2 disabled:opacity-50 shadow-lg hover:shadow-primary/20 transition-all font-black uppercase tracking-wider text-sm"
                                        >
                                            {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : <><Save className="w-5 h-5" /> Save Profile</>}
                                        </button>
                                    </div>
                                </form>
                            </div>
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


                {activeTab === "privacy" && (
                    <div className="glass-panel p-8 rounded-2xl border border-white/5 space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                        <h2 className="text-lg font-bold text-white border-b border-white/10 pb-4 mb-6">Privacy & Security</h2>
                        <div className="space-y-4">
                            <div className="flex items-center justify-between p-4 bg-white/5 rounded-xl border border-white/5 hover:bg-white/10 transition-colors">
                                <div>
                                    <p className="font-bold text-slate-200">Private Account</p>
                                    <p className="text-xs text-slate-500">Only people you approve can see your posts.</p>
                                </div>
                                <button
                                    onClick={() => handleSavePrivacy(!formData.isPrivate)}
                                    className={`w-12 h-6 rounded-full relative transition-colors duration-300 ${formData.isPrivate ? 'bg-accent shadow-neon-pink' : 'bg-slate-700'}`}
                                >
                                    <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all duration-300 ${formData.isPrivate ? 'right-1' : 'left-1'}`} />
                                </button>
                            </div>
                            <div className="flex items-center justify-between p-4 bg-white/5 rounded-xl border border-white/5">
                                <div>
                                    <p className="font-bold text-slate-200">Two-Factor Authentication</p>
                                    <p className="text-xs text-slate-500">Add an extra layer of security to your account.</p>
                                </div>
                                <button className="text-xs font-bold text-primary hover:underline px-4 py-2 bg-primary/10 rounded-lg">Enable</button>
                            </div>
                        </div>
                    </div>
                )}

                {activeTab === "notifications" && (
                    <div className="glass-panel p-8 rounded-2xl border border-white/5 space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                        <h2 className="text-lg font-bold text-white border-b border-white/10 pb-4 mb-6">Notification Preferences</h2>
                        <div className="space-y-4">
                            {["Email Notifications", "Push Notifications", "In-app Badges", "Direct Messages"].map(pref => (
                                <div key={pref} className="flex items-center justify-between p-4 bg-white/5 rounded-xl border border-white/5">
                                    <p className="font-bold text-slate-200">{pref}</p>
                                    <div className="w-12 h-6 bg-accent rounded-full relative cursor-pointer shadow-neon-pink"><div className="absolute right-1 top-1 w-4 h-4 bg-white rounded-full"></div></div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

            </div>
        </div>
    );
}
