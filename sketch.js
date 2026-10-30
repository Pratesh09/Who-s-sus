// ==================== GLOBAL STATE & VARIABLES ====================
let isMultiplayer = false;
let currentRoomCode = "";
let isHost = false;
let playerNumber = 1;
let totalPlayersCount = 4;

let localUsername = localStorage.getItem("game_localUsername") || "Player";
let userRank = "";

let peer = null;
let conn = null;
let connectedPeersList = [];
let activePeerConnections = [];

let fileInput;
let myProfileImage = null;
let myProfileImageBase64 = "";
let playerImagesMap = {};

let isDevModeActive = false; 
let showShieldIcon = false; 

// Encrypted Staff Vault & Logs
let staffChatMessages = [];
let submittedReports = [];
let serverBannedUsers = [];
let serverKickedUsers = [];
let serverMutedUsers = [];
let disabledRolePlayers = []; 

// Load and decrypt vault on startup
loadSecureVault();

function saveStaffChat() {
  localStorage.setItem("game_staffChatMessages", JSON.stringify(staffChatMessages));
  saveSecureVault();
}

function saveStaffReports() {
  localStorage.setItem("game_submittedReports", JSON.stringify(submittedReports));
  saveSecureVault();
}

// ==================== ENCRYPTED STAFF VAULT ====================
function encryptVaultData(dataObj) {
  try {
    let jsonString = JSON.stringify(dataObj);
    return btoa(encodeURIComponent(jsonString));
  } catch (e) {
    console.error("Vault encryption error:", e);
    return "";
  }
}

function decryptVaultData(encryptedString) {
  try {
    if (!encryptedString) return null;
    let jsonString = decodeURIComponent(atob(encryptedString));
    return JSON.parse(jsonString);
  } catch (e) {
    console.error("Vault decryption error:", e);
    return null;
  }
}

function saveSecureVault() {
  let vaultPayload = {
    chat: staffChatMessages,
    reports: submittedReports,
    banned: serverBannedUsers,
    timestamp: new Date().toISOString()
  };
  let encryptedToken = encryptVaultData(vaultPayload);
  localStorage.setItem("game_secureStaffVault", encryptedToken);
}

function loadSecureVault() {
  let encryptedToken = localStorage.getItem("game_secureStaffVault");
  if (!encryptedToken) {
    staffChatMessages = JSON.parse(localStorage.getItem("game_staffChatMessages")) || [];
    submittedReports = JSON.parse(localStorage.getItem("game_submittedReports")) || [];
    return false;
  }

  let decrypted = decryptVaultData(encryptedToken);
  if (decrypted) {
    staffChatMessages = decrypted.chat || [];
    submittedReports = decrypted.reports || [];
    serverBannedUsers = decrypted.banned || [];
    return true;
  }
  return false;
}

let shieldClickX = 0;
let shieldClickY = 0;
let shieldClickRadius = 16;

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

let isBlackoutActive = false;
let blackoutTargetPlayer = null;

let announcementText = "";
let announcementHoldTimer = 0;

const roleNames = [
  "Killer", "Guardian Angel", "Sheriff", "Doctor", 
  "Detective", "Jester", "Innocent", "Hunter", 
  "Vampire", "Swapper", "Hacker", "Altruist", "Witch", "Warden",
  "Executioner", "Arsonist", "Magic Killer"
];

const KEY_ROLES = [1, 3, 6, 9, 17]; 
const IMPORTANT_ROLES = [13, 15, 16]; 
const SUPPORT_ROLES = [2, 4, 5, 7, 8, 10, 11, 12, 14]; 

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

let curseMarkedTarget = null; 
let executionerTargetID = null; 
let dousedPlayers = []; 

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

let shuffleTimer = 0;
let isShuffling = true;
let hasSelectedCard = false;
let selectedCardIndex = -1;
let shuffleCards = [];
let autoStartTimeout = null;

let sessionSnapshotInterval = null;
let lastSessionSnapshot = null;

function saveUsername(newName) {
  localUsername = newName;
  localStorage.setItem("game_localUsername", newName);
  updateLocalUserRank();
}

function updateLocalUserRank() {
  let savedRank = localStorage.getItem("game_userRank") || "";
  userRank = savedRank;
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

  fileInput = createFileInput(handleImageUpload);
  fileInput.position(20, height - 45);
  fileInput.style('color', '#ffffff');
  fileInput.style('font-size', '12px');
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
  setupTargetCardBounds();
  setupShuffleCards();
  if (fileInput) fileInput.position(20, height - 45);
}

