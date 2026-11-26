// ==================== WHO IS SUS? - MAIN SKETCH.JS ====================

let currentScreen = "screen0"; // "screen0" = Start, "screen2" = Gameplay, "screen3" = End
let localUsername = "Pratesh09";
let userRank = ""; // "Dev", "Admin", "Moderator"

// Role System (1-17)
let role = 1; // Default to Killer or assigned role
const ROLE_NAMES = [
  "Killer", "Guardian Angel", "Sheriff", "Doctor", 
  "Detective", "Jester", "Innocent", "Hunter", 
  "Vampire", "Swapper", "Hacker", "Altruist", 
  "Witch", "Warden", "Executioner", "Arsonist", "Magic Killer"
];

// Target Cards for Gameplay
let targetCards = [];
let isTargetAlive = [true, true, true];

// Cooldown & Announcements
let abilityCooldown = false;
let cooldownTimer = 0;
let announcementText = "";
let announcementHoldTimer = 0;

// Game End Summary
let endSummaryText = "";

function setup() {
  createCanvas(windowWidth, windowHeight);
  textAlign(CENTER, CENTER);
  rectMode(CORNER);

  // Initialize 3 target cards for gameplay
  let cardWidth = 180;
  let cardHeight = 220;
  let spacing = 40;
  let totalWidth = (3 * cardWidth) + (2 * spacing);
  let startX = (width - totalWidth) / 2;
  let startY = height / 2 + 50;

  for (let i = 0; i < 3; i++) {
    targetCards.push({
      x: startX + i * (cardWidth + spacing),
      y: startY,
      w: cardWidth,
      h: cardHeight,
      label: "Player " + (i + 2)
    });
  }
}

function draw() {
  background(26, 26, 26); // Dark sleek theme

  // --- COOLDOWN TICKER ---
  if (abilityCooldown) {
    cooldownTimer -= deltaTime / 1000; // Decrement by seconds using delta time
    if (cooldownTimer <= 0) {
      abilityCooldown = false;
      cooldownTimer = 0;
    }
  }

  // --- ANNOUNCEMENT BANNER TIMER ---
  if (announcementHoldTimer > 0) {
    announcementHoldTimer -= deltaTime / 1000;
  }

  // --- SCREEN ROUTING ---
  if (currentScreen === "screen0") {
    drawStartScreen();
  } else if (currentScreen === "screen2") {
    drawGameplayScreen();
  } else if (currentScreen === "screen3") {
    drawEndScreen();
  }
}

// ==================== SCREEN 0: START MENU ====================
function drawStartScreen() {
  fill(255);
  textSize(42);
  textStyle(BOLD);
  text("Who is Sus? 🕵️‍♂️🔍", width / 2, height / 2 - 100);

  // Singleplayer Button
  drawButton(width / 2 - 130, height / 2 - 120, 260, 45, "Start Singleplayer", color(46, 204, 113));
  
  // Credits Button
  drawButton(width / 2 - 130, height / 2 + 75, 260, 35, "Credits & Info", color(52, 152, 219));
}

// ==================== SCREEN 2: GAMEPLAY ====================
function drawGameplayScreen() {
  fill(255);
  textSize(26);
  textStyle(BOLD);
  text("Your Role: " + getRoleName(role), width / 2, 35);
  textSize(16);
  fill(180);
  text(localUsername + (userRank ? " (" + userRank + ")" : ""), width / 2, 65);

  // Show Cooldown warning if active
  if (abilityCooldown) {
    fill(231, 76, 60);
    textSize(14);
    text("⏳ Cooldown Active: " + ceil(cooldownTimer) + "s", width / 2, 95);
  }

  // Announcement Banner
  if (announcementHoldTimer > 0) {
    fill(241, 196, 15);
    textSize(16);
    textStyle(BOLD);
    text("📢 " + announcementText, width / 2, 125);
  }

  // Draw Target Cards
  for (let i = 0; i < 3; i++) {
    let card = targetCards[i];
    let isAlive = isTargetAlive[i];
    
    fill(isAlive ? color(45, 52, 54) : color(80, 25, 25));
    stroke(isAlive ? color(180) : color(231, 76, 60));
    strokeWeight(2);
    rect(card.x, card.y, card.w, card.h, 12);
    noStroke();

    fill(255);
    textSize(22);
    text(card.label, card.x + card.w / 2, card.y + 40);

    if (!isAlive) {
      fill(231, 76, 60);
      textSize(16);
      textStyle(BOLD);
      text("ELIMINATED", card.x + card.w / 2, card.y + 90);
    }
  }

  // Top Action Buttons (In-Game Controls & Staff Portal)
  drawButton(20, 20, 150, 35, "In-Game Controls", color(108, 122, 137));
  drawButton(180, 20, 120, 35, "Staff Portal", color(41, 128, 185));

  // --- AUTOMATED WIN / END CHECK ---
  let allTargetsEliminated = isTargetAlive.every(alive => alive === false);
  if (allTargetsEliminated) {
    endSummaryText = "All targets have been neutralized successfully!";
    currentScreen = "screen3";
  }
}

