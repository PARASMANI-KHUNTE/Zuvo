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
import Image from "next/image";
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
        const abortController = new AbortController();

        const loadData = async () => {
            try {
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
            } catch (err: any) {
                if (err?.name === 'CanceledError' || err?.code === 'ERR_CANCELED') return;
            }
        };
        loadData();

        return () => abortController.abort();
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
        <div className="flex flex-col xl:flex-row gap-6 lg:gap-8 items-start justify-between w-full">
            {/* Main Content Area */}
            <div className="w-full xl:max-w-[620px] 2xl:max-w-[660px] flex-1 min-w-0 space-y-4">
                {/* Back Button */}
                <button
                    type="button"
                    onClick={() => router.back()}
                    className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors mb-2 group"
                >
                    <ArrowLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
                    <span className="font-medium text-xs">Back</span>
                </button>

                {/* Main Post Card */}
                <div className="bg-[#111113]/80 backdrop-blur-xl border border-white/[0.08] p-5 sm:p-6 space-y-5 rounded-xl">
                    {/* Header */}
                    <div className="flex items-center justify-between">
                        <Link href={`/profile/${post.author?.username}`} className="flex items-center gap-3 hover:opacity-80 transition-opacity">
                            <div className="w-10 h-10 rounded-full border border-white/10 bg-zinc-800 relative overflow-hidden flex-shrink-0">
                                <Image
                                    src={post.author?.avatar || fallbackAvatar(post.author?.username || "author")}
                                    alt={post.author?.name || "Author"}
                                    fill
                                    unoptimized
                                    className="object-cover"
                                />
                            </div>
                            <div>
                                <h2 className="font-semibold text-sm text-white">{post.author?.name}</h2>
                                <p className="text-xs text-zinc-500">@{post.author?.username} · {formatDistanceToNow(new Date(post.createdAt))} ago</p>
                            </div>
                        </Link>
                        <button
                            type="button"
                            onClick={() => {
                                navigator.clipboard.writeText(params.id);
                                toast("Post ID copied to clipboard!", "success");
                            }}
                            title="Copy Post ID"
                            className="p-1.5 hover:bg-white/[0.06] rounded-lg transition-colors text-zinc-500 hover:text-zinc-300"
                        >
                            <MoreHorizontal className="w-4 h-4" />
                        </button>
                    </div>

                    {/* Body & Unified Media */}
                    <div className="space-y-3.5">
                        <h1 className="text-lg sm:text-xl font-bold text-white tracking-tight leading-snug">{post.title}</h1>
                        <p className="text-zinc-300 text-xs sm:text-sm leading-relaxed whitespace-pre-wrap">{post.content}</p>

                        {(post.media && post.media.length > 0) ? (
                            <div className="space-y-3">
                                {post.media.map((item: any, idx: number) => (
                                    <div key={idx} className="rounded-lg overflow-hidden border border-white/[0.08] bg-zinc-950">
                                        {item.type === "image" ? (
                                            <Image src={item.url} alt="Post visual" width={800} height={600} unoptimized className="w-full h-auto object-cover max-h-[600px]" />
                                        ) : item.type === "video" ? (
                                            <video src={item.url} controls className="w-full h-auto max-h-[600px]" />
                                        ) : item.type === "audio" ? (
                                            <div className="p-4">
                                                <audio src={item.url} controls className="w-full" />
                                            </div>
                                        ) : (
                                            <a
                                                href={item.url}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="flex items-center gap-3 p-4 hover:bg-white/[0.04] transition-all"
                                            >
                                                <div className="w-8 h-8 rounded-lg bg-white/[0.06] flex items-center justify-center text-zinc-300">
                                                    <Share2 className="w-4 h-4" />
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-xs font-medium text-white truncate">Attached Document</p>
                                                    <p className="text-[11px] text-zinc-500">Click to view/download</p>
                                                </div>
                                            </a>
                                        )}
                                    </div>
                                ))}
                            </div>
                        ) : post.image && post.image !== "no-photo.jpg" && (
                            <div className="rounded-lg overflow-hidden border border-white/[0.08]">
                                <Image src={post.image} alt="Post visual" width={800} height={600} unoptimized className="w-full h-auto object-cover max-h-[500px]" />
                            </div>
                        )}

                        {post.tags?.length > 0 && (
                            <div className="flex flex-wrap gap-1.5 pt-1">
                                {post.tags.map((tag: string) => (
                                    <span
                                        key={tag}
                                        onClick={() => router.push(`/search?q=${tag}&type=posts`)}
                                        className="text-[10px] font-medium text-zinc-400 bg-white/[0.04] hover:bg-white/[0.08] hover:text-zinc-200 border border-white/[0.06] px-2 py-0.5 rounded transition-colors cursor-pointer"
                                    >
                                        #{tag}
                                    </span>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-5 pt-3 border-t border-white/[0.06]">
                        <button
                            type="button"
                            onClick={handleLike}
                            disabled={liking}
                            className={`flex items-center gap-1.5 text-xs transition-colors ${isLiked ? "text-white font-medium" : "text-zinc-500 hover:text-zinc-200"}`}
                        >
                            <Heart className={`w-3.5 h-3.5 ${isLiked ? "fill-white text-white" : ""}`} />
                            <span className="tabular-nums">{likeCount}</span>
                        </button>
                        <div className="flex items-center gap-1.5 text-xs text-zinc-500">
                            <MessageCircle className="w-3.5 h-3.5" />
                            <span className="tabular-nums">{comments.length}</span>
                        </div>
                        <button type="button" onClick={handleShare} className="flex items-center gap-1.5 text-xs text-zinc-500 hover:text-zinc-200 ml-auto transition-colors">
                            <Share2 className="w-3.5 h-3.5" />
                            <span>Share</span>
                        </button>
                    </div>
                </div>

                {/* Comment Input */}
                <form onSubmit={handleCommentSubmit} className="bg-[#111113]/80 backdrop-blur-xl border border-white/[0.08] p-3 rounded-xl flex items-center gap-3">
                    <div className="w-7 h-7 rounded-full bg-zinc-800 border border-white/10 relative overflow-hidden flex-shrink-0">
                        <Image
                            src={currentUser?.avatar || fallbackAvatar(currentUser?.username || "me")}
                            fill
                            unoptimized
                            className="object-cover"
                            alt="My Profile"
                        />
                    </div>
                    <div className="flex-1 relative">
                        <input
                            type="text"
                            value={commentText}
                            onChange={(e) => setCommentText(e.target.value)}
                            placeholder="Add a comment..."
                            disabled={submitting}
                            className="w-full bg-transparent border-none outline-none text-xs text-zinc-200 placeholder:text-zinc-500"
                        />
                    </div>
                    <button
                        type="submit"
                        disabled={!commentText.trim() || submitting}
                        className="btn-primary !text-xs !py-1.5 !px-3 disabled:opacity-40"
                    >
                        {submitting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : "Reply"}
                    </button>
                </form>

                {/* Comments List */}
                <div className="space-y-3">
                    <h3 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider px-1">Discussion ({comments.length})</h3>
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
            <aside className="hidden xl:flex flex-col w-72 2xl:w-80 flex-shrink-0 sticky top-20 space-y-4">
                <TrendingSidebar />
                <SuggestedUsers />
            </aside>
        </div>
    );
}

// Extracted Nested Comment Component
const CommentItem = React.memo(function CommentItem({ comment, postId, currentUser, depth = 0 }: { comment: any; postId: string; currentUser: any; depth?: number }) {
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
            className={`bg-[#111113]/80 backdrop-blur-xl border border-white/[0.08] p-3.5 rounded-xl space-y-2.5 ${depth > 0 ? 'ml-6 sm:ml-8 relative before:absolute before:-left-4 before:top-0 before:bottom-0 before:w-px before:bg-white/[0.08]' : ''}`}
        >
            <div className="flex items-center justify-between">
                <Link href={`/profile/${comment.user?.username}`} className="flex items-center gap-2.5 hover:opacity-80 transition-opacity">
                    <div className="w-6 h-6 rounded-full overflow-hidden bg-zinc-800 border border-white/10 relative">
                        <Image
                            src={comment.user?.avatar || fallbackAvatar(comment.user?.username || "commenter")}
                            alt={comment.user?.name || "User"}
                            fill
                            unoptimized
                            className="object-cover"
                        />
                    </div>
                    <div>
                        <span className="font-medium text-xs text-zinc-200">{comment.user?.name}</span>
                        <span className="text-[11px] text-zinc-500 ml-2">@{comment.user?.username} · {formatDistanceToNow(new Date(comment.createdAt))} ago</span>
                    </div>
                </Link>
                <button type="button" className="text-zinc-600 hover:text-zinc-300"><MoreHorizontal className="w-3.5 h-3.5" /></button>
            </div>

            <p className="text-zinc-300 text-xs leading-relaxed pl-8">{comment.content}</p>

            <div className="flex items-center gap-4 pl-8 pt-0.5">
                <button onClick={handleLike} disabled={liking} className={`flex items-center gap-1.5 text-xs transition-colors ${isLiked ? 'text-white font-medium' : 'text-zinc-500 hover:text-zinc-200'}`}>
                    <Heart className={`w-3 h-3 ${isLiked ? 'fill-white text-white' : ''}`} /> {likes > 0 && <span className="tabular-nums">{likes}</span>}
                </button>
                <button onClick={() => setIsReplying(!isReplying)} className="flex items-center gap-1.5 text-xs text-zinc-500 hover:text-zinc-200 transition-colors">
                    <MessageCircle className="w-3 h-3" /> Reply
                </button>
            </div>

            {isReplying && (
                <form onSubmit={handleReplySubmit} className="ml-8 mt-2 flex items-center gap-2">
                    <input
                        type="text"
                        value={replyText}
                        onChange={(e) => setReplyText(e.target.value)}
                        placeholder={`Replying to @${comment.user?.username}...`}
                        disabled={submitting}
                        autoFocus
                        className="flex-1 bg-white/[0.04] border border-white/[0.08] rounded-lg py-1.5 px-2.5 text-white text-xs outline-none focus:border-white/30"
                    />
                    <button type="submit" disabled={!replyText.trim() || submitting} className="btn-primary !text-xs !py-1 !px-2.5 disabled:opacity-40">
                        {submitting ? <Loader2 className="w-3 h-3 animate-spin" /> : <Send className="w-3 h-3" />}
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
});
