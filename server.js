const WebSocket = require('ws');
const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = process.env.PORT || 8080;
const DATA_FILE = path.join(__dirname, 'data.json');
let connectionCount = 0;

// Initialize data store
let data = {
  messages: [],
  levels: [],
  levelVotes: {},
  userVotes: {}
};

try {
  data = JSON.parse(fs.readFileSync(DATA_FILE));
  console.log(`[SERVER] Loaded ${data.messages.length} messages and ${data.levels.length} levels`);
} catch (err) {
  console.error('[SERVER] Data load error:', err.message);
  fs.writeFileSync(DATA_FILE, JSON.stringify(data));
}

const server = http.createServer((req, res) => {
  console.log(`[HTTP] ${req.method} ${req.url} from ${req.socket.remoteAddress}`);
  
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

const wss = new WebSocket.Server({ server });

wss.on('connection', (ws, req) => {
  connectionCount++;
  const clientIP = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
  console.log(`[WS] New connection from ${clientIP}. Active: ${connectionCount}`);

  ws.on('close', () => {
    connectionCount--;
    console.log(`[WS] Connection closed from ${clientIP}. Remaining: ${connectionCount}`);
  });

  ws.on('error', (err) => {
    console.error(`[WS] Error from ${clientIP}:`, err.message);
  });

  // Send initial state
  ws.send(JSON.stringify({
    type: 'init',
    messages: data.messages,
    levels: data.levels
  }));

  ws.on('message', (rawData) => {
    try {
      let message;
      
      // Handle both JSON and raw TurboWarp messages
      try {
        message = JSON.parse(rawData.toString());
      } catch (jsonError) {
        console.log('[TURBOWARP] Received raw message:', rawData.toString());
        message = {
          type: 'comment',
          content: rawData.toString(),
          id: Date.now(),
          timestamp: Date.now(),
          source: 'turbowarp',
          isAdminControlled: true
        };
      }

      console.log(`[WS] Received ${message.type} from ${clientIP}`);

      // Message processing
      switch (message.type) {
        case 'comment':
          if (!data.messages.some(m => m.id === message.id)) {
            data.messages.push(message);
          }
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

      fs.writeFileSync(DATA_FILE, JSON.stringify(data));
      
      // Broadcast to all clients
      wss.clients.forEach(client => {
        if (client.readyState === WebSocket.OPEN) {
          client.send(JSON.stringify(message));
        }
      });
    } catch (err) {
      console.error('[ERROR] Message handling failed:', err);
    }
  });
});

server.listen(PORT, () => {
  console.log(`[SERVER] Running on port ${PORT}`);
});