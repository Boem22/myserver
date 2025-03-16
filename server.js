const form = document.getElementById('levelForm');
const levelInput = document.getElementById('levelInput');
const levelList = document.getElementById('levelList');
const errorMessage = document.getElementById('errorMessage');
const searchBar = document.getElementById('searchBar');
const adminUsername = document.getElementById('adminUsername');
const adminPassword = document.getElementById('adminPassword');
const confirmLoginButton = document.getElementById('confirmLogin');
const deleteSelectedButton = document.getElementById('deleteSelected');
const logOutButton = document.getElementById('logOut');

let isAdminLoggedIn = false;

// Connect to the WebSocket server
const ws = new WebSocket(`wss://${window.location.host}`);

// Handle WebSocket connection open
ws.onopen = () => {
  console.log('Connected to WebSocket server');
  // Request initial levels from the server
  ws.send(JSON.stringify({ type: 'init', text: '' })); // Add a default 'text' field
};

// Handle incoming messages from the server
ws.onmessage = (event) => {
  console.log('Raw message from server:', event.data); // Debugging: Log raw message

  try {
    const data = JSON.parse(event.data);

    if (data.type === 'init') {
      // Display initial levels
      levelList.innerHTML = ''; // Clear the list
      data.levels.forEach((level, index) => addLevelToList(level, index));
      isAdminLoggedIn = data.isAdminLoggedIn;
      updateAdminUI();
    } else if (data.type === 'level') {
      // Display new level
      addLevelToList(data.level, levelList.children.length);
    } else if (data.type === 'update') {
      // Update existing level
      updateLevel(data.level, data.levelId);
    } else if (data.type === 'error') {
      // Display error message
      console.error('Server error:', data.message);
      errorMessage.textContent = `Server error: ${data.message}`;
    }
  } catch (error) {
    console.error('Failed to parse server message:', error);
    errorMessage.textContent = 'Failed to parse server message. Check the console for details.';
  }
};

// Handle WebSocket errors
ws.onerror = (error) => {
  console.error('WebSocket error:', error);
  errorMessage.textContent = 'WebSocket error: Check the console for details.';
};

// Handle WebSocket connection close
ws.onclose = () => {
  console.log('Disconnected from WebSocket server');
  errorMessage.textContent = 'Disconnected from WebSocket server.';
};

// Handle form submission
form.addEventListener('submit', (e) => {
  e.preventDefault();

  const level = levelInput.value.trim();
  if (!level) {
    errorMessage.textContent = 'Please enter a level code.';
    return;
  }

  // Clear previous error messages
  errorMessage.textContent = '';

  // Send the level to the server in JSON format
  ws.send(JSON.stringify({ type: 'level', text: level }));
  levelInput.value = ''; // Clear the input
});

// Handle search bar input
searchBar.addEventListener('input', () => {
  const searchTerm = searchBar.value.toLowerCase();
  const levels = Array.from(levelList.children);

  levels.forEach((level) => {
    const text = level.textContent.toLowerCase();
    if (text.includes(searchTerm)) {
      level.style.display = 'block';
    } else {
      level.style.display = 'none';
    }
  });
});

// Handle admin login
confirmLoginButton.addEventListener('click', () => {
  const username = adminUsername.value.trim();
  const password = adminPassword.value.trim();

  if (!username || !password) {
    errorMessage.textContent = 'Please enter admin credentials.';
    return;
  }

  // Send the login command to the server
  ws.send(JSON.stringify({
    type: 'admin',
    command: 'login',
    username: username,
    password: password
  }));

  // Clear the form
  adminUsername.value = '';
  adminPassword.value = '';
});

// Handle delete selected levels
deleteSelectedButton.addEventListener('click', () => {
  // Get the selected level IDs
  const checkboxes = document.querySelectorAll('#levelList input[type="checkbox"]:checked');
  const levelIds = Array.from(checkboxes).map((checkbox) => parseInt(checkbox.dataset.index));

  if (levelIds.length === 0) {
    errorMessage.textContent = 'No levels selected.';
    return;
  }

  // Send the delete command to the server
  ws.send(JSON.stringify({
    type: 'admin',
    command: 'deleteLevels',
    levelIds: levelIds
  }));
});

// Handle log out
logOutButton.addEventListener('click', () => {
  // Send the logout command to the server
  ws.send(JSON.stringify({
    type: 'admin',
    command: 'logout'
  }));
});

// Helper function to add a level to the list
function addLevelToList(level, index) {
  const li = document.createElement('li');
  li.innerHTML = `
    <div>${level.timestamp}: ${level.text}</div>
    <div class="rating">
      ${[1, 2, 3, 4, 5].map((star) => `
        <span data-index="${index}" data-rating="${star}">★</span>
      `).join('')}
    </div>
    <div>Rating: ${calculateAverageRating(level.ratings)} (${level.ratings ? level.ratings.length : 0} votes)</div>
  `;
  levelList.appendChild(li);
  // Scroll to the bottom of the level list
  levelList.scrollTop = levelList.scrollHeight;

  // Add event listeners to rating stars
  li.querySelectorAll('.rating span').forEach((star) => {
    star.addEventListener('click', () => {
      const levelId = star.dataset.index;
      const rating = star.dataset.rating;
      ws.send(JSON.stringify({ type: 'rate', levelId, rating: parseInt(rating) }));
    });
  });
}

// Helper function to update a level
function updateLevel(level, levelId) {
  const li = levelList.children[levelId];
  if (li) {
    li.innerHTML = `
      <div>${level.timestamp}: ${level.text}</div>
      <div class="rating">
        ${[1, 2, 3, 4, 5].map((star) => `
          <span data-index="${levelId}" data-rating="${star}">★</span>
        `).join('')}
      </div>
      <div>Rating: ${calculateAverageRating(level.ratings)} (${level.ratings ? level.ratings.length : 0} votes)</div>
    `;

    // Add event listeners to rating stars
    li.querySelectorAll('.rating span').forEach((star) => {
      star.addEventListener('click', () => {
        const levelId = star.dataset.index;
        const rating = star.dataset.rating;
        ws.send(JSON.stringify({ type: 'rate', levelId, rating: parseInt(rating) }));
      });
    });
  }
}

// Helper function to calculate average rating
function calculateAverageRating(ratings) {
  if (!ratings || ratings.length === 0) return 'No ratings';
  const sum = ratings.reduce((acc, rating) => acc + rating, 0);
  return (sum / ratings.length).toFixed(2);
}

// Helper function to update the admin UI
function updateAdminUI() {
  if (isAdminLoggedIn) {
    confirmLoginButton.style.display = 'none';
    deleteSelectedButton.style.display = 'block';
    logOutButton.style.display = 'block';
    document.querySelectorAll('#levelList input[type="checkbox"]').forEach((checkbox) => {
      checkbox.style.display = 'inline-block';
    });
  } else {
    confirmLoginButton.style.display = 'block';
    deleteSelectedButton.style.display = 'none';
    logOutButton.style.display = 'none';
    document.querySelectorAll('#levelList input[type="checkbox"]').forEach((checkbox) => {
      checkbox.style.display = 'none';
    });
  }
}