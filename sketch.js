// ==================== GLOBAL STATE & VARIABLES ====================
let isMultiplayer = false;
let currentRoomCode = "";
let isHost = false;
let playerNumber = 1;
let totalPlayersCount = 4;
let localUsername = "Pratesh09";

let isDevModeActive = false;
let userRank = ""; // "Dev", "Admin", or "Moderator"
let showShieldIcon = false; // Hidden by default when joining/playing

// Coordinates and radius for interactive shield clicking
let shieldClickX = 0;
let shieldClickY = 0;
let shieldClickRadius = 16;

// Authorized credentials mapping (Username -> Rank)
const authorizedUsers = {
  "pratesh09": "Dev",
  "admin": "Admin",
  "mod": "Moderator",
  "user": "Admin",
  "tankamdemkin": "Admin"
};

// Lists for multiplayer server moderation tracking
let serverBannedUsers = [];
let serverKickedUsers = [];
let serverMutedUsers = [];
let disabledRolePlayers = []; // Track players whose role mechanics are shut down

// Blackout State
let isBlackoutActive = false;
let blackoutTargetPlayer = null;

// Announcement Hold State
let announcementText = "";
let announcementHoldTimer = 0;

// Roles (1-13)
const roleNames = [
  "Killer", "Guardian Angel", "Sheriff", "Doctor", 
  "Detective", "Jester", "Innocent", "Hunter", 
  "Vampire", "Swapper", "Hacker", "Altruist", "Witch"
];

let role = 0;         
let targetRoles = [0, 0, 0]; // For Dummies/Players 1 through 3

let isTargetAlive = [true, true, true]; 
let isPlayerAlive = true;   

let protectedPlayer = null; 
let currentScreen = "screen0"; 
let winReason = ""; 

let abilityCooldown = false; 
let cooldownTimer = 0;
let empActive = false; 
let manualEmpLock = false; // Staff/Admin/Dev manual toggle

let vampireCharges = 0; 
let stolenRole = null; 
let lastEliminatedRole = null; 

let altruistSelectedTarget = null; 
let suspiciousTarget = 1; 

let hasAnyPlayerDied = false;
let revealedKillerID = null; 
let hunterRevengePending = false; 
let isSpectating = false; 

let statusMessage = "Welcome to Social Deduction!";
let endSummaryText = "";

// Bounding Boxes & Modal State
let targetCards = [];
let modalActive = false;
let modalPromptText = "";
let modalInputValue = "";
let modalCallback = null;
let gameLoopInterval = null;

function getRoleName(roleNum) {
  return roleNames[roleNum - 1];
}

function setPersistentAnnouncement(msg) {
  announcementText = msg;
  announcementHoldTimer = 5;
}

// ==================== P5.JS SETUP & DRAW ====================

function setup() {
  createCanvas(windowWidth, windowHeight);
  textAlign(CENTER, CENTER);
  suspiciousTarget = floor(random(1, 4));
  setupTargetCardBounds();
  updateLocalUserRank();
}

function updateLocalUserRank() {
  let lowerUser = localUsername.toLowerCase();
  if (authorizedUsers[lowerUser]) {
    userRank = authorizedUsers[lowerUser];
  } else {
    userRank = "";
  }
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
  setupTargetCardBounds();
}

function draw() {
  background(25);

  // Blackout Overlay Effect (Game Frozen)
  if (isBlackoutActive) {
    background(15);

    // Draw custom blackout badge
    drawBlackoutBadge(width / 2, height / 2 - 50, 1.6);

    fill(231, 76, 60);
    textSize(22);
    textStyle(BOLD);
    text("BLACKOUT IN EFFECT: GAME FROZEN FOR INTERROGATION", width / 2, 60);

    fill(255);
    textSize(18);
    textStyle(NORMAL);
    let targetName = (blackoutTargetPlayer === 0) ? localUsername : ("Player " + blackoutTargetPlayer);
    text("Private Channel Connected With: " + targetName, width / 2, height / 2 + 70);
    
    // Draw End Blackout and Kick buttons side by side during blackout
    drawButton(width / 2 - 210, height - 100, 190, 40, "End Blackout", color(192, 57, 43));
    drawButton(width / 2 + 20, height - 100, 190, 40, "Kick Target", color(211, 84, 0));
    return;
  }

  if (currentScreen === "screen0") {
    drawStartScreen();
  } else if (currentScreen === "multiplayer_lobby") {
    drawMultiplayerLobbyScreen();
  } else if (currentScreen === "Role_screen") {
    drawRoleRevealScreen();
  } else if (currentScreen === "screen2") {
    drawGameplayScreen();
  } else if (["screen3", "screen4", "screen5", "screen6", "screen8"].includes(currentScreen)) {
    drawEndScreen();
  }
}

// ==================== CUSTOM VECTOR BADGES ====================

function drawBlackoutBadge(x, y, scaleFactor) {
  push();
  translate(x, y);
  scale(scaleFactor);

  stroke(241, 196, 15);
  strokeWeight(8);
  strokeJoin(ROUND);
  fill(45, 52, 54);
  triangle(0, -90, -80, 50, 80, 50);

  stroke(241, 196, 15);
  strokeWeight(3);
  noFill();
  ellipse(0, -25, 34, 34); 
  rect(-8, -8, 16, 12);   

  stroke(231, 76, 60); 
  strokeWeight(3);
  line(-12, -35, 12, -15);
  line(-5, -15, 8, -5);

  noStroke();
  fill(241, 196, 15);
  rect(-65, 15, 130, 24, 4);

  fill(25);
  textSize(13);
  textStyle(BOLD);
  textAlign(CENTER, CENTER);
  text("BLACKOUT", 0, 27);

  pop();
}

function drawEmpBadge(x, y, scaleFactor) {
  push();
  translate(x, y);
  scale(scaleFactor);

  stroke(0, 255, 255);
  strokeWeight(5);
  strokeJoin(ROUND);
  fill(20, 30, 45);

  beginShape();
  for (let i = 0; i < 6; i++) {
    let angle = TWO_PI / 6 * i - HALF_PI;
    let hx = cos(angle) * 55;
    let hy = sin(angle) * 55;
    vertex(hx, hy);
  }
  endShape(CLOSE);

  stroke(241, 196, 15);
  strokeWeight(4);
  noFill();

  beginShape();
  vertex(-8, -25);
  vertex(10, -8);
  vertex(-2, 2);
  vertex(12, 22);
  vertex(-10, 5);
  vertex(2, -2);
  endShape(CLOSE);

  stroke(0, 255, 255, 180);
  strokeWeight(2);
  arc(0, -2, 75, 75, QUARTER_PI, HALF_PI + QUARTER_PI);
  arc(0, -2, 75, 75, PI + QUARTER_PI, PI + HALF_PI + QUARTER_PI);

  noStroke();
  fill(0, 255, 255);
  rect(-50, 30, 100, 20, 4);

  fill(15);
  textSize(11);
  textStyle(BOLD);
  textAlign(CENTER, CENTER);
  text("STAFF EMP", 0, 40);

  pop();
}

// ==================== UI RENDERING ====================

function drawStartScreen() {
  fill(255);
  textSize(38);
  textStyle(BOLD);
  text("13-Role Social Deduction", width / 2, height / 2 - 160);

  textSize(18);
  textStyle(NORMAL);
  text("Choose your game mode below", width / 2, height / 2 - 110);

  drawButton(width / 2 - 130, height / 2 - 60, 260, 45, "Start Singleplayer", color(46, 204, 113));
  drawButton(width / 2 - 130, height / 2, 260, 45, "Create Multiplayer Room", color(52, 152, 219));
  drawButton(width / 2 - 130, height / 2 + 60, 260, 45, "Join Multiplayer Room", color(155, 89, 182));
  drawButton(width / 2 - 80, height / 2 + 135, 160, 38, "Staff Assist", color(52, 73, 94));
}

