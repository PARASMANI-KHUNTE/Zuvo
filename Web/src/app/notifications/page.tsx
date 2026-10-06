"use client";
import React, { useState, useEffect } from "react";
import Image from "next/image";
import { Heart, UserPlus, MessageCircle, BellRing, Settings, Check, Loader2 } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import apiClient from "@/lib/api";

type NotificationType = "LIKE" | "FOLLOW" | "COMMENT" | "SYSTEM";

interface NotificationItem {
    _id: string;
    type: NotificationType;
    actor?: { id?: string; name: string; username: string; avatar: string };
    content?: string;
    createdAt: string;
    isRead: boolean;
}

interface FollowRequest {
    id: string;
    followerId: string;
    user: {
        name: string;
        username: string;
        avatar: string;
    };
    createdAt: string;
}

export default function NotificationsPage() {
    const router = useRouter();
    const { isAuthenticated, loading: authLoading } = useAuth();
    const [notifications, setNotifications] = useState<NotificationItem[]>([]);
    const [followRequests, setFollowRequests] = useState<FollowRequest[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [filter, setFilter] = useState<"ALL" | "LIKE" | "FOLLOW" | "COMMENT">("ALL");
    const [followedActors, setFollowedActors] = useState<Record<string, boolean>>({});

    useEffect(() => {
        if (authLoading) return;
        if (!isAuthenticated) {
            router.push("/auth/login");
            return;
        }

        const abortController = new AbortController();

        Promise.all([fetchNotifications(abortController.signal), fetchFollowRequests(abortController.signal)])
            .catch(err => {
                if ((err as any)?.name === 'CanceledError' || (err as any)?.code === 'ERR_CANCELED') return;
                setError(err?.response?.data?.message || "Failed to load notifications")
            })
            .finally(() => setLoading(false));

        return () => abortController.abort();
    }, [authLoading, isAuthenticated, router]);

    const fetchFollowRequests = async (signal?: AbortSignal) => {
        try {
            const res = await apiClient.get("/interactions/relationships/requests", { signal });
            if (res.data.success) {
                setFollowRequests(res.data.data);
            }
        } catch (err: any) {
            if (err?.name === 'CanceledError' || err?.code === 'ERR_CANCELED') return;
            console.error("Failed to fetch follow requests", err);
        }
    };

    const fetchNotifications = async (signal?: AbortSignal) => {
        try {
            const res = await apiClient.get("/notifications", { signal });
            if (res.data.success) {
                setNotifications(res.data.data);
            }
        } catch (err: any) {
            if (err?.name === 'CanceledError' || err?.code === 'ERR_CANCELED') return;
            console.error("Failed to fetch notifications", err);
        }
    };

    const markAllRead = async () => {
        try {
            await apiClient.put("/notifications/read-all");
            setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
        } catch (err) {
            console.error("Failed to mark all as read", err);
        }
    };

    const markAsRead = async (id: string) => {
        try {
            await apiClient.put(`/notifications/${id}/read`);
            setNotifications(prev => prev.map(n => n._id === id ? { ...n, isRead: true } : n));
        } catch (err) {
            console.error("Failed to mark as read", err);
        }
    };

    const handleFollowRequest = async (requestId: string, action: "accept" | "reject") => {
        try {
            const res = await apiClient.put(`/interactions/relationships/requests/${requestId}/${action}`);
            if (res.data.success) {
                setFollowRequests(prev => prev.filter(r => r.id !== requestId));
            }
        } catch (err) {
            console.error(`Failed to ${action} follow request`, err);
        }
    };

    const handleFollowBack = async (notif: NotificationItem) => {
        const actorId = notif.actor?.id;
        if (!actorId || followedActors[actorId]) return;

        setFollowedActors(prev => ({ ...prev, [actorId]: true }));
        try {
            // toggleFollow is idempotent: a second call would unfollow, so we
            // lock the button locally after the first successful follow.
            await apiClient.post("/interactions/follow", { userId: actorId });
        } catch (err) {
            setFollowedActors(prev => ({ ...prev, [actorId]: false }));
            console.error("Failed to follow back", err);
        }
    };

    const FILTERS = [
        { id: "ALL", label: "All" },
        { id: "LIKE", label: "Likes" },
        { id: "FOLLOW", label: "Follows" },
        { id: "COMMENT", label: "Comments" },
    ] as const;

    const visibleNotifications = filter === "ALL"
        ? notifications
        : notifications.filter(notif => notif.type === filter);

    const getIcon = (type: NotificationType) => {
        switch (type) {
            case "LIKE": return <Heart className="w-5 h-5 text-rose-500 fill-rose-500" />;
            case "FOLLOW": return <UserPlus className="w-5 h-5 text-primary" />;
            case "COMMENT": return <MessageCircle className="w-5 h-5 text-blue-400" />;
            case "SYSTEM": return <BellRing className="w-5 h-5 text-amber-400" />;
            default: return <BellRing className="w-5 h-5 text-slate-400" />;
        }
    };

    const getMessage = (type: NotificationType, actorName: string) => {
        switch (type) {
            case "LIKE": return <><span className="font-bold text-slate-200">{actorName}</span> liked your post.</>;
            case "FOLLOW": return <><span className="font-bold text-slate-200">{actorName}</span> started following you.</>;
            case "COMMENT": return <><span className="font-bold text-slate-200">{actorName}</span> commented on your post.</>;
            case "SYSTEM": return <><span className="font-bold text-slate-200">{actorName}</span> sent an alert.</>;
            default: return <><span className="font-bold text-slate-200">{actorName}</span> sent a notification.</>;
        }
    }

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
                <Loader2 className="w-8 h-8 text-primary animate-spin" />
                <p className="text-slate-400 font-medium">Loading notifications...</p>
            </div>
        );
    }

    if (error) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
                <p className="text-red-400 font-medium">{error}</p>
                <button onClick={() => { setLoading(true); setError(null); Promise.all([fetchNotifications(), fetchFollowRequests()]).finally(() => setLoading(false)); }} className="btn-primary px-6 py-2">
                    Retry
                </button>
            </div>
        );
    }

    return (
        <div className="w-full max-w-2xl mx-auto space-y-5">
            {/* Header */}
            <div className="flex items-center justify-between pb-1">
                <h1 className="text-lg font-bold text-white flex items-center gap-2">
                    <BellRing className="w-4 h-4 text-zinc-400" /> Notifications
                </h1>
                <div className="flex items-center gap-1.5">
                    <button
                        onClick={markAllRead}
                        title="Mark all as read"
                        className="p-1.5 hover:bg-white/[0.06] rounded-lg transition-colors text-zinc-400 hover:text-white"
                    >
                        <Check className="w-4 h-4" />
                    </button>
                    <button
                        title="Notification Settings"
                        onClick={() => router.push("/settings?tab=notifications")}
                        className="p-1.5 hover:bg-white/[0.06] rounded-lg transition-colors text-zinc-400 hover:text-white"
                    >
                        <Settings className="w-4 h-4" />
                    </button>
                </div>
            </div>

            {/* Filter Tabs */}
            <div className="flex items-center gap-1.5">
                {FILTERS.map((tab) => (
                    <button
                        key={tab.id}
                        onClick={() => setFilter(tab.id)}
                        className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors ${
                            filter === tab.id
                                ? "bg-white text-zinc-950 font-semibold"
                                : "bg-white/[0.04] text-zinc-400 hover:bg-white/[0.08] hover:text-white"
                        }`}
                    >
                        {tab.label}
                    </button>
                ))}
            </div>

            {/* Follow Requests Section */}
            {followRequests.length > 0 && (
                <div className="space-y-3">
                    <h2 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider px-1">Follow Requests</h2>
                    <div className="bg-[#111113]/80 backdrop-blur-xl border border-white/[0.08] rounded-xl overflow-hidden divide-y divide-white/[0.06]">
                        {followRequests.map((req) => (
                            <div key={req.id} className="p-4 flex items-center justify-between gap-3 hover:bg-white/[0.02] transition-colors">
                                <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-full overflow-hidden bg-zinc-800 border border-white/10 relative flex-shrink-0">
                                        <Image
                                            src={req.user?.avatar || "https://api.dicebear.com/7.x/avataaars/svg?seed=user"}
                                            alt={req.user?.name || "User"}
                                            fill
                                            unoptimized
                                            className="object-cover"
                                        />
                                    </div>
                                    <div className="min-w-0">
                                        <p className="text-xs font-semibold text-white truncate">{req.user?.name}</p>
                                        <p className="text-[11px] text-zinc-500 truncate">@{req.user?.username}</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    <button
                                        onClick={() => handleFollowRequest(req.id, "accept")}
                                        className="btn-primary !text-xs !py-1 !px-3"
                                    >
                                        Accept
                                    </button>
                                    <button
                                        onClick={() => handleFollowRequest(req.id, "reject")}
                                        className="btn-secondary !text-xs !py-1 !px-3"
                                    >
                                        Reject
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Notification List Section */}
            <div className="space-y-3">
                <h2 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider px-1">Recent Notifications</h2>
                <div className="bg-[#111113]/80 backdrop-blur-xl border border-white/[0.08] rounded-xl overflow-hidden divide-y divide-white/[0.06]">
                    {visibleNotifications.length > 0 ? (
                        visibleNotifications.map((notif) => (
                            <div
                                key={notif._id}
                                onClick={() => !notif.isRead && markAsRead(notif._id)}
                                className={`p-4 flex items-start gap-3.5 transition-colors cursor-pointer hover:bg-white/[0.02] ${!notif.isRead ? 'bg-white/[0.03]' : ''}`}
                            >
                                {/* Icon Badge */}
                                <div className="flex-shrink-0 mt-0.5">
                                    {getIcon(notif.type)}
                                </div>

                                {/* Content */}
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 mb-1">
                                        <div className="w-6 h-6 rounded-full overflow-hidden bg-zinc-800 border border-white/10 relative flex-shrink-0">
                                            <Image
                                                src={notif.actor?.avatar || "https://api.dicebear.com/7.x/avataaars/svg?seed=user"}
                                                alt={notif.actor?.name || "User"}
                                                fill
                                                unoptimized
                                                className="object-cover"
                                            />
                                        </div>
                                        <p className="text-xs text-zinc-300">
                                            {getMessage(notif.type, notif.actor?.name || "System")}
                                        </p>
                                    </div>

                                    {notif.content && (
                                        <p className="text-zinc-400 text-xs mt-1 line-clamp-2">
                                            {notif.content}
                                        </p>
                                    )}

                                    <p className="text-[10px] text-zinc-600 font-medium mt-1.5">
                                        {formatDistanceToNow(new Date(notif.createdAt), { addSuffix: true })}
                                    </p>
                                </div>

                                {/* Optional Right Action */}
                                <div className="flex-shrink-0">
                                    {!notif.isRead && <div className="w-1.5 h-1.5 rounded-full bg-white mb-2 mx-auto" />}
                                    {notif.type === "FOLLOW" && notif.actor?.id && (
                                        <button
                                            onClick={() => handleFollowBack(notif)}
                                            disabled={!!followedActors[notif.actor.id]}
                                            className="btn-secondary !text-xs !py-1 !px-3 disabled:opacity-40"
                                        >
                                            {followedActors[notif.actor.id] ? "Following" : "Follow Back"}
                                        </button>
                                    )}
                                </div>
                            </div>
                        ))
                    ) : (
                        <div className="p-12 text-center">
                            <BellRing className="w-10 h-10 text-zinc-600 mx-auto mb-3 opacity-30" />
                            <p className="text-zinc-400 font-medium text-xs">
                                {notifications.length > 0 ? "No notifications in this filter" : "No notifications yet"}
                            </p>
                            <p className="text-zinc-600 text-[11px] mt-1">When people interact with you, you&apos;ll see it here.</p>
                        </div>
                    )}
                </div>
            </div>

            {/* End of list */}
            {notifications.length > 0 && (
                <div className="text-center py-8 text-slate-500 text-sm">
                    You&apos;re all caught up!
                </div>
            )}
        </div>
    );
}
