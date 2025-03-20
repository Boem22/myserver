const WebSocket = require('ws');
const http = require('http');
const fs = require('fs');
const path = require('path');
const { Client } = require('pg'); // Import PostgreSQL client
require('dotenv').config(); // Load .env file

const PORT = process.env.PORT || 8080;
const DATABASE_URL = process.env.DATABASE_URL;

// PostgreSQL client setup
const client = new Client({
  connectionString: DATABASE_URL,
  ssl: { rejectUnauthorized: false } // Ensure SSL is used and allow self-signed certificates
});

client.connect().then(() => {
  console.log('Connected to PostgreSQL');
}).catch((err) => {
  console.error('Connection error', err.stack);
});

// WebSocket server setup
const server = http.createServer((req, res) => {
  const filePath = path.join(__dirname, 'public', req.url === '/' ? 'index.html' : req.url);
  const ext = path.extname(filePath);
  const contentType = { '.html': 'text/html', '.ttf': 'font/ttf' }[ext] || 'text/plain';
  fs.readFile(filePath, (err, content) => {
    if (err) { res.writeHead(404); res.end('Not found'); }
    else { res.writeHead(200, { 'Content-Type': contentType }); res.end(content); }
  });
});

// WebSocket server setup
const wss = new WebSocket.Server({ server });

wss.on('connection', ws => {
  // Initial data fetch from PostgreSQL
  client.query('SELECT * FROM messages ORDER BY timestamp ASC', (err, result) => {
    if (err) {
      console.error(err);
      return;
    }
    const messages = result.rows;
    ws.send(JSON.stringify({ type: 'init', messages }));
  });

  ws.on('message', rawData => {
    try {
      let m = JSON.parse(rawData.toString());
      if (!m.type) return;

      switch (m.type) {
        case 'comment':
          // Insert the new message into the PostgreSQL database
          client.query('INSERT INTO messages(id, content, timestamp) VALUES($1, $2, $3)', [m.id, m.content, m.timestamp], (err) => {
            if (err) {
              console.error(err);
              return;
            }
            wss.clients.forEach(client => {
              if (client.readyState === WebSocket.OPEN) client.send(JSON.stringify(m));
            });
          });
          break;
        case 'delete_message':
          // Delete the message from PostgreSQL
          client.query('DELETE FROM messages WHERE id = $1', [m.messageId], (err) => {
            if (err) {
              console.error(err);
              return;
            }
            wss.clients.forEach(client => {
              if (client.readyState === WebSocket.OPEN) client.send(JSON.stringify(m));
            });
          });
          break;
      }
    } catch (err) {
      console.error('Error parsing message:', err);
    }
  });
});

// Start the HTTP server
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