function drawMultiplayerLobbyScreen() {
  fill(255);
  textSize(34);
  textStyle(BOLD);
  text("MULTIPLAYER LOBBY", width / 2, height / 2 - 140);

  fill(241, 196, 15);
  textSize(22);
  text("Room Code: " + currentRoomCode, width / 2, height / 2 - 90);

  fill(200);
  textSize(16);
  textStyle(NORMAL);
  text("Connected Players in Room (1/4 Max):", width / 2, height / 2 - 40);

  let playersList = [
    localUsername + " (You - Host)",
    "Waiting for player...",
    "Waiting for player...",
    "Waiting for player..."
  ];

  for (let i = 0; i < playersList.length; i++) {
    fill(45, 52, 54);
    stroke(100);
    rect(width / 2 - 150, height / 2 + (i * 35) - 20, 300, 30, 6);
    noStroke();
    fill(i === 0 ? color(255) : color(150));
    textSize(14);
    text(playersList[i], width / 2, height / 2 + (i * 35) - 5);
  }

  if (isHost) {
    drawButton(width / 2 - 110, height / 2 + 130, 220, 45, "Start Match", color(46, 204, 113));
  } else {
    fill(200);
    textSize(15);
    text("Waiting for host to start the match...", width / 2, height / 2 + 150);
  }

  drawButton(width / 2 - 90, height / 2 + 190, 180, 38, "Leave Room", color(231, 76, 60));
}

function drawRoleRevealScreen() {
  fill(241, 196, 15);
  textSize(28);
  textStyle(BOLD);
  text("YOUR ROLE IS:", width / 2, height / 2 - 80);

  textSize(46);
  fill(getRoleColor(role));
  text(getRoleName(role), width / 2, height / 2);

  textSize(18);
  fill(200);
  text("Game starting shortly...", width / 2, height / 2 + 80);
}

function drawGameplayScreen() {
  fill(255);
  textSize(26);
  textStyle(BOLD);
  
  let roleText = "Your Role: " + getRoleName(role);
  text(roleText, width / 2, 35);

  textSize(18);
  fill(200);
  let nameText = localUsername;
  let textW = textWidth(nameText);
  text(nameText, width / 2 - 12, 65);

  if (userRank !== "") {
    let shieldColor;
    if (userRank === "Dev") shieldColor = color(52, 152, 219);       
    else if (userRank === "Admin") shieldColor = color(155, 89, 182); 
    else shieldColor = color(46, 204, 113);                         

    shieldClickX = (width / 2 - 12) + (textW / 2) + 16;
    shieldClickY = 65;

    if (showShieldIcon) {
      drawVectorShield(shieldClickX, shieldClickY, 22, shieldColor);
    } else {
      push();
      noFill();
      stroke(120);
      strokeWeight(1);
      ellipse(shieldClickX, shieldClickY, 16, 16);
      pop();
    }
  }

  let showEmpBadgeCheck = manualEmpLock || (isDevModeActive && empActive);
  if (showEmpBadgeCheck) {
    drawEmpBadge(width / 2, 110, 0.85);
  }

  let statusY = showEmpBadgeCheck ? 170 : 110;

  if (announcementHoldTimer > 0) {
    fill(241, 196, 15); 
    textSize(18);
    textStyle(BOLD);
    text("📢 " + announcementText, width / 2, statusY);
  } else {
    fill(220);
    textSize(18);
    textStyle(NORMAL);
    text(statusMessage, width / 2, statusY);
  }

  for (let i = 0; i < 3; i++) {
    let card = targetCards[i];
    let isAlive = isTargetAlive[i];

    stroke(card.borderColor);
    strokeWeight(3);
    fill(isAlive ? color(45, 52, 54) : color(100, 30, 30));
    rect(card.x, card.y, card.w, card.h, 12);
    noStroke();

    fill(255);
    textSize(28);
    textStyle(BOLD);
    text(card.label, card.x + card.w / 2, card.y + 45);

    textSize(14);
    fill(isAlive ? color(46, 204, 113) : color(231, 76, 60));
    text(isAlive ? "ALIVE" : "ELIMINATED", card.x + card.w / 2, card.y + 90);
    
    if (isDevModeActive) {
      fill(241, 196, 15);
      textSize(12);
      text("[" + getRoleName(targetRoles[i]) + "]", card.x + card.w / 2, card.y + 125);
    }
  }

  if (hunterRevengePending) {
    drawButton(width / 2 - 110, height - 90, 220, 45, "Show Mercy (Spectate)", color(142, 68, 173));
  } else if (!isPlayerAlive) {
    drawButton(width / 2 - 90, height - 90, 180, 45, "Spectate Game", color(142, 68, 173));
  }

  if (isDevModeActive && userRank === "Dev") {
    drawButton(width - 140, 20, 120, 35, "Dev Menu", color(230, 126, 34));
  }

  if (userRank !== "") {
    let menuBtnColor;
    if (userRank === "Dev") menuBtnColor = color(52, 152, 219);
    else if (userRank === "Admin") menuBtnColor = color(155, 89, 182);
    else menuBtnColor = color(46, 204, 113);

    let menuLabel = userRank + " Menu";
    drawButton(20, 20, 130, 35, menuLabel, menuBtnColor);
  }
}

function drawVectorShield(x, y, size, shieldCol) {
  push();
  fill(shieldCol);
  stroke(255);
  strokeWeight(1.5);
  beginShape();
  vertex(x, y - size * 0.5);
  vertex(x - size * 0.4, y - size * 0.4);
  vertex(x - size * 0.4, y);
  bezierVertex(x - size * 0.4, y + size * 0.35, x, y + size * 0.55, x, y + size * 0.55);
  bezierVertex(x, y + size * 0.55, x + size * 0.4, y + size * 0.35, x + size * 0.4, y);
  vertex(x + size * 0.4, y - size * 0.4);
  endShape(CLOSE);
  pop();
}

function drawEndScreen() {
  fill(231, 76, 60);
  textSize(36);
  textStyle(BOLD);
  text("GAME OVER", width / 2, 80);

  fill(255);
  textSize(18);
  textStyle(NORMAL);
  textAlign(CENTER, TOP);
  text(endSummaryText, width / 2, 140);
  textAlign(CENTER, CENTER);

  drawButton(width / 2 - 100, height - 100, 200, 45, "Main Menu", color(52, 152, 219));
}

function drawButton(x, y, w, h, label, btnColor) {
  fill(btnColor);
  noStroke();
  rect(x, y, w, h, 8);
  fill(255);
  textSize(16);
  textStyle(BOLD);
  text(label, x + w / 2, y + h / 2);
}

function setupTargetCardBounds() {
  let cardWidth = 170;
  let cardHeight = 170;
  let spacing = 40;
  let totalWidth = (cardWidth * 3) + (spacing * 2);
  let startX = (width - totalWidth) / 2;
  let startY = height / 2 - 20;

  targetCards = [
    { x: startX, y: startY, w: cardWidth, h: cardHeight, label: "Player 2", borderColor: color(180) },
    { x: startX + cardWidth + spacing, y: startY, w: cardWidth, h: cardHeight, label: "Player 3", borderColor: color(180) },
    { x: startX + (cardWidth + spacing) * 2, y: startY, w: cardWidth, h: cardHeight, label: "Player 4", borderColor: color(180) }
  ];
}

function getRoleColor(r) {
  switch (r) {
    case 1: return color(231, 76, 60);
    case 2: return color(6, 239, 248);
    case 3: return color(52, 152, 219);
    case 4: return color(46, 204, 113);
    case 5: return color(155, 89, 182);
    case 6: return color(230, 126, 34);
    case 7: return color(149, 165, 166);
    case 8: return color(139, 0, 0);
    case 9: return color(220, 20, 60);
    case 10: return color(255, 0, 255);
    case 11: return color(0, 255, 255);
    case 12: return color(241, 196, 15);
    case 13: return color(128, 0, 128);
    default: return color(255);
  }
}

