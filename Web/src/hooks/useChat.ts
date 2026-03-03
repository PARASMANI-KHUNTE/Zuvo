"use client";
import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/context/AuthContext";
import { useSocket } from "@/context/SocketContext";
import apiClient from "@/lib/api";

export interface Message {
    _id?: string;
    tempId?: string;
    senderId: string;
    receiverId: string;
    sender?: {
        _id: string;
        name: string;
        avatar: string;
    };
    content: string;
    attachments: any[];
    createdAt: string;
    status?: "sending" | "delivered" | "read";
}

export const useChat = (receiverId?: string) => {
    const { user } = useAuth();
    const { socket, isConnected } = useSocket();
    const [messages, setMessages] = useState<Message[]>([]);
    const [loading, setLoading] = useState(false);
    const [isTyping, setIsTyping] = useState(false);

    // Fetch initial messages
    useEffect(() => {
        if (!receiverId || !user) return;
        const fetchMessages = async () => {
            setLoading(true);
            try {
                const res = await apiClient.get(`/chat/messages/${receiverId}`);
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
    }, [receiverId, user]);

    // Socket listeners for chat-specific events
    useEffect(() => {
        if (!socket || !isConnected || !receiverId) return;

        const handleNewMessage = (message: Message) => {
            if (message.senderId === receiverId || message.receiverId === receiverId) {
                setMessages((prev) => {
                    // Deduplicate optimistic messages
                    const existingIdx = prev.findIndex(
                        (m) => (m._id && m._id === message._id) || (m.tempId && m.tempId === message._id)
                    );
                    if (existingIdx !== -1) {
                        const updated = [...prev];
                        updated[existingIdx] = { ...message, status: "delivered" };
                        return updated;
                    }
                    return [...prev, { ...message, status: "delivered" }];
                });
            }
        };

        const handleTyping = ({ senderId }: { senderId: string }) => {
            if (senderId === receiverId) setIsTyping(true);
        };

        const handleStopTyping = ({ senderId }: { senderId: string }) => {
            if (senderId === receiverId) setIsTyping(false);
        };

        socket.on("message", handleNewMessage);
        socket.on("typing", handleTyping);
        socket.on("stop_typing", handleStopTyping);

        return () => {
            socket.off("message", handleNewMessage);
            socket.off("typing", handleTyping);
            socket.off("stop_typing", handleStopTyping);
        };
    }, [socket, isConnected, receiverId]);

    const sendMessage = useCallback((content: string, attachments: any[] = []) => {
        if (!socket || !receiverId || !content.trim() || !user) return;

        const tempId = `temp_${Date.now()}_${Math.random().toString(36).slice(2)}`;
        const myId = user.id || user._id;

        const optimisticMsg: Message = {
            tempId,
            senderId: myId!,
            receiverId,
            content,
            attachments,
            createdAt: new Date().toISOString(),
            status: "sending"
        };

        setMessages((prev) => [...prev, optimisticMsg]);

        socket.emit("message", {
            receiverId,
            content,
            attachments,
            tempId
        });
    }, [socket, receiverId, user]);

    const sendTyping = useCallback((typing: boolean) => {
        if (socket && receiverId) {
            socket.emit(typing ? "typing" : "stop_typing", { receiverId });
        }
    }, [socket, receiverId]);

    return {
        messages,
        loading,
        isTyping,
        sendMessage,
        sendTyping
    };
};
