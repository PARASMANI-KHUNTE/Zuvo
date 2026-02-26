"use client";
import React, { useState } from "react";
import { Search, TrendingUp, Users, Hash } from "lucide-react";

// Dummy Data
const TRENDING_TAGS = [
    { tag: "NextJS14", posts: "124K" },
    { tag: "WebDev", posts: "89K" },
    { tag: "UIUX", posts: "45K" },
    { tag: "TailwindCSS", posts: "32K" },
    { tag: "TechMinimalism", posts: "15K" },
];

const SUGGESTED_USERS = [
    { username: "sarah_ui", name: "Sarah Jenkins", role: "Design Lead", avatar: "https://i.pravatar.cc/150?u=sarah", followers: "12K" },
    { username: "dev_marco", name: "Marco Rossi", role: "Fullstack Dev", avatar: "https://i.pravatar.cc/150?u=marco", followers: "8.4K" },
    { username: "tech_anna", name: "Anna Williams", role: "Cloud Architect", avatar: "https://i.pravatar.cc/150?u=anna", followers: "45K" },
];

const DISCOVERY_POSTS = [
    { id: "e1", image: "https://images.unsplash.com/photo-1498050108023-c5249f4df085?q=80&w=2072&auto=format&fit=crop", title: "My Workspace Setup" },
    { id: "e2", image: "https://images.unsplash.com/photo-1550745165-9bc0b252726f?q=80&w=2070&auto=format&fit=crop", title: "Retro Tech Vibes" },
    { id: "e3", image: "https://images.unsplash.com/photo-1537498425277-c283d32ef9db?q=80&w=2078&auto=format&fit=crop", title: "Late Night Coding" },
    { id: "e4", image: "https://images.unsplash.com/photo-1555066931-4365d14bab8c?q=80&w=2070&auto=format&fit=crop", title: "Code Syntax Dark" },
    { id: "e5", image: "https://images.unsplash.com/photo-1551288049-bebda4e38f71?q=80&w=2070&auto=format&fit=crop", title: "Data Analytics Dashboard" },
    { id: "e6", image: "https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?q=80&w=2070&auto=format&fit=crop", title: "Matrix Terminal" },
];

export default function ExplorePage() {
    const [searchQuery, setSearchQuery] = useState("");

    return (
        <div className="w-full max-w-3xl mx-auto pb-20 space-y-8">
            {/* Search Bar */}
            <div className="relative group">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 group-focus-within:text-primary transition-colors" />
                <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search people, posts, or tags..."
                    className="w-full bg-[#0f172a]/60 backdrop-blur-xl border border-white/10 rounded-2xl py-4 pl-12 pr-4 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all font-medium"
                />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Left Column (Tags & Users) */}
                <div className="col-span-1 space-y-6">
                    {/* Trending Tags */}
                    <div className="glass-panel p-5 rounded-2xl hover-glow">
                        <div className="flex items-center gap-2 mb-4">
                            <TrendingUp className="w-5 h-5 text-primary" />
                            <h2 className="font-bold text-slate-100">Trending</h2>
                        </div>
                        <div className="space-y-4">
                            {TRENDING_TAGS.map((tag, i) => (
                                <div key={i} className="flex flex-col group cursor-pointer">
                                    <span className="font-semibold text-sm text-slate-200 group-hover:text-primary transition-colors flex items-center gap-1">
                                        <Hash className="w-3.5 h-3.5" />{tag.tag}
                                    </span>
                                    <span className="text-xs text-slate-500">{tag.posts} posts</span>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Suggested Users */}
                    <div className="glass-panel p-5 rounded-2xl hover-glow">
                        <div className="flex items-center gap-2 mb-4">
                            <Users className="w-5 h-5 text-primary" />
                            <h2 className="font-bold text-slate-100">Who to follow</h2>
                        </div>
                        <div className="space-y-4">
                            {SUGGESTED_USERS.map((user, i) => (
                                <div key={i} className="flex items-center justify-between group">
                                    <div className="flex items-center gap-3">
                                        <img src={user.avatar} className="w-10 h-10 rounded-full cursor-pointer hover:opacity-80 transition-opacity" alt={user.name} />
                                        <div className="flex flex-col cursor-pointer">
                                            <span className="font-semibold text-sm text-slate-200 group-hover:text-white transition-colors">{user.name}</span>
                                            <span className="text-xs text-slate-500">@{user.username}</span>
                                        </div>
                                    </div>
                                    <button className="text-xs font-bold text-primary hover:text-white px-3 py-1.5 rounded-full border border-primary/30 hover:bg-primary/20 transition-all">
                                        Follow
                                    </button>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Right Column (Masonry Discovery) */}
                <div className="col-span-1 md:col-span-2">
                    <h2 className="font-bold text-slate-100 mb-4 flex items-center gap-2">
                        Discover Visuals
                    </h2>
                    {/* Simple Masonry Layout approx */}
                    <div className="columns-2 gap-4 space-y-4">
                        {DISCOVERY_POSTS.map((post) => (
                            <div key={post.id} className="relative rounded-xl overflow-hidden glass-panel group cursor-pointer break-inside-avoid shadow-lg">
                                <img src={post.image} alt={post.title} className="w-full h-auto object-cover group-hover:scale-105 transition-transform duration-700" />
                                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-end p-4">
                                    <span className="font-bold text-sm text-white drop-shadow-md">{post.title}</span>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}
