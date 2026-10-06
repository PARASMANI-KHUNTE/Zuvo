"use client";
import React, { useState, useEffect, useRef } from "react";
import Image from "next/image";
import { Search, Send, Image as ImageIcon, Phone, Video, MoreVertical, CheckCheck, Loader2, Clock } from "lucide-react";
import { format, isValid } from "date-fns";
import { useChat } from "@/hooks/useChat";
import { useAuth } from "@/context/AuthContext";
import { useSearchParams } from "next/navigation";
import apiClient from "@/lib/api";
import { useDebouncedCallback } from "@/hooks/useDebouncedCallback";
import { useToast } from "@/context/ToastContext";

import { Suspense } from "react";

function MessagesContent() {
    const { user } = useAuth();
    const searchParams = useSearchParams();
    const [selectedId, setSelectedId] = useState<string | null>(null);
    const [messageInput, setMessageInput] = useState("");
    const [chatQuery, setChatQuery] = useState("");
    const [uploadingImage, setUploadingImage] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const imageInputRef = useRef<HTMLInputElement>(null);
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
        if (!participants || participants.length === 0) return { name: "Unknown", avatar: "" };
        return participants.find(p => (p?._id || p?.id) !== (user?.id || user?._id)) || participants[0];
    };

    const filteredConversations = conversations.filter((chat) => {
        const query = chatQuery.trim().toLowerCase();
        if (!query) return true;
        const other = getOtherParticipant(chat.participants);
        const haystack = `${chat.isGroup ? chat.groupName || "" : other.name || ""} ${other.username || ""}`.toLowerCase();
        return haystack.includes(query);
    });

    const handleImageSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        e.target.value = "";
        if (!file || !selectedId) return;

        setUploadingImage(true);
        try {
            const formData = new FormData();
            formData.append("file", file);
            const res = await apiClient.post("/media/upload", formData, {
                headers: { "Content-Type": "multipart/form-data" }
            });
            const uploaded = res.data.data;
            sendMessage("", [{
                url: uploaded.url,
                publicId: uploaded.publicId,
                fileType: uploaded.resourceType
            }]);
            toast("Image sent", "success");
        } catch (err) {
            console.error("Failed to upload image", err);
            toast("Failed to upload image", "error");
        } finally {
            setUploadingImage(false);
        }
    };

    const isImageAttachment = (attachment: any) =>
        attachment.fileType === "image" ||
        (typeof attachment.url === "string" && /\.(png|jpe?g|gif|webp|avif|svg)(\?.*)?$/i.test(attachment.url));

    return (
        <div className="flex h-[calc(100vh-6.5rem)] w-full rounded-xl overflow-hidden bg-[#111113]/80 backdrop-blur-xl border border-white/[0.08]">
            {/* Left Sidebar (Conversations List) */}
            <div className={`w-full md:w-80 border-r border-white/[0.08] flex flex-col bg-[#111113]/50 ${selectedId ? "hidden md:flex" : "flex"}`}>
                {/* Header */}
                <div className="p-3.5 border-b border-white/[0.08] space-y-3">
                    <h2 className="text-base font-bold text-white tracking-tight">Messages</h2>
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-500" />
                        <input
                            type="text"
                            placeholder="Search chats..."
                            value={chatQuery}
                            onChange={(e) => setChatQuery(e.target.value)}
                            className="w-full bg-white/[0.04] border border-white/[0.08] rounded-lg py-1.5 pl-9 pr-3 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-white/30"
                        />
                    </div>
                </div>

                {/* List */}
                <div className="flex-1 overflow-y-auto w-full custom-scrollbar divide-y divide-white/[0.04]">
                    {filteredConversations.length > 0 ? (
                        filteredConversations.map((chat) => {
                            const other = getOtherParticipant(chat.participants);
                            const isSelected = selectedId === chat._id;
                            return (
                                <div
                                    key={chat._id}
                                    role="button"
                                    tabIndex={0}
                                    aria-pressed={isSelected}
                                    onClick={() => setSelectedId(chat._id)}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter' || e.key === ' ') {
                                            e.preventDefault();
                                            setSelectedId(chat._id);
                                        }
                                    }}
                                    className={`p-3.5 flex items-center gap-3 cursor-pointer transition-colors w-full ${
                                        isSelected
                                            ? "bg-white/[0.08]"
                                            : "hover:bg-white/[0.03]"
                                    }`}
                                >
                                    <div className="relative flex-shrink-0">
                                        <div className="w-10 h-10 rounded-full overflow-hidden bg-zinc-800 border border-white/10 relative">
                                            <Image src={other.avatar || "https://api.dicebear.com/7.x/avataaars/svg?seed=user"} alt={other.name} fill unoptimized className="object-cover" />
                                        </div>
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex justify-between items-baseline mb-0.5">
                                            <h3 className="font-medium text-white text-xs truncate">{chat.isGroup ? chat.groupName : other.name}</h3>
                                            <span className="text-[10px] text-zinc-500 flex-shrink-0">{isValid(new Date(chat.updatedAt)) ? format(new Date(chat.updatedAt), "h:mm a") : ""}</span>
                                        </div>
                                        <div className="text-[11px] text-zinc-400 truncate">
                                            {chat.lastMessage?.content || "No messages yet"}
                                        </div>
                                    </div>
                                </div>
                            );
                        })
                    ) : (
                        <div className="p-8 text-center text-zinc-500 text-xs">
                            {conversations.length > 0 ? "No chats match your search" : "No conversations yet"}
                        </div>
                    )}
                </div>
            </div>

            {/* Right Panel (Active Chat Window) */}
            <div className={`flex-1 flex-col bg-[#09090b]/50 relative overflow-hidden ${selectedId ? "flex" : "hidden md:flex"}`}>
                {activeChat ? (
                    <>
                        {/* Chat Header */}
                        <div className="p-3.5 border-b border-white/[0.08] flex justify-between items-center bg-[#111113]/80 backdrop-blur-md absolute top-0 w-full z-10">
                            <div className="flex items-center gap-3">
                                <button
                                    onClick={() => setSelectedId(null)}
                                    className="md:hidden p-1 text-zinc-400 hover:text-white"
                                    title="Back"
                                >
                                    &larr;
                                </button>
                                <div className="w-8 h-8 rounded-full overflow-hidden bg-zinc-800 border border-white/10 relative">
                                    <Image src={getOtherParticipant(activeChat.participants).avatar || "https://api.dicebear.com/7.x/avataaars/svg?seed=user"} fill unoptimized className="object-cover" alt="Avatar" />
                                </div>
                                <div>
                                    <h2 className="font-semibold text-xs text-white">{activeChat.isGroup ? activeChat.groupName : getOtherParticipant(activeChat.participants).name}</h2>
                                    <p className="text-[10px] text-zinc-400">{isTyping ? "typing..." : "Active"}</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-2 text-zinc-400">
                                <Phone className="w-4 h-4 cursor-pointer hover:text-white transition-colors" onClick={() => toast("Voice call feature coming soon!", "info")} />
                                <Video className="w-4 h-4 cursor-pointer hover:text-white transition-colors" onClick={() => toast("Video call feature coming soon!", "info")} />
                                <MoreVertical className="w-4 h-4 cursor-pointer hover:text-white transition-colors" onClick={() => toast("Options menu coming soon!", "info")} />
                            </div>
                        </div>

                        {/* Messages Timeline */}
                        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-3 pt-20 custom-scrollbar">
                            {loading && messages.length === 0 ? (
                                <div className="flex justify-center py-6">
                                    <Loader2 className="w-5 h-5 text-zinc-500 animate-spin" />
                                </div>
                            ) : (
                                <>
                                    {messages.map((msg, idx) => {
                                        const isMe = (msg.sender?.id || msg.sender?._id || msg.sender) === (user?.id || user?._id);
                                        const msgDate = new Date(msg.createdAt);
                                        const timeStr = isValid(msgDate) ? format(msgDate, "h:mm a") : "";
                                        return (
                                            <div key={msg._id || idx} className={`flex ${isMe ? "justify-end" : "justify-start"}`}>
                                                <div className={`max-w-[75%] sm:max-w-[65%] ${isMe ? "order-2" : ""}`}>
                                                    <div
                                                        className={`p-3 rounded-xl text-xs leading-relaxed ${isMe
                                                            ? "bg-white text-zinc-950 rounded-tr-sm"
                                                            : "bg-white/[0.06] text-zinc-200 rounded-tl-sm border border-white/[0.08]"
                                                            } ${msg.status === 'sending' ? 'opacity-70' : ''}`}
                                                    >
                                                        {msg.attachments && msg.attachments.length > 0 && (
                                                            <div className="space-y-2 mb-1.5">
                                                                {msg.attachments.map((attachment: any, attIdx: number) => (
                                                                    isImageAttachment(attachment) ? (
                                                                        <Image
                                                                            key={attIdx}
                                                                            src={attachment.url}
                                                                            alt="Attachment"
                                                                            width={240}
                                                                            height={160}
                                                                            unoptimized
                                                                            className="rounded-lg object-cover w-full max-w-[240px] border border-white/10"
                                                                        />
                                                                    ) : attachment.fileType === "video" ? (
                                                                        <video key={attIdx} src={attachment.url} controls className="rounded-lg w-full max-w-[240px]" />
                                                                    ) : (
                                                                        <a
                                                                            key={attIdx}
                                                                            href={attachment.url}
                                                                            target="_blank"
                                                                            rel="noreferrer"
                                                                            className="underline break-all text-xs opacity-90"
                                                                        >
                                                                            {attachment.url}
                                                                        </a>
                                                                    )
                                                                ))}
                                                            </div>
                                                        )}
                                                        {msg.content}
                                                    </div>
                                                    <div className={`text-[10px] text-zinc-500 mt-1 flex items-center gap-1 ${isMe ? "justify-end" : "justify-start"}`}>
                                                        {timeStr}
                                                        {isMe && msg.status === 'sending' && <Clock className="w-3 h-3 text-zinc-500 ml-1" />}
                                                        {isMe && msg.status !== 'sending' && <CheckCheck className="w-3 h-3 text-zinc-400 ml-1" />}
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
                        <div className="p-3 bg-[#111113]/80 border-t border-white/[0.08] backdrop-blur-md">
                            <div className="flex items-center gap-2 relative">
                                <button
                                    type="button"
                                    onClick={() => imageInputRef.current?.click()}
                                    disabled={uploadingImage}
                                    className="p-2 text-zinc-400 hover:text-white rounded-lg hover:bg-white/[0.06] transition-colors disabled:opacity-50"
                                >
                                    {uploadingImage ? <Loader2 className="w-4 h-4 animate-spin" /> : <ImageIcon className="w-4 h-4" />}
                                </button>
                                <input
                                    ref={imageInputRef}
                                    type="file"
                                    accept="image/*"
                                    className="hidden"
                                    onChange={handleImageSelect}
                                />
                                <input
                                    type="text"
                                    value={messageInput}
                                    onKeyDown={handleKeyDown}
                                    onChange={(e) => onTyping(e.target.value)}
                                    placeholder="Type a message..."
                                    className="flex-1 bg-white/[0.04] border border-white/[0.08] rounded-lg py-2 px-3.5 text-xs text-white focus:outline-none focus:border-white/30 placeholder-zinc-500"
                                />
                                <button
                                    type="button"
                                    onClick={handleSend}
                                    disabled={!messageInput.trim()}
                                    className="btn-primary !p-2 !rounded-lg disabled:opacity-40"
                                >
                                    <Send className="w-3.5 h-3.5" />
                                </button>
                            </div>
                        </div>
                    </>
                ) : (
                    <div className="flex-1 flex flex-col items-center justify-center text-center p-8">
                        <div className="w-12 h-12 bg-white/[0.04] border border-white/[0.08] rounded-xl flex items-center justify-center mb-3">
                            <Send className="w-5 h-5 text-zinc-400" />
                        </div>
                        <h3 className="text-sm font-semibold text-white mb-1">Your Messages</h3>
                        <p className="text-zinc-500 text-xs max-w-xs mx-auto">
                            Select a chat or start a new conversation to communicate.
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
}

export default function MessagesPage() {
    return (
        <Suspense fallback={<div>Loading...</div>}>
            <MessagesContent />
        </Suspense>
    );
}
