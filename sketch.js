// ==================== GLOBAL STATE & VARIABLES ====================
let isMultiplayer = false;
let currentRoomCode = "";
let isHost = false;
let playerNumber = 1;
let totalPlayersCount = 4;

// LOAD PERSISTED USERNAME OR DEFAULT TO "Player"
let localUsername = localStorage.getItem("game_localUsername") || "Player";
let userRank = localStorage.getItem("game_userRank") || "";

// PeerJS Networking Variables
let peer = null;
let conn = null;
let connectedPeersList = [];
let activePeerConnections = [];

// VIEW ROLES OFF BY DEFAULT
let isDevModeActive = false; 
let showShieldIcon = false; 

// Staff Portal State & Logs (Persisted in localStorage)
let staffChatMessages = JSON.parse(localStorage.getItem("game_staffChatMessages")) || [];
let submittedReports = JSON.parse(localStorage.getItem("game_submittedReports")) || [];

function saveStaffChat() {
  localStorage.setItem("game_staffChatMessages", JSON.stringify(staffChatMessages));
}

function saveStaffReports() {
  localStorage.setItem("game_submittedReports", JSON.stringify(submittedReports));
}

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
  "tankamdemkin": "Admin",
  "harshit": "Dev",
  "rugved": "Dev",
  "mayank": "Admin",
  "arnav": "Dev"
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
  "Vampire", "Swapper", "Hacker", "Altruist", "Witch", "Warden"
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

// Warden Mechanics Variables
let custodyTargetID = null;
let executionTimer = null;
let executionCountdown = 0;
let isWardenStripped = false;

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

function saveUsername(newName) {
  localUsername = newName;
  localStorage.setItem("game_localUsername", newName);
  updateLocalUserRank();
}

function updateLocalUserRank() {
  let lowerUser = localUsername.toLowerCase();
  if (authorizedUsers[lowerUser]) {
    userRank = authorizedUsers[lowerUser];
    localStorage.setItem("game_userRank", userRank);
  } else {
    userRank = localStorage.getItem("game_userRank") || "";
  }
}

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

function drawVectorRoleBadge(x, y, sz, roleId, labelText) {
  push();
  translate(x, y);

  let cHex = getRoleColorHex(roleId);
  
  // Outer Diamond Frame
  stroke(255, 255, 255, 220);
  strokeWeight(3);
  fill(color(cHex));
  beginShape();
  vertex(0, -sz);
  vertex(sz * 0.8, 0);
  vertex(0, sz);
  vertex(-sz * 0.8, 0);
  endShape(CLOSE);

  // Inner Diamond Border
  stroke(255, 255, 255, 120);
  strokeWeight(1.5);
  noFill();
  beginShape();
  vertex(0, -sz * 0.82);
  vertex(sz * 0.65, 0);
  vertex(0, sz * 0.82);
  vertex(-sz * 0.65, 0);
  endShape(CLOSE);

  // Role Icon Vectors
  noStroke();
  fill(255);

  if (roleId === 1) { // Killer (Dagger)
    push();
    rotate(QUARTER_PI);
    rect(-sz * 0.08, -sz * 0.4, sz * 0.16, sz * 0.5, 2);
    triangle(0, -sz * 0.55, -sz * 0.12, -sz * 0.35, sz * 0.12, -sz * 0.35);
    rect(-sz * 0.2, 0.1 * sz, sz * 0.4, sz * 0.08, 2);
    rect(-sz * 0.08, 0.18 * sz, sz * 0.16, sz * 0.2, 2);
    pop();
  } 
  else if (roleId === 2) { // GA (Shield & Wings)
    fill(255, 215, 0);
    arc(-sz * 0.3, -sz * 0.1, sz * 0.4, sz * 0.5, HALF_PI, PI + HALF_PI);
    arc(sz * 0.3, -sz * 0.1, sz * 0.4, sz * 0.5, PI + HALF_PI, HALF_PI);
    fill(255);
    beginShape();
    vertex(0, -sz * 0.35);
    vertex(sz * 0.25, -sz * 0.2);
    vertex(sz * 0.2, sz * 0.2);
    vertex(0, sz * 0.38);
    vertex(-sz * 0.2, sz * 0.2);
    vertex(-sz * 0.25, -sz * 0.2);
    endShape(CLOSE);
  }
  else if (roleId === 3) { // Sheriff (6-Point Star)
    fill(255, 223, 0);
    push();
    drawStarVector(0, 0, sz * 0.2, sz * 0.45, 6);
    pop();
  }
  else if (roleId === 4) { // Doctor (Cross & Syringe)
    fill(255);
    rect(-sz * 0.1, -sz * 0.35, sz * 0.2, sz * 0.7, 3);
    rect(-sz * 0.35, -sz * 0.1, sz * 0.7, sz * 0.2, 3);
    stroke(46, 204, 113);
    strokeWeight(2);
    line(-sz * 0.2, sz * 0.2, sz * 0.2, -sz * 0.2);
  }
  else if (roleId === 5) { // Detective (Handcuffs)
    stroke(255);
    strokeWeight(3);
    noFill();
    ellipse(-sz * 0.18, -sz * 0.05, sz * 0.3, sz * 0.3);
    ellipse(sz * 0.18, sz * 0.1, sz * 0.3, sz * 0.3);
    line(-sz * 0.05, -sz * 0.05, sz * 0.05, sz * 0.1);
  }
  else if (roleId === 6) { // Jester (Crown)
    fill(255);
    beginShape();
    vertex(-sz * 0.35, -sz * 0.1);
    vertex(-sz * 0.25, sz * 0.2);
    vertex(sz * 0.25, sz * 0.2);
    vertex(sz * 0.35, -sz * 0.1);
    vertex(sz * 0.15, 0);
    vertex(0, -sz * 0.35);
    vertex(-sz * 0.15, 0);
    endShape(CLOSE);
  }
  else if (roleId === 11) { // Hacker (Laptop)
    fill(255);
    rect(-sz * 0.3, -sz * 0.25, sz * 0.6, sz * 0.38, 4);
    fill(30);
    rect(-sz * 0.25, -sz * 0.21, sz * 0.5, sz * 0.3);
    fill(255);
    rect(-sz * 0.38, sz * 0.15, sz * 0.76, sz * 0.1, 3);
  }
  else if (roleId === 12) { // Altruist (Nezha / Spear & Ribbon Ring)
    stroke(231, 76, 60);
    strokeWeight(3);
    noFill();
    ellipse(0, 0, sz * 0.6, sz * 0.6);
    noStroke();
    fill(241, 196, 15);
    triangle(0, -sz * 0.45, -sz * 0.1, -sz * 0.1, sz * 0.1, -sz * 0.1);
    rect(-sz * 0.03, -sz * 0.1, sz * 0.06, sz * 0.5);
  }
  else if (roleId === 10) { // Swapper (Arrow Loops)
    stroke(255);
    strokeWeight(3);
    noFill();
    arc(-sz * 0.05, 0, sz * 0.4, sz * 0.4, -HALF_PI, HALF_PI);
    arc(sz * 0.05, 0, sz * 0.4, sz * 0.4, HALF_PI, PI + HALF_PI);
  }
  else { // Default
    fill(255);
    ellipse(0, 0, sz * 0.4, sz * 0.4);
  }

  if (labelText) {
    noStroke();
    fill(0, 0, 0, 190);
    rect(-sz * 0.65, sz * 0.5, sz * 1.3, sz * 0.32, 4);
    fill(255);
    textSize(max(9, sz * 0.22));
    textStyle(BOLD);
    textAlign(CENTER, CENTER);
    text(labelText, 0, sz * 0.65);
  }

  pop();
}

