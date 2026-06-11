let predictions = [];
let teamsData = [];
let flags = {};
let tournamentSimulation = {};

async function loadData() {
  const predictionsRes = await fetch("data/predictions.json");
  const teamsRes = await fetch("data/teams.json");
  const flagsRes = await fetch("data/flags.json");
  const simRes = await fetch("data/tournament_simulation.json");

  predictions = await predictionsRes.json();
  teamsData = await teamsRes.json();
  flags = await flagsRes.json();
  tournamentSimulation = await simRes.json();

  populateFixtures();
  renderTeamCards();
  renderGroupTables();
  renderBracket();
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
    <strong>Predicted score:</strong> ${match.predictedScore}<br>
    <strong>Predicted winner:</strong> ${flag(match.predictedWinner)} ${match.predictedWinner}<br>
    <strong>Confidence:</strong> ${match.confidence}<br><br>

    <strong>${flag(match.home)} ${match.home} win:</strong> ${match.probabilities.home}%<br>
    <strong>Draw:</strong> ${match.probabilities.draw}%<br>
    <strong>${flag(match.away)} ${match.away} win:</strong> ${match.probabilities.away}%<br><br>

    <strong>Likely scorer:</strong> ${match.likelyScorer.name} (${flag(match.likelyScorer.team)} ${match.likelyScorer.team}) - ${match.likelyScorer.probability}%<br><br>

    <strong>Red-card risk:</strong><br>
    ${flag(match.home)} ${match.home}: ${match.redCardRisk[match.home]}%<br>
    ${flag(match.away)} ${match.away}: ${match.redCardRisk[match.away]}%<br><br>

    <strong>Venue:</strong> ${match.stadium}, ${match.city}<br>
    <strong>Heat risk:</strong> ${match.factors.venueHeatRisk}/10<br>
    <strong>Altitude:</strong> ${match.factors.altitude}m<br><br>

    <strong>Model notes:</strong>
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
  if (!bracket || !tournamentSimulation.qualifiedTeams) return;

  const teams = tournamentSimulation.qualifiedTeams.slice(0, 32);

  bracket.innerHTML = `
    <div class="bracket-round">
      <h3>Projected Round of 32</h3>
      ${teams.map((team, index) => `
        <div class="match">
          ${index + 1}. ${flag(team.team)} ${team.team}
          <br><small>${team.qualification}</small>
        </div>
      `).join("")}
    </div>
  `;
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