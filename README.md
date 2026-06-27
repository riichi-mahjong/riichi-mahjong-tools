# Riichi Mahjong Tools

Public web tools for riichi mahjong calculation and analysis.

Website: https://riichi-mahjong.github.io/riichi-mahjong-tools/

## Tools

### Mahjong Soul Rank Simulator v0.1

URL: https://riichi-mahjong.github.io/riichi-mahjong-tools/tools/rank-simulator/

Estimate Mahjong Soul rank progression under different room, game-length, placement-rate, and score-gain assumptions.

Main features:

* East-South and East-Only simulation
* Gold Room and Jade Room placement distributions
* G/L per round support
* Rounding correction support
* Rank-up and rank-down distribution
* Final, highest, and lowest rank distribution
* First-reach statistics
* Expected point change by rank

### Tsumo Win Probability Calculator v0.1

URL: https://riichi-mahjong.github.io/riichi-mahjong-tools/tools/tsumo/

Estimate tsumo probability and multiple-riichi outcomes.

Main features:

* Single-riichi tsumo probability
* Ippatsu tsumo probability
* Multiple-riichi outcome calculation
* Win rate, tsumo rate, ron win rate, deal-in rate, and no-win rate
* English/Japanese language switch
* Approximate current turn display from remaining live-wall tiles

Calculation warning:

This tool is under development. The calculation logic may contain mistakes, including simulation or implementation bugs, so the displayed values may not match the intended probabilities.

## Development

Install dependencies:

```bash
npm install
```

Run locally:

```bash
npm run dev
```

Open:

```text
http://localhost:3000
```

Check code:

```bash
npm run lint
npm run build
```

## Deployment

This project is deployed to GitHub Pages using GitHub Actions.

The site uses Next.js static export.

## Feedback

Bug reports and improvement suggestions are welcome through GitHub Issues.
