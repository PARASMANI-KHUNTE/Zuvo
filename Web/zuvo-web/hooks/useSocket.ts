"use client";

import { useEffect, useRef } from "react";
import { Socket } from "socket.io-client";
import { getSocket, disconnectSocket } from "@/lib/socket";
import { useAuth } from "./useAuth";

/**
 * Returns the Socket.IO instance.
 * Connects when the user is authenticated, disconnects on logout.
 */
export const useSocket = (): Socket | null => {
  const { isAuthenticated } = useAuth();
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    if (!isAuthenticated) return;

    socketRef.current = getSocket();

    return () => {
      // Don't disconnect on component unmount — socket is a singleton.
      // Disconnect only on logout (handled in logout action).
    };
  }, [isAuthenticated]);

  return socketRef.current;
};

export { disconnectSocket };
