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
  levels: []
};

try {
  data = JSON.parse(fs.readFileSync(DATA_FILE));
  console.log(`[SERVER] Loaded ${data.messages.length} messages and ${data.levels.length} levels`);
} catch (err) {
  console.error('[SERVER] Data load error:', err.message);
  fs.writeFileSync(DATA_FILE, JSON.stringify(data));
}

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

const wss = new WebSocket.Server({ server });

wss.on('connection', (ws, req) => {
  connectionCount++;
  const clientIP = req.headers['x-forwarded-for'] || req.socket.remoteAddress;

  ws.on('close', () => {
    connectionCount--;
  });

  ws.on('error', (err) => {
    console.error(`[WS] Error from ${clientIP}:`, err.message);
  });

  ws.send(JSON.stringify({
    type: 'init',
    messages: data.messages,
    levels: data.levels
  }));

  ws.on('message', (rawData) => {
    try {
      let message = JSON.parse(rawData.toString());
      
      // Preserve TurboWarp source
      if (message.content && rawData.toString().includes('turbowarp')) {
        message.source = 'turbowarp';
      }

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

      fs.writeFileSync(DATA_FILE, JSON.stringify(data)));
      
      wss.clients.forEach(client => {
        if (client !== ws && client.readyState === WebSocket.OPEN) {
          client.send(JSON.stringify(message));
        }
      });
    } catch (err) {
      console.error('[WS] Message handling failed:', err);
    }
  });
});

server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});