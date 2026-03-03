"use client";
import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/context/AuthContext";
import { useSocket } from "@/context/SocketContext";
import apiClient from "@/lib/api";

export interface Message {
    _id?: string;
    tempId?: string;
    conversationId?: string;
    senderId: string;
    receiverId: string;
    sender?: Participant;
    content: string;
    attachments: any[];
    createdAt: string;
    status?: "sending" | "delivered" | "read";
}

export interface Participant {
    _id: string;
    id?: string;
    name: string;
    avatar: string;
    username?: string;
}

export interface Conversation {
    _id: string;
    participants: Participant[];
    isGroup: boolean;
    groupName?: string;
    lastMessage?: {
        content: string;
        createdAt: string;
    };
    updatedAt: string;
}

export const useChat = (conversationId?: string) => {
    const { user } = useAuth();
    const { socket, isConnected } = useSocket();
    const [messages, setMessages] = useState<Message[]>([]);
    const [conversations, setConversations] = useState<Conversation[]>([]);
    const [loading, setLoading] = useState(false);
    const [isTyping, setIsTyping] = useState(false);

    // Fetch conversations list
    const fetchConversations = useCallback(async () => {
        try {
            const res = await apiClient.get("/chat/conversations");
            if (res.data.success) {
                setConversations(res.data.data);
            }
        } catch (err) {
            console.error("Failed to fetch conversations", err);
        }
    }, []);

    useEffect(() => {
        if (user) {
            fetchConversations();
        }
    }, [user, fetchConversations]);

    // Join room when conversation changes
    useEffect(() => {
        if (socket && isConnected && conversationId) {
            socket.emit("chat:join", conversationId);
        }
    }, [socket, isConnected, conversationId]);

    // Fetch initial messages for active conversation
    useEffect(() => {
        if (!conversationId || !user) return;
        const fetchMessages = async () => {
            setLoading(true);
            try {
                const res = await apiClient.get(`/chat/messages/${conversationId}`);
                if (res.data.success) {
                    setMessages(res.data.data);
                }
            } catch (err) {
                console.error("Failed to fetch messages", err);
            } finally {
                setLoading(false);
            }
        };
        fetchMessages();
    }, [conversationId, user]);

    // Socket listeners for chat-specific events
    useEffect(() => {
        if (!socket || !isConnected) return;

        const handleNewMessage = (message: Message) => {
            // Update messages list if it's the active conversation
            if (message.conversationId === conversationId || message.receiverId === conversationId) {
                setMessages((prev) => {
                    const existingIdx = prev.findIndex(
                        (m) => (m._id && m._id === message._id) || (m.tempId && (m.tempId === message._id || m.tempId === message.tempId))
                    );
                    if (existingIdx !== -1) {
                        const updated = [...prev];
                        updated[existingIdx] = { ...message, status: "delivered" };
                        return updated;
                    }
                    return [...prev, { ...message, status: "delivered" }];
                });
            }

            // Always refresh conversations list to update lastMessage/order
            fetchConversations();
        };

        const handleTyping = ({ userId: typingUserId, isTyping: typingStatus }: { userId: string, isTyping: boolean }) => {
            if (typingUserId !== (user?.id || user?._id)) {
                setIsTyping(typingStatus);
            }
        };

        socket.on("chat:message", handleNewMessage);
        socket.on("chat:typing", handleTyping);

        return () => {
            socket.off("chat:message", handleNewMessage);
            socket.off("chat:typing", handleTyping);
        };
    }, [socket, isConnected, conversationId, fetchConversations, user]);

    const sendMessage = useCallback((content: string, attachments: any[] = []) => {
        if (!socket || !conversationId || !content.trim() || !user) return;

        const tempId = `temp_${Date.now()}_${Math.random().toString(36).slice(2)}`;
        const myId = user.id || user._id;

        const optimisticMsg: Message = {
            tempId,
            senderId: myId!,
            receiverId: conversationId, // Fallback for legacy
            conversationId,
            content,
            attachments,
            createdAt: new Date().toISOString(),
            status: "sending"
        };

        setMessages((prev) => [...prev, optimisticMsg]);

        socket.emit("chat:message", {
            conversationId,
            content,
            attachments,
            tempId
        });
    }, [socket, conversationId, user]);

    const sendTyping = useCallback((typing: boolean) => {
        if (socket && conversationId) {
            socket.emit("chat:typing", { conversationId, isTyping: typing });
        }
    }, [socket, conversationId]);

    return {
        messages,
        conversations,
        loading,
        isTyping,
        sendMessage,
        sendTyping,
        refreshConversations: fetchConversations
    };
};
