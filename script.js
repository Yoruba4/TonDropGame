const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");
const currentScoreEl = document.getElementById("currentScore");
const totalScoreEl = document.getElementById("totalScore");
const competitionScoreEl = document.getElementById("competitionScore");
const leaderboardList = document.getElementById("leaderboardList");

let score = 0;
let gameObjects = [];
let isFrozen = false;
let scoreSubmitted = false;
let gameInterval = null;
let currentLeaderboard = "global";

let user = {
  telegramId: null,
  username: null,
  wallet: null,
};

// Save to localStorage
function persistUser() {
  localStorage.setItem("tonDropUser", JSON.stringify(user));
}

// Load from localStorage
function loadUser() {
  const saved = localStorage.getItem("tonDropUser");
  if (saved) {
    const parsed = JSON.parse(saved);
    user.telegramId = parsed.telegramId;
    user.username = parsed.username;
    user.wallet = parsed.wallet;
  }
}

// Save wallet
function saveWallet() {
  const wallet = document.getElementById("walletInput").value;
  const tgUser = window.Telegram.WebApp.initDataUnsafe.user;
  if (!wallet || !tgUser) return;

  user.telegramId = tgUser.id.toString();
  user.username = tgUser.username || `anon${tgUser.id}`;
  user.wallet = wallet;

  fetch("/save-wallet", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(user),
  })
    .then((res) => res.json())
    .then((data) => {
      if (data.success) {
        persistUser();
        alert("Wallet saved. You can now start playing!");
        document.getElementById("startBtn").disabled = false;
        fetchPlayerScore();
        fetchLeaderboards();
      } else {
        alert("Failed to save wallet");
      }
    });
}

// Submit referral
function submitReferral() {
  const referrer = document.getElementById("referralInput").value;
  if (!referrer || !user.telegramId || !user.username) return;

  fetch("/refer", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      telegramId: user.telegramId,
      username: user.username,
      referrer,
    }),
  })
    .then((res) => res.json())
    .then((data) => {
      if (data.success) {
        alert("Referral submitted!");
        document.getElementById("referralInput").disabled = true;
      } else {
        alert(data.message || "Referral failed.");
      }
    });
}

// Start game
function startGame() {
  if (!user.wallet) {
    alert("Please save your wallet first.");
    return;
  }

  score = 0;
  scoreSubmitted = false;
  currentScoreEl.textContent = "Score: 0";
  gameObjects = [];

  spawnObject();
  gameInterval = setInterval(updateGame, 30);
}

// Stop game
function stopGame() {
  clearInterval(gameInterval);
  gameInterval = null;
  submitScore();
}

// Submit score
function submitScore() {
  if (scoreSubmitted || score <= 0) return;
  scoreSubmitted = true;

  fetch("/submit-score", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      telegramId: user.telegramId,
      username: user.username,
      score,
    }),
  }).then(() => {
    fetchLeaderboards();
    fetchPlayerScore();
  });
}

// Update game loop
function updateGame() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  if (!isFrozen) {
    for (const obj of gameObjects) obj.y += 1.5;
  }

  gameObjects = gameObjects.filter((obj) => obj.y < canvas.height);

  for (const obj of gameObjects) {
    ctx.fillStyle = obj.color;
    ctx.beginPath();
    ctx.arc(obj.x, obj.y, obj.r, 0, Math.PI * 2);
    ctx.fill();
  }
}

// Spawn objects
function spawnObject() {
  const pick = Math.random();
  let type = "normal";
  let color = "blue";

  if (pick < 0.08) {
    type = "bomb";
    color = "red";
  } else if (pick < 0.18) {
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

  if (gameInterval) setTimeout(spawnObject, 700); // drop speed
}

// Click to collect
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
        alert("💣 Game Over! You hit a bomb.");
        stopGame();
        return;
      }

      gameObjects.splice(i, 1);
      break;
    }
  }
});

// Fetch player stats
function fetchPlayerScore() {
  fetch(`/player/${user.telegramId}`)
    .then((res) => res.json())
    .then((data) => {
      totalScoreEl.textContent = `Total Score: ${data.totalScore || 0}`;
      competitionScoreEl.textContent = `Competition Score: ${data.competitionScore || 0}`;
    });
}

// Leaderboards
function fetchLeaderboards() {
  const endpoint =
    currentLeaderboard === "global" ? "/leaderboard" : "/competition-leaderboard";

  fetch(endpoint)
    .then((res) => res.json())
    .then((players) => updateLeaderboard(players));
}

function updateLeaderboard(players) {
  leaderboardList.innerHTML = "";
  players.forEach((p, i) => {
    const li = document.createElement("li");
    li.textContent = `#${i + 1} @${p.username || p.telegramId} - ${
      currentLeaderboard === "global" ? p.totalScore : p.competitionScore
    }`;
    leaderboardList.appendChild(li);
  });
}

// Switch leaderboard
function switchLeaderboard() {
  currentLeaderboard = currentLeaderboard === "global" ? "competition" : "global";
  document.getElementById("toggleLeaderboard").textContent =
    currentLeaderboard === "global"
      ? "Show Competition Leaderboard"
      : "Show Global Leaderboard";
  fetchLeaderboards();
}

// Initialize on load
window.onload = () => {
  loadUser();

  const tgUser = window.Telegram.WebApp.initDataUnsafe.user;
  if (tgUser && !user.telegramId) {
    user.telegramId = tgUser.id.toString();
    user.username = tgUser.username || `anon${tgUser.id}`;
    persistUser();
  }

  if (user.wallet) {
    document.getElementById("walletInput").value = user.wallet;
    document.getElementById("startBtn").disabled = false;
    fetchPlayerScore();
    fetchLeaderboards();
  }
};
