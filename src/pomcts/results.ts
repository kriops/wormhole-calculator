// POMCTS - Result Extraction Functions

import type { ActionResult, TripDistribution } from '../types';
import { POMCTSNode } from './node';

/**
 * Extract all action results from POMCTS tree (aggregated across observations).
 * Results are sorted by success rate (higher = better).
 */
export function getMCTSActionResults(root: POMCTSNode): ActionResult[] {
  const results: ActionResult[] = [];
  const remainingBelief = root.getRemainingBelief();

  for (const actionKey of Object.keys(root.children)) {
    const observations = root.children[actionKey];

    // Aggregate stats across all observation branches
    let totalVisits = 0;
    let totalWins = 0;  // Weighted score (sum of decay^trips)
    let totalSuccesses = 0;  // Raw success count
    let totalTrips = 0;
    let action = null;

    for (const obs of Object.keys(observations)) {
      const child = observations[obs];
      totalVisits += child.visits;
      totalWins += child.wins;
      totalSuccesses += child.successes;
      action = child.incomingAction;

      // Aggregate terminal trips for avgSteps calculation
      for (const [trips, count] of Object.entries(child.terminalTrips)) {
        totalTrips += parseInt(trips) * count;
      }
    }

    if (!action) continue;

    const observedAvgSteps = totalSuccesses > 0 ? totalTrips / totalSuccesses : 0;

    // Estimate avgSteps based on belief distribution
    // MCTS exploration biases toward collapsed scenarios; correct by estimating
    // the probability of 1-trip completion vs needing more trips
    const actionMass = action.out + action.back;
    let avgSteps = observedAvgSteps;
    if (remainingBelief.max > action.out) {
      const validRange = remainingBelief.max - action.out;
      const oneTrip = Math.min(validRange, Math.max(0, actionMass - action.out));
      const pOneTrip = oneTrip / validRange;
      // Correct for MCTS bias when 1-trip isn't guaranteed
      if (pOneTrip < 0.95 && observedAvgSteps < 1.5) {
        // Estimate: 1 trip with prob pOneTrip, ~2 trips otherwise
        avgSteps = pOneTrip * 1 + (1 - pOneTrip) * 2;
      }
    }

    // Calculate probability of safe outbound jump
    // MCTS only explores actions when trueMass > act.out, so observed rate
    // is biased towards safe scenarios. Adjust for full belief distribution.
    const beliefRange = remainingBelief.max - remainingBelief.min;
    let pSafeOutbound = 1.0;
    if (beliefRange > 0 && action.out > remainingBelief.min) {
      const safeRange = Math.max(0, remainingBelief.max - action.out);
      pSafeOutbound = safeRange / beliefRange;
    }

    // Raw success rate (probability of completing without rollout)
    const observedSuccessRate = totalVisits > 0 ? totalSuccesses / totalVisits : 0;
    const successRate = pSafeOutbound * observedSuccessRate;

    // Strategy score (weighted by trip count)
    const observedScore = totalVisits > 0 ? totalWins / totalVisits : 0;
    const strategyScore = pSafeOutbound * observedScore;

    results.push({
      key: actionKey,
      act: action,
      visits: totalVisits,
      wins: totalWins,
      successes: totalSuccesses,
      total: totalVisits,
      successRate,
      strategyScore,
      avgSteps,
      mass: action.out + action.back,
      guaranteedSafe: remainingBelief.min > action.out
    });
  }

  // Sort by strategy score (higher = better), then fewer trips as tiebreaker
  // (fewer trips = what higher decay would favor)
  results.sort((a, b) => {
    const scoreDiff = b.strategyScore - a.strategyScore;
    if (scoreDiff !== 0) return scoreDiff;
    return a.avgSteps - b.avgSteps;  // lower trips = better
  });

  return results;
}

/**
 * Extract trip distribution from POMCTS tree root.
 * Returns the probability distribution of trip counts for successful completions.
 */
export function getMCTSTripDistribution(root: POMCTSNode): TripDistribution[] {
  const totalWins = root.wins;
  if (totalWins === 0) return [];

  const distribution: TripDistribution[] = [];
  for (const [trips, count] of Object.entries(root.terminalTrips)) {
    const pct = count / totalWins;
    if (pct >= 0.01) {  // Only show >=1%
      distribution.push({ trips: parseInt(trips), pct });
    }
  }
  return distribution.sort((a, b) => a.trips - b.trips);
}

/**
 * Extract recommended sequence by following most-visited path.
 * This gives the most likely action sequence based on the search.
 */
export function getMCTSSequence(root: POMCTSNode): string[] {
  const sequence: string[] = [];
  let node: POMCTSNode = root;

  while (Object.keys(node.children).length > 0) {
    // Find best action (most visited)
    let bestKey: string | null = null;
    let bestVisits = 0;

    for (const actionKey of Object.keys(node.children)) {
      const stats = node.getActionStats(actionKey);
      if (stats.visits > bestVisits) {
        bestVisits = stats.visits;
        bestKey = actionKey;
      }
    }

    if (!bestKey || bestVisits === 0) break;
    sequence.push(bestKey);

    // Follow the most-visited observation branch for this action
    const observations = node.children[bestKey];
    let bestChild: POMCTSNode | null = null;
    let bestChildVisits = 0;
    for (const obs of Object.keys(observations)) {
      if (observations[obs].visits > bestChildVisits) {
        bestChildVisits = observations[obs].visits;
        bestChild = observations[obs];
      }
    }

    if (!bestChild) break;
    node = bestChild;
  }

  return sequence;
}

/**
 * Extract best action from POMCTS tree (most visited action, aggregated across observations).
 */
export function getMCTSBestAction(root: POMCTSNode): {
  key: string;
  action: typeof root.incomingAction;
  visits: number;
  wins: number;
  successRate: number;
  guaranteedSafe: boolean;
} | null {
  const actionKeys = Object.keys(root.children);
  if (actionKeys.length === 0) return null;

  let bestKey: string | null = null;
  let bestStats = { visits: 0, wins: 0 };
  let bestAction: typeof root.incomingAction = null;

  for (const key of actionKeys) {
    const stats = root.getActionStats(key);
    if (stats.visits > bestStats.visits) {
      bestStats = stats;
      bestKey = key;
      // Get action from any observation branch
      const observations = root.children[key];
      const firstObs = Object.keys(observations)[0];
      bestAction = observations[firstObs].incomingAction;
    }
  }

  if (!bestAction || !bestKey) return null;

  const remainingBelief = root.getRemainingBelief();
  return {
    key: bestKey,
    action: bestAction,
    visits: bestStats.visits,
    wins: bestStats.wins,
    successRate: bestStats.visits > 0 ? bestStats.wins / bestStats.visits : 0,
    guaranteedSafe: remainingBelief.min > bestAction.out
  };
}
