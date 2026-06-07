"use client";
import React, { useState, useEffect, useRef } from "react";
import { useRouter, useParams } from "next/navigation";
import { ArrowLeft, Image as ImageIcon, Send, Loader2, X, Save } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import apiClient from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/context/ToastContext";
import Image from "next/image";

const SUGGESTED_TAGS = ["tech", "ai", "web3", "design", "lifestyle", "coding", "art"];

export default function EditPostPage() {
    const router = useRouter();
    const params = useParams();
    const postId = params.id as string;
    const { user, isAuthenticated, loading: authLoading } = useAuth();
    const { toast } = useToast();
    const [title, setTitle] = useState("");
    const [content, setContent] = useState("");
    const [tags, setTags] = useState<string[]>([]);
    const [tagInput, setTagInput] = useState("");
    const [existingMedia, setExistingMedia] = useState<any[]>([]);
    const [newFile, setNewFile] = useState<File | null>(null);
    const [newFilePreview, setNewFilePreview] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (authLoading) return;
        if (!isAuthenticated) {
            router.push("/auth/login");
            return;
        }

        const abortController = new AbortController();

        const loadPost = async () => {
            try {
                const res = await apiClient.get(`/blogs/${postId}`, {
                    signal: abortController.signal
                });
                const post = res.data.data;
                if (post.author?._id !== user?._id && post.author?.id !== user?.id) {
                    toast("You can only edit your own posts", "error");
                    router.push(`/post/${postId}`);
                    return;
                }
                setTitle(post.title || "");
                setContent(post.content || "");
                setTags(post.tags || []);
                setExistingMedia(post.media || []);
            } catch (err: any) {
                if (err?.name === 'CanceledError' || err?.code === 'ERR_CANCELED') return;
                setError(err.response?.data?.message || "Failed to load post");
            } finally {
                setLoading(false);
            }
        };
        loadPost();

        return () => abortController.abort();
    }, [postId, authLoading, isAuthenticated]);

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

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            setNewFile(file);
            const reader = new FileReader();
            reader.onloadend = () => {
                setNewFilePreview(reader.result as string);
            };
            reader.readAsDataURL(file);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!content.trim() || !title.trim()) return;

        setSaving(true);
        setError(null);

        let uploadedMedia: any[] = [];

        try {
            if (newFile) {
                const formData = new FormData();
                formData.append("file", newFile);
                const uploadRes = await apiClient.post("/media/upload", formData, {
                    headers: { "Content-Type": "multipart/form-data" }
                });
                const { url, publicId } = uploadRes.data.data;
                let mediaType = "document";
                if (newFile.type.startsWith("image/")) mediaType = "image";
                else if (newFile.type.startsWith("video/")) mediaType = "video";
                else if (newFile.type.startsWith("audio/")) mediaType = "audio";
                uploadedMedia.push({ url, type: mediaType, publicId });
            }

            const payload: any = { title, content, tags };
            payload.media = [...existingMedia, ...uploadedMedia];

            await apiClient.put(`/blogs/${postId}`, payload);
            toast("Post updated successfully!", "success");
            router.push(`/post/${postId}`);
        } catch (err: any) {
            setError(err.response?.data?.message || "Failed to update post.");
        } finally {
            setSaving(false);
        }
    };

    if (authLoading || loading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4">
                <Loader2 className="w-8 h-8 text-primary animate-spin" />
                <p className="text-slate-500 font-medium">Loading post...</p>
            </div>
        );
    }

    if (error && !title) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4">
                <h2 className="text-2xl font-bold text-white">Post not found</h2>
                <p className="text-slate-500">{error}</p>
                <button onClick={() => router.push("/")} className="btn-primary px-6 py-2">Go Home</button>
            </div>
        );
    }

    return (
        <div className="max-w-3xl mx-auto py-8 px-4">
            <button
                onClick={() => router.back()}
                className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors mb-6 group"
            >
                <ArrowLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
                <span className="font-semibold text-sm">Back</span>
            </button>

            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="glass-panel p-6 md:p-8 rounded-3xl border border-white/10 shadow-2xl"
            >
                <h1 className="text-2xl font-black text-white mb-8 flex items-center gap-3">
                    <Save className="w-6 h-6 text-primary" /> Edit Post
                </h1>

                <form onSubmit={handleSubmit} className="space-y-6">
                    <input
                        type="text"
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        placeholder="Post Title"
                        required
                        className="w-full bg-white/5 border border-white/10 rounded-xl px-5 py-3 text-xl font-bold placeholder:text-slate-600 text-white focus:outline-none focus:ring-2 focus:ring-primary/30"
                    />

                    <textarea
                        value={content}
                        onChange={(e) => setContent(e.target.value)}
                        placeholder="What's on your mind?"
                        required
                        rows={6}
                        className="w-full bg-white/5 border border-white/10 rounded-xl px-5 py-3 text-slate-200 placeholder:text-slate-600 resize-none text-sm leading-relaxed focus:outline-none focus:ring-2 focus:ring-primary/30"
                    />

                    {/* Existing Media */}
                    {existingMedia.length > 0 && (
                        <div className="space-y-2">
                            <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">Current Media</p>
                            <div className="flex flex-wrap gap-3">
                                {existingMedia.map((item, idx) => (
                                    <div key={idx} className="relative rounded-xl overflow-hidden border border-white/10 bg-slate-900 w-24 h-24">
                                        {item.type === "image" ? (
                                            <Image src={item.url} alt="Media" fill unoptimized className="object-cover" />
                                        ) : item.type === "video" ? (
                                            <video src={item.url} className="w-full h-full object-cover" />
                                        ) : (
                                            <div className="flex items-center justify-center w-full h-full text-xs text-slate-400 p-2 text-center">
                                                {item.type}
                                            </div>
                                        )}
                                        <button
                                            type="button"
                                            onClick={() => setExistingMedia(prev => prev.filter((_, i) => i !== idx))}
                                            className="absolute top-1 right-1 p-0.5 bg-black/60 rounded-full text-white hover:bg-black transition-all"
                                        >
                                            <X className="w-3 h-3" />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* New File Preview */}
                    {newFilePreview && (
                        <div className="relative rounded-2xl overflow-hidden border border-white/10 aspect-video group bg-slate-900 flex items-center justify-center">
                            {newFile?.type.startsWith("image/") ? (
                                <Image src={newFilePreview} alt="Preview" fill unoptimized className="object-cover" />
                            ) : newFile?.type.startsWith("video/") ? (
                                <video src={newFilePreview} className="w-full h-full object-cover" controls />
                            ) : (
                                <span className="text-white font-bold uppercase p-10">{newFile?.name}</span>
                            )}
                            <button
                                type="button"
                                onClick={() => { setNewFile(null); setNewFilePreview(null); }}
                                className="absolute top-2 right-2 p-1.5 bg-black/50 backdrop-blur-md rounded-full text-white hover:bg-black/70 transition-all z-10"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        </div>
                    )}

                    {/* Tags */}
                    <div className="space-y-3">
                        <div className="flex flex-wrap gap-2">
                            <AnimatePresence>
                                {tags.map(tag => (
                                    <motion.span
                                        initial={{ opacity: 0, scale: 0.8 }}
                                        animate={{ opacity: 1, scale: 1 }}
                                        exit={{ opacity: 0, scale: 0.8 }}
                                        key={tag}
                                        className="bg-primary/20 text-primary px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-tight flex items-center gap-1 border border-primary/20"
                                    >
                                        #{tag}
                                        <button type="button" onClick={() => removeTag(tag)} className="hover:text-white">
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
                                placeholder="# Add tag..."
                                className="bg-transparent border-none outline-none text-xs text-primary placeholder:text-slate-700 min-w-[120px]"
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

                    {error && (
                        <div className="p-4 rounded-2xl bg-red-500/10 text-red-500 border border-red-500/20 text-sm font-medium">
                            {error}
                        </div>
                    )}

                    <div className="pt-4 border-t border-white/5 flex items-center justify-between">
                        <div>
                            <input type="file" hidden ref={fileInputRef} onChange={handleFileSelect} accept="image/*,video/*,audio/*,.pdf,.doc,.docx" />
                            <button
                                type="button"
                                onClick={() => fileInputRef.current?.click()}
                                className="p-2 rounded-lg hover:bg-white/5 text-slate-400 transition-all flex items-center gap-2"
                            >
                                <ImageIcon className={`w-5 h-5 ${newFile ? 'text-primary' : ''}`} />
                                {newFile && <span className="text-xs text-slate-500 font-medium max-w-[100px] truncate">{newFile.name}</span>}
                            </button>
                        </div>

                        <div className="flex items-center gap-3">
                            <button
                                type="button"
                                onClick={() => router.back()}
                                className="text-slate-500 text-sm font-medium hover:text-white transition-all"
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                disabled={saving || !content.trim() || !title.trim()}
                                className="btn-primary px-6 py-2 flex items-center gap-2 h-10 disabled:opacity-50"
                            >
                                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Save className="w-4 h-4" /> Save Changes</>}
                            </button>
                        </div>
                    </div>
                </form>
            </motion.div>
        </div>
    );
}
