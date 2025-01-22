import express from 'express';
import http from 'http';
import { Server as socketIo } from 'socket.io';  // Updated import

// Set up the server
const app = express();
const server = http.createServer(app);
const io = new socketIo(server);

io.on('connection', (socket) => {
    console.log('A user connected');
    
    // Handle incoming messages from the client
    socket.on('joinRoom', (data) => {
        console.log('User joined room:', data.room);
    });

    console.log("Sending score update")
    // Emit a message back to the client (for example, a score update)
    socket.emit('scoreUpdate', { team: 'team1', score: 100 });

    // Handle disconnection
    socket.on('disconnect', () => {
        console.log('User disconnected');
    });
});

// Start the server
server.listen(3000, () => {
    console.log('Server is running on http://localhost:3000');
});
