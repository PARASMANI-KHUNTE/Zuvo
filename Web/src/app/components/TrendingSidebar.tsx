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
        const fetchTrends = async () => {
            try {
                const res = await apiClient.get("/search/trending");
                setTrends(res.data.data);
            } catch (err) {
                console.error("Failed to fetch trends", err);
            } finally {
                setLoading(false);
            }
        };
        fetchTrends();
    }, []);

    return (
        <div className="glass-panel p-6 rounded-2xl border border-white/5 space-y-4 sticky top-28">
            <div className="flex items-center gap-2 mb-2">
                <TrendingUp className="w-5 h-5 text-primary" />
                <h2 className="font-bold text-slate-100">Trending Now</h2>
            </div>

            {loading ? (
                <div className="flex items-center justify-center py-6">
                    <Loader2 className="w-5 h-5 text-primary animate-spin" />
                </div>
            ) : trends.length > 0 ? (
                trends.map((item) => (
                    <div
                        key={item.id}
                        className="group cursor-pointer"
                        onClick={() => router.push(`/search?q=${encodeURIComponent("#" + item.tag)}`)}
                    >
                        <p className="text-sm font-bold text-slate-200 group-hover:text-primary transition-colors flex items-center gap-1">
                            <Hash className="w-3.5 h-3.5" />{item.tag}
                        </p>
                        <span className="text-xs text-slate-500">{item.postsCount} interactions</span>
                    </div>
                ))
            ) : (
                <p className="text-xs text-slate-500">Nothing trending yet</p>
            )}

            <Link href="/explore" className="block w-full text-xs font-bold text-primary text-left hover:underline">Show more</Link>
        </div>
    );
}
