const fs = require("fs");
const predictions = JSON.parse(fs.readFileSync("data/predictions.json", "utf8"));
const simulation = JSON.parse(fs.readFileSync("data/tournament_simulation.json", "utf8"));
const goldenBoot = JSON.parse(fs.readFileSync("data/golden_boot.json", "utf8"));
const completed = predictions.filter(m => m.actualResult);
const upcoming = predictions.filter(m => !m.actualResult).slice(0, 12);
const topWinners = simulation.winnerProbabilities.slice(0, 10);
const topGolden = goldenBoot.slice(0, 10);
function row(cells) { return `<tr>${cells.map(c => `<td>${c}</td>`).join("")}</tr>`; }
const html = `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>World Cup Predictor Daily Report</title><style>body{font-family:Arial,sans-serif;background:#f6f8fb;color:#0f172a;padding:30px}section{background:white;border:1px solid #e2e8f0;border-radius:18px;padding:20px;margin-bottom:20px}table{width:100%;border-collapse:collapse}td,th{padding:10px;border-bottom:1px solid #e2e8f0;text-align:left}h1,h2{margin-top:0}</style></head><body><h1>World Cup Predictor Daily Report</h1><p>Generated: ${new Date().toLocaleString()}</p><section><h2>Model Performance</h2><p>Matches with results: ${completed.length}</p><p>Correct winner: ${simulation.predictionAccuracy.correctWinnerPercentage}%</p><p>Correct score: ${simulation.predictionAccuracy.correctScorePercentage}%</p><p>Average goal error: ${simulation.predictionAccuracy.averageGoalError}</p></section><section><h2>Top Title Probabilities</h2><table>${topWinners.map(t => row([t.team, `${t.winProbability}%`])).join("")}</table></section><section><h2>Golden Boot Projection</h2><table>${topGolden.map(p => row([p.player, p.team, `${p.probability}%`])).join("")}</table></section><section><h2>Upcoming Predictions</h2><table>${upcoming.map(m => row([`${m.home} vs ${m.away}`, m.predictedScore, m.predictedWinner, m.confidence])).join("")}</table></section></body></html>`;
fs.mkdirSync("reports", { recursive: true });
fs.writeFileSync("reports/daily_report.html", html);
console.log("Daily report generated.");
