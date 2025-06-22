const backendURL = "https://tondropgamebackend.onrender.com";
let tg = window.Telegram.WebApp;
let telegramId = tg?.initDataUnsafe?.user?.id || null;
let score = 0, gameInterval, objects = [], multiplierActive = false;

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
  const type = Math.random() < 0.7 ? 'ton' : (Math.random() < 0.5 ? 'bomb' : 'freeze');
  objects.push({ x: Math.random() * 280 + 10, y: 0, type });
}

function updateObjects() {
  objects.forEach(obj => obj.y += 2); // 🐢 slower falling speed
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
        let point = multiplierActive ? 10 : 1;
        score += point;
        document.getElementById("currentScore").innerText = `Score: ${score}`;
      } else if (obj.type === 'freeze') {
        clearInterval(gameInterval);
        setTimeout(() => {
          gameInterval = setInterval(gameLoop, 800); // restore after freeze
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
  gameInterval = setInterval(gameLoop, 800); // 🐢 reduced frequency
}

function gameLoop() {
  spawnObject();
  updateObjects();
}

function endGame() {
  clearInterval(gameInterval);
  alert("💥 You hit a bomb!");
  if (!telegramId) return alert("Telegram not connected");

  fetch(`${backendURL}/submit-score`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ telegramId, score }),
  }).then(res => res.json()).then(() => {
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

function fetchSubscriptionStatus() {
  if (!telegramId) return;
  fetch(`${backendURL}/subscription-status/${telegramId}`)
    .then(res => res.json())
    .then(data => {
      multiplierActive = data.isActive;
      const status = document.getElementById("multiplierStatus");
      if (multiplierActive) {
        status.style.display = "block";
      } else {
        status.style.display = "none";
      }
    })
    .catch(() => {
      document.getElementById("multiplierStatus").style.display = "none";
    });
}

window.onload = () => {
  fetchTotalScore();
  fetchLeaderboard();
  fetchSubscriptionStatus();
};
