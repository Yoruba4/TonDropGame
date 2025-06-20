const API_BASE = 'https://tondrop-backend.onrender.com'; // Change if your backend is deployed elsewhere
let username = '';
let totalScore = 0;
let score = 0;
let boosterExpires = null;
let gameInterval;
let freezeActive = false;

// Elements
const gameArea = document.getElementById('game-area');
const scoreDisplay = document.getElementById('score-display');
const totalScoreDisplay = document.getElementById('total-score');
const startButton = document.getElementById('start-button');
const subscribeButton = document.getElementById('subscribe-button');
const walletInput = document.getElementById('wallet');
const saveWalletBtn = document.getElementById('save-wallet');
const leaderboardList = document.getElementById('leaderboard-list');

// On load: Get Telegram username
window.Telegram.WebApp.ready();
username = Telegram.WebApp.initDataUnsafe?.user?.username || 'Guest';
Telegram.WebApp.expand();

// Save wallet
saveWalletBtn.onclick = async () => {
  const wallet = walletInput.value.trim();
  if (!wallet) return alert('Please enter your TON wallet address');
  const res = await fetch(`${API_BASE}/update-wallet`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, wallet }),
  });
  if (res.ok) {
    alert('Wallet saved!');
  } else {
    alert('Failed to save wallet.');
  }
};

// Subscribe (mock TON payment)
subscribeButton.onclick = async () => {
  const txHash = `ton:${Math.random().toString(36).substring(2, 10)}`;
  const res = await fetch(`${API_BASE}/buy-booster`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, txHash }),
  });
  if (res.ok) {
    alert('Subscription activated!');
    const data = await res.json();
    boosterExpires = new Date(data.expiresAt);
  } else {
    alert('Subscription failed.');
  }
};

// Start game
startButton.onclick = () => {
  score = 0;
  gameArea.innerHTML = '';
  scoreDisplay.innerText = 'Score: 0';
  startSpawning();
};

// Game logic
function startSpawning() {
  if (gameInterval) clearInterval(gameInterval);
  gameInterval = setInterval(spawnItem, 1000);
}

function spawnItem() {
  if (freezeActive) return;

  const item = document.createElement('div');
  item.className = 'falling-item';
  const types = ['ton', 'freeze', 'bomb'];
  const type = types[Math.floor(Math.random() * 10) < 7 ? 0 : Math.floor(Math.random() * 3)];
  item.classList.add(type);

  item.style.left = Math.random() * 90 + '%';
  item.onclick = () => {
    if (type === 'ton') {
      const now = new Date();
      const isBoosted = boosterExpires && new Date(boosterExpires) > now;
      const gained = isBoosted ? 10 : 1;
      score += gained;
      scoreDisplay.innerText = `Score: ${score}`;
    } else if (type === 'freeze') {
      freezeActive = true;
      setTimeout(() => {
        freezeActive = false;
      }, 3000);
    } else if (type === 'bomb') {
      alert('💣 Boom! Game Over');
      clearInterval(gameInterval);
      submitScore();
    }
    item.remove();
  };

  item.style.top = '0';
  gameArea.appendChild(item);
  animateItem(item);
}

function animateItem(item) {
  let top = 0;
  const interval = setInterval(() => {
    if (freezeActive) return;
    top += 2;
    item.style.top = `${top}%`;
    if (top >= 90) {
      item.remove();
      clearInterval(interval);
    }
  }, 50);
}

// Submit score
async function submitScore() {
  const res = await fetch(`${API_BASE}/score`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, score }),
  });
  if (res.ok) {
    loadTotalScore();
    loadLeaderboard();
  }
}

// Load total score
async function loadTotalScore() {
  const res = await fetch(`${API_BASE}/my-rank/${username}`);
  const data = await res.json();
  totalScoreDisplay.innerText = `Total Score: ${data.totalScore}`;
}

// Load leaderboard
async function loadLeaderboard() {
  const res = await fetch(`${API_BASE}/leaderboard`);
  const data = await res.json();
  leaderboardList.innerHTML = '';
  data.forEach((user, i) => {
    const li = document.createElement('li');
    li.textContent = `${i + 1}. ${user.username}: ${user.totalScore}`;
    leaderboardList.appendChild(li);
  });
}

// Auto-load on open
loadTotalScore();
loadLeaderboard();
