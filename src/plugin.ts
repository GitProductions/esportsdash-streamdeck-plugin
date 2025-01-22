import streamDeck, { LogLevel } from '@elgato/streamdeck';
import { AdjustScore } from './actions/adjust-score';
import socket from './websocket/socket';  // Import the singleton socket instance

// Set up logging for debugging
streamDeck.logger.setLevel(LogLevel.TRACE);

// Example usage of the socket in `plugin.ts`
socket.emit('joinRoom', { room: 'scoreUpdates' });

socket.on('scoreUpdate', (data) => {
    streamDeck.logger.info('Received score update:', data);
    console.log('Received score update:', data);
});

// Register the increment action
streamDeck.actions.registerAction(new AdjustScore());

// Finally, connect to the Stream Deck
streamDeck.connect();
