let predictions = [];
let teamsData = [];
let flags = {};
let goldenBoot = [];
let tournamentSimulation = {};
let knockout = {};

async function loadData() {
  try {
    const [predictionsRes, teamsRes, flagsRes, simRes, goldenBootRes, knockoutRes] = await Promise.all([
      fetch("data/predictions.json"),
      fetch("data/teams.json"),
      fetch("data/flags.json"),
      fetch("data/tournament_simulation.json"),
      fetch("data/golden_boot.json"),
      fetch("data/knockout.json")
    ]);

    predictions = await predictionsRes.json();
    teamsData = await teamsRes.json();
    flags = await flagsRes.json();
    tournamentSimulation = await simRes.json();
    goldenBoot = await goldenBootRes.json();
    knockout = await knockoutRes.json();

    populateFixtures();
    renderKpis();
    renderTournamentTracker();
    renderFixtureList();
    renderTeamCards();
    renderGroupTables();
    renderBracket();
    renderGoldenBoot();
    renderWinnerChart();
    showFirstPrediction();
  } catch (error) {
    console.error(error);
    document.body.insertAdjacentHTML(
      "afterbegin",
      `<div style="padding:16px;background:#fee2e2;color:#991b1b;">
        Data loading error. Run all scripts and commit generated JSON files.
      </div>`
    );
  }
}

function flag(team) {
  const code = flags[team];
  if (!code) return "";
  return `<img class="flag" src="https://flagcdn.com/w40/${code}.png" alt="${team} flag">`;
}

function populateFixtures() {
  const select = document.getElementById("fixtureSelect");
  if (!select) return;

  select.innerHTML = predictions.map(match => `
    <option value="${match.id}">
      ${match.home} vs ${match.away} - Group ${match.group}
    </option>
  `).join("");
}

function showFirstPrediction() {
  if (predictions.length && document.getElementById("fixtureSelect")) {
    document.getElementById("fixtureSelect").value = predictions[0].id;
    showPrediction();
  }
}

function renderKpis() {
  const container = document.getElementById("kpiGrid");
  if (!container) return;

  const favourite = tournamentSimulation.winnerProbabilities?.[0] || { team: "TBD", winProbability: 0 };
  const golden = goldenBoot?.[0] || { player: "TBD", team: "TBD", probability: 0 };

  container.innerHTML = `
    <div class="kpi-card">
      <span>Tournament Favourite</span>
      <strong>${flag(favourite.team)} ${favourite.team}</strong>
      <p class="muted">${favourite.winProbability}% title probability</p>
    </div>
    <div class="kpi-card">
      <span>Golden Boot Favourite</span>
      <strong>${golden.player}</strong>
      <p class="muted">${flag(golden.team)} ${golden.team} · ${golden.probability}%</p>
    </div>
    <div class="kpi-card">
      <span>Fixtures Modelled</span>
      <strong>${predictions.length}</strong>
      <p class="muted">Group-stage predictions generated</p>
    </div>
    <div class="kpi-card">
      <span>Simulation Runs</span>
      <strong>10,000</strong>
      <p class="muted">Monte Carlo tournament model</p>
    </div>
  `;
}

