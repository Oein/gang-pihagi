import Leaderboard from "./leaderboardSystem";
import notifier from "./notifier";

import "./style.css";

import Two from "two.js";

// Game configuration
const BASE_WIDTH = 600;
const BASE_HEIGHT = 1200; // 1:2 aspect ratio
let GAME_WIDTH = BASE_WIDTH;
let GAME_HEIGHT = BASE_HEIGHT;
let scale = 1;
const PLAYER_SIZE = 60;
const OBJECT_SIZE = 80;
const PLAYER_SPEED = 1500; // pixels per second
const GRAVITY = 600; // pixels per second squared
const INITIAL_VELOCITY = 0; // Objects start with zero velocity
const BASE_SPAWN_INTERVAL = 800; // milliseconds - starting interval
const MIN_SPAWN_INTERVAL = 200; // milliseconds - minimum interval
const GOOD_OBJECT_COLOR = "#4CAF50"; // Green - must collect
const BAD_OBJECT_COLOR = "#F44336"; // Red - must avoid

// Game state
let gameRunning = false;
let score = 0;
let player: any;
let objects: Array<{
  shape: any;
  type: "good" | "bad";
  y: number;
  velocity: number;
}> = [];
let keys: { [key: string]: boolean } = {};
let lastSpawnTime = 0;
let scoreText: any;
let gameOverText: any;

const LDBoard = Leaderboard({
  getGameRunning() {
    return gameRunning;
  },
  kvAPIKey: "gang",
  notifier: notifier,
});

(window as any).lb = LDBoard;

// Setup Two.js
const app = document.getElementById("app")!;
app.innerHTML = `<div id="game-container" style="display: flex; justify-content: center; align-items: center; width: 100vw; height: 100vh; overflow: hidden; background: #fff;"></div>`;

// Add fullscreen styles
document.body.style.margin = "0";
document.body.style.padding = "0";
document.body.style.overflow = "hidden";

const gameContainer = document.getElementById("game-container")!;
const two = new Two({
  width: BASE_WIDTH,
  height: BASE_HEIGHT,
}).appendTo(gameContainer);
two.renderer.domElement.style.border = "2px solid #000";
two.renderer.domElement.style.display = "block";

// Function to resize canvas while maintaining aspect ratio
function resizeCanvas() {
  const windowWidth = window.innerWidth;
  const windowHeight = window.innerHeight;

  // Calculate scale to fit screen while maintaining aspect ratio
  let scaleX = windowWidth / BASE_WIDTH;
  let scaleY = windowHeight / BASE_HEIGHT;

  // Use the smaller scale to fit within viewport
  scale = Math.min(scaleX, scaleY) * 0.9; // 90% for padding

  // Apply CSS transform scale
  two.renderer.domElement.style.transform = `scale(${scale})`;
  two.renderer.domElement.style.minWidth = `${BASE_WIDTH * 1}px`;
  two.renderer.domElement.style.minHeight = `${BASE_HEIGHT * 1}px`;
}

// Initial resize and add resize listener
resizeCanvas();
window.addEventListener("resize", resizeCanvas);

// Add background
// const background = two.makeRectangle(
//   GAME_WIDTH / 2,
//   GAME_HEIGHT / 2,
//   GAME_WIDTH,
//   GAME_HEIGHT
// );
// background.fill = "#1a1a2e";
// background.noStroke();

// Create player
player = two.makeImage(
  "./self.png",
  GAME_WIDTH / 2,
  GAME_HEIGHT - 80,
  PLAYER_SIZE,
  PLAYER_SIZE
);
player.fill = "#2196F3";
player.stroke = "#1976D2";
player.linewidth = 2;

// Score text
scoreText = two.makeText("Score: 0", GAME_WIDTH / 2, 50, {
  size: 32,
  fill: "#000",
  family: "Arial, sans-serif",
  weight: 700,
});
scoreText.visible = false;

// Game over text (hidden initially)
gameOverText = two.makeText(
  "GAME OVER!",
  GAME_WIDTH / 2,
  GAME_HEIGHT / 2 - 50,
  {
    size: 64,
    fill: "#F44336",
    family: "Arial, sans-serif",
    weight: 700,
  }
);
gameOverText.visible = false;

// Title text
const titleText = two.makeText(
  "겡 피하기",
  GAME_WIDTH / 2,
  GAME_HEIGHT / 2 - 150,
  {
    size: 56,
    fill: "#000",
    family: "Arial, sans-serif",
    weight: 700,
  }
);

// Instructions
const instructionText1 = two.makeText(
  "🟢 Green = Collect (必須)",
  GAME_WIDTH / 2,
  GAME_HEIGHT / 2 - 50,
  {
    size: 24,
    fill: "#4CAF50",
    family: "Arial, sans-serif",
  }
);

const instructionText2 = two.makeText(
  "🔴 Red = Avoid (避開)",
  GAME_WIDTH / 2,
  GAME_HEIGHT / 2 - 10,
  {
    size: 24,
    fill: "#F44336",
    family: "Arial, sans-serif",
  }
);

