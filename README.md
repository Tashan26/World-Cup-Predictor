# World Cup Predictor

Free GitHub-only World Cup prediction dashboard.

## Features

- Match prediction engine
- Travel fatigue model
- Heat and altitude model
- Group-stage simulation
- 10,000-run Monte Carlo title model
- Golden Boot model
- Knockout bracket generator
- Flag image support
- Dark mode
- GitHub Actions automation

## Run locally in Codespaces

```bash
node scripts/generate_fixtures.js
node scripts/build_predictions.js
node scripts/explain_predictions.js
node scripts/simulate_tournament.js
node scripts/golden_boot.js
node scripts/generate_knockout.js
```

Then commit:

```bash
git add .
git commit -m "Full dashboard and prediction engine upgrade"
git push
```