function renderTournamentTracker() {
  const container = document.getElementById("tournamentTracker");
  if (!container) return;

  const completedMatches = predictions.filter(match => match.status === "completed" || match.actualResult);
  const matchesPlayed = completedMatches.length;
  const matchesRemaining = predictions.length - matchesPlayed;

  const goalsScored = completedMatches.reduce((total, match) => {
    if (!match.actualResult) return total;
    return total + Number(match.actualResult.homeGoals || 0) + Number(match.actualResult.awayGoals || 0);
  }, 0);

  const averageGoals = matchesPlayed > 0
    ? (goalsScored / matchesPlayed).toFixed(2)
    : "0.00";

  const redCards = completedMatches.reduce((total, match) => {
    if (!match.redCards) return total;
    return total + match.redCards.length;
  }, 0);

  const lastUpdated = tournamentSimulation.generatedAt
    ? new Date(tournamentSimulation.generatedAt).toLocaleString()
    : "Not available";

  container.innerHTML = `
    <div class="tracker-card">
      <span>Matches Played</span>
      <strong>${matchesPlayed}</strong>
    </div>

    <div class="tracker-card">
      <span>Matches Remaining</span>
      <strong>${matchesRemaining}</strong>
    </div>

    <div class="tracker-card">
      <span>Goals Scored</span>
      <strong>${goalsScored}</strong>
    </div>

    <div class="tracker-card">
      <span>Avg Goals/Game</span>
      <strong>${averageGoals}</strong>
    </div>

    <div class="tracker-card">
      <span>Red Cards</span>
      <strong>${redCards}</strong>
    </div>

    <div class="tracker-card wide">
      <span>Last Model Update</span>
      <strong>${lastUpdated}</strong>
    </div>
  `;
}

function renderFixtureList() {
  const container = document.getElementById("fixtureList");
  if (!container) return;

  const searchValue = document.getElementById("teamSearch")?.value.toLowerCase() || "";
  const groupValue = document.getElementById("groupFilter")?.value || "all";

  const filtered = predictions.filter(match => {
    const matchesSearch =
      match.home.toLowerCase().includes(searchValue) ||
      match.away.toLowerCase().includes(searchValue);

    const matchesGroup = groupValue === "all" || match.group === groupValue;

    return matchesSearch && matchesGroup;
  });

  const grouped = {};

  filtered.forEach(match => {
    if (!grouped[match.group]) grouped[match.group] = [];
    grouped[match.group].push(match);
  });

  let html = "";

  Object.keys(grouped).sort().forEach(group => {
    html += `
      <div class="fixture-group">
        <h3>Group ${group}</h3>

        ${grouped[group].map(match => `
          <div class="fixture-row" onclick="selectMatch('${match.id}')">
            <div class="fixture-teams">
              <strong>${flag(match.home)} ${match.home}</strong>
              <span>${match.actualResult ? `${match.actualResult.homeGoals}-${match.actualResult.awayGoals}` : match.predictedScore}</span>
              <strong>${flag(match.away)} ${match.away}</strong>
            </div>

            <div class="fixture-meta">
              <span>${formatDate(match.date)}</span>
              <span>${match.stadium || "Venue TBD"}</span>
              <span>Winner: ${flag(match.predictedWinner)} ${match.predictedWinner}</span>
              <span class="confidence-pill ${confidenceClass(match.confidence)}">${match.confidence}</span>
              <span>Likely scorer: ${match.likelyScorer.name}</span>
              ${match.actualResult ? `<span class="completed-pill">Completed</span>` : ""}
            </div>
          </div>
        `).join("")}
      </div>
    `;
  });

  container.innerHTML = html || "<p class='muted'>No matches found.</p>";
}

