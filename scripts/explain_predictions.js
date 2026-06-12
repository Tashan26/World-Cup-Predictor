const fs = require("fs");

const teams = JSON.parse(fs.readFileSync("data/teams.json", "utf8"));
const predictions = JSON.parse(fs.readFileSync("data/predictions.json", "utf8"));

const getTeam = name => teams.find(t => t.name === name);

function compare(home, away) {
  return [
    { label: "Elo strength", home: home.elo, away: away.elo },
    { label: "Recent form", home: home.recentForm, away: away.recentForm },
    { label: "Squad rating", home: home.squadRating, away: away.squadRating },
    { label: "Attack", home: home.attack, away: away.attack },
    { label: "Defence", home: home.defence, away: away.defence },
    { label: "World Cup history", home: home.worldCupHistory, away: away.worldCupHistory },
    { label: "Lower discipline risk", home: away.disciplineRisk, away: home.disciplineRisk }
  ];
}

const explained = predictions.map(match => {
  const home = getTeam(match.home);
  const away = getTeam(match.away);
  if (!home || !away) return match;

  const comparisons = compare(home, away).map(item => {
    const diff = item.home - item.away;
    return {
      factor: item.label,
      advantage: diff > 0 ? home.name : diff < 0 ? away.name : "Even",
      difference: Math.abs(diff)
    };
  });

  const strongestFactors = comparisons
    .filter(x => x.advantage !== "Even")
    .sort((a, b) => b.difference - a.difference)
    .slice(0, 4);

  return {
    ...match,
    explanation: {
      summary: `${match.predictedWinner} is favoured because of advantages across ${strongestFactors.map(f => f.factor.toLowerCase()).join(", ")}.`,
      strongestFactors,
      comparisonTable: comparisons
    }
  };
});

fs.writeFileSync("data/predictions.json", JSON.stringify(explained, null, 2));
console.log("Prediction explanations added.");
