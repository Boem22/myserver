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
      let data;
      try {
        data = JSON.parse(message);
      } catch (parseError) {
        throw new Error('Invalid JSON format');
      }

      // Validate the message structure
      if (typeof data !== 'object' || data === null) {
        throw new Error('Message must be a JSON object');
      }

      if (!data.text || typeof data.text !== 'string') {
        throw new Error('Message must contain a "text" field of type string');
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
      console.error('Error processing message:', error.message);
      ws.send(JSON.stringify({ type: 'error', message: error.message }));
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