// ==================== NATIVE MOBILE PROMPT / INPUT ====================

function openModal(promptText, callback) {
  // Uses native browser dialog so mobile touch keyboards pop up automatically
  let result = prompt(promptText);
  if (result !== null) {
    callback(result);
  }
}

function closeModal() {
  modalActive = false;
}

// ==================== INTERACTION & EVENTS ====================

function mousePressed() {
  if (isBlackoutActive) {
    if (mouseX >= width / 2 - 210 && mouseX <= width / 2 - 20 &&
        mouseY >= height - 100 && mouseY <= height - 60) {
      isBlackoutActive = false;
      setPersistentAnnouncement("Blackout Interrogation ended.");
      return;
    }
    if (mouseX >= width / 2 + 20 && mouseX <= width / 2 + 210 &&
        mouseY >= height - 100 && mouseY <= height - 60) {
      let targetName = (blackoutTargetPlayer === 0) ? localUsername : ("Player " + blackoutTargetPlayer);
      serverKickedUsers.push(targetName);
      isBlackoutActive = false;
      setPersistentAnnouncement("Blackout Action: " + targetName + " has been KICKED!");
      return;
    }
    return;
  }

  if (currentScreen === "screen0") {
    if (mouseX >= width / 2 - 130 && mouseX <= width / 2 + 130 &&
        mouseY >= height / 2 - 60 && mouseY <= height / 2 - 15) {
      startSingleplayer();
    }
    else if (mouseX >= width / 2 - 130 && mouseX <= width / 2 + 130 &&
             mouseY >= height / 2 && mouseY <= height / 2 + 45) {
      createMultiplayerRoom();
    }
    else if (mouseX >= width / 2 - 130 && mouseX <= width / 2 + 130 &&
             mouseY >= height / 2 + 60 && mouseY <= height / 2 + 105) {
      openModal("Enter Room Code to Join (e.g., ROOM-8315):", (val) => {
        let code = val.trim().toUpperCase();
        if (code !== "") {
          joinMultiplayerRoom(code);
        }
      });
    }
    else if (mouseX >= width / 2 - 80 && mouseX <= width / 2 + 80 &&
             mouseY >= height / 2 + 135 && mouseY <= height / 2 + 173) {
      openModal("Enter Staff Credentials\nFormat [Username:Passcode]:", (val) => {
        let parts = val.trim().split(":");
        if (parts.length === 2) {
          let enteredUser = parts[0].trim();
          let enteredCode = parts[1].trim();

          let isBanned = false;
          for (let b = 0; b < serverBannedUsers.length; b++) {
            if (serverBannedUsers[b].toLowerCase() === enteredUser.toLowerCase()) {
              isBanned = true;
              break;
            }
          }

          if (isBanned) {
            setPersistentAnnouncement("Access Denied: " + enteredUser + " is banned!");
            return;
          }

          let lowerUser = enteredUser.toLowerCase();
          if (authorizedUsers[lowerUser] && enteredCode === "9315") {
            localUsername = enteredUser;
            userRank = authorizedUsers[lowerUser];
            
            if (userRank === "Dev") {
              isDevModeActive = true;
              handleDevMenu();
            } else if (userRank === "Admin") {
              handleAdminMenu();
            } else if (userRank === "Moderator") {
              handleModeratorMenu();
            }
          }
        }
      });
    }
  } else if (currentScreen === "multiplayer_lobby") {
    if (isHost && mouseX >= width / 2 - 110 && mouseX <= width / 2 + 110 &&
        mouseY >= height / 2 + 130 && mouseY <= height / 2 + 175) {
      startMultiplayerGame();
    }
    else if (mouseX >= width / 2 - 90 && mouseX <= width / 2 + 90 &&
             mouseY >= height / 2 + 190 && mouseY <= height / 2 + 228) {
      currentScreen = "screen0";
      statusMessage = "Left room " + currentRoomCode;
    }
  } else if (currentScreen === "screen2") {
    if (userRank !== "") {
      let d = dist(mouseX, mouseY, shieldClickX, shieldClickY);
      if (d <= shieldClickRadius) {
        showShieldIcon = !showShieldIcon;
        setPersistentAnnouncement("Shield Icon visibility toggled to: " + (showShieldIcon ? "ON" : "OFF"));
        return;
      }
    }

    if (userRank !== "" && mouseX >= 20 && mouseX <= 150 && mouseY >= 20 && mouseY <= 55) {
      if (userRank === "Dev") handleDevMenu();
      else if (userRank === "Admin") handleAdminMenu();
      else handleModeratorMenu();
      return;
    }

    if (hunterRevengePending) {
      if (mouseX >= width / 2 - 110 && mouseX <= width / 2 + 110 &&
          mouseY >= height - 90 && mouseY <= height - 45) {
        hunterRevengePending = false;
        setPersistentAnnouncement("Hunter showed mercy and didn't execute anyone!");
        isSpectating = true;
        currentScreen = "screen3";
        return;
      }
    }

    for (let i = 0; i < 3; i++) {
      let card = targetCards[i];
      if (mouseX >= card.x && mouseX <= card.x + card.w &&
          mouseY >= card.y && mouseY <= card.y + card.h) {
        handleRoleAction(i + 1, i);
      }
    }

    if (isDevModeActive && userRank === "Dev" && mouseX >= width - 140 && mouseX <= width - 20 &&
        mouseY >= 20 && mouseY <= 55) {
      handleDevMenu();
    }

    if (!isPlayerAlive && mouseX >= width / 2 - 90 && mouseX <= width / 2 + 90 &&
        mouseY >= height - 90 && mouseY <= height - 45) {
      isSpectating = true;
      setPersistentAnnouncement("SPECTATING MODE: Watching the remaining players...");
    }
  } else if (["screen3", "screen4", "screen5", "screen6", "screen8"].includes(currentScreen)) {
    if (mouseX >= width / 2 - 100 && mouseX <= width / 2 + 100 &&
        mouseY >= height - 100 && mouseY <= height - 55) {
      if (gameLoopInterval) clearInterval(gameLoopInterval);
      currentScreen = "screen0";
    }
  }
}

// Touch support for mobile devices
function touchStarted() {
  mousePressed();
  return false;
}

// ==================== MODE SELECTION & SETUP ====================

function createMultiplayerRoom() {
  isMultiplayer = true;
  isHost = true;
  showShieldIcon = false;
  currentRoomCode = "ROOM-" + floor(random(1000, 9999));
  currentScreen = "multiplayer_lobby";
  statusMessage = "Created room: " + currentRoomCode;
}

function joinMultiplayerRoom(code) {
  isMultiplayer = true;
  isHost = false;
  showShieldIcon = false;
  currentRoomCode = code;
  currentScreen = "multiplayer_lobby";
  statusMessage = "Joined room: " + currentRoomCode;
}

function startMultiplayerGame() {
  playerNumber = 1;
  totalPlayersCount = 4;
  showShieldIcon = false;
  hasAnyPlayerDied = false;
  revealedKillerID = null;
  hunterRevengePending = false;
  isSpectating = false;
  isPlayerAlive = true;
  isTargetAlive = [true, true, true];
  vampireCharges = 0;
  stolenRole = null;
  empActive = false;
  manualEmpLock = false;
  isBlackoutActive = false;
  blackoutTargetPlayer = null;
  disabledRolePlayers = [];
  altruistSelectedTarget = null;
  announcementHoldTimer = 0;

  setupSingleplayerRoles();
  setupRoleUI();

  currentScreen = "Role_screen";

  setTimeout(() => {
    currentScreen = "screen2";
  }, 3000);
}

