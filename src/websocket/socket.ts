import { io, Socket } from 'socket.io-client';

class SocketService {
    private static instance: Socket;

    private constructor() {
        // Private constructor to prevent instantiation
    }

    public static getInstance(): Socket {
        if (!SocketService.instance) {
            SocketService.instance = io('http://localhost:3000'); // Replace with your server's URL
            SocketService.instance.on('connect', () => {
                console.log('Socket connected:', SocketService.instance.id);
            });

            SocketService.instance.on('disconnect', () => {
                console.log('Socket disconnected');
            });

            // Additional event listeners can be added here
        }
        return SocketService.instance;
    }
}

export default SocketService.getInstance();
