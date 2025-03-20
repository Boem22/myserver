const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const { Client } = require('pg');
const dotenv = require('dotenv');

// Load environment variables from .env file (if needed)
dotenv.config();

// Create an Express app
const app = express();

// (Optional) Serve static files from the "public" directory
app.use(express.static('public'));

// Create HTTP server using the Express app
const server = http.createServer(app);

// Use the port provided by Render (or default to 3000 for local testing)
const port = process.env.PORT || 3000;

// Create WebSocket server attached to the HTTP server
const wss = new WebSocket.Server({ noServer: true });

// PostgreSQL database connection using your Neon credentials
const dbClient = new Client({
  host: 'ep-floral-sea-a2pc4f5q-pooler.eu-central-1.aws.neon.tech',
  port: 5432,
  user: 'neondb_owner',
  password: 'npg_sCWzV6b9pTdv',
  database: 'neondb',
  ssl: {
    rejectUnauthorized: false, // Required for Neon platform
  }
});

// Connect to PostgreSQL
dbClient.connect()
  .then(() => console.log('Connected to PostgreSQL database'))
  .catch(err => console.error('Database connection error:', err.stack));

// Handle WebSocket connections
wss.on('connection', (ws) => {
  console.log('A new WebSocket client connected');

  // Handle incoming messages from WebSocket clients
  ws.on('message', async (message) => {
    const parsedMessage = JSON.parse(message);

    switch (parsedMessage.type) {
      case 'comment': {
        const { content, timestamp, source } = parsedMessage;
        try {
          const res = await dbClient.query(
            'INSERT INTO messages(content, timestamp, source) VALUES($1, $2, $3) RETURNING *',
            [content, timestamp, source]
          );
          console.log('Inserted new comment:', res.rows[0]);
        } catch (err) {
          console.error('Error inserting new comment:', err);
        }
        break;
      }
      case 'new_level': {
        const { level } = parsedMessage;
        try {
          const res = await dbClient.query(
            'INSERT INTO levels(id, name) VALUES($1, $2) RETURNING *',
            [level.id, level.name]
          );
          console.log('Inserted new level:', res.rows[0]);
        } catch (err) {
          console.error('Error inserting new level:', err);
        }
        break;
      }
      case 'delete_level': {
        const { levelId } = parsedMessage;
        try {
          await dbClient.query('DELETE FROM levels WHERE id = $1', [levelId]);
          console.log('Deleted level with id:', levelId);
        } catch (err) {
          console.error('Error deleting level:', err);
        }
        break;
      }
      case 'delete_message': {
        const { messageId } = parsedMessage;
        try {
          await dbClient.query('DELETE FROM messages WHERE id = $1', [messageId]);
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
      const levelsRes = await dbClient.query('SELECT * FROM levels');
      const levels = levelsRes.rows;
      const messagesRes = await dbClient.query('SELECT * FROM messages');
      const messages = messagesRes.rows;
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
