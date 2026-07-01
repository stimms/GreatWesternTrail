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
const historyStorageKey = "gwt-game-history";
const playerInputs = document.querySelector("#player-inputs");
const playerForm = document.querySelector("#player-form");
const setupPanel = document.querySelector("#setup-panel");
const scoreboard = document.querySelector("#scoreboard");
const scoreHead = document.querySelector("#score-head");
const scoreBody = document.querySelector("#score-body");
const scoreFoot = document.querySelector("#score-foot");
const editPlayersButton = document.querySelector("#edit-players");
const recordGameButton = document.querySelector("#record-game");
const resetButton = document.querySelector("#reset-app");
const historyList = document.querySelector("#history-list");
const clearHistoryButton = document.querySelector("#clear-history");

let players = [];
let scores = {};
let roundMarkerPlayer = "";
let gameHistory = [];

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

function readHistory() {
  try {
    const savedHistory = JSON.parse(localStorage.getItem(historyStorageKey));
    return Array.isArray(savedHistory) ? savedHistory : [];
  } catch {
    return [];
  }
}

function saveHistory() {
  localStorage.setItem(historyStorageKey, JSON.stringify(gameHistory));
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
    const label = document.createElement("span");
    label.className = "player-heading";
    label.textContent = player.name;
    th.append(label);
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

function getRecordedPlayers() {
  return players.map((player) => ({
    id: player.id,
    name: player.name,
    total: getPlayerTotal(player.id),
  }));
}

function getWinner(recordedPlayers) {
  const highestScore = Math.max(...recordedPlayers.map((player) => player.total));
  const winners = recordedPlayers.filter((player) => player.total === highestScore);

  if (winners.length > 1) {
    return { names: winners.map((player) => player.name), total: highestScore, margin: 0, tied: true };
  }

  const runnerUpTotal = Math.max(
    ...recordedPlayers.filter((player) => player.id !== winners[0].id).map((player) => player.total),
    0,
  );

  return {
    names: [winners[0].name],
    total: highestScore,
    margin: highestScore - runnerUpTotal,
    tied: false,
  };
}

function getMelissaSummary(recordedPlayers) {
  const melissa = recordedPlayers.find((player) => player.name.trim().toLowerCase() === "melissa");
  const simon = recordedPlayers.find((player) => player.name.trim().toLowerCase() === "simon");

  if (!melissa || !simon) {
    return "";
  }

  const margin = melissa.total - simon.total;

  if (margin > 0) {
    return `Melissa beat Simon by ${margin}.`;
  }

  if (margin < 0) {
    return `Simon beat Melissa by ${Math.abs(margin)}.`;
  }

  return "Melissa and Simon tied.";
}

function getWinnerSummary(game) {
  if (game.winner.tied) {
    return `${game.winner.names.join(" and ")} tied at ${game.winner.total}.`;
  }

  return `${game.winner.names[0]} won by ${game.winner.margin}.`;
}

function formatGameDate(playedAt) {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(playedAt));
}

function renderHistory() {
  historyList.innerHTML = "";
  clearHistoryButton.disabled = gameHistory.length === 0;

  if (gameHistory.length === 0) {
    const emptyState = document.createElement("p");
    emptyState.className = "history-empty";
    emptyState.textContent = "No recorded games yet.";
    historyList.append(emptyState);
    return;
  }

  gameHistory.forEach((game) => {
    const article = document.createElement("article");
    article.className = "history-item";

    const date = document.createElement("time");
    date.dateTime = game.playedAt;
    date.textContent = formatGameDate(game.playedAt);

    const summary = document.createElement("strong");
    summary.textContent = game.melissaSummary || getWinnerSummary(game);

    const scoresList = document.createElement("div");
    scoresList.className = "history-scores";

    game.players
      .slice()
      .sort((left, right) => right.total - left.total)
      .forEach((player) => {
        const score = document.createElement("span");
        score.textContent = `${player.name}: ${player.total}`;
        scoresList.append(score);
      });

    article.append(date, summary, scoresList);
    historyList.append(article);
  });
}

function recordGame() {
  if (players.length === 0) return;

  const recordedPlayers = getRecordedPlayers();
  const game = {
    id: crypto.randomUUID ? crypto.randomUUID() : `game-${Date.now()}`,
    playedAt: new Date().toISOString(),
    players: recordedPlayers,
    winner: getWinner(recordedPlayers),
    melissaSummary: getMelissaSummary(recordedPlayers),
  };

  gameHistory = [game, ...gameHistory].slice(0, 50);
  saveHistory();
  renderHistory();
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

recordGameButton.addEventListener("click", recordGame);

clearHistoryButton.addEventListener("click", () => {
  gameHistory = [];
  saveHistory();
  renderHistory();
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
gameHistory = readHistory();
createPlayerInputs(players);
renderHistory();

if (players.length > 0) {
  startScoring(players);
}
