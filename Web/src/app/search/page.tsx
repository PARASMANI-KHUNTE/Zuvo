"use client";
import React, { useState, useEffect, Suspense } from "react";
import Image from "next/image";
import { useSearchParams } from "next/navigation";
import { Search, Users, Image as ImageIcon, LayoutGrid, Filter, Heart, MessageCircle, Loader2 } from "lucide-react";
import { motion } from "framer-motion";
import PostCard from "@/app/components/PostCard";

import { format } from "date-fns";
import apiClient from "@/lib/api";
import Link from "next/link";

function SearchResults() {
    const searchParams = useSearchParams();
    const query = searchParams.get("q") || "";
    const [activeTab, setActiveTab] = useState<"top" | "latest" | "people" | "media">("top");
    const [results, setResults] = useState<{ posts: any[], users: any[] }>({ posts: [], users: [] });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const abortController = new AbortController();

        const fetchResults = async () => {
            if (!query) return;
            setLoading(true);
            setError(null);
            try {
                const searchType = activeTab === "people" ? "users" : (activeTab === "media" ? "posts" : "all");
                const res = await apiClient.get(`/search?q=${query}&type=${searchType}`, {
                    signal: abortController.signal
                });
                setResults({
                    posts: res.data.data.posts || [],
                    users: res.data.data.users || []
                });
            } catch (err: any) {
                if (err?.name === 'CanceledError' || err?.code === 'ERR_CANCELED') return;
                console.error("Search failed", err);
                setError(err?.response?.data?.message || "Search failed. Please try again.");
            } finally {
                setLoading(false);
            }
        };
        fetchResults();

        return () => abortController.abort();
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
        <div className="w-full max-w-3xl mx-auto space-y-6">
            {/* Search Header */}
            <div className="space-y-4">
                <div className="flex items-center justify-between">
                    <h1 className="text-xl font-bold text-white tracking-tight">
                        Results for <span className="text-zinc-400 font-normal">&quot;{query}&quot;</span>
                    </h1>
                </div>

                {/* Tabs */}
                <div className="flex border-b border-white/[0.08] gap-6 overflow-x-auto pb-px scrollbar-hide">
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
                                className={`flex items-center gap-2 py-3 text-xs font-semibold transition-all relative ${
                                    isActive ? "text-white" : "text-zinc-500 hover:text-zinc-300"
                                }`}
                            >
                                <Icon className="w-3.5 h-3.5" /> {tab.label}
                                {activeTab === tab.id && (
                                    <motion.div layoutId="search-tab" className="absolute bottom-0 left-0 right-0 h-0.5 bg-white" />
                                )}
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* Results Content */}
            <div>
                {error ? (
                    <div className="flex flex-col items-center justify-center py-16 space-y-3 bg-[#111113]/80 border border-white/[0.08] rounded-xl p-8">
                        <p className="text-rose-400 text-xs font-medium">{error}</p>
                    </div>
                ) : loading ? (
                    <div className="flex flex-col items-center justify-center py-16 space-y-3">
                        <Loader2 className="w-5 h-5 text-zinc-500 animate-spin" />
                        <p className="text-zinc-500 text-xs">Searching Zuvo...</p>
                    </div>
                ) : (
                    <>
                        {(activeTab === "top" || activeTab === "latest") && (
                            <div className="space-y-3.5">
                                {results.posts.length > 0 ? results.posts.map((post) => (
                                    <PostCard
                                        key={post.id || post._id}
                                        id={post.id || post._id}
                                        author={post.author?.name || "Anonymous"}
                                        avatar={post.author?.avatar || "https://api.dicebear.com/7.x/avataaars/svg?seed=me"}
                                        title={post.title}
                                        content={post.content || ""}
                                        image={post.image !== "no-photo.jpg" ? post.image : undefined}
                                        media={post.media}
                                        tags={post.tags}
                                        timestamp={format(new Date(post.createdAt), "MMM d, yyyy")}
                                        likes={post.likesCount || 0}
                                        comments={post.commentsCount || 0}
                                    />
                                )) : (
                                    <div className="bg-[#111113]/80 border border-white/[0.08] rounded-xl p-12 text-center">
                                        <p className="text-zinc-500 text-xs">No posts found matching your query.</p>
                                    </div>
                                )}
                            </div>
                        )}

                        {activeTab === "people" && (
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                {results.users.length > 0 ? results.users.map((user) => (
                                    <div
                                        key={user.id || user._id}
                                        className="bg-[#111113]/80 border border-white/[0.08] p-4 rounded-xl flex items-center justify-between gap-3 hover:border-white/[0.14] transition-all"
                                    >
                                        <Link href={`/profile/${user.username}`} className="flex items-center gap-3 min-w-0 flex-1">
                                            <div className="w-10 h-10 rounded-full overflow-hidden bg-zinc-800 border border-white/10 relative flex-shrink-0">
                                                <Image src={user.avatar || "https://api.dicebear.com/7.x/avataaars/svg?seed=friend"} fill unoptimized className="object-cover" alt={user.name} />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <h3 className="font-semibold text-xs text-white truncate hover:underline">{user.name}</h3>
                                                <p className="text-[11px] text-zinc-500 truncate">@{user.username}</p>
                                            </div>
                                        </Link>
                                        <button
                                            onClick={() => handleFollow(user.id || user._id)}
                                            className="btn-primary !text-xs !py-1 !px-3"
                                        >
                                            Follow
                                        </button>
                                    </div>
                                )) : (
                                    <div className="col-span-2 bg-[#111113]/80 border border-white/[0.08] rounded-xl p-12 text-center">
                                        <p className="text-zinc-500 text-xs">No people found.</p>
                                    </div>
                                )}
                            </div>
                        )}

                        {activeTab === "media" && (
                            <div className="columns-2 sm:columns-3 gap-3 space-y-3">
                                {results.posts.filter(p => p.image && p.image !== "no-photo.jpg").length > 0 ? (
                                    results.posts.filter(p => p.image && p.image !== "no-photo.jpg").map((post) => (
                                        <div key={post.id || post._id} className="bg-[#111113]/80 rounded-xl overflow-hidden border border-white/[0.08] group relative cursor-pointer break-inside-avoid">
                                            <Image src={post.image} width={0} height={0} sizes="100vw" unoptimized className="w-full h-auto object-cover group-hover:scale-105 transition-transform duration-500" alt="Search Result" />
                                            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-3">
                                                <div className="flex gap-3 text-white text-xs">
                                                    <div className="flex items-center gap-1"><Heart className="w-3 h-3 fill-white" /> {post.likesCount || 0}</div>
                                                    <div className="flex items-center gap-1"><MessageCircle className="w-3 h-3" /> {post.commentsCount || 0}</div>
                                                </div>
                                            </div>
                                        </div>
                                    ))
                                ) : (
                                    <div className="col-span-full bg-[#111113]/80 border border-white/[0.08] rounded-xl p-12 text-center">
                                        <p className="text-zinc-500 text-xs">No media found.</p>
                                    </div>
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
