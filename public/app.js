// Determine correct WebSocket protocol based on page protocol
const protocol = window.location.protocol === 'https:' ? 'wss://' : 'ws://';
// Connect to the same host as the page (Render routes traffic correctly)
const socketUrl = protocol + window.location.host;
const ws = new WebSocket(socketUrl);

ws.onopen = () => {
  console.log('Connected to WebSocket server');
};

ws.onmessage = (event) => {
  const data = JSON.parse(event.data);
  console.log('Received data:', data);

  if (data.type === 'init') {
    // Render initial data (levels and messages)
    renderLevels(data.levels);
    renderComments(data.messages);
  } else if (data.type === 'comment') {
    renderNewComment(data);
  } else if (data.type === 'delete_level') {
    removeLevel(data.levelId);
  } else if (data.type === 'delete_message') {
    removeMessage(data.messageId);
  }
};

ws.onerror = (error) => {
  console.error('WebSocket Error:', error);
};

ws.onclose = () => {
  console.log('Disconnected from WebSocket server');
};

// Example functions to update the DOM (replace with your actual logic)
function renderLevels(levels) {
  console.log('Rendering levels:', levels);
  // TODO: Update #levels-container with levels
}

function renderComments(messages) {
  console.log('Rendering messages:', messages);
  // TODO: Update #comments-container with messages
}

function renderNewComment(message) {
  console.log('New comment received:', message);
  // TODO: Append new comment to #comments-container
}

function removeLevel(levelId) {
  console.log('Removing level with id:', levelId);
  // TODO: Remove level from DOM
}

function removeMessage(messageId) {
  console.log('Removing message with id:', messageId);
  // TODO: Remove message from DOM
}

// Example: function to send a comment (you can attach this to a button)
function sendComment(content) {
  const message = {
    type: 'comment',
    content: content,
    timestamp: Date.now(),
    source: 'TurboWarp' // or any identifier
  };
  ws.send(JSON.stringify(message));
}

// For testing: add event listener for a button if exists
document.addEventListener('DOMContentLoaded', () => {
  const sendBtn = document.getElementById('sendButton');
  const input = document.getElementById('messageInput');
  if (sendBtn && input) {
    sendBtn.addEventListener('click', () => {
      if (input.value.trim() !== '') {
        sendComment(input.value.trim());
        input.value = '';
      }
    });
  }
});
