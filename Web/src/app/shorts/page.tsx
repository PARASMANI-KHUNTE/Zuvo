"use client";
import React, { useState, useEffect, useRef, useCallback } from "react";
import { motion } from "framer-motion";
import { Heart, MessageCircle, Share2, ArrowLeft, Loader2, Music2, TrendingUp } from "lucide-react";
import { useRouter } from "next/navigation";
import apiClient from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import Link from "next/link";
import toast from "react-hot-toast";

interface ShortVideo {
    _id: string;
    title: string;
    content: string;
    author: {
        _id: string;
        name: string;
        username: string;
        avatar?: string;
    };
    media: { url: string; type: string }[];
    likesCount: number;
    commentsCount: number;
    isLiked?: boolean;
    createdAt: string;
}

export default function ShortsPage() {
    const router = useRouter();
    const { user: currentUser } = useAuth();
    const [shorts, setShorts] = useState<ShortVideo[]>([]);
    const [loading, setLoading] = useState(true);
    const [page, setPage] = useState(1);
    const [hasMore, setHasMore] = useState(true);
    const observer = useRef<IntersectionObserver | null>(null);

    const fetchShorts = useCallback(async (pageNum: number) => {
        try {
            setLoading(true);
            const res = await apiClient.get<any>(`/blogs?page=${pageNum}&limit=5&type=video`);

            if (res.data?.success) {
                // Filter specifically for posts containing at least one video
                const videoPosts = res.data.data.filter((post: any) =>
                    post.media?.some((m: any) => m.type === "video")
                );

                if (pageNum === 1) {
                    setShorts(videoPosts);
                } else {
                    setShorts((prev) => [...prev, ...videoPosts]);
                }

                // If the backend returns less than the limit, assume no more
                setHasMore(res.data.data.length === 5);
            }
        } catch (err) {
            console.error("Failed to load shorts", err);
            toast.error("Failed to load video shorts");
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchShorts(1);
    }, [fetchShorts]);

    const lastVideoElementRef = useCallback(
        (node: HTMLDivElement | null) => {
            if (loading) return;
            if (observer.current) observer.current.disconnect();

            observer.current = new IntersectionObserver((entries) => {
                if (entries[0].isIntersecting && hasMore) {
                    setPage((prevPage) => prevPage + 1);
                }
            }, {
                threshold: 0.5
            });

            if (node) observer.current.observe(node);
        },
        [loading, hasMore]
    );

    useEffect(() => {
        if (page > 1) {
            fetchShorts(page);
        }
    }, [page, fetchShorts]);

    const handleBack = () => router.back();

    const fallbackAvatar = (seed: string) => `https://api.dicebear.com/7.x/avataaars/svg?seed=${seed}`;

    return (
        <div className="w-full max-w-lg mx-auto h-[100dvh] bg-black relative overflow-hidden flex flex-col">
            {/* Minimal Header */}
            <div className="absolute top-0 w-full z-50 p-4 flex items-center justify-between bg-gradient-to-b from-black/80 to-transparent">
                <button
                    onClick={handleBack}
                    className="p-2 rounded-full bg-black/40 backdrop-blur-md text-white hover:bg-white/20 transition-colors"
                >
                    <ArrowLeft className="w-6 h-6" />
                </button>
                <div className="flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/10 backdrop-blur-md border border-white/20">
                    <TrendingUp className="w-4 h-4 text-rose-500" />
                    <span className="text-white font-bold text-sm tracking-wide">SHORTS</span>
                </div>
                <div className="w-10"></div> {/* Spacer for centering */}
            </div>

            {/* Vertical Video Feed */}
            <div className="flex-1 overflow-y-scroll snap-y snap-mandatory scrollbar-hide">
                {shorts.length === 0 && !loading && (
                    <div className="h-full flex flex-col items-center justify-center text-white/50 space-y-4">
                        <Music2 className="w-16 h-16 opacity-30" />
                        <p className="text-lg">No video shorts found.</p>
                        <button onClick={handleBack} className="btn-primary px-6 py-2 rounded-full mt-4">Go Back</button>
                    </div>
                )}

                {shorts.map((short, index) => {
                    const videoMedia = short.media.find(m => m.type === "video");
                    if (!videoMedia) return null;

                    return (
                        <div
                            key={short._id}
                            ref={index === shorts.length - 1 ? lastVideoElementRef : null}
                            className="w-full h-[100dvh] snap-start relative bg-black flex items-center justify-center"
                        >
                            <video
                                src={videoMedia.url}
                                className="w-full h-full object-cover"
                                loop
                                playsInline
                                // Auto-play is tricky on web, intersection observer normally used to trigger play/pause
                                autoPlay={index === 0}
                                muted={index === 0} // Autoplay usually requires mute
                                controls
                            />

                            {/* Overlay Gradient */}
                            <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-black/90 via-black/40 to-transparent pointer-events-none" />

                            {/* Context & Actions Overlay */}
                            <div className="absolute inset-x-0 bottom-0 p-4 pb-20 md:pb-6 flex items-end justify-between pointer-events-auto">

                                {/* Info */}
                                <div className="flex-1 pr-12 text-white">
                                    <Link href={`/profile/${short.author?.username}`} className="flex items-center gap-2 hover:opacity-80 transition-opacity mb-3">
                                        <img
                                            src={short.author?.avatar || fallbackAvatar(short.author?.username || "author")}
                                            alt={short.author?.name}
                                            className="w-10 h-10 rounded-full border border-white/20"
                                        />
                                        <div>
                                            <h3 className="font-bold text-sm">@{short.author?.username}</h3>
                                            <p className="text-xs text-white/70">{short.author?.name}</p>
                                        </div>
                                    </Link>
                                    <p className="text-sm font-medium mb-1 drop-shadow-md">{short.title}</p>
                                    <p className="text-xs text-white/80 line-clamp-2 drop-shadow-md">{short.content}</p>
                                </div>

                                {/* Floating Actions Right side */}
                                <div className="flex flex-col items-center gap-6 mb-4">
                                    <button className="flex flex-col items-center gap-1 group">
                                        <div className={`p-3 rounded-full bg-black/40 backdrop-blur-sm border border-white/10 group-hover:bg-white/20 transition-all ${short.isLiked ? 'text-rose-500' : 'text-white'}`}>
                                            <Heart className={`w-6 h-6 ${short.isLiked ? 'fill-rose-500' : ''}`} />
                                        </div>
                                        <span className="text-xs font-bold text-white drop-shadow-md">{short.likesCount}</span>
                                    </button>

                                    <button
                                        className="flex flex-col items-center gap-1 group"
                                        onClick={() => router.push(`/post/${short._id}`)}
                                    >
                                        <div className="p-3 rounded-full bg-black/40 backdrop-blur-sm border border-white/10 group-hover:bg-white/20 transition-all text-white">
                                            <MessageCircle className="w-6 h-6" />
                                        </div>
                                        <span className="text-xs font-bold text-white drop-shadow-md">{short.commentsCount}</span>
                                    </button>

                                    <button className="flex flex-col items-center gap-1 group">
                                        <div className="p-3 rounded-full bg-black/40 backdrop-blur-sm border border-white/10 group-hover:bg-white/20 transition-all text-white">
                                            <Share2 className="w-6 h-6" />
                                        </div>
                                        <span className="text-xs font-bold text-white drop-shadow-md">Share</span>
                                    </button>
                                </div>
                            </div>
                        </div>
                    );
                })}

                {loading && (
                    <div className="w-full h-[20vh] snap-start flex items-center justify-center">
                        <Loader2 className="w-8 h-8 text-primary animate-spin" />
                    </div>
                )}
            </div>
        </div>
    );
}
