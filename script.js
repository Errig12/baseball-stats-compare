// script.js – pure frontend version using MLB Stats API directly

// Elements
const searchInput1 = document.getElementById("searchInput1");
const searchButton1 = document.getElementById("searchButton1");
const resultsList1 = document.getElementById("resultsList1");

const searchInput2 = document.getElementById("searchInput2");
const searchButton2 = document.getElementById("searchButton2");
const resultsList2 = document.getElementById("resultsList2");

const statusMessage = document.getElementById("statusMessage");
const statsBody = document.getElementById("statsBody");
const player1Header = document.getElementById("player1Header");
const player2Header = document.getElementById("player2Header");

// MLB Stats API
const MLB_BASE_URL = "https://statsapi.mlb.com/api/v1";
const SPORT_ID = 1; // MLB
const SEASON = "2025";

// State
let player1Stats = null;
let player2Stats = null;
let player1Name = "Player 1";
let player2Name = "Player 2";
let player1ImageUrl = null;
let player2ImageUrl = null;

// Which stats we show & how to format
const STAT_ROWS = [
  { label: "Games", key: "games", type: "int" },
  { label: "AB", key: "atBats", type: "int" },
  { label: "AVG", key: "avg", type: "3dec" },
  { label: "OBP", key: "obp", type: "3dec" },
  { label: "SLG", key: "slg", type: "3dec" },
  { label: "OPS", key: "ops", type: "3dec" },
  { label: "Hits", key: "hits", type: "int" },
  { label: "HR", key: "homeRuns", type: "int" },
  { label: "RBI", key: "rbi", type: "int" },
  { label: "Runs", key: "runs", type: "int" },
  { label: "SB", key: "stolenBases", type: "int" },
];

function formatValue(value, type) {
  if (value === null || value === undefined) return "-";
  const num = Number(value);
  if (Number.isNaN(num)) return value;
  if (type === "3dec") return num.toFixed(3);
  return num.toString();
}

function getHeadshotUrl(mlbId) {
  if (!mlbId) return null;
  return `https://img.mlbstatic.com/mlb-photos/image/upload/w_213,d_people:generic:headshot:silo:current.png,q_auto:best,f_auto/v1/people/${mlbId}/headshot/67/current`;
}

// Generic MLB fetch
async function mlb(pathWithQuery) {
  const url = `${MLB_BASE_URL}${pathWithQuery}`;
  const res = await fetch(url);
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`MLB API error ${res.status}: ${text || res.statusText}`);
  }
  return res.json();
}

// Render comparison table and headers with pictures
function renderComparison() {
  statsBody.innerHTML = "";

  player1Header.innerHTML = "";
  player2Header.innerHTML = "";

  // Header for Player 1
  const h1 = document.createElement("div");
  h1.className = "player-header";

  if (player1ImageUrl) {
    const img1 = document.createElement("img");
    img1.src = player1ImageUrl;
    img1.alt = player1Name;
    img1.className = "player-headshot";
    img1.onerror = () => (img1.style.display = "none");
    h1.appendChild(img1);
  }

  const nameSpan1 = document.createElement("span");
  nameSpan1.textContent = player1Name || "Player 1";
  h1.appendChild(nameSpan1);
  player1Header.appendChild(h1);

  // Header for Player 2
  const h2 = document.createElement("div");
  h2.className = "player-header";

  if (player2ImageUrl) {
    const img2 = document.createElement("img");
    img2.src = player2ImageUrl;
    img2.alt = player2Name;
    img2.className = "player-headshot";
    img2.onerror = () => (img2.style.display = "none");
    h2.appendChild(img2);
  }

  const nameSpan2 = document.createElement("span");
  nameSpan2.textContent = player2Name || "Player 2";
  h2.appendChild(nameSpan2);
  player2Header.appendChild(h2);

  // Stat rows with yellow highlight on better stat
  STAT_ROWS.forEach((row) => {
    const tr = document.createElement("tr");

    const labelCell = document.createElement("td");
    labelCell.textContent = row.label;
    tr.appendChild(labelCell);

    const v1 = player1Stats ? player1Stats[row.key] : null;
    const v2 = player2Stats ? player2Stats[row.key] : null;

    let highlight1 = false;
    let highlight2 = false;

    // Only highlight if both players have valid numeric values
    if (player1Stats && player2Stats && v1 != null && v2 != null) {
      const n1 = Number(v1);
      const n2 = Number(v2);

      if (Number.isFinite(n1) && Number.isFinite(n2) && n1 !== n2) {
        if (n1 > n2) highlight1 = true;
        else highlight2 = true;
      }
    }

    const cell1 = document.createElement("td");
    cell1.textContent =
      v1 === null || v1 === undefined
        ? "-"
        : formatValue(v1, row.type);
    if (highlight1) cell1.classList.add("better");

    const cell2 = document.createElement("td");
    cell2.textContent =
      v2 === null || v2 === undefined
        ? "-"
        : formatValue(v2, row.type);
    if (highlight2) cell2.classList.add("better");

    tr.appendChild(cell1);
    tr.appendChild(cell2);
    statsBody.appendChild(tr);
  });
}

