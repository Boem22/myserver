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
  fs.writeFileSync(DATA_FILE, JSON.stringify({ messages: [], levels: [] }));
}

const server = http.createServer((req, res) => {
  if (req.url === '/') {
    fs.readFile(path.join(__dirname, 'index.html'), (err, content) => {
      res.writeHead(err ? 500 : 200, { 'Content-Type': err ? 'text/plain' : 'text/html' });
      res.end(err || content);
    });
  } else {
    res.writeHead(404).end('Not found');
  }
});

const wss = new WebSocket.Server({ server });

wss.on('connection', (ws) => {
  ws.send(JSON.stringify({
    type: 'init',
    messages: data.messages,
    levels: data.levels
  }));

  ws.on('message', (rawData) => {
    const message = JSON.parse(rawData.toString());
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
    fs.writeFileSync(DATA_FILE, JSON.stringify(data));
    wss.clients.forEach(client => client.readyState === WebSocket.OPEN && client.send(JSON.stringify(message)));
  });
});

server.listen(PORT, () => console.log(`Server running on port ${PORT}`));