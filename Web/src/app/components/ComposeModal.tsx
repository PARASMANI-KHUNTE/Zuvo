"use client";
import React, { useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Image as ImageIcon, Globe, Loader2 } from "lucide-react";
import { useModals } from "@/context/ModalContext";
import { useAuth } from "@/context/AuthContext";
import apiClient from "@/lib/api";
import Image from "next/image";

const SUGGESTED_TAGS = ["tech", "ai", "engineering", "design", "thoughts", "code"];

export default function ComposeModal() {
    const { activeModal, closeModal } = useModals();
    const { user } = useAuth();
    const [title, setTitle] = useState("");
    const [content, setContent] = useState("");
    const [tags, setTags] = useState<string[]>([]);
    const [tagInput, setTagInput] = useState("");
    const [image, setImage] = useState<File | null>(null);
    const [imagePreview, setImagePreview] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    if (activeModal !== "compose") return null;

    const handleTagKey = (e: React.KeyboardEvent) => {
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

    const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            setImage(file);
            const reader = new FileReader();
            reader.onloadend = () => setImagePreview(reader.result as string);
            reader.readAsDataURL(file);
        }
    };

    const reset = () => {
        setTitle("");
        setContent("");
        setTags([]);
        setTagInput("");
        setImage(null);
        setImagePreview(null);
        setError(null);
    };

    const handleClose = () => {
        reset();
        closeModal();
    };

    const handlePost = async () => {
        if (!title.trim() || !content.trim()) {
            setError("Title and content are required.");
            return;
        }
        setIsLoading(true);
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

            handleClose();
            window.location.reload();
        } catch (err: any) {
            setError(err.response?.data?.message || "Failed to create post.");
        } finally {
            setIsLoading(false);
        }
    };

    const userAvatar = user?.avatar || "https://api.dicebear.com/7.x/avataaars/svg?seed=me";

    return (
        <AnimatePresence>
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    onClick={handleClose}
                    className="absolute inset-0 bg-black/75 backdrop-blur-sm"
                />

                <motion.div
                    initial={{ opacity: 0, scale: 0.96, y: 10 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.96, y: 10 }}
                    className="relative w-full max-w-xl bg-[#111113] border border-white/[0.1] rounded-2xl shadow-2xl overflow-hidden"
                >
                    <div className="p-5 space-y-4">
                        {/* Header */}
                        <div className="flex items-center justify-between border-b border-white/[0.06] pb-3">
                            <span className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
                                New Post
                            </span>
                            <button
                                onClick={handleClose}
                                className="p-1 text-zinc-500 hover:text-white rounded-md transition-colors"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        </div>

                        {/* Author info */}
                        <div className="flex items-center gap-2.5">
                            <div className="w-7 h-7 rounded-full bg-zinc-800 border border-white/10 overflow-hidden relative">
                                <Image src={userAvatar} alt="me" fill unoptimized className="object-cover" />
                            </div>
                            <div>
                                <p className="text-xs font-medium text-white">{user?.name}</p>
                                <p className="text-[11px] text-zinc-500">@{user?.username}</p>
                            </div>
                        </div>

                        <input
                            type="text"
                            value={title}
                            onChange={e => setTitle(e.target.value)}
                            placeholder="Title"
                            className="w-full bg-transparent border-none outline-none text-base font-semibold text-white placeholder:text-zinc-600"
                        />

                        <textarea
                            autoFocus
                            value={content}
                            onChange={(e) => setContent(e.target.value)}
                            placeholder="Write your story..."
                            rows={5}
                            className="w-full bg-transparent border-none outline-none text-xs text-zinc-200 placeholder:text-zinc-600 resize-none leading-relaxed"
                        />

                        {imagePreview && (
                            <div className="relative rounded-lg overflow-hidden border border-white/[0.08] bg-zinc-950 flex items-center justify-center max-h-52">
                                {image?.type.startsWith("image/") ? (
                                    <Image src={imagePreview} alt="Preview" width={800} height={400} unoptimized className="w-full h-auto max-h-52 object-cover" />
                                ) : image?.type.startsWith("video/") ? (
                                    <video src={imagePreview} className="w-full max-h-52 object-cover" controls />
                                ) : image?.type.startsWith("audio/") ? (
                                    <audio src={imagePreview} className="w-full" controls />
                                ) : (
                                    <span className="text-zinc-400 text-xs font-mono p-6">{image?.name}</span>
                                )}
                                <button
                                    onClick={() => { setImage(null); setImagePreview(null); }}
                                    className="absolute top-2 right-2 p-1 bg-black/70 rounded-full text-zinc-300 hover:text-white z-10"
                                >
                                    <X className="w-3.5 h-3.5" />
                                </button>
                            </div>
                        )}

                        {/* Tags */}
                        <div className="space-y-2 pt-2 border-t border-white/[0.06]">
                            <div className="flex flex-wrap gap-1.5 items-center">
                                <AnimatePresence>
                                    {tags.map(tag => (
                                        <motion.span
                                            initial={{ opacity: 0, scale: 0.9 }}
                                            animate={{ opacity: 1, scale: 1 }}
                                            exit={{ opacity: 0, scale: 0.9 }}
                                            key={tag}
                                            className="text-[11px] font-medium bg-zinc-800 text-zinc-200 border border-white/[0.08] px-2 py-0.5 rounded-md inline-flex items-center gap-1"
                                        >
                                            #{tag}
                                            <button onClick={() => setTags(tags.filter(t => t !== tag))} className="text-zinc-500 hover:text-white">
                                                <X className="w-3 h-3" />
                                            </button>
                                        </motion.span>
                                    ))}
                                </AnimatePresence>
                                <input
                                    type="text"
                                    value={tagInput}
                                    onChange={e => setTagInput(e.target.value)}
                                    onKeyDown={handleTagKey}
                                    placeholder="Add tag (Enter)..."
                                    className="bg-transparent border-none outline-none text-[11px] text-zinc-300 placeholder:text-zinc-600 min-w-[90px]"
                                />
                            </div>

                            <div className="flex flex-wrap gap-1.5 items-center text-[11px] text-zinc-500">
                                <span>Suggested:</span>
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

                        {/* Footer */}
                        <div className="flex items-center justify-between border-t border-white/[0.06] pt-3">
                            <input type="file" hidden ref={fileInputRef} onChange={handleImageSelect} accept="image/*,video/*,audio/*,.pdf,.doc,.docx" />
                            <button
                                className="text-zinc-400 hover:text-white transition-colors flex items-center gap-1.5 text-xs"
                                onClick={() => fileInputRef.current?.click()}
                            >
                                <ImageIcon className="w-4 h-4" />
                                <span>{image ? image.name : "Attach"}</span>
                            </button>

                            <div className="flex items-center gap-3">
                                <div className="flex items-center gap-1 text-[11px] text-zinc-500">
                                    <Globe className="w-3 h-3" /> Public
                                </div>
                                <button
                                    onClick={handlePost}
                                    disabled={!content.trim() || !title.trim() || isLoading}
                                    className="btn-primary !text-xs !py-1.5 !px-5"
                                >
                                    {isLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : "Publish"}
                                </button>
                            </div>
                        </div>
                    </div>
                </motion.div>
            </div>
        </AnimatePresence>
    );
}
