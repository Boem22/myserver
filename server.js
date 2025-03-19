const WebSocket = require('ws');
const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = process.env.PORT || 8080;
const DATA_FILE = path.join(__dirname, 'data.json');

let data = { messages: [], levels: [] };

try {
  data = JSON.parse(fs.readFileSync(DATA_FILE));
} catch (err) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(data));
}

const server = http.createServer((req, res) => {
  const filePath = path.join(__dirname, 'public', req.url === '/' ? 'index.html' : req.url);
  const ext = path.extname(filePath);
  const contentType = { '.html': 'text/html', '.ttf': 'font/ttf' }[ext] || 'text/plain';
  fs.readFile(filePath, (err, content) => {
    if (err) { res.writeHead(404); res.end('Not found'); }
    else { res.writeHead(200, { 'Content-Type': contentType }); res.end(content); }
  });
});

const wss = new WebSocket.Server({ server });

wss.on('connection', ws => {
  ws.send(JSON.stringify({ type: 'init', messages: data.messages, levels: data.levels }));
  ws.on('message', rawData => {
    try {
      let m = JSON.parse(rawData.toString());
      if (!m.type) return;
      switch (m.type) {
        case 'comment':
          if (!data.messages.some(x => x.id === m.id)) data.messages.push(m);
          break;
        case 'new_level':
          if (!data.levels.some(x => x.id === m.level.id)) data.levels.push(m.level);
          break;
        case 'delete_message':
          data.messages = data.messages.filter(x => x.id !== m.messageId);
          break;
        case 'delete_level':
          data.levels = data.levels.filter(x => x.id !== m.levelId);
          break;
      }
      fs.writeFileSync(DATA_FILE, JSON.stringify(data));
      wss.clients.forEach(client => { if (client.readyState === WebSocket.OPEN) client.send(JSON.stringify(m)); });
    } catch (err) {
      try {
        const m = { type: 'comment', content: rawData.toString(), id: Date.now(), timestamp: Date.now(), source: 'turbowarp' };
        if (!data.messages.some(x => x.id === m.id)) {
          data.messages.push(m);
          fs.writeFileSync(DATA_FILE, JSON.stringify(data));
          wss.clients.forEach(client => { if (client.readyState === WebSocket.OPEN) client.send(JSON.stringify(m)); });
        }
      } catch (parseError) {}
    }
  });
});

server.listen(PORT);
