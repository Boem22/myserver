const WebSocket = require('ws');
const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = process.env.PORT || 8080;
const DATA_FILE = path.join(__dirname, 'data.json');

// Initialize data store
let data = {
  messages: [],
  levels: []
};

// Load existing data
try {
  data = JSON.parse(fs.readFileSync(DATA_FILE));
} catch (err) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(data));
}

// Create HTTP server
const server = http.createServer((req, res) => {
  const filePath = path.join(__dirname, 'public', req.url === '/' ? 'index.html' : req.url);
  const extname = path.extname(filePath);
  const contentType = {
    '.html': 'text/html',
    '.ttf': 'font/ttf',
  }[extname] || 'text/plain';

  fs.readFile(filePath, (err, content) => {
    if (err) {
      res.writeHead(404);
      res.end('Not found');
    } else {
      res.writeHead(200, { 'Content-Type': contentType });
      res.end(content);
    }
  });
});

// WebSocket server
const wss = new WebSocket.Server({ server });

wss.on('connection', (ws) => {
  // Send initial state
  ws.send(JSON.stringify({
    type: 'init',
    messages: data.messages,
    levels: data.levels
  }));

  // Handle messages
  ws.on('message', (rawData) => {
    try {
      const message = JSON.parse(rawData.toString());
      
      // Validate message format
      if (!message.type) throw new Error('Invalid message format');
      
      // Process message
      switch (message.type) {
        case 'comment':
          data.messages.push(message);
          break;
        case 'new_level':
          if (!data.levels.some(l => l.id === message.level.id)) {
            data.levels.push(message.level);
          }
          break;
        case 'delete_message':
          data.messages = data.messages.filter(m => m.id !== message.messageId);
          break;
        case 'delete_level':
          data.levels = data.levels.filter(l => l.id !== message.levelId);
          break;
      }

      // Persist data
      fs.writeFileSync(DATA_FILE, JSON.stringify(data));
      
      // Broadcast to all clients
      wss.clients.forEach(client => {
        if (client !== ws && client.readyState === WebSocket.OPEN) {
          client.send(JSON.stringify(message));
        }
      });
    } catch (err) {
      console.error('Message handling error:', err);
    }
  });
});

// Start server
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`WebSocket: wss://localhost:${PORT}`);
});