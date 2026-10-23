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
