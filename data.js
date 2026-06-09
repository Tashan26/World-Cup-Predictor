const teams = [
  "Argentina","France","Brazil","England","Spain","Germany","Portugal","Netherlands",
  "Belgium","Italy","Croatia","Uruguay","Colombia","Mexico","USA","Canada",
  "Morocco","Senegal","Japan","South Korea","Australia","Switzerland","Denmark","Serbia",
  "Poland","Austria","Turkey","Ecuador","Chile","Paraguay","Peru","Costa Rica",
  "Ghana","Nigeria","Cameroon","Tunisia","Egypt","Algeria","South Africa","Saudi Arabia",
  "Iran","Qatar","UAE","New Zealand","Wales","Scotland","Ukraine","Norway"
].map((name, i) => ({
  name,
  elo: 95 - Math.floor(i / 2),
  form: 90 - Math.floor(i / 3),
  worldCupHistory: Math.max(55, 96 - i),
  squadRating: Math.max(58, 94 - Math.floor(i / 2)),
  travelFatigue: Math.floor(Math.random() * 10) + 3,
  heatImpact: Math.floor(Math.random() * 10) + 3,
  playerForm: Math.max(55, 92 - Math.floor(i / 2)),
  injuryRisk: Math.floor(Math.random() * 15)
}));

const knowledgeBase = [
  {
    keyword: "model",
    answer: "The model currently uses Elo-style strength, recent form, squad quality, player form, World Cup history, heat impact, travel fatigue and injury risk."
  },
  {
    keyword: "monte carlo",
    answer: "The simulator runs repeated tournament-style calculations to estimate which teams are most likely to progress or win."
  },
  {
    keyword: "france",
    answer: "France rate highly because of squad depth, player quality and strong recent World Cup performance."
  },
  {
    keyword: "argentina",
    answer: "Argentina rate highly due to recent tournament success, cohesion and strong knockout experience."
  },
  {
    keyword: "brazil",
    answer: "Brazil rate highly because of attacking quality, World Cup pedigree and strong squad depth."
  }
];

const bracketRounds = [
  {
    title: "Round of 32",
    matches: ["Argentina vs Canada", "France vs Japan", "Brazil vs Ghana", "England vs USA"]
  },
  {
    title: "Round of 16",
    matches: ["Argentina vs Japan", "Brazil vs England"]
  },
  {
    title: "Semi Finals",
    matches: ["Argentina vs Brazil", "France vs Spain"]
  },
  {
    title: "Final",
    matches: ["Argentina vs France"]
  }
];