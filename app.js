function teamScore(team) {
  return (
    team.elo * 0.25 +
    team.form * 0.25 +
    team.worldCupHistory * 0.15 +
    team.squadRating * 0.25 -
    team.travelFatigue * 0.05 -
    team.heatImpact * 0.05
  );
}

function predict(teamA, teamB) {
  const scoreA = teamScore(teamA);
  const scoreB = teamScore(teamB);

  const total = scoreA + scoreB;
  const winA = Math.round((scoreA / total) * 100);
  const winB = Math.round((scoreB / total) * 100);
  const draw = Math.max(10, Math.round(100 - winA - winB + 20));

  let predictedScore = "1-1";
  let winner = "Draw";

  if (winA > winB + 5) {
    winner = teamA.name;
    predictedScore = "2-1";
  } else if (winB > winA + 5) {
    winner = teamB.name;
    predictedScore = "1-2";
  }

  return {
    teamA: teamA.name,
    teamB: teamB.name,
    winA,
    winB,
    draw,
    winner,
    predictedScore,
    confidence: Math.abs(winA - winB) > 10 ? "High" : "Medium"
  };
}