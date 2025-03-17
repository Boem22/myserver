const express = require('express');
const WebSocket = require('ws');
const path = require('path');

const app = express();
const port = process.env.PORT || 3000;

// Serve static files from "public" folder
app.use(express.static(path.join(__dirname, 'public')));

const server = app.listen(port, () => {
    console.log(`Server is running on http://localhost:${port}`);
});

const wss = new WebSocket.Server({ server });
const messages = [];

wss.on('connection', (ws) => {
    console.log('New client connected');

    // Send all existing messages to the client
    ws.send(JSON.stringify({ type: "messages", messages: messages }));

    ws.on('message', (data) => {
        console.log('Received:', data);
        try {
            const message = JSON.parse(data);

            if (message.type === 'newMessage') {
                // Create a new message object
                const newMessage = {
                    id: Date.now().toString(),
                    text: message.text,
                    date: new Date().toLocaleString(),
                    rating: 0,
                    voters: {},
                    avgRating: 0, // Initial average rating
                };
                messages.push(newMessage);

                // Broadcast the new message to all clients
                wss.clients.forEach(client => {
                    if (client.readyState === WebSocket.OPEN) {
                        client.send(JSON.stringify({ type: "newMessage", message: newMessage }));
                    }
                });

            } else if (message.type === 'updateRating') {
                // Update the rating of a message
                const msgToUpdate = messages.find(msg => msg.id === message.id);
                if (msgToUpdate && !msgToUpdate.voters[message.userId]) {
                    msgToUpdate.voters[message.userId] = message.rating;
                    msgToUpdate.rating = calculateAverageRating(msgToUpdate.voters); // Update average rating

                    // Broadcast the updated message to all clients
                    wss.clients.forEach(client => {
                        if (client.readyState === WebSocket.OPEN) {
                            client.send(JSON.stringify({
                                type: "updateRating",
                                id: msgToUpdate.id,
                                rating: msgToUpdate.rating,
                                voters: msgToUpdate.voters,
                                avgRating: msgToUpdate.avgRating,
                            }));
                        }
                    });
                }
            } else if (message.type === 'deleteMessage') {
                // Delete a message
                const index = messages.findIndex(msg => msg.id === message.id);
                if (index !== -1) {
                    messages.splice(index, 1); // Remove the message from the array

                    // Broadcast the deletion to all clients
                    wss.clients.forEach(client => {
                        if (client.readyState === WebSocket.OPEN) {
                            client.send(JSON.stringify({ type: "deleteMessage", id: message.id }));
                        }
                    });
                }
            }

        } catch (error) {
            console.error('Error:', error);
        }
    });

    ws.on('close', () => {
        console.log('Client disconnected');
    });
});

// Calculate average rating
function calculateAverageRating(voters) {
    const ratings = Object.values(voters);
    if (ratings.length === 0) return 0;
    const sum = ratings.reduce((acc, rating) => acc + rating, 0);
    return (sum / ratings.length).toFixed(1); // Round to 1 decimal place
}