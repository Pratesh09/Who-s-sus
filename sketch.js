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
let gameLoopInterval = null;

// Shuffle & Role Reveal Animation Variables
let shuffleTimer = 0;
let isShuffling = true;
let hasSelectedCard = false;
let selectedCardIndex = -1;
let shuffleCards = [];
let autoStartTimeout = null;

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
  setupShuffleCards();
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

// ==================== CARD SHUFFLE & ROLE REVEAL SCREEN ====================

function setupShuffleCards() {
  let cardW = 120;
  let cardH = 170;
  let spacing = 30;
  let totalW = (cardW * 3) + (spacing * 2);
  let startX = (width - totalW) / 2;
  let startY = height / 2 - 40;

  shuffleCards = [
    { x: startX, y: startY, w: cardW, h: cardH, offset: 0 },
    { x: startX + cardW + spacing, y: startY, w: cardW, h: cardH, offset: 0 },
    { x: startX + (cardW + spacing) * 2, y: startY, w: cardW, h: cardH, offset: 0 }
  ];
}

function startShufflePhase() {
  isShuffling = true;
  hasSelectedCard = false;
  selectedCardIndex = -1;
  shuffleTimer = 0;
  setupShuffleCards();

  if (autoStartTimeout) clearTimeout(autoStartTimeout);
}

