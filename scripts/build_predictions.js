const fs = require("fs");

const teams = JSON.parse(fs.readFileSync("data/teams.json", "utf8"));
const fixtures = JSON.parse(fs.readFileSync("data/fixtures.json", "utf8"));
const stadiums = JSON.parse(fs.readFileSync("data/stadiums.json", "utf8"));
const players = JSON.parse(fs.readFileSync("data/players.json", "utf8"));
const locations = JSON.parse(fs.readFileSync("data/team_locations.json", "utf8"));

const findTeam = name => teams.find(t => t.name === name);
const findStadium = name => stadiums.find(s => s.name === name);
const getTeamPlayers = teamName => players.filter(p => p.team === teamName);

function distanceKm(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 +
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
  if ((team.name === "Mexico" && stadium.country === "Mexico") ||
      (team.name === "USA" && stadium.country === "USA") ||
      (team.name === "Canada" && stadium.country === "Canada")) return 3.5;
  return 0;
}

function teamPower(team) {
  const fifaStrength = Math.max(40, 100 - team.fifaRank);
  const injuryPenalty = (team.injuries || []).length * 1.1;
  const suspensionPenalty = (team.suspensions || []).length * 1.5;
  return team.elo * 0.035 +
    fifaStrength * 0.15 +
    team.recentForm * 0.17 +
    team.worldCupHistory * 0.13 +
    team.squadRating * 0.16 +
    team.attack * 0.12 +
    team.defence * 0.12 -
    team.disciplineRisk * 0.05 -
    injuryPenalty -
    suspensionPenalty;
}

function normalize(homeRaw, drawRaw, awayRaw) {
  const total = homeRaw + drawRaw + awayRaw;
  return { home: homeRaw / total, draw: drawRaw / total, away: awayRaw / total };
}

function drawProbability(diff) {
  return Math.max(14, 25 - Math.min(10, Math.abs(diff) * 0.45));
}

function predictScore(homeProb, awayProb, homeTeam, awayTeam, stadium) {
  const homeAttackEdge = homeTeam.attack - awayTeam.defence;
  const awayAttackEdge = awayTeam.attack - homeTeam.defence;
  let homeExpected = 0.8 + homeProb * 2.1 + homeAttackEdge * 0.025;
  let awayExpected = 0.7 + awayProb * 1.9 + awayAttackEdge * 0.025;
  if (heatImpact(stadium) >= 1.5) { homeExpected -= 0.15; awayExpected -= 0.15; }
  if (altitudeImpact(stadium) >= 1.2) { homeExpected -= 0.1; awayExpected -= 0.1; }
  return `${Math.max(0, Math.min(5, Math.round(homeExpected)))}-${Math.max(0, Math.min(5, Math.round(awayExpected)))}`;
}

function likelyScorer(teamName) {
  const squad = getTeamPlayers(teamName);
  if (!squad.length) return { name: "No player data available", probability: 0 };
  const top = squad.map(player => ({
    ...player,
    scorerScore: player.goalThreat * 0.55 + player.form * 0.30 + player.assistThreat * 0.10 - player.redCardRisk * 0.05
  })).sort((a, b) => b.scorerScore - a.scorerScore)[0];
  return { name: top.name, position: top.position, probability: Number(Math.min(42, Math.max(8, top.scorerScore / 2.5)).toFixed(1)) };
}

function redCardRisk(team, stadium) {
  const squad = getTeamPlayers(team.name);
  const playerRisk = squad.length ? squad.reduce((sum, p) => sum + p.redCardRisk, 0) / squad.length : 4;
  const risk = team.disciplineRisk * 0.45 + playerRisk * 0.35 + (100 - team.recentForm) * 0.04 + heatImpact(stadium) * 0.4;
  return Number(Math.min(25, Math.max(3, risk)).toFixed(1));
}

function labelFrom(value, thresholds) {
  if (value >= thresholds.veryHigh) return "Very high";
  if (value >= thresholds.high) return "High";
  if (value >= thresholds.medium) return "Medium";
  return "Low";
}

