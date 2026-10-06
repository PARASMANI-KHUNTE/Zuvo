"use client";
import React, { useState, useEffect } from "react";
import { TrendingUp, Hash, Loader2 } from "lucide-react";
import apiClient from "@/lib/api";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function TrendingSidebar() {
    const router = useRouter();
    const [trends, setTrends] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const abortController = new AbortController();

        const fetchTrends = async () => {
            try {
                const res = await apiClient.get("/search/trending", {
                    signal: abortController.signal
                });
                setTrends(res.data.data);
            } catch (err: any) {
                if (err?.name === 'CanceledError' || err?.code === 'ERR_CANCELED') return;
                console.error("Failed to fetch trends", err);
            } finally {
                setLoading(false);
            }
        };
        fetchTrends();

        return () => abortController.abort();
    }, []);

    return (
        <div className="bg-[#111113]/80 backdrop-blur-xl border border-white/[0.08] rounded-xl p-4 space-y-3">
            <div className="flex items-center gap-2">
                <TrendingUp className="w-3.5 h-3.5 text-zinc-400" />
                <h3 className="text-xs font-semibold text-zinc-300 uppercase tracking-wider">Trending</h3>
            </div>

            {loading ? (
                <div className="flex items-center justify-center py-4">
                    <Loader2 className="w-4 h-4 text-zinc-500 animate-spin" />
                </div>
            ) : trends.length > 0 ? (
                <div className="space-y-2.5">
                    {trends.map((item) => (
                        <div
                            key={item.id}
                            className="group cursor-pointer py-1"
                            onClick={() => router.push(`/search?q=${encodeURIComponent("#" + item.tag)}`)}
                        >
                            <p className="text-xs font-medium text-zinc-200 group-hover:text-white transition-colors flex items-center gap-1">
                                <Hash className="w-3 h-3 text-zinc-500 group-hover:text-zinc-300" />
                                <span>{item.tag}</span>
                            </p>
                            <span className="text-[11px] text-zinc-500">{item.postsCount} interactions</span>
                        </div>
                    ))}
                </div>
            ) : (
                <p className="text-xs text-zinc-500 py-1">Nothing trending yet</p>
            )}

            <div className="pt-1 border-t border-white/[0.06]">
                <Link href="/explore" className="text-xs text-zinc-400 hover:text-white transition-colors block">
                    Explore all &rarr;
                </Link>
            </div>
        </div>
    );
}
