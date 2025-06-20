const telegram = window.Telegram.WebApp;
telegram.expand();

const apiBase = "https://tondropgamebackend.onrender.com";

const connectBtn = document.getElementById("connect-btn");
const saveWalletBtn = document.getElementById("save-wallet-btn");
const walletInput = document.getElementById("wallet-input");
const scoreDisplay = document.getElementById("score");
const totalScoreDisplay = document.getElementById("total-score");
const leaderboardList = document.getElementById("leaderboard-list");
const tapBtn = document.getElementById("tap-btn");

let telegramId = null;
let score = 0;

// INIT
window.onload = async () => {
  if (!telegram.initDataUnsafe?.user?.id) {
    alert("Telegram not connected");
    return;
  }

  telegramId = telegram.initDataUnsafe.user.id.toString();

  // Load total score
  fetch(`${apiBase}/my-score/${telegramId}`)
    .then((res) => res.json())
    .then((data) => {
      totalScoreDisplay.innerText = `Total Score: ${data.totalScore || 0}`;
    });

  // Load leaderboard
  fetch(`${apiBase}/leaderboard`)
    .then((res) => res.json())
    .then((players) => {
      leaderboardList.innerHTML = "";
      players.forEach((p, i) => {
        const li = document.createElement("li");
        li.innerText = `${i + 1}. ${p.wallet?.slice(0, 8) || "User"} - ${p.totalScore}`;
        leaderboardList.appendChild(li);
      });
    });
};

// Tapping to earn points
tapBtn.addEventListener("click", () => {
  score += 1;
  scoreDisplay.innerText = `Score: ${score}`;

  // Send score to backend
  fetch(`${apiBase}/score`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ telegramId, score }),
  });
});

// Save wallet
saveWalletBtn.addEventListener("click", () => {
  const wallet = walletInput.value.trim();
  if (!wallet) return alert("Enter your wallet address");

  fetch(`${apiBase}/wallet`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ telegramId, wallet }),
  })
    .then((res) => res.json())
    .then((res) => {
      if (res.success) {
        alert("Wallet saved!");
      } else {
        alert("Failed to save wallet");
      }
    });
});
