import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAuth } from './AuthContext';
import { Platform } from 'react-native';

const getRealtimeUrl = () => {
    const envUrl = process.env.EXPO_PUBLIC_REALTIME_URL;
    if (envUrl) return envUrl;
    return Platform.OS === 'android' ? 'http://10.0.2.2:5000' : 'http://localhost:5000';
};

const SOCKET_URL = getRealtimeUrl();

interface SocketContextType {
    socket: Socket | null;
    isConnected: boolean;
}

const SocketContext = createContext<SocketContextType>({ socket: null, isConnected: false });

export const useSocket = () => useContext(SocketContext);

export function SocketProvider({ children }: { children: React.ReactNode }) {
    const { accessToken, user } = useAuth();
    const [socket, setSocket] = useState<Socket | null>(null);
    const [isConnected, setIsConnected] = useState(false);
    const connectionVersion = useRef(0);

    const connectSocket = useCallback((token: string) => {
        const version = ++connectionVersion.current;
        console.log(`[Socket] Connecting v${version}...`);

        const newSocket = io(SOCKET_URL, {
            auth: { token },
            transports: ['websocket'],
            reconnection: true,
            reconnectionAttempts: 5,
            reconnectionDelay: 1000,
        });

        newSocket.on('connect', () => {
            if (version !== connectionVersion.current) {
                newSocket.disconnect();
                return;
            }
            console.log('[Socket] Connected');
            setIsConnected(true);
        });

        newSocket.on('disconnect', (reason) => {
            if (version === connectionVersion.current) {
                console.log('[Socket] Disconnected:', reason);
                setIsConnected(false);
            }
        });

        newSocket.on('connect_error', (err) => {
            console.error('[Socket] Connection error:', err.message);
        });

        newSocket.on('notification', (data: any) => {
            console.log('[Socket] Notification received:', data);
        });

        setSocket(newSocket);
        return newSocket;
    }, []);

    useEffect(() => {
        let s: Socket | null = null;

        if (!accessToken) {
            if (socket) {
                socket.removeAllListeners();
                socket.disconnect();
                setSocket(null);
                setIsConnected(false);
            }
            return;
        }

        s = connectSocket(accessToken);

        return () => {
            if (s) {
                s.off('notification');
                s.close();
            }
        };
    }, [accessToken, connectSocket]);

    return (
        <SocketContext.Provider value={{ socket, isConnected }}>
            {children}
        </SocketContext.Provider>
    );
}

export default SocketContext;
