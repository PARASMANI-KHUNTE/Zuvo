"use client";
import React, { useState } from "react";
import { Image, Tag, Send, Loader2, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import apiClient from "@/lib/api";

interface CreatePostProps {
    onSuccess?: () => void;
}

export default function CreatePost({ onSuccess }: CreatePostProps) {
    const [isExpanded, setIsExpanded] = useState(false);
    const [title, setTitle] = useState("");
    const [content, setContent] = useState("");
    const [tags, setTags] = useState<string[]>([]);
    const [tagInput, setTagInput] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleAddTag = (e: React.KeyboardEvent) => {
        if (e.key === "Enter" && tagInput.trim()) {
            e.preventDefault();
            if (!tags.includes(tagInput.trim())) {
                setTags([...tags, tagInput.trim()]);
            }
            setTagInput("");
        }
    };

    const removeTag = (tagToRemove: string) => {
        setTags(tags.filter(t => t !== tagToRemove));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!content.trim() || !title.trim()) return;

        setLoading(true);
        setError(null);

        try {
            await apiClient.post("/blogs", {
                title,
                content,
                tags,
                status: "published"
            });

            // Reset form
            setTitle("");
            setContent("");
            setTags([]);
            setIsExpanded(false);

            if (onSuccess) onSuccess();
        } catch (err: any) {
            setError(err.response?.data?.message || "Failed to create post. Are you logged in?");
        } finally {
            setLoading(false);
        }
    };

    return (
        <motion.div
            layout
            className="glass-panel p-4 w-full space-y-4"
        >
            {!isExpanded ? (
                <div
                    onClick={() => setIsExpanded(true)}
                    className="flex items-center gap-4 cursor-text"
                >
                    <div className="w-10 h-10 rounded-full bg-slate-800 border border-white/10 flex-shrink-0" />
                    <div className="w-full bg-white/5 border border-white/5 rounded-full px-6 py-2.5 text-slate-500 text-sm hover:bg-white/10 transition-all">
                        What's on your mind? Share your thoughts...
                    </div>
                </div>
            ) : (
                <form onSubmit={handleSubmit} className="space-y-4 pt-2">
                    <input
                        type="text"
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        placeholder="Post Title"
                        required
                        className="w-full bg-transparent border-none outline-none text-xl font-bold placeholder:text-slate-600 text-white"
                    />

                    <textarea
                        value={content}
                        onChange={(e) => setContent(e.target.value)}
                        placeholder="Compose your story..."
                        required
                        rows={4}
                        className="w-full bg-transparent border-none outline-none text-slate-300 placeholder:text-slate-600 resize-none text-sm leading-relaxed"
                    />

                    {/* Tag Area */}
                    <div className="flex flex-wrap gap-2 pt-2">
                        <AnimatePresence>
                            {tags.map(tag => (
                                <motion.span
                                    initial={{ opacity: 0, scale: 0.8 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    exit={{ opacity: 0, scale: 0.8 }}
                                    key={tag}
                                    className="bg-primary/20 text-primary px-3 py-1 rounded-full text-xs font-semibold flex items-center gap-1 border border-primary/20"
                                >
                                    #{tag}
                                    <button type="button" onClick={() => removeTag(tag)}><X className="w-3 h-3 hover:text-white" /></button>
                                </motion.span>
                            ))}
                        </AnimatePresence>
                        <input
                            type="text"
                            value={tagInput}
                            onChange={(e) => setTagInput(e.target.value)}
                            onKeyDown={handleAddTag}
                            placeholder="Add tags..."
                            className="bg-transparent border-none outline-none text-xs text-primary placeholder:text-slate-700 min-w-[100px]"
                        />
                    </div>

                    {error && <p className="text-red-400 text-xs px-1">{error}</p>}

                    <div className="pt-4 border-t border-white/5 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <button type="button" className="p-2 rounded-lg hover:bg-white/5 text-slate-400 transition-all">
                                <Image className="w-5 h-5" />
                            </button>
                            <button type="button" className="p-2 rounded-lg hover:bg-white/5 text-slate-400 transition-all">
                                <Tag className="w-5 h-5" />
                            </button>
                        </div>

                        <div className="flex items-center gap-3">
                            <button
                                type="button"
                                onClick={() => setIsExpanded(false)}
                                className="text-slate-500 text-sm font-medium hover:text-white transition-all"
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                disabled={loading || !content.trim() || !title.trim()}
                                className="btn-primary px-6 py-2 flex items-center gap-2 h-10 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <>Post <Send className="w-4 h-4" /></>}
                            </button>
                        </div>
                    </div>
                </form>
            )}
        </motion.div>
    );
}
