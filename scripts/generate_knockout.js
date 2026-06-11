const fs = require("fs");

const simulation = JSON.parse(fs.readFileSync("data/tournament_simulation.json", "utf8"));

const qualified = simulation.qualifiedTeams.slice(0, 32);

function pairTeams(teams) {
  const pairs = [];

  for (let i = 0; i < teams.length; i += 2) {
    pairs.push({
      home: teams[i]?.team || "TBD",
      away: teams[i + 1]?.team || "TBD",
      homeQualification: teams[i]?.qualification || "",
      awayQualification: teams[i + 1]?.qualification || ""
    });
  }

  return pairs;
}

const knockout = {
  generatedAt: new Date().toISOString(),
  rounds: [
    {
      name: "Round of 32",
      matches: pairTeams(qualified)
    },
    {
      name: "Round of 16",
      matches: Array.from({ length: 8 }, (_, i) => ({
        home: `Winner R32-${i * 2 + 1}`,
        away: `Winner R32-${i * 2 + 2}`
      }))
    },
    {
      name: "Quarter Finals",
      matches: Array.from({ length: 4 }, (_, i) => ({
        home: `Winner R16-${i * 2 + 1}`,
        away: `Winner R16-${i * 2 + 2}`
      }))
    },
    {
      name: "Semi Finals",
      matches: [
        { home: "Winner QF-1", away: "Winner QF-2" },
        { home: "Winner QF-3", away: "Winner QF-4" }
      ]
    },
    {
      name: "Final",
      matches: [
        { home: "Winner SF-1", away: "Winner SF-2" }
      ]
    }
  ]
};

fs.writeFileSync("data/knockout.json", JSON.stringify(knockout, null, 2));

console.log("Knockout bracket generated.");