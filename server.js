const WebSocket = require('ws');
const { Client } = require('pg');

// Database connection
const client = new Client({
  host: 'ep-floral-sea-a2pc4f5q-pooler.eu-central-1.aws.neon.tech',
  port: 5432,
  user: 'neondb_owner',
  password: 'npg_sCWzV6b9pTdv',
  database: 'neondb',
  ssl: {
    rejectUnauthorized: false, // Required for Neon platform (or other SSL-enabled services)
  }
});

// Connect to the PostgreSQL database
client.connect()
  .then(() => console.log('Connected to PostgreSQL database'))
  .catch(err => console.error('Database connection error:', err.stack));

// Create WebSocket server
const wss = new WebSocket.Server({ port: 10001 });

// Handle WebSocket connections
wss.on('connection', (ws) => {
  console.log('A new WebSocket client connected');

  // Handle incoming messages from WebSocket clients
  ws.on('message', async (message) => {
    const parsedMessage = JSON.parse(message);

    switch (parsedMessage.type) {
      case 'comment':
        const { content, timestamp, source } = parsedMessage;
        try {
          const res = await client.query('INSERT INTO messages(content, timestamp, source) VALUES($1, $2, $3) RETURNING *', [content, timestamp, source]);
          console.log('Inserted new comment:', res.rows[0]);
        } catch (err) {
          console.error('Error inserting new comment:', err);
        }
        break;

      case 'new_level':
        const { level } = parsedMessage;
        try {
          const res = await client.query('INSERT INTO levels(id, name) VALUES($1, $2) RETURNING *', [level.id, level.name]);
          console.log('Inserted new level:', res.rows[0]);
        } catch (err) {
          console.error('Error inserting new level:', err);
        }
        break;

      case 'delete_level':
        const { levelId } = parsedMessage;
        try {
          await client.query('DELETE FROM levels WHERE id = $1', [levelId]);
          console.log('Deleted level with id:', levelId);
        } catch (err) {
          console.error('Error deleting level:', err);
        }
        break;

      case 'delete_message':
        const { messageId } = parsedMessage;
        try {
          await client.query('DELETE FROM messages WHERE id = $1', [messageId]);
          console.log('Deleted message with id:', messageId);
        } catch (err) {
          console.error('Error deleting message:', err);
        }
        break;

      default:
        console.log('Unknown message type:', parsedMessage.type);
    }
  });

  // Send initial data to new WebSocket client
  const sendInitialData = async () => {
    try {
      const levelsRes = await client.query('SELECT * FROM levels');
      const levels = levelsRes.rows;

      const messagesRes = await client.query('SELECT * FROM messages');
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

  // Send initial data on connection
  sendInitialData();
});

console.log('WebSocket server running on ws://localhost:10001');