function showPrediction() {
  const selectedId = document.getElementById("fixtureSelect").value;
  const match = predictions.find(m => String(m.id) === String(selectedId));
  if (!match) return;

  const displayScore = match.actualResult
    ? `${match.actualResult.homeGoals}-${match.actualResult.awayGoals}`
    : match.predictedScore;

  document.getElementById("prediction").innerHTML = `
    <h3>${flag(match.home)} ${match.home} vs ${flag(match.away)} ${match.away}</h3>

    <div class="prediction-grid">
      <div><strong>${match.actualResult ? "Final score" : "Predicted score"}</strong><p class="big-number">${displayScore}</p></div>
      <div><strong>Predicted winner</strong><p>${flag(match.predictedWinner)} ${match.predictedWinner}</p></div>
      <div><strong>Confidence</strong><p><span class="confidence-pill ${confidenceClass(match.confidence)}">${match.confidence}</span></p></div>
    </div>

    <div class="info-grid">
      <div class="info-card">
        <strong>Win probabilities</strong>
        ${probabilityLine(match.home, match.probabilities.home)}
        ${probabilityLine("Draw", match.probabilities.draw)}
        ${probabilityLine(match.away, match.probabilities.away)}
      </div>

      <div class="info-card">
        <strong>Player intelligence</strong>
        Likely scorer: ${match.likelyScorer.name}<br>
        Team: ${flag(match.likelyScorer.team)} ${match.likelyScorer.team}<br>
        Scorer probability: ${match.likelyScorer.probability}%
      </div>

      <div class="info-card">
        <strong>Cards model</strong>
        ${flag(match.home)} ${match.home}: ${match.redCardRisk[match.home]}% red-card risk<br>
        ${flag(match.away)} ${match.away}: ${match.redCardRisk[match.away]}% red-card risk
      </div>

      <div class="info-card">
        <strong>Venue conditions</strong>
        ${match.stadium}, ${match.city}<br>
        Kickoff: ${formatDate(match.date)}<br>
        Heat: ${match.factors.heatImpact} (${match.factors.venueHeatRisk}/10)<br>
        Altitude: ${match.factors.altitudeImpact} (${match.factors.altitude}m)
      </div>

      <div class="info-card">
        <strong>${flag(match.home)} ${match.home} travel</strong>
        ${match.travel[match.home].distanceKm.toLocaleString()} km<br>
        Impact: ${match.travel[match.home].impact}<br>
        Penalty: -${match.travel[match.home].penalty} pts
      </div>

      <div class="info-card">
        <strong>${flag(match.away)} ${match.away} travel</strong>
        ${match.travel[match.away].distanceKm.toLocaleString()} km<br>
        Impact: ${match.travel[match.away].impact}<br>
        Penalty: -${match.travel[match.away].penalty} pts
      </div>
    </div>

    <hr>

    <h3>Why this prediction?</h3>
    <p>${match.explanation?.summary || "No explanation available."}</p>

    <ul>
      ${(match.explanation?.strongestFactors || []).map(f => `
        <li><strong>${f.advantage}</strong> advantage: ${f.factor} +${f.difference}</li>
      `).join("")}
    </ul>

    <h3>Model notes</h3>
    <ul>${(match.notes || []).map(note => `<li>${note}</li>`).join("")}</ul>
  `;
}

function probabilityLine(label, value) {
  const cleanLabel = label === "Draw" ? "Draw" : `${flag(label)} ${label}`;

  return `
    <div class="chart-row">
      <div class="chart-label"><span>${cleanLabel}</span><span>${value}%</span></div>
      <div class="chart-bar"><span style="width:${value}%"></span></div>
    </div>
  `;
}

function selectMatch(matchId) {
  const select = document.getElementById("fixtureSelect");
  if (!select) return;

  select.value = matchId;
  showPrediction();

  document.getElementById("prediction").scrollIntoView({
    behavior: "smooth",
    block: "start"
  });
}

function renderWinnerChart() {
  const container = document.getElementById("winnerChart");
  if (!container || !tournamentSimulation.winnerProbabilities) return;

  container.innerHTML = tournamentSimulation.winnerProbabilities.slice(0, 12).map(team => `
    <div class="chart-row">
      <div class="chart-label"><span>${flag(team.team)} ${team.team}</span><span>${team.winProbability}%</span></div>
      <div class="chart-bar"><span style="width:${team.winProbability * 4}%"></span></div>
    </div>
  `).join("");
}

function renderTeamCards() {
  const container = document.getElementById("teamCards");
  if (!container) return;

  const ranked = [...teamsData].sort((a, b) => b.elo - a.elo).slice(0, 12);

  container.innerHTML = ranked.map(team => `
    <div class="team-card">
      <strong>${flag(team.name)} ${team.name}</strong>
      <p class="muted">${team.confederation} | Group ${team.group}</p>
      ${statBar("Attack", team.attack)}
      ${statBar("Defence", team.defence)}
      ${statBar("Form", team.recentForm)}
      <span class="score-pill">Elo ${team.elo}</span>
    </div>
  `).join("");
}

function statBar(label, value) {
  return `
    <div class="stat-bar">
      <label><span>${label}</span><span>${value}</span></label>
      <div class="bar"><span style="width:${value}%"></span></div>
    </div>
  `;
}

