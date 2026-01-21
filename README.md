# Wormhole Mass Calculator

EVE Online wormhole rolling calculator with POMCTS-based strategy recommendations.

## Features

- Track wormhole mass usage across jumps
- POMCTS (Partially Observable Monte Carlo Tree Search) algorithm for optimal action recommendations
- Belief state updates from shrink/crit observations
- Trip distribution predictions
- Support for different ship configurations (BS, HIC)

## Wormhole Mechanics (C247)

| Parameter | Value |
|-----------|-------|
| Total mass | 2000M +/-10% (1800-2200M) |
| Shrink threshold | 50% remaining |
| Crit threshold | 10% remaining |
| BS Hot | 300M |
| BS Cold | 200M |
| HIC Hot | 134M |
| HIC Cold | 30M |
| HIC Ent | 1.5M |

## Strategy Overview

### Fresh Hole
- Recommended: 4x BS Cold->Hot (200M out + 300M back = 500M/trip)
- Total: ~2000M over 4 trips
- Success rate: >95%

### After Shrink (50%)
- Continue with BS if safe
- Consider HIC for precision near crit

### Critical (<10%)
- Use HIC for controlled final passes
- HIC Ent allows extremely precise mass control

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
├── package.json        # npm configuration
├── tsconfig.json       # TypeScript configuration
├── vite.config.ts      # Vite build configuration
├── src/
│   ├── config.ts       # Configuration constants
│   ├── types.ts        # TypeScript type definitions
│   ├── actions.ts      # Ship action definitions
│   └── pomcts/         # POMCTS algorithm
│       ├── index.ts    # Module exports
│       ├── node.ts     # POMCTSNode class
│       ├── algorithm.ts# Main MCTS algorithm
│       ├── observation.ts # Belief update logic
│       └── results.ts  # Result extraction
└── tests/
    └── pomcts.test.ts  # POMCTS algorithm tests
```

## Algorithm

The calculator uses POMCTS (Partially Observable MCTS) which branches on (action, observation) pairs rather than just actions. This properly handles the Bayesian belief updates when observing wormhole state changes.

Key features:
- **Belief tracking**: Maintains min/max bounds on total wormhole mass
- **Observation branching**: Tree branches handle fresh/shrink/crit observations
- **UCB1 selection**: Balances exploration and exploitation
- **Action filtering**: Excludes inefficient actions (e.g., HIC E/E on fresh holes)
- **Success rate sorting**: Recommends actions by success rate, not just visit count

## License

MIT
