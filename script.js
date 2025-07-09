const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");
const scoreDisplay = document.getElementById("currentScore");
const totalScoreDisplay = document.getElementById("totalScore");
const compScoreDisplay = document.getElementById("competitionScore");
const referralInfo = document.getElementById("referralInfo");

let score = 0;
let interval;
let telegramUser = window.Telegram.WebApp.initDataUnsafe.user;
let telegramId = telegramUser?.id?.toString();
let username = telegramUser?.username || "Unknown";
let walletAddress = "";
let balls = [];
let freezeMode = false;

// Save wallet
async function saveWallet() {
  const input = document.getElementById("walletInput");
  const wallet = input.value.trim();
  if (!wallet) return alert("Enter your TON wallet");
  walletAddress = wallet;

  const res = await fetch("https://tondropgamebackend.onrender.com/save-wallet", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ telegramId, wallet, username }),
  });
  const data = await res.json();
  if (data.success) {
    alert("Wallet saved!");
    fetchPlayerData();
  } else {
    alert("Failed to save wallet.");
  }
}

// Load player data
async function fetchPlayerData() {
  try {
    const res = await fetch(`https://tondropgamebackend.onrender.com/player/${telegramId}`);
    const data = await res.json();
    totalScoreDisplay.innerText = "Total Score: " + (data.totalScore || 0);
    compScoreDisplay.innerText = "Competition Score: " + (data.competitionScore || 0);
    referralInfo.innerText = "Referrals: " + (data.referrals || 0);
  } catch {
    console.log("Failed to fetch player data.");
  }
}

// Submit score
async function submitScore() {
  if (!walletAddress) return;
  await fetch("https://tondropgamebackend.onrender.com/submit-score", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ telegramId, username, score }),
  });
  fetchPlayerData();
}

// Game start
function startGame() {
  if (!walletAddress) {
    alert("Save your wallet first!");
    return;
  }

  score = 0;
  scoreDisplay.innerText = "Score: 0";
  balls = [];
  clearInterval(interval);
  interval = setInterval(updateGame, 500);
  spawnBall();
}

// Ball object
function spawnBall() {
  const types = ["normal", "freeze", "bomb"];
  const type = Math.random() < 0.8 ? "normal" : Math.random() < 0.5 ? "freeze" : "bomb";
  balls.push({ x: Math.random() * 280, y: 0, type });
}

function updateGame() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  if (Math.random() < 0.4) spawnBall();

  balls.forEach((ball, i) => {
    ball.y += freezeMode ? 0.5 : 2;
    if (ball.y > 400) balls.splice(i, 1);
    ctx.beginPath();
    ctx.arc(ball.x, ball.y, 10, 0, Math.PI * 2);
    ctx.fillStyle = ball.type === "freeze" ? "blue" : ball.type === "bomb" ? "red" : "lime";
    ctx.fill();
    ctx.closePath();
  });
}

canvas.addEventListener("click", (e) => {
  const rect = canvas.getBoundingClientRect();
  const x = e.clientX - rect.left;
  const y = e.clientY - rect.top;

  balls.forEach((ball, i) => {
    const dx = ball.x - x;
    const dy = ball.y - y;
    if (Math.sqrt(dx * dx + dy * dy) < 10) {
      if (ball.type === "freeze") {
        freezeMode = true;
        setTimeout(() => (freezeMode = false), 3000);
      } else if (ball.type === "bomb") {
        alert("Game Over!");
        clearInterval(interval);
        submitScore();
      } else {
        score++;
        scoreDisplay.innerText = "Score: " + score;
      }
      balls.splice(i, 1);
    }
  });
});

// Leaderboard logic
async function loadLeaderboard(type = "global") {
  const url =
    type === "competition"
      ? "https://tondropgamebackend.onrender.com/competition-leaderboard"
      : "https://tondropgamebackend.onrender.com/leaderboard";

  try {
    const res = await fetch(url);
    const data = await res.json();
    const list = document.getElementById("leaderboardList");
    const title = document.getElementById("leaderboardTitle");
    list.innerHTML = "";
    title.innerText = type === "competition" ? "🏆 Competition Leaderboard" : "🌍 Global Leaderboard";

    data.forEach((player, i) => {
      const li = document.createElement("li");
      li.innerText = `${i + 1}. @${player.username || "unknown"} — ${
        type === "competition" ? player.competitionScore : player.totalScore
      } pts`;
      list.appendChild(li);
    });
  } catch {
    console.log("Failed to load leaderboard.");
  }
}

// Tab switch
function switchLeaderboard(type) {
  document.getElementById("globalTab").classList.remove("active");
  document.getElementById("compTab").classList.remove("active");

  if (type === "competition") {
    document.getElementById("compTab").classList.add("active");
  } else {
    document.getElementById("globalTab").classList.add("active");
  }

  loadLeaderboard(type);
}

// Initial setup
fetchPlayerData();
loadLeaderboard("global");
