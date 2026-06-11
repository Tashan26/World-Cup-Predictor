const fs = require("fs");

const teams = JSON.parse(fs.readFileSync("data/teams.json"));
const fixtures = JSON.parse(fs.readFileSync("data/fixtures.json"));

function teamScore(team) {
  return (
    team.elo * 0.25 +
    team.form * 0.18 +
    team.squadRating * 0.17 +
    team.playerForm * 0.15 +
    team.worldCupHistory * 0.10 -
    team.injuryRisk * 0.05 -
    team.travelFatigue * 0.05 -
    team.heatImpact * 0.05
  );
}

function impliedProbability(decimalOdds) {
  return 1 / decimalOdds;
}

function normalizeOdds(homeOdds, drawOdds, awayOdds) {
  const home = impliedProbability(homeOdds);
  const draw = impliedProbability(drawOdds);
  const away = impliedProbability(awayOdds);
  const total = home + draw + away;

  return {
    home: home / total,
    draw: draw / total,
    away: away / total
  };
}

function predictGoals(probHome, probAway, homeStrength, awayStrength) {
  const homeGoals = Math.max(0, Math.round((probHome * 2.8) + (homeStrength - awayStrength) / 35));
  const awayGoals = Math.max(0, Math.round((probAway * 2.4) + (awayStrength - homeStrength) / 40));
  return `${homeGoals}-${awayGoals}`;
}

function scorerPrediction(teamName) {
  const scorers = {
    Argentina: ["Lionel Messi", "Julian Alvarez", "Lautaro Martinez"],
    France: ["Kylian Mbappe", "Antoine Griezmann", "Ousmane Dembele"],
    Brazil: ["Vinicius Junior", "Rodrygo", "Neymar"],
    England: ["Harry Kane", "Bukayo Saka", "Jude Bellingham"],
    Mexico: ["Santiago Gimenez", "Hirving Lozano"],
    "South Africa": ["Percy Tau", "Evidence Makgopa"],
    Canada: ["Jonathan David", "Alphonso Davies"],
    Japan: ["Takefusa Kubo", "Kaoru Mitoma"]
  };

  const list = scorers[teamName] || ["Top attacking player"];
  return list[Math.floor(Math.random() * list.length)];
}

function redCardRisk(team) {
  const risk = Math.min(18, Math.max(3, 6 + team.heatImpact * 0.5 + team.travelFatigue * 0.4));
  return Number(risk.toFixed(1));
}

const predictions = fixtures.map(fixture => {
  const home = teams.find(t => t.name === fixture.home);
  const away = teams.find(t => t.name === fixture.away);

  if (!home || !away) {
    return {
      ...fixture,
      error: "Missing team data"
    };
  }

  const homeStrength = teamScore(home);
  const awayStrength = teamScore(away);

  const modelHome = homeStrength / (homeStrength + awayStrength);
  const modelAway = awayStrength / (homeStrength + awayStrength);
  const modelDraw = 0.24;

  const odds = normalizeOdds(2.1, 3.2, 3.4);

  const finalHome = modelHome * 0.65 + odds.home * 0.35;
  const finalDraw = modelDraw * 0.65 + odds.draw * 0.35;
  const finalAway = modelAway * 0.65 + odds.away * 0.35;

  const total = finalHome + finalDraw + finalAway;

  const homeProb = finalHome / total;
  const drawProb = finalDraw / total;
  const awayProb = finalAway / total;

  return {
    ...fixture,
    probabilities: {
      home: Number((homeProb * 100).toFixed(1)),
      draw: Number((drawProb * 100).toFixed(1)),
      away: Number((awayProb * 100).toFixed(1))
    },
    predictedScore: predictGoals(homeProb, awayProb, homeStrength, awayStrength),
    likelyScorer: homeProb > awayProb ? scorerPrediction(home.name) : scorerPrediction(away.name),
    redCardRisk: {
      [home.name]: redCardRisk(home),
      [away.name]: redCardRisk(away)
    },
    modelNotes: [
      "Prediction combines internal team strength with betting market implied probability.",
      "Odds are weighted at 35% because markets are useful but should not fully override football metrics.",
      "Scorer and red-card predictions are early heuristic estimates until live player data is connected."
    ]
  };
});

fs.writeFileSync("data/predictions.json", JSON.stringify(predictions, null, 2));
console.log("Predictions updated.");