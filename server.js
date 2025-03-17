const WebSocket = require('ws');
const http = require('http');
const fs = require('fs');
const path = require('path');

// Use Render's provided PORT or default to 8080
const PORT = process.env.PORT || 8080;

// Create an HTTP server
const server = http.createServer((req, res) => {
    // Serve the index.html file
    if (req.url === '/') {
        const filePath = path.join(__dirname, 'index.html');
        fs.readFile(filePath, (err, data) => {
            if (err) {
                console.error('Error loading index.html:', err);
                res.writeHead(500, { 'Content-Type': 'text/plain' });
                res.end('Error loading index.html');
            } else {
                res.writeHead(200, { 'Content-Type': 'text/html' });
                res.end(data);
            }
        });
    } else {
        res.writeHead(404, { 'Content-Type': 'text/plain' });
        res.end('Not found');
    }
});

// Create a WebSocket server by passing the HTTP server
const wss = new WebSocket.Server({ server });

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

// Start the server
server.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
    console.log(`WebSocket server is running on wss://myserver-1jxx.onrender.com`);
});