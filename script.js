const backendURL = "https://tondropgamebackend.onrender.com";
let tg = window.Telegram.WebApp;
let telegramId = tg?.initDataUnsafe?.user?.id || null;
let score = 0, gameInterval, dropInterval, objects = [];
let boostExpiresAt = null;

const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

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
  let type = 'ton';
  if (rand < 0.15) type = 'freeze';
  else if (rand < 0.25) type = 'bomb';
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
        let points = isBoostActive() ? 10 : 1;
        score += points;
        document.getElementById("currentScore").innerText = `Score: ${score}`;
      } else if (obj.type === 'freeze') {
        clearInterval(gameInterval);
        clearInterval(dropInterval);
        setTimeout(() => {
          gameInterval = setInterval(updateObjects, 40);
          dropInterval = setInterval(spawnObject, 500); // RESTART drops
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

function startGame() {
  score = 0;
  objects = [];
  document.getElementById("currentScore").innerText = "Score: 0";
  gameInterval = setInterval(updateObjects, 40);
  dropInterval = setInterval(spawnObject, 500); // faster drops
}

function endGame() {
  clearInterval(gameInterval);
  clearInterval(dropInterval);
  alert("💥 You hit a bomb!");
  if (!telegramId) return alert("Telegram not connected");

  fetch(`${backendURL}/submit-score`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ telegramId, score }),
  }).then(() => {
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
  }).then(res => res.json()).then(data => {
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

function isBoostActive() {
  return boostExpiresAt && new Date(boostExpiresAt) > new Date();
}

function checkBoostStatus() {
  if (!telegramId) return;
  fetch(`${backendURL}/player/${telegramId}`)
    .then(res => res.json())
    .then(data => {
      boostExpiresAt = data.subscriptionExpiresAt;
      const statusEl = document.getElementById("multiplierStatus");
      if (isBoostActive()) {
        statusEl.style.display = "block";
        startBoostCountdown(new Date(boostExpiresAt));
      } else {
        statusEl.style.display = "none";
      }
    });
}

function startBoostCountdown(endTime) {
  const statusEl = document.getElementById("multiplierStatus");
  const interval = setInterval(() => {
    const now = new Date();
    const diff = endTime - now;
    if (diff <= 0) {
      statusEl.style.display = "none";
      clearInterval(interval);
      return;
    }
    const mins = Math.floor(diff / 60000);
    const secs = Math.floor((diff % 60000) / 1000);
    statusEl.innerText = `🔥 10× BOOST ACTIVE – ${mins}m ${secs}s left`;
  }, 1000);
}

function triggerBoostManually() {
  if (!telegramId) return alert("Telegram not connected");
  alert("Send 0.5 TON to this wallet to activate BOOST:\n\nUQByIARiM4JD6Hr75kctx3lY3Qn34E2x1tdfIukMlagZPpYY\n\nYour boost will be active for 72 hours.");

  fetch(`${backendURL}/subscribe`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ telegramId }),
  }).then(() => {
    checkBoostStatus();
  });
}

window.onload = () => {
  fetchTotalScore();
  fetchLeaderboard();
  checkBoostStatus();

  // Bind boost button if it exists
  const boostBtn = document.getElementById("boostBtn");
  if (boostBtn) {
    boostBtn.addEventListener("click", triggerBoostManually);
  }
};
