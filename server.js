const express = require('express');
const WebSocket = require('ws');
const path = require('path');

const app = express();
const port = process.env.PORT || 3000;

// Serve static files from "public" folder
app.use(express.static(path.join(__dirname, 'public')));

const server = app.listen(port, () => {
    console.log(`Server is running on http://localhost:${port}`);
});

const wss = new WebSocket.Server({ server });
const messages = [];

wss.on('connection', (ws) => {
    console.log('New client connected');
    ws.send(JSON.stringify(messages));

    ws.on('message', (data) => {
        console.log('Received message from client:', data);
        try {
            const message = JSON.parse(data);
            message.date = new Date().toLocaleString();
            messages.push(message);

            // Send the new message to all connected clients
            wss.clients.forEach(client => {
                if (client.readyState === WebSocket.OPEN) {
                    client.send(JSON.stringify([message]));
                }
            });
        } catch (error) {
            console.error('Error parsing message:', error);
        }
    });

    ws.on('close', () => {
        console.log('Client disconnected');
    });
});
