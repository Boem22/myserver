const WebSocket = require('ws');
const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = process.env.PORT || 8080;
const DATA_FILE = path.join(__dirname, 'data.json');

// Initialize data store
let data = {
  messages: [],
  levels: [],
  levelVotes: {},
  userVotes: {}
};

// Load existing data
try {
  data = JSON.parse(fs.readFileSync(DATA_FILE));
  console.log('[SERVER] Loaded existing data from', DATA_FILE);
} catch (err) {
  console.error('[SERVER] Data load error:', err.message);
  fs.writeFileSync(DATA_FILE, JSON.stringify(data));
  console.log('[SERVER] Created new data file');
}

// Create HTTP server
const server = http.createServer((req, res) => {
  console.log(`[HTTP] ${req.method} ${req.url}`);
  const filePath = path.join(__dirname, 'public', req.url === '/' ? 'index.html' : req.url);
  const extname = path.extname(filePath);
  const contentType = {
    '.html': 'text/html',
    '.ttf': 'font/ttf',
  }[extname] || 'text/plain';

  fs.readFile(filePath, (err, content) => {
    if (err) {
      console.warn('[HTTP] File not found:', filePath);
      res.writeHead(404);
      res.end('Not found');
    } else {
      console.log('[HTTP] Serving file:', filePath);
      res.writeHead(200, { 'Content-Type': contentType });
      res.end(content);
    }
  });
});

// WebSocket server
const wss = new WebSocket.Server({ server });

wss.on('connection', (ws) => {
  console.log('[WS] New connection');
  
  ws.on('close', () => console.log('[WS] Connection closed'));
  ws.on('error', (err) => console.error('[WS] Error:', err));

  // Send initial state
  try {
    ws.send(JSON.stringify({
      type: 'init',
      messages: data.messages,
      levels: data.levels
    }));
    console.log('[WS] Sent initial state');
  } catch (err) {
    console.error('[WS] Initial state error:', err);
  }

  ws.on('message', (rawData) => {
    try {
      console.log('[WS] Raw message received:', rawData.toString());
      
      const message = typeof rawData === 'string' 
        ? JSON.parse(rawData)
        : JSON.parse(rawData.toString());

      console.log('[WS] Parsed message:', message);

      if (!message.type) {
        console.warn('[WS] Missing message type');
        throw new Error('Invalid message format');
      }

      // Message processing
      let action = 'Unknown';
      try {
        switch (message.type) {
          case 'comment':
            action = 'New comment';
            if (!data.messages.some(m => m.id === message.id)) {
              data.messages.push(message);
              console.log(`[WS] Stored new comment (ID: ${message.id})`);
            }
            break;

          case 'new_level':
            action = 'New level';
            if (!data.levels.some(l => l.id === message.level.id)) {
              data.levels.push(message.level);
              console.log(`[WS] Stored new level (ID: ${message.level.id})`);
            }
            break;

          case 'delete_message':
            action = 'Delete message';
            data.messages = data.messages.filter(m => m.id !== message.messageId);
            console.log(`[WS] Deleted message (ID: ${message.messageId})`);
            break;

          case 'delete_level':
            action = 'Delete level';
            data.levels = data.levels.filter(l => l.id !== message.levelId);
            console.log(`[WS] Deleted level (ID: ${message.levelId})`);
            break;

          default:
            console.warn('[WS] Unknown message type:', message.type);
        }

        // Save data
        fs.writeFileSync(DATA_FILE, JSON.stringify(data));
        console.log('[WS] Data saved successfully');

        // Broadcast to all clients
        wss.clients.forEach(client => {
          if (client.readyState === WebSocket.OPEN) {
            client.send(JSON.stringify(message));
          }
        });
        console.log(`[WS] Broadcasted ${message.type} to ${wss.clients.size} clients`);

      } catch (processError) {
        console.error('[WS] Processing error:', processError);
      }

    } catch (parseError) {
      console.error('[WS] Parse error:', parseError.message);
      console.error('[WS] Original data:', rawData.toString());
    }
  });
});

server.listen(PORT, () => {
  console.log(`[SERVER] Running on port ${PORT}`);
  console.log(`[SERVER] WebSocket: wss://localhost:${PORT}`);
});