
"use strict";

// =====================================
// CUTE PINK GAME PORTFOLIO
// Three-level adventure game
// =====================================

const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

const levelScreen = document.getElementById("levelScreen");
const messageScreen = document.getElementById("messageScreen");

const levelTitle = document.getElementById("levelTitle");
const scoreText = document.getElementById("score");
const starCountText = document.getElementById("starCount");
const progressBar = document.getElementById("progressBar");

const primaryAction = document.getElementById("primaryAction");
const menuAction = document.getElementById("menuAction");

const WIDTH = canvas.width;
const HEIGHT = canvas.height;
const PLAYER_SIZE = 28;
const EXIT = { x: 838, y: 232, w: 38, h: 54 };

const levels = [
  {
    name: "Pink Garden",
    emoji: "🌸",
    starsNeeded: 5,
    background: "#dff7d7",
    ground: "#b6e9a8",
    obstacleColor: "#6bbd86",
    stars: [
      [150, 90], [300, 400], [420, 120],
      [600, 380], [740, 100]
    ],
    obstacles: [
      { x: 190, y: 170, w: 120, h: 32 },
      { x: 390, y: 270, w: 32, h: 100 },
      { x: 520, y: 110, w: 120, h: 30 },
      { x: 690, y: 230, w: 35, h: 100 }
    ],
    moving: []
  },
  {
    name: "Magic Forest",
    emoji: "🦋",
    starsNeeded: 8,
    background: "#d9f3ec",
    ground: "#a9e0c5",
    obstacleColor: "#6cbaa6",
    stars: [
      [125, 90], [250, 400], [340, 110], [455, 380],
      [555, 90], [640, 400], [730, 150], [760, 360]
    ],
    obstacles: [
      { x: 150, y: 200, w: 120, h: 32 },
      { x: 300, y: 250, w: 32, h: 120 },
      { x: 420, y: 130, w: 130, h: 32 },
      { x: 530, y: 280, w: 32, h: 110 },
      { x: 680, y: 230, w: 100, h: 30 }
    ],
    moving: [
      { x: 350, y: 215, w: 70, h: 25, axis: "x", min: 340, max: 530, speed: 95, dir: 1 }
    ]
  },
  {
    name: "Princess Castle",
    emoji: "👑",
    starsNeeded: 10,
    background: "#ece1ff",
    ground: "#d1bafa",
    obstacleColor: "#9d7ce0",
    stars: [
      [110, 90], [190, 400], [285, 100], [355, 390],
      [440, 80], [500, 420], [585, 100], [640, 380],
      [735, 100], [755, 410]
    ],
    obstacles: [
      { x: 125, y: 180, w: 100, h: 32 },
      { x: 250, y: 245, w: 32, h: 125 },
      { x: 315, y: 160, w: 100, h: 30 },
      { x: 420, y: 235, w: 32, h: 130 },
      { x: 485, y: 160, w: 100, h: 30 },
      { x: 600, y: 220, w: 32, h: 140 },
      { x: 675, y: 185, w: 100, h: 30 }
    ],
    moving: [
      { x: 280, y: 315, w: 70, h: 25, axis: "x", min: 280, max: 390, speed: 115, dir: 1 },
      { x: 540, y: 300, w: 70, h: 25, axis: "x", min: 520, max: 650, speed: 130, dir: -1 }
    ]
  }
];

// -------------------------------------
// SAVE AND LOAD PROGRESS
// -------------------------------------

let savedUnlocked = 0;

try {
  savedUnlocked = Number(localStorage.getItem("pinkGameUnlocked")) || 0;
} catch (error) {
  savedUnlocked = 0;
}

let unlockedLevel = Math.max(0, Math.min(2, savedUnlocked));
let currentLevel = 0;
let totalScore = 0;
let collected = [];
let player = { x: 55, y: 245, speed: 235 };
let keys = {};
let touchDirection = "";
let running = false;
let soundEnabled = true;
let lastTime = 0;
let elapsed = 0;
let gameState = "menu";
let audioContext = null;

function saveProgress() {
  try {
    localStorage.setItem("pinkGameUnlocked", String(unlockedLevel));
  } catch (error) {
    // The game still works if browser storage is unavailable.
  }
}

// -------------------------------------
// LEVEL SETUP
// -------------------------------------

