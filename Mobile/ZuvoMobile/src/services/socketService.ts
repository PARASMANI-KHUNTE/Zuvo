import { io, Socket } from 'socket.io-client';
import * as Keychain from 'react-native-keychain';

const SOCKET_URL = 'http://localhost:3000'; // Replace with production URL

class SocketService {
    private socket: Socket | null = null;

    async connect() {
        if (this.socket?.connected) return;

        const credentials = await Keychain.getGenericPassword();
        const token = credentials ? credentials.password : ''; // Assuming simplified access token in password field

        this.socket = io(SOCKET_URL, {
            auth: { token },
            reconnection: true,
            reconnectionAttempts: 10,
            reconnectionDelay: 1000,
            reconnectionDelayMax: 5000,
        });

        this.socket.on('connect', () => {
            console.log('Socket connected');
        });

        this.socket.on('disconnect', (reason) => {
            console.log('Socket disconnected', reason);
        });

        this.socket.on('connect_error', async (error) => {
            console.log('Socket connect error', error);
            // Logic for re-authenticating if token expired can be added here
        });
    }

    on(event: string, callback: (data: any) => void) {
        this.socket?.on(event, callback);
    }

    emit(event: string, data: any) {
        this.socket?.emit(event, data);
    }

    disconnect() {
        this.socket?.disconnect();
        this.socket = null;
    }
}

export const socketService = new SocketService();
