const WebSocket = require('ws');
const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = process.env.PORT || 8080;
const DATA_FILE = path.join(__dirname, 'data.json');
let connectionCount = 0; // Track active connections

// Initialize data store
let data = {
  messages: [],
  levels: [],
  levelVotes: {},
  userVotes: {}
};

// Enhanced data loading
try {
  data = JSON.parse(fs.readFileSync(DATA_FILE));
  console.log(`[SERVER] Loaded ${data.messages.length} messages and ${data.levels.length} levels`);
} catch (err) {
  console.error('[SERVER] Data load error:', err.message);
  fs.writeFileSync(DATA_FILE, JSON.stringify(data));
  console.log('[SERVER] Created new data file');
}

// Create HTTP server
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

// WebSocket server with connection tracking
const wss = new WebSocket.Server({ server });

wss.on('connection', (ws, req) => {
  connectionCount++;
  const clientIP = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
  const userAgent = req.headers['user-agent'];
  console.log(`[WS] New connection from ${clientIP} (${userAgent}). Active connections: ${connectionCount}`);

  ws.on('close', () => {
    connectionCount--;
    console.log(`[WS] Connection closed from ${clientIP}. Remaining: ${connectionCount}`);
  });

  ws.on('error', (err) => {
    console.error(`[WS] Error from ${clientIP}:`, err.message);
  });

  // Send initial state
  try {
    ws.send(JSON.stringify({
      type: 'init',
      messages: data.messages,
      levels: data.levels
    }));
    console.log(`[WS] Sent initial state to ${clientIP}`);
  } catch (err) {
    console.error(`[WS] Error sending initial state to ${clientIP}:`, err.message);
  }

  ws.on('message', (rawData) => {
    try {
      const message = JSON.parse(rawData.toString());
      console.log(`[WS] Received ${message.type} from ${clientIP}`);

      // Specific logging for TurboWarp messages
      if (message.type === 'comment') {
        console.log('[TURBOWARP] Message details:', {
          id: message.id,
          content: message.content.substring(0, 50) + (message.content.length > 50 ? '...' : ''), // Truncate long messages
          timestamp: new Date(message.timestamp).toISOString(),
          client: clientIP
        });
      }

      // Message processing
      let action = 'processed';
      try {
        switch (message.type) {
          case 'comment':
            if (!data.messages.some(m => m.id === message.id)) {
              data.messages.push(message);
              action = 'stored';
            }
            break;

          case 'new_level':
            if (!data.levels.some(l => l.id === message.level.id)) {
              data.levels.push(message.level);
              action = 'stored';
            }
            break;

          case 'delete_message':
            data.messages = data.messages.filter(m => m.id !== message.messageId);
            break;

          case 'delete_level':
            data.levels = data.levels.filter(l => l.id !== message.levelId);
            break;

          default:
            console.warn(`[WS] Unknown message type from ${clientIP}:`, message.type);
        }

        // Save data
        fs.writeFileSync(DATA_FILE, JSON.stringify(data));
        console.log(`[DATA] ${action} ${message.type} from ${clientIP}`);

        // Broadcast to all clients
        wss.clients.forEach(client => {
          if (client.readyState === WebSocket.OPEN) {
            client.send(JSON.stringify(message));
          }
        });
        console.log(`[BROADCAST] Sent ${message.type} to ${wss.clients.size} clients`);

      } catch (processError) {
        console.error(`[PROCESS] Error handling ${message.type} from ${clientIP}:`, processError);
      }

    } catch (parseError) {
      console.error(`[PARSE] Error from ${clientIP}:`, {
        error: parseError.message,
        rawData: rawData.toString().substring(0, 100) + (rawData.length > 100 ? '...' : '')
      });
    }
  });
});

// Add connection logging endpoint
server.on('request', (req, res) => {
  if (req.url === '/log' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => body += chunk.toString());
    req.on('end', () => {
      console.log('[CLIENT]', body);
      res.end();
    });
  }
});

server.listen(PORT, () => {
  console.log(`[SERVER] Running on port ${PORT}`);
  console.log(`[SERVER] WebSocket endpoint: wss://localhost:${PORT}`);
  console.log(`[SERVER] Active connections: ${connectionCount}`);
});