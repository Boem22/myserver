const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const { Pool } = require('pg');
const dotenv = require('dotenv');

// Load environment variables from .env file
dotenv.config();

// Create an Express app
const app = express();
app.use(express.static('public')); // Serve static files from "public"

// Create HTTP server using the Express app
const server = http.createServer(app);

// Use the port provided by Render or default to 3000 for local testing
const port = process.env.PORT || 3000;

// Create WebSocket server attached to the HTTP server (for upgrade requests)
const wss = new WebSocket.Server({ noServer: true });

// PostgreSQL connection pool using Neon credentials
const pool = new Pool({
  host: 'ep-floral-sea-a2pc4f5q-pooler.eu-central-1.aws.neon.tech',
  port: 5432,
  user: 'neondb_owner',
  password: 'npg_sCWzV6b9pTdv',
  database: 'neondb',
  ssl: {
    rejectUnauthorized: false, // Allow self-signed certificates
  },
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

// Helper function for executing queries
const handleDatabaseQuery = async (query, params) => {
  try {
    const result = await pool.query(query, params);
    return result.rows;
  } catch (err) {
    console.error('Error executing query:', err.stack);
    return [];
  }
};

// Handle WebSocket connections
wss.on('connection', (ws) => {
  console.log('A new WebSocket client connected');

  ws.on('message', async (message) => {
    console.log('Received raw message:', message);
    let parsedMessage;
    try {
      parsedMessage = JSON.parse(message);
    } catch (err) {
      console.error('Error parsing message:', err);
      return;
    }

    switch (parsedMessage.type) {
      case 'comment': {
        const { content, timestamp, source } = parsedMessage;
        console.log('Inserting comment with content:', content);
        try {
          const res = await handleDatabaseQuery(
            'INSERT INTO messages(content, timestamp, source) VALUES($1, $2, $3) RETURNING *',
            [content, timestamp, source]
          );
          console.log('Inserted new comment:', res[0]);
        } catch (err) {
          console.error('Error inserting new comment:', err);
        }
        break;
      }
      case 'new_level': {
        const { level } = parsedMessage;
        console.log('Inserting new level with id:', level.id, 'and name:', level.name);
        try {
          const res = await handleDatabaseQuery(
            'INSERT INTO levels(id, name) VALUES($1, $2) RETURNING *',
            [level.id, level.name]
          );
          console.log('Inserted new level:', res[0]);
        } catch (err) {
          console.error('Error inserting new level:', err);
        }
        break;
      }
      case 'delete_level': {
        const { levelId } = parsedMessage;
        console.log('Deleting level with id:', levelId);
        try {
          await handleDatabaseQuery('DELETE FROM levels WHERE id = $1', [levelId]);
          console.log('Deleted level with id:', levelId);
        } catch (err) {
          console.error('Error deleting level:', err);
        }
        break;
      }
      case 'delete_message': {
        const { messageId } = parsedMessage;
        console.log('Deleting message with id:', messageId);
        try {
          await handleDatabaseQuery('DELETE FROM messages WHERE id = $1', [messageId]);
          console.log('Deleted message with id:', messageId);
        } catch (err) {
          console.error('Error deleting message:', err);
        }
        break;
      }
      default:
        console.log('Unknown message type:', parsedMessage.type);
    }
  });

  // Send initial data to the new WebSocket client
  const sendInitialData = async () => {
    try {
      const levels = await handleDatabaseQuery('SELECT * FROM levels');
      const messages = await handleDatabaseQuery('SELECT * FROM messages');
      const initData = {
        type: 'init',
        levels,
        messages,
      };
      ws.send(JSON.stringify(initData));
    } catch (err) {
      console.error('Error fetching initial data:', err);
    }
  };

  sendInitialData();
});

// Handle HTTP upgrade requests for WebSocket connections
server.on('upgrade', (request, socket, head) => {
  wss.handleUpgrade(request, socket, head, (ws) => {
    wss.emit('connection', ws, request);
  });
});

// Start the HTTP server
server.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});

console.log('WebSocket server is ready (clients should connect via wss://myserver-1jxx.onrender.com)');
