"use client";
import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import { io, Socket } from "socket.io-client";
import { useAuth } from "./AuthContext";
import { useToast } from "./ToastContext";

const SOCKET_URL = process.env.NEXT_PUBLIC_REALTIME_URL || "http://localhost:8004";

interface SocketContextType {
    socket: Socket | null;
    isConnected: boolean;
}

const SocketContext = createContext<SocketContextType>({ socket: null, isConnected: false });

export const useSocket = () => useContext(SocketContext);

export function SocketProvider({ children }: { children: React.ReactNode }) {
    const { accessToken, user } = useAuth();
    const { toast } = useToast();
    const [socket, setSocket] = useState<Socket | null>(null);
    const [isConnected, setIsConnected] = useState(false);

    const connectSocket = useCallback((token: string) => {
        const newSocket = io(SOCKET_URL, {
            auth: { token },
            transports: ["websocket"],
            reconnection: true,
            reconnectionAttempts: 5,
            reconnectionDelay: 1000,
        });

        newSocket.on("connect", () => {
            console.log("Connected to realtime server");
            setIsConnected(true);
        });

        newSocket.on("disconnect", (reason) => {
            console.log("Disconnected from realtime server:", reason);
            setIsConnected(false);
        });

        newSocket.on("connect_error", (err) => {
            console.error("Socket connection error:", err.message);
            if (err.message === "Authentication required" || err.message === "Invalid or expired token") {
                // Potential token expiry — AuthContext should handle refresh, 
                // and this useEffect will re-run when accessToken changes.
            }
        });

        // Global Notification Listener
        newSocket.on("notification", (data: any) => {
            console.log("Realtime notification received:", data);
            toast(data.content || "New notification received", "notification");
        });

        setSocket(newSocket);

        return newSocket;
    }, [toast]);

    useEffect(() => {
        let s: Socket | null = null;

        if (accessToken && user && !user.isDeleted) {
            s = connectSocket(accessToken);
        } else {
            if (socket) {
                socket.close();
                setSocket(null);
                setIsConnected(false);
            }
        }

        return () => {
            if (s) {
                s.off("notification");
                s.close();
            }
        };
    }, [accessToken, user, connectSocket]);

    return (
        <SocketContext.Provider value={{ socket, isConnected }}>
            {children}
        </SocketContext.Provider>
    );
}