function drawStarVector(x, y, radius1, radius2, npoints) {
  let angle = TWO_PI / npoints;
  let halfAngle = angle / 2.0;
  beginShape();
  for (let a = 0; a < TWO_PI; a += angle) {
    let sx = x + cos(a) * radius2;
    let sy = y + sin(a) * radius2;
    vertex(sx, sy);
    sx = x + cos(a + halfAngle) * radius1;
    sy = y + sin(a + halfAngle) * radius1;
    vertex(sx, sy);
  }
  endShape(CLOSE);
}

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
  text("Who is Sus", width / 2, height / 2 - 200);

  textSize(16);
  textStyle(NORMAL);
  fill(200);
  text("Player: " + localUsername + (userRank ? " (" + userRank + ")" : ""), width / 2, height / 2 - 155);

  drawButton(width / 2 - 130, height / 2 - 120, 260, 40, "Start Singleplayer", color(46, 204, 113));
  drawButton(width / 2 - 130, height / 2 - 70, 260, 40, "Create Multiplayer Room", color(52, 152, 219));
  drawButton(width / 2 - 130, height / 2 - 20, 260, 40, "Join Multiplayer Room", color(155, 89, 182));
  
  drawButton(width / 2 - 130, height / 2 + 30, 260, 38, "Account Settings", color(52, 73, 94));
  
  drawButton(width / 2 - 130, height / 2 + 75, 260, 35, "Credits", color(230, 126, 34));

  drawButton(width / 2 - 80, height / 2 + 120, 160, 35, "Staff Assist", color(108, 122, 137));
}

function drawMultiplayerLobbyScreen() {
  fill(255);
  textSize(34);
  textStyle(BOLD);
  text("MULTIPLAYER LOBBY", width / 2, height / 2 - 140);

  fill(241, 196, 15);
  textSize(22);
  text("Room Code: " + currentRoomCode, width / 2, height / 2 - 90);

  fill(220);
  textSize(15);
  text(statusMessage, width / 2, height / 2 - 60);

  fill(200);
  textSize(16);
  textStyle(NORMAL);
  text("Connected Players in Room:", width / 2, height / 2 - 25);

  let playersList = [localUsername + " (You - " + (isHost ? "Host" : "Player") + ")"];
  for (let p of connectedPeersList) {
    playersList.push(p);
  }

  for (let i = 0; i < 4; i++) {
    fill(45, 52, 54);
    stroke(100);
    rect(width / 2 - 150, height / 2 + (i * 35) - 5, 300, 30, 6);
    noStroke();
    
    fill(i < playersList.length ? color(255) : color(120));
    textSize(14);
    text(i < playersList.length ? playersList[i] : "Waiting for player...", width / 2, height / 2 + (i * 35) + 10);
  }

  if (isHost) {
    drawButton(width / 2 - 110, height / 2 + 150, 220, 45, "Start Match", color(46, 204, 113));
  } else {
    fill(200);
    textSize(15);
    text("Waiting for host to start the match...", width / 2, height / 2 + 170);
  }

  drawButton(width / 2 - 90, height / 2 + 210, 180, 38, "Leave Room", color(231, 76, 60));
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
        
        drawVectorRoleBadge(card.x + card.w / 2, card.y + card.h / 2 + 25, 22, role);
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
    
    if (custodyTargetID === (i + 1)) {
      fill(230, 126, 34);
      textSize(12);
      textStyle(BOLD);
      if (executionTimer !== null) {
        text("⚡ EXECUTING (" + executionCountdown + "s)", card.x + card.w / 2, card.y + 110);
      } else {
        text("🔒 IN CUSTODY", card.x + card.w / 2, card.y + 110);
      }
    }

    if (isDevModeActive) {
      drawVectorRoleBadge(card.x + card.w / 2, card.y + 130, 18, targetRoles[i], getRoleName(targetRoles[i]));
    }
  }

  // WARDEN ACTION BUTTONS DURING CUSTODY
  if (role === 14 && custodyTargetID !== null) {
    drawButton(width / 2 - 205, height - 130, 190, 38, "Pardon Player", color(46, 204, 113));
    drawButton(width / 2 + 15, height - 130, 190, 38, "⚡ Execute Player", color(231, 76, 60));
  }

  if (hunterRevengePending) {
    drawButton(width / 2 - 110, height - 85, 220, 45, "Show Mercy (Spectate)", color(142, 68, 173));
  } else if (!isPlayerAlive) {
    drawButton(width / 2 - 90, height - 85, 180, 45, isSpectating ? "Spectating..." : "Spectate Game", color(142, 68, 173));
  }

  if (userRank === "Dev" || userRank === "Admin" || userRank === "Moderator") {
    drawButton(20, 20, 140, 35, "In-Game Controls", color(108, 122, 137));
    drawButton(170, 20, 120, 35, "Staff Portal", color(41, 128, 185));
  } else {
    drawButton(20, 20, 110, 35, "🚩 Report", color(231, 76, 60));
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
  let headingColor = color(231, 76, 60);

  if (currentScreen === "screen5") {
    headingColor = color(52, 152, 219);
  } else if (currentScreen === "screen6") {
    headingColor = color(241, 196, 15);
  } else if (currentScreen === "screen8") {
    headingColor = color(142, 68, 173);
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
  textSize(15);
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
    case 14: return color(211, 84, 0);
    default: return color(255);
  }
}

function getRoleColorHex(r) {
  switch (r) {
    case 1: return "#e74c3c";
    case 2: return "#06eff8";
    case 3: return "#3498db";
    case 4: return "#2ecc71";
    case 5: return "#9b59b6";
    case 6: return "#e67e22";
    case 7: return "#95a5a6";
    case 8: return "#8b0000";
    case 9: return "#dc143c";
    case 10: return "#ff00ff";
    case 11: return "#00ffff";
    case 12: return "#f1c40f";
    case 13: return "#800080";
    case 14: return "#d35400";
    default: return "#ffffff";
  }
}

// ==================== NATIVE PROMPT & MODAL HELPERS ====================

function openModal(promptText, callback) {
  let result = prompt(promptText);
  if (result !== null) {
    callback(result);
  }
}

function triggerNonStaffReportModal() {
  openModal("Enter the username or Player # to report:", (suspectVal) => {
    let suspect = suspectVal.trim();
    if (suspect === "") return;

    openModal("Reason for report (e.g., Cheating, Toxicity):", (reasonVal) => {
      let reason = reasonVal.trim();
      if (reason === "") return;

      let reportObj = {
        reporter: localUsername,
        suspect: suspect,
        reason: reason,
        time: new Date().toLocaleTimeString()
      };

      submittedReports.push(reportObj);
      saveStaffReports();

      if (isMultiplayer) {
        broadcastData({ type: "STAFF_REPORT", report: reportObj });
      }

      setPersistentAnnouncement("Report submitted! Staff will review it.");
    });
  });
}

