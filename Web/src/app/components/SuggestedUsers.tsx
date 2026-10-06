"use client";
import React, { useState, useEffect } from "react";
import { Users as UsersIcon, Loader2 } from "lucide-react";
import apiClient from "@/lib/api";
import Link from "next/link";
import Image from "next/image";

export default function SuggestedUsers() {
    const [users, setUsers] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const abortController = new AbortController();

        const fetchSuggested = async () => {
            try {
                const res = await apiClient.get("/search/suggested-users", {
                    signal: abortController.signal
                });
                setUsers(res.data.data);
            } catch (err: any) {
                if (err?.name === 'CanceledError' || err?.code === 'ERR_CANCELED') return;
                console.error("Failed to fetch suggested users", err);
            } finally {
                setLoading(false);
            }
        };
        fetchSuggested();

        return () => abortController.abort();
    }, []);

    return (
        <div className="bg-[#111113]/80 backdrop-blur-xl border border-white/[0.08] rounded-xl p-4 space-y-3">
            <div className="flex items-center gap-2">
                <UsersIcon className="w-3.5 h-3.5 text-zinc-400" />
                <h3 className="text-xs font-semibold text-zinc-300 uppercase tracking-wider">Suggested</h3>
            </div>

            {loading ? (
                <div className="flex items-center justify-center py-4">
                    <Loader2 className="w-4 h-4 text-zinc-500 animate-spin" />
                </div>
            ) : users.length > 0 ? (
                <div className="space-y-3">
                    {users.map((user) => (
                        <div key={user.id} className="flex items-center justify-between gap-2 group">
                            <Link href={`/profile/${user.username}`} className="flex items-center gap-2.5 min-w-0 flex-1">
                                <div className="w-7 h-7 rounded-full bg-zinc-800 border border-white/10 overflow-hidden relative flex-shrink-0">
                                    <Image
                                        src={user.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.username}`}
                                        fill
                                        unoptimized
                                        className="object-cover"
                                        alt={user.name}
                                    />
                                </div>
                                <div className="flex flex-col min-w-0">
                                    <span className="text-xs font-medium text-zinc-200 group-hover:text-white truncate transition-colors">{user.name}</span>
                                    <span className="text-[11px] text-zinc-500 truncate">@{user.username}</span>
                                </div>
                            </Link>
                            <button
                                onClick={async () => {
                                    try {
                                        await apiClient.post("/interactions/follow", { userId: user.id || user._id });
                                        setUsers(users.filter(u => (u.id || u._id) !== (user.id || user._id)));
                                    } catch (err) {
                                        console.error("Follow failed", err);
                                    }
                                }}
                                className="text-[11px] font-medium bg-white text-zinc-950 hover:bg-zinc-200 px-2.5 py-1 rounded-full transition-colors flex-shrink-0"
                            >
                                Follow
                            </button>
                        </div>
                    ))}
                </div>
            ) : (
                <p className="text-xs text-zinc-500 py-1">No suggestions available</p>
            )}
        </div>
    );
}
