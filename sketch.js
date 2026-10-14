// ==================== GLOBAL STATE & VARIABLES ====================
let isMultiplayer = false;
let currentRoomCode = "";
let isHost = false;
let playerNumber = 1;
let totalPlayersCount = 4;
let localUsername = "Player"; // Default ID

// PeerJS Networking Variables
let peer = null;
let conn = null;
let connectedPeersList = [];

let isDevModeActive = false;
let userRank = ""; // "Dev", "Admin", or "Moderator"
let showShieldIcon = false; 

// Staff Portal State & Logs
let staffChatMessages = [];
let submittedReports = [];

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

let serverBannedUsers = [];
let serverKickedUsers = [];
let serverMutedUsers = [];
let disabledRolePlayers = []; 

let isBlackoutActive = false;
let blackoutTargetPlayer = null;

let announcementText = "";
let announcementHoldTimer = 0;

const roleNames = [
  "Killer", "Guardian Angel", "Sheriff", "Doctor", 
  "Detective", "Jester", "Innocent", "Hunter", 
  "Vampire", "Swapper", "Hacker", "Altruist", "Witch"
];

let role = 0;         
let targetRoles = [0, 0, 0]; 

let isTargetAlive = [true, true, true]; 
let isPlayerAlive = true;   

let protectedPlayer = null; 
let currentScreen = "screen0"; 
let winReason = ""; 