function triggerStaffCredentialsPrompt(targetCallback) {
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
        userRank = authorizedUsers[lowerUser];
        saveUsername(enteredUser);
        localStorage.setItem("game_userRank", userRank);
        setPersistentAnnouncement("STAFF AUTHENTICATED: Logged in as " + userRank);
        if (targetCallback) targetCallback();
      } else {
        setPersistentAnnouncement("INVALID CREDENTIALS!");
      }
    }
  });
}

// ==================== CREDITS MODAL ====================

function openCreditsPanel() {
  let existing = document.getElementById("creditsPanelContainer");
  if (existing) existing.remove();

  let container = document.createElement("div");
  container.id = "creditsPanelContainer";
  container.style.cssText = `
    position: fixed; top: 0; left: 0; width: 100vw; height: 100vh;
    background: rgba(0, 0, 0, 0.85); display: flex; justify-content: center; align-items: center;
    z-index: 10000; font-family: sans-serif;
  `;

  container.onclick = (e) => e.stopPropagation();
  container.onmousedown = (e) => e.stopPropagation();
  container.ontouchstart = (e) => e.stopPropagation();

  let panel = document.createElement("div");
  panel.style.cssText = `
    background: #2d3436; color: white; width: 90%; max-width: 440px; padding: 20px;
    border-radius: 12px; box-shadow: 0 0 25px rgba(230,126,34,0.5); border: 2px solid #e67e22;
    text-align: center;
  `;

  let html = `
    <div style="display:flex; justify-content:space-between; align-items:center; border-bottom:2px solid #636e72; padding-bottom:10px; margin-bottom:15px;">
      <h2 style="margin:0; font-size:20px; color:#e67e22;">📜 GAME CREDITS</h2>
      <button id="closeCreditsPanel" style="background:#e74c3c; border:none; color:white; font-weight:bold; padding:6px 12px; border-radius:4px; cursor:pointer;">✕ Close</button>
    </div>

    <div style="font-size:14px; color:#dfe6e9; line-height:1.6; text-align:left; background:#1e272e; padding:15px; border-radius:8px; max-height:60vh; overflow-y:auto;">
      <p style="margin:0 0 8px 0;"><strong>Head Developer:</strong> Pratesh Gaikwad</p>
      <p style="margin:0 0 8px 0;"><strong>Assistant Developer:</strong> Chinmay</p>
      <p style="margin:0 0 8px 0;"><strong>Drawings & Art:</strong> Heramb</p>
      <p style="margin:0 0 8px 0;"><strong>Sound Artist:</strong> Heramb Ambole</p>
      <p style="margin:0 0 8px 0;"><strong>Sounds:</strong> Myinstants</p>
      
      <hr style="border:0; border-top:1px solid #636e72; margin:10px 0;">
      
      <p style="margin:0 0 6px 0; color:#f1c40f; font-weight:bold;">🧪 Testing Team:</p>
      <ul style="margin:0 0 10px 0; padding-left:20px; color:#dfe6e9; font-size:13px;">
        <li>Harshit Anchan</li>
        <li>Rugved Shinde</li>
        <li>Arnav Gaikwad</li>
        <li>Mayank Mali</li>
      </ul>

      <hr style="border:0; border-top:1px solid #636e72; margin:10px 0;">
      
      <p style="margin:0 0 4px 0; font-size:13px; color:#b2bec3;"><strong>Made with:</strong> CodeAI & p5.js</p>
      <p style="margin:0 0 10px 0; font-size:13px; color:#b2bec3;"><strong>Hosted on:</strong> GitHub Pages</p>
      <p style="margin:0; font-size:12px; color:#718093; text-align:center;">© 2026 CodeAI Project Team. All rights reserved.</p>
    </div>

    <button id="btnCreditsOk" style="margin-top:15px; background:#e67e22; color:white; border:none; padding:10px; width:100%; border-radius:6px; cursor:pointer; font-weight:bold; font-size:15px;">Awesome!</button>
  `;

  panel.innerHTML = html;
  container.appendChild(panel);
  document.body.appendChild(container);

  document.getElementById("closeCreditsPanel").onclick = () => container.remove();
  document.getElementById("btnCreditsOk").onclick = () => container.remove();
}

// ==================== ROBUST PEERJS MULTIPLAYER NETWORKING ====================

function createMultiplayerRoom() {
  currentRoomCode = "ROOM-" + floor(random(1000, 9999));
  
  if (typeof Peer === "undefined") {
    statusMessage = "Error: PeerJS library not loaded!";
    return;
  }

  peer = new Peer(currentRoomCode, {
    host: '0.peerjs.com',
    port: 443,
    secure: true,
    debug: 2
  });

  peer.on('open', (id) => {
    isMultiplayer = true;
    isHost = true;
    connectedPeersList = [];
    activePeerConnections = [];
    currentScreen = "multiplayer_lobby";
    statusMessage = "Room created successfully! Waiting for players...";
  });

  peer.on('connection', (incomingConn) => {
    activePeerConnections.push(incomingConn);
    setupPeerConnectionHandlers(incomingConn);
    statusMessage = "A player connected to your room!";
  });

  peer.on('error', (err) => {
    statusMessage = "Peer error: " + err.type;
    console.error("Peer error:", err);
  });
}

function joinMultiplayerRoom(code) {
  statusMessage = "Connecting to " + code + "...";
  currentScreen = "multiplayer_lobby";
  isMultiplayer = true;
  isHost = false;
  currentRoomCode = code;

  if (typeof Peer === "undefined") {
    statusMessage = "Error: PeerJS library not loaded!";
    return;
  }

  peer = new Peer({
    host: '0.peerjs.com',
    port: 443,
    secure: true,
    debug: 2
  });

  peer.on('open', () => {
    conn = peer.connect(code, { reliable: true });
    
    conn.on('open', () => {
      statusMessage = "Connected to room: " + code;
      setupPeerConnectionHandlers(conn);
      conn.send({ type: "JOIN", name: localUsername });
    });

    conn.on('error', (err) => {
      statusMessage = "Connection failed. Check room code.";
      console.error(err);
    });
  });

  peer.on('error', (err) => {
    statusMessage = "Could not connect to broker server.";
    console.error(err);
  });
}

function broadcastData(data) {
  if (isHost) {
    for (let c of activePeerConnections) {
      if (c && c.open) {
        c.send(data);
      }
    }
  } else if (conn && conn.open) {
    conn.send(data);
  }
}

