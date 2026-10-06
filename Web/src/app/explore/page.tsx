"use client";
import React, { useState, useEffect, useCallback } from "react";
import { Search, TrendingUp, Users, Hash, Loader2 } from "lucide-react";
import Image from "next/image";
import apiClient from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";
import Link from "next/link";

interface Trend {
    tag: string;
    postsCount: number;
    title: string;
}

interface SuggestedUser {
    id: string;
    _id?: string;
    username: string;
    name: string;
    avatar?: string;
    bio?: string;
    isFollowing?: boolean;
}

export default function ExplorePage() {
    const router = useRouter();
    const { user: currentUser } = useAuth();
    const [searchQuery, setSearchQuery] = useState("");
    const [trending, setTrending] = useState<Trend[]>([]);
    const [suggested, setSuggested] = useState<SuggestedUser[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [followingMap, setFollowingMap] = useState<Record<string, boolean>>({});

    const fetchDiscovery = useCallback(async (signal?: AbortSignal) => {
        try {
            setLoading(true);
            setError(null);
            const [trendingRes, suggestedRes] = await Promise.all([
                apiClient.get("/search/trending", { signal }),
                apiClient.get("/search/suggested-users", { signal })
            ]);

            if (trendingRes.data.success) setTrending(trendingRes.data.data);
            if (suggestedRes.data.success) setSuggested(suggestedRes.data.data);
        } catch (err: any) {
            if (err?.name === 'CanceledError' || err?.code === 'ERR_CANCELED') return;
            console.error("Failed to fetch discovery data", err);
            setError(err?.response?.data?.message || "Failed to load explore data");
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        const abortController = new AbortController();
        fetchDiscovery(abortController.signal);
        return () => abortController.abort();
    }, [fetchDiscovery]);

    const handleFollow = async (targetUser: SuggestedUser) => {
        const userId = targetUser._id || targetUser.id;
        const wasFollowing = followingMap[userId];
        setFollowingMap(prev => ({ ...prev, [userId]: !wasFollowing }));
        try {
            await apiClient.post("/interactions/follow", { userId });
        } catch (err) {
            setFollowingMap(prev => ({ ...prev, [userId]: wasFollowing }));
            console.error("Follow failed", err);
        }
    };

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        if (searchQuery.trim()) {
            router.push(`/search?q=${encodeURIComponent(searchQuery)}`);
        }
    };

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[50vh] gap-3">
                <Loader2 className="w-5 h-5 text-zinc-500 animate-spin" />
                <p className="text-zinc-500 font-medium text-xs">Curating discovery feed...</p>
            </div>
        );
    }

    if (error) {
        return (
            <div className="bg-[#111113]/80 border border-white/[0.08] rounded-xl p-8 text-center space-y-3 max-w-lg mx-auto mt-6">
                <p className="text-rose-400 text-xs font-medium">{error}</p>
                <button
                    onClick={() => { setLoading(true); setError(null); fetchDiscovery(); }}
                    className="btn-secondary !text-xs !py-1.5 !px-4"
                >
                    Retry
                </button>
            </div>
        );
    }

    return (
        <div className="w-full max-w-4xl mx-auto space-y-6">
            {/* Search Bar */}
            <form onSubmit={handleSearch} className="relative group">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500 group-focus-within:text-zinc-300 transition-colors" />
                <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search people, tags, or topics..."
                    className="w-full bg-[#111113]/80 border border-white/[0.08] hover:border-white/[0.14] focus:border-white/30 rounded-xl py-3 pl-10 pr-4 text-xs text-white placeholder-zinc-500 outline-none transition-all"
                />
            </form>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Trending Topics */}
                <div className="bg-[#111113]/80 backdrop-blur-xl border border-white/[0.08] rounded-xl p-5 space-y-4">
                    <div className="flex items-center gap-2 border-b border-white/[0.06] pb-3">
                        <TrendingUp className="w-4 h-4 text-zinc-400" />
                        <h2 className="font-semibold text-zinc-300 uppercase text-xs tracking-wider">Trending Topics</h2>
                    </div>
                    {trending.length > 0 ? (
                        <div className="space-y-3">
                            {trending.map((trend, i) => (
                                <div
                                    key={i}
                                    className="flex items-center justify-between group cursor-pointer py-1"
                                    onClick={() => router.push(`/search?q=${encodeURIComponent(trend.tag)}`)}
                                >
                                    <div className="flex flex-col">
                                        <span className="font-medium text-xs text-zinc-200 group-hover:text-white transition-colors flex items-center gap-1">
                                            <Hash className="w-3 h-3 text-zinc-500 group-hover:text-zinc-300" />
                                            {trend.tag}
                                        </span>
                                        <span className="text-[11px] text-zinc-500">{trend.postsCount} posts</span>
                                    </div>
                                    <span className="text-[11px] text-zinc-600 group-hover:text-zinc-400 transition-colors">&rarr;</span>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <p className="text-xs text-zinc-500 py-2">No trending topics found.</p>
                    )}
                </div>

                {/* Who to Follow */}
                <div className="bg-[#111113]/80 backdrop-blur-xl border border-white/[0.08] rounded-xl p-5 space-y-4">
                    <div className="flex items-center gap-2 border-b border-white/[0.06] pb-3">
                        <Users className="w-4 h-4 text-zinc-400" />
                        <h2 className="font-semibold text-zinc-300 uppercase text-xs tracking-wider">Suggested Creators</h2>
                    </div>
                    {suggested.length > 0 ? (
                        <div className="space-y-3.5">
                            {suggested.map((user, i) => (
                                <div key={i} className="flex items-center justify-between gap-3 group">
                                    <Link href={`/profile/${user.username}`} className="flex items-center gap-3 min-w-0 flex-1">
                                        <div className="w-8 h-8 rounded-full overflow-hidden bg-zinc-800 border border-white/10 relative flex-shrink-0">
                                            <Image
                                                src={user.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.username}`}
                                                fill
                                                unoptimized
                                                className="object-cover"
                                                alt={user.name}
                                            />
                                        </div>
                                        <div className="flex flex-col min-w-0">
                                            <span className="font-medium text-xs text-zinc-200 group-hover:text-white transition-colors truncate">
                                                {user.name}
                                            </span>
                                            <span className="text-[11px] text-zinc-500 truncate">@{user.username}</span>
                                        </div>
                                    </Link>
                                    <button
                                        onClick={() => handleFollow(user)}
                                        className={`text-xs font-medium px-3 py-1 rounded-full transition-all flex-shrink-0 ${
                                            followingMap[user._id || user.id]
                                                ? "bg-white/[0.08] text-zinc-300 hover:bg-white/[0.12]"
                                                : "bg-white text-zinc-950 hover:bg-zinc-200"
                                        }`}
                                    >
                                        {followingMap[user._id || user.id] ? "Following" : "Follow"}
                                    </button>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <p className="text-xs text-zinc-500 py-2">No creators to recommend right now.</p>
                    )}
                </div>
            </div>
        </div>
    );
}
