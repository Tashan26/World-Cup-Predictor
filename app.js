let predictions = [];
let teamsData = [];
let flags = {};
let goldenBoot = [];
let tournamentSimulation = {};
let knockout = {};

async function loadData() {
  const predictionsRes = await fetch("data/predictions.json");
  const teamsRes = await fetch("data/teams.json");
  const flagsRes = await fetch("data/flags.json");
  const simRes = await fetch("data/tournament_simulation.json");
  const goldenBootRes = await fetch("data/golden_boot.json");
  const knockoutRes = await fetch("data/knockout.json");

  predictions = await predictionsRes.json();
  teamsData = await teamsRes.json();
  flags = await flagsRes.json();
  tournamentSimulation = await simRes.json();
  goldenBoot = await goldenBootRes.json();
  knockout = await knockoutRes.json();

  populateFixtures();
  renderTeamCards();
  renderGroupTables();
  renderBracket();
  renderGoldenBoot();
}

function flag(team) {
  return flags[team] || "";
}

function populateFixtures() {
  const select = document.getElementById("fixtureSelect");
  if (!select) return;

  select.innerHTML = "";

  predictions.forEach(match => {
    select.innerHTML += `
      <option value="${match.id}">
        ${flag(match.home)} ${match.home} vs ${flag(match.away)} ${match.away} - Group ${match.group}
      </option>
    `;
  });
}

function showPrediction() {
  const selectedId = document.getElementById("fixtureSelect").value;
  const match = predictions.find(m => String(m.id) === String(selectedId));
  if (!match) return;

  document.getElementById("prediction").innerHTML = `
    <h3>${flag(match.home)} ${match.home} vs ${flag(match.away)} ${match.away}</h3>

    <div class="prediction-grid">
      <div>
        <strong>Predicted score</strong>
        <p class="big-number">${match.predictedScore}</p>
      </div>

      <div>
        <strong>Predicted winner</strong>
        <p>${flag(match.predictedWinner)} ${match.predictedWinner}</p>
      </div>

      <div>
        <strong>Confidence</strong>
        <p>${match.confidence}</p>
      </div>
    </div>

    <hr>

    <strong>Win probabilities</strong><br>
    ${flag(match.home)} ${match.home}: ${match.probabilities.home}%<br>
    Draw: ${match.probabilities.draw}%<br>
    ${flag(match.away)} ${match.away}: ${match.probabilities.away}%<br><br>

    <strong>Likely scorer</strong><br>
    ${match.likelyScorer.name} (${flag(match.likelyScorer.team)} ${match.likelyScorer.team}) - ${match.likelyScorer.probability}%<br><br>

    <strong>Red-card risk</strong><br>
    ${flag(match.home)} ${match.home}: ${match.redCardRisk[match.home]}%<br>
    ${flag(match.away)} ${match.away}: ${match.redCardRisk[match.away]}%<br><br>

    <strong>Venue & conditions</strong><br>
    ${match.stadium}, ${match.city}<br>
    Heat impact: ${match.factors.heatImpact} (${match.factors.venueHeatRisk}/10)<br>
    Altitude impact: ${match.factors.altitudeImpact} (${match.factors.altitude}m)<br><br>

    <strong>Travel fatigue</strong><br>
    ${flag(match.home)} ${match.home}: ${match.travel[match.home].distanceKm.toLocaleString()} km | ${match.travel[match.home].impact} impact | -${match.travel[match.home].penalty} pts<br>
    ${flag(match.away)} ${match.away}: ${match.travel[match.away].distanceKm.toLocaleString()} km | ${match.travel[match.away].impact} impact | -${match.travel[match.away].penalty} pts<br><br>

    <strong>Why this prediction?</strong>
    <p>${match.explanation?.summary || "No explanation available."}</p>

    <ul>
      ${(match.explanation?.strongestFactors || []).map(f => `
        <li>${f.advantage} advantage: ${f.factor} +${f.difference}</li>
      `).join("")}
    </ul>

    <strong>Model notes</strong>
    <ul>
      ${match.notes.map(note => `<li>${note}</li>`).join("")}
    </ul>
  `;
}

function renderTeamCards() {
  const container = document.getElementById("teamCards");
  if (!container) return;

  const ranked = [...teamsData]
    .sort((a, b) => b.elo - a.elo)
    .slice(0, 12);

  container.innerHTML = ranked.map(team => `
    <div class="team-card">
      <strong>${flag(team.name)} ${team.name}</strong>
      <p class="muted">${team.confederation} | Group ${team.group}</p>
      <span class="score-pill">Elo ${team.elo}</span>
    </div>
  `).join("");
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
            <tr>
              <th>Team</th>
              <th>P</th>
              <th>W</th>
              <th>D</th>
              <th>L</th>
              <th>GD</th>
              <th>Pts</th>
            </tr>
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

  const winners = tournamentSimulation.winnerProbabilities
    ? tournamentSimulation.winnerProbabilities.slice(0, 12)
    : [];

  if (!knockout.rounds) {
    bracket.innerHTML = "<p class='muted'>Knockout bracket has not been generated yet.</p>";
    return;
  }

  bracket.innerHTML = `
    ${knockout.rounds.map(round => `
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
    `).join("")}

    <div class="bracket-round">
      <h3>10,000-run Winner Model</h3>
      ${winners.map((team, index) => `
        <div class="match">
          ${index + 1}. ${flag(team.team)} ${team.team}
          <br><strong>${team.winProbability}%</strong> title probability
        </div>
      `).join("")}
    </div>
  `;
}

function renderGoldenBoot() {
  const container = document.getElementById("goldenBoot");
  if (!container || !goldenBoot.length) return;

  container.innerHTML = goldenBoot.slice(0, 12).map((player, index) => `
    <div class="match">
      ${index + 1}. <strong>${player.player}</strong>
      <br>${flag(player.team)} ${player.team}
      <br><strong>${player.probability}%</strong> Golden Boot probability
    </div>
  `).join("");
}

function askChat() {
  const input = document.getElementById("chatInput").value.toLowerCase();
  const output = document.getElementById("chatOutput");

  const team = teamsData.find(t => input.includes(t.name.toLowerCase()));

  if (team) {
    output.innerHTML = `
      <strong>${flag(team.name)} ${team.name}</strong><br>
      Group: ${team.group}<br>
      Confederation: ${team.confederation}<br>
      FIFA rank seed: ${team.fifaRank}<br>
      Elo seed: ${team.elo}<br>
      Attack: ${team.attack}<br>
      Defence: ${team.defence}<br>
      Recent form: ${team.recentForm}<br>
      World Cup history: ${team.worldCupHistory}
    `;
    return;
  }

  output.innerHTML = "Ask about a team currently in the model.";
}

loadData();