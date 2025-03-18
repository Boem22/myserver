const WebSocket = require('ws');
const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = process.env.PORT || 8080;

const server = http.createServer((req, res) => {
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

const wss = new WebSocket.Server({ server });

// Store all connected clients
const clients = new Set();

// Store messages and levels
let messageHistory = [];
let levelHistory = [];

wss.on('connection', (ws) => {
    console.log('New client connected');
    clients.add(ws);

    // Send existing messages and levels to the new client
    ws.send(JSON.stringify({ type: 'init', messages: messageHistory, levels: levelHistory }));

    // Handle incoming messages from clients
    ws.on('message', (message) => {
        console.log('Received:', message.toString());

        let parsedMessage;
        try {
            // Try to parse the message as JSON
            parsedMessage = JSON.parse(message.toString());
        } catch (error) {
            // If parsing fails, treat it as a plain text message
            parsedMessage = {
                type: 'comment',
                content: message.toString()
            };
        }

        if (parsedMessage.type === 'comment') {
            // Add the message to history
            messageHistory.push(parsedMessage);
        } else if (parsedMessage.type === 'new_level') {
            // Only add the level if it doesn't already exist
            if (!levelHistory.some(lvl => lvl.id === parsedMessage.level.id)) {
                levelHistory.push(parsedMessage.level);
            }
        } else if (parsedMessage.type === 'delete_message') {
            // Remove the message from history.
            // We convert both ids to strings to match TurboWarp messages with numeric ids.
            messageHistory = messageHistory.filter(
                msg => String(msg.id) !== String(parsedMessage.messageId)
            );
        } else if (parsedMessage.type === 'delete_level') {
            // Remove the level from history (if it exists)
            levelHistory = levelHistory.filter(lvl => String(lvl.id) !== String(parsedMessage.levelId));
        }

        // Broadcast the message to all connected clients.
        // For deletions, this ensures that every client wipes the message.
        clients.forEach(client => {
            if (client.readyState === WebSocket.OPEN) {
                client.send(JSON.stringify(parsedMessage));
            }
        });
    });

    // Handle client disconnection
    ws.on('close', () => {
        console.log('Client disconnected');
        clients.delete(ws);
    });
});

// Start the server
server.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
