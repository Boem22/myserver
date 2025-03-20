const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const { Pool } = require('pg');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

// Create an Express app
const app = express();
app.use(express.static('public'));

// Create HTTP server
const server = http.createServer(app);
const port = process.env.PORT || 3000;

// Create WebSocket server
const wss = new WebSocket.Server({ noServer: true });

// PostgreSQL connection pool
const pool = new Pool({
  host: 'ep-floral-sea-a2pc4f5q-pooler.eu-central-1.aws.neon.tech',
  port: 5432,
  user: 'neondb_owner',
  password: 'npg_sCWzV6b9pTdv',
  database: 'neondb',
  ssl: { rejectUnauthorized: false },
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

// Helper function for executing database queries
const handleDatabaseQuery = async (query, params) => {
  try {
    const result = await pool.query(query, params);
    return result.rows;
  } catch (err) {
    console.error('Database Error:', err.stack);
    return [];
  }
};

// Handle WebSocket connections
wss.on('connection', (ws) => {
  console.log('New WebSocket client connected');

  ws.on('message', async (message) => {
    console.log('Received message:', message.toString());

    let parsedMessage;
    try {
      parsedMessage = JSON.parse(message);
    } catch {
      parsedMessage = { type: 'comment', content: message.toString(), timestamp: new Date() };
    }

    switch (parsedMessage.type) {
      case 'comment': {
        const { content, timestamp } = parsedMessage;
        console.log('Inserting comment:', content);
        try {
          const res = await handleDatabaseQuery(
            'INSERT INTO messages (content, timestamp) VALUES ($1, $2) RETURNING *',
            [content, new Date(timestamp)]
          );
          console.log('Inserted:', res[0]);
        } catch (err) {
          console.error('Error inserting comment:', err);
        }
        break;
      }

      case 'new_level': {
        const { level } = parsedMessage;
        if (!level || !level.id || !level.name) {
          console.error('Invalid level format:', level);
          break;
        }
        console.log('Inserting level:', level.id, level.name);
        try {
          const res = await handleDatabaseQuery(
            'INSERT INTO levels (id, name) VALUES ($1, $2) RETURNING *',
            [level.id, level.name]
          );
          console.log('Inserted level:', res[0]);
        } catch (err) {
          console.error('Error inserting level:', err);
        }
        break;
      }

      case 'delete_level': {
        const { levelId } = parsedMessage;
        console.log('Deleting level:', levelId);
        try {
          await handleDatabaseQuery('DELETE FROM levels WHERE id = $1', [levelId]);
          console.log('Deleted level:', levelId);
        } catch (err) {
          console.error('Error deleting level:', err);
        }
        break;
      }

      case 'delete_message': {
        const { messageId } = parsedMessage;
        console.log('Deleting message:', messageId);
        try {
          await handleDatabaseQuery('DELETE FROM messages WHERE id = $1', [messageId]);
          console.log('Deleted message:', messageId);
        } catch (err) {
          console.error('Error deleting message:', err);
        }
        break;
      }

      default:
        console.log('Unknown message type:', parsedMessage.type);
    }
  });

  // Send initial data to client
  const sendInitialData = async () => {
    try {
      const levels = await handleDatabaseQuery('SELECT * FROM levels');
      const messages = await handleDatabaseQuery('SELECT * FROM messages');
      ws.send(JSON.stringify({ type: 'init', levels, messages }));
    } catch (err) {
      console.error('Error fetching initial data:', err);
    }
  };

  sendInitialData();
});

// Handle WebSocket upgrade requests
server.on('upgrade', (request, socket, head) => {
  wss.handleUpgrade(request, socket, head, (ws) => {
    wss.emit('connection', ws, request);
  });
});

// Start server
server.listen(port, () => {
  console.log(`Server running on port ${port}`);
});

console.log('WebSocket server ready (wss://yourserver.onrender.com)');
