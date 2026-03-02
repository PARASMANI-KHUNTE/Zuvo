"use client";
import React, { useState, useRef, useEffect } from "react";
import { Heart, MessageCircle, Share2, MoreHorizontal, Bookmark, EyeOff, Edit3, Trash2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";
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

export default function PostCard({ id, author, avatar, content, image, media = [], likes: initialLikes, comments, timestamp, initialIsLiked = false, initialIsSaved = false, isOwnPost = false, tags = [], onDelete }: PostCardProps) {
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
                    text: content.substring(0, 100),
                    url: res.data.data.shareUrl
                });
            } else if (res.data.success) {
                await navigator.clipboard.writeText(res.data.data.shareUrl);
                toast("Link copied to clipboard!", "success");
            }
        } catch (err) {
            console.error("Failed to share", err);
        }
    };

    const handleSavePost = async (e: React.MouseEvent) => {
        e.stopPropagation();
        setShowMenu(false);
        setIsSaved(!isSaved);
        try {
            await apiClient.post("/interactions/save", { postId: id });
        } catch (err) {
            setIsSaved(isSaved); // Revert on failure
            console.error("Failed to save post", err);
        }
    };

    const handleHidePost = async (e: React.MouseEvent) => {
        e.stopPropagation();
        setShowMenu(false);
        setHidden(true);
        try {
            await apiClient.post("/interactions/hide", { postId: id });
        } catch (err) {
            console.error("Failed to hide post", err);
        }
    };

    const handleDelete = async (e: React.MouseEvent) => {
        e.stopPropagation();
        setShowMenu(false);

        const confirmed = await confirm({
            title: "Delete Post?",
            message: "Are you sure you want to delete this post? This action cannot be undone.",
            confirmText: "Delete",
            type: "danger"
        });

        if (confirmed) {
            try {
                const res = await apiClient.delete(`/blogs/${id}`);
                if (res.data.success && onDelete) {
                    onDelete(id);
                    toast("Post deleted successfully", "success");
                } else {
                    setHidden(true); // Hide it locally
                    toast("Post removed from view", "info");
                }
            } catch (err) {
                console.error("Failed to delete post", err);
                toast("Failed to delete post", "error");
            }
        }
    };

    const handleEdit = (e: React.MouseEvent) => {
        e.stopPropagation();
        setShowMenu(false);
        router.push(`/post/${id}/edit`);
    };

    // Helper to render links in content
    const renderContentWithLinks = (text: string) => {
        const urlRegex = /(https?:\/\/[^\s]+)/g;
        return text.split(urlRegex).map((part, i) => {
            if (part.match(urlRegex)) {
                return (
                    <a key={i} href={part} target="_blank" rel="noopener noreferrer" className="text-secondary hover:underline" onClick={(e) => e.stopPropagation()}>
                        {part}
                    </a>
                );
            }
            return part;
        });
    };

    if (hidden) return null;

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            onClick={() => router.push(`/post/${id}`)}
            className="glass-panel p-6 space-y-4 hover:border-white/20 transition-all cursor-pointer group/card relative"
        >
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary/40 to-secondary/40 border border-white/10 overflow-hidden">
                        {avatar && <img src={avatar} alt={author} className="w-full h-full object-cover" />}
                    </div>
                    <div>
                        <h4 className="font-bold text-sm text-white">{author}</h4>
                        <p className="text-xs text-slate-500">{timestamp}</p>
                    </div>
                </div>

                {/* Dropdown Menu Container */}
                <div className="relative" ref={menuRef}>
                    <button
                        onClick={(e) => { e.stopPropagation(); setShowMenu(!showMenu); }}
                        className="text-slate-500 hover:text-white p-2 rounded-full hover:bg-white/5 transition-all outline-none"
                    >
                        <MoreHorizontal className="w-5 h-5" />
                    </button>

                    <AnimatePresence>
                        {showMenu && (
                            <motion.div
                                initial={{ opacity: 0, scale: 0.95, top: 10 }}
                                animate={{ opacity: 1, scale: 1, top: 35 }}
                                exit={{ opacity: 0, scale: 0.95, top: 10 }}
                                className="absolute right-0 w-48 py-2 bg-[#1A1A2E] border border-white/10 rounded-xl shadow-2xl z-20 flex flex-col overflow-hidden"
                            >
                                <button onClick={handleSavePost} className="flex items-center gap-3 px-4 py-2 text-sm text-slate-300 hover:bg-white/5 hover:text-white transition-colors text-left">
                                    <Bookmark className="w-4 h-4" /> {isSaved ? "Saved" : "Save Post"}
                                </button>
                                <button onClick={handleHidePost} className="flex items-center gap-3 px-4 py-2 text-sm text-slate-300 hover:bg-white/5 hover:text-white transition-colors text-left">
                                    <EyeOff className="w-4 h-4" /> Not Interested
                                </button>
                                {isOwnPost && (
                                    <>
                                        <div className="h-px bg-white/5 my-1 mx-2" />
                                        <button onClick={handleEdit} className="flex items-center gap-3 px-4 py-2 text-sm text-slate-300 hover:bg-white/5 hover:text-white transition-colors text-left">
                                            <Edit3 className="w-4 h-4" /> Edit Post
                                        </button>
                                        <button onClick={handleDelete} className="flex items-center gap-3 px-4 py-2 text-sm text-rose-500 hover:bg-white/5 hover:text-rose-400 transition-colors text-left">
                                            <Trash2 className="w-4 h-4" /> Delete
                                        </button>
                                    </>
                                )}
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            </div>

            {/* Content & Media */}
            <div className="space-y-3">
                <p className="text-slate-300 leading-relaxed text-sm whitespace-pre-wrap">
                    {renderContentWithLinks(content)}
                </p>

                {/* Unified Media Support */}
                {(media && media.length > 0) ? (
                    <div className="space-y-2 mt-2">
                        {media.map((item, idx) => (
                            <div key={idx} className="rounded-2xl overflow-hidden border border-white/5 bg-slate-900/50">
                                {item.type === "image" ? (
                                    <img src={item.url} alt="Post content" className="w-full h-auto object-cover max-h-[450px]" />
                                ) : item.type === "video" ? (
                                    <video src={item.url} controls className="w-full h-auto max-h-[450px]" onClick={(e) => e.stopPropagation()} />
                                ) : item.type === "audio" ? (
                                    <div className="p-4" onClick={(e) => e.stopPropagation()}>
                                        <audio src={item.url} controls className="w-full" />
                                    </div>
                                ) : (
                                    <a
                                        href={item.url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        onClick={(e) => e.stopPropagation()}
                                        className="flex items-center gap-3 p-4 hover:bg-white/5 transition-colors group/file"
                                    >
                                        <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary group-hover/file:bg-primary group-hover/file:text-white transition-all">
                                            <Share2 className="w-5 h-5" />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm font-bold text-white truncate">Document Attachment</p>
                                            <p className="text-xs text-slate-500">Click to view/download</p>
                                        </div>
                                    </a>
                                )}
                            </div>
                        ))}
                    </div>
                ) : image && (
                    <div className="rounded-2xl overflow-hidden border border-white/5 mt-2">
                        <img src={image} alt="Post content" className="w-full h-auto object-cover max-h-[400px]" />
                    </div>
                )}

                {/* Tags Section */}
                {tags.length > 0 && (
                    <div className="flex flex-wrap gap-2 pt-1">
                        {tags.map((tag, i) => (
                            <span
                                key={i}
                                onClick={(e) => {
                                    e.stopPropagation();
                                    router.push(`/search?q=${tag}&type=posts`);
                                }}
                                className="text-[10px] font-bold uppercase tracking-wider text-secondary bg-secondary/10 px-2 py-0.5 rounded-md hover:bg-secondary/20 transition-colors"
                            >
                                #{tag}
                            </span>
                        ))}
                    </div>
                )}
            </div>

            {/* Actions */}
            <div className="flex items-center gap-6 pt-2 border-t border-white/5">
                <ActionButton
                    icon={<Heart className={`w-4 h-4 ${isLiked ? "fill-rose-500 text-rose-500" : ""}`} />}
                    count={likes}
                    color={isLiked ? "text-rose-500" : "hover:text-rose-500"}
                    onClick={handleLike}
                    disabled={liking}
                />
                <ActionButton
                    icon={<MessageCircle className="w-4 h-4" />}
                    count={comments}
                    color="hover:text-primary"
                    onClick={(e) => { e.stopPropagation(); router.push(`/post/${id}`); }}
                />
                <ActionButton
                    icon={<Share2 className="w-4 h-4" />}
                    onClick={handleShare}
                    color="hover:text-accent"
                />
            </div>
        </motion.div>
    );
}

function ActionButton({ icon, count, color, onClick, disabled }: { icon: React.ReactNode; count?: number; color?: string; onClick?: (e: React.MouseEvent) => void; disabled?: boolean }) {
    return (
        <button
            onClick={onClick}
            disabled={disabled}
            className={`flex items-center gap-2 text-slate-500 transition-all ${color} ${disabled ? "opacity-50 cursor-not-allowed" : ""}`}
        >
            {icon}
            {count !== undefined && <span className="text-xs font-medium">{count}</span>}
        </button>
    );
}

