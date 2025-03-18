const WebSocket = require('ws');
const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = process.env.PORT || 8080;
const DATA_FILE = 'data.json';

// Persistent storage
let messageHistory = [];
let levelHistory = [];
let levelVotes = {};
let userVotes = {};

function loadData() {
  try {
    const data = fs.readFileSync(DATA_FILE);
    const parsed = JSON.parse(data);
    messageHistory = parsed.messages || [];
    levelHistory = parsed.levels || [];
    levelVotes = parsed.levelVotes || {};
    userVotes = parsed.userVotes || {};
    console.log('Loaded persistent data');
  } catch (err) {
    if (err.code === 'ENOENT') {
      fs.writeFileSync(DATA_FILE, JSON.stringify({ messages: [], levels: [], levelVotes: {}, userVotes: {} }));
      console.log('Created new data file');
    } else {
      console.error('Error loading data:', err);
    }
  }
}

function saveData() {
  fs.writeFileSync(DATA_FILE, JSON.stringify({
    messages: messageHistory,
    levels: levelHistory,
    levelVotes: levelVotes,
    userVotes: userVotes
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
    levels: levelHistory,
    levelVotes: levelVotes,
    userVotes: userVotes
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
        message.id = message.id || Date.now();
        message.timestamp = message.timestamp || Date.now();
        message.upvotes = message.upvotes || 0;
        message.downvotes = message.downvotes || 0;
        messageHistory.push(message);
        break;

      case 'new_level':
        if (!levelHistory.some(l => l.id === message.level.id)) {
          levelHistory.push(message.level);
          levelVotes[message.level.id] = { up: 0, down: 0 };
        }
        break;

      case 'vote_level':
        levelVotes[message.levelId] = levelVotes[message.levelId] || { up: 0, down: 0 };
        levelVotes[message.levelId][message.value === 1 ? 'up' : 'down']++;
        break;

      case 'vote_comment':
        const comment = messageHistory.find(m => m.id === message.messageId);
        if (comment) {
          if (message.value === 1) comment.upvotes++;
          else comment.downvotes++;
        }
        break;

      case 'delete_message':
        messageHistory = messageHistory.filter(m => String(m.id) !== String(message.messageId));
        break;

      case 'delete_level':
        levelHistory = levelHistory.filter(l => String(l.id) !== String(message.levelId));
        delete levelVotes[message.levelId];
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