"use client";
import React, { useState, useEffect, useRef } from "react";
import { Search, Send, Image as ImageIcon, Phone, Video, MoreVertical, CheckCheck, Loader2, Clock } from "lucide-react";
import { format, isValid } from "date-fns";
import { useChat } from "@/hooks/useChat";
import { useAuth } from "@/context/AuthContext";
import { useSearchParams } from "next/navigation";
import apiClient from "@/lib/api";
import { useDebouncedCallback } from "@/hooks/useDebouncedCallback";
import { useToast } from "@/context/ToastContext";

export default function MessagesPage() {
    const { user } = useAuth();
    const searchParams = useSearchParams();
    const [selectedId, setSelectedId] = useState<string | null>(null);
    const [messageInput, setMessageInput] = useState("");
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const { toast } = useToast();

    const {
        messages,
        conversations,
        loading,
        isTyping,
        sendMessage,
        sendTyping
    } = useChat(selectedId || undefined);

    const activeChat = conversations.find(c => c._id === selectedId);

    useEffect(() => {
        if (conversations.length > 0 && !selectedId) {
            setSelectedId(conversations[0]._id);
        }
    }, [conversations, selectedId]);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages, isTyping]);

    // Handle initial user from query params
    useEffect(() => {
        const targetUserId = searchParams.get("user");
        if (targetUserId) {
            const ensureConversation = async () => {
                try {
                    const res = await apiClient.get(`/chat/conversation/user/${targetUserId}`);
                    if (res.data.success) {
                        setSelectedId(res.data.data._id);
                    }
                } catch (err) {
                    console.error("Failed to ensure conversation", err);
                }
            };
            ensureConversation();
        }
    }, [searchParams]);

    const handleSend = () => {
        if (!messageInput.trim()) return;
        sendMessage(messageInput);
        setMessageInput("");
        sendTyping(false);
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') handleSend();
    };

    const debouncedSendTyping = useDebouncedCallback((val: boolean) => {
        sendTyping(val);
    }, 500);

    const onTyping = (val: string) => {
        setMessageInput(val);
        debouncedSendTyping(val.length > 0);
    };

    const getOtherParticipant = (participants: any[]) => {
        return participants.find(p => (p.id || p._id) !== (user?.id || user?._id)) || participants[0];
    };

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
                    {conversations.length > 0 ? (
                        conversations.map((chat) => {
                            const other = getOtherParticipant(chat.participants);
                            return (
                                <div
                                    key={chat._id}
                                    role="button"
                                    tabIndex={0}
                                    aria-pressed={selectedId === chat._id}
                                    onClick={() => setSelectedId(chat._id)}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter' || e.key === ' ') {
                                            e.preventDefault();
                                            setSelectedId(chat._id);
                                        }
                                    }}
                                    className={`p-4 flex items-center gap-3 cursor-pointer transition-colors border-b border-white/5 w-full ${selectedId === chat._id ? 'bg-primary/10 border-l-2 border-l-primary' : 'hover:bg-white/5 border-l-2 border-l-transparent'
                                        }`}
                                >
                                    <div className="relative flex-shrink-0">
                                        <img src={other.avatar || "https://api.dicebear.com/7.x/avataaars/svg?seed=user"} alt={other.name} className="w-12 h-12 rounded-full object-cover border border-white/10" />
                                        {/* Presence logic could be added here */}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex justify-between items-baseline mb-1">
                                            <h3 className="font-semibold text-slate-200 text-sm truncate">{chat.isGroup ? chat.groupName : other.name}</h3>
                                            <span className="text-xs text-slate-500 flex-shrink-0">{isValid(new Date(chat.updatedAt)) ? format(new Date(chat.updatedAt), "h:mm a") : ""}</span>
                                        </div>
                                        <div className="flex justify-between items-center text-xs text-slate-400 truncate">
                                            {chat.lastMessage?.content || "No messages yet"}
                                        </div>
                                    </div>
                                </div>
                            );
                        })
                    ) : (
                        <div className="p-8 text-center text-slate-500 text-sm">
                            No conversations yet
                        </div>
                    )}
                </div>
            </div>

            {/* Right Panel (Active Chat Window) */}
            <div className="flex-1 flex flex-col bg-[#020617]/40 relative overflow-hidden">

                {activeChat ? (
                    <>
                        {/* Chat Header */}
                        <div className="p-4 border-b border-white/5 flex justify-between items-center bg-[#0f172a]/20 backdrop-blur-md absolute top-0 w-full z-10">
                            <div className="flex items-center gap-3">
                                <img src={getOtherParticipant(activeChat.participants).avatar || "https://api.dicebear.com/7.x/avataaars/svg?seed=user"} className="w-10 h-10 rounded-full object-cover border border-white/10" alt="Avatar" />
                                <div>
                                    <h2 className="font-bold text-slate-100">{activeChat.isGroup ? activeChat.groupName : getOtherParticipant(activeChat.participants).name}</h2>
                                    <p className="text-xs text-primary">{isTyping ? "typing..." : "Online"}</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-4 text-slate-400">
                                <Phone className="w-5 h-5 cursor-pointer hover:text-white transition-colors" onClick={() => toast("Voice call feature coming soon!", "info")} />
                                <Video className="w-5 h-5 cursor-pointer hover:text-white transition-colors" onClick={() => toast("Video call feature coming soon!", "info")} />
                                <MoreVertical className="w-5 h-5 cursor-pointer hover:text-white transition-colors" onClick={() => toast("Options menu coming soon!", "info")} />
                            </div>
                        </div>

                        {/* Messages Timeline */}
                        <div className="flex-1 overflow-y-auto p-6 space-y-4 pt-24 custom-scrollbar">
                            {loading && messages.length === 0 ? (
                                <div className="flex justify-center py-4">
                                    <Loader2 className="w-6 h-6 text-primary animate-spin" />
                                </div>
                            ) : (
                                <>
                                    {messages.map((msg, idx) => {
                                        const isMe = (msg.sender?.id || msg.sender?._id || msg.sender) === (user?.id || user?._id);
                                        const msgDate = new Date(msg.createdAt);
                                        const timeStr = isValid(msgDate) ? format(msgDate, "h:mm a") : "";
                                        return (
                                            <div key={msg._id || idx} className={`flex ${isMe ? "justify-end" : "justify-start"}`}>
                                                <div className={`max-w-[70%] ${isMe ? "order-2" : ""}`}>
                                                    <div
                                                        className={`p-3 rounded-2xl text-sm leading-relaxed shadow-lg ${isMe
                                                            ? "bg-primary text-white rounded-tr-sm"
                                                            : "glass-panel bg-[#1e293b]/80 text-slate-200 rounded-tl-sm border-white/5"
                                                            } ${msg.status === 'sending' ? 'opacity-70' : ''}`}
                                                    >
                                                        {msg.content}
                                                    </div>
                                                    <div className={`text-[10px] text-slate-500 mt-1 flex items-center gap-1 ${isMe ? "justify-end" : "justify-start"}`}>
                                                        {timeStr}
                                                        {isMe && msg.status === 'sending' && <Clock className="w-3 h-3 text-slate-400 ml-1" />}
                                                        {isMe && msg.status !== 'sending' && <CheckCheck className="w-3 h-3 text-primary ml-1" />}
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                    <div ref={messagesEndRef} />
                                </>
                            )}
                        </div>

                        {/* Input Area */}
                        <div className="p-4 bg-[#0f172a]/40 border-t border-white/5 backdrop-blur-md">
                            <div className="flex items-center gap-3 relative">
                                <button
                                    type="button"
                                    onClick={() => toast("Image sharing coming soon!", "info")}
                                    className="p-2 text-slate-400 hover:text-primary transition-colors glass-panel rounded-full border-white/5"
                                >
                                    <ImageIcon className="w-5 h-5" />
                                </button>
                                <input
                                    type="text"
                                    value={messageInput}
                                    onKeyDown={handleKeyDown}
                                    onChange={(e) => onTyping(e.target.value)}
                                    placeholder="Type a message..."
                                    className="flex-1 bg-white/5 border border-white/10 rounded-full py-3 px-6 text-sm text-white focus:outline-none focus:ring-1 focus:ring-primary/50 placeholder-slate-500"
                                />
                                <button
                                    type="button"
                                    onClick={handleSend}
                                    disabled={!messageInput.trim()}
                                    className={`p-3 rounded-full flex items-center justify-center transition-all ${messageInput.trim() ? "bg-primary text-white shadow-[0_0_15px_rgba(235,54,120,0.5)]" : "glass-panel text-slate-400 border-white/5 outline-none cursor-not-allowed"
                                        }`}>
                                    <Send className="w-4 h-4" />
                                </button>
                            </div>
                        </div>
                    </>
                ) : (
                    <div className="flex-1 flex flex-col items-center justify-center text-center p-12">
                        <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center mb-6">
                            <Send className="w-10 h-10 text-primary opacity-50" />
                        </div>
                        <h3 className="text-xl font-bold text-white mb-2">Your Messages</h3>
                        <p className="text-slate-400 max-w-xs mx-auto">
                            Send private photos and messages to a friend or group.
                        </p>
                    </div>
                )}

            </div>
        </div>
    );
}
