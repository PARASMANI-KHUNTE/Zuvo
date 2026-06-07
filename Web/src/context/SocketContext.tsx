"use client";
import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from "react";
import { io, Socket } from "socket.io-client";
import { useAuth } from "./AuthContext";
import { useToast } from "./ToastContext";

const SOCKET_URL = process.env.NEXT_PUBLIC_REALTIME_URL || "http://localhost:5000";

interface SocketContextType {
    socket: Socket | null;
    isConnected: boolean;
}

const SocketContext = createContext<SocketContextType>({ socket: null, isConnected: false });

export const useSocket = () => useContext(SocketContext);

export function SocketProvider({ children }: { children: React.ReactNode }) {
    const { accessToken, user } = useAuth();
    const { toast } = useToast();
    const [isConnected, setIsConnected] = useState(false);
    const socketRef = useRef<Socket | null>(null);
    const connectionVersion = useRef(0);

    const connectSocket = useCallback((token: string) => {
        const version = ++connectionVersion.current;

        const newSocket = io(SOCKET_URL, {
            auth: { token },
            transports: ["websocket"],
            reconnection: true,
            reconnectionAttempts: 5,
            reconnectionDelay: 1000,
        });

        newSocket.on("connect", () => {
            if (version !== connectionVersion.current) {
                newSocket.disconnect();
                return;
            }
            setIsConnected(true);
        });

        newSocket.on("disconnect", (reason) => {
            if (version === connectionVersion.current) {
                setIsConnected(false);
            }
        });

        newSocket.on("connect_error", (err) => {
            if (err.message === "Authentication required" || err.message === "Invalid or expired token") {
                // AuthContext should handle refresh; this effect re-runs on accessToken change.
            }
        });

        newSocket.on("notification", (data: any) => {
            toast(data.content || "New notification received", "notification");
        });

        socketRef.current = newSocket;
        return newSocket;
    }, [toast]);

    useEffect(() => {
        if (!accessToken || (user && user.accountStatus !== "active")) {
            if (socketRef.current) {
                socketRef.current.removeAllListeners();
                socketRef.current.disconnect();
                socketRef.current = null;
                setIsConnected(false);
            }
            return;
        }

        const s = connectSocket(accessToken);

        return () => {
            s.off("notification");
            s.close();
            if (socketRef.current === s) {
                socketRef.current = null;
            }
        };
    }, [accessToken, user, connectSocket]);

    return (
        <SocketContext.Provider value={{ socket: socketRef.current, isConnected }}>
            {children}
        </SocketContext.Provider>
    );
}
