const WebSocket = require('ws');

// Use Render's provided PORT or default to 8080
const PORT = process.env.PORT || 8080;

// Create a WebSocket server
const wss = new WebSocket.Server({ port: PORT });

wss.on('connection', (ws) => {
    console.log('New client connected');

    // Handle incoming messages from clients
    ws.on('message', (message) => {
        console.log('Received:', message.toString());

        // Broadcast the message to all connected clients
        wss.clients.forEach(client => {
            if (client.readyState === WebSocket.OPEN) {
                client.send(message.toString());
            }
        });
    });

    // Handle client disconnection
    ws.on('close', () => {
        console.log('Client disconnected');
    });
});

console.log(`WebSocket server is running on wss://localhost:${PORT}`);