const instructionText3 = two.makeText(
  "Use Arrow Keys or A/D to move",
  GAME_WIDTH / 2,
  GAME_HEIGHT / 2 + 40,
  {
    size: 20,
    fill: "#aaaaaa",
    family: "Arial, sans-serif",
  }
);

// Start button
const startButtonBg = two.makeRoundedRectangle(
  GAME_WIDTH / 2,
  GAME_HEIGHT / 2 + 120,
  200,
  60,
  10
);
startButtonBg.fill = "#4CAF50";
startButtonBg.stroke = "#388E3C";
startButtonBg.linewidth = 3;

const startButtonText = two.makeText(
  "START",
  GAME_WIDTH / 2,
  GAME_HEIGHT / 2 + 120,
  {
    size: 28,
    fill: "#ffffff",
    family: "Arial, sans-serif",
    weight: 700,
  }
);

const startScreen = two.makeGroup(
  titleText,
  instructionText1,
  instructionText2,
  instructionText3,
  startButtonBg,
  startButtonText
);

let plName: string | null = null;
const namePrompt = () => {
  if (plName) return plName;
  // allow only english in lowercase, numbers, _, -
  const name = prompt(
    "이름을 입력하세요 (영어 소문자, 숫자, _, - 만 가능, 최대 10자)"
  );
  if (!name) return null;
  if (name.length > 10) {
    notifier.show("이름이 너무 깁니다. 최대 10자까지 가능합니다.");
    return namePrompt();
  }
  if (!/^[a-z0-9_-]+$/.test(name)) {
    notifier.show("이름에 허용되지 않는 문자가 포함되어 있습니다.");
    return namePrompt();
  }
  plName = name;
  return name;
};

// Restart button (hidden initially)
const restartButtonBg = two.makeRoundedRectangle(
  GAME_WIDTH / 2,
  GAME_HEIGHT / 2 + 50,
  200,
  60,
  10
);
restartButtonBg.fill = "#2196F3";
restartButtonBg.stroke = "#1976D2";
restartButtonBg.linewidth = 3;

const restartButtonText = two.makeText(
  "RESTART",
  GAME_WIDTH / 2,
  GAME_HEIGHT / 2 + 50,
  {
    size: 28,
    fill: "#ffffff",
    family: "Arial, sans-serif",
    weight: 700,
  }
);

const restartButton = two.makeGroup(restartButtonBg, restartButtonText);
restartButton.visible = false;

// Keyboard controls
window.addEventListener("keydown", (e) => {
  keys[e.key] = true;
  // Press Space or Enter to start/restart
  if ((e.key === " " || e.key === "Enter") && !gameRunning) {
    if (startScreen.visible) {
      startGame();
    } else if (restartButton.visible) {
      startGame();
    }
  }
});

window.addEventListener("keyup", (e) => {
  keys[e.key] = false;
});

// Mouse click for buttons
let canvas = two.renderer.domElement;
canvas.addEventListener("click", (e: MouseEvent) => {
  const rect = canvas.getBoundingClientRect();
  // Adjust for scale transform
  const x = (e.clientX - rect.left) / scale;
  const y = (e.clientY - rect.top) / scale;

  // Check start button click
  if (startScreen.visible) {
    const btnX = GAME_WIDTH / 2;
    const btnY = GAME_HEIGHT / 2 + 120;
    if (x > btnX - 100 && x < btnX + 100 && y > btnY - 30 && y < btnY + 30) {
      startGame();
    }
  }

  // Check restart button click
  if (restartButton.visible) {
    const btnX = GAME_WIDTH / 2;
    const btnY = GAME_HEIGHT / 2 + 50;
    if (x > btnX - 100 && x < btnX + 100 && y > btnY - 30 && y < btnY + 30) {
      startGame();
    }
  }
});

// Hover effect for buttons
canvas.style.cursor = "default";
canvas.addEventListener("mousemove", (e: MouseEvent) => {
  const rect = canvas.getBoundingClientRect();
  // Adjust for scale transform
  const x = (e.clientX - rect.left) / scale;
  const y = (e.clientY - rect.top) / scale;

  let overButton = false;

  if (startScreen.visible) {
    const btnX = GAME_WIDTH / 2;
    const btnY = GAME_HEIGHT / 2 + 120;
    if (x > btnX - 100 && x < btnX + 100 && y > btnY - 30 && y < btnY + 30) {
      overButton = true;
    }
  }

  if (restartButton.visible) {
    const btnX = GAME_WIDTH / 2;
    const btnY = GAME_HEIGHT / 2 + 50;
    if (x > btnX - 100 && x < btnX + 100 && y > btnY - 30 && y < btnY + 30) {
      overButton = true;
    }
  }

  canvas.style.cursor = overButton ? "pointer" : "default";
});

