"use client";
import React, { useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Image as ImageIcon, Tag, Globe, MessageSquare, Send, Loader2 } from "lucide-react";
import { useModals } from "@/context/ModalContext";
import { useAuth } from "@/context/AuthContext";
import apiClient from "@/lib/api";

const SUGGESTED_TAGS = ["tech", "ai", "web3", "design", "lifestyle", "coding", "art"];

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

        let uploadedPublicId: string | null = null;
        let uploadedType: string | null = null;

        try {
            let mediaArray = [];
            if (image) {
                const formData = new FormData();
                formData.append("file", image);
                const uploadRes = await apiClient.post("/media/upload", formData, {
                    headers: { "Content-Type": "multipart/form-data" }
                });

                const { url, publicId } = uploadRes.data.data;
                uploadedPublicId = publicId;

                let mediaType = "document";
                if (image.type.startsWith("image/")) mediaType = "image";
                else if (image.type.startsWith("video/")) mediaType = "video";
                else if (image.type.startsWith("audio/")) mediaType = "audio";

                uploadedType = mediaType;
                mediaArray.push({ url, type: mediaType, publicId });
            }

            try {
                await apiClient.post("/blogs", {
                    title,
                    content,
                    tags,
                    media: mediaArray,
                    status: "published"
                });
            } catch (postErr) {
                if (uploadedPublicId) {
                    await apiClient.delete(`/media/${uploadedPublicId}`, {
                        params: { type: uploadedType === "video" ? "video" : "image" }
                    }).catch(e => console.error("Cleanup failed", e));
                }
                throw postErr;
            }

            reset();
            closeModal();
        } catch (err: any) {
            setError(err.response?.data?.message || "Failed to create post.");
        } finally {
            setIsLoading(false);
        }
    };

    const userAvatar = user?.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user?.username || "me"}`;

    return (
        <AnimatePresence>
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    onClick={handleClose}
                    className="absolute inset-0 bg-slate-950/80 backdrop-blur-md"
                />

                <motion.div
                    initial={{ opacity: 0, scale: 0.9, y: 20 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.9, y: 20 }}
                    className="relative w-full max-w-xl glass-panel border border-white/10 rounded-3xl shadow-2xl overflow-hidden"
                >
                    <div className="p-6 space-y-4">
                        <div className="flex items-center justify-between border-b border-white/5 pb-4">
                            <h2 className="text-xl font-bold text-white flex items-center gap-2">
                                <MessageSquare className="w-5 h-5 text-primary" /> Create New Post
                            </h2>
                            <button
                                onClick={handleClose}
                                className="p-2 hover:bg-white/5 rounded-full text-slate-400 hover:text-white transition-colors"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <div className="flex items-center gap-3">
                            <img src={userAvatar} alt="me" className="w-10 h-10 rounded-full border border-white/10 object-cover" />
                            <div>
                                <p className="text-sm font-bold text-white">{user?.name}</p>
                                <p className="text-xs text-slate-500">@{user?.username} · Public</p>
                            </div>
                        </div>

                        <input
                            type="text"
                            value={title}
                            onChange={e => setTitle(e.target.value)}
                            placeholder="Give your post a title..."
                            className="w-full bg-transparent border-b border-white/10 pb-2 outline-none text-lg font-bold text-white placeholder:text-slate-600 focus:border-primary/40 transition-colors"
                        />

                        <textarea
                            autoFocus
                            value={content}
                            onChange={(e) => setContent(e.target.value)}
                            placeholder="Unleash your thoughts..."
                            className="w-full bg-transparent border-none outline-none text-base text-slate-100 placeholder:text-slate-600 resize-none min-h-[120px] leading-relaxed"
                        />

                        {imagePreview && (
                            <div className="relative rounded-xl overflow-hidden border border-white/10 bg-slate-900 flex items-center justify-center">
                                {image?.type.startsWith("image/") ? (
                                    <img src={imagePreview} alt="Preview" className="w-full max-h-48 object-cover" />
                                ) : image?.type.startsWith("video/") ? (
                                    <video src={imagePreview} className="w-full max-h-48 object-cover" controls />
                                ) : image?.type.startsWith("audio/") ? (
                                    <audio src={imagePreview} className="w-full" controls />
                                ) : (
                                    <span className="text-white font-bold uppercase p-10">{image?.name}</span>
                                )}
                                <button
                                    onClick={() => { setImage(null); setImagePreview(null); }}
                                    className="absolute top-2 right-2 p-1 bg-black/60 rounded-full z-10"
                                >
                                    <X className="w-3 h-3 text-white" />
                                </button>
                            </div>
                        )}

                        <div className="space-y-3">
                            <div className="flex flex-wrap gap-2 items-center">
                                <AnimatePresence>
                                    {tags.map(tag => (
                                        <motion.span
                                            initial={{ opacity: 0, scale: 0.8 }}
                                            animate={{ opacity: 1, scale: 1 }}
                                            exit={{ opacity: 0, scale: 0.8 }}
                                            key={tag}
                                            className="bg-primary/20 text-primary text-[10px] font-bold uppercase tracking-tight px-3 py-1 rounded-full border border-primary/20 flex items-center gap-1 group"
                                        >
                                            #{tag}
                                            <button onClick={() => setTags(tags.filter(t => t !== tag))} className="hover:text-white transition-colors">
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
                                    placeholder="+ Add tag..."
                                    className="bg-transparent border-none outline-none text-xs text-primary placeholder:text-slate-700 min-w-[80px]"
                                />
                            </div>

                            <div className="flex flex-wrap gap-2 items-center">
                                <span className="text-[10px] font-bold text-slate-600 uppercase tracking-widest mr-1">Suggestions:</span>
                                {SUGGESTED_TAGS.map(tag => (
                                    <button
                                        key={tag}
                                        type="button"
                                        onClick={() => toggleTag(tag)}
                                        className={`text-[10px] px-2 py-0.5 rounded-md border transition-all ${tags.includes(tag)
                                                ? "bg-primary border-primary text-white"
                                                : "bg-white/5 border-white/10 text-slate-500 hover:border-white/20 hover:text-slate-300"
                                            }`}
                                    >
                                        {tag}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {error && <p className="text-red-400 text-xs">{error}</p>}

                        <div className="flex items-center gap-4 text-slate-500 border-t border-white/5 pt-4">
                            <input type="file" hidden ref={fileInputRef} onChange={handleImageSelect} accept="image/*,video/*,audio/*,.pdf,.doc,.docx" />
                            <button
                                className="hover:text-primary transition-colors flex items-center gap-1 text-sm font-medium"
                                onClick={() => fileInputRef.current?.click()}
                            >
                                <ImageIcon className={`w-4 h-4 ${image ? 'text-primary' : ''}`} /> {image ? <span className="whitespace-nowrap overflow-hidden text-ellipsis max-w-[100px]">{image.name}</span> : "Media"}
                            </button>

                            <div className="ml-auto flex items-center gap-6">
                                <div className="flex items-center gap-2 text-xs text-slate-600 font-bold border-r border-white/10 pr-6 uppercase tracking-widest leading-none">
                                    <Globe className="w-3 h-3" /> Public
                                </div>
                                <button
                                    onClick={handlePost}
                                    disabled={!content.trim() || !title.trim() || isLoading}
                                    className="btn-primary px-8 py-2.5 rounded-full font-bold flex items-center gap-2 disabled:opacity-50 disabled:grayscale transition-all shadow-neon-blue h-11"
                                >
                                    {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <>Post <Send className="w-4 h-4" /></>}
                                </button>
                            </div>
                        </div>
                    </div>
                </motion.div>
            </div>
        </AnimatePresence>
    );
}
