"use client";
import React, { useState } from "react";
import { Heart, MessageCircle, Share2, MoreHorizontal } from "lucide-react";
import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import apiClient from "@/lib/api";

interface PostCardProps {
    id: string;
    author: string;
    avatar?: string;
    content: string;
    image?: string;
    likes: number;
    comments: number;
    timestamp: string;
    initialIsLiked?: boolean;
}

export default function PostCard({ id, author, avatar, content, image, likes: initialLikes, comments, timestamp, initialIsLiked = false }: PostCardProps) {
    const router = useRouter();
    const [likes, setLikes] = useState(initialLikes);
    const [isLiked, setIsLiked] = useState(initialIsLiked);
    const [liking, setLiking] = useState(false);

    const handleLike = async (e: React.MouseEvent) => {
        e.stopPropagation();
        if (liking) return;

        setLiking(true);
        // Optimistic update
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
            // Rollback
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
                alert("Link copied to clipboard!");
            }
        } catch (err) {
            console.error("Failed to share", err);
        }
    };

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            onClick={() => router.push(`/post/${id}`)}
            className="glass-panel p-6 space-y-4 hover:border-white/20 transition-all cursor-pointer group/card"
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
                <button
                    onClick={(e) => { e.stopPropagation(); }}
                    className="text-slate-500 hover:text-white transition-all"
                >
                    <MoreHorizontal className="w-5 h-5" />
                </button>
            </div>

            {/* Content */}
            <div className="space-y-3">
                <p className="text-slate-300 leading-relaxed text-sm">
                    {content}
                </p>
                {image && (
                    <div className="rounded-2xl overflow-hidden border border-white/5">
                        <img src={image} alt="Post content" className="w-full h-auto object-cover max-h-[400px]" />
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
