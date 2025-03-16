const WebSocket = require('ws');
const port = process.env.PORT || 8080; // Use environment variable or default to 8080

// Create a WebSocket server
const wss = new WebSocket.Server({ port }, () => {
  console.log(`WebSocket server is running on port ${port}`);
});

// Store levels in memory (for demonstration purposes)
let levels = [
  { text: 'Level 1', timestamp: new Date().toISOString(), ratings: [] },
  { text: 'Level 2', timestamp: new Date().toISOString(), ratings: [] },
];

// Handle new client connections
wss.on('connection', (ws) => {
  console.log('New client connected');

  // Send initial levels to the client
  ws.send(JSON.stringify({
    type: 'init',
    levels: levels,
    isAdminLoggedIn: false, // Default admin login status
  }));

  // Handle incoming messages from the client
  ws.on('message', (message) => {
    console.log('Received message from client:', message);

    try {
      const data = JSON.parse(message);

      if (data.type === 'level') {
        // Add the new level to the list
        const newLevel = {
          text: data.text,
          timestamp: new Date().toISOString(),
          ratings: [],
        };
        levels.push(newLevel);

        // Broadcast the new level to all clients
        wss.clients.forEach((client) => {
          if (client.readyState === WebSocket.OPEN) {
            client.send(JSON.stringify({ type: 'level', level: newLevel }));
          }
        });
      } else if (data.type === 'rate') {
        // Handle rating updates
        const { levelId, rating } = data;
        if (levels[levelId]) {
          levels[levelId].ratings.push(rating);

          // Broadcast the updated level to all clients
          wss.clients.forEach((client) => {
            if (client.readyState === WebSocket.OPEN) {
              client.send(JSON.stringify({
                type: 'update',
                level: levels[levelId],
                levelId: levelId,
              }));
            }
          });
        }
      } else if (data.type === 'admin') {
        // Handle admin commands
        if (data.command === 'login') {
          // Simulate admin login (replace with actual authentication logic)
          if (data.username === 'admin' && data.password === 'password') {
            ws.send(JSON.stringify({ type: 'admin', isAdminLoggedIn: true }));
          } else {
            ws.send(JSON.stringify({ type: 'error', message: 'Invalid credentials' }));
          }
        } else if (data.command === 'deleteLevels') {
          // Delete selected levels
          const { levelIds } = data;
          levels = levels.filter((_, index) => !levelIds.includes(index));

          // Broadcast the updated levels to all clients
          wss.clients.forEach((client) => {
            if (client.readyState === WebSocket.OPEN) {
              client.send(JSON.stringify({ type: 'init', levels: levels, isAdminLoggedIn: true }));
            }
          });
        } else if (data.command === 'logout') {
          // Simulate admin logout
          ws.send(JSON.stringify({ type: 'admin', isAdminLoggedIn: false }));
        }
      }
    } catch (error) {
      console.error('Failed to parse client message:', error);
      ws.send(JSON.stringify({ type: 'error', message: 'Invalid message format' }));
    }
  });

  // Handle client disconnection
  ws.on('close', () => {
    console.log('Client disconnected');
  });
});

// Handle server errors
wss.on('error', (error) => {
  console.error('WebSocket server error:', error);
});