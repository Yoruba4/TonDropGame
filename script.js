const telegram = window.Telegram.WebApp;
let telegramId = null;
let username = null;
let wallet = localStorage.getItem("wallet") || "";
let score = 0;
let gameInterval = null;
let gameRunning = false;
let ballSpeed = 2;
let dropDelay = 1000; // 1 second between drops

const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");
const balls = [];

document.getElementById("walletInput").value = wallet;

telegram.ready();
if (telegram.initDataUnsafe?.user?.id) {
  telegramId = telegram.initDataUnsafe.user.id.toString();
  username = telegram.initDataUnsafe.user.username || "";
} else {
  alert("Telegram ID not found. Please open from Telegram.");
}

// Save wallet
function saveWallet() {
  wallet = document.getElementById("walletInput").value.trim();
  if (!wallet || !telegramId) return alert("Enter wallet");

  localStorage.setItem("wallet", wallet);

  fetch("https://tondropgamebackend.onrender.com/save-wallet", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ telegramId, username, wallet }),
  })
    .then(res => res.json())
    .then(data => {
      if (data.success) {
        alert("Wallet saved. You can now start the game!");
      } else {
        alert("Failed to save wallet.");
      }
    });
}

// Game logic
function startGame() {
  if (!wallet) return alert("Save wallet first");
  if (gameRunning) return;

  score = 0;
  balls.length = 0;
  gameRunning = true;

  gameInterval = setInterval(() => {
    dropBall();
  }, dropDelay);

  requestAnimationFrame(updateGame);
}

function dropBall() {
  const x = Math.random() * (canvas.width - 30);
  const color = Math.random() < 0.1 ? "red" : Math.random() < 0.15 ? "blue" : "green";
  balls.push({ x, y: 0, color });
}

function updateGame() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  balls.forEach((ball, i) => {
    ball.y += ballSpeed;
    ctx.fillStyle = ball.color;
    ctx.beginPath();
    ctx.arc(ball.x, ball.y, 15, 0, Math.PI * 2);
    ctx.fill();

    if (ball.y > canvas.height) {
      balls.splice(i, 1);
    }
  });

  requestAnimationFrame(updateGame);
}

canvas.addEventListener("click", e => {
  if (!gameRunning) return;

  const rect = canvas.getBoundingClientRect();
  const clickX = e.clientX - rect.left;
  const clickY = e.clientY - rect.top;

  for (let i = 0; i < balls.length; i++) {
    const ball = balls[i];
    const dx = clickX - ball.x;
    const dy = clickY - ball.y;

    if (Math.sqrt(dx * dx + dy * dy) < 15) {
      if (ball.color === "red") {
        score = Math.max(0, score - 1);
      } else if (ball.color === "blue") {
        freezeBalls();
      } else {
        score++;
      }
      balls.splice(i, 1);
      break;
    }
  }

  document.getElementById("currentScore").textContent = "Score: " + score;
});

function freezeBalls() {
  clearInterval(gameInterval);
  setTimeout(() => {
    gameInterval = setInterval(dropBall, dropDelay);
  }, 2000);
}

// Submit Score
function submitScore() {
  if (!telegramId || !username) return;

  fetch("https://tondropgamebackend.onrender.com/submit-score", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ telegramId, username, score }),
  })
    .then(res => res.json())
    .then(() => {
      loadLeaderboards();
    });
}

// Load Leaderboards
function loadLeaderboards(type = "global") {
  const url =
    type === "competition"
      ? "https://tondropgamebackend.onrender.com/competition-leaderboard"
      : "https://tondropgamebackend.onrender.com/leaderboard";

  fetch(url)
    .then(res => res.json())
    .then(players => {
      const list = document.getElementById("leaderboardList");
      list.innerHTML = "";
      players.forEach((p, i) => {
        const li = document.createElement("li");
        li.textContent = `${i + 1}. @${p.username || "user"} - ${type === "competition" ? p.competitionScore : p.totalScore}`;
        list.appendChild(li);
      });
    });
}

// Toggle Leaderboard
document.getElementById("toggleLeaderboard").addEventListener("click", () => {
  const label = document.getElementById("toggleLeaderboard").textContent;
  if (label.includes("Competition")) {
    loadLeaderboards("competition");
    document.getElementById("toggleLeaderboard").textContent = "Show Global Leaderboard";
  } else {
    loadLeaderboards("global");
    document.getElementById("toggleLeaderboard").textContent = "Show Competition Leaderboard";
  }
});

// Load leaderboard on page load
loadLeaderboards("global");


