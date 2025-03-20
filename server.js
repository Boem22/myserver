// Import required modules
const express = require('express');
const { Pool } = require('pg');
const WebSocket = require('ws');
require('dotenv').config(); // Load environment variables from .env file

// Initialize Express app
const app = express();

// Set up WebSocket server
const wss = new WebSocket.Server({ noServer: true });

// Create a pool for PostgreSQL database connection using the connection string from environment variables
const pool = new Pool({
  connectionString: process.env.DATABASE_URL, // Ensure this is the correct Neon database URL in .env
  ssl: {
    rejectUnauthorized: false, // For SSL connection to Neon
  },
});

// Verify database connection
pool.connect()
  .then(() => {
    console.log('Connected to PostgreSQL');
  })
  .catch(err => {
    console.error('Error connecting to PostgreSQL:', err);
  });

// Handle WebSocket connections
wss.on('connection', (ws) => {
  console.log('New WebSocket connection');

  // Send a message to the client when the connection is made
  ws.send('Hello from server');

  // Handle messages from the client
  ws.on('message', (message) => {
    console.log('Received message:', message);

    // Store the message in the database
    pool.query('INSERT INTO messages (content) VALUES ($1)', [message], (err, result) => {
      if (err) {
        console.error('Error inserting message:', err);
        ws.send('Error saving message');
      } else {
        console.log('Message saved:', message);
        ws.send('Message saved');
      }
    });
  });

  // Handle WebSocket connection close
  ws.on('close', () => {
    console.log('WebSocket connection closed');
  });
});

// Use WebSocket with the Express server
app.server = app.listen(10000, () => {
  console.log('Server running on port 10000');
});

// Handle WebSocket upgrade
app.server.on('upgrade', (request, socket, head) => {
  wss.handleUpgrade(request, socket, head, (ws) => {
    wss.emit('connection', ws, request);
  });
});

// Endpoint to check if the app is live
app.get('/', (req, res) => {
  res.send('Server is live!');
});
