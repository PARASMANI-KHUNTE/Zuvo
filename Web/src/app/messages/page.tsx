"use client";
import React, { useState } from "react";
import { Search, Send, Image as ImageIcon, Phone, Video, MoreVertical, CheckCheck } from "lucide-react";
import { format } from "date-fns";

// Dummy Data
const CONVERSATIONS = [
    {
        id: "c1",
        user: { name: "Sarah Jenkins", username: "sarah_ui", avatar: "https://i.pravatar.cc/150?u=sarah" },
        lastMessage: "That sounds like a great plan. Let's sync tomorrow!",
        timestamp: new Date(Date.now() - 1000 * 60 * 12),
        unreadCount: 2,
        online: true
    },
    {
        id: "c2",
        user: { name: "Marco Rossi", username: "dev_marco", avatar: "https://i.pravatar.cc/150?u=marco" },
        lastMessage: "Did you push the latest commit?",
        timestamp: new Date(Date.now() - 1000 * 60 * 60 * 2),
        unreadCount: 0,
        online: false
    },
    {
        id: "c3",
        user: { name: "Anna Williams", username: "tech_anna", avatar: "https://i.pravatar.cc/150?u=anna" },
        lastMessage: "Sent you the figma link.",
        timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24),
        unreadCount: 0,
        online: true
    }
];

const CURRENT_MESSAGES = [
    {
        id: "m1",
        senderId: "sarah_ui",
        content: "Hey, are we still on for the design review tomorrow?",
        timestamp: new Date(Date.now() - 1000 * 60 * 30),
        status: "read"
    },
    {
        id: "m2",
        senderId: "me",
        content: "Yes absolutely. I've finished the glassmorphism updates on the dashboard.",
        timestamp: new Date(Date.now() - 1000 * 60 * 25),
        status: "read"
    },
    {
        id: "m3",
        senderId: "sarah_ui",
        content: "Awesome! I'd love to see how the neon accents turned out.",
        timestamp: new Date(Date.now() - 1000 * 60 * 15),
        status: "read"
    },
    {
        id: "m4",
        senderId: "sarah_ui",
        content: "That sounds like a great plan. Let's sync tomorrow!",
        timestamp: new Date(Date.now() - 1000 * 60 * 12),
        status: "delivered"
    },
];