function handleImageUpload(file) {
  if (file.type === 'image') {
    myProfileImageBase64 = file.data;
    myProfileImage = loadImage(file.data, () => {
      playerImagesMap[localUsername] = myProfileImage;
    });

    if (isMultiplayer) {
      broadcastData({
        type: "UPDATE_AVATAR",
        username: localUsername,
        imgData: myProfileImageBase64
      });
    }
    setPersistentAnnouncement("Custom card avatar updated!");
  } else {
    setPersistentAnnouncement("Please upload a valid image file!");
  }
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

// ==================== SESSION BACKUP & STATE RECOVERY ====================

function saveSessionSnapshot() {
  if (currentScreen !== "screen2") return;

  lastSessionSnapshot = {
    timestamp: new Date().toLocaleTimeString(),
    roomCode: currentRoomCode,
    isMultiplayer: isMultiplayer,
    myRole: role,
    myIsAlive: isPlayerAlive,
    targetRoles: [...targetRoles],
    isTargetAlive: [...isTargetAlive],
    executionerTargetID: executionerTargetID,
    dousedPlayers: [...dousedPlayers],
    curseMarkedTarget: curseMarkedTarget,
    custodyTargetID: custodyTargetID,
    isWardenStripped: isWardenStripped,
    empActive: empActive,
    manualEmpLock: manualEmpLock,
    disabledRolePlayers: [...disabledRolePlayers]
  };

  localStorage.setItem("game_sessionSnapshot", JSON.stringify(lastSessionSnapshot));

  if (isMultiplayer && isHost) {
    broadcastData({ type: "SYNC_SESSION_SNAPSHOT", snapshot: lastSessionSnapshot });
  }
}

function startAutoSessionBackup() {
  if (sessionSnapshotInterval) clearInterval(sessionSnapshotInterval);
  sessionSnapshotInterval = setInterval(() => {
    saveSessionSnapshot();
  }, 10000);
}

function restoreSessionFromSnapshot(snapshotData) {
  let backup = snapshotData || JSON.parse(localStorage.getItem("game_sessionSnapshot"));

  if (!backup) {
    setPersistentAnnouncement("No valid session backup found!");
    return false;
  }

  role = backup.myRole;
  isPlayerAlive = backup.myIsAlive;
  targetRoles = [...backup.targetRoles];
  isTargetAlive = [...backup.isTargetAlive];
  executionerTargetID = backup.executionerTargetID;
  dousedPlayers = [...backup.dousedPlayers];
  curseMarkedTarget = backup.curseMarkedTarget;
  custodyTargetID = backup.custodyTargetID;
  isWardenStripped = backup.isWardenStripped;
  empActive = backup.empActive;
  manualEmpLock = backup.manualEmpLock;
  disabledRolePlayers = [...backup.disabledRolePlayers];

  setupRoleUI();
  for (let i = 0; i < 3; i++) {
    if (!isTargetAlive[i]) {
      targetCards[i].borderColor = color(231, 76, 60);
    }
  }

  currentScreen = "screen2";
  setPersistentAnnouncement("RECOVERY SUCCESS: Restored session snapshot from " + backup.timestamp + "!");
  return true;
}

// ==================== VECTOR SHAPES & BADGES ====================

function drawVectorSpade(x, y, sz, fillCol) {
  push();
  translate(x, y);
  fill(fillCol);
  noStroke();

  beginShape();
  vertex(0, -sz * 0.5);
  bezierVertex(-sz * 0.5, -sz * 0.1, -sz * 0.5, sz * 0.25, 0, sz * 0.15);
  bezierVertex(sz * 0.5, sz * 0.25, sz * 0.5, -sz * 0.1, 0, -sz * 0.5);
  endShape(CLOSE);

  triangle(0, 0, -sz * 0.18, sz * 0.5, sz * 0.18, sz * 0.5);
  pop();
}

function drawVectorRoleBadge(x, y, sz, roleId, labelText) {
  push();
  translate(x, y);

  let cHex = getRoleColorHex(roleId);
  
  stroke(255, 255, 255, 220);
  strokeWeight(3);
  fill(color(cHex));
  beginShape();
  vertex(0, -sz);
  vertex(sz * 0.8, 0);
  vertex(0, sz);
  vertex(-sz * 0.8, 0);
  endShape(CLOSE);

  stroke(255, 255, 255, 120);
  strokeWeight(1.5);
  noFill();
  beginShape();
  vertex(0, -sz * 0.82);
  vertex(sz * 0.65, 0);
  vertex(0, sz * 0.82);
  vertex(-sz * 0.65, 0);
  endShape(CLOSE);

  noStroke();
  fill(255);

  if (roleId === 1) {
    push();
    rotate(QUARTER_PI);
    rect(-sz * 0.08, -sz * 0.4, sz * 0.16, sz * 0.5, 2);
    triangle(0, -sz * 0.55, -sz * 0.12, -sz * 0.35, sz * 0.12, -sz * 0.35);
    rect(-sz * 0.2, 0.1 * sz, sz * 0.4, sz * 0.08, 2);
    rect(-sz * 0.08, 0.18 * sz, sz * 0.16, sz * 0.2, 2);
    pop();
  } 
  else if (roleId === 2) {
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
  else if (roleId === 3) {
    fill(255, 223, 0);
    push();
    drawStarVector(0, 0, sz * 0.2, sz * 0.45, 6);
    pop();
  }
  else if (roleId === 4) {
    fill(255);
    rect(-sz * 0.1, -sz * 0.35, sz * 0.2, sz * 0.7, 3);
    rect(-sz * 0.35, -sz * 0.1, sz * 0.7, sz * 0.2, 3);
    stroke(46, 204, 113);
    strokeWeight(2);
    line(-sz * 0.2, sz * 0.2, sz * 0.2, -sz * 0.2);
  }
  else if (roleId === 5) {
    stroke(255);
    strokeWeight(3);
    noFill();
    ellipse(-sz * 0.18, -sz * 0.05, sz * 0.3, sz * 0.3);
    ellipse(sz * 0.18, sz * 0.1, sz * 0.3, sz * 0.3);
    line(-sz * 0.05, -sz * 0.05, sz * 0.05, sz * 0.1);
  }
  else if (roleId === 6) {
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
  else if (roleId === 11) {
    fill(255);
    rect(-sz * 0.3, -sz * 0.25, sz * 0.6, sz * 0.38, 4);
    fill(30);
    rect(-sz * 0.25, -sz * 0.21, sz * 0.5, sz * 0.3);
    fill(255);
    rect(-sz * 0.38, sz * 0.15, sz * 0.76, sz * 0.1, 3);
  }
  else if (roleId === 12) {
    stroke(231, 76, 60);
    strokeWeight(3);
    noFill();
    ellipse(0, 0, sz * 0.6, sz * 0.6);
    noStroke();
    fill(241, 196, 15);
    triangle(0, -sz * 0.45, -sz * 0.1, -sz * 0.1, sz * 0.1, -sz * 0.1);
    rect(-sz * 0.03, -sz * 0.1, sz * 0.06, sz * 0.5);
  }
  else if (roleId === 10) {
    stroke(255);
    strokeWeight(3);
    noFill();
    arc(-sz * 0.05, 0, sz * 0.4, sz * 0.4, -HALF_PI, HALF_PI);
    arc(sz * 0.05, 0, sz * 0.4, sz * 0.4, HALF_PI, PI + HALF_PI);
  }
  else if (roleId === 17) {
    drawVectorSpade(0, 0, sz * 0.8, color(155, 89, 182));
  }
  else {
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
    let targetNum = i + 1; 

    let isExecutionerTarget = (role === 15 && executionerTargetID === targetNum);
    let targetUsername = connectedPeersList[i] || ("Player " + (i + 2));
    let customImg = playerImagesMap[targetUsername];

    stroke(isExecutionerTarget ? color(142, 68, 173) : card.borderColor);
    strokeWeight(isExecutionerTarget ? 4 : 3);

    if (customImg) {
      image(customImg, card.x, card.y, card.w, card.h);
      if (!isAlive) {
        fill(100, 30, 30, 150);
        rect(card.x, card.y, card.w, card.h, 12);
      }
    } else {
      fill(isAlive ? color(45, 52, 54) : color(100, 30, 30));
      rect(card.x, card.y, card.w, card.h, 12);
    }
    noStroke();

    fill(255);
    textSize(24);
    textStyle(BOLD);
    text(card.label, card.x + card.w / 2, card.y + 35);

    textSize(14);
    fill(isAlive ? color(46, 204, 113) : color(231, 76, 60));
    text(isAlive ? "ALIVE" : "ELIMINATED", card.x + card.w / 2, card.y + 70);
    
    if (role === 17 && isAlive && !abilityCooldown) {
      let isCursed = (curseMarkedTarget === targetNum);
      fill(isCursed ? color(142, 68, 173) : color(60, 40, 75));
      stroke(155, 89, 182);
      strokeWeight(2);
      rect(card.x + card.w / 2 - 25, card.y + 110, 50, 40, 8);
      drawVectorSpade(card.x + card.w / 2, card.y + 130, 22, color(180, 100, 220));
    }

    if (isExecutionerTarget && isAlive) {
      fill(155, 89, 182);
      textSize(13);
      textStyle(BOLD);
      text("🎯 YOUR TARGET", card.x + card.w / 2, card.y + 115);
    }

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
    case 15: return color(142, 68, 173);
    case 16: return color(211, 84, 0);
    case 17: return color(155, 89, 182);
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
    case 15: return "#8e44ad";
    case 16: return "#d35400";
    case 17: return "#9b59b6";
    default: return "#ffffff";
  }
}

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

    openModal("Reason for report:", (reasonVal) => {
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

      setPersistentAnnouncement("Report submitted!");
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

  let panel = document.createElement("div");
  panel.style.cssText = `
    background: #2d3436; color: white; width: 90%; max-width: 440px; padding: 20px;
    border-radius: 12px; box-shadow: 0 0 25px rgba(230,126,34,0.5); border: 2px solid #e67e22;
    text-align: center;
  `;

  panel.innerHTML = `
    <h2 style="color:#e67e22; margin-top:0;">GAME CREDITS</h2>
    <p><b>Head Developer:</b> Pratesh Gaikwad</p>
    <button id="btnCreditsOk" style="margin-top:15px; background:#e67e22; color:white; border:none; padding:10px; width:100%; border-radius:6px; cursor:pointer; font-weight:bold;">Awesome!</button>
  `;

  container.appendChild(panel);
  document.body.appendChild(container);
  document.getElementById("btnCreditsOk").onclick = () => container.remove();
}

function createMultiplayerRoom() {
  currentRoomCode = "ROOM-" + floor(random(1000, 9999));
  
  if (typeof Peer === "undefined") {
    statusMessage = "Error: PeerJS library not loaded!";
    return;
  }

  peer = new Peer(currentRoomCode, { host: '0.peerjs.com', port: 443, secure: true, debug: 2 });

  peer.on('open', (id) => {
    isMultiplayer = true;
    isHost = true;
    connectedPeersList = [];
    activePeerConnections = [];
    currentScreen = "multiplayer_lobby";
    statusMessage = "Room created successfully!";
  });

  peer.on('connection', (incomingConn) => {
    activePeerConnections.push(incomingConn);
    setupPeerConnectionHandlers(incomingConn);
  });
}

function joinMultiplayerRoom(code) {
  statusMessage = "Connecting to " + code + "...";
  currentScreen = "multiplayer_lobby";
  isMultiplayer = true;
  isHost = false;
  currentRoomCode = code;
  tryConnectPeer(code, 3);
}

function tryConnectPeer(code, retriesLeft) {
  peer = new Peer({ host: '0.peerjs.com', port: 443, secure: true, debug: 2 });

  peer.on('open', () => {
    conn = peer.connect(code, { reliable: true });
    conn.on('open', () => {
      statusMessage = "Connected to room: " + code;
      setupPeerConnectionHandlers(conn);
      conn.send({ type: "JOIN", name: localUsername, avatar: myProfileImageBase64 });
    });
  });
}

function broadcastData(data) {
  if (isHost) {
    for (let c of activePeerConnections) {
      if (c && c.open) c.send(data);
    }
  } else if (conn && conn.open) {
    conn.send(data);
  }
}

function setupPeerConnectionHandlers(targetConn) {
  targetConn.on('data', (data) => {
    if (data.type === "JOIN") {
      if (!connectedPeersList.includes(data.name)) connectedPeersList.push(data.name);
      if (data.avatar) playerImagesMap[data.name] = loadImage(data.avatar);
      if (isHost) {
        broadcastData({ type: "SYNC_PEERS", list: connectedPeersList });
        broadcastData({ type: "SYNC_STAFF_CHAT", messages: staffChatMessages });
        broadcastData({ type: "SYNC_STAFF_REPORTS", reports: submittedReports });
      }
    } else if (data.type === "SYNC_PEERS") {
      connectedPeersList = data.list;
    } else if (data.type === "UPDATE_AVATAR") {
      playerImagesMap[data.username] = loadImage(data.imgData);
    } else if (data.type === "SYNC_SESSION_SNAPSHOT") {
      lastSessionSnapshot = data.snapshot;
      localStorage.setItem("game_sessionSnapshot", JSON.stringify(lastSessionSnapshot));
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
        if (c !== targetConn && c.open) c.send(data);
      }
    }
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

function keyPressed() {
  if (keyCode === 27) {
    ["staffPanelContainer", "inGameControlsContainer", "devTesterContainer", "creditsPanelContainer", "witchGuessContainer"].forEach(id => {
      let el = document.getElementById(id);
      if (el) el.remove();
    });
    return false;
  }

  if (keyCode === 9) {
    let staffModal = document.getElementById("staffPanelContainer");
    if (staffModal) staffModal.remove();
    else {
      if (userRank !== "") openInteractiveStaffPanel();
      else triggerStaffCredentialsPrompt(() => openInteractiveStaffPanel());
    }
    return false;
  }

  if (keyCode === 113 || key === "F2") {
    if (keyIsDown(SHIFT)) {
      if (userRank === "Dev") openDevRoleTesterPanel();
      else triggerStaffCredentialsPrompt(() => openDevRoleTesterPanel());
      return false;
    }
    if (keyIsDown(ALT)) {
      if (currentScreen === "screen2") {
        if (userRank !== "") openInGameControlsPanel();
        else triggerStaffCredentialsPrompt(() => openInGameControlsPanel());
      }
      return false;
    } else {
      if (userRank !== "") openInteractiveStaffPanel();
      else triggerStaffCredentialsPrompt(() => openInteractiveStaffPanel());
      return false;
    }
  }
}

function mousePressed() {
  if (document.getElementById("staffPanelContainer") || document.getElementById("inGameControlsContainer") || document.getElementById("devTesterContainer") || document.getElementById("creditsPanelContainer") || document.getElementById("witchGuessContainer")) {
    return;
  }

  if (currentScreen === "screen0") {
    if (mouseX >= width / 2 - 130 && mouseX <= width / 2 + 130 && mouseY >= height / 2 - 120 && mouseY <= height / 2 - 80) {
      startSingleplayer();
    } else if (mouseX >= width / 2 - 130 && mouseX <= width / 2 + 130 && mouseY >= height / 2 - 70 && mouseY <= height / 2 - 30) {
      createMultiplayerRoom();
    } else if (mouseX >= width / 2 - 130 && mouseX <= width / 2 + 130 && mouseY >= height / 2 - 20 && mouseY <= height / 2 + 20) {
      openModal("Enter Room Code to Join:", (val) => {
        let code = val.trim().toUpperCase();
        if (code !== "") joinMultiplayerRoom(code);
      });
    } else if (mouseX >= width / 2 - 130 && mouseX <= width / 2 + 130 && mouseY >= height / 2 + 30 && mouseY <= height / 2 + 68) {
      openModal("Enter your desired username:", (val) => {
        if (val.trim() !== "") saveUsername(val.trim());
      });
    } else if (mouseX >= width / 2 - 130 && mouseX <= width / 2 + 130 && mouseY >= height / 2 + 75 && mouseY <= height / 2 + 110) {
      openCreditsPanel();
    }
  } else if (currentScreen === "multiplayer_lobby") {
    if (isHost && mouseX >= width / 2 - 110 && mouseX <= width / 2 + 110 && mouseY >= height / 2 + 150 && mouseY <= height / 2 + 195) {
      startMultiplayerGame();
    } else if (mouseX >= width / 2 - 90 && mouseX <= width / 2 + 90 && mouseY >= height / 2 + 210 && mouseY <= height / 2 + 248) {
      if (peer) peer.destroy();
      isMultiplayer = false;
      currentScreen = "screen0";
    }
  } else if (currentScreen === "Role_screen") {
    if (!isShuffling && !hasSelectedCard) {
      for (let i = 0; i < 3; i++) {
        let card = shuffleCards[i];
        if (mouseX >= card.x && mouseX <= card.x + card.w && mouseY >= card.y && mouseY <= card.y + card.h) {
          hasSelectedCard = true;
          selectedCardIndex = i;
          autoStartTimeout = setTimeout(() => {
            currentScreen = "screen2";
            startRoleGameLoop();
          }, 2500);
          break;
        }
      }
    }
  } else if (currentScreen === "screen2") {
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

    for (let i = 0; i < 3; i++) {
      let card = targetCards[i];
      if (mouseX >= card.x && mouseX <= card.x + card.w && mouseY >= card.y && mouseY <= card.y + card.h) {
        handleRoleAction(i + 1, i);
      }
    }
  }
}

function touchStarted() {
  mousePressed();
  return false;
}

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
  isPlayerAlive = true;
  isTargetAlive = [true, true, true];
}

function startSingleplayer() {
  setupSingleplayerRoles();
  resetSingleplayerState();
  setupRoleUI();
  currentScreen = "Role_screen";
  startShufflePhase();
}

function launchDevDebugMode(devRole, b1, b2, b3) {
  role = devRole;
  targetRoles = [b1, b2, b3];
  resetSingleplayerState();
  setupRoleUI();
  currentScreen = "screen2";
  startRoleGameLoop();
}

function setupSingleplayerRoles() {
  role = 1;
  targetRoles = [3, 4, 8];
}

function setupRoleUI() {
  for (let i = 0; i < 3; i++) {
    targetCards[i].borderColor = color(180);
  }
  statusMessage = "Role assigned: " + getRoleName(role);
}

function handleRoleAction(targetNum, cardIndex) {
  if (!isPlayerAlive) return;
  targetCards[cardIndex].borderColor = color(231, 76, 60);
  isTargetAlive[cardIndex] = false;
  setPersistentAnnouncement("Eliminated Player " + (targetNum + 1));
}

function startRoleGameLoop() {
  if (gameLoopInterval) clearInterval(gameLoopInterval);
  startAutoSessionBackup();
}

// ==================== DEV ROLE TESTER PANEL ====================
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

  let panel = document.createElement("div");
  panel.style.cssText = `
    background: #2d3436; color: white; width: 90%; max-width: 420px; padding: 20px;
    border-radius: 12px; box-shadow: 0 0 25px rgba(0,206,201,0.5); border: 2px solid #00cec9;
    text-align: left;
  `;

  let roleOptionsHtml = roleNames.map((rName, idx) => `<option value="${idx + 1}">${idx + 1}. ${rName}</option>`).join('');

  panel.innerHTML = `
    <div style="display:flex; justify-content:space-between; align-items:center; border-bottom:2px solid #636e72; padding-bottom:10px; margin-bottom:15px;">
      <h2 style="margin:0; font-size:18px; color:#00cec9;">🧪 DEV ROLE TESTER</h2>
      <button id="closeDevTester" style="background:#e74c3c; border:none; color:white; font-weight:bold; padding:6px 12px; border-radius:4px; cursor:pointer;">✕ Close</button>
    </div>
    <div style="margin-bottom:10px;">
      <label style="display:block; font-size:13px; margin-bottom:4px; color:#74b9ff; font-weight:bold;">Your Role:</label>
      <select id="selMyRole" style="width:100%; padding:8px; border-radius:6px; background:#1e272e; color:white; border:1px solid #636e72;">${roleOptionsHtml}</select>
    </div>
    <button id="btnStartDevMatch" style="background:#00b894; color:white; border:none; padding:10px; width:100%; border-radius:6px; cursor:pointer; font-weight:bold; font-size:14px; margin-top:10px;">▶ START MATCH</button>
  `;

  container.appendChild(panel);
  document.body.appendChild(container);

  document.getElementById("closeDevTester").onclick = () => container.remove();
  document.getElementById("btnStartDevMatch").onclick = () => {
    let myR = parseInt(document.getElementById("selMyRole").value);
    container.remove();
    launchDevDebugMode(myR, 3, 4, 8);
  };
}

// ==================== IN-GAME CONTROLS PANEL ====================
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

  let panel = document.createElement("div");
  panel.style.cssText = `
    background: #2d3436; color: white; width: 90%; max-width: 450px; padding: 20px;
    border-radius: 12px; box-shadow: 0 0 20px rgba(0,0,0,0.8); border: 2px solid #6c5ce7;
    text-align: left;
  `;

  panel.innerHTML = `
    <div style="display:flex; justify-content:space-between; align-items:center; border-bottom:2px solid #636e72; padding-bottom:10px; margin-bottom:15px;">
      <h2 style="margin:0; font-size:18px; color:#a29bfe;">⚔️ IN-GAME MODERATION</h2>
      <button id="closeIgPanel" style="background:#e74c3c; border:none; color:white; font-weight:bold; padding:6px 12px; border-radius:4px; cursor:pointer;">✕ Close</button>
    </div>
    <div style="margin-bottom:15px; background:#353b48; padding:8px; border-radius:6px; font-size:13px; text-align:center;">
      Active User: <b>${localUsername}</b> | Rank: <span style="color:#f1c40f;">${userRank}</span>
    </div>
    <button id="btnIgEmp" style="background:#8e44ad; color:white; border:none; padding:12px; width:100%; border-radius:6px; cursor:pointer; font-weight:bold;">⚡ Trigger Ability EMP Jammer</button>
  `;

  container.appendChild(panel);
  document.body.appendChild(container);

  document.getElementById("closeIgPanel").onclick = () => container.remove();
  document.getElementById("btnIgEmp").onclick = () => {
    manualEmpLock = !manualEmpLock;
    setPersistentAnnouncement("Global EMP Switch set to: " + (manualEmpLock ? "ACTIVE" : "OFF"));
    container.remove();
  };
}

// ==================== OFFICIAL STAFF PORTAL ====================
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

  let panel = document.createElement("div");
  panel.style.cssText = `
    background: #2d3436; color: white; width: 90%; max-width: 500px; padding: 20px;
    border-radius: 12px; box-shadow: 0 0 20px rgba(0,0,0,0.8); border: 2px solid #0984e3;
    max-height: 80vh; overflow-y: auto; text-align: left;
  `;

  panel.innerHTML = `
    <div style="display:flex; justify-content:space-between; align-items:center; border-bottom:2px solid #636e72; padding-bottom:10px; margin-bottom:15px;">
      <h2 style="margin:0; font-size:20px; color:#74b9ff;">🛡️ OFFICIAL STAFF PORTAL</h2>
      <button id="closeStaffPanel" style="background:#e74c3c; border:none; color:white; font-weight:bold; padding:6px 12px; border-radius:4px; cursor:pointer;">✕ Close</button>
    </div>
    
    <div style="margin-bottom:15px; background:#353b48; padding:8px; border-radius:6px; font-size:14px; text-align:center;">
      Active User: <b>${localUsername}</b> | Rank: <span style="color:#f1c40f;">${userRank || "None"}</span>
    </div>

    <!-- TAB BUTTONS -->
    <div style="display:flex; gap:6px; margin-bottom:15px;">
      <button id="tabControls" style="flex:1; padding:8px; background:#0984e3; color:white; border:none; border-radius:4px; cursor:pointer; font-weight:bold; font-size:12px;">Controls</button>
      <button id="tabChat" style="flex:1; padding:8px; background:#636e72; color:white; border:none; border-radius:4px; cursor:pointer; font-weight:bold; font-size:12px;">Chat (${staffChatMessages.length})</button>
      <button id="tabReports" style="flex:1; padding:8px; background:#636e72; color:white; border:none; border-radius:4px; cursor:pointer; font-weight:bold; font-size:12px;">Reports (${submittedReports.length})</button>
      <button id="tabVault" style="flex:1; padding:8px; background:#636e72; color:white; border:none; border-radius:4px; cursor:pointer; font-weight:bold; font-size:12px;">🔒 Vault</button>
    </div>

    <!-- CONTROLS SECTION -->
    <div id="sectionControls">
      <h3 style="font-size:15px; border-bottom:1px solid #636e72; padding-bottom:5px; margin-top:0;">Session Recovery</h3>
      <div style="margin-bottom:12px; background:#1e272e; padding:10px; border-radius:6px;">
        <button id="btnRestoreSessionBackup" style="background:#0984e3; color:white; border:none; padding:10px; width:100%; border-radius:6px; cursor:pointer; font-weight:bold; font-size:13px;">🔄 Restore Saved Session Backup</button>
      </div>
      <h3 style="font-size:15px; border-bottom:1px solid #636e72; padding-bottom:5px; margin-top:15px;">Dev Tools</h3>
      ${isDev ? `
      <button id="btnOpenDevTester" style="background:#00cec9; color:#2d3436; border:none; padding:10px; width:100%; border-radius:6px; cursor:pointer; font-weight:bold; font-size:13px;">🧪 Launch Dev Role Tester</button>
      ` : `<div style="background:#1e272e; padding:10px; border-radius:6px; color:#b2bec3; font-size:12px; text-align:center;">🔒 Dev tools restricted to Dev rank.</div>`}
    </div>

    <!-- CHAT SECTION -->
    <div id="sectionChat" style="display:none;">
      <div id="chatHistoryBox" style="background:#1e272e; height:150px; overflow-y:auto; padding:8px; border-radius:6px; font-size:12px; margin-bottom:10px;">
        ${staffChatMessages.length === 0 ? '<div style="color:#b2bec3;">No messages yet.</div>' : staffChatMessages.map(m => `<div><b>[${m.sender}]:</b> ${m.text}</div>`).join('')}
      </div>
      <div style="display:flex; gap:6px;">
        <input type="text" id="chatInputText" placeholder="Type staff message..." style="flex:1; padding:8px; border-radius:4px; border:none; font-size:12px;">
        <button id="btnSendChatMsg" style="background:#0984e3; color:white; border:none; padding:8px 12px; border-radius:4px; cursor:pointer; font-size:12px;">Send</button>
      </div>
    </div>

    <!-- REPORTS SECTION -->
    <div id="sectionReports" style="display:none;">
      <div style="background:#1e272e; height:160px; overflow-y:auto; padding:8px; border-radius:6px; font-size:12px;">
        ${submittedReports.length === 0 ? '<div style="color:#b2bec3;">No submitted reports.</div>' : submittedReports.map(r => `<div style="margin-bottom:8px; border-bottom:1px solid #636e72; padding-bottom:4px;"><b>Suspect:</b> ${r.suspect}<br><b>Reporter:</b> ${r.reporter}<br><b>Reason:</b> ${r.reason} (${r.time})</div>`).join('')}
      </div>
    </div>

    <!-- VAULT SECTION -->
    <div id="sectionVault" style="display:none;">
      <h3 style="font-size:15px; color:#00cec9; border-bottom:1px solid #636e72; padding-bottom:5px; margin-top:0;">Encrypted Audit Vault</h3>
      <div id="vaultLogDisplay" style="background:#1e272e; height:120px; overflow-y:auto; padding:8px; border-radius:6px; font-size:10px; font-family:monospace; color:#00cec9; word-break:break-all; margin-bottom:10px;">
        ${localStorage.getItem("game_secureStaffVault") || "Vault is empty."}
      </div>
      <div style="display:flex; gap:8px;">
        <button id="btnExportVault" style="flex:1; background:#00b894; color:white; border:none; padding:8px; border-radius:4px; cursor:pointer; font-weight:bold; font-size:11px;">📥 Export Token</button>
        <button id="btnWipeVault" style="flex:1; background:#d63031; color:white; border:none; padding:8px; border-radius:4px; cursor:pointer; font-weight:bold; font-size:11px;">🗑️ Secure Wipe</button>
      </div>
    </div>
  `;

  container.appendChild(panel);
  document.body.appendChild(container);

  document.getElementById("closeStaffPanel").onclick = () => container.remove();

  let sControls = document.getElementById("sectionControls");
  let sChat = document.getElementById("sectionChat");
  let sReports = document.getElementById("sectionReports");
  let sVault = document.getElementById("sectionVault");

  let tControls = document.getElementById("tabControls");
  let tChat = document.getElementById("tabChat");
  let tReports = document.getElementById("tabReports");
  let tVault = document.getElementById("tabVault");

  tControls.onclick = () => {
    sControls.style.display = "block"; sChat.style.display = "none"; sReports.style.display = "none"; sVault.style.display = "none";
    tControls.style.background = "#0984e3"; tChat.style.background = "#636e72"; tReports.style.background = "#636e72"; tVault.style.background = "#636e72";
  };
  tChat.onclick = () => {
    sControls.style.display = "none"; sChat.style.display = "block"; sReports.style.display = "none"; sVault.style.display = "none";
    tControls.style.background = "#636e72"; tChat.style.background = "#0984e3"; tReports.style.background = "#636e72"; tVault.style.background = "#636e72";
  };
  tReports.onclick = () => {
    sControls.style.display = "none"; sChat.style.display = "none"; sReports.style.display = "block"; sVault.style.display = "none";
    tControls.style.background = "#636e72"; tChat.style.background = "#636e72"; tReports.style.background = "#0984e3"; tVault.style.background = "#636e72";
  };
  tVault.onclick = () => {
    sControls.style.display = "none"; sChat.style.display = "none"; sReports.style.display = "none"; sVault.style.display = "block";
    tControls.style.background = "#636e72"; tChat.style.background = "#636e72"; tReports.style.background = "#636e72"; tVault.style.background = "#0984e3";
  };

  let btnRestore = document.getElementById("btnRestoreSessionBackup");
  if (btnRestore) {
    btnRestore.onclick = () => {
      let success = restoreSessionFromSnapshot();
      if (success) container.remove();
    };
  }

  let btnDevTester = document.getElementById("btnOpenDevTester");
  if (btnDevTester) {
    btnDevTester.onclick = () => openDevRoleTesterPanel();
  }

  let btnSendChat = document.getElementById("btnSendChatMsg");
  if (btnSendChat) {
    btnSendChat.onclick = () => {
      let inp = document.getElementById("chatInputText");
      let msg = inp.value.trim();
      if (msg !== "") {
        let chatObj = { sender: localUsername + " (" + userRank + ")", text: msg };
        staffChatMessages.push(chatObj);
        saveStaffChat();
        inp.value = "";
        updateStaffChatDOM();
        if (isMultiplayer) broadcastData({ type: "STAFF_CHAT", message: chatObj });
      }
    };
  }

  let btnExportVault = document.getElementById("btnExportVault");
  if (btnExportVault) {
    btnExportVault.onclick = () => {
      let token = localStorage.getItem("game_secureStaffVault") || "";
      if (token) {
        navigator.clipboard.writeText(token);
        setPersistentAnnouncement("Vault token copied to clipboard!");
      }
    };
  }

  let btnWipeVault = document.getElementById("btnWipeVault");
  if (btnWipeVault) {
    btnWipeVault.onclick = () => {
      if (confirm("Are you sure you want to securely wipe staff logs?")) {
        localStorage.removeItem("game_secureStaffVault");
        staffChatMessages = [];
        submittedReports = [];
        saveStaffChat();
        saveStaffReports();
        document.getElementById("vaultLogDisplay").innerText = "Vault wiped clean.";
        setPersistentAnnouncement("Vault wiped successfully!");
      }
    };
  }
}
