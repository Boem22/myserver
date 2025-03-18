const WebSocket = require('ws');
const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = process.env.PORT || 8080;
const DATA_FILE = 'data.json';

// Persistent storage
let messageHistory = [];
let levelHistory = [];

function loadData() {
  try {
    const data = fs.readFileSync(DATA_FILE);
    const parsed = JSON.parse(data);
    messageHistory = parsed.messages || [];
    levelHistory = parsed.levels || [];
    console.log('Loaded persistent data');
  } catch (err) {
    if (err.code === 'ENOENT') {
      fs.writeFileSync(DATA_FILE, JSON.stringify({ messages: [], levels: [] }));
      console.log('Created new data file');
    } else {
      console.error('Error loading data:', err);
    }
  }
}

function saveData() {
  fs.writeFileSync(DATA_FILE, JSON.stringify({
    messages: messageHistory,
    levels: levelHistory
  }));
  console.log('Data saved');
}

// Initial data load
loadData();

const server = http.createServer((req, res) => {
  if (req.url === '/') {
    fs.readFile(path.join(__dirname, 'index.html'), (err, data) => {
      if (err) {
        res.writeHead(500, { 'Content-Type': 'text/plain' });
        res.end('Error loading index.html');
      } else {
        res.writeHead(200, { 'Content-Type': 'text/html' });
        res.end(data);
      }
    });
  } else {
    res.writeHead(404, { 'Content-Type': 'text/plain' });
    res.end('Not found');
  }
});

const wss = new WebSocket.Server({ server });
const clients = new Set();

wss.on('connection', (ws) => {
  console.log('New client connected');
  clients.add(ws);

  ws.send(JSON.stringify({
    type: 'init',
    messages: messageHistory,
    levels: levelHistory
  }));

  ws.on('message', (rawData) => {
    let message;
    try {
      message = JSON.parse(rawData.toString());
    } catch {
      message = {
        type: 'comment',
        content: rawData.toString(),
        id: Date.now(),
        timestamp: Date.now()
      };
    }

    switch (message.type) {
      case 'comment':
        message.id = message.id || Date.now();
        message.timestamp = message.timestamp || Date.now();
        messageHistory.push(message);
        break;

      case 'new_level':
        if (!levelHistory.some(l => l.id === message.level.id)) {
          levelHistory.push(message.level);
        }
        break;

      case 'delete_message':
        messageHistory = messageHistory.filter(m => String(m.id) !== String(message.messageId));
        break;

      case 'delete_level':
        levelHistory = levelHistory.filter(l => String(l.id) !== String(message.levelId));
        break;
    }

    saveData();
    clients.forEach(client => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(JSON.stringify(message));
      }
    });
  });

  ws.on('close', () => {
    clients.delete(ws);
    console.log('Client disconnected');
  });
});

server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});