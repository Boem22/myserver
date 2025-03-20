// Connect to WebSocket server
const socket = new WebSocket('ws://localhost:10001');

// When WebSocket is connected
socket.onopen = function() {
  console.log('Connected to WebSocket server');
};

// When a message is received from the WebSocket server
socket.onmessage = function(event) {
  const message = event.data;
  console.log('Message from server:', message);

  // Display the message on the page
  const messageContainer = document.getElementById('messages');
  const messageElement = document.createElement('p');
  messageElement.textContent = message;
  messageContainer.appendChild(messageElement);
};

// Send a message to the WebSocket server
function sendMessage() {
  const messageInput = document.getElementById('messageInput');
  const message = messageInput.value;

  if (message) {
    socket.send(message);
    messageInput.value = '';  // Clear the input field
  }
}

// Attach event listener to the send button
document.getElementById('sendButton').addEventListener('click', sendMessage);
