const fs = require("fs");

const teams = JSON.parse(fs.readFileSync("data/teams.json", "utf8"));

const stadiums = [
  "Estadio Azteca","Estadio BBVA","Estadio Akron","MetLife Stadium",
  "AT&T Stadium","NRG Stadium","Hard Rock Stadium","Mercedes-Benz Stadium",
  "Lincoln Financial Field","Lumen Field","Levi's Stadium","SoFi Stadium",
  "GEHA Field at Arrowhead Stadium","Gillette Stadium","BC Place","BMO Field"
];

const grouped = {};

teams.forEach(team => {
  if (!grouped[team.group]) grouped[team.group] = [];
  grouped[team.group].push(team.name);
});

const fixtures = [];
let matchNo = 1;
let stadiumIndex = 0;

Object.keys(grouped).sort().forEach(group => {
  const t = grouped[group];

  const pairings = [
    [t[0], t[1]],
    [t[2], t[3]],
    [t[0], t[2]],
    [t[1], t[3]],
    [t[0], t[3]],
    [t[1], t[2]]
  ];

  pairings.forEach((pair, i) => {
    fixtures.push({
      id: `match_${String(matchNo).padStart(3, "0")}`,
      matchNumber: matchNo,
      stage: "Group Stage",
      group,
      date: `2026-06-${String(11 + Math.floor((matchNo - 1) / 4)).padStart(2, "0")}T${i % 2 === 0 ? "18:00:00" : "21:00:00"}+02:00`,
      home: pair[0],
      away: pair[1],
      stadium: stadiums[stadiumIndex % stadiums.length]
    });

    matchNo++;
    stadiumIndex++;
  });
});

fs.writeFileSync("data/fixtures.json", JSON.stringify(fixtures, null, 2));
console.log(`Generated ${fixtures.length} group-stage fixtures.`);