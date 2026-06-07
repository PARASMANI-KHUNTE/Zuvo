"use client";
import React, { useState, useEffect, useCallback } from "react";
import { Search, TrendingUp, Users, Hash, Loader2, Loader as LoaderIcon } from "lucide-react";
import Image from "next/image";
import apiClient from "@/lib/api";
import { useAuth } from "@/context/AuthContext";

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
            window.location.href = `/search?q=${encodeURIComponent(searchQuery)}`;
        }
    };

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
                <Loader2 className="w-8 h-8 text-primary animate-spin" />
                <p className="text-slate-400 font-medium text-lg">Curating discovery feed...</p>
            </div>
        );
    }

    if (error) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
                <p className="text-red-400 font-medium">{error}</p>
                <button onClick={() => { setLoading(true); setError(null); fetchDiscovery(); }} className="btn-primary px-6 py-2">Retry</button>
            </div>
        );
    }

    return (
        <div className="w-full max-w-3xl mx-auto pb-20 space-y-8">
            {/* Search Bar */}
            <form onSubmit={handleSearch} className="relative group">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 group-focus-within:text-primary transition-colors" />
                <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search people, posts, or tags..."
                    className="w-full bg-[#0f172a]/60 backdrop-blur-xl border border-white/10 rounded-2xl py-4 pl-12 pr-4 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all font-medium"
                />
            </form>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Left Column (Tags & Users) */}
                <div className="col-span-1 space-y-6">
                    {/* Trending Tags */}
                    <div className="glass-panel p-5 rounded-2xl hover-glow">
                        <div className="flex items-center gap-2 mb-4">
                            <TrendingUp className="w-5 h-5 text-primary" />
                            <h2 className="font-bold text-slate-100 uppercase text-xs tracking-wider">Trending</h2>
                        </div>
                        <div className="space-y-5">
                            {trending.map((trend, i) => (
                                <div key={i} className="flex flex-col group cursor-pointer" onClick={() => window.location.href = `/search?q=${trend.tag}`}>
                                    <span className="font-semibold text-sm text-slate-200 group-hover:text-primary transition-colors flex items-center gap-1">
                                        <Hash className="w-3.5 h-3.5" />{trend.tag}
                                    </span>
                                    <span className="text-[10px] text-slate-500 font-medium">{trend.postsCount} interactions</span>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Suggested Users */}
                    <div className="glass-panel p-5 rounded-2xl hover-glow">
                        <div className="flex items-center gap-2 mb-4">
                            <Users className="w-5 h-5 text-primary" />
                            <h2 className="font-bold text-slate-100 uppercase text-xs tracking-wider">Who to follow</h2>
                        </div>
                        <div className="space-y-4">
                            {suggested.map((user, i) => (
                                <div key={i} className="flex items-center justify-between group">
                                    <div className="flex items-center gap-3">
                                        <Image
                                            src={user.avatar || "https://api.dicebear.com/7.x/avataaars/svg?seed=user"}
                                            width={40}
                                            height={40}
                                            unoptimized
                                            className="w-10 h-10 rounded-full cursor-pointer hover:opacity-80 transition-opacity border border-white/10"
                                            alt={user.name}
                                            onClick={() => window.location.href = `/profile/${user.username}`}
                                        />
                                        <div className="flex flex-col cursor-pointer" onClick={() => window.location.href = `/profile/${user.username}`}>
                                            <span className="font-semibold text-[13px] text-slate-200 group-hover:text-white transition-colors truncate max-w-[80px]">{user.name}</span>
                                            <span className="text-[10px] text-slate-500">@{user.username}</span>
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => handleFollow(user)}
                                        className={`text-[10px] font-bold px-3 py-1.5 rounded-full border transition-all uppercase ${followingMap[user._id || user.id]
                                            ? "bg-primary/20 text-primary border-primary/30 hover:bg-primary/30"
                                            : "text-primary border-primary/30 hover:text-white hover:bg-primary/20"
                                        }`}
                                    >
                                        {followingMap[user._id || user.id] ? "Following" : "Follow"}
                                    </button>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Right Column (Masonry Discovery) */}
                <div className="col-span-1 md:col-span-2">
                    <h2 className="font-bold text-white mb-4 flex items-center gap-2 text-sm uppercase tracking-wider">
                        Discovery Feed
                    </h2>
                    <div className="columns-2 gap-4 space-y-4">
                        {/* Discovery posts could be fetched from feed/explore in future, using placeholders for visual excellence now */}
                        {[1, 2, 3, 4, 5, 6].map((i) => (
                            <div key={i} className="relative rounded-xl overflow-hidden glass-panel group cursor-pointer break-inside-avoid shadow-lg border-white/5">
                                <Image src={`https://images.unsplash.com/photo-${1550000000000 + i * 100000}?q=80&w=800&auto=format&fit=crop`} alt="Discovery" width={800} height={600} unoptimized className="w-full h-auto object-cover group-hover:scale-105 transition-transform duration-700" />
                                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-end p-4">
                                    <span className="font-bold text-xs text-white drop-shadow-md">Curated for you</span>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}