function loadLevel(index) {
  if (index > unlockedLevel || index < 0 || index >= levels.length) return;

  currentLevel = index;
  const level = levels[currentLevel];

  player = { x: 55, y: 245, speed: 235 };
  collected = [];
  totalScore = 0;
  elapsed = 0;

  level.moving.forEach(item => {
    item.x = item.axis === "x" ? item.min : item.x;
    item.y = item.axis === "y" ? item.min : item.y;
    item.dir = 1;
  });

  levelTitle.textContent = `${level.emoji} Level ${index + 1} — ${level.name}`;

  levelScreen.classList.add("hidden");
  messageScreen.classList.add("hidden");

  gameState = "playing";
  running = true;
  updateHUD();
  playSound(520, 0.08);
}

function showLevelMenu() {
  running = false;
  gameState = "menu";
  messageScreen.classList.add("hidden");
  levelScreen.classList.remove("hidden");
  updateLevelMenu();
}

function updateLevelMenu() {
  document.querySelectorAll(".level-card").forEach((button, index) => {
    const unlocked = index <= unlockedLevel;

    button.disabled = !unlocked;
    button.classList.toggle("unlocked", unlocked);
    button.classList.toggle("locked", !unlocked);

    document.getElementById(`status${index}`).textContent =
      unlocked ? (index === currentLevel ? "▶ CURRENT" : "PLAY NOW") : "🔒 LOCKED";
  });
}

function updateHUD() {
  const level = levels[currentLevel];
  scoreText.textContent = totalScore;
  starCountText.textContent = `${collected.length} / ${level.starsNeeded}`;
  progressBar.style.width =
    `${(collected.length / level.starsNeeded) * 100}%`;
}

// -------------------------------------
// DRAWING HELPERS
// -------------------------------------

function roundedRect(x, y, w, h, r, fill) {
  ctx.fillStyle = fill;
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, r);
  ctx.fill();
}

function drawBackground() {
  const level = levels[currentLevel];

  ctx.fillStyle = level.background;
  ctx.fillRect(0, 0, WIDTH, HEIGHT);

  ctx.fillStyle = level.ground;
  ctx.fillRect(12, 12, WIDTH - 24, HEIGHT - 24);

  // Soft decorative garden patches
  for (let i = 0; i < 16; i++) {
    const x = 35 + ((i * 127) % 820);
    const y = 35 + ((i * 83) % 430);

    ctx.fillStyle = i % 2 ? "#ffffff38" : "#ffffff52";
    ctx.beginPath();
    ctx.ellipse(x, y, 28, 16, 0.4, 0, Math.PI * 2);
    ctx.fill();
  }

  // Decorative flowers
  for (let i = 0; i < 22; i++) {
    const x = 30 + ((i * 97) % 840);
    const y = 30 + ((i * 61) % 440);

    ctx.font = "17px sans-serif";
    ctx.fillText(i % 2 ? "🌼" : "🌷", x, y);
  }

  // Start marker
  roundedRect(22, 215, 52, 70, 12, "#ffffffa8");
  ctx.font = "12px Nunito, sans-serif";
  ctx.fillStyle = "#a54f82";
  ctx.textAlign = "center";
  ctx.fillText("START", 48, 208);

  // Exit gate
  const ready = collected.length === level.starsNeeded;
  roundedRect(EXIT.x, EXIT.y, EXIT.w, EXIT.h, 9, ready ? "#a77be8" : "#b7a9bc");

  ctx.fillStyle = "#ffffff";
  ctx.beginPath();
  ctx.arc(EXIT.x + 19, EXIT.y + 25, 11, Math.PI, 0);
  ctx.lineTo(EXIT.x + 30, EXIT.y + 43);
  ctx.lineTo(EXIT.x + 8, EXIT.y + 43);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = ready ? "#ffe879" : "#e3d9e8";
  ctx.beginPath();
  ctx.arc(EXIT.x + 26, EXIT.y + 35, 2.5, 0, Math.PI * 2);
  ctx.fill();

  ctx.font = "12px Nunito, sans-serif";
  ctx.fillStyle = "#6b4c88";
  ctx.fillText(ready ? "EXIT OPEN!" : "EXIT", EXIT.x + 19, EXIT.y + 67);

  ctx.textAlign = "left";
}