function setupPeerConnectionHandlers(targetConn) {
  targetConn.on('data', (data) => {
    if (data.type === "JOIN") {
      if (!connectedPeersList.includes(data.name)) {
        connectedPeersList.push(data.name);
      }
      statusMessage = data.name + " joined the room!";
      
      if (isHost) {
        broadcastData({ type: "SYNC_PEERS", list: connectedPeersList });
        broadcastData({ type: "SYNC_STAFF_CHAT", messages: staffChatMessages });
        broadcastData({ type: "SYNC_STAFF_REPORTS", reports: submittedReports });
      }
    } else if (data.type === "SYNC_PEERS") {
      connectedPeersList = data.list;
    } else if (data.type === "SYNC_STAFF_CHAT") {
      staffChatMessages = data.messages;
      saveStaffChat();
      updateStaffChatDOM();
    } else if (data.type === "SYNC_STAFF_REPORTS") {
      submittedReports = data.reports;
      saveStaffReports();
      updateStaffReportsDOM();
    } else if (data.type === "START_GAME") {
      startMultiplayerMatchFromServer(data.roleData);
    } else if (data.type === "ACTION") {
      handleRoleAction(data.targetNum, data.cardIndex);
    } else if (data.type === "STAFF_CHAT") {
      staffChatMessages.push(data.message);
      saveStaffChat();
      updateStaffChatDOM();
    } else if (data.type === "STAFF_REPORT") {
      submittedReports.push(data.report);
      saveStaffReports();
      updateStaffReportsDOM();
    }

    if (isHost) {
      for (let c of activePeerConnections) {
        if (c !== targetConn && c.open) {
          c.send(data);
        }
      }
    }
  });

  targetConn.on('close', () => {
    statusMessage = "A peer disconnected.";
  });
}

function updateStaffChatDOM() {
  let box = document.getElementById("chatHistoryBox");
  if (box) {
    box.innerHTML = staffChatMessages.length === 0 ? '<div style="color:#b2bec3;">No messages yet.</div>' : staffChatMessages.map(m => `<div><b>[${m.sender}]:</b> ${m.text}</div>`).join('');
    box.scrollTop = box.scrollHeight;
  }
  let tabChatBtn = document.getElementById("tabChat");
  if (tabChatBtn) {
    tabChatBtn.innerText = `Staff Chat (${staffChatMessages.length})`;
  }
}

function updateStaffReportsDOM() {
  let repBox = document.getElementById("sectionReports");
  if (repBox) {
    let listDiv = repBox.querySelector("div:last-child");
    if (listDiv) {
      listDiv.innerHTML = submittedReports.length === 0 ? '<div style="color:#b2bec3;">No submitted reports.</div>' : submittedReports.map(r => `<div style="margin-bottom:8px; border-bottom:1px solid #636e72; padding-bottom:4px;"><b>Suspect:</b> ${r.suspect}<br><b>Reporter:</b> ${r.reporter}<br><b>Reason:</b> ${r.reason} (${r.time})</div>`).join('');
    }
  }
  let tabRepBtn = document.getElementById("tabReports");
  if (tabRepBtn) {
    tabRepBtn.innerText = `Reports (${submittedReports.length})`;
  }
}

// ==================== INTERACTION & EVENTS ====================

