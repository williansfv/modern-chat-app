// app.js
// This file contains the core logic for the chat application. It uses the
// GUN database (imported via CDN in index.html) to synchronize messages
// across all clients in real‑time. The user picks a nickname and room
// name. Messages are stored under `chats/<roomName>` in the GUN graph.

(() => {
  // Grab references to DOM elements
  const joinContainer = document.getElementById('join-container');
  const chatContainer = document.getElementById('chat-container');
  const usernameInput = document.getElementById('usernameInput');
  const roomInput = document.getElementById('roomInput');
  const joinBtn = document.getElementById('joinBtn');
  const roomTitle = document.getElementById('roomTitle');
  const leaveBtn = document.getElementById('leaveBtn');
  const messagesEl = document.getElementById('messages');
  const messageInput = document.getElementById('messageInput');
  const sendBtn = document.getElementById('sendBtn');

  // Variables to store current state
  let username;
  let roomName;
  let gun;
  let chatNode;
  // Track message IDs that have already been displayed to avoid duplicates
  const seenMessages = new Set();

  /**
   * Initialize GUN and set up listeners for a specific chat room.
   */
  function initChat() {
    // Create a new GUN instance with a default peer. The Manhattan relay
    // offered by the GUN team is suitable for simple prototypes and learning
    // projects. Production apps should run their own peer for reliability.
    gun = Gun({
      peers: ['https://gun-manhattan.herokuapp.com/gun'],
    });

    // Create/get a node for the chat room under the "chats" top‑level node
    chatNode = gun.get('chats').get(roomName);

    // Listen for new data on the chat node. `map().on` will call back
    // whenever a new message is inserted into the set. We use the id to
    // deduplicate messages that may arrive multiple times (GUN is eventually
    // consistent and may deliver data more than once).
    chatNode.map().on((data, id) => {
      // Skip empty data or messages we've already rendered
      if (!data || seenMessages.has(id)) return;
      seenMessages.add(id);
      displayMessage(data);
    });
  }

  /**
   * Render a message in the chat window.
   * @param {Object} data - The message object containing user, text and timestamp.
   */
  function displayMessage({ user, text, timestamp }) {
    const wrapper = document.createElement('div');
    wrapper.classList.add('message');

    // Format timestamp into a human friendly time string
    let timeString = '';
    if (timestamp) {
      const date = new Date(timestamp);
      timeString = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }

    // Build the inner HTML for the message
    wrapper.innerHTML = `
      <span class="user">${escapeHtml(user || 'Anonymous')}</span>
      <span class="text">${escapeHtml(text || '')}</span>
      <span class="time">${escapeHtml(timeString)}</span>
    `;

    messagesEl.appendChild(wrapper);
    // Scroll to the bottom so the latest message is visible
    messagesEl.scrollTop = messagesEl.scrollHeight;
  }

  /**
   * Escape user‑generated content to prevent HTML injection.
   * @param {string} str - The raw string to escape.
   * @returns {string}
   */
  function escapeHtml(str) {
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  /**
   * Send a message to the current chat room.
   */
  function sendMessage() {
    const text = messageInput.value.trim();
    if (!text) return;
    // Insert the message into the set. GUN will generate a unique ID
    // automatically and propagate the data to other peers.
    chatNode.set({
      user: username,
      text,
      timestamp: Date.now(),
    });
    messageInput.value = '';
    messageInput.focus();
  }

  /**
   * Join the specified room with the given username.
   */
  function joinRoom() {
    username = usernameInput.value.trim() || 'Anonymous';
    roomName = roomInput.value.trim() || 'general';
    // Update the UI
    joinContainer.classList.add('hidden');
    chatContainer.classList.remove('hidden');
    roomTitle.textContent = `Room: ${roomName}`;
    // Initialize the chat
    initChat();
  }

  /**
   * Leave the chat and return to the lobby. Clears state so rejoining works.
   */
  function leaveRoom() {
    // Remove listeners by reinitializing GUN to an empty object
    gun = null;
    chatNode = null;
    seenMessages.clear();
    // Clear message list
    messagesEl.innerHTML = '';
    // Reset UI
    chatContainer.classList.add('hidden');
    joinContainer.classList.remove('hidden');
    // Clear inputs for convenience
    roomInput.value = '';
    messageInput.value = '';
    // Put focus back on the username field
    usernameInput.focus();
  }

  // Attach event listeners
  joinBtn.addEventListener('click', joinRoom);
  leaveBtn.addEventListener('click', leaveRoom);
  sendBtn.addEventListener('click', sendMessage);
  // Allow sending a message by pressing Enter in the input field
  messageInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      sendMessage();
    }
  });
})();
