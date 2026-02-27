import { io, Socket } from "socket.io-client";
import Cookies from "js-cookie";

let socket: Socket | null = null;

/**
 * Returns a singleton Socket.IO instance.
 * Connects with JWT auth token from cookies.
 */
export const getSocket = (): Socket => {
  if (socket?.connected) return socket;

  const token = Cookies.get("accessToken");

  socket = io(process.env.NEXT_PUBLIC_SOCKET_URL!, {
    auth: { token },
    transports: ["websocket"],
    reconnection: true,
    reconnectionAttempts: 5,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 5000,
  });

  socket.on("connect", () => {
    console.warn("[Socket] Connected:", socket?.id);
  });

  socket.on("connect_error", (err) => {
    console.error("[Socket] Connection error:", err.message);
  });

  socket.on("disconnect", (reason) => {
    console.warn("[Socket] Disconnected:", reason);
  });

  return socket;
};

/**
 * Disconnect and destroy the socket instance.
 * Call this on logout.
 */
export const disconnectSocket = () => {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
};
