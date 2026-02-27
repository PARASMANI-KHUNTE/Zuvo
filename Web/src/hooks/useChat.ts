import { useState, useEffect, useCallback, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import apiClient from '@/lib/api';
import { useAuth } from '@/context/AuthContext';

const SOCKET_URL = process.env.NEXT_PUBLIC_REALTIME_URL || 'http://localhost:5000';

interface Message {
    _id?: string;
    conversationId: string;
    sender: any;
    content: string;
    attachments: any[];
    createdAt: string;
    status?: 'sending' | 'delivered' | 'read';
}

interface Conversation {
    _id: string;
    participants: any[];
    lastMessage?: any;
    isGroup: boolean;
    groupName?: string;
    updatedAt: string;
}

export const useChat = (conversationId?: string) => {
    const { accessToken, user } = useAuth();
    const [socket, setSocket] = useState<Socket | null>(null);
    const [messages, setMessages] = useState<Message[]>([]);
    const [conversations, setConversations] = useState<Conversation[]>([]);
    const [isTyping, setIsTyping] = useState(false);
    const [loading, setLoading] = useState(false);

    // 1. Initialize Socket
    useEffect(() => {
        if (!accessToken) return;

        const newSocket = io(SOCKET_URL, {
            auth: { token: accessToken },
            transports: ['websocket']
        });

        setSocket(newSocket);

        newSocket.on('connect', () => {
            // Chat socket connected
        });

        newSocket.on('notification', (btn: any) => {
            // Handle global notifications if needed
        });

        return () => {
            newSocket.close();
        };
    }, [accessToken]);

    // 2. Load Conversations
    const fetchConversations = useCallback(async () => {
        try {
            const res = await apiClient.get('/chat/conversations');
            if (res.data.success) {
                setConversations(res.data.data);
            }
        } catch (err) {
            console.error('Failed to fetch conversations', err);
        }
    }, []);

    useEffect(() => {
        if (accessToken) fetchConversations();
    }, [accessToken, fetchConversations]);

    // 3. Load Messages for Active Conversation
    const fetchMessages = useCallback(async (id: string) => {
        setLoading(true);
        try {
            const res = await apiClient.get(`/chat/messages/${id}`);
            if (res.data.success) {
                setMessages(res.data.data);
            }
        } catch (err) {
            console.error('Failed to fetch messages', err);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        if (conversationId && socket) {
            fetchMessages(conversationId);
            socket.emit('chat:join', conversationId);

            const handleNewMessage = (msg: Message) => {
                if (msg.conversationId === conversationId) {
                    setMessages(prev => [...prev, msg]);
                }

                // Update conversations list locally to reflect last message without refetching
                setConversations(prev => {
                    const existing = prev.find(c => c._id === msg.conversationId);
                    if (!existing) {
                        fetchConversations(); // New conversation we don't have yet
                        return prev;
                    }

                    const updated = prev.map(c =>
                        c._id === msg.conversationId
                            ? { ...c, lastMessage: msg, updatedAt: new Date().toISOString() }
                            : c
                    );

                    // Re-sort: Move most recent to top
                    return [...updated].sort((a, b) =>
                        new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
                    );
                });
            };

            const handleTyping = (data: { userId: string, isTyping: boolean }) => {
                if (data.userId !== (user?.id || user?._id)) {
                    setIsTyping(data.isTyping);
                }
            };

            socket.on('chat:message', handleNewMessage);
            socket.on('chat:typing', handleTyping);

            return () => {
                socket.off('chat:message', handleNewMessage);
                socket.off('chat:typing', handleTyping);
            };
        }
    }, [conversationId, socket, fetchMessages, fetchConversations, user?.id, user?._id]);

    // 4. Send Message
    const sendMessage = useCallback((content: string, attachments: any[] = []) => {
        if (!socket || !conversationId || !content.trim()) return;

        const msgData = {
            conversationId,
            content,
            attachments
        };

        socket.emit('chat:message', msgData);
    }, [socket, conversationId, user]);

    // 5. Typing Indicators
    const sendTyping = useCallback((typing: boolean) => {
        if (socket && conversationId) {
            socket.emit('chat:typing', { conversationId, isTyping: typing });
        }
    }, [socket, conversationId]);

    return {
        socket,
        messages,
        conversations,
        isTyping,
        loading,
        sendMessage,
        sendTyping,
        refreshConversations: fetchConversations
    };
};
