const express = require('express');
const { Client } = require('pg');
const WebSocket = require('ws');
const path = require('path');
const dotenv = require('dotenv');

// Load environment variables from .env file
dotenv.config();

// Initialize express app
const app = express();
const wss = new WebSocket.Server({ noServer: true });

// Serve static files (if you have a frontend)
app.use(express.static(path.join(__dirname, 'public')));

// Set the port to 10001 instead of 10000
const PORT = process.env.PORT || 10001;

// PostgreSQL database connection
const dbClient = new Client({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false,
  },
});

dbClient.connect()
  .then(() => console.log('Connected to PostgreSQL'))
  .catch(err => console.error('Error connecting to PostgreSQL', err));

// WebSocket handling
wss.on('connection', ws => {
  ws.on('message', async (message) => {
    console.log('Received:', message);
    try {
      // Insert the received message into the database
      await dbClient.query('INSERT INTO messages (content) VALUES ($1)', [message]);
      console.log('Message inserted into database');
    } catch (error) {
      console.error('Error inserting message into database', error);
    }
  });

  // Send a confirmation message to the client after connection is established
  ws.send('Connected to WebSocket server');
});

// HTTP server to handle WebSocket upgrade
app.server = app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

// Handling WebSocket upgrade request
app.server.on('upgrade', (request, socket, head) => {
  wss.handleUpgrade(request, socket, head, (ws) => {
    wss.emit('connection', ws, request);
  });
});

// Send an HTML file when the root route is accessed
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

module.exports = app;
