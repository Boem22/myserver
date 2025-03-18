const WebSocket = require('ws');
const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = process.env.PORT || 8080;
const DATA_FILE = 'data.json';

let data = {};
try {
  data = JSON.parse(fs.readFileSync(DATA_FILE));
} catch (err) {
  if (err.code === 'ENOENT') {
    fs.writeFileSync(DATA_FILE, JSON.stringify({ messages: [], levels: [], levelVotes: {}, userVotes: {} }));
  } else {
    console.error('Error loading data:', err);
  }
}

function saveData() {
  fs.writeFileSync(DATA_FILE, JSON.stringify(data));
}

const server = http.createServer((req, res) => {
  if (req.url === '/') {
    fs.readFile(path.join(__dirname, 'index.html'), (err, content) => {
      if (err) {
        res.writeHead(500, { 'Content-Type': 'text/plain' });
        res.end('Error loading index.html');
      } else {
        res.writeHead(200, { 'Content-Type': 'text/html' });
        res.end(content);
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
    messages: data.messages,
    levels: data.levels,
    levelVotes: data.levelVotes,
    userVotes: data.userVotes
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
        timestamp: Date.now(),
        upvotes: 0,
        downvotes: 0
      };
    }

    switch (message.type) {
      case 'comment':
        data.messages.push(message);
        break;

      case 'new_level':
        if (!data.levels.some(l => l.id === message.level.id)) {
          data.levels.push(message.level);
          data.levelVotes[message.level.id] = { up: 0, down: 0 };
        }
        break;

      case 'vote_level':
        data.levelVotes[message.levelId] = data.levelVotes[message.levelId] || { up: 0, down: 0 };
        data.levelVotes[message.levelId][message.value === 1 ? 'up' : 'down']++;
        break;

      case 'vote_comment':
        // ... (existing comment voting logic)
        break;

      case 'delete_message':
        data.messages = data.messages.filter(m => String(m.id) !== String(message.messageId));
        break;

      case 'delete_level':
        data.levels = data.levels.filter(l => l.id !== message.levelId);
        delete data.levelVotes[message.levelId];
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