const fs = require("fs");

const teams = JSON.parse(fs.readFileSync("data/teams.json", "utf8"));
const fixtures = JSON.parse(fs.readFileSync("data/fixtures.json", "utf8"));
const stadiums = JSON.parse(fs.readFileSync("data/stadiums.json", "utf8"));
const players = JSON.parse(fs.readFileSync("data/players.json", "utf8"));

function findTeam(name) {
  return teams.find(t => t.name === name);
}

function findStadium(name) {
  return stadiums.find(s => s.name === name);
}

function getTeamPlayers(teamName) {
  return players.filter(p => p.team === teamName);
}

function teamPower(team) {
  const fifaStrength = Math.max(40, 100 - team.fifaRank);

  return (
    team.elo * 0.035 +
    fifaStrength * 0.15 +
    team.recentForm * 0.17 +
    team.worldCupHistory * 0.13 +
    team.squadRating * 0.16 +
    team.attack * 0.12 +
    team.defence * 0.12 -
    team.disciplineRisk * 0.05
  );
}

function stadiumAdjustment(stadium) {
  if (!stadium) return 0;

  const heatPenalty = stadium.heatRisk * 0.25;
  const altitudePenalty = stadium.altitude > 1500 ? 1.5 : stadium.altitude > 800 ? 0.8 : 0;

  return heatPenalty + altitudePenalty;
}

function homeAdvantage(team, stadium) {
  if (!stadium) return 0;

  if (team.name === stadium.country) return 3;

  if (
    (team.name === "Mexico" && stadium.country === "Mexico") ||
    (team.name === "USA" && stadium.country === "USA") ||
    (team.name === "Canada" && stadium.country === "Canada")
  ) {
    return 3.5;
  }

  return 0;
}

function drawProbability(diff) {
  const base = 25;
  const reduction = Math.min(10, Math.abs(diff) * 0.45);
  return Math.max(14, base - reduction);
}

function normalize(homeRaw, drawRaw, awayRaw) {
  const total = homeRaw + drawRaw + awayRaw;

  return {
    home: homeRaw / total,
    draw: drawRaw / total,
    away: awayRaw / total
  };
}

function predictScore(homeProb, awayProb, homeTeam, awayTeam) {
  const homeAttackEdge = homeTeam.attack - awayTeam.defence;
  const awayAttackEdge = awayTeam.attack - homeTeam.defence;

  const homeExpected = 0.8 + homeProb * 2.1 + homeAttackEdge * 0.025;
  const awayExpected = 0.7 + awayProb * 1.9 + awayAttackEdge * 0.025;

  const homeGoals = Math.max(0, Math.min(5, Math.round(homeExpected)));
  const awayGoals = Math.max(0, Math.min(5, Math.round(awayExpected)));

  return `${homeGoals}-${awayGoals}`;
}

function likelyScorer(teamName) {
  const squad = getTeamPlayers(teamName);

  if (!squad.length) {
    return {
      name: "No player data available",
      probability: 0
    };
  }

  const ranked = squad
    .map(player => ({
      ...player,
      scorerScore:
        player.goalThreat * 0.55 +
        player.form * 0.30 +
        player.assistThreat * 0.10 -
        player.redCardRisk * 0.05
    }))
    .sort((a, b) => b.scorerScore - a.scorerScore);

  const top = ranked[0];

  return {
    name: top.name,
    position: top.position,
    probability: Number(Math.min(42, Math.max(8, top.scorerScore / 2.5)).toFixed(1))
  };
}

function redCardRisk(team) {
  const squad = getTeamPlayers(team.name);

  const playerRisk = squad.length
    ? squad.reduce((sum, p) => sum + p.redCardRisk, 0) / squad.length
    : 4;

  const risk =
    team.disciplineRisk * 0.45 +
    playerRisk * 0.35 +
    (100 - team.recentForm) * 0.04;

  return Number(Math.min(25, Math.max(3, risk)).toFixed(1));
}

function confidenceLabel(diff) {
  if (Math.abs(diff) >= 12) return "High";
  if (Math.abs(diff) >= 6) return "Medium";
  return "Low";
}

function predictionNotes(home, away, stadium, homePower, awayPower) {
  const notes = [];

  if (homePower > awayPower) {
    notes.push(`${home.name} rate higher across the model's team strength indicators.`);
  } else {
    notes.push(`${away.name} rate higher across the model's team strength indicators.`);
  }

  if (stadium) {
    notes.push(`Venue factor included: ${stadium.name}, ${stadium.city}, heat risk ${stadium.heatRisk}/10.`);
  }

  notes.push("Model uses Elo seed, FIFA rank strength, recent form, squad strength, attack, defence, World Cup history and discipline risk.");
  notes.push("Scorer and red-card predictions are probabilistic estimates based on player threat and discipline scores.");

  return notes;
}

const predictions = fixtures.map(fixture => {
  const home = findTeam(fixture.home);
  const away = findTeam(fixture.away);
  const stadium = findStadium(fixture.stadium);

  if (!home || !away) {
    return {
      ...fixture,
      error: "Missing team data"
    };
  }

  const venuePenalty = stadiumAdjustment(stadium);

  const homeScore =
    teamPower(home) +
    homeAdvantage(home, stadium) -
    venuePenalty * 0.35;

  const awayScore =
    teamPower(away) +
    homeAdvantage(away, stadium) -
    venuePenalty * 0.35;

  const diff = homeScore - awayScore;

  const draw = drawProbability(diff) / 100;

  const homeRaw = Math.exp(diff / 18);
  const awayRaw = Math.exp(-diff / 18);

  const normal = normalize(homeRaw, draw * 2.5, awayRaw);

  const homeProb = normal.home;
  const drawProb = normal.draw;
  const awayProb = normal.away;

  const predictedWinner =
    homeProb > awayProb && homeProb > drawProb
      ? home.name
      : awayProb > homeProb && awayProb > drawProb
      ? away.name
      : "Draw";

  const attackingTeam = homeProb >= awayProb ? home.name : away.name;

  return {
    id: fixture.id,
    stage: fixture.stage,
    group: fixture.group || null,
    date: fixture.date,
    home: fixture.home,
    away: fixture.away,
    stadium: fixture.stadium,
    city: stadium ? stadium.city : fixture.city || "Unknown",

    probabilities: {
      home: Number((homeProb * 100).toFixed(1)),
      draw: Number((drawProb * 100).toFixed(1)),
      away: Number((awayProb * 100).toFixed(1))
    },

    predictedWinner,
    predictedScore: predictScore(homeProb, awayProb, home, away),
    confidence: confidenceLabel(diff),

    likelyScorer: {
      team: attackingTeam,
      ...likelyScorer(attackingTeam)
    },

    redCardRisk: {
      [home.name]: redCardRisk(home),
      [away.name]: redCardRisk(away)
    },

    modelScores: {
      [home.name]: Number(homeScore.toFixed(1)),
      [away.name]: Number(awayScore.toFixed(1))
    },

    factors: {
      venueHeatRisk: stadium ? stadium.heatRisk : null,
      altitude: stadium ? stadium.altitude : null,
      homeAdvantage: homeAdvantage(home, stadium),
      awayAdvantage: homeAdvantage(away, stadium)
    },

    notes: predictionNotes(home, away, stadium, homeScore, awayScore)
  };
});

fs.writeFileSync("data/predictions.json", JSON.stringify(predictions, null, 2));

console.log(`Predictions updated: ${predictions.length} matches.`);