function startSingleplayer() {
  isMultiplayer = false;
  isDevModeActive = (userRank === "Dev");
  showShieldIcon = false;
  playerNumber = 1;
  totalPlayersCount = 4;
  hasAnyPlayerDied = false;
  revealedKillerID = null;
  hunterRevengePending = false;
  isSpectating = false;
  isPlayerAlive = true;
  isTargetAlive = [true, true, true];
  vampireCharges = 0;
  stolenRole = null;
  empActive = false;
  manualEmpLock = false;
  isBlackoutActive = false;
  blackoutTargetPlayer = null;
  disabledRolePlayers = [];
  altruistSelectedTarget = null;
  announcementHoldTimer = 0;

  setupSingleplayerRoles();
  setupRoleUI();

  currentScreen = "Role_screen";

  setTimeout(() => {
    currentScreen = "screen2";
    startRoleGameLoop();
  }, 3000);
}

function setupSingleplayerRoles() {
  let primaryBadRole = (floor(random(1, 3)) === 1) ? 1 : 9;
  let townRoles = [2, 4, 5, 8];
  let guaranteedTown = townRoles[floor(random(0, townRoles.length))];
  
  let remainingPool = [2, 4, 5, 6, 7, 8, 10, 11, 12, 13];
  for (let i = 0; i < remainingPool.length; i++) {
    if (remainingPool[i] === guaranteedTown) {
      remainingPool.splice(i, 1);
      break;
    }
  }
  
  for (let k = remainingPool.length - 1; k > 0; k--) {
    let j = floor(random(0, k + 1));
    let temp = remainingPool[k]; remainingPool[k] = remainingPool[j]; remainingPool[j] = temp;
  }

  let deck = [primaryBadRole, 3, guaranteedTown, remainingPool[0]];

  for (let d = deck.length - 1; d > 0; d--) {
    let r = floor(random(0, d + 1));
    let tempDeck = deck[d]; deck[d] = deck[r]; deck[r] = tempDeck;
  }

  role = deck[0];
  for (let t = 0; t < 3; t++) {
    targetRoles[t] = deck[t + 1];
  }
}

function setupRoleUI() {
  for (let i = 0; i < 3; i++) {
    targetCards[i].borderColor = color(180);
  }

  if (role === 1) statusMessage = "Killer: Who to eliminate?";
  else if (role === 2) statusMessage = "Guardian Angel: Who to Protect?";
  else if (role === 3) statusMessage = "Sheriff: Who to Take down?";
  else if (role === 4) statusMessage = "Doctor: Who to Revive?";
  else if (role === 5) statusMessage = "Detective: Who to Investigate?";
  else if (role === 6) statusMessage = "Jester: Select Player 2, 3, or 4 to haunt!";
  else if (role === 7) statusMessage = "Innocent: You have no abilities. Stay alive!";
  else if (role === 8) statusMessage = "Hunter: If eliminated, you take someone down with you!";
  else if (role === 9) statusMessage = vampireCharges > 0 ? "Vampire Stolen Ability (" + getRoleName(stolenRole) + ") ready!" : "Vampire: Who to eliminate?";
  else if (role === 10) statusMessage = "Swapper: Who to swap roles with?";
  else if (role === 11) statusMessage = "Hacker: Click any player to trigger EMP!";
  else if (role === 12) statusMessage = "Altruist: Choose a player to mark for role announcement.";
  else if (role === 13) statusMessage = "Witch: Click a player to guess their role!";
}

// ==================== HELPER & GAMEPLAY FUNCTIONS ====================

function handleRoleAction(targetNum, cardIndex) {
  if (isSpectating || (!isPlayerAlive && !hunterRevengePending)) return;

  if (isBlackoutActive) {
    setPersistentAnnouncement("BLACKOUT IN EFFECT: Game actions frozen during interrogation!");
    return;
  }

  if (disabledRolePlayers.includes(0)) {
    setPersistentAnnouncement("ROLE DISABLED: A Moderator has stripped your role ability!");
    return;
  }

  if (hunterRevengePending) {
    hunterRevengePending = false;
    let tRole = targetRoles[targetNum - 1];
    targetCards[cardIndex].borderColor = color(231, 76, 60);
    isTargetAlive[targetNum - 1] = false;
    notifyPlayerDeath(tRole, targetNum);

    if (tRole === 1 || tRole === 9) {
      winReason = "Town Wins: Hunter revenge-shot the " + getRoleName(tRole) + "!";
      currentScreen = "screen5"; 
      revealRoles();
      return;
    } else {
      setPersistentAnnouncement("Hunter revenge-shot Player " + (targetNum + 1) + " (" + getRoleName(tRole) + ")!");
      checkGameStatus();

      if (currentScreen === "screen2") {
        currentScreen = "screen3";
      }
    }
    return;
  }

  if (empActive || manualEmpLock) {
    setPersistentAnnouncement("EMP ACTIVE: All abilities are jammed!");
    return;
  }

  if (abilityCooldown || !isPlayerAlive) return;
  if (role === 7) {
    setPersistentAnnouncement("Innocents have no night abilities!");
    return;
  }

  let targetRole = targetRoles[targetNum - 1];

  if (role === 1) { // KILLER
    if (targetRole === 9) {
      setPersistentAnnouncement("ATTACK FAILED! Killer cannot eliminate the Vampire!");
      triggerAbilityCooldown();
      return;
    }
    if (protectedPlayer === targetNum) {
      revealedKillerID = 0;
      setPersistentAnnouncement("ATTACK BLOCKED! Player " + (targetNum + 1) + " was guarded! Killer REVEALED!");
      protectedPlayer = null;
    } else {
      targetCards[cardIndex].borderColor = color(231, 76, 60);
      isTargetAlive[targetNum - 1] = false;
      notifyPlayerDeath(targetRole, targetNum);

      if (targetRole === 8) triggerHunterRevenge(targetNum);
      else checkGameStatus();
    }
    triggerAbilityCooldown();
  } else if (role === 2) { // GA
    protectedPlayer = targetNum;
    targetCards[cardIndex].borderColor = color(46, 204, 113);
    setPersistentAnnouncement("You are guarding Player " + (targetNum + 1) + ".");
    triggerAbilityCooldown();
  } else if (role === 3) { // SHERIFF
    if (targetRole === 1 || targetRole === 9) { 
      targetCards[cardIndex].borderColor = color(231, 76, 60);
      winReason = "Town Wins: Sheriff shot the " + getRoleName(targetRole) + "!";
      currentScreen = "screen5"; 
      revealRoles();
    } else if (targetRole === 6) {
      targetCards[cardIndex].borderColor = color(230, 126, 34);
      isTargetAlive[targetNum - 1] = false;
      notifyPlayerDeath(6, targetNum);
      winReason = "Jester Wins: The Jester was eliminated by the Sheriff!";
      currentScreen = "screen6"; 
      revealRoles();
    } else if ([10, 12, 13].includes(targetRole)) {
      targetCards[cardIndex].borderColor = color(231, 76, 60);
      isTargetAlive[targetNum - 1] = false;
      notifyPlayerDeath(targetRole, targetNum);
      checkGameStatus();
      triggerAbilityCooldown();
    } else { 
      winReason = "Killer Wins: Sheriff executed a Town member (" + getRoleName(targetRole) + ")!";
      currentScreen = "screen4"; 
      revealRoles();
    }
  } else if (role === 4) { // DOCTOR
    targetCards[cardIndex].borderColor = color(255);
    isTargetAlive[targetNum - 1] = true;
    setPersistentAnnouncement("You revived Player " + (targetNum + 1) + "!");
    checkGameStatus();
    triggerAbilityCooldown();
  } else if (role === 5) { // DETECTIVE
    let res = (suspiciousTarget === targetNum || targetRole === 1 || targetRole === 9) ? "SUSPICIOUS!" : "INNOCENT.";
    setPersistentAnnouncement("Result: Player " + (targetNum + 1) + " is " + res);
    triggerAbilityCooldown();
  } else if (role === 6) { // JESTER
    executeSingleJesterHaunt(targetNum, cardIndex);
    triggerAbilityCooldown();
  } else if (role === 9) { // VAMPIRE
    executeVampireAbility(targetNum, cardIndex);
  } else if (role === 10) { // SWAPPER
    performRoleSwap(targetNum);
    triggerAbilityCooldown();
  } else if (role === 11) { // HACKER
    triggerHackerEmp();
    triggerAbilityCooldown();
  } else if (role === 12) { // ALTRUIST
    altruistSelectedTarget = targetNum;
    setPersistentAnnouncement("Altruist Marked: Player " + (targetNum + 1) + "! Role revealed on death.");
    triggerAbilityCooldown();
  } else if (role === 13) { // WITCH
    executeWitchGuess(targetNum, cardIndex, 0);
    triggerAbilityCooldown();
  }
}