function renderGroupTables() {
  const container = document.getElementById("groups");
  if (!container || !tournamentSimulation.groupTables) return;

  let html = "";

  Object.keys(tournamentSimulation.groupTables).sort().forEach(group => {
    const table = tournamentSimulation.groupTables[group];

    html += `
      <div class="group-table">
        <h3>Group ${group}</h3>
        <table>
          <thead>
            <tr><th>Team</th><th>P</th><th>W</th><th>D</th><th>L</th><th>GD</th><th>Pts</th></tr>
          </thead>
          <tbody>
            ${table.map(row => `
              <tr>
                <td>${flag(row.team)} ${row.team}</td>
                <td>${row.played}</td>
                <td>${row.won}</td>
                <td>${row.drawn}</td>
                <td>${row.lost}</td>
                <td>${row.goalDifference}</td>
                <td><strong>${row.points}</strong></td>
              </tr>
            `).join("")}
          </tbody>
        </table>
      </div>
    `;
  });

  container.innerHTML = html;
}

function renderBracket() {
  const bracket = document.getElementById("bracket");
  if (!bracket) return;

  if (!knockout.rounds) {
    bracket.innerHTML = "<p class='muted'>Knockout bracket has not been generated yet.</p>";
    return;
  }

  bracket.innerHTML = knockout.rounds.map(round => `
    <div class="bracket-round">
      <h3>${round.name}</h3>
      ${round.matches.map((match, index) => `
        <div class="match">
          <strong>${index + 1}</strong>. ${flag(match.home)} ${match.home}
          <br>vs ${flag(match.away)} ${match.away}
          ${match.homeQualification ? `<br><small>${match.homeQualification} vs ${match.awayQualification}</small>` : ""}
        </div>
      `).join("")}
    </div>
  `).join("");
}

function renderGoldenBoot() {
  const container = document.getElementById("goldenBoot");
  if (!container || !goldenBoot.length) return;

  container.innerHTML = goldenBoot.slice(0, 12).map(player => `
    <div class="chart-row">
      <div class="chart-label"><span>${flag(player.team)} ${player.player}</span><span>${player.probability}%</span></div>
      <div class="chart-bar"><span style="width:${player.probability * 5}%"></span></div>
    </div>
  `).join("");
}

function askChat() {
  const input = document.getElementById("chatInput").value.toLowerCase();
  const output = document.getElementById("chatOutput");
  const team = teamsData.find(t => input.includes(t.name.toLowerCase()));

  if (team) {
    output.innerHTML = `
      <h3>${flag(team.name)} ${team.name}</h3>
      <p><strong>Group:</strong> ${team.group}</p>
      <p><strong>Confederation:</strong> ${team.confederation}</p>
      <p><strong>FIFA rank seed:</strong> ${team.fifaRank}</p>
      <p><strong>Elo seed:</strong> ${team.elo}</p>
      ${statBar("Attack", team.attack)}
      ${statBar("Defence", team.defence)}
      ${statBar("Recent form", team.recentForm)}
      ${statBar("World Cup history", team.worldCupHistory)}
    `;
    return;
  }

  output.innerHTML = "Ask about a team currently in the model.";
}

function confidenceClass(confidence) {
  if (!confidence) return "confidence-low";
  const value = confidence.toLowerCase();

  if (value.includes("high")) return "confidence-high";
  if (value.includes("medium")) return "confidence-medium";

  return "confidence-low";
}

function formatDate(dateString) {
  if (!dateString) return "Date TBD";

  return new Date(dateString).toLocaleString(undefined, {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  });
}

function toggleTheme() {
  document.body.classList.toggle("dark");
  const mode = document.body.classList.contains("dark") ? "dark" : "light";
  localStorage.setItem("theme", mode);
}

function loadTheme() {
  const savedTheme = localStorage.getItem("theme");
  if (savedTheme === "dark") document.body.classList.add("dark");
}

loadTheme();
loadData();