# Wormhole Mass Calculator

EVE Online wormhole rolling calculator with POMCTS-based strategy recommendations.

## Features

- **POMCTS Algorithm**: Partially Observable Monte Carlo Tree Search for optimal action recommendations
- **Belief State Tracking**: Maintains min/max bounds on remaining wormhole mass
- **Visual State Setup**: Start from Fresh, Normal, Reduced, or Critical states
- **Observation Updates**: Shrink/crit observations narrow belief bounds
- **Action Comparison**: All actions ranked by strategy score with success rates
- **Safe Action Indicators**: Shows which actions have zero rollout risk
- **Trip Distribution**: Probability distribution of expected trips
- **Configurable Iterations**: 1k to 10M MCTS iterations (logarithmic slider)
- **Customizable Ships**: Configure ship masses for different fits

## Default Ship Configuration (Apocalypse + Devoter with Higgs)

| Ship | Hot (MWD) | Cold | Entangled |
|------|-----------|------|-----------|
| Battleship | 294.2M | 194.2M | - |
| HIC | 132.4M | 32.4M | 0.83M |

## Action Pairs

The calculator evaluates all round-trip combinations:

| Action | Out | Back | Total Mass |
|--------|-----|------|------------|
| BS H/H | Hot | Hot | 588.4M |
| BS H/C | Hot | Cold | 488.4M |
| BS C/H | Cold | Hot | 488.4M |
| BS C/C | Cold | Cold | 388.4M |
| HIC H/H | Hot | Hot | 264.8M |
| HIC C/H | Cold | Hot | 164.8M |
| HIC C/C | Cold | Cold | 64.8M |
| HIC E/H | Ent | Hot | 133.2M |
| HIC E/E | Ent | Ent | 1.66M |

## Usage

1. Select initial wormhole state (Fresh/Normal/Reduced/Critical)
2. Optionally enter known mass passed
3. Click "Start Rolling Session"
4. Record each jump using the ship buttons
5. Record observations (Normal/Shrunk/Crit/Closed)
6. Follow the recommended actions based on strategy score

## Strategy Score

Actions are ranked by strategy score, which combines:
- **Success rate**: Probability of completing without rollout
- **Trip decay**: Exponential penalty for more trips (default 0.95^trips)
- **Tiebreaker**: Fewer expected trips preferred

## Development

```bash
npm install
npm run dev      # Start dev server
npm test         # Run tests (watch mode)
npm run test:run # Run tests once
npm run build    # Production build
```

## Project Structure

```
wormhole-calculator/
├── index.html          # Main application (standalone)
├── src/
│   ├── config.ts       # Configuration constants
│   ├── types.ts        # TypeScript type definitions
│   ├── actions.ts      # Ship action definitions
│   └── pomcts/         # POMCTS algorithm
│       ├── node.ts     # POMCTSNode class
│       ├── algorithm.ts# Main MCTS algorithm
│       ├── observation.ts # Belief update logic
│       └── results.ts  # Result extraction
└── tests/
    └── pomcts.test.ts  # Algorithm tests (21 tests)
```

## Algorithm Details

The calculator uses POMCTS (Partially Observable MCTS) which branches on (action, observation) pairs to properly handle Bayesian belief updates.

- **Belief tracking**: Total mass bounds updated by observations
- **Observation branching**: Separate tree branches for fresh/shrink/crit
- **UCB1 selection**: Balances exploration vs exploitation
- **Safe action detection**: Flags actions with zero rollout risk
- **avgSteps correction**: Compensates for MCTS exploration bias

## License

MIT
