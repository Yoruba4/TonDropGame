const backendURL = "https://tondropgamebackend.onrender.com";
let tg = window.Telegram.WebApp;
let telegramId = tg?.initDataUnsafe?.user?.id || null;

let score = 0, gameInterval = null, spawnInterval = null, objects = [];

const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

function drawObjects() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  objects.forEach(obj => {
    ctx.fillStyle =
      obj.type === "ton" ? "gold" :
      obj.type === "bomb" ? "red" :
      "lightblue";
    ctx.beginPath();
    ctx.arc(obj.x, obj.y, 15, 0, Math.PI * 2);
    ctx.fill();
  });
}

function spawnObject() {
  const rand = Math.random();
  let type = "ton";

  if (rand < 0.75) type = "ton";        // 75% chance
  else if (rand < 0.90) type = "freeze"; // 15% chance
  else type = "bomb";                   // 10% chance

  const x = Math.random() * (canvas.width - 30) + 15;
  objects.push({ x, y: 0, type });
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
      if (obj.type === "ton") {
        score++;
        document.getElementById("currentScore").innerText = `Score: ${score}`;
      } else if (obj.type === "freeze") {
        pauseGameForFreeze();
      } else if (obj.type === "bomb") {
        endGame();
        return;
      }
      objects.splice(i, 1);
      break;
    }
  }
});

function pauseGameForFreeze() {
  clearInterval(spawnInterval);
  clearInterval(gameInterval);
  setTimeout(() => {
    spawnInterval = setInterval(spawnObject, 1000);   // Slower spawn
    gameInterval = setInterval(updateObjects, 50);
  }, 3000);
}

function startGame() {
  score = 0;
  objects = [];
  document.getElementById("currentScore").innerText = "Score: 0";

  if (gameInterval) clearInterval(gameInterval);
  if (spawnInterval) clearInterval(spawnInterval);

  spawnInterval = setInterval(spawnObject, 1000);   // Slower spawn
  gameInterval = setInterval(updateObjects, 50);
}

function endGame() {
  clearInterval(gameInterval);
  clearInterval(spawnInterval);
  alert("💥 You hit a bomb!");
  if (!telegramId) return alert("Telegram not connected");

  fetch(`${backendURL}/submit-score`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ telegramId, score }),
  }).then(res => res.json())
    .then(() => {
      fetchTotalScore();
      fetchLeaderboard();
    });
}

function saveWallet() {
  const wallet = document.getElementById("walletInput").value;
  if (!telegramId) return alert("Telegram not connected");
  if (!wallet) return alert("Enter wallet address");

  fetch(`${backendURL}/save-wallet`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ telegramId, wallet }),
  }).then(res => res.json())
    .then(data => alert(data.success ? "Wallet saved!" : "Failed to save"));
}

function fetchTotalScore() {
  if (!telegramId) return;
  fetch(`${backendURL}/player/${telegramId}`)
    .then(res => res.json())
    .then(data => {
      document.getElementById("totalScore").innerText =
        `Total Score: ${data.totalScore || 0}`;
    });
}

function fetchLeaderboard() {
  fetch(`${backendURL}/leaderboard`)
    .then(res => res.json())
    .then(data => {
      const list = document.getElementById("leaderboardList");
      list.innerHTML = "";
      data.forEach(p => {
        const li = document.createElement("li");
        li.innerText = `ID:${p.telegramId.slice(-5)} | Score:${p.totalScore}`;
        list.appendChild(li);
      });
    });
}

// On load, only show data. Don't start game automatically
window.onload = () => {
  fetchTotalScore();
  fetchLeaderboard();
  // Do NOT start game here
};
