// script.js - Full, Fixed for Red Bomb, Freeze Ball, Score Submit Limiting

const canvas = document.getElementById("gameCanvas"); const ctx = canvas.getContext("2d"); const startBtn = document.getElementById("startBtn"); const currentScoreEl = document.getElementById("currentScore"); const totalScoreEl = document.getElementById("totalScore"); const leaderboardList = document.getElementById("leaderboardList"); const multiplierStatus = document.getElementById("multiplierStatus");

let score = 0; let totalScore = 0; let gameInterval; let gameObjects = []; let isFrozen = false; let scoreSubmitted = false; let currentLeaderboard = "global"; // or "competition"

let user = { telegramId: null, username: null, wallet: null, };

function saveWallet() { const walletInput = document.getElementById("walletInput").value; if (!walletInput || !window.Telegram.WebApp.initDataUnsafe.user) return;

const tgUser = window.Telegram.WebApp.initDataUnsafe.user; user.telegramId = tgUser.id.toString(); user.username = tgUser.username || "anon" + tgUser.id; user.wallet = walletInput;

fetch("/save-wallet", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ telegramId: user.telegramId, username: user.username, wallet: walletInput, }), }) .then((res) => res.json()) .then((data) => { if (data.success) { alert("Wallet saved. You can now start playing!"); startBtn.disabled = false; fetchPlayerScore(); } }); }

function fetchPlayerScore() { fetch(/player/${user.telegramId}) .then((res) => res.json()) .then((data) => { totalScore = data.totalScore || 0; totalScoreEl.textContent = Total Score: ${totalScore}; }); }

function startGame() { if (!user.wallet) { alert("Please save your wallet first."); return; } score = 0; scoreSubmitted = false; currentScoreEl.textContent = "Score: 0"; gameObjects = []; gameInterval = setInterval(updateGame, 30); spawnObject(); }

function stopGame() { clearInterval(gameInterval); gameInterval = null; submitScore(); }

function submitScore() { if (scoreSubmitted || score === 0) return; scoreSubmitted = true;

fetch("/submit-score", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ telegramId: user.telegramId, username: user.username, score, }), }).then(() => fetchLeaderboards()); }

function updateGame() { ctx.clearRect(0, 0, canvas.width, canvas.height);

if (!isFrozen) { for (const obj of gameObjects) { obj.y += 2; } }

gameObjects = gameObjects.filter((obj) => obj.y < canvas.height);

for (const obj of gameObjects) { ctx.fillStyle = obj.color; ctx.beginPath(); ctx.arc(obj.x, obj.y, obj.r, 0, Math.PI * 2); ctx.fill(); } }

function spawnObject() { const colors = ["blue", "green", "red"]; const types = ["normal", "freeze", "bomb"]; const pick = Math.random();

let type = "normal"; let color = "blue"; if (pick < 0.1) { type = "bomb"; color = "red"; } else if (pick < 0.2) { type = "freeze"; color = "green"; }

gameObjects.push({ x: Math.random() * 280 + 10, y: 0, r: 15, type, color, });

if (gameInterval) { setTimeout(spawnObject, 700); // speed adjusted slower } }

canvas.addEventListener("click", (e) => { const rect = canvas.getBoundingClientRect(); const x = e.clientX - rect.left; const y = e.clientY - rect.top;

for (let i = 0; i < gameObjects.length; i++) { const obj = gameObjects[i]; const dx = obj.x - x; const dy = obj.y - y; if (dx * dx + dy * dy < obj.r * obj.r) { if (obj.type === "normal") { score++; currentScoreEl.textContent = Score: ${score}; } else if (obj.type === "freeze") { isFrozen = true; setTimeout(() => (isFrozen = false), 3000); } else if (obj.type === "bomb") { alert("Game Over! You hit a bomb."); stopGame(); return; } gameObjects.splice(i, 1); break; } } });

function fetchLeaderboards() { fetch("/leaderboard") .then((res) => res.json()) .then((players) => { if (currentLeaderboard === "global") { updateLeaderboard(players); } });

fetch("/competition-leaderboard") .then((res) => res.json()) .then((players) => { if (currentLeaderboard === "competition") { updateLeaderboard(players, true); } }); }

function updateLeaderboard(players, isCompetition = false) { leaderboardList.innerHTML = ""; players.forEach((p, i) => { const li = document.createElement("li"); li.textContent = #${i + 1} @${p.username || p.telegramId} - ${isCompetition ? p.competitionScore : p.totalScore}; leaderboardList.appendChild(li); }); }

function switchLeaderboard() { currentLeaderboard = currentLeaderboard === "global" ? "competition" : "global"; fetchLeaderboards(); }

// Startup window.onload = () => { if (window.Telegram.WebApp.initDataUnsafe.user) { const tgUser = window.Telegram.WebApp.initDataUnsafe.user; user.telegramId = tgUser.id.toString(); user.username = tgUser.username || "anon" + tgUser.id; fetchPlayerScore(); fetchLeaderboards(); } };




