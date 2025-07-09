const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");
const startBtn = document.getElementById("startBtn");
const currentScoreEl = document.getElementById("currentScore");
const totalScoreEl = document.getElementById("totalScore");
const leaderboardList = document.getElementById("leaderboardList");
const toggleBtn = document.getElementById("toggleLeaderboard");

let score = 0;
let totalScore = 0;
let gameInterval;
let gameObjects = [];
let isFrozen = false;
let scoreSubmitted = false;
let currentLeaderboard = "global";

let user = {
  telegramId: null,
  username: null,
  wallet: null,
};

// Load user from localStorage
function loadUserFromStorage() {
  const saved = localStorage.getItem("user");
  if (saved) {
    user = JSON.parse(saved);
    startBtn.disabled = false;
    fetchPlayerScore();
  }
}

// Save wallet
function saveWallet() {
  const walletInput = document.getElementById("walletInput").value;
  if (!walletInput || !window.Telegram.WebApp.initDataUnsafe.user) return;

  const tgUser = window.Telegram.WebApp.initDataUnsafe.user;
  user.telegramId = tgUser.id.toString();
  user.username = tgUser.username || "anon" + tgUser.id;
  user.wallet = walletInput;

  fetch("/save-wallet", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      telegramId: user.telegramId,
      username: user.username,
      wallet: walletInput,
    }),
  })
    .then((res) => res.json())
    .then((data) => {
      if (data.success) {
        localStorage.setItem("user", JSON.stringify(user));
        alert("Wallet saved! You can start playing now.");
        startBtn.disabled = false;
        fetchPlayerScore();
      } else {
        alert("Failed to save wallet");
      }
    });
}

// Fetch player score
function fetchPlayerScore() {
  if (!user.telegramId) return;
  fetch(`/player/${user.telegramId}`)
    .then((res) => res.json())
    .then((data) => {
      totalScore = data.totalScore || 0;
      totalScoreEl.textContent = `Total Score: ${totalScore}`;
    });
}

// Start Game
function startGame() {
  if (!user.wallet) {
    alert("Please save your wallet first.");
    return;
  }

  score = 0;
  scoreSubmitted = false;
  currentScoreEl.textContent = "Score: 0";
  gameObjects = [];
  clearInterval(gameInterval);
  gameInterval = setInterval(updateGame, 30);
  spawnObject();
}

// Stop Game
function stopGame() {
  clearInterval(gameInterval);
  gameInterval = null;
  submitScore();
}

// Submit score
function submitScore() {
  if (scoreSubmitted || score === 0 || !user.telegramId) return;
  scoreSubmitted = true;

  fetch("/submit-score", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      telegramId: user.telegramId,
      username: user.username,
      score,
    }),
  })
    .then((res) => res.json())
    .then(() => {
      fetchPlayerScore();
      fetchLeaderboards();
    });
}

// Game update
function updateGame() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  if (!isFrozen) {
    for (const obj of gameObjects) {
      obj.y += 2;
    }
  }

  gameObjects = gameObjects.filter((obj) => obj.y < canvas.height);

  for (const obj of gameObjects) {
    ctx.fillStyle = obj.color;
    ctx.beginPath();
    ctx.arc(obj.x, obj.y, obj.r, 0, Math.PI * 2);
    ctx.fill();
  }
}

// Spawn ball
function spawnObject() {
  const pick = Math.random();
  let type = "normal";
  let color = "blue";

  if (pick < 0.1) {
    type = "bomb";
    color = "red";
  } else if (pick < 0.2) {
    type = "freeze";
    color = "green";
  }

  gameObjects.push({
    x: Math.random() * 280 + 10,
    y: 0,
    r: 15,
    type,
    color,
  });

  if (gameInterval) {
    setTimeout(spawnObject, 700); // slow and spaced
  }
}

// Click on ball
canvas.addEventListener("click", (e) => {
  const rect = canvas.getBoundingClientRect();
  const x = e.clientX - rect.left;
  const y = e.clientY - rect.top;

  for (let i = 0; i < gameObjects.length; i++) {
    const obj = gameObjects[i];
    const dx = obj.x - x;
    const dy = obj.y - y;

    if (dx * dx + dy * dy < obj.r * obj.r) {
      if (obj.type === "normal") {
        score++;
        currentScoreEl.textContent = `Score: ${score}`;
      } else if (obj.type === "freeze") {
        isFrozen = true;
        setTimeout(() => (isFrozen = false), 3000);
      } else if (obj.type === "bomb") {
        alert("Game Over! You hit a bomb.");
        stopGame();
        return;
      }
      gameObjects.splice(i, 1);
      break;
    }
  }
});

// Toggle leaderboard
toggleBtn.addEventListener("click", () => {
  currentLeaderboard =
    currentLeaderboard === "global" ? "competition" : "global";
  toggleBtn.textContent =
    currentLeaderboard === "global"
      ? "Show Competition Leaderboard"
      : "Show Global Leaderboard";
  fetchLeaderboards();
});

// Fetch leaderboards
function fetchLeaderboards() {
  const url =
    currentLeaderboard === "global"
      ? "/leaderboard"
      : "/competition-leaderboard";

  fetch(url)
    .then((res) => res.json())
    .then((players) => updateLeaderboard(players));
}

function updateLeaderboard(players) {
  leaderboardList.innerHTML = "";
  players.forEach((p, i) => {
    const li = document.createElement("li");
    li.textContent = `#${i + 1} @${p.username || p.telegramId} - ${
      currentLeaderboard === "global"
        ? p.totalScore
        : p.competitionScore || 0
    }`;
    leaderboardList.appendChild(li);
  });
}

// Load everything
window.onload = () => {
  if (window.Telegram.WebApp.initDataUnsafe.user) {
    const tgUser = window.Telegram.WebApp.initDataUnsafe.user;
    user.telegramId = tgUser.id.toString();
    user.username = tgUser.username || "anon" + tgUser.id;
    loadUserFromStorage();
    fetchLeaderboards();
  }
};
