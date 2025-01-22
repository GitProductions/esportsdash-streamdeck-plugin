import { io, Socket } from 'socket.io-client';
import streamDeck, { LogLevel } from '@elgato/streamdeck';

class SocketService {
    private static instance: Socket;

    private constructor() { }

    public static getInstance(): Socket {
        if (!SocketService.instance) {
            SocketService.instance = io('http://localhost:8080', {
                path: '/socket.io' // Ensure this matches the server's WebSocket path
            });
            SocketService.instance.on('connect', () => {
                streamDeck.logger.info('Socket connected:', SocketService.instance.id);

                // Example usage of the socket in `plugin.ts`
                SocketService.instance.emit('joinRoom', { room: 'scoreUpdates', source: 'streamDeck' });

            });
            SocketService.instance.on('disconnect', () => {
                console.log('Socket disconnected');
            });
        }
        return SocketService.instance;
    }
}

export default SocketService.getInstance();
