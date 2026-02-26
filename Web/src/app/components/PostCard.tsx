"use client";
import React from "react";
import { Heart, MessageCircle, Share2, MoreHorizontal } from "lucide-react";
import { motion } from "framer-motion";

interface PostCardProps {
    author: string;
    avatar?: string;
    content: string;
    image?: string;
    likes: number;
    comments: number;
    timestamp: string;
}

export default function PostCard({ author, avatar, content, image, likes, comments, timestamp }: PostCardProps) {
    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="glass-panel p-6 space-y-4 hover:border-white/20 transition-all"
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
                <button className="text-slate-500 hover:text-white transition-all">
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
                <ActionButton icon={<Heart className="w-4 h-4" />} count={likes} color="hover:text-pink-500" />
                <ActionButton icon={<MessageCircle className="w-4 h-4" />} count={comments} color="hover:text-primary" />
                <ActionButton icon={<Share2 className="w-4 h-4" />} />
            </div>
        </motion.div>
    );
}

function ActionButton({ icon, count, color }: { icon: React.ReactNode; count?: number; color?: string }) {
    return (
        <button className={`flex items-center gap-2 text-slate-500 transition-all ${color}`}>
            {icon}
            {count !== undefined && <span className="text-xs font-medium">{count}</span>}
        </button>
    );
}