function predictionNotes(home, away, stadium, homeTravel, awayTravel, homePower, awayPower) {
  const notes = [];
  notes.push(homePower > awayPower ? `${home.name} rate higher overall in the model.` : `${away.name} rate higher overall in the model.`);
  notes.push(`${home.name} travel distance: ${Math.round(homeTravel)} km. ${away.name} travel distance: ${Math.round(awayTravel)} km.`);
  if (stadium) notes.push(`Venue: ${stadium.name}, ${stadium.city}. Heat risk ${stadium.heatRisk}/10. Altitude ${stadium.altitude}m.`);
  notes.push("Model includes Elo seed, FIFA rank strength, form, squad quality, attack, defence, World Cup history, discipline, travel, heat and altitude.");
  return notes;
}

const predictions = fixtures.map(fixture => {
  const home = findTeam(fixture.home);
  const away = findTeam(fixture.away);
  const stadium = findStadium(fixture.stadium);
  if (!home || !away) return { ...fixture, error: "Missing team data" };

  const homeTravel = travelDistance(home.name, stadium);
  const awayTravel = travelDistance(away.name, stadium);

  const homeScore = teamPower(home) + homeAdvantage(home, stadium) - travelPenalty(homeTravel) - heatImpact(stadium) * 0.3 - altitudeImpact(stadium) * 0.3;
  const awayScore = teamPower(away) + homeAdvantage(away, stadium) - travelPenalty(awayTravel) - heatImpact(stadium) * 0.3 - altitudeImpact(stadium) * 0.3;
  const diff = homeScore - awayScore;

  const draw = drawProbability(diff) / 100;
  const normal = normalize(Math.exp(diff / 18), draw * 2.5, Math.exp(-diff / 18));
  const predictedWinner = normal.home > normal.away && normal.home > normal.draw ? home.name : normal.away > normal.home && normal.away > normal.draw ? away.name : "Draw";
  const attackingTeam = normal.home >= normal.away ? home.name : away.name;

  return {
    ...fixture,
    city: stadium ? stadium.city : "Unknown",
    probabilities: {
      home: Number((normal.home * 100).toFixed(1)),
      draw: Number((normal.draw * 100).toFixed(1)),
      away: Number((normal.away * 100).toFixed(1))
    },
    predictedWinner,
    predictedScore: predictScore(normal.home, normal.away, home, away, stadium),
    confidence: Math.abs(diff) >= 12 ? "High" : Math.abs(diff) >= 6 ? "Medium" : "Low",
    likelyScorer: { team: attackingTeam, ...likelyScorer(attackingTeam) },
    redCardRisk: { [home.name]: redCardRisk(home, stadium), [away.name]: redCardRisk(away, stadium) },
    modelScores: { [home.name]: Number(homeScore.toFixed(1)), [away.name]: Number(awayScore.toFixed(1)) },
    travel: {
      [home.name]: { distanceKm: Math.round(homeTravel), penalty: travelPenalty(homeTravel), impact: labelFrom(homeTravel, {medium:4000, high:7000, veryHigh:10000}) },
      [away.name]: { distanceKm: Math.round(awayTravel), penalty: travelPenalty(awayTravel), impact: labelFrom(awayTravel, {medium:4000, high:7000, veryHigh:10000}) }
    },
    factors: {
      venueHeatRisk: stadium ? stadium.heatRisk : null,
      heatImpact: stadium ? labelFrom(stadium.heatRisk, {medium:5, high:7, veryHigh:9}) : "Unknown",
      altitude: stadium ? stadium.altitude : null,
      altitudeImpact: stadium ? labelFrom(stadium.altitude, {medium:500, high:1000, veryHigh:1800}) : "Unknown",
      homeAdvantage: homeAdvantage(home, stadium),
      awayAdvantage: homeAdvantage(away, stadium)
    },
    injuries: { [home.name]: home.injuries || [], [away.name]: away.injuries || [] },
    suspensions: { [home.name]: home.suspensions || [], [away.name]: away.suspensions || [] },
    notes: predictionNotes(home, away, stadium, homeTravel, awayTravel, homeScore, awayScore)
  };
});

fs.writeFileSync("data/predictions.json", JSON.stringify(predictions, null, 2));
console.log(`Predictions updated: ${predictions.length} matches.`);
