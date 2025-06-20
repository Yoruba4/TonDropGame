const BACKEND_URL = 'https://tondropgamebackend.onrender.com';

let score = 0;
let isFrozen = false;
let playerId = null;
let subscriptionExpiresAt = null;

const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");
canvas.width = 360;
canvas.height = 600;

const objects = [];
const objectTypes = ["ton", "freeze", "bomb"];

function getRandomType() {
  const rand = Math.random();
  if (rand < 0.7) return "ton";
  if (rand < 0.9) return "freeze";
  return "bomb";
}

function spawnObject() {
  const type = getRandomType();
  objects.push({
    x: Math.random() * (canvas.width - 30),
    y: 0,
    radius: 15,
    type: type,
    color: type === "ton" ? "gold" : type === "freeze" ? "skyblue" : "red"
  });
}

function drawObjects() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  for (const obj of objects) {
    ctx.beginPath();
    ctx.arc(obj.x, obj.y, obj.radius, 0, Math.PI * 2);
    ctx.fillStyle = obj.color;
    ctx.fill();
    ctx.closePath();
  }
}

function updateObjects() {
  for (const obj of objects) {
    obj.y += 2;
    if (obj.y >= canvas.height - 60) {
      handleCatch(obj);
      objects.splice(objects.indexOf(obj), 1);
    }
  }
}

function handleCatch(obj) {
  if (obj.type === "bomb") {
    alert("💣 Game Over!");
    score = 0;
    sendScore(score);
  } else if (obj.type === "freeze") {
    isFrozen = true;
    setTimeout(() => { isFrozen = false; }, 3000);
  } else {
    const now = new Date();
    const boostActive = subscriptionExpiresAt && new Date(subscriptionExpiresAt) > now;
    score += boostActive ? 10 : 1;
    updateScoreDisplay();
    sendScore(score);
  }
}

function gameLoop() {
  if (!isFrozen) {
    updateObjects();
    drawObjects();
  }
  requestAnimationFrame(gameLoop);
}

function updateScoreDisplay() {
  document.getElementById("score").innerText = `Score: ${score}`;
}

function sendScore(score) {
  if (!playerId) return;
  fetch(`${BACKEND_URL}/score`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ telegramId: playerId, score })
  });
}

function startSpawning() {
  setInterval(spawnObject, 1000);
}

document.getElementById("saveWallet").addEventListener("click", async () => {
  const wallet = document.getElementById("wallet").value.trim();
  if (!wallet) return alert("Enter a wallet address!");

  const tg = window.Telegram?.WebApp;
  if (!tg?.initDataUnsafe?.user?.id) return alert("Telegram not connected");

  playerId = tg.initDataUnsafe.user.id;

  const res = await fetch(`${BACKEND_URL}/wallet`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ telegramId: playerId, wallet })
  });

  const data = await res.json();
  if (data.success) {
    subscriptionExpiresAt = data.subscriptionExpiresAt;
    alert("Wallet saved! Game is ready.");
    document.getElementById("gameCanvas").style.display = "block";
    startSpawning();
    gameLoop();
  } else {
    alert("Failed to save wallet.");
  }
});

async function loadLeaderboard() {
  const res = await fetch(`${BACKEND_URL}/leaderboard`);
  const top = await res.json();
  const ul = document.getElementById("leaderboard");
  ul.innerHTML = "";
  top.forEach(p => {
    const li = document.createElement("li");
    li.innerText = `ID: ${p.telegramId}, Score: ${p.totalScore}`;
    ul.appendChild(li);
  });
}

window.onload = () => {
  loadLeaderboard();
  updateScoreDisplay();
};