export default function MessagesPage() {
    const [activeChat, setActiveChat] = useState(CONVERSATIONS[0]);
    const [messageInput, setMessageInput] = useState("");

    return (
        <div className="flex h-[calc(100vh-80px)] w-full max-w-6xl mx-auto rounded-3xl overflow-hidden glass-panel border border-white/10 mt-4">

            {/* Left Sidebar (Conversations List) */}
            <div className="w-80 border-r border-white/5 flex flex-col bg-[#0f172a]/40">
                {/* Header */}
                <div className="p-4 border-b border-white/5">
                    <h2 className="text-xl font-bold text-white mb-4">Messages</h2>
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <input
                            type="text"
                            placeholder="Search chats..."
                            className="w-full bg-white/5 border border-white/10 rounded-xl py-2 pl-10 pr-4 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-primary/50"
                        />
                    </div>
                </div>

                {/* List */}
                <div className="flex-1 overflow-y-auto w-full custom-scrollbar">
                    {CONVERSATIONS.map((chat) => (
                        <div
                            key={chat.id}
                            onClick={() => setActiveChat(chat)}
                            className={`p-4 flex items-center gap-3 cursor-pointer transition-colors border-b border-white/5 w-full ${activeChat?.id === chat.id ? 'bg-primary/10 border-l-2 border-l-primary' : 'hover:bg-white/5 border-l-2 border-l-transparent'
                                }`}
                        >
                            <div className="relative flex-shrink-0">
                                <img src={chat.user.avatar} alt={chat.user.name} className="w-12 h-12 rounded-full object-cover" />
                                {chat.online && (
                                    <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-[#020617] rounded-full" />
                                )}
                            </div>
                            <div className="flex-1 min-w-0">
                                <div className="flex justify-between items-baseline mb-1">
                                    <h3 className="font-semibold text-slate-200 text-sm truncate">{chat.user.name}</h3>
                                    <span className="text-xs text-slate-500 flex-shrink-0">{format(chat.timestamp, "h:mm a")}</span>
                                </div>
                                <div className="flex justify-between items-center">
                                    <p className={`text-xs truncate ${chat.unreadCount > 0 ? "text-white font-medium" : "text-slate-400"}`}>
                                        {chat.lastMessage}
                                    </p>
                                    {chat.unreadCount > 0 && (
                                        <div className="w-5 h-5 rounded-full bg-primary flex items-center justify-center text-[10px] font-bold text-white flex-shrink-0">
                                            {chat.unreadCount}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Right Panel (Active Chat Window) */}
            <div className="flex-1 flex flex-col bg-[#020617]/40 relative">

                {/* Chat Header */}
                <div className="p-4 border-b border-white/5 flex justify-between items-center bg-[#0f172a]/20 backdrop-blur-md absolute top-0 w-full z-10">
                    <div className="flex items-center gap-3">
                        <img src={activeChat.user.avatar} className="w-10 h-10 rounded-full object-cover" alt="Avatar" />
                        <div>
                            <h2 className="font-bold text-slate-100">{activeChat.user.name}</h2>
                            <p className="text-xs text-primary">{activeChat.online ? "Online" : "Offline"}</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-4 text-slate-400">
                        <Phone className="w-5 h-5 cursor-pointer hover:text-white transition-colors" />
                        <Video className="w-5 h-5 cursor-pointer hover:text-white transition-colors" />
                        <MoreVertical className="w-5 h-5 cursor-pointer hover:text-white transition-colors" />
                    </div>
                </div>

                {/* Messages Timeline */}
                <div className="flex-1 overflow-y-auto p-6 space-y-4 pt-24 custom-scrollbar">
                    {CURRENT_MESSAGES.map((msg) => {
                        const isMe = msg.senderId === "me";
                        return (
                            <div key={msg.id} className={`flex ${isMe ? "justify-end" : "justify-start"}`}>
                                <div className={`max-w-[70%] ${isMe ? "order-2" : ""}`}>
                                    <div
                                        className={`p-3 rounded-2xl text-sm leading-relaxed shadow-lg ${isMe
                                                ? "bg-primary text-white rounded-tr-sm"
                                                : "glass-panel bg-[#1e293b]/80 text-slate-200 rounded-tl-sm border-white/5"
                                            }`}
                                    >
                                        {msg.content}
                                    </div>
                                    <div className={`text-[10px] text-slate-500 mt-1 flex items-center gap-1 ${isMe ? "justify-end" : "justify-start"}`}>
                                        {format(msg.timestamp, "h:mm a")}
                                        {isMe && msg.status === "read" && <CheckCheck className="w-3 h-3 text-primary ml-1" />}
                                        {isMe && msg.status === "delivered" && <CheckCheck className="w-3 h-3 text-slate-500 ml-1" />}
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>

                {/* Input Area */}
                <div className="p-4 bg-[#0f172a]/40 border-t border-white/5 backdrop-blur-md">
                    <div className="flex items-center gap-3 relative">
                        <button className="p-2 text-slate-400 hover:text-primary transition-colors glass-panel rounded-full border-white/5">
                            <ImageIcon className="w-5 h-5" />
                        </button>
                        <input
                            type="text"
                            value={messageInput}
                            onChange={(e) => setMessageInput(e.target.value)}
                            placeholder="Type a message..."
                            className="flex-1 bg-white/5 border border-white/10 rounded-full py-3 px-6 text-sm text-white focus:outline-none focus:ring-1 focus:ring-primary/50 placeholder-slate-500"
                        />
                        <button className={`p-3 rounded-full flex items-center justify-center transition-all ${messageInput.trim() ? "bg-primary text-white shadow-[0_0_15px_rgba(235,54,120,0.5)]" : "glass-panel text-slate-400 border-white/5"
                            }`}>
                            <Send className="w-4 h-4" />
                        </button>
                    </div>
                </div>

            </div>
        </div>
    );
}
