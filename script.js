const backendURL = "https://tondropgamebackend.onrender.com";
let tg = window.Telegram.WebApp;
let telegramId = tg?.initDataUnsafe?.user?.id || null;
let score = 0, gameInterval, objects = [], gameStarted = false;

const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

// BOOST STATUS UI
function checkMultiplier() {
  if (!telegramId) return;

  fetch(`${backendURL}/player/${telegramId}`)
    .then(res => res.json())
    .then(data => {
      const active = data.subscriptionExpiresAt && new Date(data.subscriptionExpiresAt) > Date.now();
      const status = document.getElementById("multiplierStatus");
      status.style.display = active ? "block" : "none";
    });
}

// BOOST TRIGGER
function triggerBoost() {
  if (!telegramId) return alert("Telegram not connected");

  fetch(`${backendURL}/subscribe`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ telegramId }),
  })
    .then(res => res.json())
    .then(data => {
      if (data.success) {
        alert("✅ Boost activated for 72 hours!");
        checkMultiplier();
      } else {
        alert("❌ Boost failed. Try again later.");
      }
    })
    .catch(err => {
      console.error(err);
      alert("❌ Error activating boost.");
    });
}

function drawObjects() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  objects.forEach(obj => {
    ctx.fillStyle = obj.type === 'ton' ? 'gold' : obj.type === 'bomb' ? 'red' : 'lightblue';
    ctx.beginPath();
    ctx.arc(obj.x, obj.y, 15, 0, Math.PI * 2);
    ctx.fill();
  });
}

function spawnObject() {
  const rand = Math.random();
  const type = rand < 0.7 ? 'ton' : rand < 0.85 ? 'freeze' : 'bomb';
  objects.push({ x: Math.random() * 280 + 10, y: 0, type });
}

function updateObjects() {
  objects.forEach(obj => obj.y += 4);
  objects = objects.filter(obj => obj.y < canvas.height);
  drawObjects();
}

canvas.addEventListener("click", (e) => {
  const rect = canvas.getBoundingClientRect();
  const clickX = e.clientX - rect.left;
  const clickY = e.clientY - rect.top;

  for (let i = 0; i < objects.length; i++) {
    const obj = objects[i];
    const dist = Math.hypot(obj.x - clickX, obj.y - clickY);
    if (dist < 20) {
      if (obj.type === 'ton') {
        fetch(`${backendURL}/player/${telegramId}`)
          .then(res => res.json())
          .then(data => {
            const active = data.subscriptionExpiresAt && new Date(data.subscriptionExpiresAt) > Date.now();
            score += active ? 10 : 1;
            document.getElementById("currentScore").innerText = `Score: ${score}`;
          });
      } else if (obj.type === 'freeze') {
        clearInterval(gameInterval);
        setTimeout(() => {
          gameInterval = setInterval(gameLoop, 400);
        }, 3000);
      } else if (obj.type === 'bomb') {
        endGame();
        return;
      }
      objects.splice(i, 1);
      break;
    }
  }
});

function gameLoop() {
  if (Math.random() < 0.8 && objects.length < 1) {
    spawnObject();
  }
  updateObjects();
}

function startGame() {
  if (!telegramId) return alert("Telegram not connected");
  score = 0;
  objects = [];
  gameStarted = true;
  document.getElementById("currentScore").innerText = "Score: 0";
  gameInterval = setInterval(gameLoop, 400);
}

function endGame() {
  clearInterval(gameInterval);
  gameStarted = false;
  alert("💥 You hit a bomb!");

  fetch(`${backendURL}/submit-score`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ telegramId, score }),
  })
    .then(res => res.json())
    .then(() => {
      fetchTotalScore();
      fetchLeaderboard();
    });
}

function saveWallet() {
  const wallet = document.getElementById("walletInput").value;
  if (!telegramId) return alert("Telegram not connected");
  if (!wallet) return alert("Enter wallet");

  fetch(`${backendURL}/save-wallet`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ telegramId, wallet }),
  })
    .then(res => res.json())
    .then(data => {
      alert(data.success ? "Wallet saved!" : "Failed to save");
    });
}

function fetchTotalScore() {
  if (!telegramId) return;
  fetch(`${backendURL}/player/${telegramId}`)
    .then(res => res.json())
    .then(data => {
      document.getElementById("totalScore").innerText = `Total Score: ${data.totalScore || 0}`;
    });
}

function fetchLeaderboard() {
  fetch(`${backendURL}/leaderboard`)
    .then(res => res.json())
    .then(data => {
      const list = document.getElementById("leaderboardList");
      list.innerHTML = "";
      data.forEach(player => {
        const li = document.createElement("li");
        li.innerText = `ID: ${player.telegramId.slice(-5)} | Score: ${player.totalScore}`;
        list.appendChild(li);
      });
    });
}

window.onload = () => {
  fetchTotalScore();
  fetchLeaderboard();
  checkMultiplier();
};
