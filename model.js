function teamScore(team) {
  return (
    team.elo * 0.22 +
    team.form * 0.20 +
    team.squadRating * 0.20 +
    team.playerForm * 0.16 +
    team.worldCupHistory * 0.12 -
    team.travelFatigue * 0.04 -
    team.heatImpact * 0.03 -
    team.injuryRisk * 0.03
  );
}

function predict(teamA, teamB) {
  const scoreA = teamScore(teamA);
  const scoreB = teamScore(teamB);
  const diff = scoreA - scoreB;

  let winA = Math.round(50 + diff * 1.7);
  winA = Math.min(82, Math.max(18, winA));

  let winB = Math.round(100 - winA);
  let draw = Math.round(24 - Math.abs(diff) * 0.4);
  draw = Math.min(28, Math.max(12, draw));

  winA = Math.round(winA - draw / 2);
  winB = Math.round(winB - draw / 2);

  let predictedScore = "1-1";
  let winner = "Draw";

  if (winA > winB + 8) {
    winner = teamA.name;
    predictedScore = diff > 12 ? "3-1" : "2-1";
  } else if (winB > winA + 8) {
    winner = teamB.name;
    predictedScore = diff < -12 ? "1-3" : "1-2";
  }

  return {
    teamA: teamA.name,
    teamB: teamB.name,
    winA,
    draw,
    winB,
    winner,
    predictedScore,
    confidence: Math.abs(diff) > 10 ? "High" : Math.abs(diff) > 5 ? "Medium" : "Low",
    scoreA: scoreA.toFixed(1),
    scoreB: scoreB.toFixed(1)
  };
}

function monteCarloWinner() {
  const results = {};

  teams.forEach(team => results[team.name] = 0);

  for (let i = 0; i < 10000; i++) {
    const weighted = teams.map(team => ({
      name: team.name,
      score: teamScore(team) + Math.random() * 18
    }));

    weighted.sort((a, b) => b.score - a.score);
    results[weighted[0].name]++;
  }

  return Object.entries(results)
    .map(([team, wins]) => ({
      team,
      probability: ((wins / 10000) * 100).toFixed(2)
    }))
    .sort((a, b) => b.probability - a.probability)
    .slice(0, 10);
}