const scoreLines = [
  {
    id: "dollars",
    title: "Dollars",
    helper: "1 point for each full $5",
    score: (value) => Math.floor(value / 5),
    inputLabel: "Dollars",
  },
  { id: "buildings", title: "Buildings", helper: "Points shown on buildings" },
  { id: "delivery", title: "Delivery bonuses", helper: "Points from delivery bonuses" },
  { id: "trainStations", title: "Train stations", helper: "Points from train stations" },
  { id: "hazards", title: "Hazards", helper: "Points from hazards" },
  { id: "cowCards", title: "Cow cards", helper: "Points from cow cards" },
  { id: "bonusCards", title: "Bonus cards", helper: "Points from bonus cards" },
  { id: "stationTiles", title: "Station tiles", helper: "Points from station tiles" },
  { id: "workers", title: "Workers", helper: "Points from having workers" },
  { id: "movement", title: "Movement increase", helper: "Points from revealing the movement increase" },
  {
    id: "roundMarker",
    title: "Round marker",
    helper: "Worth 2 points to one player",
    marker: true,
  },
];

const storageKey = "gwt-scorer-state";
const playerInputs = document.querySelector("#player-inputs");
const playerForm = document.querySelector("#player-form");
const setupPanel = document.querySelector("#setup-panel");
const scoreboard = document.querySelector("#scoreboard");
const scoreHead = document.querySelector("#score-head");
const scoreBody = document.querySelector("#score-body");
const scoreFoot = document.querySelector("#score-foot");
const editPlayersButton = document.querySelector("#edit-players");
const resetButton = document.querySelector("#reset-app");

let players = [];
let scores = {};
let roundMarkerPlayer = "";

function readState() {
  try {
    return JSON.parse(localStorage.getItem(storageKey)) || {};
  } catch {
    return {};
  }
}

function saveState() {
  localStorage.setItem(storageKey, JSON.stringify({ players, scores, roundMarkerPlayer }));
}

function numericValue(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
}

function createPlayerInputs(savedPlayers = []) {
  playerInputs.innerHTML = "";

  for (let index = 0; index < 4; index += 1) {
    const wrapper = document.createElement("div");
    wrapper.className = "field";

    const label = document.createElement("label");
    label.htmlFor = `player-${index}`;
    label.textContent = `Player ${index + 1}`;

    const input = document.createElement("input");
    input.id = `player-${index}`;
    input.name = "player";
    input.type = "text";
    input.autocomplete = "off";
    input.placeholder = index === 0 ? "Required" : "Optional";
    input.value = savedPlayers[index]?.name || "";
    input.maxLength = 24;

    wrapper.append(label, input);
    playerInputs.append(wrapper);
  }
}

function startScoring(nextPlayers) {
  players = nextPlayers;
  scores = players.reduce((nextScores, player) => {
    nextScores[player.id] = scores[player.id] || {};
    return nextScores;
  }, {});

  if (!players.some((player) => player.id === roundMarkerPlayer)) {
    roundMarkerPlayer = "";
  }

  setupPanel.classList.add("hidden");
  scoreboard.classList.remove("hidden");
  renderScoreboard();
  saveState();
}

function renderScoreboard() {
  scoreHead.innerHTML = "";
  scoreBody.innerHTML = "";
  scoreFoot.innerHTML = "";

  const headerRow = document.createElement("tr");
  headerRow.append(document.createElement("th"));

  players.forEach((player) => {
    const th = document.createElement("th");
    th.scope = "col";
    th.textContent = player.name;
    headerRow.append(th);
  });

  scoreHead.append(headerRow);

  scoreLines.forEach((line) => {
    const row = document.createElement("tr");
    if (line.marker) row.className = "marker-row";

    const title = document.createElement("td");
    title.innerHTML = `<div class="line-title"><strong>${line.title}</strong><span>${line.helper}</span></div>`;
    row.append(title);

    players.forEach((player) => {
      const cell = document.createElement("td");

      if (line.marker) {
        const label = document.createElement("label");
        label.className = "marker-control";
        label.setAttribute("aria-label", `${player.name} owns the round marker`);

        const input = document.createElement("input");
        input.type = "radio";
        input.name = "round-marker";
        input.value = player.id;
        input.checked = roundMarkerPlayer === player.id;
        input.addEventListener("change", () => {
          roundMarkerPlayer = player.id;
          renderTotals();
          saveState();
        });

        label.append(input);
        cell.append(label);
      } else {
        const label = document.createElement("label");
        label.className = "score-cell";

        const labelText = document.createElement("span");
        labelText.className = "score-label";
        labelText.textContent = line.inputLabel || "Points";

        const input = document.createElement("input");
        input.type = "number";
        input.inputMode = "numeric";
        input.min = "0";
        input.step = "1";
        input.value = scores[player.id]?.[line.id] || "";
        input.setAttribute("aria-label", `${player.name}: ${line.title}`);
        input.addEventListener("input", () => {
          scores[player.id][line.id] = numericValue(input.value);
          renderTotals();
          saveState();
        });

        label.append(labelText, input);
        cell.append(label);
      }

      row.append(cell);
    });

    scoreBody.append(row);
  });

  const totalRow = document.createElement("tr");
  const totalHead = document.createElement("th");
  totalHead.scope = "row";
  totalHead.textContent = "Total";
  totalRow.append(totalHead);

  players.forEach((player) => {
    const cell = document.createElement("td");
    cell.id = `total-${player.id}`;
    totalRow.append(cell);
  });

  scoreFoot.append(totalRow);
  renderTotals();
}

function getPlayerTotal(playerId) {
  return scoreLines.reduce((total, line) => {
    if (line.marker) {
      return total + (roundMarkerPlayer === playerId ? 2 : 0);
    }

    const rawValue = numericValue(scores[playerId]?.[line.id]);
    const lineScore = line.score ? line.score(rawValue) : rawValue;
    return total + lineScore;
  }, 0);
}

function renderTotals() {
  players.forEach((player) => {
    const totalCell = document.querySelector(`#total-${player.id}`);
    if (totalCell) {
      totalCell.textContent = getPlayerTotal(player.id);
    }
  });
}

playerForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const formData = new FormData(playerForm);
  const nextPlayers = formData
    .getAll("player")
    .map((name, index) => ({ id: `player-${index}`, name: name.trim() }))
    .filter((player) => player.name.length > 0);

  if (nextPlayers.length === 0) {
    document.querySelector("#player-0").focus();
    return;
  }

  startScoring(nextPlayers);
});

editPlayersButton.addEventListener("click", () => {
  createPlayerInputs(players);
  scoreboard.classList.add("hidden");
  setupPanel.classList.remove("hidden");
});

resetButton.addEventListener("click", () => {
  players = [];
  scores = {};
  roundMarkerPlayer = "";
  localStorage.removeItem(storageKey);
  createPlayerInputs();
  scoreboard.classList.add("hidden");
  setupPanel.classList.remove("hidden");
});

const savedState = readState();
players = Array.isArray(savedState.players) ? savedState.players : [];
scores = savedState.scores || {};
roundMarkerPlayer = savedState.roundMarkerPlayer || "";
createPlayerInputs(players);

if (players.length > 0) {
  startScoring(players);
}
