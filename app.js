const teamASelect = document.getElementById("teamA");
const teamBSelect = document.getElementById("teamB");

function init() {
  teams.forEach(team => {
    teamASelect.innerHTML += `<option value="${team.name}">${team.name}</option>`;
    teamBSelect.innerHTML += `<option value="${team.name}">${team.name}</option>`;
  });

  teamBSelect.selectedIndex = 1;

  renderTeamCards();
  renderBracket();
}

function getTeam(name) {
  return teams.find(team => team.name === name);
}

function predictMatch() {
  const teamA = getTeam(teamASelect.value);
  const teamB = getTeam(teamBSelect.value);

  if (teamA.name === teamB.name) {
    document.getElementById("prediction").innerHTML = "Please choose two different teams.";
    return;
  }

  const result = predict(teamA, teamB);

  document.getElementById("prediction").innerHTML = `
    <h3>${result.teamA} vs ${result.teamB}</h3>
    <strong>Predicted score:</strong> ${result.predictedScore}<br>
    <strong>Predicted winner:</strong> ${result.winner}<br><br>

    <strong>${result.teamA} win:</strong> ${result.winA}%<br>
    <strong>Draw:</strong> ${result.draw}%<br>
    <strong>${result.teamB} win:</strong> ${result.winB}%<br><br>

    <strong>Model confidence:</strong> ${result.confidence}<br>
    <strong>${result.teamA} model score:</strong> ${result.scoreA}<br>
    <strong>${result.teamB} model score:</strong> ${result.scoreB}
  `;
}

function simulateGroups() {
  const rankedTeams = [...teams].sort((a, b) => teamScore(b) - teamScore(a));

  let html = "<h3>Projected Global Ranking</h3>";

  rankedTeams.slice(0, 16).forEach((team, index) => {
    html += `
      <div>
        <strong>${index + 1}. ${team.name}</strong>
        — Rating: ${teamScore(team).toFixed(1)}
      </div>
    `;
  });

  document.getElementById("groups").innerHTML = html;
}

function runMonteCarlo() {
  const winners = monteCarloWinner();

  let html = "<h3>Top 10 Tournament Winner Probabilities</h3>";

  winners.forEach((item, index) => {
    html += `
      <div>
        <strong>${index + 1}. ${item.team}</strong>
        — ${item.probability}%
      </div>
    `;
  });

  document.getElementById("simulation").innerHTML = html;
}

function renderTeamCards() {
  const container = document.getElementById("teamCards");
  const topTeams = [...teams].sort((a, b) => teamScore(b) - teamScore(a)).slice(0, 12);

  container.innerHTML = "";

  topTeams.forEach(team => {
    container.innerHTML += `
      <div class="team-card">
        <strong>${team.name}</strong>
        <p class="muted">Form: ${team.form} | Squad: ${team.squadRating}</p>
        <span class="score-pill">${teamScore(team).toFixed(1)}</span>
      </div>
    `;
  });
}

function renderBracket() {
  const bracket = document.getElementById("bracket");

  bracketRounds.forEach(round => {
    let matches = "";

    round.matches.forEach(match => {
      matches += `<div class="match">${match}</div>`;
    });

    bracket.innerHTML += `
      <div class="bracket-round">
        <h3>${round.title}</h3>
        ${matches}
      </div>
    `;
  });
}

function askChat() {
  const input = document.getElementById("chatInput").value.toLowerCase();

  if (!input.trim()) {
    document.getElementById("chatOutput").innerHTML = "Type a question first.";
    return;
  }

  const teamMatch = teams.find(team => input.includes(team.name.toLowerCase()));

  if (teamMatch) {
    document.getElementById("chatOutput").innerHTML = `
      <strong>${teamMatch.name} profile</strong><br>
      Model score: ${teamScore(teamMatch).toFixed(1)}<br>
      Elo-style rating: ${teamMatch.elo}<br>
      Current form: ${teamMatch.form}<br>
      Squad rating: ${teamMatch.squadRating}<br>
      Player form: ${teamMatch.playerForm}<br>
      Injury risk: ${teamMatch.injuryRisk}<br><br>
      This is currently rule-based. The next upgrade will connect this to OpenAI through GitHub Actions.
    `;
    return;
  }

  const kbMatch = knowledgeBase.find(item => input.includes(item.keyword));

  document.getElementById("chatOutput").innerHTML = kbMatch
    ? kbMatch.answer
    : "I do not have enough information yet. The next version will connect real fixtures, news, injuries, weather and OpenAI-powered answers.";
}

init();