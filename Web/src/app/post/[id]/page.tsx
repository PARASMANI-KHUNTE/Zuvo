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
import { useToast } from "@/context/ToastContext";

export default function PostDetailPage({ params }: { params: { id: string } }) {
    const router = useRouter();
    const { fetchPostById, fetchComments, addComment } = usePosts();
    const { user: currentUser } = useAuth();
    const { toast } = useToast();
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
            setIsLiked(!!postData?.isLiked); // Initialize from server
            setComments(commentData);
            setLoading(false);
        };
        loadData();
    }, [params.id, fetchPostById, fetchComments]);

    const handleLike = async (e: React.MouseEvent) => {
        e.stopPropagation();
        if (liking) return;
        setLiking(true);

        // Compute intended action
        const wasLiked = isLiked;
        const intendedAction = wasLiked ? "unlike" : "like";

        // Optimistic update
        setIsLiked(!wasLiked);
        setLikeCount(c => wasLiked ? c - 1 : c + 1);

        try {
            await apiClient.post("/interactions/like", { postId: params.id, action: intendedAction });
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
                    toast("Link copied to clipboard!", "success");
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
                <button type="button" onClick={() => router.push("/")} className="btn-primary px-8 py-2 rounded-full font-bold">Back Home</button>
            </div>
        );
    }

    return (
        <div className="w-full max-w-5xl mx-auto flex flex-col lg:flex-row gap-8 pb-20 mt-4">

            {/* Main Content Area */}
            <div className="flex-1 space-y-6">
                {/* Back Button */}
                <button
                    type="button"
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
                            type="button"
                            onClick={() => {
                                navigator.clipboard.writeText(params.id);
                                toast("Post ID copied to clipboard!", "success");
                            }}
                            title="Copy Post ID"
                            className="p-2 hover:bg-white/5 rounded-full transition-colors text-slate-500"
                        >
                            <MoreHorizontal className="w-6 h-6" />
                        </button>
                    </div>

                    {/* Body & Unified Media */}
                    <div className="space-y-4">
                        <h1 className="text-2xl font-black text-white tracking-tight">{post.title}</h1>
                        <p className="text-slate-200 text-lg leading-relaxed whitespace-pre-wrap">{post.content}</p>

                        {(post.media && post.media.length > 0) ? (
                            <div className="space-y-4">
                                {post.media.map((item: any, idx: number) => (
                                    <div key={idx} className="rounded-2xl overflow-hidden border border-white/5 shadow-2xl bg-slate-900/50">
                                        {item.type === "image" ? (
                                            <img src={item.url} alt="Post visual" className="w-full h-auto object-cover max-h-[800px]" />
                                        ) : item.type === "video" ? (
                                            <video src={item.url} controls className="w-full h-auto max-h-[800px]" />
                                        ) : item.type === "audio" ? (
                                            <div className="p-6">
                                                <audio src={item.url} controls className="w-full" />
                                            </div>
                                        ) : (
                                            <a
                                                href={item.url}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="flex items-center gap-4 p-6 hover:bg-white/5 transition-all group/file"
                                            >
                                                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center text-primary group-hover/file:bg-primary group-hover/file:text-white transition-all">
                                                    <Share2 className="w-6 h-6" />
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-lg font-bold text-white truncate">Attached Document</p>
                                                    <p className="text-sm text-slate-500 font-medium">Click to view/download attachment</p>
                                                </div>
                                            </a>
                                        )}
                                    </div>
                                ))}
                            </div>
                        ) : post.image && post.image !== "no-photo.jpg" && (
                            <div className="rounded-2xl overflow-hidden border border-white/5 shadow-2xl">
                                <img src={post.image} alt="Post visual" className="w-full h-auto object-cover max-h-[600px]" />
                            </div>
                        )}

                        {post.tags?.length > 0 && (
                            <div className="flex flex-wrap gap-2 pt-2">
                                {post.tags.map((tag: string) => (
                                    <span
                                        key={tag}
                                        onClick={() => router.push(`/search?q=${tag}&type=posts`)}
                                        className="text-secondary bg-secondary/10 px-3 py-1 rounded-full text-xs font-bold hover:bg-secondary/20 transition-all cursor-pointer"
                                    >
                                        #{tag}
                                    </span>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-6 pt-6 border-t border-white/5">
                        <button
                            type="button"
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
                        <button type="button" onClick={handleShare} className="flex items-center gap-2 text-slate-400 ml-auto hover:text-primary transition-colors">
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
                        <CommentItem
                            key={comm._id}
                            comment={comm}
                            postId={params.id}
                            currentUser={currentUser}
                        />
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

// Extracted Nested Comment Component
function CommentItem({ comment, postId, currentUser, depth = 0 }: { comment: any; postId: string; currentUser: any; depth?: number }) {
    const { fetchReplies, addComment } = usePosts();
    const [replies, setReplies] = useState<any[]>([]);
    const [loadingReplies, setLoadingReplies] = useState(false);
    const [showReplies, setShowReplies] = useState(false);
    const [isReplying, setIsReplying] = useState(false);
    const [replyText, setReplyText] = useState("");
    const [submitting, setSubmitting] = useState(false);

    // Likes state
    const [likes, setLikes] = useState(comment.likesCount || 0);
    const [isLiked, setIsLiked] = useState(false);
    const [liking, setLiking] = useState(false);

    const fallbackAvatar = (seed: string) => `https://api.dicebear.com/7.x/avataaars/svg?seed=${seed}`;

    const handleLoadReplies = async () => {
        if (!showReplies && replies.length === 0) {
            setLoadingReplies(true);
            const data = await fetchReplies(comment._id);
            setReplies(data);
            setLoadingReplies(false);
        }
        setShowReplies(!showReplies);
    };

    const handleReplySubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!replyText.trim() || submitting) return;

        setSubmitting(true);
        const newReply = await addComment(postId, replyText, comment._id);
        if (newReply) {
            const dicebearAvatar = fallbackAvatar(currentUser?.username || "me");
            const enriched = {
                ...newReply,
                user: {
                    name: currentUser?.name,
                    username: currentUser?.username,
                    avatar: currentUser?.avatar || dicebearAvatar
                },
                createdAt: new Date().toISOString()
            };
            setReplies([...replies, enriched]);
            setReplyText("");
            setIsReplying(false);
            if (!showReplies) setShowReplies(true);
        }
        setSubmitting(false);
    };

    const handleLike = async () => {
        if (liking) return;
        setLiking(true);

        const wasLiked = isLiked;
        setIsLiked(!wasLiked);
        setLikes((c: number) => wasLiked ? c - 1 : c + 1);

        try {
            await apiClient.post("/interactions/comments/like", { commentId: comment._id, action: wasLiked ? "dislike" : "like" });
        } catch (err) {
            setIsLiked(wasLiked);
            setLikes((c: number) => wasLiked ? c + 1 : c - 1);
        } finally {
            setLiking(false);
        }
    };

    return (
        <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className={`glass-panel p-5 rounded-2xl border border-white/5 space-y-3 ${depth > 0 ? 'ml-8 md:ml-12 relative before:absolute before:-left-6 before:top-0 before:bottom-0 before:w-px before:bg-white/10' : ''}`}
        >
            <div className="flex items-center justify-between">
                <Link href={`/profile/${comment.user?.username}`} className="flex items-center gap-3 hover:opacity-80 transition-opacity">
                    <img
                        src={comment.user?.avatar || fallbackAvatar(comment.user?.username || "commenter")}
                        alt={comment.user?.name}
                        className="w-8 h-8 rounded-full object-cover"
                    />
                    <div>
                        <span className="font-bold text-sm text-slate-200">{comment.user?.name}</span>
                        <span className="text-xs text-slate-500 ml-2">@{comment.user?.username} · {formatDistanceToNow(new Date(comment.createdAt))} ago</span>
                    </div>
                </Link>
                <button type="button" className="text-slate-600 hover:text-white"><MoreHorizontal className="w-4 h-4" /></button>
            </div>

            <p className="text-slate-400 text-sm leading-relaxed pl-11">{comment.content}</p>

            <div className="flex items-center gap-4 pl-11 pt-1">
                <button onClick={handleLike} disabled={liking} className={`flex items-center gap-1.5 text-xs font-semibold ${isLiked ? 'text-rose-500' : 'text-slate-500 hover:text-rose-400'} transition-colors`}>
                    <Heart className={`w-3.5 h-3.5 ${isLiked ? 'fill-rose-500' : ''}`} /> {likes > 0 && likes}
                </button>
                <button onClick={() => setIsReplying(!isReplying)} className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-white transition-colors">
                    <MessageCircle className="w-3.5 h-3.5" /> Reply
                </button>
            </div>

            {isReplying && (
                <form onSubmit={handleReplySubmit} className="ml-11 mt-3 flex items-center gap-3">
                    <input
                        type="text"
                        value={replyText}
                        onChange={(e) => setReplyText(e.target.value)}
                        placeholder={`Replying to @${comment.user?.username}...`}
                        disabled={submitting}
                        autoFocus
                        className="flex-1 bg-white/5 border border-white/10 rounded-lg py-2 px-3 text-white text-xs focus:outline-none focus:ring-1 focus:ring-primary/50"
                    />
                    <button type="submit" disabled={!replyText.trim() || submitting} className="text-primary hover:text-white transition-colors p-1 disabled:opacity-50">
                        {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                    </button>
                </form>
            )}

            {/* Depth Check prevents infinite recursion just in case, limiting nesting to 3 levels deep here for UX */}
            {depth < 3 && (
                <div className="pl-11 pt-2">
                    <button onClick={handleLoadReplies} className="text-xs text-primary/80 font-semibold hover:text-primary transition-colors flex items-center gap-2">
                        {loadingReplies && <Loader2 className="w-3 h-3 animate-spin" />}
                        {showReplies ? "Hide replies" : `View replies`}
                    </button>

                    {showReplies && replies.length > 0 && (
                        <div className="mt-4 space-y-4">
                            {replies.map(reply => (
                                <CommentItem
                                    key={reply._id}
                                    comment={reply}
                                    postId={postId}
                                    currentUser={currentUser}
                                    depth={depth + 1}
                                />
                            ))}
                        </div>
                    )}
                </div>
            )}
        </motion.div>
    );
}
