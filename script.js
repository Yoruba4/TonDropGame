// ✅ FULL WORKING script.js FOR TON DROP GAME (fixed: wallet saving, score submitting, leaderboards, freeze, red ball)

const canvas = document.getElementById("gameCanvas"); const ctx = canvas.getContext("2d"); const startBtn = document.getElementById("startBtn"); const currentScoreEl = document.getElementById("currentScore"); const leaderboardList = document.getElementById("leaderboardList"); const toggleBtn = document.getElementById("toggleLeaderboard");

let score = 0; let totalScore = 0; let gameInterval; let gameObjects = []; let isFrozen = false; let scoreSubmitted = false; let currentLeaderboard = "global";

let user = { telegramId: null, username: null, wallet: null, };

function saveWallet() { const walletInput = document.getElementById("walletInput").value; const referral = document.getElementById("referralInput")?.value; const tgUser = window.Telegram.WebApp.initDataUnsafe.user;

if (!walletInput || !tgUser) return alert("Missing wallet or Telegram user.");

user.telegramId = tgUser.id.toString(); user.username = tgUser.username || ("anon" + tgUser.id); user.wallet = walletInput;

fetch("/save-wallet", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ telegramId: user.telegramId, username: user.username, wallet: user.wallet }) }) .then(res => res.json()) .then(data => { if (data.success) { alert("Wallet saved successfully!"); startBtn.disabled = false; if (referral) submitReferral(referral); fetchPlayerScore(); } else { alert("Failed to save wallet."); } }); }

function submitReferral(referrer) { fetch("/refer", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ telegramId: user.telegramId, username: user.username, referrer }) }) .then(res => res.json()) .then(data => { if (data.success) alert("Referral submitted!"); }); }

function fetchPlayerScore() { fetch(/player/${user.telegramId}) .then(res => res.json()) .then(data => { totalScore = data.totalScore || 0; document.getElementById("totalScore")?.textContent = Total Score: ${totalScore}; }); }

function startGame() { if (!user.wallet) return alert("Save wallet first"); score = 0; scoreSubmitted = false; currentScoreEl.textContent = "Score: 0"; gameObjects = []; gameInterval = setInterval(updateGame, 30); spawnObject(); }

function stopGame() { clearInterval(gameInterval); gameInterval = null; submitScore(); }

function submitScore() { if (scoreSubmitted || score === 0) return; scoreSubmitted = true;

fetch("/submit-score", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ telegramId: user.telegramId, username: user.username, score }) }) .then(res => res.json()) .then(() => { fetchPlayerScore(); fetchLeaderboards(); }); }

function updateGame() { ctx.clearRect(0, 0, canvas.width, canvas.height); if (!isFrozen) { for (const obj of gameObjects) { obj.y += 2; } }

gameObjects = gameObjects.filter(obj => obj.y <

