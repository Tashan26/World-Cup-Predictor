let predictions = [];
let teamsData = [];

async function loadData() {
  const predictionsRes = await fetch("data/predictions.json");
  const teamsRes = await fetch("data/teams.json");

  predictions = await predictionsRes.json();
  teamsData = await teamsRes.json();

  populateFixtures();
  renderTeamCards();
  renderBracket();
}

function populateFixtures() {
  const select = document.getElementById("fixtureSelect");

  if (!select) return;

  select.innerHTML = "";

  predictions.forEach(match => {
    select.innerHTML += `
      <option value="${match.id}">
        ${match.home} vs ${match.away} - ${match.stage}
      </option>
    `;
  });
}

function showPrediction() {
  const selectedId = document.getElementById("fixtureSelect").value;
  const match = predictions.find(m => String(m.id) === String(selectedId));

  if (!match) return;

  document.getElementById("prediction").innerHTML = `
    <h3>${match.home} vs ${match.away}</h3>
    <strong>Predicted score:</strong> ${match.predictedScore}<br>
    <strong>Predicted winner:</strong> ${match.predictedWinner}<br>
    <strong>Confidence:</strong> ${match.confidence}<br><br>

    <strong>${match.home} win:</strong> ${match.probabilities.home}%<br>
    <strong>Draw:</strong> ${match.probabilities.draw}%<br>
    <strong>${match.away} win:</strong> ${match.probabilities.away}%<br><br>

    <strong>Likely scorer:</strong> ${match.likelyScorer.name} (${match.likelyScorer.team}) - ${match.likelyScorer.probability}%<br><br>

    <strong>Red-card risk:</strong><br>
    ${match.home}: ${match.redCardRisk[match.home]}%<br>
    ${match.away}: ${match.redCardRisk[match.away]}%<br><br>

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
      <strong>${team.name}</strong>
      <p class="muted">${team.confederation} | Group ${team.group}</p>
      <span class="score-pill">Elo ${team.elo}</span>
    </div>
  `).join("");
}

function renderBracket() {
  const bracket = document.getElementById("bracket");
  if (!bracket) return;

  bracket.innerHTML = `
    <div class="bracket-round">
      <h3>Dynamic Bracket</h3>
      <p class="muted">This will generate after all group fixtures are added.</p>
    </div>
  `;
}

function askChat() {
  const input = document.getElementById("chatInput").value.toLowerCase();
  const output = document.getElementById("chatOutput");

  const team = teamsData.find(t => input.includes(t.name.toLowerCase()));

  if (team) {
    output.innerHTML = `
      <strong>${team.name}</strong><br>
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