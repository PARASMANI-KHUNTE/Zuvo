"use client";
import React, { useState } from "react";
import { User, Lock, Bell, Moon, Shield, Webhook, Save } from "lucide-react";

const SETTINGS_TABS = [
    { id: "account", label: "Account Overview", icon: User },
    { id: "privacy", label: "Privacy & Security", icon: Lock },
    { id: "notifications", label: "Notifications", icon: Bell },
    { id: "appearance", label: "Appearance", icon: Moon },
    { id: "dev", label: "Developer Options", icon: Webhook },
];

export default function SettingsPage() {
    const [activeTab, setActiveTab] = useState("account");

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
                                <div className="relative group cursor-pointer">
                                    <img src="https://i.pravatar.cc/150?u=arivera_dev" alt="Avatar" className="w-20 h-20 rounded-full border-4 border-[#020617] object-cover group-hover:opacity-50 transition-opacity" />
                                    <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity text-white text-xs font-bold pointer-events-none">
                                        Upload
                                    </div>
                                </div>
                                <div>
                                    <button className="btn-primary px-4 py-2 text-sm rounded-lg">Change Avatar</button>
                                    <button className="text-slate-400 text-sm hover:text-white px-4 py-2 ml-2 transition-colors">Remove</button>
                                </div>
                            </div>

                            <form className="space-y-4" onSubmit={e => e.preventDefault()}>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="space-y-1.5">
                                        <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Display Name</label>
                                        <input type="text" defaultValue="Alex Rivera" className="form-input" />
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Username</label>
                                        <input type="text" defaultValue="arivera_dev" className="form-input" />
                                    </div>
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Bio</label>
                                    <textarea rows={3} defaultValue="Building the future of the web with Next.js and Neon aesthetics. 🚀 UI/UX Enthusiast." className="form-input resize-none" />
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Portfolio / Website</label>
                                    <input type="url" defaultValue="https://arivera.dev" className="form-input" />
                                </div>

                                <div className="pt-4 border-t border-white/10 flex justify-end">
                                    <button className="btn-primary w-full md:w-auto px-8 py-2.5 rounded-xl flex items-center justify-center gap-2">
                                        <Save className="w-4 h-4" /> Save Changes
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

                {/* Empty states for the rest of tabs to show they exist */}
                {["privacy", "notifications", "dev"].includes(activeTab) && (
                    <div className="glass-panel p-16 rounded-2xl border border-white/5 flex flex-col items-center justify-center text-center">
                        <Shield className="w-16 h-16 text-slate-600 mb-4 opacity-50" />
                        <h2 className="text-xl font-bold text-slate-300 mb-2">Under Construction</h2>
                        <p className="text-slate-500 max-w-sm">This settings pane is currently being built and will be available in the next visual update.</p>
                    </div>
                )}

            </div>
        </div>
    );
}
