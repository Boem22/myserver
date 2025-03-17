const express = require('express');
const WebSocket = require('ws');
const app = express();
const port = process.env.PORT || 3000;

app.use(express.static('public'));

const server = app.listen(port, () => {
    console.log(`Server running on port ${port}`);
});

const wss = new WebSocket.Server({ server });
const messages = [];

wss.on('connection', (ws) => {
    ws.send(JSON.stringify(messages));
    
    ws.on('message', (data) => {
        const message = JSON.parse(data);
        message.date = new Date().toLocaleString();
        messages.push(message);
        wss.clients.forEach(client => {
            if (client.readyState === WebSocket.OPEN) {
                client.send(JSON.stringify([message]));
            }
        });
    });
});