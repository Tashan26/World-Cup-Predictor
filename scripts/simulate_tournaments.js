const fs = require("fs");

const teams = JSON.parse(fs.readFileSync("data/teams.json", "utf8"));
const predictions = JSON.parse(fs.readFileSync("data/predictions.json", "utf8"));

function getTeam(name) {
  return teams.find(t => t.name === name);
}

function teamStrength(team) {
  return (
    team.elo * 0.035 +
    team.recentForm * 0.18 +
    team.squadRating * 0.18 +
    team.attack * 0.14 +
    team.defence * 0.14 +
    team.worldCupHistory * 0.12 -
    team.disciplineRisk * 0.05
  );
}

function expectedResult(match) {
  const home = getTeam(match.home);
  const away = getTeam(match.away);

  const homeStrength = teamStrength(home);
  const awayStrength = teamStrength(away);
  const diff = homeStrength - awayStrength;

  let homeGoals = Math.max(0, Math.round(1.3 + diff / 18));
  let awayGoals = Math.max(0, Math.round(1.2 - diff / 18));

  return { homeGoals, awayGoals };
}

function buildGroupTables() {
  const tables = {};

  teams.forEach(team => {
    if (!tables[team.group]) tables[team.group] = {};

    tables[team.group][team.name] = {
      team: team.name,
      played: 0,
      won: 0,
      drawn: 0,
      lost: 0,
      goalsFor: 0,
      goalsAgainst: 0,
      goalDifference: 0,
      points: 0
    };
  });

  predictions
    .filter(match => match.stage === "Group Stage")
    .forEach(match => {
      const result = expectedResult(match);

      const home = tables[match.group][match.home];
      const away = tables[match.group][match.away];

      home.played++;
      away.played++;

      home.goalsFor += result.homeGoals;
      home.goalsAgainst += result.awayGoals;

      away.goalsFor += result.awayGoals;
      away.goalsAgainst += result.homeGoals;

      if (result.homeGoals > result.awayGoals) {
        home.won++;
        away.lost++;
        home.points += 3;
      } else if (result.homeGoals < result.awayGoals) {
        away.won++;
        home.lost++;
        away.points += 3;
      } else {
        home.drawn++;
        away.drawn++;
        home.points++;
        away.points++;
      }
    });

  const finalTables = {};

  Object.keys(tables).forEach(group => {
    finalTables[group] = Object.values(tables[group])
      .map(team => ({
        ...team,
        goalDifference: team.goalsFor - team.goalsAgainst
      }))
      .sort((a, b) =>
        b.points - a.points ||
        b.goalDifference - a.goalDifference ||
        b.goalsFor - a.goalsFor
      );
  });

  return finalTables;
}

function getQualifiedTeams(groupTables) {
  const qualified = [];

  Object.keys(groupTables).forEach(group => {
    qualified.push({
      ...groupTables[group][0],
      qualification: `Winner Group ${group}`
    });

    qualified.push({
      ...groupTables[group][1],
      qualification: `Runner-up Group ${group}`
    });
  });

  const thirdPlaced = Object.keys(groupTables)
    .map(group => ({
      ...groupTables[group][2],
      qualification: `Third Group ${group}`
    }))
    .sort((a, b) =>
      b.points - a.points ||
      b.goalDifference - a.goalDifference ||
      b.goalsFor - a.goalsFor
    )
    .slice(0, 8);

  return [...qualified, ...thirdPlaced];
}

const groupTables = buildGroupTables();
const qualifiedTeams = getQualifiedTeams(groupTables);

const simulation = {
  generatedAt: new Date().toISOString(),
  groupTables,
  qualifiedTeams
};

fs.writeFileSync("data/tournament_simulation.json", JSON.stringify(simulation, null, 2));

console.log("Tournament simulation generated.");
console.log(`Qualified teams: ${qualifiedTeams.length}`);