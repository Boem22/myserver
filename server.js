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
      let data;
      try {
        // Attempt to parse the incoming message as JSON
        data = JSON.parse(message);
      } catch (parseError) {
        // If parsing fails, assume it's plain text and convert it to JSON
        data = { text: message };
      }

      // Ensure the message has a "text" field
      if (!data.text || typeof data.text !== 'string') {
        // If "text" is missing or invalid, use a default value
        data.text = 'Invalid message format';
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