let abilityCooldown = false; 
let cooldownTimer = 0;
let empActive = false; 
let manualEmpLock = false; 

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
  textSize(36);
  textStyle(BOLD);
  text("13-Role Social Deduction", width / 2, height / 2 - 180);

  textSize(16);
  textStyle(NORMAL);
  fill(200);
  text("Player: " + localUsername + (userRank ? " (" + userRank + ")" : ""), width / 2, height / 2 - 135);

  drawButton(width / 2 - 130, height / 2 - 100, 260, 40, "Start Singleplayer", color(46, 204, 113));
  drawButton(width / 2 - 130, height / 2 - 50, 260, 40, "Create Multiplayer Room", color(52, 152, 219));
  drawButton(width / 2 - 130, height / 2, 260, 40, "Join Multiplayer Room", color(155, 89, 182));
  
  drawButton(width / 2 - 130, height / 2 + 50, 260, 38, "Account Settings", color(52, 73, 94));
  drawButton(width / 2 - 80, height / 2 + 110, 160, 35, "Staff Assist", color(108, 122, 137));
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
  } else if (!isPlayerAlive && !isSpectating) {
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

// ==================== NATIVE MOBILE PROMPT ====================

function openModal(promptText, callback) {
  let result = prompt(promptText);
  if (result !== null) {
    callback(result);
  }
}

// ==================== PEERJS MULTIPLAYER NETWORKING ====================

function createMultiplayerRoom() {
  currentRoomCode = "ROOM-" + floor(random(1000, 9999));
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
        mouseY >= height / 2 - 100 && mouseY <= height / 2 - 60) {
      startSingleplayer();
    }
    else if (mouseX >= width / 2 - 130 && mouseX <= width / 2 + 130 &&
             mouseY >= height / 2 - 50 && mouseY <= height / 2 - 10) {
      createMultiplayerRoom();
    }
    else if (mouseX >= width / 2 - 130 && mouseX <= width / 2 + 130 &&
             mouseY >= height / 2 && mouseY <= height / 2 + 40) {
      openModal("Enter Room Code to Join (e.g., ROOM-8315):", (val) => {
        let code = val.trim().toUpperCase();
        if (code !== "") {
          joinMultiplayerRoom(code);
        }
      });
    }
    else if (mouseX >= width / 2 - 130 && mouseX <= width / 2 + 130 &&
             mouseY >= height / 2 + 50 && mouseY <= height / 2 + 88) {
      openModal("Enter your desired username:", (val) => {
        let newName = val.trim();
        if (newName !== "") {
          localUsername = newName;
          updateLocalUserRank();
          setPersistentAnnouncement("Username updated to: " + localUsername);
        }
      });
    }
    else if (mouseX >= width / 2 - 80 && mouseX <= width / 2 + 80 &&
             mouseY >= height / 2 + 110 && mouseY <= height / 2 + 145) {
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
            }
            handleStaffPortal();
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

    if (!isPlayerAlive && !isSpectating && mouseX >= width / 2 - 90 && mouseX <= width / 2 + 90 &&
        mouseY >= height - 90 && mouseY <= height - 45) {
      isSpectating = true;
      setPersistentAnnouncement("SPECTATING MODE: Watching the remaining players...");
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
  
  openModal("WITCH GUESS: Enter Role ID (1-13) for Player:\n1.Killer 2.GA 3.Sheriff 4.Doc 5.Det 6.Jester\n7.Innocent 8.Hunter 9.Vamp 10.Swap 11.Hack 12.Alt 13.Witch", (val) => {
    let guessedRole = parseInt(val);
    if (isNaN(guessedRole) || guessedRole < 1 || guessedRole > 13) return;

    if (guessedRole === actualRole) {
      setPersistentAnnouncement("WITCH SPELL SUCCESS!");
      if ([1, 9, 3, 6].includes(actualRole)) {
        winReason = "Witch Wins: Correctly guessed and eliminated a Key Role!";
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
      setPersistentAnnouncement("WITCH SPELL FAILED! Your guess was wrong!");
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
    vampireCharges = 0; 
    stolenRole = null;
    setPersistentAnnouncement("Vampire used stolen ability!");
    triggerAbilityCooldown();
    return;
  }

  if (targetRole === 1) {
    setPersistentAnnouncement("ATTACK FAILED! Vampire cannot eliminate the Killer!");
    triggerAbilityCooldown();
    return;
  }

  if (protectedPlayer === targetNum) {
    setPersistentAnnouncement("ATTACK BLOCKED! Player was guarded!");
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

  let aliveAiTargets = [];
  for (let i = 0; i < totalPlayersCount - 1; i++) {
    if (actorID !== (i + 1) && isTargetAlive[i]) {
      aliveAiTargets.push(i + 1);
    }
  }

  if (actorRole === 1 || actorRole === 9) {
    let possibleTargets = [];
    if (isPlayerAlive) possibleTargets.push(0);
    for (let m = 0; m < aliveAiTargets.length; m++) possibleTargets.push(aliveAiTargets[m]);

    if (possibleTargets.length > 0) {
      let chosenTarget = possibleTargets[floor(random(0, possibleTargets.length))];
      if (chosenTarget === 0) {
        handlePlayerDeath();
      } else {
        isTargetAlive[chosenTarget - 1] = false;
        targetCards[chosenTarget - 1].borderColor = color(231, 76, 60);
        notifyPlayerDeath(targetRoles[chosenTarget - 1], chosenTarget);
        checkGameStatus();
      }
    }
  }
}

function startRoleGameLoop() {
  if (gameLoopInterval) clearInterval(gameLoopInterval);
  if (isMultiplayer) return;

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
  let isKillerAlive = (role === 1 || role === 9) && isPlayerAlive;
  for (let k = 0; k < totalPlayersCount - 1; k++) {
    if ((targetRoles[k] === 1 || targetRoles[k] === 9) && isTargetAlive[k]) isKillerAlive = true;
  }

  let nonKillerAliveCount = 0;
  if (role !== 1 && role !== 9 && isPlayerAlive) nonKillerAliveCount++;
  for (let t = 0; t < totalPlayersCount - 1; t++) {
    if (targetRoles[t] !== 1 && targetRoles[t] !== 9 && isTargetAlive[t]) nonKillerAliveCount++;
  }

  if (!isKillerAlive) {
    winReason = "Town Wins: Killer/Vampire eliminated!";
    currentScreen = "screen5"; 
    revealRoles();
  } else if (nonKillerAliveCount <= 0) {
    winReason = "Killer Wins: All Town members eliminated!";
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

// ==================== STAFF PORTAL, CHAT & REPORT SYSTEM ====================

function handleStaffPortal() {
  let portalText = "STAFF PORTAL [" + userRank + " - " + localUsername + "]\n" +
                   "1. Open Rank Control Panel (" + userRank + " Menu)\n" +
                   "2. Open Staff Chat (" + staffChatMessages.length + " messages)\n" +
                   "3. Report Player to Admin\n" +
                   "4. View Submitted Reports (" + submittedReports.length + " reports)\n" +
                   "Enter option:";
  
  openModal(portalText, (val) => {
    let opt = val.trim();
    if (opt === "1") {
      if (userRank === "Dev") handleDevMenu();
      else if (userRank === "Admin") handleAdminMenu();
      else handleModeratorMenu();
    } else if (opt === "2") {
      handleStaffChat();
    } else if (opt === "3") {
      handleReportPlayer();
    } else if (opt === "4") {
      viewSubmittedReports();
    }
  });
}

function handleStaffChat() {
  let chatHistory = "--- SECURE STAFF CHAT ---\n";
  if (staffChatMessages.length === 0) {
    chatHistory += "(No messages yet)\n";
  } else {
    for (let m of staffChatMessages) {
      chatHistory += "[" + m.sender + "]: " + m.text + "\n";
    }
  }
  chatHistory += "\nEnter new message to send:";

  openModal(chatHistory, (msg) => {
    let textMsg = msg.trim();
    if (textMsg !== "") {
      staffChatMessages.push({ sender: localUsername + " (" + userRank + ")", text: textMsg });
      setPersistentAnnouncement("Staff Chat message sent!");
    }
  });
}

function handleReportPlayer() {
  openModal("Enter the username of the player you want to report:", (targetUser) => {
    let suspect = targetUser.trim();
    if (suspect !== "") {
      openModal("Enter reason for reporting " + suspect + ":", (reasonVal) => {
        let reason = reasonVal.trim();
        if (reason !== "") {
          submittedReports.push({ reporter: localUsername, suspect: suspect, reason: reason, time: new Date().toLocaleTimeString() });
          setPersistentAnnouncement("Report successfully filed against " + suspect + "!");
        }
      });
    }
  });
}

function viewSubmittedReports() {
  let reportLog = "--- PENDING REPORTS LOG ---\n";
  if (submittedReports.length === 0) {
    reportLog += "No reports filed.";
  } else {
    for (let r of submittedReports) {
      reportLog += "• " + r.suspect + " reported by " + r.reporter + "\n  Reason: " + r.reason + " (" + r.time + ")\n\n";
    }
  }
  openModal(reportLog, () => {});
}

// Dev Menu includes full Developer, Admin, and Moderator controls
function handleDevMenu() {
  let devMenuText = "DEV CONTROL PANEL (FULL STAFF ACCESS):\n" +
                    "1. Set Your Role (1-13)\n" +
                    "2. Kill AI Target (1-3)\n" +
                    "3. Kill Self\n" +
                    "4. Revive Target (0 for You, 1-3 for AI)\n" +
                    "5. Guard/Protect Target (0-3)\n" +
                    "6. Set Altruist Mark Target\n" +
                    "7. Toggle Bot Roles Display\n" +
                    "8. Open Moderator Controls\n" +
                    "9. Open Admin Controls\n" +
                    "Enter option:";
  openModal(devMenuText, (val) => {
    let option = val.trim();
    if (option === "1") {
      openModal("Enter Role ID (1-13):\n1.Killer 2.GA 3.Sheriff 4.Doc 5.Det 6.Jester\n7.Innocent 8.Hunter 9.Vamp 10.Swap 11.Hack 12.Alt 13.Witch", (rVal) => {
        let chosen = parseInt(rVal);
        if (!isNaN(chosen) && chosen >= 1 && chosen <= 13) {
          role = chosen;
          setupRoleUI();
        }
      });
    } else if (option === "2") {
      openModal("Select AI Target to Kill (1 for Player 2, 2 for Player 3, 3 for Player 4):", (kVal) => {
        let targetIdx = parseInt(kVal);
        if (!isNaN(targetIdx) && targetIdx >= 1 && targetIdx <= 3) {
          isTargetAlive[targetIdx - 1] = false;
          targetCards[targetIdx - 1].borderColor = color(231, 76, 60);
          notifyPlayerDeath(targetRoles[targetIdx - 1], targetIdx);
          checkGameStatus();
        }
      });
    } else if (option === "3") {
      handlePlayerDeath();
    } else if (option === "4") {
      openModal("Select Player ID to Revive (0 for You, 1-3 for Players):", (revVal) => {
        let revID = parseInt(revVal);
        if (revID === 0) {
          isPlayerAlive = true;
          setPersistentAnnouncement("Dev Action: You have been revived!");
        } else if (revID >= 1 && revID <= 3) {
          isTargetAlive[revID - 1] = true;
          targetCards[revID - 1].borderColor = color(180);
          setPersistentAnnouncement("Dev Action: Player " + (revID + 1) + " revived!");
        }
      });
    } else if (option === "5") {
      openModal("Select Player ID to Guard/Protect (0 for You, 1-3 for Players):", (gVal) => {
        let gID = parseInt(gVal);
        if (!isNaN(gID) && gID >= 0 && gID <= 3) {
          protectedPlayer = gID;
          setPersistentAnnouncement("Dev Action: Player " + (gID === 0 ? "You" : (gID + 1)) + " is now guarded!");
        }
      });
    } else if (option === "6") {
      openModal("Set Altruist Target (1 for Player 2, 2 for Player 3, 3 for Player 4):", (altVal) => {
        let aID = parseInt(altVal);
        if (!isNaN(aID) && aID >= 1 && aID <= 3) {
          altruistSelectedTarget = aID;
          setPersistentAnnouncement("Dev Action: Altruist marked Player " + (aID + 1));
        }
      });
    } else if (option === "7") {
      isDevModeActive = !isDevModeActive;
      setPersistentAnnouncement("Bot Roles Display: " + (isDevModeActive ? "VISIBLE" : "HIDDEN"));
    } else if (option === "8") {
      handleModeratorMenu();
    } else if (option === "9") {
      handleAdminMenu();
    }
  });
}

function handleAdminMenu() {
  let adminMenuText = "ADMIN CONTROL PANEL:\n" +
                      "1. Open Moderator Controls\n" +
                      "2. Shut Down Room / Server\n" +
                      "3. Ban Player Username\n" +
                      "4. Kick Player Username\n" +
                      "5. Mute Player Username\n" +
                      "6. Toggle Global EMP Lock\n" +
                      "Enter option:";
  openModal(adminMenuText, (val) => {
    let action = val.trim();
    if (action === "1") {
      handleModeratorMenu();
    } else if (action === "2") {
      if (gameLoopInterval) clearInterval(gameLoopInterval);
      if (peer) peer.destroy();
      currentScreen = "screen0";
      setPersistentAnnouncement("ADMIN ACTION: Server shut down.");
    } else if (action === "3") {
      openModal("Enter username of player to BAN:", (targetUser) => {
        let name = targetUser.trim();
        if (name !== "") {
          serverBannedUsers.push(name);
          setPersistentAnnouncement("Admin Action: " + name + " has been BANNED.");
        }
      });
    } else if (action === "4") {
      openModal("Enter username of player to KICK:", (targetUser) => {
        let name = targetUser.trim();
        if (name !== "") {
          serverKickedUsers.push(name);
          setPersistentAnnouncement("Admin Action: " + name + " has been KICKED.");
        }
      });
    } else if (action === "5") {
      openModal("Enter username of player to MUTE:", (targetUser) => {
        let name = targetUser.trim();
        if (name !== "") {
          serverMutedUsers.push(name);
          setPersistentAnnouncement("Admin Action: " + name + " has been MUTED.");
        }
      });
    } else if (action === "6") {
      manualEmpLock = !manualEmpLock;
      setPersistentAnnouncement("Admin EMP: " + (manualEmpLock ? "LOCKED" : "UNLOCKED"));
    }
  });
}

function handleModeratorMenu() {
  let modMenuText = "MODERATOR CONTROL PANEL:\n" +
                    "1. Trigger Blackout Interrogation\n" +
                    "2. Kick Player Username\n" +
                    "3. Mute Player Username\n" +
                    "4. Disable Target Player Role Ability\n" +
                    "5. Toggle Global EMP\n" +
                    "Enter option:";
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
      openModal("Enter username of player to KICK:", (targetUser) => {
        let name = targetUser.trim();
        if (name !== "") {
          serverKickedUsers.push(name);
          setPersistentAnnouncement("Mod Action: " + name + " has been KICKED.");
        }
      });
    } else if (action === "3") {
      openModal("Enter username of player to MUTE:", (targetUser) => {
        let name = targetUser.trim();
        if (name !== "") {
          serverMutedUsers.push(name);
          setPersistentAnnouncement("Mod Action: " + name + " has been MUTED.");
        }
      });
    } else if (action === "4") {
      openModal("Select Player ID to DISABLE ability (0 for You, 1-3 for Players):", (dVal) => {
        let dID = parseInt(dVal);
        if (!isNaN(dID) && dID >= 0 && dID <= 3) {
          disabledRolePlayers.push(dID);
          setPersistentAnnouncement("Mod Action: Disabled ability for Player " + (dID === 0 ? "You" : (dID + 1)));
        }
      });
    } else if (action === "5") {
      manualEmpLock = !manualEmpLock;
      setPersistentAnnouncement("Moderator EMP: " + (manualEmpLock ? "ACTIVE" : "OFF"));
    }
  });
}