function drawRoleRevealScreen() {
  fill(241, 196, 15);
  textSize(28);
  textStyle(BOLD);

  if (isShuffling) {
    text("SHUFFLING ROLES...", width / 2, height / 2 - 160);
    shuffleTimer += 0.08;

    for (let i = 0; i < 3; i++) {
      let card = shuffleCards[i];
      let offsetX = sin(shuffleTimer * 3 + i) * 35;
      
      stroke(0, 184, 148);
      strokeWeight(3);
      fill(45, 52, 54);
      rect(card.x + offsetX, card.y, card.w, card.h, 10);
      
      stroke(0, 184, 148, 120);
      strokeWeight(1.5);
      line(card.x + offsetX + 10, card.y + 10, card.x + offsetX + card.w - 10, card.y + card.h - 10);
      line(card.x + offsetX + card.w - 10, card.y + 10, card.x + offsetX + 10, card.y + card.h - 10);
    }

    if (shuffleTimer > 10) {
      isShuffling = false;
    }
  } else if (!hasSelectedCard) {
    text("PICK A CARD TO REVEAL YOUR ROLE", width / 2, height / 2 - 160);

    for (let i = 0; i < 3; i++) {
      let card = shuffleCards[i];

      let isHover = mouseX >= card.x && mouseX <= card.x + card.w &&
                    mouseY >= card.y && mouseY <= card.y + card.h;

      stroke(isHover ? color(241, 196, 15) : color(0, 184, 148));
      strokeWeight(isHover ? 4 : 3);
      fill(isHover ? color(60, 70, 75) : color(45, 52, 54));
      rect(card.x, card.y + (isHover ? -8 : 0), card.w, card.h, 10);

      fill(255);
      noStroke();
      textSize(28);
      text("?", card.x + card.w / 2, card.y + card.h / 2 + (isHover ? -8 : 0));
    }
  } else {
    text("YOUR ASSIGNED ROLE IS:", width / 2, height / 2 - 160);

    for (let i = 0; i < 3; i++) {
      let card = shuffleCards[i];

      if (i === selectedCardIndex) {
        stroke(getRoleColor(role));
        strokeWeight(4);
        fill(35, 40, 45);
        rect(card.x, card.y - 12, card.w, card.h, 10);

        fill(getRoleColor(role));
        noStroke();
        textSize(16);
        textStyle(BOLD);
        text(getRoleName(role), card.x + card.w / 2, card.y + card.h / 2 - 12);
      } else {
        stroke(100);
        strokeWeight(2);
        fill(30, 30, 30);
        rect(card.x, card.y, card.w, card.h, 10);

        fill(120);
        noStroke();
        textSize(12);
        text("Hidden", card.x + card.w / 2, card.y + card.h / 2);
      }
    }

    fill(200);
    textSize(18);
    textStyle(NORMAL);
    text("Game starting shortly...", width / 2, height / 2 + 150);
  }
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
    drawButton(width / 2 - 90, height - 90, 180, 45, isSpectating ? "Spectating..." : "Spectate Game", color(142, 68, 173));
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
  let headingColor = color(231, 76, 60); // Default Red for Killer

  if (currentScreen === "screen5") {
    headingColor = color(52, 152, 219); // Blue for Town/Citizens
  } else if (currentScreen === "screen6") {
    headingColor = color(241, 196, 15); // Chrome Yellow for Jester
  } else if (currentScreen === "screen8") {
    headingColor = color(142, 68, 173); // Purple for Witch
  }

  fill(headingColor);
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

// ==================== NATIVE PROMPT ====================

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
  if (document.getElementById("staffPanelContainer")) {
    return;
  }

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
      if (userRank !== "") {
        openInteractiveStaffPanel();
      } else {
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
              openInteractiveStaffPanel();
            }
          }
        });
      }
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
  } else if (currentScreen === "Role_screen") {
    if (!isShuffling && !hasSelectedCard) {
      for (let i = 0; i < 3; i++) {
        let card = shuffleCards[i];
        if (mouseX >= card.x && mouseX <= card.x + card.w &&
            mouseY >= card.y && mouseY <= card.y + card.h) {
          hasSelectedCard = true;
          selectedCardIndex = i;

          autoStartTimeout = setTimeout(() => {
            currentScreen = "screen2";
            if (!isMultiplayer) startRoleGameLoop();
          }, 2500);
          break;
        }
      }
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
      openInteractiveStaffPanel();
      return;
    }

    if (hunterRevengePending) {
      if (mouseX >= width / 2 - 110 && mouseX <= width / 2 + 110 &&
          mouseY >= height - 90 && mouseY <= height - 45) {
        hunterRevengePending = false;
        setPersistentAnnouncement("Hunter showed mercy and didn't execute anyone!");
        isSpectating = true;
        return;
      }
    }

    if (!isPlayerAlive && mouseX >= width / 2 - 90 && mouseX <= width / 2 + 90 &&
        mouseY >= height - 90 && mouseY <= height - 45) {
      isSpectating = true;
      setPersistentAnnouncement("SPECTATING MODE: Watching the remaining players...");
      return;
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
  startShufflePhase();
}

function startMultiplayerMatchFromServer(data) {
  role = data.role;
  targetRoles = data.targets;
  setupRoleUI();
  currentScreen = "Role_screen";
  startShufflePhase();
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
  startShufflePhase();
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

// ==================== INTERACTIVE STAFF PANEL (HTML/CSS MODAL) ====================

function openInteractiveStaffPanel() {
  let existingModal = document.getElementById("staffPanelContainer");
  if (existingModal) existingModal.remove();

  let isDevOrAdmin = (userRank === "Dev" || userRank === "Admin");
  let isDev = (userRank === "Dev");

  let container = document.createElement("div");
  container.id = "staffPanelContainer";
  container.style.cssText = `
    position: fixed; top: 0; left: 0; width: 100vw; height: 100vh;
    background: rgba(0, 0, 0, 0.85); display: flex; justify-content: center; align-items: center;
    z-index: 9999; font-family: sans-serif;
  `;

  container.onclick = (e) => e.stopPropagation();
  container.onmousedown = (e) => e.stopPropagation();
  container.ontouchstart = (e) => e.stopPropagation();

  let panel = document.createElement("div");
  panel.style.cssText = `
    background: #2d3436; color: white; width: 90%; max-width: 500px; padding: 20px;
    border-radius: 12px; box-shadow: 0 0 20px rgba(0,0,0,0.8); border: 2px solid #0984e3;
    max-height: 80vh; overflow-y: auto; text-align: left;
  `;

  let html = `
    <div style="display:flex; justify-content:space-between; align-items:center; border-bottom:2px solid #636e72; padding-bottom:10px; margin-bottom:15px;">
      <h2 style="margin:0; font-size:20px; color:#74b9ff;">🛡️ STAFF ASSIST INTERACTIVE PANEL</h2>
      <button id="closeStaffPanel" style="background:#e74c3c; border:none; color:white; font-weight:bold; padding:6px 12px; border-radius:4px; cursor:pointer;">✕ Close</button>
    </div>
    
    <div style="margin-bottom:15px; background:#353b48; padding:8px; border-radius:6px; font-size:14px; text-align:center;">
      Active User: <b>${localUsername}</b> | Rank: <span style="color:#f1c40f;">${userRank}</span>
    </div>

    <!-- TAB BUTTONS -->
    <div style="display:flex; gap:10px; margin-bottom:15px;">
      <button id="tabControls" style="flex:1; padding:8px; background:#0984e3; color:white; border:none; border-radius:4px; cursor:pointer; font-weight:bold;">Rank Controls</button>
      <button id="tabChat" style="flex:1; padding:8px; background:#636e72; color:white; border:none; border-radius:4px; cursor:pointer; font-weight:bold;">Staff Chat (${staffChatMessages.length})</button>
      <button id="tabReports" style="flex:1; padding:8px; background:#636e72; color:white; border:none; border-radius:4px; cursor:pointer; font-weight:bold;">Reports (${submittedReports.length})</button>
    </div>

    <!-- CONTROLS SECTION -->
    <div id="sectionControls">
      <h3 style="font-size:16px; border-bottom:1px solid #636e72; padding-bottom:5px; margin-top:0;">Global Server Controls</h3>
      
      ${isDevOrAdmin ? `
      <div style="margin-bottom:12px; display:flex; justify-content:space-between; align-items:center; background:#1e272e; padding:10px; border-radius:6px;">
        <span><strong>Shut Down Active Server:</strong></span>
        <button id="btnShutdownServer" style="background:#e74c3c; color:white; border:none; padding:8px 14px; border-radius:6px; font-weight:bold; cursor:pointer;">⚡ SHUT DOWN</button>
      </div>
      ` : ''}

      <div style="margin-bottom:12px; display:flex; justify-content:space-between; align-items:center; background:#1e272e; padding:10px; border-radius:6px;">
        <span><strong>Global EMP Jammer:</strong></span>
        <label style="position:relative; display:inline-block; width:44px; height:24px;">
          <input type="checkbox" id="toggleEmpSwitch" ${manualEmpLock ? 'checked' : ''} style="opacity:0; width:0; height:0;">
          <span id="sliderEmp" style="position:absolute; cursor:pointer; top:0; left:0; right:0; bottom:0; background-color:${manualEmpLock ? '#00cec9' : '#636e72'}; transition:.4s; border-radius:24px;"></span>
        </label>
      </div>

      ${isDev ? `
      <div style="margin-bottom:12px; display:flex; justify-content:space-between; align-items:center; background:#1e272e; padding:10px; border-radius:6px;">
        <span><strong>Bot Roles Display:</strong></span>
        <label style="position:relative; display:inline-block; width:44px; height:24px;">
          <input type="checkbox" id="toggleBotDisplaySwitch" ${isDevModeActive ? 'checked' : ''} style="opacity:0; width:0; height:0;">
          <span id="sliderBot" style="position:absolute; cursor:pointer; top:0; left:0; right:0; bottom:0; background-color:${isDevModeActive ? '#00cec9' : '#636e72'}; transition:.4s; border-radius:24px;"></span>
        </label>
      </div>
      ` : ''}

      <h3 style="font-size:16px; border-bottom:1px solid #636e72; padding-bottom:5px; margin-top:15px;">Moderation Actions</h3>
      <div style="display:grid; grid-template-columns: 1fr 1fr; gap:8px;">
        <button id="btnBlackout" style="background:#d63031; color:white; border:none; padding:8px; border-radius:4px; cursor:pointer; font-size:13px;">Blackout Interrogation</button>
        <button id="btnKickPlayer" style="background:#e67e22; color:white; border:none; padding:8px; border-radius:4px; cursor:pointer; font-size:13px;">Kick Player</button>
        <button id="btnMutePlayer" style="background:#f39c12; color:white; border:none; padding:8px; border-radius:4px; cursor:pointer; font-size:13px;">Mute Player</button>
        <button id="btnDisableAbility" style="background:#8e44ad; color:white; border:none; padding:8px; border-radius:4px; cursor:pointer; font-size:13px;">Disable Ability</button>
      </div>
    </div>

    <!-- CHAT SECTION -->
    <div id="sectionChat" style="display:none;">
      <div id="chatHistoryBox" style="background:#1e272e; height:180px; overflow-y:auto; padding:8px; border-radius:6px; font-size:13px; margin-bottom:10px;">
        ${staffChatMessages.length === 0 ? '<div style="color:#b2bec3;">No messages yet.</div>' : staffChatMessages.map(m => `<div><b>[${m.sender}]:</b>${m.text}</div>`).join('')}
      </div>
      <div style="display:flex; gap:6px;">
        <input type="text" id="chatInputText" placeholder="Type staff message..." style="flex:1; padding:8px; border-radius:4px; border:none;">
        <button id="btnSendChatMsg" style="background:#0984e3; color:white; border:none; padding:8px 12px; border-radius:4px; cursor:pointer;">Send</button>
      </div>
    </div>

    <!-- REPORTS SECTION -->
    <div id="sectionReports" style="display:none;">
      <button id="btnReportNewPlayer" style="background:#00b894; color:white; border:none; padding:8px; width:100%; border-radius:4px; cursor:pointer; font-weight:bold; margin-bottom:10px;">+ Report Player to Admin</button>
      <div style="background:#1e272e; height:160px; overflow-y:auto; padding:8px; border-radius:6px; font-size:13px;">
        ${submittedReports.length === 0 ? '<div style="color:#b2bec3;">No submitted reports.</div>' : submittedReports.map(r => `<div style="margin-bottom:8px; border-bottom:1px solid #636e72; padding-bottom:4px;"><b>Suspect:</b> ${r.suspect}<br><b>Reporter:</b>${r.reporter}<br><b>Reason:</b> ${r.reason} (${r.time})</div>`).join('')}
      </div>
    </div>
  `;

  panel.innerHTML = html;
  container.appendChild(panel);
  document.body.appendChild(container);

  // EVENT HANDLERS
  document.getElementById("closeStaffPanel").onclick = () => container.remove();

  let sControls = document.getElementById("sectionControls");
  let sChat = document.getElementById("sectionChat");
  let sReports = document.getElementById("sectionReports");
  let tControls = document.getElementById("tabControls");
  let tChat = document.getElementById("tabChat");
  let tReports = document.getElementById("tabReports");

  tControls.onclick = () => {
    sControls.style.display = "block"; sChat.style.display = "none"; sReports.style.display = "none";
    tControls.style.background = "#0984e3"; tChat.style.background = "#636e72"; tReports.style.background = "#636e72";
  };
  tChat.onclick = () => {
    sControls.style.display = "none"; sChat.style.display = "block"; sReports.style.display = "none";
    tControls.style.background = "#636e72"; tChat.style.background = "#0984e3"; tReports.style.background = "#636e72";
  };
  tReports.onclick = () => {
    sControls.style.display = "none"; sChat.style.display = "none"; sReports.style.display = "block";
    tControls.style.background = "#636e72"; tChat.style.background = "#636e72"; tReports.style.background = "#0984e3";
  };

  if (isDevOrAdmin) {
    document.getElementById("btnShutdownServer").onclick = () => {
      if (gameLoopInterval) clearInterval(gameLoopInterval);
      if (peer) peer.destroy();
      currentScreen = "screen0";
      setPersistentAnnouncement("STAFF ACTION: All active room servers shut down!");
      container.remove();
    };
  }

  let toggleEmp = document.getElementById("toggleEmpSwitch");
  if (toggleEmp) {
    toggleEmp.onchange = (e) => {
      manualEmpLock = e.target.checked;
      document.getElementById("sliderEmp").style.backgroundColor = manualEmpLock ? '#00cec9' : '#636e72';
      setPersistentAnnouncement("Global EMP Switch set to: " + (manualEmpLock ? "ACTIVE" : "OFF"));
    };
  }

  let toggleBot = document.getElementById("toggleBotDisplaySwitch");
  if (toggleBot) {
    toggleBot.onchange = (e) => {
      isDevModeActive = e.target.checked;
      document.getElementById("sliderBot").style.backgroundColor = isDevModeActive ? '#00cec9' : '#636e72';
      setPersistentAnnouncement("Bot Roles Display: " + (isDevModeActive ? "VISIBLE" : "HIDDEN"));
    };
  }

  document.getElementById("btnBlackout").onclick = () => {
    openModal("Select Player ID to interrogate (0 for You, 1-3 for Players):", (tVal) => {
      let targetID = parseInt(tVal);
      if (!isNaN(targetID) && targetID >= 0 && targetID <= 3) {
        blackoutTargetPlayer = targetID;
        isBlackoutActive = true;
        container.remove();
      }
    });
  };

  document.getElementById("btnKickPlayer").onclick = () => {
    openModal("Enter username of player to KICK:", (targetUser) => {
      let name = targetUser.trim();
      if (name !== "") {
        serverKickedUsers.push(name);
        setPersistentAnnouncement("Staff Action: " + name + " has been KICKED.");
      }
    });
  };

  document.getElementById("btnMutePlayer").onclick = () => {
    openModal("Enter username of player to MUTE:", (targetUser) => {
      let name = targetUser.trim();
      if (name !== "") {
        serverMutedUsers.push(name);
        setPersistentAnnouncement("Staff Action: " + name + " has been MUTED.");
      }
    });
  };

  document.getElementById("btnDisableAbility").onclick = () => {
    openModal("Select Player ID to DISABLE ability (0 for You, 1-3 for Players):", (dVal) => {
      let dID = parseInt(dVal);
      if (!isNaN(dID) && dID >= 0 && dID <= 3) {
        disabledRolePlayers.push(dID);
        setPersistentAnnouncement("Staff Action: Disabled ability for Player " + (dID === 0 ? "You" : (dID + 1)));
      }
    });
  };

  document.getElementById("btnSendChatMsg").onclick = () => {
    let inp = document.getElementById("chatInputText");
    let msg = inp.value.trim();
    if (msg !== "") {
      staffChatMessages.push({ sender: localUsername + " (" + userRank + ")", text: msg });
      inp.value = "";
      document.getElementById("chatHistoryBox").innerHTML = staffChatMessages.map(m => `<div><b>[${m.sender}]:</b> ${m.text}</div>`).join('');
    }
  };

  document.getElementById("btnReportNewPlayer").onclick = () => {
    openModal("Enter the username of the player you want to report:", (targetUser) => {
      let suspect = targetUser.trim();
      if (suspect !== "") {
        openModal("Enter reason for reporting " + suspect + ":", (reasonVal) => {
          let reason = reasonVal.trim();
          if (reason !== "") {
            submittedReports.push({ reporter: localUsername, suspect: suspect, reason: reason, time: new Date().toLocaleTimeString() });
            setPersistentAnnouncement("Report successfully filed against " + suspect + "!");
            container.remove();
          }
        });
      }
    });
  };
}