// Spawn falling objects
function spawnObject() {
  const isGood = Math.random() > 0.3; // 70% chance of good object
  const x = Math.random() * (GAME_WIDTH - OBJECT_SIZE * 2) + OBJECT_SIZE;

  const imageUrls = ["./0.png", "./1.png", "./2.png", "./3.png"];
  const url = imageUrls[Math.floor(Math.random() * imageUrls.length)];

  const shape = isGood
    ? two.makeImage("./cs.png", x, -OBJECT_SIZE, OBJECT_SIZE, OBJECT_SIZE)
    : two.makeImage(url, x, -OBJECT_SIZE, OBJECT_SIZE, OBJECT_SIZE);
  shape.fill = isGood ? GOOD_OBJECT_COLOR : BAD_OBJECT_COLOR;
  shape.stroke = isGood ? "#388E3C" : "#C62828";
  shape.linewidth = 2;

  objects.push({
    shape,
    type: isGood ? "good" : "bad",
    y: -OBJECT_SIZE,
    velocity: INITIAL_VELOCITY,
  });
}

// Check collision
function checkCollision(obj: {
  shape: any;
  type: "good" | "bad";
  y: number;
  velocity: number;
}) {
  const playerLeft = player.translation.x - PLAYER_SIZE / 2;
  const playerRight = player.translation.x + PLAYER_SIZE / 2;
  const playerTop = player.translation.y - PLAYER_SIZE / 2;
  const playerBottom = player.translation.y + PLAYER_SIZE / 2;

  const objLeft = obj.shape.translation.x - OBJECT_SIZE / 2;
  const objRight = obj.shape.translation.x + OBJECT_SIZE / 2;
  const objTop = obj.y - OBJECT_SIZE / 2;
  const objBottom = obj.y + OBJECT_SIZE / 2;

  return (
    playerLeft < objRight &&
    playerRight > objLeft &&
    playerTop < objBottom &&
    playerBottom > objTop
  );
}

let stTime = Date.now();

// End game
function endGame() {
  gameRunning = false;
  gameOverText.visible = true;
  restartButton.visible = true;

  const playerName = namePrompt();
  if (playerName) {
    const elapsedTime = ((Date.now() - stTime) / 1000).toFixed(2) + "s";
    LDBoard.saveScore(playerName, score, elapsedTime);
  }
}

// Update game
let lastFrameTime = performance.now();

function update() {
  const now = performance.now();
  const deltaTime = (now - lastFrameTime) / 1000; // Convert to seconds
  lastFrameTime = now;

  if (!gameRunning) return;

  // Move player with delta time
  if (
    (keys["ArrowLeft"] || keys["a"] || keys["A"]) &&
    player.translation.x > PLAYER_SIZE / 2
  ) {
    player.translation.x -= PLAYER_SPEED * deltaTime;
  }
  if (
    (keys["ArrowRight"] || keys["d"] || keys["D"]) &&
    player.translation.x < GAME_WIDTH - PLAYER_SIZE / 2
  ) {
    player.translation.x += PLAYER_SPEED * deltaTime;
  }

  // Spawn objects
  const currentTime = Date.now();
  // Calculate spawn interval based on score - decreases as score increases
  // At score 0: 1500ms, gradually decreases to 200ms minimum
  const currentSpawnInterval = Math.max(
    MIN_SPAWN_INTERVAL,
    BASE_SPAWN_INTERVAL - score * 10
  );

  if (currentTime - lastSpawnTime > currentSpawnInterval) {
    spawnObject();
    lastSpawnTime = currentTime;
  }

  // Update objects
  for (let i = objects.length - 1; i >= 0; i--) {
    const obj = objects[i];

    // Apply gravity to velocity (delta time based)
    obj.velocity += GRAVITY * deltaTime;

    // Update position with velocity (delta time based)
    obj.y += obj.velocity * deltaTime;
    obj.shape.translation.y = obj.y;

    // Check collision
    if (checkCollision(obj)) {
      if (obj.type === "bad") {
        // Hit bad object - game over
        endGame();
        return;
      } else {
        // Collected good object
        score += 10;
        scoreText.value = `Score: ${score}`;
        two.remove(obj.shape);
        objects.splice(i, 1);
      }
    }
    // Object passed by
    else if (obj.y > GAME_HEIGHT + OBJECT_SIZE) {
      if (obj.type === "good") {
        // Missed good object - game over
        endGame();
        return;
      } else {
        // Bad object passed by - add score
        score += 5;
        scoreText.value = `Score: ${score}`;
      }
      two.remove(obj.shape);
      objects.splice(i, 1);
    }
  }
}

requestAnimationFrame(function animate() {
  requestAnimationFrame(animate);
  update();
  two.update();
});

// Start game
function startGame() {
  gameRunning = true;
  score = 0;
  objects.forEach((obj) => two.remove(obj.shape));
  objects = [];
  player.translation.x = GAME_WIDTH / 2;
  scoreText.value = "Score: 0";
  scoreText.visible = true;
  gameOverText.visible = false;
  startScreen.visible = false;
  restartButton.visible = false;
  lastSpawnTime = Date.now();
  stTime = Date.now();

  // notifier.show("Game Started! Collect green, avoid red!");
}

two.play();
