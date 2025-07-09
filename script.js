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
        alert("Wallet saved. You can now start playing!");
        startBtn.disabled = false;
        fetchPlayerScore();
      }
    });
}

// Submit referral
function submitReferral() {
  const referral = document.getElementById("referralInput").value.trim();
  if (!referral || !window.Telegram.WebApp.initDataUnsafe.user) return;

  const tgUser = window.Telegram.WebApp.initDataUnsafe.user;
  user.telegramId = tgUser.id.toString();
  user.username = tgUser.username || "anon" + tgUser.id;

  fetch("/refer", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      telegramId: user.telegramId,
      username: user.username,
      referrer: referral,
    }),
  })
    .then((res) => res.json())
    .then((data) => {
      if (data.success) {
        alert("Referral submitted successfully!");
      } else {
        alert(data.message || "Referral failed.");
      }
    });
}

// Fetch player score
function fetchPlayerScore() {
  fetch(`/player/${user.telegramId}`)
    .then((res) => res.json())
    .then((data) => {
      totalScore = data.totalScore || 0;
      totalScoreEl.textContent = `Total Score: ${totalScore}`;
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
  clearInterval(gameInterval);
  gameInterval = setInterval(updateGame, 30);
  spawnObject();
}

// Stop game
function stopGame() {
  clearInterval(gameInterval);
  gameInterval = null;
  submitScore();
}

// Submit score
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
  }).then(() => fetchLeaderboards());
}

// Game logic
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

// Spawn one ball at a time
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
    setTimeout(spawnObject, 700); // one at a time, not clustered
  }
}

// Ball click detection
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

// Leaderboard logic
function fetchLeaderboards() {
  if (currentLeaderboard === "global") {
    fetch("/leaderboard")
      .then((res) => res.json())
      .then((players) => updateLeaderboard(players, false));
  } else {
    fetch("/competition-leaderboard")
      .then((res) => res.json())
      .then((players) => updateLeaderboard(players, true));
  }
}

function updateLeaderboard(players, isCompetition = false) {
  leaderboardList.innerHTML = "";
  document.getElementById("leaderboardTitle").textContent = isCompetition
    ? "Competition Leaderboard"
    : "Global Leaderboard";

  players.forEach((p, i) => {
    const li = document.createElement("li");
    li.textContent = `#${i + 1} @${p.username || p.telegramId} - ${
      isCompetition ? p.competitionScore : p.totalScore
    }`;
    leaderboardList.appendChild(li);
  });
}

// Toggle leaderboard view
toggleBtn.addEventListener("click", () => {
  currentLeaderboard = currentLeaderboard === "global" ? "competition" : "global";
  toggleBtn.textContent =
    currentLeaderboard === "global"
      ? "Show Competition Leaderboard"
      : "Show Global Leaderboard";
  fetchLeaderboards();
});

// Initial Load
window.onload = () => {
  if (window.Telegram.WebApp.initDataUnsafe.user) {
    const tgUser = window.Telegram.WebApp.initDataUnsafe.user;
    user.telegramId = tgUser.id.toString();
    user.username = tgUser.username || "anon" + tgUser.id;
    fetchPlayerScore();
    fetchLeaderboards();
  }
};