function executeSingleJesterHaunt(targetNum, cardIndex) {
  if (!isTargetAlive[targetNum - 1]) return;
  let targetRole = targetRoles[targetNum - 1];
  isTargetAlive[targetNum - 1] = false;
  targetCards[cardIndex].borderColor = color(155, 89, 182);
  notifyPlayerDeath(targetRole, targetNum);

  if (targetRole === 8) triggerHunterRevenge(targetNum);
  else checkGameStatus();
}

function notifyPlayerDeath(eliminatedRole, eliminatedID) {
  hasAnyPlayerDied = true;
  lastEliminatedRole = eliminatedRole;

  if (eliminatedRole && eliminatedRole !== 9) {
    stolenRole = eliminatedRole;
    vampireCharges = 1;
    if (role === 9 && currentScreen === "screen2") {
      setPersistentAnnouncement("ABSORBED! You stole the ability of: " + getRoleName(stolenRole) + "!");
    }
  }

  if (eliminatedRole === 12) {
    if (altruistSelectedTarget !== null) {
      let name = (altruistSelectedTarget === 0) ? localUsername : ("Player " + (altruistSelectedTarget + 1));
      let r = (altruistSelectedTarget === 0) ? role : targetRoles[altruistSelectedTarget - 1];
      setPersistentAnnouncement("ALTRUIST REVEAL: " + name + " is " + getRoleName(r) + "!");
    }
  }

  if (eliminatedRole === 3) {
    winReason = "Killer Wins: The Sheriff was eliminated! Game lost for Citizens!";
    currentScreen = "screen4"; 
    revealRoles();
  }
}

function triggerAbilityCooldown() {
  abilityCooldown = true;
  cooldownTimer = 30;
  let timerInterval = setInterval(() => {
    cooldownTimer--;

    if (announcementHoldTimer > 0) {
      announcementHoldTimer--;
    }

    if (currentScreen === "screen2" && isPlayerAlive && !empActive && !manualEmpLock) {
      statusMessage = "Cooldown: " + cooldownTimer + "s";
    }
    if (cooldownTimer <= 0) {
      clearInterval(timerInterval);
      abilityCooldown = false;
      if (currentScreen === "screen2" && isPlayerAlive && !empActive && !manualEmpLock) {
        setupRoleUI();
      }
    }
  }, 1000);
}

function handlePlayerDeath() {
  isPlayerAlive = false;
  notifyPlayerDeath(role, 0);

  if (role === 8 && !hunterRevengePending) {
    triggerHunterRevenge(0);
    return;
  }
  
  checkGameStatus();

  if (!isPlayerAlive && currentScreen === "screen2") {
    currentScreen = "screen3";
  }
}

function triggerHunterRevenge(victimID) {
  if (victimID === 0) { 
    setPersistentAnnouncement("YOU WERE ELIMINATED! Take someone down or click 'Show Mercy'.");
    hunterRevengePending = true;
  } else { 
    let targets = [];
    if (isPlayerAlive) targets.push(0);
    for (let i = 0; i < 3; i++) {
      if (i !== (victimID - 1) && isTargetAlive[i]) targets.push(i + 1);
    }

    if (targets.length > 0) {
      let revengeTarget = targets[floor(random(0, targets.length))];
      let revTargetRole = (revengeTarget === 0) ? role : targetRoles[revengeTarget - 1];

      if (revengeTarget === 0) {
        setPersistentAnnouncement("Hunter Player " + (victimID + 1) + " revenge-shot YOU!");
        handlePlayerDeath();
      } else {
        isTargetAlive[revengeTarget - 1] = false;
        targetCards[revengeTarget - 1].borderColor = color(231, 76, 60);
        notifyPlayerDeath(revTargetRole, revengeTarget);
        setPersistentAnnouncement("Hunter Player " + (victimID + 1) + " revenge-shot Player " + (revengeTarget + 1) + "!");
      }

      if (revTargetRole === 1 || revTargetRole === 9) {
        winReason = "Town Wins: Hunter revenge-shot the " + getRoleName(revTargetRole) + "!";
        currentScreen = "screen5"; 
        revealRoles();
      } else {
        checkGameStatus();
      }
    }
  }
}

function triggerHackerEmp() {
  empActive = true;
  setPersistentAnnouncement("EMP ACTIVATED! All abilities globally disabled for 15s!");
  
  setTimeout(() => {
    empActive = false;
    if (currentScreen === "screen2" && isPlayerAlive && !manualEmpLock) {
      setPersistentAnnouncement("EMP Expired! Abilities restored.");
      setupRoleUI();
    }
  }, 15000);
}

function performRoleSwap(targetNum) {
  let targetRole = targetRoles[targetNum - 1];

  if (targetRole === 1 || targetRole === 9) {
    setPersistentAnnouncement("SWAP FAILED! Attempted swap with Killer/Vampire and eliminated!");
    handlePlayerDeath();
    return;
  }

  let oldPlayerRole = role;
  role = targetRole;
  targetRoles[targetNum - 1] = oldPlayerRole;

  setPersistentAnnouncement("SWAP SUCCESS! You are now " + getRoleName(role) + "!");
  setupRoleUI();
}

function executeWitchGuess(targetNum, cardIndex, witchActorID) {
  let actualRole = (targetNum === 0) ? role : targetRoles[targetNum - 1];
  
  openModal("WITCH GUESS: Enter Role ID (1-13) for Player " + (targetNum === 0 ? "You" : (targetNum + 1)) + ":\n1.Killer 2.GA 3.Sheriff 4.Doc 5.Det 6.Jester\n7.Innocent 8.Hunter 9.Vamp 10.Swap 11.Hack 12.Alt 13.Witch", (val) => {
    let guessedRole = parseInt(val);
    if (isNaN(guessedRole) || guessedRole < 1 || guessedRole > 13) return;

    if (guessedRole === actualRole) {
      setPersistentAnnouncement("WITCH SPELL SUCCESS! Player " + (targetNum === 0 ? "You" : (targetNum + 1)) + " was a " + getRoleName(actualRole) + "!");
      
      if ([1, 9, 3, 6].includes(actualRole)) {
        winReason = "Witch Wins: Correctly guessed and eliminated a Key Role (" + getRoleName(actualRole) + ")!";
        currentScreen = "screen8"; 
        revealRoles();
        return;
      }

      if (targetNum === 0) {
        handlePlayerDeath();
      } else {
        isTargetAlive[targetNum - 1] = false;
        targetCards[cardIndex].borderColor = color(155, 89, 182);
        notifyPlayerDeath(actualRole, targetNum);

        if (actualRole === 8) triggerHunterRevenge(targetNum);
        else checkGameStatus();
      }
    } else {
      setPersistentAnnouncement("WITCH SPELL FAILED! Your guess was wrong! You were eliminated!");
      if (witchActorID === 0) {
        handlePlayerDeath();
      } else {
        isTargetAlive[witchActorID - 1] = false;
        targetCards[witchActorID - 1].borderColor = color(231, 76, 60);
        notifyPlayerDeath(13, witchActorID);
        checkGameStatus();
      }
    }
  });
}

