// Wormhole Calculator Configuration

export const CONFIG = {
  // C247 wormhole parameters
  baseMass: 2000,      // Base mass in millions (M)
  variance: 0.10,      // ±10% variance

  // Ship masses
  bsHot: 300,          // Battleship hot (higgs + prop)
  bsCold: 200,         // Battleship cold (higgs, no prop)
  hicHot: 134,         // HIC hot
  hicCold: 30,         // HIC cold
  hicEnt: 1.5,         // HIC with entosis link

  // Thresholds (percentage of total mass remaining)
  shrinkThreshold: 0.50,  // Hole shrinks at 50% remaining
  critThreshold: 0.10,    // Hole crits at 10% remaining

  // POMCTS settings
  simulations: 1000000,   // Number of MCTS iterations (1M for accuracy)
  maxDepth: 20,           // Maximum simulation depth (trips)
  maxReasonableTrips: 8,  // Filter out actions needing more trips than this
  ucbConstant: 1.414,     // UCB1 exploration constant (sqrt(2))
} as const;

export type Config = typeof CONFIG;
