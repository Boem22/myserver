const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const { Client } = require('pg');

// Initialize Express app
const app = express();
const server = http.createServer(app);

// Create WebSocket server
const wss = new WebSocket.Server({ server });

// PostgreSQL database configuration
const client = new Client({
  user: 'neondb_owner',
  host: 'ep-floral-sea-a2pc4f5q-pooler.eu-central-1.aws.neon.tech',
  database: 'neondb',
  password: 'npg_sCWzV6b9pTdv',
  port: 5432,
  ssl: {
    rejectUnauthorized: false,  // This is required for SSL connections
  }
});

// Connect to PostgreSQL
client.connect()
  .then(() => console.log("Connected to the database"))
  .catch(err => console.error("Error connecting to the database:", err));

// Serve static files from the 'public' folder
app.use(express.static('public'));

// WebSocket connection
wss.on('connection', (ws) => {
  console.log('A new WebSocket client connected');

  // Handle incoming messages from WebSocket clients
  ws.on('message', async (message) => {
    const parsedMessage = JSON.parse(message);

    switch (parsedMessage.type) {
      case 'new_level':
        // Insert new level into the database
        const { level } = parsedMessage;
        try {
          const res = await client.query('INSERT INTO levels(id, name) VALUES($1, $2) RETURNING *', [level.id, level.name]);
          console.log('Inserted new level:', res.rows[0]);
        } catch (err) {
          console.error('Error inserting new level:', err);
        }
        break;

      case 'delete_level':
        // Delete level from the database
        const { levelId } = parsedMessage;
        try {
          const res = await client.query('DELETE FROM levels WHERE id = $1 RETURNING *', [levelId]);
          console.log('Deleted level:', res.rows[0]);
        } catch (err) {
          console.error('Error deleting level:', err);
        }
        break;

      case 'delete_message':
        // Delete message from the database
        const { messageId } = parsedMessage;
        try {
          const res = await client.query('DELETE FROM messages WHERE id = $1 RETURNING *', [messageId]);
          console.log('Deleted message:', res.rows[0]);
        } catch (err) {
          console.error('Error deleting message:', err);
        }
        break;

      case 'comment':
        // Insert comment into the database
        const { content, timestamp, source } = parsedMessage;
        try {
          const res = await client.query('INSERT INTO messages(content, timestamp, source) VALUES($1, $2, $3) RETURNING *', [content, timestamp, source]);
          console.log('Inserted new comment:', res.rows[0]);
        } catch (err) {
          console.error('Error inserting new comment:', err);
        }
        break;

      default:
        console.log('Unknown message type:', parsedMessage.type);
    }
  });

  // Send an initial message to the client
  ws.send(JSON.stringify({ type: 'init', message: 'Welcome to Kip Online Maker!' }));
});

// Start the server
const PORT = process.env.PORT || 10001;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
