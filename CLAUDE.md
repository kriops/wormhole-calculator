# Wormhole Calculator - Claude Context

## Project Overview

EVE Online wormhole mass calculator that uses POMCTS (Partially Observable Monte Carlo Tree Search) to recommend optimal rolling strategies.

## Key Concepts

- **Belief state**: Uncertainty about total wormhole mass (min/max bounds)
- **Observations**: Shrink (50% threshold) and Crit (10% threshold) narrow beliefs
- **POMCTS**: Tree branches on (action, observation) pairs for proper Bayesian updates
- **Rolling**: The process of collapsing a wormhole by jumping mass through it

## Architecture

```
src/
├── config.ts       # CONFIG constants (mass values, thresholds, simulation count)
├── types.ts        # TypeScript interfaces
├── actions.ts      # SINGLE_JUMPS and ACTIONS definitions
└── pomcts/         # Core algorithm (pure functions, no DOM)
    ├── index.ts    # Module exports
    ├── node.ts     # POMCTSNode class - tree node representation
    ├── algorithm.ts# runPOMCTS - main MCTS loop
    ├── observation.ts # computeObservation, updateTotalBelief
    └── results.ts  # getMCTSActionResults, getMCTSTripDistribution
```

## Important Files

- **index.html**: Self-contained application with inline JS (standalone, no build needed)
- **src/pomcts/**: Extracted TypeScript modules for testing
- **tests/pomcts.test.ts**: Vitest tests for algorithm correctness (21 tests)

## Test Commands

```bash
npm test              # Watch mode
npm run test:run      # Single run
```

## Configuration

Edit `src/config.ts` to adjust:
- `simulations`: Number of MCTS iterations (default: 1,000,000)
- `maxDepth`: Maximum simulation depth (default: 20 trips)
- `tripDecay`: Exponential decay per trip (default: 0.95)
- Ship masses: `bsHot`, `bsCold`, `hicHot`, `hicCold`, `hicEnt`

Note: The UI has a logarithmic iteration slider (10^3 to 10^7).

## Running Locally

1. Open `index.html` in a browser (no build needed)
2. Or use Vite: `npm run dev`

## Key Functions

### runPOMCTS(startMin, startMax, initialMassUsed, numIterations)
Main entry point. Returns root node of search tree.

### getMCTSActionResults(root)
Extracts action recommendations sorted by strategyScore (success rate × trip decay).
Tiebreaker: fewer expected trips preferred.

### computeObservation(trueMass, massUsed)
Returns 'fresh', 'shrink', 'crit', or 'collapsed'.

### updateTotalBelief(belief, massUsed, observation)
Narrows belief bounds based on observation.

## Belief Semantics

- `knownMinStart` / `knownMaxStart`: TOTAL mass bounds (not remaining)
- Remaining = Total - massUsed
- Observations constrain TOTAL bounds, not remaining bounds

## Action Results

Each action result contains:
- `successRate`: Probability of completing without rollout
- `strategyScore`: successRate × (tripDecay ^ avgTrips)
- `avgSteps`: Expected number of trips
- `guaranteedSafe`: True if remaining.min > action.out (zero rollout risk)
