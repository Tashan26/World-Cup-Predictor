const fs = require("fs");

const updatesPath = "data/manual_updates.json";
const fixturesPath = "data/fixtures.json";
const teamsPath = "data/teams.json";

const updates = JSON.parse(fs.readFileSync(updatesPath, "utf8"));
let fixtures = JSON.parse(fs.readFileSync(fixturesPath, "utf8"));
let teams = JSON.parse(fs.readFileSync(teamsPath, "utf8"));

fixtures = fixtures.map(fixture => {
  const result = updates.results.find(r => r.matchId === fixture.id);

  if (!result) return fixture;

  return {
    ...fixture,
    actualResult: {
      homeGoals: result.homeGoals,
      awayGoals: result.awayGoals,
      status: result.status || "completed"
    },
    status: result.status || "completed"
  };
});

teams = teams.map(team => {
  const updatedForm = updates.teamFormUpdates[team.name];

  return {
    ...team,
    recentForm: updatedForm !== undefined ? updatedForm : team.recentForm,
    injuries: updates.injuries[team.name] || [],
    suspensions: updates.suspensions[team.name] || [],
    notes: updates.notes[team.name] || ""
  };
});

fs.writeFileSync(fixturesPath, JSON.stringify(fixtures, null, 2));
fs.writeFileSync(teamsPath, JSON.stringify(teams, null, 2));

console.log("Manual updates applied.");
console.log(`Results updated: ${updates.results.length}`);