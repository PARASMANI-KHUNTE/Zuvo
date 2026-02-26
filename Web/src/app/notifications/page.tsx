"use client";
import React, { useState } from "react";
import { Heart, UserPlus, MessageCircle, BellRing, Settings, Check } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

type NotificationType = "like" | "follow" | "comment" | "system";

interface NotificationItem {
    id: string;
    type: NotificationType;
    actor: { name: string; username: string; avatar: string };
    content?: string;
    postImage?: string;
    timestamp: Date;
    read: boolean;
}

// Dummy Notifications
const DUMMY_NOTIFICATIONS: NotificationItem[] = [
    {
        id: "n1",
        type: "like",
        actor: { name: "Sarah Jenkins", username: "sarah_ui", avatar: "https://i.pravatar.cc/150?u=sarah" },
        postImage: "https://images.unsplash.com/photo-1555066931-4365d14bab8c?q=80&w=2070&auto=format&fit=crop",
        timestamp: new Date(Date.now() - 1000 * 60 * 5),
        read: false
    },
    {
        id: "n2",
        type: "comment",
        actor: { name: "Marco Rossi", username: "dev_marco", avatar: "https://i.pravatar.cc/150?u=marco" },
        content: "This is exactly what I was looking for! The dark mode styling is incredibly polished. Fantastic work.",
        timestamp: new Date(Date.now() - 1000 * 60 * 45),
        read: false
    },
    {
        id: "n3",
        type: "follow",
        actor: { name: "Anna Williams", username: "tech_anna", avatar: "https://i.pravatar.cc/150?u=anna" },
        timestamp: new Date(Date.now() - 1000 * 60 * 60 * 2),
        read: true
    },
    {
        id: "n4",
        type: "like",
        actor: { name: "Design Ninja", username: "ninja_d", avatar: "https://i.pravatar.cc/150?u=ninja" },
        timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24),
        read: true
    },
    {
        id: "n5",
        type: "system",
        actor: { name: "Zuvo Team", username: "zuvo", avatar: "https://i.pravatar.cc/150?u=zuvo" }, // Changed to pravatar
        content: "Welcome to Zuvo! Your premium developer network. Start connecting with others today.",
        timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24 * 7),
        read: true
    }
];

export default function NotificationsPage() {
    const [notifications, setNotifications] = useState(DUMMY_NOTIFICATIONS);

    const markAllRead = () => {
        setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    };

    const getIcon = (type: NotificationType) => {
        switch (type) {
            case "like": return <Heart className="w-5 h-5 text-rose-500 fill-rose-500" />;
            case "follow": return <UserPlus className="w-5 h-5 text-primary" />;
            case "comment": return <MessageCircle className="w-5 h-5 text-blue-400" />;
            case "system": return <BellRing className="w-5 h-5 text-amber-400" />;
        }
    };

    const getMessage = (type: NotificationType, actorName: string) => {
        switch (type) {
            case "like": return <><span className="font-bold text-slate-200">{actorName}</span> liked your post.</>;
            case "follow": return <><span className="font-bold text-slate-200">{actorName}</span> started following you.</>;
            case "comment": return <><span className="font-bold text-slate-200">{actorName}</span> commented on your post.</>;
            case "system": return <><span className="font-bold text-slate-200">{actorName}</span> sent an alert.</>;
        }
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
                {notifications.map((notif) => (
                    <div
                        key={notif.id}
                        className={`p-5 flex items-start gap-4 transition-colors cursor-pointer hover:bg-white/5 ${!notif.read ? 'bg-primary/5' : ''}`}
                    >
                        {/* Icon Badge */}
                        <div className="flex-shrink-0 mt-1">
                            {getIcon(notif.type)}
                        </div>

                        {/* Content */}
                        <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                                <img src={notif.actor.avatar} alt={notif.actor.name} className="w-8 h-8 rounded-full object-cover" />
                                <p className="text-sm text-slate-300">
                                    {getMessage(notif.type, notif.actor.name)}
                                </p>
                            </div>

                            {notif.content && (
                                <p className="text-slate-400 text-sm mt-2 line-clamp-2">
                                    {notif.content}
                                </p>
                            )}

                            <p className="text-xs text-slate-500 font-medium mt-2">
                                {formatDistanceToNow(notif.timestamp, { addSuffix: true })}
                            </p>
                        </div>

                        {/* Optional Right Action (Image preview or follow button) */}
                        <div className="flex-shrink-0">
                            {!notif.read && <div className="w-2 h-2 rounded-full bg-primary mb-2 mx-auto" />}
                            {notif.type === "follow" && (
                                <button className="glass-panel px-4 py-1.5 rounded-full text-xs font-bold text-primary hover:text-white hover:bg-white/10 transition-colors">
                                    Follow Back
                                </button>
                            )}
                            {notif.postImage && (
                                <img src={notif.postImage} alt="Post" className="w-12 h-12 rounded-lg object-cover border border-white/10" />
                            )}
                        </div>
                    </div>
                ))}
            </div>

            {/* End of list */}
            <div className="text-center py-8 text-slate-500 text-sm">
                You're all caught up!
            </div>
        </div>
    );
}
