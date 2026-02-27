"use client";
import React, { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { Search, Users, Hash, Image as ImageIcon, LayoutGrid, Filter, Heart, MessageCircle, Loader2 } from "lucide-react";
import { motion } from "framer-motion";
import PostCard from "@/app/components/PostCard";

const DUMMY_PEOPLE = [
    { username: "sarah_ui", name: "Sarah Jenkins", bio: "UX/UI at Zuvo. Dark mode lover.", avatar: "https://i.pravatar.cc/150?u=sarah", followers: "12K" },
    { username: "arivera_dev", name: "Alex Rivera", bio: "Fullstack dev building Zuvo.", avatar: "https://i.pravatar.cc/150?u=arivera_dev", followers: "1.2K" },
];

const DUMMY_POSTS = [
    {
        _id: "s1",
        content: "Search results are looking clean with #Glassmorphism! This feels like a premium social experience already. 🚀",
        author: { name: "Sarah Jenkins", username: "sarah_ui", avatar: "https://i.pravatar.cc/150?u=sarah" },
        createdAt: new Date().toISOString(),
        likes: 45,
        comments: 12
    }
];

import { format } from "date-fns";
import apiClient from "@/lib/api";
import Link from "next/link";

function SearchResults() {
    const searchParams = useSearchParams();
    const query = searchParams.get("q") || "";
    const [activeTab, setActiveTab] = useState<"top" | "latest" | "people" | "media">("top");
    const [results, setResults] = useState<{ posts: any[], users: any[] }>({ posts: [], users: [] });
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        const fetchResults = async () => {
            if (!query) return;
            setLoading(true);
            try {
                const searchType = activeTab === "people" ? "users" : (activeTab === "media" ? "posts" : "all");
                const res = await apiClient.get(`/search?q=${query}&type=${searchType}`);
                setResults({
                    posts: res.data.data.posts || [],
                    users: res.data.data.users || []
                });
            } catch (err) {
                console.error("Search failed", err);
            } finally {
                setLoading(false);
            }
        };
        fetchResults();
    }, [query, activeTab]);

    const handleFollow = async (userId: string) => {
        try {
            await apiClient.post("/interactions/follow", { userId });
            // Ideally update local state to show "Following"
        } catch (err) {
            console.error("Follow failed", err);
        }
    };

    return (
        <div className="w-full max-w-4xl mx-auto pb-20 mt-4 space-y-8">
            {/* Search Header */}
            <div className="space-y-6 px-4">
                <div className="flex items-center justify-between">
                    <h1 className="text-3xl font-bold text-white">
                        Results for <span className="text-primary italic">"{query}"</span>
                    </h1>
                    <button className="glass-panel p-2 rounded-xl text-slate-400 hover:text-white transition-all flex items-center gap-2 text-sm font-bold">
                        <Filter className="w-4 h-4" /> Filter
                    </button>
                </div>

                {/* Tabs */}
                <div className="flex border-b border-white/5 gap-8 overflow-x-auto pb-px scrollbar-hide">
                    {[
                        { id: "top", label: "Top", icon: LayoutGrid },
                        { id: "latest", label: "Latest", icon: Search },
                        { id: "people", label: "People", icon: Users },
                        { id: "media", label: "Media", icon: ImageIcon },
                    ].map((tab) => {
                        const Icon = tab.icon;
                        const isActive = activeTab === tab.id;
                        return (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id as any)}
                                className={`flex items-center gap-2 py-4 text-sm font-bold transition-all relative border-b-2 ${isActive ? "text-primary border-primary" : "text-slate-500 border-transparent hover:text-slate-300"
                                    }`}
                            >
                                <Icon className="w-4 h-4" /> {tab.label}
                                {activeTab === tab.id && <motion.div layoutId="search-tab" className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary" />}
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* Results Content */}
            <div className="px-4">
                {loading ? (
                    <div className="flex flex-col items-center justify-center py-20 space-y-4">
                        <Loader2 className="w-10 h-10 text-primary animate-spin" />
                        <p className="text-slate-500 font-medium">Searching Zuvo...</p>
                    </div>
                ) : (
                    <>
                        {(activeTab === "top" || activeTab === "latest") && (
                            <div className="space-y-6">
                                {results.posts.length > 0 ? results.posts.map((post) => (
                                    <PostCard
                                        key={post.id || post._id}
                                        id={post.id || post._id}
                                        author={post.author?.name || "Anonymous"}
                                        avatar={post.author?.avatar || "https://api.dicebear.com/7.x/avataaars/svg?seed=me"}
                                        content={post.content}
                                        image={post.image !== "no-photo.jpg" ? post.image : undefined}
                                        timestamp={format(new Date(post.createdAt), "MMM d, yyyy")}
                                        likes={post.likesCount || 0}
                                        comments={post.commentsCount || 0}
                                    />
                                )) : (
                                    <p className="text-center py-20 text-slate-500">No posts found matching your query.</p>
                                )}
                            </div>
                        )}

                        {activeTab === "people" && (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {results.users.length > 0 ? results.users.map((user) => (
                                    <motion.div
                                        key={user.id || user._id}
                                        initial={{ opacity: 0, scale: 0.95 }}
                                        animate={{ opacity: 1, scale: 1 }}
                                        className="glass-panel p-6 rounded-2xl border border-white/5 flex items-center gap-4 hover:border-white/20 transition-all"
                                    >
                                        <Link href={`/profile/${user.username}`}>
                                            <img src={user.avatar || "https://api.dicebear.com/7.x/avataaars/svg?seed=friend"} className="w-16 h-16 rounded-full border-2 border-primary/20 object-cover" alt={user.name} />
                                        </Link>
                                        <div className="flex-1 min-w-0">
                                            <Link href={`/profile/${user.username}`}>
                                                <h3 className="font-bold text-slate-100 truncate hover:text-primary transition-colors">{user.name}</h3>
                                            </Link>
                                            <p className="text-xs text-slate-500 mb-2">@{user.username}</p>
                                            <p className="text-xs text-slate-400 line-clamp-1">{user.bio || "No bio available."}</p>
                                        </div>
                                        <button
                                            onClick={() => handleFollow(user.id || user._id)}
                                            className="btn-primary text-xs px-4 py-2 rounded-full font-bold"
                                        >
                                            Follow
                                        </button>
                                    </motion.div>
                                )) : (
                                    <p className="col-span-2 text-center py-20 text-slate-500">No people found.</p>
                                )}
                            </div>
                        )}

                        {activeTab === "media" && (
                            <div className="columns-2 md:columns-3 gap-4 space-y-4">
                                {results.posts.filter(p => p.image && p.image !== "no-photo.jpg").length > 0 ? (
                                    results.posts.filter(p => p.image && p.image !== "no-photo.jpg").map((post) => (
                                        <div key={post.id || post._id} className="glass-panel rounded-xl overflow-hidden border border-white/5 group relative cursor-pointer break-inside-avoid shadow-lg shadow-black/20">
                                            <img src={post.image} className="w-full h-auto object-cover group-hover:scale-105 transition-transform duration-500" alt="Search Result" />
                                            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-4">
                                                <div className="flex gap-4 text-white text-xs font-bold">
                                                    <div className="flex items-center gap-1"><Heart className="w-3.5 h-3.5 fill-primary text-primary" /> {post.likesCount || 0}</div>
                                                    <div className="flex items-center gap-1"><MessageCircle className="w-3.5 h-3.5" /> {post.commentsCount || 0}</div>
                                                </div>
                                            </div>
                                        </div>
                                    ))
                                ) : (
                                    <p className="col-span-full text-center py-20 text-slate-500">No media found.</p>
                                )}
                            </div>
                        )}
                    </>
                )}
            </div>
        </div>
    );
}

export default function SearchPage() {
    return (
        <Suspense fallback={
            <div className="min-h-[60vh] flex items-center justify-center">
                <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
            </div>
        }>
            <SearchResults />
        </Suspense>
    );
}
