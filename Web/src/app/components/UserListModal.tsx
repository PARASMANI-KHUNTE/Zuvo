"use client";
import React, { useState, useEffect } from "react";
import { X, Search, UserPlus, UserMinus, Loader2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import apiClient from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/context/ToastContext";

interface User {
    id: string;
    _id?: string;
    username: string;
    name: string;
    avatar?: string;
    bio?: string;
    isFollowing: boolean;
}

interface UserListModalProps {
    isOpen: boolean;
    onClose: () => void;
    title: string;
    userId: string;
    type: "followers" | "following";
}

export default function UserListModal({ isOpen, onClose, title, userId, type }: UserListModalProps) {
    const { user: currentUser } = useAuth();
    const { toast } = useToast();
    const [users, setUsers] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");
    const [followingIds, setFollowingIds] = useState<Set<string>>(new Set());

    useEffect(() => {
        if (isOpen) {
            fetchUsers();
        }
    }, [isOpen, userId, type]);

    const fetchUsers = async () => {
        try {
            setLoading(true);
            const res = await apiClient.get(`/interactions/relationships/${userId}/${type}`);
            setUsers(res.data.data);
            // Track following state locally for instant UI updates
            const following = new Set<string>();
            res.data.data.forEach((u: User) => {
                if (u.isFollowing) following.add(u.id || u._id || "");
            });
            setFollowingIds(following);
        } catch (err) {
            console.error(`Failed to fetch ${type}`, err);
            toast(`Failed to load ${type}`, "error");
        } finally {
            setLoading(false);
        }
    };

    const handleToggleFollow = async (targetUser: User) => {
        const targetId = targetUser.id || targetUser._id;
        if (!targetId || targetId === currentUser?.id || targetId === currentUser?._id) return;

        const isCurrentlyFollowing = followingIds.has(targetId);

        // Optimistic UI update for the list
        setFollowingIds(prev => {
            const next = new Set(prev);
            if (isCurrentlyFollowing) next.delete(targetId);
            else next.add(targetId);
            return next;
        });

        try {
            const res = await apiClient.post("/interactions/follow", { userId: targetId });
            if (res.data.success) {
                // Keep the local state in sync with server response just in case
                setFollowingIds(prev => {
                    const next = new Set(prev);
                    if (res.data.isFollowing) next.add(targetId);
                    else next.delete(targetId);
                    return next;
                });
                toast(res.data.isFollowing ? `Followed ${targetUser.username}` : `Unfollowed ${targetUser.username}`, "success");
            }
        } catch (err) {
            console.error("Follow toggle failed", err);
            toast("Action failed. Please try again.", "error");
            // Rollback optimistic update
            setFollowingIds(prev => {
                const next = new Set(prev);
                if (isCurrentlyFollowing) next.add(targetId);
                else next.delete(targetId);
                return next;
            });
        }
    };

    const filteredUsers = users.filter(u =>
        u.username.toLowerCase().includes(search.toLowerCase()) ||
        u.name.toLowerCase().includes(search.toLowerCase())
    );

    const fallbackAvatar = (seed: string) => `https://api.dicebear.com/7.x/avataaars/svg?seed=${seed}`;

    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-[120] flex items-center justify-center p-4">
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="absolute inset-0 bg-black/60 backdrop-blur-md"
                    />

                    <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: 20 }}
                        className="relative w-full max-w-md glass-panel border border-white/10 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[80vh]"
                    >
                        {/* Header */}
                        <div className="p-6 border-b border-white/5 flex items-center justify-between">
                            <h2 className="text-xl font-black text-white tracking-tight">{title}</h2>
                            <button onClick={onClose} className="p-2 hover:bg-white/5 rounded-full transition-colors text-slate-400 hover:text-white">
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        {/* Search */}
                        <div className="p-4 border-b border-white/5">
                            <div className="relative group">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 group-focus-within:text-primary transition-colors" />
                                <input
                                    type="text"
                                    placeholder="Search users..."
                                    value={search}
                                    onChange={(e) => setSearch(e.target.value)}
                                    className="w-full bg-slate-900/50 border border-white/5 rounded-xl py-2 pl-10 pr-4 text-sm focus:outline-none focus:border-primary/50 transition-all text-white"
                                />
                            </div>
                        </div>

                        {/* List */}
                        <div className="flex-1 overflow-y-auto p-2 space-y-1 custom-scrollbar">
                            {loading ? (
                                <div className="flex flex-col items-center justify-center py-20 space-y-4">
                                    <Loader2 className="w-8 h-8 text-primary animate-spin" />
                                    <p className="text-slate-500 text-sm font-medium">Loading users...</p>
                                </div>
                            ) : filteredUsers.length > 0 ? (
                                filteredUsers.map((u) => {
                                    const uid = u.id || u._id || "";
                                    const isSelf = uid === currentUser?.id || uid === currentUser?._id;
                                    const isFollowing = followingIds.has(uid);

                                    return (
                                        <div key={uid} className="flex items-center justify-between p-3 rounded-2xl hover:bg-white/5 transition-colors group">
                                            <div className="flex items-center gap-3">
                                                <div className="w-11 h-11 rounded-xl overflow-hidden bg-slate-800 border border-white/5 shadow-lg group-hover:scale-105 transition-all">
                                                    <img src={u.avatar || fallbackAvatar(u.username)} alt={u.username} className="w-full h-full object-cover" />
                                                </div>
                                                <div className="flex flex-col min-w-0">
                                                    <span className="text-white font-bold text-sm truncate">{u.name}</span>
                                                    <span className="text-slate-500 text-xs font-medium">@{u.username}</span>
                                                </div>
                                            </div>

                                            {!isSelf && (
                                                <button
                                                    onClick={() => handleToggleFollow(u)}
                                                    className={`p-2 rounded-xl transition-all active:scale-95 ${isFollowing
                                                            ? "bg-slate-800 text-slate-400 hover:text-white"
                                                            : "bg-primary/10 text-primary hover:bg-primary/20"
                                                        }`}
                                                    title={isFollowing ? "Unfollow" : "Follow"}
                                                >
                                                    {isFollowing ? <UserMinus className="w-4 h-4" /> : <UserPlus className="w-4 h-4" />}
                                                </button>
                                            )}
                                        </div>
                                    );
                                })
                            ) : (
                                <div className="py-20 text-center space-y-2">
                                    <p className="text-slate-500 font-medium">No users found</p>
                                    <p className="text-slate-700 text-xs">Try searching for someone else.</p>
                                </div>
                            )}
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
}
