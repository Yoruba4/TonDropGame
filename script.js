const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");
const startBtn = document.getElementById("startBtn");
const currentScoreEl = document.getElementById("currentScore");
const totalScoreEl = document.getElementById("totalScore");
const leaderboardList = document.getElementById("leaderboardList");

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

// Save wallet
function saveWallet() {
  const wallet = document.getElementById("walletInput").value;
  if (!wallet || !window.Telegram.WebApp.initDataUnsafe.user) return;

  const tgUser = window.Telegram.WebApp.initDataUnsafe.user;
  user.telegramId = tgUser.id.toString();
  user.username = tgUser.username || `anon${tgUser.id}`;
  user.wallet = wallet;

  fetch("/save-wallet", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      telegramId: user.telegramId,
      username: user.username,
      wallet: user.wallet,
    }),
  })
    .then((res) => res.json())
    .then((data) => {
      if (data.success) {
        alert("Wallet saved!");
        startBtn.disabled = false;
        fetchPlayerScore();
      }
    });
}

// Get score and wallet on load
function fetchPlayerScore() {
  fetch(`/player/${user.telegramId}`)
    .then((res) => res.json())
    .then((data) => {
      if (data.totalScore !== undefined) {
        totalScore = data.totalScore;
        totalScoreEl.textContent = `Total Score: ${totalScore}`;
        if (data.wallet) {
          user.wallet = data.wallet;
          document.getElementById("walletInput").value = user.wallet;
          startBtn.disabled = false;
        }
      }
    });
}

function startGame() {
  if (!user.wallet) {
    alert("Save your wallet before playing.");
    return;
  }
  score = 0;
  scoreSubmitted = false;
  currentScoreEl.textContent = "Score: 0";
  gameObjects = [];
  gameInterval = setInterval(updateGame, 30);
  spawnObject();
}

function stopGame() {
  clearInterval(gameInterval);
  gameInterval = null;
  submitScore();
}

function submitScore() {
  if (scoreSubmitted || score === 0) return;
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

function updateGame() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  if (!isFrozen) {
    for (const obj of gameObjects) obj.y += 2;
  }

  gameObjects = gameObjects.filter((obj) => obj.y < canvas.height);

  for (const obj of gameObjects) {
    ctx.fillStyle = obj.color;
    ctx.beginPath();
    ctx.arc(obj.x, obj.y, obj.r, 0, Math.PI * 2);
    ctx.fill();
  }
}

function spawnObject() {
  const pick = Math.random();
  let type = "normal";
  let color = "blue";

  if (pick < 0.08) {
    type = "bomb";
    color = "red";
  } else if (pick < 0.16) {
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

  if (gameInterval) setTimeout(spawnObject, 600);
}

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
        alert("Game Over!");
        stopGame();
        return;
      }
      gameObjects.splice(i, 1);
      break;
    }
  }
});

// Leaderboard
function fetchLeaderboards() {
  const endpoint =
    currentLeaderboard === "global" ? "/leaderboard" : "/competition-leaderboard";

  fetch(endpoint)
    .then((res) => res.json())
    .then((players) => {
      leaderboardList.innerHTML = "";
      players.forEach((p, i) => {
        const li = document.createElement("li");
        li.textContent = `#${i + 1} @${p.username || p.telegramId} - ${
          currentLeaderboard === "global" ? p.totalScore : p.competitionScore
        }`;
        leaderboardList.appendChild(li);
      });
    });
}

function switchLeaderboard() {
  currentLeaderboard = currentLeaderboard === "global" ? "competition" : "global";
  document.querySelector("button[onclick='switchLeaderboard()']").textContent =
    currentLeaderboard === "global" ? "Switch to Competition" : "Switch to Global";
  fetchLeaderboards();
}

function submitReferral() {
  const refInput = document.getElementById("referralInput").value;
  if (!refInput || !user.telegramId || !user.username) return;

  fetch("/refer", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      telegramId: user.telegramId,
      username: user.username,
      referrer: refInput,
    }),
  });
}

// On page load
window.onload = () => {
  if (window.Telegram.WebApp.initDataUnsafe.user) {
    const tgUser = window.Telegram.WebApp.initDataUnsafe.user;
    user.telegramId = tgUser.id.toString();
    user.username = tgUser.username || "anon" + tgUser.id;
    fetchPlayerScore();
    fetchLeaderboards();
  }
};
