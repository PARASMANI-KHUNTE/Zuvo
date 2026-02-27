"use client";
import React, { useState, useRef } from "react";
import { Image as ImageIcon, Send, Loader2, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import apiClient from "@/lib/api";
import { useAuth } from "@/context/AuthContext";

interface CreatePostProps {
    onSuccess?: () => void;
}

export default function CreatePost({ onSuccess }: CreatePostProps) {
    const { user } = useAuth();
    const [isExpanded, setIsExpanded] = useState(false);
    const [title, setTitle] = useState("");
    const [content, setContent] = useState("");
    const [tags, setTags] = useState<string[]>([]);
    const [tagInput, setTagInput] = useState("");
    const [image, setImage] = useState<File | null>(null);
    const [imagePreview, setImagePreview] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

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

    const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            setImage(file);
            const reader = new FileReader();
            reader.onloadend = () => {
                setImagePreview(reader.result as string);
            };
            reader.readAsDataURL(file);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!content.trim() || !title.trim()) return;

        setLoading(true);
        setError(null);

        try {
            let imageUrl = "no-photo.jpg";

            // 1. Upload image if exists
            if (image) {
                const formData = new FormData();
                formData.append("file", image);
                const uploadRes = await apiClient.post("/media/upload", formData, {
                    headers: { "Content-Type": "multipart/form-data" }
                });
                imageUrl = uploadRes.data.data.url;
            }

            // 2. Create post
            await apiClient.post("/blogs", {
                title,
                content,
                tags,
                image: imageUrl,
                status: "published"
            });

            // Reset form
            setTitle("");
            setContent("");
            setTags([]);
            setImage(null);
            setImagePreview(null);
            setIsExpanded(false);

            if (onSuccess) onSuccess();
        } catch (err: any) {
            setError(err.response?.data?.message || "Failed to create post. Are you logged in?");
        } finally {
            setLoading(false);
        }
    };

    const userAvatar = user?.avatar || "https://api.dicebear.com/7.x/avataaars/svg?seed=me";

    return (
        <motion.div
            layout
            className="glass-panel p-4 w-full space-y-4 shadow-xl border border-white/5"
        >
            {!isExpanded ? (
                <div
                    onClick={() => setIsExpanded(true)}
                    className="flex items-center gap-4 cursor-text"
                >
                    <div className="w-10 h-10 rounded-full bg-slate-800 border border-white/10 flex-shrink-0 overflow-hidden">
                        <img src={userAvatar} alt="user" className="w-full h-full object-cover" />
                    </div>
                    <div className="w-full bg-white/5 border border-white/5 rounded-full px-6 py-2.5 text-slate-500 text-sm hover:bg-white/10 transition-all">
                        What's on your mind? Share your story...
                    </div>
                </div>
            ) : (
                <form onSubmit={handleSubmit} className="space-y-4 pt-2">
                    <div className="flex items-center gap-2 mb-2 px-1">
                        <img src={userAvatar} className="w-6 h-6 rounded-full object-cover" />
                        <span className="text-xs font-bold text-slate-400">{user?.name}</span>
                    </div>

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

                    {imagePreview && (
                        <div className="relative rounded-2xl overflow-hidden border border-white/10 aspect-video group">
                            <img src={imagePreview} alt="Preview" className="w-full h-full object-cover" />
                            <button
                                type="button"
                                onClick={() => { setImage(null); setImagePreview(null); }}
                                className="absolute top-2 right-2 p-1.5 bg-black/50 backdrop-blur-md rounded-full text-white hover:bg-black/70 transition-all"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        </div>
                    )}

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
                            <input
                                type="file"
                                hidden
                                ref={fileInputRef}
                                onChange={handleImageSelect}
                                accept="image/*"
                            />
                            <button
                                type="button"
                                onClick={() => fileInputRef.current?.click()}
                                className="p-2 rounded-lg hover:bg-white/5 text-slate-400 transition-all flex items-center gap-2 group"
                            >
                                <ImageIcon className={`w-5 h-5 ${image ? 'text-primary' : ''}`} />
                                {image && <span className="text-xs text-slate-500 font-medium">Image selected</span>}
                            </button>
                        </div>

                        <div className="flex items-center gap-3">
                            <button
                                type="button"
                                onClick={() => {
                                    setIsExpanded(false);
                                    setImage(null);
                                    setImagePreview(null);
                                }}
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
