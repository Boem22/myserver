const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');

const app = express();
const PORT = 3000;

app.use(cors()); // Allow requests from anywhere
app.use(bodyParser.json());

let messages = []; // Store messages in memory

// Serve the webpage
app.use(express.static('public'));

// API to receive messages
app.post('/send', (req, res) => {
    const { message } = req.body;
    if (message) {
        messages.push(message);
        res.json({ success: true, messages });
    } else {
        res.status(400).json({ success: false, error: "No message provided" });
    }
});

// API to fetch messages
app.get('/messages', (req, res) => {
    res.json(messages);
});

// Start server
app.listen(PORT, '0.0.0.0', () => console.log(`Server running on http://0.0.0.0:${PORT}`));