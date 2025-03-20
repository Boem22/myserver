const express = require('express');
const { Client } = require('pg');
const dotenv = require('dotenv');
const path = require('path');
const WebSocket = require('ws');

// Load environment variables from .env file
dotenv.config();

// Create an Express app
const app = express();
const port = process.env.PORT || 10000;

// Set up PostgreSQL client connection
const client = new Client({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

client.connect()
  .then(() => console.log('Connected to PostgreSQL'))
  .catch((err) => console.error('Connection error', err.stack));

// Serve static files (HTML, CSS, JS, etc.) from the "public" directory
app.use(express.static(path.join(__dirname, 'public')));

// Database query example
app.get('/messages', async (req, res) => {
  try {
    const result = await client.query('SELECT * FROM messages');
    res.json(result.rows); // Sends the data as JSON
  } catch (err) {
    console.error('Database query error:', err);
    res.status(500).send('Error querying the database');
  }
});

// WebSocket setup for real-time communication
const wss = new WebSocket.Server({ noServer: true });

wss.on('connection', (ws) => {
  console.log('WebSocket connected');
  ws.on('message', (message) => {
    console.log('Received message:', message);
  });
});

app.on('upgrade', (request, socket, head) => {
  wss.handleUpgrade(request, socket, head, (ws) => {
    wss.emit('connection', ws, request);
  });
});

// Set up route for the home page (index.html)
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html')); // Make sure this file exists in the public folder
});

// Start the Express server
app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
