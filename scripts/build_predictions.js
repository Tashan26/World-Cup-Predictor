const fs = require("fs");

const teams = JSON.parse(fs.readFileSync("data/teams.json", "utf8"));
const fixtures = JSON.parse(fs.readFileSync("data/fixtures.json", "utf8"));
const stadiums = JSON.parse(fs.readFileSync("data/stadiums.json", "utf8"));
const players = JSON.parse(fs.readFileSync("data/players.json", "utf8"));
const locations = JSON.parse(fs.readFileSync("data/team_locations.json", "utf8"));

function findTeam(name) {
  return teams.find(t => t.name === name);
}

function findStadium(name) {
  return stadiums.find(s => s.name === name);
}

function getTeamPlayers(teamName) {
  return players.filter(p => p.team === teamName);
}

function distanceKm(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;

  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) *
    Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) ** 2;

  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function travelDistance(teamName, stadium) {
  const loc = locations[teamName];

  if (!loc || !stadium) return 0;

  return distanceKm(loc.lat, loc.lon, stadium.latitude, stadium.longitude);
}

function travelPenalty(distance) {
  if (distance < 1500) return 0.2;
  if (distance < 4000) return 0.8;
  if (distance < 7000) return 1.5;
  if (distance < 10000) return 2.2;
  return 3.0;
}

function heatImpact(stadium) {
  if (!stadium) return 0;

  if (stadium.heatRisk >= 9) return 2.2;
  if (stadium.heatRisk >= 7) return 1.5;
  if (stadium.heatRisk >= 5) return 0.8;
  return 0.3;
}

function altitudeImpact(stadium) {
  if (!stadium) return 0;

  if (stadium.altitude >= 1800) return 2.2;
  if (stadium.altitude >= 1000) return 1.2;
  if (stadium.altitude >= 500) return 0.5;
  return 0;
}