function mousePressed() {
  if (document.getElementById("staffPanelContainer") || document.getElementById("inGameControlsContainer") || document.getElementById("devTesterContainer") || document.getElementById("creditsPanelContainer") || document.getElementById("witchGuessContainer")) {
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
        mouseY >= height / 2 - 120 && mouseY <= height / 2 - 80) {
      startSingleplayer();
    }
    else if (mouseX >= width / 2 - 130 && mouseX <= width / 2 + 130 &&
             mouseY >= height / 2 - 70 && mouseY <= height / 2 - 30) {
      createMultiplayerRoom();
    }
    else if (mouseX >= width / 2 - 130 && mouseX <= width / 2 + 130 &&
             mouseY >= height / 2 - 20 && mouseY <= height / 2 + 20) {
      openModal("Enter Room Code to Join (e.g., ROOM-8315):", (val) => {
        let code = val.trim().toUpperCase();
        if (code === "BACKDOOR") {
          triggerStaffCredentialsPrompt();
          return;
        }
        if (code !== "") {
          joinMultiplayerRoom(code);
        }
      });
    }
    else if (mouseX >= width / 2 - 130 && mouseX <= width / 2 + 130 &&
             mouseY >= height / 2 + 30 && mouseY <= height / 2 + 68) {
      openModal("Enter your desired username:", (val) => {
        let newName = val.trim();
        if (newName !== "") {
          saveUsername(newName);
          setPersistentAnnouncement("Username updated to: " + localUsername);
        }
      });
    }
    else if (mouseX >= width / 2 - 130 && mouseX <= width / 2 + 130 &&
             mouseY >= height / 2 + 75 && mouseY <= height / 2 + 110) {
      openCreditsPanel();
    }
    else if (mouseX >= width / 2 - 80 && mouseX <= width / 2 + 80 &&
             mouseY >= height / 2 + 120 && mouseY <= height / 2 + 155) {
      if (userRank !== "") {
        openInteractiveStaffPanel();
      } else {
        triggerStaffCredentialsPrompt(() => openInteractiveStaffPanel());
      }
    }
  } else if (currentScreen === "multiplayer_lobby") {
    if (isHost && mouseX >= width / 2 - 110 && mouseX <= width / 2 + 110 &&
        mouseY >= height / 2 + 150 && mouseY <= height / 2 + 195) {
      startMultiplayerGame();
    }
    else if (mouseX >= width / 2 - 90 && mouseX <= width / 2 + 90 &&
             mouseY >= height / 2 + 210 && mouseY <= height / 2 + 248) {
      if (peer) peer.destroy();
      isMultiplayer = false;
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

    if (userRank === "Dev" || userRank === "Admin" || userRank === "Moderator") {
      if (mouseX >= 20 && mouseX <= 160 && mouseY >= 20 && mouseY <= 55) {
        openInGameControlsPanel();
        return;
      }
      if (mouseX >= 170 && mouseX <= 290 && mouseY >= 20 && mouseY <= 55) {
        openInteractiveStaffPanel();
        return;
      }
    } else {
      if (mouseX >= 20 && mouseX <= 130 && mouseY >= 20 && mouseY <= 55) {
        triggerNonStaffReportModal();
        return;
      }
    }

    // WARDEN PARDON & EXECUTE BUTTON CLICKS
    if (role === 14 && custodyTargetID !== null) {
      // Pardon Button Click
      if (mouseX >= width / 2 - 205 && mouseX <= width / 2 - 15 &&
          mouseY >= height - 130 && mouseY <= height - 92) {
        pardonCustodyTarget();
        return;
      }
      // Execute Button Click (Starts Timer)
      if (mouseX >= width / 2 + 15 && mouseX <= width / 2 + 205 &&
          mouseY >= height - 130 && mouseY <= height - 92) {
        startWardenExecutionTimer();
        return;
      }
    }

    if (hunterRevengePending) {
      if (mouseX >= width / 2 - 110 && mouseX <= width / 2 + 110 &&
          mouseY >= height - 85 && mouseY <= height - 40) {
        hunterRevengePending = false;
        setPersistentAnnouncement("Hunter showed mercy and didn't execute anyone!");
        isSpectating = true;
        return;
      }
    }

    if (!isPlayerAlive && mouseX >= width / 2 - 90 && mouseX <= width / 2 + 90 &&
        mouseY >= height - 85 && mouseY <= height - 40) {
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
      if (executionTimer) clearInterval(executionTimer);
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
  
  broadcastData({
    type: "START_GAME",
    roleData: { role: targetRoles[0], targets: [role, targetRoles[1], targetRoles[2]] }
  });

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

function resetSingleplayerState() {
  isMultiplayer = false;
  showShieldIcon = false;
  isDevModeActive = false; // Ensures roles remain hidden by default
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
  
  custodyTargetID = null;
  if (executionTimer) clearInterval(executionTimer);
  executionTimer = null;
  executionCountdown = 0;
  isWardenStripped = false;
}

function startSingleplayer() {
  resetSingleplayerState();
  setupSingleplayerRoles();
  setupRoleUI();

  currentScreen = "Role_screen";
  startShufflePhase();
}

function launchDevDebugMode(devRole, bot1Role, bot2Role, bot3Role) {
  resetSingleplayerState();
  
  role = devRole;
  targetRoles = [bot1Role, bot2Role, bot3Role];

  setupRoleUI();
  currentScreen = "screen2";
  startRoleGameLoop();
  setPersistentAnnouncement("DEV MATCH ACTIVE: Testing as " + getRoleName(role));
}

function setupSingleplayerRoles() {
  let primaryBadRole = (floor(random(1, 3)) === 1) ? 1 : 9;
  let townRoles = [2, 4, 5, 8, 14];
  let guaranteedTown = townRoles[floor(random(0, townRoles.length))];
  
  let remainingPool = [2, 4, 5, 6, 7, 8, 10, 11, 12, 13, 14];
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
  else if (role === 14) statusMessage = "Warden: Select a suspect to detain!";
}

// ==================== WARDEN HELPER FUNCTIONS ====================

function selectWardenTarget(targetNum, cardIndex) {
  if (isWardenStripped) {
    setPersistentAnnouncement("WARDEN PENALTY: You executed a citizen and lost your power!");
    return;
  }

  for (let i = 0; i < 3; i++) {
    if (isTargetAlive[i]) targetCards[i].borderColor = color(180);
  }

  custodyTargetID = targetNum;
  targetCards[cardIndex].borderColor = color(230, 126, 34);
  setPersistentAnnouncement("WARDEN: Player " + (targetNum + 1) + " selected. Choose Pardon or Execute.");
}

function startWardenExecutionTimer() {
  if (custodyTargetID === null) return;
  
  executionCountdown = 10;
  let cardIndex = custodyTargetID - 1;
  targetCards[cardIndex].borderColor = color(231, 76, 60);

  setPersistentAnnouncement("WARDEN: Execution timer started for Player " + (custodyTargetID + 1) + " (10s)!");

  if (executionTimer) clearInterval(executionTimer);

  executionTimer = setInterval(() => {
    executionCountdown--;

    if (executionCountdown <= 0) {
      clearInterval(executionTimer);
      executionTimer = null;
      executeCustodyTarget();
    }
  }, 1000);
}

function pardonCustodyTarget() {
  if (executionTimer) clearInterval(executionTimer);
  executionTimer = null;

  if (custodyTargetID !== null && custodyTargetID > 0) {
    targetCards[custodyTargetID - 1].borderColor = color(180);
  }

  setPersistentAnnouncement("PARDONED: Warden released Player " + (custodyTargetID + 1) + " from custody!");
  custodyTargetID = null;
}

function executeCustodyTarget() {
  if (custodyTargetID === null) return;
  let targetRole = targetRoles[custodyTargetID - 1];

  setPersistentAnnouncement("EXECUTED: Player " + (custodyTargetID + 1) + " (" + getRoleName(targetRole) + ") was executed by the Warden!");

  if (targetRole !== 1 && targetRole !== 9) {
    isWardenStripped = true;
  }

  isTargetAlive[custodyTargetID - 1] = false;
  targetCards[custodyTargetID - 1].borderColor = color(231, 76, 60);
  notifyPlayerDeath(targetRole, custodyTargetID);
  
  custodyTargetID = null;
  checkGameStatus();
}

// ==================== SUPER SUS WITCH MODAL ====================

function openSuperSusWitchModal(targetNum, cardIndex, witchActorID) {
  let existing = document.getElementById("witchGuessContainer");
  if (existing) existing.remove();

  let targetName = (targetNum === 0) ? localUsername : ("Player " + (targetNum + 1));
  let actualRole = (targetNum === 0) ? role : targetRoles[targetNum - 1];

  let container = document.createElement("div");
  container.id = "witchGuessContainer";
  container.style.cssText = `
    position: fixed; top: 0; left: 0; width: 100vw; height: 100vh;
    background: rgba(0, 0, 0, 0.88); display: flex; justify-content: center; align-items: center;
    z-index: 10000; font-family: sans-serif;
  `;

  container.onclick = (e) => e.stopPropagation();
  container.onmousedown = (e) => e.stopPropagation();
  container.ontouchstart = (e) => e.stopPropagation();

  let panel = document.createElement("div");
  panel.style.cssText = `
    background: #1e272e; color: white; width: 92%; max-width: 500px; padding: 20px;
    border-radius: 16px; box-shadow: 0 0 30px rgba(155, 89, 182, 0.6); border: 2px solid #8e44ad;
    text-align: center;
  `;

  let rolesGridHtml = "";
  for (let i = 0; i < roleNames.length; i++) {
    let rId = i + 1;
    let rName = roleNames[i];
    let hexColor = getRoleColorHex(rId);

    rolesGridHtml += `
      <button class="witch-role-btn" data-roleid="${rId}" style="
        background: #2d3436; color: white; border: 2px solid ${hexColor};
        padding: 12px 8px; border-radius: 10px; cursor: pointer; font-weight: bold;
        font-size: 13px; display: flex; align-items: center; justify-content: space-between;
        transition: transform 0.15s ease, background 0.15s ease;
      " onmouseover="this.style.transform='scale(1.03)'; this.style.background='#353b48';" onmouseout="this.style.transform='scale(1)'; this.style.background='#2d3436';">
        <span style="color: ${hexColor}; font-weight: bold; font-size: 14px;">#${rId}</span>
        <span style="flex:1; text-align:center;">${rName}</span>
        <span style="display:inline-block; width:12px; height:12px; border-radius:50%; background:${hexColor};"></span>
      </button>
    `;
  }

  let html = `
    <div style="display:flex; justify-content:space-between; align-items:center; border-bottom:2px solid #8e44ad; padding-bottom:10px; margin-bottom:12px;">
      <h2 style="margin:0; font-size:18px; color:#e056fd;">🔮 WITCH SPELL GUESS</h2>
      <button id="closeWitchModal" style="background:#e74c3c; border:none; color:white; font-weight:bold; padding:6px 12px; border-radius:4px; cursor:pointer;">✕ Cancel</button>
    </div>

    <p style="font-size:14px; color:#dfe6e9; margin-bottom:15px;">
      Guess the exact role of <strong style="color:#f1c40f;">${targetName}</strong>:
    </p>

    <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 10px; max-height: 55vh; overflow-y: auto; padding-right: 4px;">
      ${rolesGridHtml}
    </div>
  `;

  panel.innerHTML = html;
  container.appendChild(panel);
  document.body.appendChild(container);

  document.getElementById("closeWitchModal").onclick = () => container.remove();

  let roleButtons = container.querySelectorAll(".witch-role-btn");
  roleButtons.forEach(btn => {
    btn.onclick = () => {
      let guessedRole = parseInt(btn.getAttribute("data-roleid"));
      container.remove();
      submitWitchGuessResult(guessedRole, actualRole, targetNum, cardIndex, witchActorID);
    };
  });
}

function submitWitchGuessResult(guessedRole, actualRole, targetNum, cardIndex, witchActorID) {
  if (guessedRole === actualRole) {
    setPersistentAnnouncement("🔮 WITCH SPELL SUCCESS! Guessed " + getRoleName(actualRole) + "!");
    if ([1, 9, 3, 6, 14].includes(actualRole)) {
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
    setPersistentAnnouncement("🔮 WITCH SPELL FAILED! " + (targetNum === 0 ? "Your" : ("Player " + (targetNum + 1) + "'s")) + " role was not " + getRoleName(guessedRole) + "!");
    if (witchActorID === 0) {
      handlePlayerDeath();
    } else {
      isTargetAlive[witchActorID - 1] = false;
      targetCards[witchActorID - 1].borderColor = color(231, 76, 60);
      notifyPlayerDeath(13, witchActorID);
      checkGameStatus();
    }
  }
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
    } else if (targetRole === 6) { // Sheriff shoots Jester
      targetCards[cardIndex].borderColor = color(230, 126, 34);
      isTargetAlive[targetNum - 1] = false;
      notifyPlayerDeath(6, targetNum);
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
    openSuperSusWitchModal(targetNum, cardIndex, 0);
    triggerAbilityCooldown();
  } else if (role === 14) { // WARDEN
    selectWardenTarget(targetNum, cardIndex);
    triggerAbilityCooldown();
  }
}

function executeSingleJesterHaunt(targetNum, cardIndex) {
  if (!isTargetAlive[targetNum - 1]) return;
  targetCards[cardIndex].borderColor = color(155, 89, 182);
  setPersistentAnnouncement("HAUNTED: You hexed Player " + (targetNum + 1) + " with bad luck!");
}

function notifyPlayerDeath(eliminatedRole, eliminatedID) {
  hasAnyPlayerDied = true;
  lastEliminatedRole = eliminatedRole;

  // JESTER WIN TRIGGER
  if (eliminatedRole === 6) {
    winReason = "Jester Wins: The Jester was successfully eliminated and chaotic victory was achieved!";
    currentScreen = "screen6"; 
    revealRoles();
    return;
  }

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
    // FREEZE COOLDOWN IF EMP IS ACTIVE
    if (empActive || manualEmpLock) {
      if (currentScreen === "screen2" && isPlayerAlive) {
        statusMessage = "⚡ COOLDOWN FROZEN (EMP JAMMED: " + cooldownTimer + "s)";
      }
      return; // Skip decrementing the timer while frozen!
    }

    cooldownTimer--;

    if (announcementHoldTimer > 0) {
      announcementHoldTimer--;
    }

    if (currentScreen === "screen2" && isPlayerAlive) {
      statusMessage = "Cooldown: " + cooldownTimer + "s";
    }

    if (cooldownTimer <= 0) {
      clearInterval(timerInterval);
      abilityCooldown = false;
      if (currentScreen === "screen2" && isPlayerAlive) {
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
  if (currentScreen !== "screen2") return;

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

// ==================== DEV ROLE TESTER MODAL ====================

function openDevRoleTesterPanel() {
  let existing = document.getElementById("devTesterContainer");
  if (existing) existing.remove();

  let container = document.createElement("div");
  container.id = "devTesterContainer";
  container.style.cssText = `
    position: fixed; top: 0; left: 0; width: 100vw; height: 100vh;
    background: rgba(0, 0, 0, 0.85); display: flex; justify-content: center; align-items: center;
    z-index: 10000; font-family: sans-serif;
  `;

  container.onclick = (e) => e.stopPropagation();
  container.onmousedown = (e) => e.stopPropagation();
  container.ontouchstart = (e) => e.stopPropagation();

  let panel = document.createElement("div");
  panel.style.cssText = `
    background: #2d3436; color: white; width: 90%; max-width: 420px; padding: 20px;
    border-radius: 12px; box-shadow: 0 0 25px rgba(0,206,201,0.5); border: 2px solid #00cec9;
    text-align: left;
  `;

  let roleOptionsHtml = roleNames.map((rName, idx) => `<option value="${idx + 1}">${idx + 1}. ${rName}</option>`).join('');

  let html = `
    <div style="display:flex; justify-content:space-between; align-items:center; border-bottom:2px solid #636e72; padding-bottom:10px; margin-bottom:15px;">
      <h2 style="margin:0; font-size:18px; color:#00cec9;">🧪 DEV ROLE TESTER</h2>
      <button id="closeDevTester" style="background:#e74c3c; border:none; color:white; font-weight:bold; padding:6px 12px; border-radius:4px; cursor:pointer;">✕ Close</button>
    </div>

    <p style="font-size:13px; color:#b2bec3; margin-bottom:12px;">
      Select the exact role you want to play as and assign custom roles to the 3 AI bots:
    </p>

    <div style="margin-bottom:10px;">
      <label style="display:block; font-size:13px; margin-bottom:4px; color:#74b9ff; font-weight:bold;">Your Role (Player 1):</label>
      <select id="selMyRole" style="width:100%; padding:8px; border-radius:6px; background:#1e272e; color:white; border:1px solid #636e72;">
        ${roleOptionsHtml}
      </select>
    </div>

    <div style="margin-bottom:10px;">
      <label style="display:block; font-size:13px; margin-bottom:4px; color:#f1c40f;">Bot 2 Role (Player 2):</label>
      <select id="selBot1Role" style="width:100%; padding:8px; border-radius:6px; background:#1e272e; color:white; border:1px solid #636e72;">
        ${roleOptionsHtml}
      </select>
    </div>

    <div style="margin-bottom:10px;">
      <label style="display:block; font-size:13px; margin-bottom:4px; color:#f1c40f;">Bot 3 Role (Player 3):</label>
      <select id="selBot2Role" style="width:100%; padding:8px; border-radius:6px; background:#1e272e; color:white; border:1px solid #636e72;">
        ${roleOptionsHtml}
      </select>
    </div>

    <div style="margin-bottom:14px;">
      <label style="display:block; font-size:13px; margin-bottom:4px; color:#f1c40f;">Bot 4 Role (Player 4):</label>
      <select id="selBot3Role" style="width:100%; padding:8px; border-radius:6px; background:#1e272e; color:white; border:1px solid #636e72;">
        ${roleOptionsHtml}
      </select>
    </div>

    <div style="display:flex; gap:10px; margin-top:10px;">
      <button id="btnRandomizeRoles" style="flex:1; background:#e67e22; color:white; border:none; padding:10px; border-radius:6px; cursor:pointer; font-weight:bold; font-size:13px;">🎲 Randomize Roles</button>
      <button id="btnStartDevMatch" style="flex:1.5; background:#00b894; color:white; border:none; padding:10px; border-radius:6px; cursor:pointer; font-weight:bold; font-size:14px;">▶ START MATCH</button>
    </div>
  `;

  panel.innerHTML = html;
  container.appendChild(panel);
  document.body.appendChild(container);

  document.getElementById("selMyRole").value = "1";    
  document.getElementById("selBot1Role").value = "3"; 
  document.getElementById("selBot2Role").value = "4"; 
  document.getElementById("selBot3Role").value = "8"; 

  document.getElementById("closeDevTester").onclick = () => container.remove();

  // GUARANTEED SHERIFF & KILLER/VAMPIRE RANDOMIZER
  document.getElementById("btnRandomizeRoles").onclick = () => {
    let totalRoles = roleNames.length;
    let badRole = (floor(random(1, 3)) === 1) ? 1 : 9; // Killer (1) or Vampire (9)
    let sheriffRole = 3; // Sheriff

    let remainingPool = [];
    for (let i = 1; i <= totalRoles; i++) {
      if (i !== badRole && i !== sheriffRole) {
        remainingPool.push(i);
      }
    }
    
    for (let k = remainingPool.length - 1; k > 0; k--) {
      let j = floor(random(0, k + 1));
      let temp = remainingPool[k]; remainingPool[k] = remainingPool[j]; remainingPool[j] = temp;
    }

    let deck = [badRole, sheriffRole, remainingPool[0], remainingPool[1]];

    for (let d = deck.length - 1; d > 0; d--) {
      let r = floor(random(0, d + 1));
      let tempDeck = deck[d]; deck[d] = deck[r]; deck[r] = tempDeck;
    }

    document.getElementById("selMyRole").value = deck[0];
    document.getElementById("selBot1Role").value = deck[1];
    document.getElementById("selBot2Role").value = deck[2];
    document.getElementById("selBot3Role").value = deck[3];
  };

  document.getElementById("btnStartDevMatch").onclick = () => {
    let myR = parseInt(document.getElementById("selMyRole").value);
    let b1R = parseInt(document.getElementById("selBot1Role").value);
    let b2R = parseInt(document.getElementById("selBot2Role").value);
    let b3R = parseInt(document.getElementById("selBot3Role").value);

    container.remove();
    let staffModal = document.getElementById("staffPanelContainer");
    if (staffModal) staffModal.remove();

    launchDevDebugMode(myR, b1R, b2R, b3R);
  };
}

// ==================== PANEL 1: IN-GAME CONTROLS MODAL ====================

function openInGameControlsPanel() {
  let existing = document.getElementById("inGameControlsContainer");
  if (existing) existing.remove();

  let container = document.createElement("div");
  container.id = "inGameControlsContainer";
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
    background: #2d3436; color: white; width: 90%; max-width: 450px; padding: 20px;
    border-radius: 12px; box-shadow: 0 0 20px rgba(0,0,0,0.8); border: 2px solid #6c5ce7;
    text-align: left;
  `;

  let html = `
    <div style="display:flex; justify-content:space-between; align-items:center; border-bottom:2px solid #636e72; padding-bottom:10px; margin-bottom:15px;">
      <h2 style="margin:0; font-size:18px; color:#a29bfe;">⚔️ IN-GAME MODERATION CONTROLS</h2>
      <button id="closeIgPanel" style="background:#e74c3c; border:none; color:white; font-weight:bold; padding:6px 12px; border-radius:4px; cursor:pointer;">✕ Close</button>
    </div>
    
    <div style="margin-bottom:15px; background:#353b48; padding:8px; border-radius:6px; font-size:13px; text-align:center;">
      Active User: <b>${localUsername}</b> | Rank: <span style="color:#f1c40f;">${userRank}</span>
    </div>

    <div style="display:grid; grid-template-columns: 1fr 1fr; gap:10px;">
      <button id="btnIgBlackout" style="background:#d63031; color:white; border:none; padding:12px; border-radius:6px; cursor:pointer; font-weight:bold;">🚨 Blackout Interrogation</button>
      <button id="btnIgMute" style="background:#f39c12; color:white; border:none; padding:12px; border-radius:6px; cursor:pointer; font-weight:bold;">🔇 Mute Player</button>
      <button id="btnIgBan" style="background:#c0392b; color:white; border:none; padding:12px; border-radius:6px; cursor:pointer; font-weight:bold;">⛔ Ban Player</button>
      <button id="btnIgKick" style="background:#e67e22; color:white; border:none; padding:12px; border-radius:6px; cursor:pointer; font-weight:bold;">🥾 Kick Player</button>
    </div>
    
    <div style="margin-top:10px;">
      <button id="btnIgEmp" style="background:#8e44ad; color:white; border:none; padding:12px; width:100%; border-radius:6px; cursor:pointer; font-weight:bold;">⚡ Trigger Ability EMP Jammer</button>
    </div>
  `;

  panel.innerHTML = html;
  container.appendChild(panel);
  document.body.appendChild(container);

  document.getElementById("closeIgPanel").onclick = () => container.remove();

  document.getElementById("btnIgBlackout").onclick = () => {
    openModal("Select Player ID to interrogate (0 for You, 1-3 for Players):", (tVal) => {
      let targetID = parseInt(tVal);
      if (!isNaN(targetID) && targetID >= 0 && targetID <= 3) {
        blackoutTargetPlayer = targetID;
        isBlackoutActive = true;
        container.remove();
      }
    });
  };

  document.getElementById("btnIgMute").onclick = () => {
    openModal("Enter username of player to MUTE:", (targetUser) => {
      let name = targetUser.trim();
      if (name !== "") {
        serverMutedUsers.push(name);
        setPersistentAnnouncement("In-Game Action: " + name + " has been MUTED.");
        container.remove();
      }
    });
  };

  document.getElementById("btnIgBan").onclick = () => {
    openModal("Enter username of player to BAN:", (targetUser) => {
      let name = targetUser.trim();
      if (name !== "") {
        serverBannedUsers.push(name);
        setPersistentAnnouncement("In-Game Action: " + name + " HAS BEEN BANNED!");
        container.remove();
      }
    });
  };

  document.getElementById("btnIgKick").onclick = () => {
    openModal("Enter username of player to KICK:", (targetUser) => {
      let name = targetUser.trim();
      if (name !== "") {
        serverKickedUsers.push(name);
        setPersistentAnnouncement("In-Game Action: " + name + " has been KICKED.");
        container.remove();
      }
    });
  };

  document.getElementById("btnIgEmp").onclick = () => {
    openModal("Select Player ID to DISABLE ability (0 for You, 1-3 for Players):", (dVal) => {
      let dID = parseInt(dVal);
      if (!isNaN(dID) && dID >= 0 && dID <= 3) {
        disabledRolePlayers.push(dID);
        setPersistentAnnouncement("In-Game Action: EMP jammed ability for Player " + (dID === 0 ? "You" : (dID + 1)));
        container.remove();
      }
    });
  };
}

// ==================== PANEL 2: STAFF PORTAL MODAL ====================

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
      <h2 style="margin:0; font-size:20px; color:#74b9ff;">🛡️ OFFICIAL STAFF PORTAL</h2>
      <button id="closeStaffPanel" style="background:#e74c3c; border:none; color:white; font-weight:bold; padding:6px 12px; border-radius:4px; cursor:pointer;">✕ Close</button>
    </div>
    
    <div style="margin-bottom:15px; background:#353b48; padding:8px; border-radius:6px; font-size:14px; text-align:center;">
      Active User: <b>${localUsername}</b> | Rank: <span style="color:#f1c40f;">${userRank}</span>
    </div>

    <!-- TAB BUTTONS -->
    <div style="display:flex; gap:10px; margin-bottom:15px;">
      <button id="tabControls" style="flex:1; padding:8px; background:#0984e3; color:white; border:none; border-radius:4px; cursor:pointer; font-weight:bold;">Portal Controls</button>
      <button id="tabChat" style="flex:1; padding:8px; background:#636e72; color:white; border:none; border-radius:4px; cursor:pointer; font-weight:bold;">Staff Chat (${staffChatMessages.length})</button>
      <button id="tabReports" style="flex:1; padding:8px; background:#636e72; color:white; border:none; border-radius:4px; cursor:pointer; font-weight:bold;">Reports (${submittedReports.length})</button>
    </div>

    <!-- CONTROLS SECTION -->
    <div id="sectionControls">
      <h3 style="font-size:16px; border-bottom:1px solid #636e72; padding-bottom:5px; margin-top:0;">Global Server Controls</h3>
      
      ${isDevOrAdmin ? `
      <div style="margin-bottom:12px; display:flex; justify-content:space-between; align-items:center; background:#1e272e; padding:10px; border-radius:6px;">
        <span><strong>Shut Down Active Servers:</strong></span>
        <button id="btnShutdownServer" style="background:#e74c3c; color:white; border:none; padding:8px 14px; border-radius:6px; font-weight:bold; cursor:pointer;">⚡ SHUT DOWN ALL</button>
      </div>
      ` : ''}

      <div style="margin-bottom:12px; display:flex; justify-content:space-between; align-items:center; background:#1e272e; padding:10px; border-radius:6px;">
        <span><strong>Global EMP Jammer Switch:</strong></span>
        <label style="position:relative; display:inline-block; width:44px; height:24px;">
          <input type="checkbox" id="toggleEmpSwitch" ${manualEmpLock ? 'checked' : ''} style="opacity:0; width:0; height:0;">
          <span id="sliderEmp" style="position:absolute; cursor:pointer; top:0; left:0; right:0; bottom:0; background-color:${manualEmpLock ? '#00cec9' : '#636e72'}; transition:.4s; border-radius:24px;"></span>
        </label>
      </div>

      <h3 style="font-size:16px; border-bottom:1px solid #636e72; padding-bottom:5px; margin-top:15px;">Dev Features</h3>
      ${isDev ? `
      <div style="margin-bottom:12px; display:flex; justify-content:space-between; align-items:center; background:#1e272e; padding:10px; border-radius:6px;">
        <span><strong>Dev Sandbox (View Bot Roles):</strong></span>
        <label style="position:relative; display:inline-block; width:44px; height:24px;">
          <input type="checkbox" id="toggleBotDisplaySwitch" ${isDevModeActive ? 'checked' : ''} style="opacity:0; width:0; height:0;">
          <span id="sliderBot" style="position:absolute; cursor:pointer; top:0; left:0; right:0; bottom:0; background-color:${isDevModeActive ? '#00cec9' : '#636e72'}; transition:.4s; border-radius:24px;"></span>
        </label>
      </div>
      <div style="margin-top:10px;">
        <button id="btnOpenDevTester" style="background:#00cec9; color:#2d3436; border:none; padding:10px; width:100%; border-radius:6px; cursor:pointer; font-weight:bold; font-size:14px;">🧪 Launch Dev Role Tester</button>
      </div>
      ` : `
      <div style="background:#1e272e; padding:10px; border-radius:6px; color:#b2bec3; font-size:13px; text-align:center;">
        🔒 Dev Sandbox is restricted to <b>Dev</b> rank only.
      </div>
      `}
    </div>

    <!-- CHAT SECTION -->
    <div id="sectionChat" style="display:none;">
      <div id="chatHistoryBox" style="background:#1e272e; height:180px; overflow-y:auto; padding:8px; border-radius:6px; font-size:13px; margin-bottom:10px;">
        ${staffChatMessages.length === 0 ? '<div style="color:#b2bec3;">No messages yet.</div>' : staffChatMessages.map(m => `<div><b>[${m.sender}]:</b> ${m.text}</div>`).join('')}
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
        ${submittedReports.length === 0 ? '<div style="color:#b2bec3;">No submitted reports.</div>' : submittedReports.map(r => `<div style="margin-bottom:8px; border-bottom:1px solid #636e72; padding-bottom:4px;"><b>Suspect:</b> ${r.suspect}<br><b>Reporter:</b> ${r.reporter}<br><b>Reason:</b> ${r.reason} (${r.time})</div>`).join('')}
      </div>
    </div>
  `;

  panel.innerHTML = html;
  container.appendChild(panel);
  document.body.appendChild(container);

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
      if (executionTimer) clearInterval(executionTimer);
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
      setPersistentAnnouncement("Dev Sandbox Bot Display: " + (isDevModeActive ? "VISIBLE" : "HIDDEN"));
    };
  }

  let btnDevTester = document.getElementById("btnOpenDevTester");
  if (btnDevTester) {
    btnDevTester.onclick = () => {
      openDevRoleTesterPanel();
    };
  }

  document.getElementById("btnSendChatMsg").onclick = () => {
    let inp = document.getElementById("chatInputText");
    let msg = inp.value.trim();
    if (msg !== "") {
      let chatObj = { sender: localUsername + " (" + userRank + ")", text: msg };
      staffChatMessages.push(chatObj);
      saveStaffChat();
      inp.value = "";
      updateStaffChatDOM();

      if (isMultiplayer) {
        broadcastData({ type: "STAFF_CHAT", message: chatObj });
      }
    }
  };

  document.getElementById("btnReportNewPlayer").onclick = () => {
    openModal("Enter the username of the player you want to report:", (targetUser) => {
      let suspect = targetUser.trim();
      if (suspect !== "") {
        openModal("Enter reason for reporting " + suspect + ":", (reasonVal) => {
          let reason = reasonVal.trim();
          if (reason !== "") {
            let reportObj = { reporter: localUsername, suspect: suspect, reason: reason, time: new Date().toLocaleTimeString() };
            submittedReports.push(reportObj);
            saveStaffReports();
            setPersistentAnnouncement("Report successfully filed against " + suspect + "!");
            updateStaffReportsDOM();

            if (isMultiplayer) {
              broadcastData({ type: "STAFF_REPORT", report: reportObj });
            }

            container.remove();
          }
        });
      }
    });
  };
}
