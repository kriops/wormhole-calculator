// Wormhole Calculator Configuration

export const CONFIG = {
  // C247 wormhole parameters
  baseMass: 2000,      // Base mass in millions (M)
  variance: 0.10,      // ±10% variance

  // Ship masses (Apocalypse + Devoter with Higgs)
  bsHot: 294.2,        // Apocalypse hot (higgs + MWD)
  bsCold: 194.2,       // Apocalypse cold (higgs, no MWD)
  hicHot: 132.4,       // Devoter hot (higgs + MWD)
  hicCold: 32.4,       // Devoter cold (higgs, no MWD)
  hicEnt: 0.83,        // Devoter entangled

  // Thresholds (percentage of total mass remaining)
  shrinkThreshold: 0.50,  // Hole shrinks at 50% remaining
  critThreshold: 0.10,    // Hole crits at 10% remaining

  // POMCTS settings
  simulations: 1000000,   // Number of MCTS iterations (1M for accuracy)
  maxDepth: 20,           // Maximum simulation depth (trips)
  ucbConstant: 1.414,     // UCB1 exploration constant (sqrt(2))
  tripDecay: 0.95,        // Exponential decay per trip (score = decay^trips)
} as const;

export type Config = typeof CONFIG;
