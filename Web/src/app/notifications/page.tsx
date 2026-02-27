"use client";
import React, { useState, useEffect } from "react";
import { Heart, UserPlus, MessageCircle, BellRing, Settings, Check, Loader2 } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import apiClient from "@/lib/api";

type NotificationType = "LIKE" | "FOLLOW" | "COMMENT" | "SYSTEM";

interface NotificationItem {
    _id: string;
    type: NotificationType;
    actor?: { name: string; username: string; avatar: string };
    content?: string;
    createdAt: string;
    isRead: boolean;
}

export default function NotificationsPage() {
    const [notifications, setNotifications] = useState<NotificationItem[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchNotifications();
    }, []);

    const fetchNotifications = async () => {
        try {
            const res = await apiClient.get("/notifications");
            if (res.data.success) {
                setNotifications(res.data.data);
            }
        } catch (err) {
            console.error("Failed to fetch notifications", err);
        } finally {
            setLoading(false);
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

    return (
        <div className="w-full max-w-2xl mx-auto pb-20 space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between px-2 pt-4">
                <h1 className="text-2xl font-bold text-white flex items-center gap-3">
                    <BellRing className="w-6 h-6 text-primary" /> Notifications
                </h1>
                <div className="flex items-center gap-2">
                    <button
                        onClick={markAllRead}
                        title="Mark all as read"
                        className="p-2 cursor-pointer hover:bg-white/10 rounded-full transition-colors group"
                    >
                        <Check className="w-5 h-5 text-slate-400 group-hover:text-primary" />
                    </button>
                    <button title="Notification Settings" className="p-2 cursor-pointer hover:bg-white/10 rounded-full transition-colors group">
                        <Settings className="w-5 h-5 text-slate-400 group-hover:text-white" />
                    </button>
                </div>
            </div>

            {/* Notification List */}
            <div className="glass-panel rounded-2xl overflow-hidden divide-y divide-white/5">
                {notifications.length > 0 ? (
                    notifications.map((notif) => (
                        <div
                            key={notif._id}
                            onClick={() => !notif.isRead && markAsRead(notif._id)}
                            className={`p-5 flex items-start gap-4 transition-colors cursor-pointer hover:bg-white/5 ${!notif.isRead ? 'bg-primary/5' : ''}`}
                        >
                            {/* Icon Badge */}
                            <div className="flex-shrink-0 mt-1">
                                {getIcon(notif.type)}
                            </div>

                            {/* Content */}
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-1">
                                    <img
                                        src={notif.actor?.avatar || "https://api.dicebear.com/7.x/avataaars/svg?seed=user"}
                                        alt={notif.actor?.name}
                                        className="w-8 h-8 rounded-full object-cover border border-white/10"
                                    />
                                    <p className="text-sm text-slate-300">
                                        {getMessage(notif.type, notif.actor?.name || "System")}
                                    </p>
                                </div>

                                {notif.content && (
                                    <p className="text-slate-400 text-sm mt-2 line-clamp-2">
                                        {notif.content}
                                    </p>
                                )}

                                <p className="text-xs text-slate-500 font-medium mt-2">
                                    {formatDistanceToNow(new Date(notif.createdAt), { addSuffix: true })}
                                </p>
                            </div>

                            {/* Optional Right Action */}
                            <div className="flex-shrink-0">
                                {!notif.isRead && <div className="w-2 h-2 rounded-full bg-primary mb-2 mx-auto" />}
                                {notif.type === "FOLLOW" && (
                                    <button className="glass-panel px-4 py-1.5 rounded-full text-xs font-bold text-primary hover:text-white hover:bg-white/10 transition-colors">
                                        Follow Back
                                    </button>
                                )}
                            </div>
                        </div>
                    ))
                ) : (
                    <div className="p-12 text-center">
                        <BellRing className="w-12 h-12 text-slate-600 mx-auto mb-4 opacity-20" />
                        <p className="text-slate-400 font-medium">No notifications yet</p>
                        <p className="text-slate-500 text-sm mt-1">When people interact with you, you'll see it here.</p>
                    </div>
                )}
            </div>

            {/* End of list */}
            {notifications.length > 0 && (
                <div className="text-center py-8 text-slate-500 text-sm">
                    You're all caught up!
                </div>
            )}
        </div>
    );
}