// ==================== SCREEN 3: END SCREEN ====================
function drawEndScreen() {
  fill(46, 204, 113);
  textSize(36);
  textStyle(BOLD);
  text("Match Concluded", width / 2, height / 2 - 60);

  fill(255);
  textSize(20);
  text(endSummaryText, width / 2, height / 2);

  drawButton(width / 2 - 100, height / 2 + 60, 200, 45, "Main Menu", color(52, 152, 219));
}

// ==================== MOUSE INTERACTIONS ====================
function mousePressed() {
  // Prevent clicks if DOM overlays are open
  if (document.getElementById("staffPanelContainer") || document.getElementById("inGameControlsContainer")) return;

  if (currentScreen === "screen0") {
    // Start Singleplayer Button
    if (mouseX >= width / 2 - 130 && mouseX <= width / 2 + 130 && mouseY >= height / 2 - 120 && mouseY <= height / 2 - 75) {
      resetMatch();
      currentScreen = "screen2";
    }
  } 
  else if (currentScreen === "screen2") {
    
    // Check if ability is on cooldown
    if (abilityCooldown) {
      setPersistentAnnouncement("Ability is on cooldown! Wait " + ceil(cooldownTimer) + "s");
      return;
    }

    // In-Game Controls Button
    if (mouseX >= 20 && mouseX <= 170 && mouseY >= 20 && mouseY <= 55) {
      openInGameControlsPanel();
      return;
    } 
    // Staff Portal Button
    else if (mouseX >= 180 && mouseX <= 300 && mouseY >= 20 && mouseY <= 55) {
      openInteractiveStaffPanel();
      return;
    }

    // Card Selection Logic
    for (let i = 0; i < 3; i++) {
      let card = targetCards[i];
      if (mouseX >= card.x && mouseX <= card.x + card.w && mouseY >= card.y && mouseY <= card.y + card.h) {
        
        // ROLE CHECK: Guardian Angel Protects instead of Killing
        if (role === 2) { 
          setPersistentAnnouncement("Guardian Angel protected Player " + (i + 2) + "!");
          abilityCooldown = true;
          cooldownTimer = 5; // 5 seconds cooldown
          return;
        }

        // ROLE CHECK: Killer or standard roles eliminate targets
        if (isTargetAlive[i]) {
          isTargetAlive[i] = false;
          setPersistentAnnouncement("Eliminated Player " + (i + 2));
          
          // Trigger 5-second cooldown
          abilityCooldown = true;
          cooldownTimer = 5;
        }
      }
    }
  } 
  else if (currentScreen === "screen3") {
    // Back to Menu Button
    if (mouseX >= width / 2 - 100 && mouseX <= width / 2 + 100 && mouseY >= height / 2 + 60 && mouseY <= height / 2 + 105) {
      currentScreen = "screen0";
    }
  }
}

// ==================== HELPER FUNCTIONS ====================
function getRoleName(rIndex) {
  if (rIndex >= 1 && rIndex <= ROLE_NAMES.length) {
    return ROLE_NAMES[rIndex - 1];
  }
  return "Innocent";
}

function setPersistentAnnouncement(msg) {
  announcementText = msg;
  announcementHoldTimer = 3.0; // Show for 3 seconds
}

function resetMatch() {
  isTargetAlive = [true, true, true];
  abilityCooldown = false;
  cooldownTimer = 0;
  // Randomize or assign role for testing (e.g., Role 1 = Killer or Role 2 = Guardian Angel)
  role = floor(random(1, 3)); 
}

function drawButton(x, y, w, h, label, bgCol) {
  fill(bgCol);
  noStroke();
  rect(x, y, w, h, 8);
  fill(255);
  textSize(15);
  textStyle(BOLD);
  text(label, x + w / 2, y + h / 2);
}

// Dummy Panel hooks for DOM integration
function openInGameControlsPanel() {
  console.log("Opening In-Game Controls Modal...");
}

function openInteractiveStaffPanel() {
  console.log("Opening Staff Portal Modal...");
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
}
