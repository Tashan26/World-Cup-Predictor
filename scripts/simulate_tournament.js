const fs = require("fs");

const teams = JSON.parse(fs.readFileSync("data/teams.json", "utf8"));
const predictions = JSON.parse(fs.readFileSync("data/predictions.json", "utf8"));

const getTeam = name => teams.find(t => t.name === name);

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

function simulateScore(home, away, match) {
  if (match.actualResult) {
    return {
      homeGoals: Number(match.actualResult.homeGoals),
      awayGoals: Number(match.actualResult.awayGoals)
    };
  }

  const diff = teamStrength(home) - teamStrength(away);

  return {
    homeGoals: Math.max(0, Math.round(1.25 + diff / 20 + Math.random() * 1.6)),
    awayGoals: Math.max(0, Math.round(1.15 - diff / 20 + Math.random() * 1.6))
  };
}

function predictedScore(match) {
  if (match.actualResult) {
    return {
      homeGoals: Number(match.actualResult.homeGoals),
      awayGoals: Number(match.actualResult.awayGoals)
    };
  }

  return {
    homeGoals: Number(match.predictedScore.split("-")[0]),
    awayGoals: Number(match.predictedScore.split("-")[1])
  };
}

function simulateWinner(teamA, teamB) {
  const scoreA = teamStrength(getTeam(teamA)) + Math.random() * 18;
  const scoreB = teamStrength(getTeam(teamB)) + Math.random() * 18;

  return scoreA >= scoreB ? teamA : teamB;
}

function emptyTables() {
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

  return tables;
}

function applyResultToTable(tables, match, result) {
  const homeRow = tables[match.group][match.home];
  const awayRow = tables[match.group][match.away];

  homeRow.played++;
  awayRow.played++;

  homeRow.goalsFor += result.homeGoals;
  homeRow.goalsAgainst += result.awayGoals;

  awayRow.goalsFor += result.awayGoals;
  awayRow.goalsAgainst += result.homeGoals;

  if (result.homeGoals > result.awayGoals) {
    homeRow.won++;
    awayRow.lost++;
    homeRow.points += 3;
  } else if (result.homeGoals < result.awayGoals) {
    awayRow.won++;
    homeRow.lost++;
    awayRow.points += 3;
  } else {
    homeRow.drawn++;
    awayRow.drawn++;
    homeRow.points++;
    awayRow.points++;
  }
}

function sortTables(tables) {
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
        b.goalsFor - a.goalsFor ||
        teamStrength(getTeam(b.team)) - teamStrength(getTeam(a.team))
      );
  });

  return finalTables;
}

function buildGroupTables(randomized = false) {
  const tables = emptyTables();

  predictions
    .filter(match => match.stage === "Group Stage")
    .forEach(match => {
      const home = getTeam(match.home);
      const away = getTeam(match.away);

      const result = randomized
        ? simulateScore(home, away, match)
        : predictedScore(match);

      applyResultToTable(tables, match, result);
    });

  return sortTables(tables);
}

function getQualifiedTeams(groupTables) {
  const qualified = [];

  Object.keys(groupTables).sort().forEach(group => {
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
      b.goalsFor - a.goalsFor ||
      teamStrength(getTeam(b.team)) - teamStrength(getTeam(a.team))
    )
    .slice(0, 8);

  return [...qualified, ...thirdPlaced];
}

function simulateKnockout(qualified) {
  let round = qualified.map(t => t.team);

  while (round.length > 1) {
    const nextRound = [];

    for (let i = 0; i < round.length; i += 2) {
      nextRound.push(simulateWinner(round[i], round[i + 1]));
    }

    round = nextRound;
  }

  return round[0];
}

function monteCarlo(runs = 10000) {
  const winnerCounts = {};
  const qualifyCounts = {};
  const groupWinCounts = {};
  const runnerUpCounts = {};
  const thirdPlaceQualifyCounts = {};

  teams.forEach(team => {
    winnerCounts[team.name] = 0;
    qualifyCounts[team.name] = 0;
    groupWinCounts[team.name] = 0;
    runnerUpCounts[team.name] = 0;
    thirdPlaceQualifyCounts[team.name] = 0;
  });

  for (let i = 0; i < runs; i++) {
    const tables = buildGroupTables(true);
    const qualified = getQualifiedTeams(tables);

    Object.keys(tables).forEach(group => {
      const winner = tables[group][0].team;
      const runnerUp = tables[group][1].team;

      groupWinCounts[winner]++;
      runnerUpCounts[runnerUp]++;
    });

    qualified.forEach(team => {
      qualifyCounts[team.team]++;

      if (team.qualification.startsWith("Third Group")) {
        thirdPlaceQualifyCounts[team.team]++;
      }
    });

    const winner = simulateKnockout(qualified);
    winnerCounts[winner]++;
  }

  const winnerProbabilities = Object.entries(winnerCounts)
    .map(([team, wins]) => ({
      team,
      winProbability: Number(((wins / runs) * 100).toFixed(2))
    }))
    .sort((a, b) => b.winProbability - a.winProbability);

  const qualificationProbabilities = Object.entries(qualifyCounts)
    .map(([team, count]) => ({
      team,
      group: getTeam(team).group,
      qualifyProbability: Number(((count / runs) * 100).toFixed(2)),
      groupWinProbability: Number(((groupWinCounts[team] / runs) * 100).toFixed(2)),
      runnerUpProbability: Number(((runnerUpCounts[team] / runs) * 100).toFixed(2)),
      thirdPlaceQualifyProbability: Number(((thirdPlaceQualifyCounts[team] / runs) * 100).toFixed(2))
    }))
    .sort((a, b) =>
      a.group.localeCompare(b.group) ||
      b.qualifyProbability - a.qualifyProbability
    );

  return {
    winnerProbabilities,
    qualificationProbabilities
  };
}

const groupTables = buildGroupTables(false);
const qualifiedTeams = getQualifiedTeams(groupTables);
const monteCarloResults = monteCarlo(10000);

const simulation = {
  generatedAt: new Date().toISOString(),
  groupTables,
  qualifiedTeams,
  winnerProbabilities: monteCarloResults.winnerProbabilities,
  qualificationProbabilities: monteCarloResults.qualificationProbabilities
};

fs.writeFileSync(
  "data/tournament_simulation.json",
  JSON.stringify(simulation, null, 2)
);

console.log("Tournament simulation generated.");
console.log(`Qualified teams: ${qualifiedTeams.length}`);
console.log("Top winner:", monteCarloResults.winnerProbabilities[0]);
console.log("Qualification probabilities generated.");