const express = require('express');
const WebSocket = require('ws');
const { Client } = require('pg');
const app = express();
const port = 10001; // Changed port to avoid EADDRINUSE error

// Setup PostgreSQL connection
const client = new Client({
  user: 'your_user',
  host: 'localhost',
  database: 'your_database',
  password: 'your_password',
  port: 5432
});
client.connect();

// Serve static files (optional, if you have static assets)
app.use(express.static('public'));

// Start WebSocket server
const wss = new WebSocket.Server({ noServer: true });

// Handle WebSocket connection
wss.on('connection', (ws) => {
  ws.on('message', async (message) => {
    const msg = JSON.parse(message);

    // Adding the sender field to the message
    if (msg.type === 'new_level') {
      const sender = 'system'; // Use 'system' or the actual sender based on your app logic
      const query = {
        text: 'INSERT INTO messages(type, level, sender, timestamp) VALUES($1, $2, $3, $4)',
        values: [msg.type, JSON.stringify(msg.level), sender, new Date()],
      };
      
      try {
        await client.query(query);
      } catch (err) {
        console.error('Error inserting message into database:', err);
      }
    }

    // Handle other message types if needed
    // Example for other message types
    // else if (msg.type === 'delete_level') { ... }
  });
});

// Create HTTP server and integrate WebSocket
const server = app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});

server.on('upgrade', (request, socket, head) => {
  wss.handleUpgrade(request, socket, head, (ws) => {
    wss.emit('connection', ws, request);
  });
});
