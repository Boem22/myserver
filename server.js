const express = require('express');
const http = require('http');
const WebSocket = require('ws');

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

const PORT = process.env.PORT || 3000;

// Serve static files (e.g., index.html)
app.use(express.static('public'));

// Store messages in memory (for simplicity)
let messages = [];

// WebSocket connection handler
wss.on('connection', (ws) => {
  console.log('New client connected');

  // Send existing messages to the new client
  ws.send(JSON.stringify({ type: 'init', messages }));

  // Handle incoming messages from clients
  ws.on('message', (message) => {
    try {
      // Parse the incoming message as JSON
      const data = JSON.parse(message);

      // Check if the message has the required "text" field
      if (!data.text) {
        throw new Error('Invalid message format: "text" field is required');
      }

      // Save the message
      const newMessage = { text: data.text, timestamp: new Date() };
      messages.push(newMessage);

      // Broadcast the new message to all connected clients
      wss.clients.forEach((client) => {
        if (client.readyState === WebSocket.OPEN) {
          client.send(JSON.stringify({ type: 'message', message: newMessage }));
        }
      });
    } catch (error) {
      console.error('Failed to parse message:', error);
      ws.send(JSON.stringify({ type: 'error', message: 'Invalid message format' }));
    }
  });

  // Handle client disconnection
  ws.on('close', () => {
    console.log('Client disconnected');
  });
});

// Start the server
server.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});