function homeAdvantage(team, stadium) {
  if (!stadium) return 0;

  if (
    (team.name === "Mexico" && stadium.country === "Mexico") ||
    (team.name === "USA" && stadium.country === "USA") ||
    (team.name === "Canada" && stadium.country === "Canada")
  ) {
    return 3.5;
  }

  return 0;
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

function normalize(homeRaw, drawRaw, awayRaw) {
  const total = homeRaw + drawRaw + awayRaw;

  return {
    home: homeRaw / total,
    draw: drawRaw / total,
    away: awayRaw / total
  };
}

function drawProbability(diff) {
  const base = 25;
  const reduction = Math.min(10, Math.abs(diff) * 0.45);
  return Math.max(14, base - reduction);
}

function predictScore(homeProb, awayProb, homeTeam, awayTeam, stadium) {
  const heat = heatImpact(stadium);
  const altitude = altitudeImpact(stadium);

  const homeAttackEdge = homeTeam.attack - awayTeam.defence;
  const awayAttackEdge = awayTeam.attack - homeTeam.defence;

  let homeExpected = 0.8 + homeProb * 2.1 + homeAttackEdge * 0.025;
  let awayExpected = 0.7 + awayProb * 1.9 + awayAttackEdge * 0.025;

  if (heat >= 1.5) {
    homeExpected -= 0.15;
    awayExpected -= 0.15;
  }

  if (altitude >= 1.2) {
    homeExpected -= 0.1;
    awayExpected -= 0.1;
  }

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

function redCardRisk(team, stadium) {
  const squad = getTeamPlayers(team.name);

  const playerRisk = squad.length
    ? squad.reduce((sum, p) => sum + p.redCardRisk, 0) / squad.length
    : 4;

  const risk =
    team.disciplineRisk * 0.45 +
    playerRisk * 0.35 +
    (100 - team.recentForm) * 0.04 +
    heatImpact(stadium) * 0.4;

  return Number(Math.min(25, Math.max(3, risk)).toFixed(1));
}

function confidenceLabel(diff) {
  if (Math.abs(diff) >= 12) return "High";
  if (Math.abs(diff) >= 6) return "Medium";
  return "Low";
}

function travelLabel(distance) {
  if (distance >= 10000) return "Very high";
  if (distance >= 7000) return "High";
  if (distance >= 4000) return "Medium";
  return "Low";
}

function heatLabel(stadium) {
  if (!stadium) return "Unknown";
  if (stadium.heatRisk >= 9) return "Very high";
  if (stadium.heatRisk >= 7) return "High";
  if (stadium.heatRisk >= 5) return "Medium";
  return "Low";
}

function altitudeLabel(stadium) {
  if (!stadium) return "Unknown";
  if (stadium.altitude >= 1800) return "Very high";
  if (stadium.altitude >= 1000) return "High";
  if (stadium.altitude >= 500) return "Medium";
  return "Low";
}

function predictionNotes(home, away, stadium, homeTravel, awayTravel, homePower, awayPower) {
  const notes = [];

  notes.push(
    homePower > awayPower
      ? `${home.name} rate higher overall in the model.`
      : `${away.name} rate higher overall in the model.`
  );

  notes.push(`${home.name} travel distance: ${Math.round(homeTravel)} km. ${away.name} travel distance: ${Math.round(awayTravel)} km.`);

  if (stadium) {
    notes.push(`Venue: ${stadium.name}, ${stadium.city}. Heat impact: ${heatLabel(stadium)}. Altitude impact: ${altitudeLabel(stadium)}.`);
  }

  notes.push("Model includes Elo seed, FIFA rank strength, form, squad quality, attack, defence, World Cup history, discipline, travel, heat and altitude.");

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

  const homeTravel = travelDistance(home.name, stadium);
  const awayTravel = travelDistance(away.name, stadium);

  const homeTravelPenalty = travelPenalty(homeTravel);
  const awayTravelPenalty = travelPenalty(awayTravel);

  const venueHeat = heatImpact(stadium);
  const venueAltitude = altitudeImpact(stadium);

  const homeScore =
    teamPower(home) +
    homeAdvantage(home, stadium) -
    homeTravelPenalty -
    venueHeat * 0.3 -
    venueAltitude * 0.3;

  const awayScore =
    teamPower(away) +
    homeAdvantage(away, stadium) -
    awayTravelPenalty -
    venueHeat * 0.3 -
    venueAltitude * 0.3;

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
    matchNumber: fixture.matchNumber,
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
    predictedScore: predictScore(homeProb, awayProb, home, away, stadium),
    confidence: confidenceLabel(diff),

    likelyScorer: {
      team: attackingTeam,
      ...likelyScorer(attackingTeam)
    },

    redCardRisk: {
      [home.name]: redCardRisk(home, stadium),
      [away.name]: redCardRisk(away, stadium)
    },

    modelScores: {
      [home.name]: Number(homeScore.toFixed(1)),
      [away.name]: Number(awayScore.toFixed(1))
    },

    travel: {
      [home.name]: {
        distanceKm: Math.round(homeTravel),
        penalty: Number(homeTravelPenalty.toFixed(1)),
        impact: travelLabel(homeTravel)
      },
      [away.name]: {
        distanceKm: Math.round(awayTravel),
        penalty: Number(awayTravelPenalty.toFixed(1)),
        impact: travelLabel(awayTravel)
      }
    },

    factors: {
      venueHeatRisk: stadium ? stadium.heatRisk : null,
      heatImpact: heatLabel(stadium),
      altitude: stadium ? stadium.altitude : null,
      altitudeImpact: altitudeLabel(stadium),
      homeAdvantage: homeAdvantage(home, stadium),
      awayAdvantage: homeAdvantage(away, stadium)
    },

    notes: predictionNotes(home, away, stadium, homeTravel, awayTravel, homeScore, awayScore)
  };
});

fs.writeFileSync("data/predictions.json", JSON.stringify(predictions, null, 2));

console.log(`Predictions updated: ${predictions.length} matches.`);