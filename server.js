require('dotenv').config();
const express = require('express');
const { Pool } = require('pg');
const http = require('http');
const WebSocket = require('ws');

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

// ✅ Connect to PostgreSQL (Neon)
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }, // Prevents self-signed certificate error
});

// ✅ Ensure the "messages" table exists
const createTableQuery = `
  CREATE TABLE IF NOT EXISTS messages (
    id SERIAL PRIMARY KEY,
    username TEXT NOT NULL,
    content TEXT NOT NULL,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  );
`;

pool.query(createTableQuery)
  .then(() => console.log("✅ Messages table is ready"))
  .catch(err => console.error("Table creation error:", err));

// 🌍 Express route (optional)
app.get('/', (req, res) => {
  res.send("WebSocket server is running...");
});

// 🌐 WebSocket Connection Handling
wss.on('connection', (ws) => {
  console.log('🔌 New client connected');

  // 📨 Send message history on connect
  pool.query('SELECT * FROM messages ORDER BY timestamp DESC LIMIT 50')
    .then(result => {
      ws.send(JSON.stringify({ type: 'history', messages: result.rows }));
    })
    .catch(err => console.error('Error fetching messages:', err));

  // 📩 Handle incoming messages
  ws.on('message', async (data) => {
    try {
      const message = JSON.parse(data);
      const { username, content } = message;

      // 📝 Save message to DB
      const insertQuery = 'INSERT INTO messages (username, content) VALUES ($1, $2) RETURNING *';
      const result = await pool.query(insertQuery, [username, content]);

      // 📡 Broadcast new message to all clients
      wss.clients.forEach(client => {
        if (client.readyState === WebSocket.OPEN) {
          client.send(JSON.stringify({ type: 'new_message', message: result.rows[0] }));
        }
      });
    } catch (error) {
      console.error('Message handling error:', error);
    }
  });

  ws.on('close', () => {
    console.log('❌ Client disconnected');
  });
});

// 🚀 Start the server
const PORT = process.env.PORT || 10000;
server.listen(PORT, () => {
  console.log(`✅ Server running on port ${PORT}`);
});
