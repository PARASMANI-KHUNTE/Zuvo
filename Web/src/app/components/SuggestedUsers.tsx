"use client";
import React, { useState, useEffect } from "react";
import { Users as UsersIcon, Loader2, UserPlus, UserMinus } from "lucide-react";
import apiClient from "@/lib/api";
import Link from "next/link";

export default function SuggestedUsers() {
    const [users, setUsers] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchSuggested = async () => {
            try {
                const res = await apiClient.get("/search/suggested-users");
                setUsers(res.data.data);
            } catch (err) {
                console.error("Failed to fetch suggested users", err);
            } finally {
                setLoading(false);
            }
        };
        fetchSuggested();
    }, []);

    return (
        <div className="glass-panel p-6 rounded-2xl border border-white/5 space-y-4 sticky top-[420px]">
            <div className="flex items-center gap-2 mb-2">
                <UsersIcon className="w-5 h-5 text-primary" />
                <h2 className="font-bold text-slate-100">Who to follow</h2>
            </div>

            {loading ? (
                <div className="flex items-center justify-center py-6">
                    <Loader2 className="w-5 h-5 text-primary animate-spin" />
                </div>
            ) : users.length > 0 ? (
                users.map((user) => (
                    <div key={user.id} className="flex items-center justify-between group">
                        <Link href={`/profile/${user.username}`} className="flex items-center gap-3 min-w-0">
                            <img src={user.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.username}`} className="w-8 h-8 rounded-full border border-white/10 object-cover" alt={user.name} />
                            <div className="flex flex-col min-w-0">
                                <span className="text-xs font-bold text-slate-200 truncate">{user.name}</span>
                                <span className="text-[10px] text-slate-500">@{user.username}</span>
                            </div>
                        </Link>
                        <button
                            onClick={async () => {
                                try {
                                    await apiClient.post("/interactions/follow", { userId: user.id || user._id });
                                    // Optionally remove from list or update state
                                    setUsers(users.filter(u => (u.id || u._id) !== (user.id || user._id)));
                                } catch (err) {
                                    console.error("Follow failed", err);
                                }
                            }}
                            className="text-[10px] font-bold text-primary hover:text-white px-3 py-1.5 rounded-full border border-primary/30 hover:bg-primary/20 transition-all"
                        >
                            Follow
                        </button>
                    </div>
                ))
            ) : (
                <p className="text-xs text-slate-500">No suggestions yet</p>
            )}
        </div>
    );
}
