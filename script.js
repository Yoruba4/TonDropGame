// script.js - Updated Game Logic with Wallet Memory & Referrals

let telegramId = null; let username = null; let walletAddress = localStorage.getItem("wallet") || ""; document.addEventListener("DOMContentLoaded", () => { Telegram.WebApp.ready(); telegramId = Telegram.WebApp.initDataUnsafe.user.id.toString(); username = Telegram.WebApp.initDataUnsafe.user.username || "anon";

document.getElementById("walletInput").value = walletAddress; if (walletAddress) fetchPlayerData(); registerReferral(); });

function saveWallet() { const input = document.getElementById("walletInput"); const wallet = input.value.trim(); if (!wallet) return alert("Enter your TON wallet");

walletAddress = wallet; localStorage.setItem("wallet", wallet);

fetch("https://tondropgamebackend.onrender.com/save-wallet", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ telegramId, wallet, username }), }) .then((res) => res.json()) .then((data) => { if (data.success) { alert("Wallet saved!"); fetchPlayerData(); } else { alert("Failed to save wallet."); } }); }

// Referral tracking const urlParams = new URLSearchParams(window.location.search); const referrer = urlParams.get("ref"); function registerReferral() { if (!referrer || telegramId === referrer) return; fetch("https://tondropgamebackend.onrender.com/refer", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ telegramId, username, referrer }), }); }

// Game setup const canvas = document.getElementById("gameCanvas"); const ctx = canvas.getContext("2d"); let score = 0; let isPlaying = false; let objects = []; let gameLoop;

function startGame() { if (!walletAddress) return alert("Please save your wallet first."); score = 0; isPlaying = true; objects = []; spawnObject(); gameLoop = setInterval(updateGame, 40); }

function spawnObject() { const types = ["ball", "red", "freeze"]; const chance = Math.random(); let type = "ball"; if (chance < 0.1) type = "red"; // 10% red else if (chance < 0.15) type = "freeze"; // 5% freeze

const obj = { x: Math.random() * 260, y: -20, type, }; objects.push(obj); if (isPlaying) setTimeout(spawnObject, 1000); // drop every 1s }

function updateGame() { ctx.clearRect(0, 0, 300, 400); objects.forEach((obj) => { obj.y +=