// Search MLB Stats API for players by name
async function searchPlayers(slot) {
  const searchInput = slot === 1 ? searchInput1 : searchInput2;
  const resultsList = slot === 1 ? resultsList1 : resultsList2;

  const query = searchInput.value.trim();
  if (!query) {
    statusMessage.textContent = "Type a player name to search.";
    resultsList.innerHTML = "";
    return;
  }

  try {
    statusMessage.textContent = `Searching players for Player ${slot}...`;
    resultsList.innerHTML = "";

    const data = await mlb(
      `/people/search?names=${encodeURIComponent(query)}` +
        `&sportIds=${SPORT_ID}` +
        `&active=true` +
        `&limit=25` +
        `&fields=people,id,fullName,currentTeam,primaryPosition`
    );

    const players = (data.people || []).map((p) => ({
      id: p.id,
      name: p.fullName,
      team: p.currentTeam?.name,
      position: p.primaryPosition?.abbreviation,
    }));

    if (!players.length) {
      statusMessage.textContent = "No players found. Try a different name.";
      return;
    }

    statusMessage.textContent = `Found ${players.length} player(s). Click one under Player ${slot}.`;

    players.forEach((player) => {
      const li = document.createElement("li");
      li.className = "result-item";
      li.textContent = player.team
        ? `${player.name} (${player.team})`
        : player.name;

      li.addEventListener("click", () => {
        resultsList
          .querySelectorAll(".result-item.selected")
          .forEach((el) => el.classList.remove("selected"));
        li.classList.add("selected");
        loadPlayerStats(slot, player);
      });

      resultsList.appendChild(li);
    });
  } catch (err) {
    console.error(err);
    statusMessage.textContent =
      "Error searching players (MLB API). Check console.";
  }
}

// Load stats for one player
async function loadPlayerStats(slot, playerMeta) {
  try {
    statusMessage.textContent = `Loading stats for ${playerMeta.name} (Player ${slot})...`;

    // 1) basic info
    const infoPromise = mlb(
      `/people/${playerMeta.id}?fields=people,id,fullName,primaryPosition,currentTeam`
    );

    // 2) season hitting stats
    const statsPromise = mlb(
      `/people/${playerMeta.id}/stats` +
        `?stats=season` +
        `&group=hitting` +
        `&season=${SEASON}` +
        `&gameType=R` +
        `&sportId=${SPORT_ID}`
    );

    const [infoData, statsData] = await Promise.all([
      infoPromise,
      statsPromise,
    ]);

    const person = (infoData.people || [])[0] || {};
    const statsRoot = (statsData.stats || [])[0] || {};
    const split = (statsRoot.splits || [])[0] || {};
    const stat = split.stat || {};

    const payload = {
      name: person.fullName || playerMeta.name,
      games: stat.gamesPlayed ?? stat.games ?? null,
      atBats: stat.atBats ?? null,
      avg: stat.avg ?? stat.battingAverage ?? null,
      obp: stat.obp ?? null,
      slg: stat.slg ?? null,
      ops: stat.ops ?? null,
      hits: stat.hits ?? null,
      homeRuns: stat.homeRuns ?? stat.hr ?? null,
      rbi: stat.rbi ?? null,
      runs: stat.runs ?? null,
      stolenBases: stat.stolenBases ?? stat.sb ?? null,
    };

    if (slot === 1) {
      player1Stats = payload;
      player1Name = payload.name;
      player1ImageUrl = getHeadshotUrl(playerMeta.id);
    } else {
      player2Stats = payload;
      player2Name = payload.name;
      player2ImageUrl = getHeadshotUrl(playerMeta.id);
    }

    statusMessage.textContent = "Stats loaded. Compare below.";
    renderComparison();
  } catch (err) {
    console.error(err);
    statusMessage.textContent =
      "Error loading player stats (MLB API). Check console.";
  }
}

// Wire up events
searchButton1.addEventListener("click", () => searchPlayers(1));
searchButton2.addEventListener("click", () => searchPlayers(2));

searchInput1.addEventListener("keydown", (e) => {
  if (e.key === "Enter") searchPlayers(1);
});
searchInput2.addEventListener("keydown", (e) => {
  if (e.key === "Enter") searchPlayers(2);
});

// Initial mes