function executeVampireAbility(targetNum, cardIndex) {
  let targetRole = targetRoles[targetNum - 1];

  if (vampireCharges > 0 && stolenRole !== null) {
    let effectiveRole = stolenRole;
    vampireCharges = 0; 
    stolenRole = null;

    if (effectiveRole === 2) { 
      protectedPlayer = targetNum;
      targetCards[cardIndex].borderColor = color(46, 204, 113);
      setPersistentAnnouncement("Vampire Stolen GA: Guarded Player " + (targetNum + 1) + "!");
      triggerAbilityCooldown();
      return;
    } else if (effectiveRole === 4) { 
      targetCards[cardIndex].borderColor = color(255);
      isTargetAlive[targetNum - 1] = true;
      setPersistentAnnouncement("Vampire Stolen Doctor: Revived Player " + (targetNum + 1) + "!");
      checkGameStatus();
      triggerAbilityCooldown();
      return;
    } else if (effectiveRole === 5) { 
      let res = (suspiciousTarget === targetNum || targetRole === 1) ? "SUSPICIOUS!" : "INNOCENT.";
      setPersistentAnnouncement("Vampire Stolen Detective Result: Player " + (targetNum + 1) + " is " + res);
      triggerAbilityCooldown();
      return;
    } else if (effectiveRole === 6) {
      executeSingleJesterHaunt(targetNum, cardIndex);
      triggerAbilityCooldown();
      return;
    } else if (effectiveRole === 11) { 
      triggerHackerEmp();
      triggerAbilityCooldown();
      return;
    } else if (effectiveRole === 12) {
      altruistSelectedTarget = targetNum;
      setPersistentAnnouncement("Vampire Stolen Altruist: Marked Player " + (targetNum + 1) + "!");
      triggerAbilityCooldown();
      return;
    } else if (effectiveRole === 13) {
      executeWitchGuess(targetNum, cardIndex, 0);
      triggerAbilityCooldown();
      return;
    }
  }

  if (targetRole === 1) {
    setPersistentAnnouncement("ATTACK FAILED! Vampire cannot eliminate the Killer!");
    triggerAbilityCooldown();
    return;
  }

  if (protectedPlayer === targetNum) {
    setPersistentAnnouncement("ATTACK BLOCKED! Player " + (targetNum + 1) + " was guarded!");
    protectedPlayer = null;
  } else {
    targetCards[cardIndex].borderColor = color(231, 76, 60);
    isTargetAlive[targetNum - 1] = false;
    notifyPlayerDeath(targetRole, targetNum);

    if (targetRole === 8) triggerHunterRevenge(targetNum);
    else checkGameStatus();
  }

  triggerAbilityCooldown();
}

// ==================== SINGLEPLAYER AI LOOP ====================

function executeAiRole(actorID, actorRole, allowsSheriffToFireThisTurn) {
  if (isMultiplayer || empActive || manualEmpLock || disabledRolePlayers.includes(actorID) || isBlackoutActive) return;

  let chosenTarget = null;
  let aliveAiTargets = [];
  
  for (let i = 0; i < totalPlayersCount - 1; i++) {
    if (actorID !== (i + 1) && isTargetAlive[i]) {
      aliveAiTargets.push(i + 1);
    }
  }

  if (actorRole === 13) { // AI WITCH
    let possibleWitchTargets = [];
    if (isPlayerAlive) possibleWitchTargets.push(0);
    for (let w = 0; w < aliveAiTargets.length; w++) possibleWitchTargets.push(aliveAiTargets[w]);

    if (possibleWitchTargets.length > 0) {
      let witchTarget = possibleWitchTargets[floor(random(0, possibleWitchTargets.length))];
      let actualTargetRole = (witchTarget === 0) ? role : targetRoles[witchTarget - 1];
      let aiGuessRole = floor(random(1, 14));

      if (aiGuessRole === actualTargetRole) {
        if ([1, 9, 3, 6].includes(actualTargetRole)) {
          winReason = "Witch Wins: Player " + (actorID + 1) + " (Witch) correctly guessed a Key Role (" + getRoleName(actualTargetRole) + ")!";
          currentScreen = "screen8"; 
          revealRoles();
          return;
        }

        if (witchTarget === 0) {
          handlePlayerDeath();
        } else {
          isTargetAlive[witchTarget - 1] = false;
          targetCards[witchTarget - 1].borderColor = color(155, 89, 182);
          notifyPlayerDeath(actualTargetRole, witchTarget);
          if (actualTargetRole === 8) triggerHunterRevenge(witchTarget);
          else checkGameStatus();
        }
      } else {
        isTargetAlive[actorID - 1] = false;
        targetCards[actorID - 1].borderColor = color(231, 76, 60);
        notifyPlayerDeath(13, actorID);
        checkGameStatus();
      }
    }
  } else if (actorRole === 1 || actorRole === 9) { // AI KILLER / VAMP
    if (actorRole === 9 && vampireCharges > 0) {
      vampireCharges = 0;
      stolenRole = null;
    }

    let possibleTargets = [];
    if (isPlayerAlive && !((actorRole === 1 && role === 9) || (actorRole === 9 && role === 1))) {
      possibleTargets.push(0);
    }

    for (let m = 0; m < aliveAiTargets.length; m++) {
      let aiTargetID = aliveAiTargets[m];
      let aiTargetRole = targetRoles[aiTargetID - 1];
      if (!((actorRole === 1 && aiTargetRole === 9) || (actorRole === 9 && role === 1))) {
        possibleTargets.push(aiTargetID);
      }
    }

    if (possibleTargets.length > 0) {
      chosenTarget = possibleTargets[floor(random(0, possibleTargets.length))];
    }

    if (chosenTarget === null) return;

    if (protectedPlayer === chosenTarget) {
      revealedKillerID = actorID; 
      let targetName = (chosenTarget === 0) ? localUsername : ("Player " + (chosenTarget + 1));
      setPersistentAnnouncement("ANNOUNCEMENT: " + targetName + " was protected! Attacker is Player " + (actorID + 1) + "!");
      protectedPlayer = null;
    } else {
      if (chosenTarget === 0) {
        handlePlayerDeath();
      } else {
        let targetRole = targetRoles[chosenTarget - 1];
        isTargetAlive[chosenTarget - 1] = false;
        targetCards[chosenTarget - 1].borderColor = color(231, 76, 60);
        notifyPlayerDeath(targetRole, chosenTarget);

        if (targetRole === 8) triggerHunterRevenge(chosenTarget);
        else checkGameStatus();
      }
    }
  } else if (actorRole === 3) { // AI SHERIFF
    if (revealedKillerID !== null) {
      chosenTarget = revealedKillerID;
    } else {
      if (!allowsSheriffToFireThisTurn) return;

      let sheriffTargets = [];
      if (actorID !== 0 && isPlayerAlive) sheriffTargets.push(0);
      for (let j = 0; j < aliveAiTargets.length; j++) sheriffTargets.push(aliveAiTargets[j]);

      if (sheriffTargets.length === 0) return;
      chosenTarget = sheriffTargets[floor(random(0, sheriffTargets.length))];
    }

    let sheriffTargetRole = (chosenTarget === 0) ? role : targetRoles[chosenTarget - 1];
    
    if (chosenTarget === 0) {
      handlePlayerDeath();
    } else {
      isTargetAlive[chosenTarget - 1] = false;
      targetCards[chosenTarget - 1].borderColor = color(231, 76, 60);
      notifyPlayerDeath(sheriffTargetRole, chosenTarget);
    }

    if (sheriffTargetRole === 1 || sheriffTargetRole === 9) {
      winReason = "Town Wins: Sheriff shot the " + getRoleName(sheriffTargetRole) + "!";
      currentScreen = "screen5"; 
      revealRoles();
    } else if (sheriffTargetRole === 6) {
      winReason = "Jester Wins: The Jester was eliminated by the Sheriff!";
      currentScreen = "screen6"; 
      revealRoles();
    } else if ([10, 12, 13].includes(sheriffTargetRole)) {
      checkGameStatus();
    } else {
      winReason = "Killer Wins: Sheriff executed a Town member (" + getRoleName(sheriffTargetRole) + ")!";
      currentScreen = "screen4"; 
      revealRoles();
    }
  } else if (actorRole === 11) { // AI HACKER
    if (floor(random(1, 5)) === 1) triggerHackerEmp();
  } else if (actorRole === 12) { // AI ALTRUIST
    if (altruistSelectedTarget === null) {
      let possibleAltruistTargets = [];
      if (isPlayerAlive) possibleAltruistTargets.push(0);
      for (let a = 0; a < aliveAiTargets.length; a++) possibleAltruistTargets.push(aliveAiTargets[a]);
      if (possibleAltruistTargets.length > 0) {
        altruistSelectedTarget = possibleAltruistTargets[floor(random(0, possibleAltruistTargets.length))];
      }
    }
  }
}

