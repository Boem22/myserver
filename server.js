const express = require('express');
const app = express();
const PORT = process.env.PORT || 3000;

// Middleware to parse JSON bodies
app.use(express.json());

// Serve static files (e.g., index.html)
app.use(express.static('public')); // Assuming your index.html is in a "public" folder

// Store messages in memory (for simplicity)
let messages = [];

// Route to receive messages
app.post('/message', (req, res) => {
  const { text } = req.body;
  if (!text) {
    return res.status(400).send('Message text is required');
  }

  // Save the message
  messages.push({ text, timestamp: new Date() });
  res.send('Message received!');
});

// Route to display messages
app.get('/messages', (req, res) => {
  res.json(messages);
});

// Start the server
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});