function drawStar(x, y, collectedStar) {
  if (collectedStar) return;

  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(Math.sin(elapsed * 2 + x) * 0.12);
  ctx.shadowColor = "#ffb52e";
  ctx.shadowBlur = 12;
  ctx.fillStyle = "#ffcf45";
  ctx.strokeStyle = "#ffffff";
  ctx.lineWidth = 2;

  ctx.beginPath();
  for (let i = 0; i < 10; i++) {
    const radius = i % 2 === 0 ? 13 : 6;
    const angle = -Math.PI / 2 + i * Math.PI / 5;
    const px = Math.cos(angle) * radius;
    const py = Math.sin(angle) * radius;

    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.restore();
}

function drawObstacles() {
  const level = levels[currentLevel];

  [...level.obstacles, ...level.moving].forEach(obstacle => {
    roundedRect(
      obstacle.x, obstacle.y, obstacle.w, obstacle.h,
      9, level.obstacleColor
    );

    ctx.fillStyle = "#ffffff65";
    roundedRect(
      obstacle.x + 5, obstacle.y + 4,
      Math.max(0, obstacle.w - 10), 4, 2, "#ffffff65"
    );

    ctx.font = "15px sans-serif";
    ctx.fillText("🌿", obstacle.x + obstacle.w / 2 - 8, obstacle.y + obstacle.h / 2 + 6);
  });
}

function drawPlayer() {
  ctx.save();
  ctx.translate(player.x, player.y);

  // Shadow
  ctx.fillStyle = "#76517a35";
  ctx.beginPath();
  ctx.ellipse(0, 16, 16, 6, 0, 0, Math.PI * 2);
  ctx.fill();

  // Feet
  ctx.fillStyle = "#86546f";
  roundedRect(-11, 10, 8, 9, 4, "#86546f");
  roundedRect(3, 10, 8, 9, 4, "#86546f");

  // Dress
  ctx.fillStyle = "#ff82b5";
  ctx.beginPath();
  ctx.moveTo(-9, -1);
  ctx.lineTo(9, -1);
  ctx.lineTo(15, 13);
  ctx.lineTo(-15, 13);
  ctx.closePath();
  ctx.fill();

  // Arms
  ctx.strokeStyle = "#ffccae";
  ctx.lineWidth = 5;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(-9, 0);
  ctx.lineTo(-14, 8);
  ctx.moveTo(9, 0);
  ctx.lineTo(14, 8);
  ctx.stroke();

  // Hair
  ctx.fillStyle = "#65435b";
  ctx.beginPath();
  ctx.arc(0, -9, 13, Math.PI, 0);
  ctx.lineTo(13, 0);
  ctx.lineTo(8, 7);
  ctx.lineTo(-9, 5);
  ctx.lineTo(-13, 0);
  ctx.closePath();
  ctx.fill();

  // Face
  ctx.fillStyle = "#ffd8b9";
  ctx.beginPath();
  ctx.ellipse(0, -7, 9, 11, 0, 0, Math.PI * 2);
  ctx.fill();

  // Hair fringe
  ctx.fillStyle = "#65435b";
  ctx.beginPath();
  ctx.arc(0, -12, 10, Math.PI, Math.PI * 2);
  ctx.lineTo(9, -7);
  ctx.quadraticCurveTo(0, -15, -9, -6);
  ctx.closePath();
  ctx.fill();

  // Eyes and smile
  ctx.fillStyle = "#45364d";
  ctx.beginPath();
  ctx.arc(-3.5, -7, 1.4, 0, Math.PI * 2);
  ctx.arc(3.5, -7, 1.4, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = "#bc6682";
  ctx.lineWidth = 1.4;
  ctx.beginPath();
  ctx.arc(0, -3, 3, 0.15, Math.PI - 0.15);
  ctx.stroke();

  // Hair bow
  ctx.fillStyle = "#ff5e9d";
  ctx.beginPath();
  ctx.moveTo(5, -19);
  ctx.lineTo(12, -24);
  ctx.lineTo(12, -16);
  ctx.closePath();
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(5, -19);
  ctx.lineTo(-1, -24);
  ctx.lineTo(-1, -16);
  ctx.closePath();
  ctx.fill();

  ctx.restore();
}

// -------------------------------------
// COLLISIONS AND MOVEMENT
// -------------------------------------

function overlaps(a, b) {
  return a.x < b.x + b.w &&
    a.x + a.w > b.x &&
    a.y < b.y + b.h &&
    a.y + a.h > b.y;
}

function getPlayerRect(x = player.x, y = player.y) {
  return {
    x: x - PLAYER_SIZE / 2,
    y: y - PLAYER_SIZE / 2,
    w: PLAYER_SIZE,
    h: PLAYER_SIZE
  };
}

function hitsObstacle(x, y) {
  const rect = getPlayerRect(x, y);
  const level = levels[currentLevel];

  return [...level.obstacles, ...level.moving].some(obstacle =>
    overlaps(rect, obstacle)
  );
}

function updateMovingObstacles(dt) {
  const level = levels[currentLevel];

  level.moving.forEach(item => {
    const axis = item.axis;
    const prop = axis === "x" ? "x" : "y";

    item[prop] += item.speed * item.dir * dt;

    if (item[prop] >= item.max) {
      item[prop] = item.max;
      item.dir = -1;
    } else if (item[prop] <= item.min) {
      item[prop] = item.min;
      item.dir = 1;
    }
  });
}

function getDirection() {
  let dx = 0;
  let dy = 0;

  if (keys.ArrowLeft || keys.a || touchDirection === "left") dx -= 1;
  if (keys.ArrowRight || keys.d || touchDirection === "right") dx += 1;
  if (keys.ArrowUp || keys.w || touchDirection === "up") dy -= 1;
  if (keys.ArrowDown || keys.s || touchDirection === "down") dy += 1;

  if (dx !== 0 && dy !== 0) {
    dx *= Math.SQRT1_2;
    dy *= Math.SQRT1_2;
  }

  return { dx, dy };
}

function updatePlayer(dt) {
  const { dx, dy } = getDirection();

  const nextX = player.x + dx * player.speed * dt;
  const nextY = player.y + dy * player.speed * dt;

  const minX = 30;
  const maxX = WIDTH - 30;
  const minY = 30;
  const maxY = HEIGHT - 30;

  if (nextX >= minX && nextX <= maxX && !hitsObstacle(nextX, player.y)) {
    player.x = nextX;
  }

  if (nextY >= minY && nextY <= maxY && !hitsObstacle(player.x, nextY)) {
    player.y = nextY;
  }
}

// -------------------------------------
// STAR COLLECTION AND LEVEL PROGRESSION
// -------------------------------------

function collectStars() {
  const level = levels[currentLevel];

  level.stars.forEach((star, index) => {
    if (collected.includes(index)) return;

    const distance = Math.hypot(player.x - star[0], player.y - star[1]);

    if (distance < 25) {
      collected.push(index);
      totalScore++;
      updateHUD();
      playSound(760 + collected.length * 45, 0.1);
    }
  });
}

function checkExit() {
  const level = levels[currentLevel];

  if (collected.length !== level.starsNeeded) return;

  if (overlaps(getPlayerRect(), EXIT)) {
    completeLevel();
  }
}

function completeLevel() {
  running = false;
  gameState = "complete";

  const isFinalLevel = currentLevel === levels.length - 1;

  if (!isFinalLevel) {
    unlockedLevel = Math.max(unlockedLevel, currentLevel + 1);
    saveProgress();
    updateLevelMenu();
  }

  document.getElementById("messageIcon").textContent =
    isFinalLevel ? "👑" : "🌟";

  document.getElementById("messageEyebrow").textContent =
    isFinalLevel ? "ALL LEVELS COMPLETE" : `LEVEL ${currentLevel + 1} COMPLETE`;

  document.getElementById("messageTitle").textContent =
    isFinalLevel ? "You're a Pink World Champion!" : "Amazing! Level Complete!";

  document.getElementById("messageText").textContent =
    isFinalLevel
      ? `You collected ${totalScore} stars and conquered all three worlds!`
      : `You collected all ${levels[currentLevel].starsNeeded} stars. The next level is unlocked!`;

  primaryAction.textContent = isFinalLevel ? "Play again ♡" : "Next level ✨";
  messageScreen.classList.remove("hidden");

  playSound(isFinalLevel ? 1000 : 850, 0.25);
}

// -------------------------------------
// SOUND
// -------------------------------------

function playSound(frequency = 600, duration = 0.1) {
  if (!soundEnabled) return;

  try {
    audioContext = audioContext || new (window.AudioContext || window.webkitAudioContext)();

    if (audioContext.state === "suspended") {
      audioContext.resume();
    }

    const oscillator = audioContext.createOscillator();
    const gain = audioContext.createGain();

    oscillator.type = "sine";
    oscillator.frequency.value = frequency;
    gain.gain.setValueAtTime(0.07, audioContext.currentTime);
    gain.gain.exponentialRampToValueAtTime(
      0.001, audioContext.currentTime + duration
    );

    oscillator.connect(gain);
    gain.connect(audioContext.destination);

    oscillator.start();
    oscillator.stop(audioContext.currentTime + duration);
  } catch (error) {
    // The game remains playable if audio is unavailable.
  }
}

// -------------------------------------
// MAIN GAME LOOP
// -------------------------------------

function render() {
  drawBackground();

  const level = levels[currentLevel];

  level.stars.forEach((star, index) => {
    drawStar(star[0], star[1], collected.includes(index));
  });

  drawObstacles();
  drawPlayer();
}

function gameLoop(timestamp) {
  const dt = Math.min((timestamp - lastTime) / 1000 || 0, 0.04);
  lastTime = timestamp;

  if (running) {
    elapsed += dt;
    updateMovingObstacles(dt);
    updatePlayer(dt);
    collectStars();
    checkExit();
  }

  render();
  requestAnimationFrame(gameLoop);
}

// -------------------------------------
// KEYBOARD CONTROLS
// -------------------------------------

window.addEventListener("keydown", event => {
  const key = event.key.length === 1 ? event.key.toLowerCase() : event.key;

  if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", " "].includes(key)) {
    event.preventDefault();
  }

  keys[key] = true;
});

window.addEventListener("keyup", event => {
  const key = event.key.length === 1 ? event.key.toLowerCase() : event.key;
  keys[key] = false;
});

window.addEventListener("blur", () => {
  keys = {};
  touchDirection = "";
});

// -------------------------------------
// MOBILE TOUCH CONTROLS
// -------------------------------------

document.querySelectorAll("[data-dir]").forEach(button => {
  const direction = button.dataset.dir;

  button.addEventListener("pointerdown", event => {
    event.preventDefault();
    touchDirection = direction;

    try {
      button.setPointerCapture(event.pointerId);
    } catch (error) {}
  });

  const stopTouch = () => {
    if (touchDirection === direction) touchDirection = "";
  };

  button.addEventListener("pointerup", stopTouch);
  button.addEventListener("pointercancel", stopTouch);
  button.addEventListener("lostpointercapture", stopTouch);
});

// -------------------------------------
// BUTTONS
// -------------------------------------

document.querySelectorAll(".level-card").forEach(button => {
  button.addEventListener("click", () => {
    loadLevel(Number(button.dataset.level));
  });
});

document.getElementById("restartBtn").addEventListener("click", () => {
  if (gameState !== "menu") loadLevel(currentLevel);
});

document.getElementById("levelMenuBtn").addEventListener("click", showLevelMenu);

document.getElementById("soundBtn").addEventListener("click", () => {
  soundEnabled = !soundEnabled;
  document.getElementById("soundBtn").textContent =
    soundEnabled ? "🔊 Sound" : "🔇 Muted";

  if (soundEnabled) playSound(600, 0.1);
});

primaryAction.addEventListener("click", () => {
  if (currentLevel < levels.length - 1) {
    loadLevel(currentLevel + 1);
  } else {
    loadLevel(0);
  }
});

menuAction.addEventListener("click", showLevelMenu);

document.getElementById("resetProgress").addEventListener("click", () => {
  const confirmed = window.confirm(
    "Reset all unlocked levels? Your progress will be lost."
  );

  if (!confirmed) return;

  unlockedLevel = 0;
  saveProgress();
  updateLevelMenu();
  loadLevel(0);
});

// -------------------------------------
// START GAME
// -------------------------------------

updateLevelMenu();
loadLevel(0);
showLevelMenu();
requestAnimationFrame(gameLoop);