function startRoleGameLoop() {
  if (gameLoopInterval) clearInterval(gameLoopInterval);
  if (isMultiplayer) return; // Do not run AI loop during multiplayer

  gameLoopInterval = setInterval(() => {
    if (currentScreen === "screen2" && !hunterRevengePending && !isBlackoutActive) {
      let allowsSheriffThisTurn = hasAnyPlayerDied;

      for (let i = 0; i < totalPlayersCount - 1; i++) {
        if (isTargetAlive[i] && targetRoles[i] !== role) {
          executeAiRole(i + 1, targetRoles[i], allowsSheriffThisTurn);
        }
      }
    }
  }, 15000);
}

function checkGameStatus() {
  let isWitchAlive = (role === 13 && isPlayerAlive);
  let otherAliveCount = 0;

  if (isPlayerAlive && role !== 13) otherAliveCount++;

  for (let w = 0; w < totalPlayersCount - 1; w++) {
    if (targetRoles[w] === 13 && isTargetAlive[w]) isWitchAlive = true;
    if (targetRoles[w] !== 13 && isTargetAlive[w]) otherAliveCount++;
  }

  if (isWitchAlive && otherAliveCount === 0) {
    winReason = "Witch Wins: All non-Witch players have been eliminated!";
    currentScreen = "screen8"; 
    revealRoles();
    return;
  }

  let isKillerAlive = (role === 1 || role === 9) && isPlayerAlive;
  for (let k = 0; k < totalPlayersCount - 1; k++) {
    if ((targetRoles[k] === 1 || targetRoles[k] === 9) && isTargetAlive[k]) isKillerAlive = true;
  }

  let nonKillerAliveCount = 0;
  if (role !== 1 && role !== 9 && isPlayerAlive) nonKillerAliveCount++;
  for (let t = 0; t < totalPlayersCount - 1; t++) {
    let tr = targetRoles[t];
    if (tr !== 1 && tr !== 9 && isTargetAlive[t]) nonKillerAliveCount++;
  }

  if (!isKillerAlive) {
    winReason = "Town Wins: The Killer/Vampire has been eliminated!";
    currentScreen = "screen5"; 
    revealRoles();
  } else if (nonKillerAliveCount <= 0) {
    winReason = "Killer Wins: All Town members have been eliminated!";
    currentScreen = "screen4"; 
    revealRoles();
  }
}

function revealRoles() {
  endSummaryText = winReason + "\n\n--- ROLE REVEAL ---\n" + localUsername + " (You): " + getRoleName(role) + "\n";
  for (let i = 0; i < totalPlayersCount - 1; i++) {
    endSummaryText += "Player " + (i + 2) + ": " + getRoleName(targetRoles[i]) + "\n";
  }
}

// ==================== DEV MENU (MULTIPLAYER & SINGLEPLAYER) ====================

function handleDevMenu() {
  let menuText = "DEV CONTROL PANEL:\n" +
                 "1. Singleplayer Role & Sandbox Tools\n" +
                 "2. Admin Controls\n" +
                 "3. Moderator Controls\n" +
                 "Enter option number:";

  openModal(menuText, (val) => {
    let option = val.trim();
    if (option === "1") {
      handleDevSandboxTools();
    } else if (option === "2") {
      handleAdminMenu();
    } else if (option === "3") {
      handleModeratorMenu();
    }
  });
}

function handleDevSandboxTools() {
  let devMenuText = "DEV SANDBOX TOOLS:\n" +
                    "1. Choose Roles\n" +
                    "2. Kill Player\n" +
                    "3. Kill Self\n" +
                    "4. View Roles Console\n" +
                    "5. Guard Target\n" +
                    "6. Revive Target\n" +
                    "7. Trigger Temporary EMP\n" +
                    "8. Haunt Player\n" +
                    "9. Toggle Shield Icon\n" +
                    "Enter option number:";

  openModal(devMenuText, (val) => {
    let devAction = val.trim();
    if (devAction === "1") {
      openModal("Select YOUR Role (1-13):\n1.Killer 2.GA 3.Sheriff 4.Doc 5.Det 6.Jester\n7.Innocent 8.Hunter 9.Vamp 10.Swap 11.Hack 12.Alt 13.Witch", (rVal) => {
        let chosenRole = parseInt(rVal);
        if (isNaN(chosenRole) || chosenRole < 1 || chosenRole > 13) return;

        isMultiplayer = false;
        playerNumber = 1;
        totalPlayersCount = 4;
        hasAnyPlayerDied = false;
        revealedKillerID = null;
        hunterRevengePending = false;
        isSpectating = false;
        isPlayerAlive = true;
        isTargetAlive = [true, true, true];
        vampireCharges = 0;
        stolenRole = null;
        empActive = false;
        manualEmpLock = false;
        isBlackoutActive = false;
        blackoutTargetPlayer = null;
        disabledRolePlayers = [];
        altruistSelectedTarget = null;
        announcementHoldTimer = 0;

        setupDevRoles(chosenRole);
        setupRoleUI();
        currentScreen = "screen2";
        startRoleGameLoop();
      });
    } else if (devAction === "2") {
      openModal("Select Player to eliminate (1, 2, or 3):", (tVal) => {
        let targetToKill = parseInt(tVal);
        if (targetToKill >= 1 && targetToKill <= 3 && isTargetAlive[targetToKill - 1]) {
          isTargetAlive[targetToKill - 1] = false;
          targetCards[targetToKill - 1].borderColor = color(231, 76, 60);
          notifyPlayerDeath(targetRoles[targetToKill - 1], targetToKill);
          checkGameStatus();
        }
      });
    } else if (devAction === "3") {
      handlePlayerDeath();
    } else if (devAction === "4") {
      displayDevRoleInfo();
    } else if (devAction === "5") {
      openModal("Select Player (1-3) to Guard:", (gVal) => {
        let targetToGuard = parseInt(gVal);
        if (targetToGuard >= 1 && targetToGuard <= 3) {
          protectedPlayer = targetToGuard;
          targetCards[targetToGuard - 1].borderColor = color(46, 204, 113);
          setPersistentAnnouncement("Dev Action: Guarded Player " + (targetToGuard + 1) + "!");
        }
      });
    } else if (devAction === "6") {
      openModal("Select Player (1-3) to Revive:", (rVal) => {
        let targetToRevive = parseInt(rVal);
        if (targetToRevive >= 1 && targetToRevive <= 3) {
          isTargetAlive[targetToRevive - 1] = true;
          targetCards[targetToRevive - 1].borderColor = color(255);
          setPersistentAnnouncement("Dev Action: Revived Player " + (targetToRevive + 1) + "!");
          checkGameStatus();
        }
      });
    } else if (devAction === "7") {
      triggerHackerEmp();
    } else if (devAction === "8") {
      openModal("Select Player (1-3) to Haunt:", (hVal) => {
        let targetToHaunt = parseInt(hVal);
        if (targetToHaunt >= 1 && targetToHaunt <= 3 && isTargetAlive[targetToHaunt - 1]) {
          executeSingleJesterHaunt(targetToHaunt, targetToHaunt - 1);
          setPersistentAnnouncement("Dev Action: Haunted Player " + (targetToHaunt + 1) + "!");
        }
      });
    } else if (devAction === "9") {
      showShieldIcon = !showShieldIcon;
      setPersistentAnnouncement("Shield Icon visibility toggled to: " + (showShieldIcon ? "ON" : "OFF"));
    }
  });
}

