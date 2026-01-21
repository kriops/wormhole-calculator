// POMCTS - Observation and Belief Update Functions

import { CONFIG } from '../config';
import type { Belief, Observation } from '../types';

/**
 * Compute observation given true mass and mass used.
 * Returns the visual state of the wormhole based on remaining mass percentage.
 */
export function computeObservation(trueMass: number, massUsed: number): Observation {
  const remaining = trueMass - massUsed;
  const remainingPct = remaining / trueMass;

  if (remaining <= 0) return 'collapsed';
  if (remainingPct <= CONFIG.critThreshold) return 'crit';
  if (remainingPct <= CONFIG.shrinkThreshold) return 'shrink';
  return 'fresh';
}

/**
 * Update total mass belief based on observation.
 * Uses Bayesian inference to narrow the belief bounds.
 *
 * @param currentTotalBelief - Current belief about total wormhole mass
 * @param massUsed - Cumulative mass used so far
 * @param observation - Observed wormhole state
 * @returns Updated belief bounds
 */
export function updateTotalBelief(
  currentTotalBelief: Belief,
  massUsed: number,
  observation: Observation
): Belief {
  let newMin = currentTotalBelief.min;
  let newMax = currentTotalBelief.max;

  if (observation === 'fresh') {
    // Remaining > 50% of total → total > 2 * massUsed
    newMin = Math.max(newMin, 2 * massUsed + 1);
  } else if (observation === 'shrink') {
    // 10% < remaining ≤ 50% → massUsed/0.9 < total ≤ 2*massUsed
    newMin = Math.max(newMin, massUsed / 0.9 + 1);
    newMax = Math.min(newMax, 2 * massUsed);
  } else if (observation === 'crit') {
    // Remaining ≤ 10% → total ≤ massUsed/0.9
    newMax = Math.min(newMax, massUsed / 0.9);
  }
  // 'collapsed' means we're done - no belief update needed

  return { min: newMin, max: newMax };
}
