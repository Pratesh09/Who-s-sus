// ==================== GLOBAL STATE & VARIABLES ====================
let isMultiplayer = false;
let currentRoomCode = "";
let isHost = false;
let playerNumber = 1;
let totalPlayersCount = 4;
let localUsername = "Pratesh09";

// PeerJS Networking Variables
let peer = null;
let conn = null;
let connectedPeersList = [];

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
  text("Connected Players in Room:", width / 2, height / 2 - 40);

  let playersList = [localUsername + " (You - " + (isHost ? "Host" : "Player") + ")"];
  for (let p of connectedPeersList) {
    playersList.push(p);
  }

  for (let i = 0; i < 4; i++) {
    fill(45, 52, 54);
    stroke(100);
    rect(width / 2 - 150, height / 2 + (i * 35) - 20, 300, 30, 6);
    noStroke();
    
    fill(i < playersList.length ? color(255) : color(120));
    textSize(14);
    text(i < playersList.length ? playersList[i] : "Waiting for player...", width / 2, height / 2 + (i * 35) - 5);
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
  let result = prompt(promptText);
  if (result !== null) {
    callback(result);
  }
}

// ==================== PEERJS MULTIPLAYER NETWORKING ====================

function createMultiplayerRoom() {
  currentRoomCode = "ROOM-" + floor(random(1000, 9999));
  
  // Initialize PeerJS with custom room code
  peer = new Peer(currentRoomCode);

  peer.on('open', (id) => {
    isMultiplayer = true;
    isHost = true;
    connectedPeersList = [];
    currentScreen = "multiplayer_lobby";
    statusMessage = "Hosting room: " + id;
  });

  peer.on('connection', (incomingConn) => {
    conn = incomingConn;
    setupConnectionHandlers();
    connectedPeersList.push("Player (Connected)");
    statusMessage = "Another player joined the room!";
  });

  peer.on('error', (err) => {
    statusMessage = "Room creation error. Try again.";
    console.error(err);
  });
}

function joinMultiplayerRoom(code) {
  peer = new Peer();

  peer.on('open', () => {
    conn = peer.connect(code);
    
    conn.on('open', () => {
      isMultiplayer = true;
      isHost = false;
      currentRoomCode = code;
      currentScreen = "multiplayer_lobby";
      statusMessage = "Connected to room: " + code;
      setupConnectionHandlers();
      
      // Tell host we joined
      conn.send({ type: "JOIN", name: localUsername });
    });

    conn.on('error', (err) => {
      statusMessage = "Could not connect to room code.";
      console.error(err);
    });
  });
}

function setupConnectionHandlers() {
  conn.on('data', (data) => {
    if (data.type === "JOIN") {
      connectedPeersList.push(data.name);
    } else if (data.type === "START_GAME") {
      startMultiplayerMatchFromServer(data.roleData);
    } else if (data.type === "ACTION") {
      handleRoleAction(data.targetNum, data.cardIndex);
    }
  });
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

          let lowerUser = enteredUser.toLowerCase();
          if (authorizedUsers[lowerUser] && enteredCode === "9315") {
            localUsername = enteredUser;
            userRank = authorizedUsers[lowerUser];
            if (userRank === "Dev") isDevModeActive = true;
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
      if (peer) peer.destroy();
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
  } else if (["screen3", "screen4", "screen5", "screen6", "screen8"].includes(currentScreen)) {
    if (mouseX >= width / 2 - 100 && mouseX <= width / 2 + 100 &&
        mouseY >= height - 100 && mouseY <= height - 55) {
      if (gameLoopInterval) clearInterval(gameLoopInterval);
      if (peer) peer.destroy();
      currentScreen = "screen0";
    }
  }
}

function touchStarted() {
  mousePressed();
  return false;
}

// ==================== MODE SELECTION & SETUP ====================

function startMultiplayerGame() {
  setupSingleplayerRoles();
  
  if (conn && conn.open) {
    conn.send({
      type: "START_GAME",
      roleData: { role: targetRoles[0], targets: [role, targetRoles[1], targetRoles[2]] }
    });
  }

  setupRoleUI();
  currentScreen = "Role_screen";
  setTimeout(() => { currentScreen = "screen2"; }, 3000);
}

function startMultiplayerMatchFromServer(data) {
  role = data.role;
  targetRoles = data.targets;
  setupRoleUI();
  currentScreen = "Role_screen";
  setTimeout(() => { currentScreen = "screen2"; }, 3000);
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
  
  let deck = [primaryBadRole, 3, guaranteedTown, remainingPool[0]];
  role = deck[0];
  for (let t = 0; t < 3; t++) {
    targetRoles[t] = deck[t + 1];
  }
}

function setupRoleUI() {
  for (let i = 0; i < 3; i++) {
    targetCards[i].borderColor = color(180);
  }
  statusMessage = "Your Role is: " + getRoleName(role);
}

function handleRoleAction(targetNum, cardIndex) {
  if (isSpectating || (!isPlayerAlive && !hunterRevengePending)) return;
  let targetRole = targetRoles[targetNum - 1];

  targetCards[cardIndex].borderColor = color(231, 76, 60);
  isTargetAlive[targetNum - 1] = false;
  setPersistentAnnouncement("Action performed on Player " + (targetNum + 1));
  checkGameStatus();
}

function startRoleGameLoop() {
  if (gameLoopInterval) clearInterval(gameLoopInterval);
  if (isMultiplayer) return;

  gameLoopInterval = setInterval(() => {
    if (currentScreen === "screen2" && !hunterRevengePending && !isBlackoutActive) {
      for (let i = 0; i < totalPlayersCount - 1; i++) {
        if (isTargetAlive[i] && targetRoles[i] !== role) {
          // AI simulation tick
        }
      }
    }
  }, 15000);
}

function checkGameStatus() {
  let isKillerAlive = (role === 1 || role === 9) && isPlayerAlive;
  for (let k = 0; k < totalPlayersCount - 1; k++) {
    if ((targetRoles[k] === 1 || targetRoles[k] === 9) && isTargetAlive[k]) isKillerAlive = true;
  }

  if (!isKillerAlive) {
    winReason = "Town Wins: The Killer/Vampire has been eliminated!";
    currentScreen = "screen5"; 
    revealRoles();
  }
}

function revealRoles() {
  endSummaryText = winReason + "\n\n--- ROLE REVEAL ---\n" + localUsername + " (You): " + getRoleName(role) + "\n";
  for (let i = 0; i < totalPlayersCount - 1; i++) {
    endSummaryText += "Player " + (i + 2) + ": " + getRoleName(targetRoles[i]) + "\n";
  }
}

function handleDevMenu() {
  openModal("DEV OPTIONS:\n1. Toggle Shield\n2. Kill Self", (val) => {
    if (val === "1") showShieldIcon = !showShieldIcon;
    if (val === "2") isPlayerAlive = false;
  });
}

function handleAdminMenu() {
  openModal("ADMIN PANEL:\n1. Close Room", () => {
    currentScreen = "screen0";
  });
}

function handleModeratorMenu() {
  openModal("MODERATOR PANEL:\n1. Mute Player", () => {});
}
