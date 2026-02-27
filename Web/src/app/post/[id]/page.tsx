"use client";
import React, { useState } from "react";
import { motion } from "framer-motion";
import { Heart, MessageCircle, Share2, MoreHorizontal, ArrowLeft, Send, Image as ImageIcon, Smile, Loader2, ThumbsDown } from "lucide-react";
import { useRouter, useParams } from "next/navigation";
import { formatDistanceToNow } from "date-fns";
import { usePosts } from "@/hooks/usePosts";
import { useAuth } from "@/context/AuthContext";
import SuggestedUsers from "@/app/components/SuggestedUsers";
import TrendingSidebar from "@/app/components/TrendingSidebar";
import apiClient from "@/lib/api";
import Link from "next/link";

export default function PostDetailPage({ params }: { params: { id: string } }) {
    const router = useRouter();
    const { fetchPostById, fetchComments, addComment } = usePosts();
    const { user: currentUser } = useAuth();
    const [post, setPost] = useState<any>(null);
    const [comments, setComments] = useState<any[]>([]);
    const [commentText, setCommentText] = useState("");
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [likeCount, setLikeCount] = useState(0);
    const [isLiked, setIsLiked] = useState(false);
    const [liking, setLiking] = useState(false);

    React.useEffect(() => {
        const loadData = async () => {
            setLoading(true);
            const [postData, commentData] = await Promise.all([
                fetchPostById(params.id),
                fetchComments(params.id)
            ]);
            setPost(postData);
            setLikeCount(postData?.likesCount || 0);
            setComments(commentData);
            setLoading(false);
        };
        loadData();
    }, [params.id]);

    const handleLike = async (e: React.MouseEvent) => {
        e.stopPropagation();
        if (liking) return;
        setLiking(true);

        // Optimistic update
        const wasLiked = isLiked;
        setIsLiked(!wasLiked);
        setLikeCount(c => wasLiked ? c - 1 : c + 1);

        try {
            await apiClient.post("/interactions/like", { postId: params.id, action: "like" });
        } catch (err) {
            // Revert on failure
            setIsLiked(wasLiked);
            setLikeCount(c => wasLiked ? c + 1 : c - 1);
        } finally {
            setLiking(false);
        }
    };

    const handleShare = async () => {
        try {
            const res = await apiClient.get(`/interactions/share/${params.id}`);
            if (res.data.success) {
                const url = res.data.data.shareUrl;
                if (navigator.share) {
                    await navigator.share({ title: post?.title, text: post?.content?.substring(0, 100), url });
                } else {
                    await navigator.clipboard.writeText(url);
                    alert("Link copied to clipboard!");
                }
            }
        } catch (err) {
            console.error("Failed to share", err);
        }
    };

    const handleCommentSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!commentText.trim() || submitting) return;

        setSubmitting(true);
        const newComment = await addComment(params.id, commentText);
        if (newComment) {
            const dicebearAvatar = `https://api.dicebear.com/7.x/avataaars/svg?seed=${currentUser?.username || "me"}`;
            const enriched = {
                ...newComment,
                user: {
                    name: currentUser?.name,
                    username: currentUser?.username,
                    avatar: currentUser?.avatar || dicebearAvatar
                },
                createdAt: new Date().toISOString()
            };
            setComments([enriched, ...comments]);
            setCommentText("");
        }
        setSubmitting(false);
    };

    const fallbackAvatar = (seed: string) => `https://api.dicebear.com/7.x/avataaars/svg?seed=${seed}`;

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4">
                <Loader2 className="w-10 h-10 text-primary animate-spin" />
                <p className="text-slate-500 font-medium">Loading post...</p>
            </div>
        );
    }

    if (!post) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4 text-center">
                <h2 className="text-3xl font-black text-white">Post not found</h2>
                <p className="text-slate-500">It might have been removed or the link is broken.</p>
                <button onClick={() => router.push("/")} className="btn-primary px-8 py-2 rounded-full font-bold">Back Home</button>
            </div>
        );
    }

    return (
        <div className="w-full max-w-5xl mx-auto flex flex-col lg:flex-row gap-8 pb-20 mt-4">

            {/* Main Content Area */}
            <div className="flex-1 space-y-6">
                {/* Back Button */}
                <button
                    onClick={() => router.back()}
                    className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors mb-2 group"
                >
                    <ArrowLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
                    <span className="font-semibold text-sm">Back</span>
                </button>

                {/* Main Post Card */}
                <div className="glass-panel p-6 md:p-8 space-y-6 rounded-3xl border border-white/10 shadow-2xl">
                    {/* Header */}
                    <div className="flex items-center justify-between">
                        <Link href={`/profile/${post.author?.username}`} className="flex items-center gap-4 hover:opacity-80 transition-opacity">
                            <img
                                src={post.author?.avatar || fallbackAvatar(post.author?.username || "author")}
                                alt={post.author?.name}
                                className="w-12 h-12 rounded-full border border-white/10 object-cover"
                            />
                            <div>
                                <h2 className="font-bold text-lg text-white">{post.author?.name}</h2>
                                <p className="text-sm text-slate-500">@{post.author?.username} · {formatDistanceToNow(new Date(post.createdAt))} ago</p>
                            </div>
                        </Link>
                        <button
                            onClick={() => {
                                navigator.clipboard.writeText(params.id);
                                alert("Post ID copied to clipboard!");
                            }}
                            title="Copy Post ID"
                            className="p-2 hover:bg-white/5 rounded-full transition-colors text-slate-500"
                        >
                            <MoreHorizontal className="w-6 h-6" />
                        </button>
                    </div>

                    {/* Body */}
                    <div className="space-y-4">
                        <h1 className="text-2xl font-black text-white tracking-tight">{post.title}</h1>
                        <p className="text-slate-200 text-lg leading-relaxed whitespace-pre-wrap">{post.content}</p>
                        {post.image && post.image !== "no-photo.jpg" && (
                            <div className="rounded-2xl overflow-hidden border border-white/5 shadow-2xl">
                                <img src={post.image} alt="Post visual" className="w-full h-auto object-cover max-h-[600px]" />
                            </div>
                        )}
                        {post.tags?.length > 0 && (
                            <div className="flex flex-wrap gap-2 pt-2">
                                {post.tags.map((tag: string) => (
                                    <span key={tag} className="text-primary text-sm font-bold hover:underline cursor-pointer">#{tag}</span>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-6 pt-6 border-t border-white/5">
                        <button
                            onClick={handleLike}
                            disabled={liking}
                            className={`flex items-center gap-2 transition-colors hover:text-rose-500 ${isLiked ? "text-rose-500" : "text-slate-400"}`}
                        >
                            <Heart className={`w-6 h-6 transition-transform active:scale-125 ${isLiked ? "fill-rose-500" : ""}`} />
                            <span className="font-bold">{likeCount}</span>
                        </button>
                        <div className="flex items-center gap-2 text-slate-400">
                            <MessageCircle className="w-6 h-6" />
                            <span className="font-bold">{comments.length}</span>
                        </div>
                        <button onClick={handleShare} className="flex items-center gap-2 text-slate-400 ml-auto hover:text-primary transition-colors">
                            <Share2 className="w-5 h-5" />
                            <span className="text-sm font-semibold">Share</span>
                        </button>
                    </div>
                </div>

                {/* Comment Input */}
                <form onSubmit={handleCommentSubmit} className="glass-panel p-4 rounded-2xl border border-white/5 flex items-center gap-4">
                    <img
                        src={currentUser?.avatar || fallbackAvatar(currentUser?.username || "me")}
                        className="w-10 h-10 rounded-full border border-white/10 object-cover"
                        alt="My Profile"
                    />
                    <div className="flex-1 relative">
                        <input
                            type="text"
                            value={commentText}
                            onChange={(e) => setCommentText(e.target.value)}
                            placeholder="Add a comment..."
                            disabled={submitting}
                            className="w-full bg-white/5 border border-white/10 rounded-xl py-3 pl-4 pr-12 text-white text-sm focus:outline-none focus:ring-1 focus:ring-primary/50 disabled:opacity-50"
                        />
                        <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-2 text-slate-500">
                            <Smile className="w-4 h-4 cursor-pointer hover:text-white" />
                        </div>
                    </div>
                    <button
                        type="submit"
                        disabled={!commentText.trim() || submitting}
                        className={`p-3 rounded-xl transition-all ${commentText.trim() && !submitting ? "bg-primary text-white shadow-lg shadow-primary/20" : "bg-white/5 text-slate-500 cursor-not-allowed"}`}
                    >
                        {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                    </button>
                </form>

                {/* Comments List */}
                <div className="space-y-4">
                    <h3 className="text-xl font-bold text-white px-2">Discussion ({comments.length})</h3>
                    {comments.length > 0 ? comments.map((comm) => (
                        <motion.div
                            key={comm._id}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="glass-panel p-5 rounded-2xl border border-white/5 space-y-3"
                        >
                            <div className="flex items-center justify-between">
                                <Link href={`/profile/${comm.user?.username}`} className="flex items-center gap-3 hover:opacity-80 transition-opacity">
                                    <img
                                        src={comm.user?.avatar || fallbackAvatar(comm.user?.username || "commenter")}
                                        alt={comm.user?.name}
                                        className="w-8 h-8 rounded-full object-cover"
                                    />
                                    <div>
                                        <span className="font-bold text-sm text-slate-200">{comm.user?.name}</span>
                                        <span className="text-xs text-slate-500 ml-2">@{comm.user?.username} · {formatDistanceToNow(new Date(comm.createdAt))} ago</span>
                                    </div>
                                </Link>
                                <button className="text-slate-600 hover:text-white"><MoreHorizontal className="w-4 h-4" /></button>
                            </div>
                            <p className="text-slate-400 text-sm leading-relaxed pl-11">{comm.content}</p>
                        </motion.div>
                    )) : (
                        <div className="py-12 text-center text-slate-500 glass-panel rounded-2xl border border-white/5 italic">
                            No comments yet. Be the first to start the conversation!
                        </div>
                    )}
                </div>
            </div>

            {/* Sidebar Context */}
            <div className="hidden lg:flex flex-col w-72 space-y-6">
                <TrendingSidebar />
                <SuggestedUsers />
            </div>
        </div>
    );
}