// ==================== ADMIN MENU (FULL CONTROL) ====================

function handleAdminMenu() {
  let adminMenuText = "ADMIN CONTROL PANEL:\n" +
                      "1. Open Moderator Controls\n" +
                      "2. Shut Down Server / Close Room\n" +
                      "3. Ban Player\n" +
                      "4. Kick Player\n" +
                      "5. Add Moderator Rank to User\n" +
                      "6. Remove Moderator Rank\n" +
                      "7. Toggle Global EMP Lock (ON/OFF)\n" +
                      "8. Shut Down Player Role Ability\n" +
                      "Enter option number:";

  openModal(adminMenuText, (val) => {
    let action = val.trim();
    if (action === "1") {
      handleModeratorMenu();
    } else if (action === "2") {
      if (gameLoopInterval) clearInterval(gameLoopInterval);
      currentScreen = "screen0";
      setPersistentAnnouncement("ADMIN ACTION: Server successfully SHUT DOWN.");
    } else if (action === "3") {
      openModal("Enter exact username of player to BAN:", (targetUser) => {
        let name = targetUser.trim();
        if (name !== "") {
          serverBannedUsers.push(name);
          setPersistentAnnouncement("Admin Action: " + name + " has been BANNED.");
        }
      });
    } else if (action === "4") {
      openModal("Enter exact username of player to KICK:", (targetUser) => {
        let name = targetUser.trim();
        if (name !== "") {
          serverKickedUsers.push(name);
          setPersistentAnnouncement("Admin Action: " + name + " has been KICKED.");
        }
      });
    } else if (action === "5") {
      openModal("Enter username to assign MODERATOR rank:", (targetUser) => {
        let name = targetUser.trim().toLowerCase();
        if (name !== "") {
          authorizedUsers[name] = "Moderator";
          setPersistentAnnouncement("Admin Action: " + name + " granted Moderator Rank.");
        }
      });
    } else if (action === "6") {
      openModal("Enter username to REMOVE Moderator rank:", (targetUser) => {
        let name = targetUser.trim().toLowerCase();
        if (authorizedUsers[name] && authorizedUsers[name] === "Moderator") {
          delete authorizedUsers[name];
          setPersistentAnnouncement("Admin Action: " + name + " removed from Moderator rank.");
        }
      });
    } else if (action === "7") {
      manualEmpLock = !manualEmpLock;
      setPersistentAnnouncement("Admin Action: Manual Global EMP set to " + (manualEmpLock ? "ACTIVE" : "INACTIVE"));
    } else if (action === "8") {
      openModal("Enter Player ID to disable role (0 for You, 1-3 for Players):", (pVal) => {
        let pID = parseInt(pVal);
        if (!isNaN(pID) && pID >= 0 && pID <= 3) {
          if (!disabledRolePlayers.includes(pID)) {
            disabledRolePlayers.push(pID);
            setPersistentAnnouncement("Admin Action: Role ability SHUT DOWN for Player " + pID);
          }
        }
      });
    }
  });
}

// ==================== MODERATOR MENU ====================

function handleModeratorMenu() {
  let modMenuText = "MODERATOR CONTROL PANEL:\n" +
                    "1. Trigger The Blackout (Private Interrogation)\n" +
                    "2. Shut Down Player Role Ability\n" +
                    "3. Toggle Global EMP Lock (ON/OFF)\n" +
                    "4. Mute Player\n" +
                    "5. Unmute Player\n" +
                    "6. Kick Player\n" +
                    "Enter option number:";

  openModal(modMenuText, (val) => {
    let action = val.trim();
    if (action === "1") {
      openModal("Select Player ID to interrogate (0 for You, 1-3 for Players):", (tVal) => {
        let targetID = parseInt(tVal);
        if (!isNaN(targetID) && targetID >= 0 && targetID <= 3) {
          blackoutTargetPlayer = targetID;
          isBlackoutActive = true;
        }
      });
    } else if (action === "2") {
      openModal("Enter Player ID to disable role (0 for You, 1-3 for Players):", (pVal) => {
        let pID = parseInt(pVal);
        if (!isNaN(pID) && pID >= 0 && pID <= 3) {
          if (!disabledRolePlayers.includes(pID)) {
            disabledRolePlayers.push(pID);
            setPersistentAnnouncement("Moderator Action: Role ability SHUT DOWN for Player " + pID);
          }
        }
      });
    } else if (action === "3") {
      manualEmpLock = !manualEmpLock;
      setPersistentAnnouncement("Moderator Action: Global EMP set to " + (manualEmpLock ? "ACTIVE" : "INACTIVE"));
    } else if (action === "4") {
      openModal("Enter username to MUTE:", (targetUser) => {
        let name = targetUser.trim();
        if (name !== "") {
          serverMutedUsers.push(name);
          setPersistentAnnouncement("Moderator Action: " + name + " MUTED.");
        }
      });
    } else if (action === "5") {
      openModal("Enter username to UNMUTE:", (targetUser) => {
        let name = targetUser.trim();
        if (name !== "") {
          let index = serverMutedUsers.indexOf(name);
          if (index !== -1) {
            serverMutedUsers.splice(index, 1);
            setPersistentAnnouncement("Moderator Action: " + name + " UNMUTED.");
          }
        }
      });
    } else if (action === "6") {
      openModal("Enter username to KICK:", (targetUser) => {
        let name = targetUser.trim();
        if (name !== "") {
          serverKickedUsers.push(name);
          setPersistentAnnouncement("Moderator Action: " + name + " KICKED.");
        }
      });
    }
  });
}

function setupDevRoles(chosenRole) {
  role = chosenRole;
  let badGuyRole = (chosenRole === 9) ? 9 : 1;
  let optionalRoles = [2, 4, 5, 6, 7, 8, 10, 11, 12, 13].filter(r => r !== chosenRole);

  for (let j = optionalRoles.length - 1; j > 0; j--) {
    let randIndex = floor(random(0, j + 1));
    let tmp = optionalRoles[j]; optionalRoles[j] = optionalRoles[randIndex]; optionalRoles[randIndex] = tmp;
  }

  let devDeck = [];
  if (chosenRole === badGuyRole) devDeck = [3, optionalRoles[0], optionalRoles[1]];
  else if (chosenRole === 3) devDeck = [badGuyRole, optionalRoles[0], optionalRoles[1]];
  else devDeck = [badGuyRole, 3, optionalRoles[0]];

  targetRoles[0] = devDeck[0];
  targetRoles[1] = devDeck[1];
  targetRoles[2] = devDeck[2];
}

function displayDevRoleInfo() {
  let devInfo = "--- DEV INFO ---\nYour Role: " + getRoleName(role) + "\n";
  for (let i = 0; i < 3; i++) {
    devInfo += "Player " + (i + 2) + ": " + getRoleName(targetRoles[i]) + " (" + (isTargetAlive[i] ? "Alive" : "Dead") + ")\n";
  }
  console.log(devInfo);
  setPersistentAnnouncement("Check Browser Console for Dev Roles Log!");
}
