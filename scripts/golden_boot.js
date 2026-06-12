const fs = require("fs");

const players = JSON.parse(fs.readFileSync("data/players.json", "utf8"));
const simulation = JSON.parse(fs.readFileSync("data/tournament_simulation.json", "utf8"));

const teamBoost = Object.fromEntries((simulation.winnerProbabilities || []).map(t => [t.team, t.winProbability]));

const goldenBoot = players.map(player => ({
  player: player.name,
  team: player.team,
  score: player.goalThreat * 0.58 + player.form * 0.25 + player.assistThreat * 0.09 - player.redCardRisk * 0.04 + (teamBoost[player.team] || 1) * 0.6
})).sort((a,b) => b.score-a.score).slice(0,25);

const total = goldenBoot.reduce((sum,p) => sum + p.score, 0);
const results = goldenBoot.map(player => ({ ...player, probability: Number(((player.score / total) * 100).toFixed(2)) }));

fs.writeFileSync("data/golden_boot.json", JSON.stringify(results, null, 2));
console.log("Golden Boot predictions generated.");
