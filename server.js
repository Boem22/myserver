const WebSocket = require('ws');
const { Client } = require('pg');
const express = require('express');
const dotenv = require('dotenv');

// Load environment variables from the .env file
dotenv.config();

// Setup Express (optional for serving static files, etc.)
const app = express();
const port = 10000;
app.listen(port, () => {
    console.log(`Server running on port ${port}`);
});

// Set up WebSocket server
const wss = new WebSocket.Server({ noServer: true });

// Set up PostgreSQL connection
const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: {
        rejectUnauthorized: false, // Disable SSL certificate validation for Neon
    }
});

client.connect()
    .then(() => {
        console.log('Connected to PostgreSQL');
    })
    .catch((err) => {
        console.error('Database connection error:', err);
    });

// WebSocket connection handler
wss.on('connection', (ws) => {
    console.log('Client connected');
    
    // Handle incoming message from client
    ws.on('message', async (data) => {
        try {
            const parsedData = JSON.parse(data);
            const { message } = parsedData;  // Assume the message is passed as { message: 'text' }

            console.log('Message received:', message);

            // Insert message into the PostgreSQL database
            const insertMessageQuery = 'INSERT INTO messages (message, sent_at) VALUES ($1, $2)';
            const values = [message, new Date()];
            await client.query(insertMessageQuery, values);
            console.log('Message inserted into the database');

            // Broadcast the message to all connected clients
            wss.clients.forEach((client) => {
                if (client.readyState === WebSocket.OPEN) {
                    client.send(JSON.stringify({ message }));
                }
            });
        } catch (err) {
            console.error('Error handling message:', err);
        }
    });

    ws.on('close', () => {
        console.log('Client disconnected');
    });
});

// Handle the WebSocket upgrade on the Express server
app.server = app.listen(port, () => {
    console.log(`Express server running on port ${port}`);
});

app.server.on('upgrade', (request, socket, head) => {
    wss.handleUpgrade(request, socket, head, (ws) => {
        wss.emit('connection', ws, request);
    });
});
