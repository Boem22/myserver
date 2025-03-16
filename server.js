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

// Admin credentials
const ADMIN_USERNAME = 'Admin';
const ADMIN_PASSWORD = '1622005';

// Track admin login status
let isAdminLoggedIn = false;

// WebSocket connection handler
wss.on('connection', (ws, req) => {
  const ip = req.socket.remoteAddress; // Get the client's IP address
  console.log(`New client connected from IP: ${ip}`);

  // Send existing messages to the new client
  ws.send(JSON.stringify({ type: 'init', messages, isAdminLoggedIn }));

  // Handle incoming messages from clients
  ws.on('message', (message) => {
    try {
      let data;
      let messageString;

      // Check if the message is binary (Buffer)
      if (message instanceof Buffer) {
        console.warn('Received binary message, converting to string:', message);
        messageString = message.toString('utf-8'); // Convert binary to string
      } else {
        messageString = message; // Assume it's already a string
      }

      try {
        // Attempt to parse the incoming message as JSON
        data = JSON.parse(messageString);
      } catch (parseError) {
        // If parsing fails, assume it's plain text and convert it to JSON
        console.warn('Received plain text message, converting to JSON:', messageString);
        data = { text: messageString };
      }

      // Check if the message is a rating
      if (data.type === 'rate') {
        const { messageId, rating } = data;
        if (messages[messageId]) {
          if (!messages[messageId].ratings) {
            messages[messageId].ratings = [];
          }
          messages[messageId].ratings.push(rating);
          console.log(`Message ${messageId} rated ${rating} stars.`);
          // Broadcast the updated message to all clients
          wss.clients.forEach((client) => {
            if (client.readyState === WebSocket.OPEN) {
              client.send(JSON.stringify({ type: 'update', message: messages[messageId], messageId }));
            }
          });
        }
        return;
      }

      // Ensure the message is an object
      if (typeof data !== 'object' || data === null) {
        throw new Error('Message must be a JSON object.');
      }

      // Ensure the message has a "text" field
      if (!data.text || typeof data.text !== 'string') {
        console.warn('Message missing "text" field, using default value:', data);
        data.text = 'Invalid message format';
      }

      // Save the message
      const newMessage = { text: data.text, timestamp: new Date(), ratings: [] };
      messages.push(newMessage);

      // Broadcast the new message to all connected clients
      wss.clients.forEach((client) => {
        if (client.readyState === WebSocket.OPEN) {
          client.send(JSON.stringify({ type: 'message', message: newMessage, isAdminLoggedIn }));
        }
      });
    } catch (error) {
      console.error('Error processing message:', error.message);
      ws.send(JSON.stringify({ type: 'error', message: error.message }));
    }
  });

  // Handle client disconnection
  ws.on('close', () => {
    console.log(`Client disconnected from IP: ${ip}`);
  });
});

// Start the server
server.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});