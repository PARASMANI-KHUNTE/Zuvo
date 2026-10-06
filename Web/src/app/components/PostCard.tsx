"use client";
import React, { useState, useRef, useEffect } from "react";
import { Heart, MessageCircle, Share2, MoreHorizontal, Bookmark, EyeOff, Edit3, Trash2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";
import Image from "next/image";
import apiClient from "@/lib/api";
import { useToast } from "@/context/ToastContext";
import { useConfirm } from "@/context/ConfirmationContext";

interface PostCardProps {
    id: string;
    author: string;
    avatar?: string;
    content: string;
    image?: string;
    media?: Array<{ url: string; type: string; publicId: string }>;
    likes: number;
    comments: number;
    timestamp: string;
    initialIsLiked?: boolean;
    initialIsSaved?: boolean;
    isOwnPost?: boolean;
    tags?: string[];
    onDelete?: (id: string) => void;
}

const PostCard = React.memo(function PostCard({
    id,
    author,
    avatar,
    content,
    image,
    media = [],
    likes: initialLikes,
    comments,
    timestamp,
    initialIsLiked = false,
    initialIsSaved = false,
    isOwnPost = false,
    tags = [],
    onDelete
}: PostCardProps) {
    const router = useRouter();
    const { toast } = useToast();
    const { confirm } = useConfirm();
    const [likes, setLikes] = useState(initialLikes);
    const [isLiked, setIsLiked] = useState(initialIsLiked);
    const [isSaved, setIsSaved] = useState(initialIsSaved);
    const [liking, setLiking] = useState(false);
    const [showMenu, setShowMenu] = useState(false);
    const [hidden, setHidden] = useState(false);
    const menuRef = useRef<HTMLDivElement>(null);

    // Close menu on click outside
    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
                setShowMenu(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const handleLike = async (e: React.MouseEvent) => {
        e.stopPropagation();
        if (liking) return;

        setLiking(true);
        const prevLikes = likes;
        const prevIsLiked = isLiked;
        setLikes(prev => isLiked ? prev - 1 : prev + 1);
        setIsLiked(!isLiked);

        try {
            const res = await apiClient.post("/interactions/like", { postId: id, action: "like" });
            if (res.data.success) {
                setLikes(res.data.data.likes);
            }
        } catch (err) {
            setLikes(prevLikes);
            setIsLiked(prevIsLiked);
        } finally {
            setLiking(false);
        }
    };

    const handleShare = async (e: React.MouseEvent) => {
        e.stopPropagation();
        try {
            const res = await apiClient.get(`/interactions/share/${id}`);
            if (res.data.success && navigator.share) {
                await navigator.share({
                    title: `Check out this post by ${author}`,
                    url: res.data.data.shareUrl || window.location.href,
                });
            } else if (res.data.success) {
                await navigator.clipboard.writeText(res.data.data.shareUrl || `${window.location.origin}/post/${id}`);
                toast("Link copied to clipboard", "success");
            }
        } catch (err) {
            toast("Failed to share", "error");
        }
    };

    const handleSavePost = async (e: React.MouseEvent) => {
        e.stopPropagation();
        try {
            const res = await apiClient.post("/interactions/save", { postId: id });
            if (res.data.success) {
                setIsSaved(res.data.data.isSaved);
                toast(res.data.data.isSaved ? "Saved to bookmarks" : "Removed from bookmarks", "info");
            }
        } catch (err) {
            toast("Failed to update bookmark", "error");
        } finally {
            setShowMenu(false);
        }
    };

    const handleHidePost = async (e: React.MouseEvent) => {
        e.stopPropagation();
        try {
            const res = await apiClient.post("/interactions/hide", { postId: id });
            if (res.data.success) {
                setHidden(true);
                toast("Post hidden from feed", "info");
            }
        } catch (err) {
            toast("Failed to hide post", "error");
        } finally {
            setShowMenu(false);
        }
    };

    const handleDelete = async (e: React.MouseEvent) => {
        e.stopPropagation();
        setShowMenu(false);

        const ok = await confirm({
            title: "Delete post?",
            message: "Are you sure you want to delete this post? This action cannot be undone.",
            confirmText: "Delete",
            cancelText: "Cancel",
            type: "danger"
        });

        if (ok) {
            try {
                const res = await apiClient.delete(`/blogs/${id}`);
                if (res.data.success && onDelete) {
                    onDelete(id);
                    toast("Post deleted successfully", "success");
                } else {
                    setHidden(true);
                    toast("Post removed from view", "info");
                }
            } catch (err) {
                toast("Failed to delete post", "error");
            }
        }
    };

    const handleEdit = (e: React.MouseEvent) => {
        e.stopPropagation();
        setShowMenu(false);
        router.push(`/post/${id}/edit`);
    };

    const renderContentWithLinks = (text: string) => {
        const urlRegex = /(https?:\/\/[^\s]+)/g;
        return text.split(urlRegex).map((part, i) => {
            if (part.match(urlRegex)) {
                return (
                    <a
                        key={i}
                        href={part}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-zinc-300 underline underline-offset-2 hover:text-white"
                        onClick={(e) => e.stopPropagation()}
                    >
                        {part}
                    </a>
                );
            }
            return part;
        });
    };

    if (hidden) return null;

    return (
        <article
            onClick={() => router.push(`/post/${id}`)}
            className="bg-[#111113]/80 backdrop-blur-xl border border-white/[0.08] hover:border-white/[0.16] rounded-xl p-5 space-y-3 transition-all cursor-pointer relative"
        >
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-full bg-zinc-800 border border-white/10 overflow-hidden relative flex-shrink-0">
                        {avatar && <Image src={avatar} alt={author} fill unoptimized className="object-cover" />}
                    </div>
                    <div>
                        <h4 className="font-medium text-xs text-white leading-tight">{author}</h4>
                        <p className="text-[11px] text-zinc-500">{timestamp}</p>
                    </div>
                </div>

                {/* Dropdown Menu */}
                <div className="relative" ref={menuRef}>
                    <button
                        onClick={(e) => { e.stopPropagation(); setShowMenu(!showMenu); }}
                        className="text-zinc-500 hover:text-zinc-200 p-1.5 rounded-md hover:bg-white/[0.06] transition-colors"
                        title="Options"
                    >
                        <MoreHorizontal className="w-4 h-4" />
                    </button>

                    <AnimatePresence>
                        {showMenu && (
                            <motion.div
                                initial={{ opacity: 0, scale: 0.95 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 0.95 }}
                                className="absolute right-0 top-8 w-44 py-1.5 bg-[#18181b] border border-white/[0.1] rounded-lg shadow-2xl z-20 flex flex-col overflow-hidden text-xs"
                            >
                                <button
                                    onClick={handleSavePost}
                                    className="flex items-center gap-2.5 px-3 py-1.5 text-zinc-300 hover:bg-white/[0.06] hover:text-white transition-colors text-left"
                                >
                                    <Bookmark className="w-3.5 h-3.5" />
                                    <span>{isSaved ? "Saved" : "Bookmark"}</span>
                                </button>
                                <button
                                    onClick={handleHidePost}
                                    className="flex items-center gap-2.5 px-3 py-1.5 text-zinc-300 hover:bg-white/[0.06] hover:text-white transition-colors text-left"
                                >
                                    <EyeOff className="w-3.5 h-3.5" />
                                    <span>Not Interested</span>
                                </button>
                                {isOwnPost && (
                                    <>
                                        <div className="h-px bg-white/[0.08] my-1" />
                                        <button
                                            onClick={handleEdit}
                                            className="flex items-center gap-2.5 px-3 py-1.5 text-zinc-300 hover:bg-white/[0.06] hover:text-white transition-colors text-left"
                                        >
                                            <Edit3 className="w-3.5 h-3.5" />
                                            <span>Edit</span>
                                        </button>
                                        <button
                                            onClick={handleDelete}
                                            className="flex items-center gap-2.5 px-3 py-1.5 text-rose-400 hover:bg-rose-500/10 transition-colors text-left"
                                        >
                                            <Trash2 className="w-3.5 h-3.5" />
                                            <span>Delete</span>
                                        </button>
                                    </>
                                )}
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            </div>

            {/* Content & Media */}
            <div className="space-y-2.5">
                <p className="text-zinc-200 text-xs leading-relaxed whitespace-pre-wrap font-normal">
                    {renderContentWithLinks(content)}
                </p>

                {/* Media Render */}
                {media && media.length > 0 ? (
                    <div className="space-y-2 pt-1">
                        {media.map((item, idx) => (
                            <div key={idx} className="rounded-lg overflow-hidden border border-white/[0.06] bg-zinc-950/50 relative">
                                {item.type === "image" ? (
                                    <Image
                                        src={item.url}
                                        alt="Post content"
                                        width={800}
                                        height={450}
                                        unoptimized
                                        className="w-full h-auto object-cover max-h-[420px]"
                                    />
                                ) : item.type === "video" ? (
                                    <video src={item.url} controls className="w-full h-auto max-h-[420px]" onClick={(e) => e.stopPropagation()} />
                                ) : item.type === "audio" ? (
                                    <div className="p-3" onClick={(e) => e.stopPropagation()}>
                                        <audio src={item.url} controls className="w-full" />
                                    </div>
                                ) : (
                                    <a
                                        href={item.url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        onClick={(e) => e.stopPropagation()}
                                        className="flex items-center gap-3 p-3 hover:bg-white/[0.04] transition-colors"
                                    >
                                        <div className="w-8 h-8 rounded bg-white/[0.06] flex items-center justify-center text-zinc-300">
                                            <Share2 className="w-4 h-4" />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-xs font-medium text-white truncate">Document</p>
                                            <p className="text-[10px] text-zinc-500">Click to view</p>
                                        </div>
                                    </a>
                                )}
                            </div>
                        ))}
                    </div>
                ) : image && (
                    <div className="rounded-lg overflow-hidden border border-white/[0.06] pt-1 relative">
                        <Image src={image} alt="Post content" width={800} height={400} unoptimized className="w-full h-auto object-cover max-h-[400px]" />
                    </div>
                )}

                {/* Tags */}
                {tags.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 pt-0.5">
                        {tags.map((tag, i) => (
                            <span
                                key={i}
                                onClick={(e) => {
                                    e.stopPropagation();
                                    router.push(`/search?q=${tag}&type=posts`);
                                }}
                                className="text-[10px] font-medium text-zinc-400 bg-white/[0.04] hover:bg-white/[0.08] hover:text-zinc-200 border border-white/[0.06] px-2 py-0.5 rounded transition-colors"
                            >
                                #{tag}
                            </span>
                        ))}
                    </div>
                )}
            </div>

            {/* Actions Bar */}
            <div className="flex items-center gap-5 pt-2 border-t border-white/[0.06]">
                <ActionButton
                    icon={<Heart className={`w-3.5 h-3.5 ${isLiked ? "fill-white text-white" : ""}`} />}
                    count={likes}
                    active={isLiked}
                    onClick={handleLike}
                    disabled={liking}
                />
                <ActionButton
                    icon={<MessageCircle className="w-3.5 h-3.5" />}
                    count={comments}
                    onClick={(e) => { e.stopPropagation(); router.push(`/post/${id}`); }}
                />
                <ActionButton
                    icon={<Share2 className="w-3.5 h-3.5" />}
                    onClick={handleShare}
                />
                <div className="ml-auto">
                    <ActionButton
                        icon={<Bookmark className={`w-3.5 h-3.5 ${isSaved ? "fill-white text-white" : ""}`} />}
                        active={isSaved}
                        onClick={handleSavePost}
                    />
                </div>
            </div>
        </article>
    );
});

const ActionButton = React.memo(function ActionButton({
    icon,
    count,
    active = false,
    onClick,
    disabled
}: {
    icon: React.ReactNode;
    count?: number;
    active?: boolean;
    onClick?: (e: React.MouseEvent) => void;
    disabled?: boolean;
}) {
    return (
        <button
            onClick={onClick}
            disabled={disabled}
            className={`flex items-center gap-1.5 text-xs transition-colors py-1 ${
                active
                    ? "text-white font-medium"
                    : "text-zinc-500 hover:text-zinc-200"
            } ${disabled ? "opacity-50 cursor-not-allowed" : ""}`}
        >
            {icon}
            {count !== undefined && <span className="text-[11px] tabular-nums">{count}</span>}
        </button>
    );
});

export default PostCard;
