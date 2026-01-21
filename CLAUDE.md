# Wormhole Calculator - Claude Context

## Project Overview

EVE Online wormhole mass calculator that uses POMCTS (Partially Observable Monte Carlo Tree Search) to recommend optimal rolling strategies.

## Key Concepts

- **Belief state**: Uncertainty about remaining wormhole mass (min/max bounds)
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
    ├── node.ts     # POMCTSNode class - tree node representation
    ├── algorithm.ts# runPOMCTS - main MCTS loop
    ├── observation.ts # computeObservation, updateTotalBelief
    └── results.ts  # getMCTSActionResults, getMCTSTripDistribution
```

## Important Files

- **index.html**: Self-contained application with inline JS (legacy, still works standalone)
- **src/pomcts/**: Extracted TypeScript modules for testing
- **tests/pomcts.test.ts**: Vitest tests for algorithm correctness

## Test Commands

```bash
npm test              # Watch mode
npm run test:run      # Single run
```

## Expected Behavior

| Scenario | Expected Action | Trips | Success Rate |
|----------|----------------|-------|--------------|
| Fresh hole (0 used) | BS H/H or BS C/H | ~4 | >95% |
| After 1000M used | BS H/H or BS C/H | ~2 | >90% |
| Near crit | HIC for precision | varies | depends on remaining |

## Common Bugs and Fixes

### Results sorting
- **Bug**: Sorting by `visits` instead of `successRate` causes HIC E/E to rank first
- **Fix**: Sort by successRate, use visits as tiebreaker

### Action filtering
- **Bug**: HIC E/E explored on fresh holes despite being inefficient
- **Fix**: Filter out actions where trip mass < (remaining / 15)

### Observation glow
- **Bug**: Observation buttons always glow after any jump
- **Fix**: Only glow when threshold crossing is plausible based on mass used

## Configuration

Edit `src/config.ts` to adjust:
- `simulations`: Number of MCTS iterations (default: 200,000)
- `maxDepth`: Maximum simulation depth (default: 20 trips)
- `maxReasonableTrips`: Filter threshold (default: 15)
- Ship masses: `bsHot`, `bsCold`, `hicHot`, `hicCold`, `hicEnt`

## Running Locally

1. Open `index.html` in a browser (no build needed)
2. Or use Vite: `npm run dev`

## Key Functions

### runPOMCTS(startMin, startMax, initialMassUsed, numIterations)
Main entry point. Returns root node of search tree.

### getMCTSActionResults(root)
Extracts action recommendations sorted by success rate.

### computeObservation(trueMass, massUsed)
Returns 'fresh', 'shrink', 'crit', or 'collapsed'.

### updateTotalBelief(belief, massUsed, observation)
Narrows belief bounds based on observation.
