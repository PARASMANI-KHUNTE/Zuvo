"use client";
import React, { useState, useRef } from "react";
import { Image as ImageIcon, Loader2, X, Plus } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import apiClient from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import Image from "next/image";

interface CreatePostProps {
    onSuccess?: () => void;
}

const SUGGESTED_TAGS = ["tech", "engineering", "ai", "design", "thoughts", "code"];

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
            const cleanTag = tagInput.trim().toLowerCase().replace(/^#/, "");
            if (cleanTag && !tags.includes(cleanTag)) {
                setTags([...tags, cleanTag]);
            }
            setTagInput("");
        }
    };

    const toggleTag = (tag: string) => {
        if (tags.includes(tag)) {
            setTags(tags.filter(t => t !== tag));
        } else {
            setTags([...tags, tag]);
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
            let mediaArray = [];

            if (image) {
                const formData = new FormData();
                formData.append("file", image);
                const uploadRes = await apiClient.post("/media/upload", formData, {
                    headers: { "Content-Type": "multipart/form-data" }
                });

                const { url, publicId } = uploadRes.data.data;

                let mediaType = "document";
                if (image.type.startsWith("image/")) mediaType = "image";
                else if (image.type.startsWith("video/")) mediaType = "video";
                else if (image.type.startsWith("audio/")) mediaType = "audio";

                mediaArray.push({ url, type: mediaType, publicId });
            }

            await apiClient.post("/blogs", {
                title,
                content,
                tags,
                media: mediaArray,
                image: mediaArray[0]?.url || "no-photo.jpg",
                status: "published"
            });

            setTitle("");
            setContent("");
            setTags([]);
            setImage(null);
            setImagePreview(null);
            setIsExpanded(false);
            if (onSuccess) onSuccess();
        } catch (err: any) {
            setError(err.response?.data?.message || "Failed to create post.");
        } finally {
            setLoading(false);
        }
    };

    const userAvatar = user?.avatar || "https://api.dicebear.com/7.x/avataaars/svg?seed=me";

    return (
        <div className="bg-[#111113]/80 backdrop-blur-xl border border-white/[0.08] hover:border-white/[0.14] rounded-xl p-4 transition-all">
            {!isExpanded ? (
                <div onClick={() => setIsExpanded(true)} className="flex items-center gap-3 cursor-text">
                    <div className="w-8 h-8 rounded-full bg-zinc-800 border border-white/10 flex-shrink-0 overflow-hidden relative">
                        <Image src={userAvatar} alt="user" fill unoptimized className="object-cover" />
                    </div>
                    <div className="w-full bg-zinc-900/60 border border-white/[0.06] rounded-lg px-4 py-2 text-zinc-500 text-xs hover:border-white/[0.12] transition-colors">
                        Share an update, insight, or note...
                    </div>
                </div>
            ) : (
                <form onSubmit={handleSubmit} className="space-y-3.5 pt-1">
                    <div className="flex items-center gap-2 px-0.5">
                        <div className="w-5 h-5 rounded-full overflow-hidden bg-zinc-800 border border-white/10 relative">
                            <Image src={userAvatar} alt="avatar" fill unoptimized className="object-cover" />
                        </div>
                        <span className="text-xs font-medium text-zinc-400">{user?.name}</span>
                    </div>

                    <input
                        type="text"
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        placeholder="Title"
                        required
                        className="w-full bg-transparent border-none outline-none text-base font-semibold placeholder:text-zinc-600 text-white"
                    />

                    <textarea
                        value={content}
                        onChange={(e) => setContent(e.target.value)}
                        placeholder="What's happening?"
                        required
                        rows={3}
                        className="w-full bg-transparent border-none outline-none text-zinc-300 placeholder:text-zinc-600 resize-none text-xs leading-relaxed"
                    />

                    {imagePreview && (
                        <div className="relative rounded-lg overflow-hidden border border-white/[0.08] aspect-video group bg-zinc-950 flex items-center justify-center max-h-[300px]">
                            {image?.type.startsWith("image/") ? (
                                <Image src={imagePreview} alt="Preview" fill unoptimized className="object-cover" />
                            ) : image?.type.startsWith("video/") ? (
                                <video src={imagePreview} className="w-full h-full object-cover" controls />
                            ) : image?.type.startsWith("audio/") ? (
                                <audio src={imagePreview} className="w-full" controls />
                            ) : (
                                <span className="text-zinc-400 text-xs font-mono p-4">{image?.name}</span>
                            )}
                            <button
                                type="button"
                                onClick={() => { setImage(null); setImagePreview(null); }}
                                className="absolute top-2 right-2 p-1.5 bg-black/60 hover:bg-black/80 rounded-full text-zinc-300 hover:text-white transition-all z-10"
                            >
                                <X className="w-3.5 h-3.5" />
                            </button>
                        </div>
                    )}

                    {/* Tags */}
                    <div className="space-y-2 pt-1 border-t border-white/[0.06]">
                        <div className="flex flex-wrap gap-1.5 items-center">
                            <AnimatePresence>
                                {tags.map(tag => (
                                    <motion.span
                                        initial={{ opacity: 0, scale: 0.9 }}
                                        animate={{ opacity: 1, scale: 1 }}
                                        exit={{ opacity: 0, scale: 0.9 }}
                                        key={tag}
                                        className="inline-flex items-center gap-1 text-[11px] font-medium bg-zinc-800/80 text-zinc-200 border border-white/[0.08] px-2 py-0.5 rounded-md"
                                    >
                                        #{tag}
                                        <button type="button" onClick={() => removeTag(tag)} className="text-zinc-500 hover:text-zinc-200">
                                            <X className="w-3 h-3" />
                                        </button>
                                    </motion.span>
                                ))}
                            </AnimatePresence>
                            <input
                                type="text"
                                value={tagInput}
                                onChange={(e) => setTagInput(e.target.value)}
                                onKeyDown={handleAddTag}
                                placeholder="Add tag (Enter)..."
                                className="bg-transparent border-none outline-none text-[11px] text-zinc-300 placeholder:text-zinc-600 min-w-[100px]"
                            />
                        </div>

                        <div className="flex flex-wrap gap-1.5 items-center text-[11px] text-zinc-500">
                            <span>Suggestions:</span>
                            {SUGGESTED_TAGS.map(tag => (
                                <button
                                    key={tag}
                                    type="button"
                                    onClick={() => toggleTag(tag)}
                                    className={`px-2 py-0.5 rounded text-[10px] font-medium transition-colors ${
                                        tags.includes(tag)
                                            ? "bg-white text-zinc-950"
                                            : "bg-white/[0.04] hover:bg-white/[0.08] text-zinc-400"
                                    }`}
                                >
                                    #{tag}
                                </button>
                            ))}
                        </div>
                    </div>

                    {error && <p className="text-rose-400 text-xs">{error}</p>}

                    <div className="pt-2.5 border-t border-white/[0.06] flex items-center justify-between">
                        <div>
                            <input type="file" hidden ref={fileInputRef} onChange={handleImageSelect} accept="image/*,video/*,audio/*,.pdf,.doc,.docx" />
                            <button
                                type="button"
                                onClick={() => fileInputRef.current?.click()}
                                className="p-1.5 rounded-md hover:bg-white/[0.06] text-zinc-400 hover:text-zinc-200 transition-colors flex items-center gap-1.5 text-xs"
                            >
                                <ImageIcon className="w-4 h-4" />
                                <span className="text-[11px]">Media</span>
                            </button>
                        </div>

                        <div className="flex items-center gap-2">
                            <button
                                type="button"
                                onClick={() => { setIsExpanded(false); setImage(null); setImagePreview(null); }}
                                className="text-zinc-400 hover:text-zinc-200 text-xs px-2.5 py-1 rounded transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                disabled={loading || !content.trim() || !title.trim()}
                                className="btn-primary !text-xs !py-1.5 !px-4"
                            >
                                {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : "Publish"}
                            </button>
                        </div>
                    </div>
                </form>
            )}
        </div>
    );
}
