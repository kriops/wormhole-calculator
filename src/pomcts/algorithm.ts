// POMCTS - Main Algorithm Implementation

import { CONFIG } from '../config';
import { ACTIONS } from '../actions';
import type { Belief } from '../types';
import { POMCTSNode } from './node';
import { computeObservation, updateTotalBelief } from './observation';

/**
 * Run POMCTS (Partially Observable Monte Carlo Tree Search).
 * Branches on (action, observation) pairs for proper Bayesian belief updates.
 *
 * @param startMin - Minimum possible total mass
 * @param startMax - Maximum possible total mass
 * @param initialMassUsed - Mass already used when starting search
 * @param numIterations - Number of MCTS iterations to run
 * @returns Root node of the search tree
 */
export function runPOMCTS(
  startMin: number,
  startMax: number,
  initialMassUsed: number,
  numIterations: number = CONFIG.simulations
): POMCTSNode {
  const rootTotalBelief: Belief = { min: startMin, max: startMax };
  const root = new POMCTSNode(rootTotalBelief, initialMassUsed);

  for (let i = 0; i < numIterations; i++) {
    // Sample true mass for this iteration
    const trueMass = startMin + Math.random() * (startMax - startMin);
    let currentMassUsed = initialMassUsed;
    let remaining = trueMass - currentMassUsed;

    // Track path for backpropagation
    const path: POMCTSNode[] = [root];
    let node = root;
    let rolledOut = false;

    // 1. SELECTION + EXPANSION: traverse/expand tree
    while (!node.isTerminal() && !rolledOut) {
      const validActions = node.getValidActions();
      if (validActions.length === 0) break;

      // Find an unexplored (action, observation) pair, or select via UCB1
      let selectedActionKey: string | null = null;
      let selectedAction: { out: number; back: number } | null = null;
      let needsExpansion = false;

      // First, check if any valid action has unexplored observation branch for this trueMass
      for (const [key, act] of validActions) {
        // Check for rollout before computing observation
        if (remaining <= act.out) continue;

        const newMassUsed = currentMassUsed + act.out + act.back;
        const observation = computeObservation(trueMass, newMassUsed);

        if (!node.hasChild(key, observation)) {
          // This (action, observation) pair is unexplored - expand here
          selectedActionKey = key;
          selectedAction = act;
          needsExpansion = true;
          break;
        }
      }

      if (!needsExpansion) {
        // All reachable (action, observation) pairs explored - use UCB1 to select action
        let bestUCB = -Infinity;
        for (const [key, act] of validActions) {
          if (remaining <= act.out) continue;  // Skip if would roll out

          const ucb = node.ucb1ForAction(key);
          if (ucb > bestUCB) {
            bestUCB = ucb;
            selectedActionKey = key;
            selectedAction = act;
          }
        }
      }

      if (!selectedAction || !selectedActionKey) {
        // No valid action found (all would roll out)
        rolledOut = true;
        break;
      }

      // Check for rollout on outbound
      if (remaining <= selectedAction.out) {
        rolledOut = true;
        break;
      }

      // Apply action
      const newMassUsed = currentMassUsed + selectedAction.out + selectedAction.back;
      remaining = trueMass - newMassUsed;
      const observation = computeObservation(trueMass, newMassUsed);

      // Get or create child node
      let child = node.getChild(selectedActionKey, observation);
      if (!child) {
        // Create new child with updated belief
        const newTotalBelief = updateTotalBelief(node.totalBelief, newMassUsed, observation);
        child = new POMCTSNode(
          newTotalBelief,
          newMassUsed,
          node,
          ACTIONS[selectedActionKey],
          selectedActionKey,
          observation,
          node.depth + 1
        );
        node.setChild(selectedActionKey, observation, child);
      }

      currentMassUsed = newMassUsed;
      node = child;
      path.push(node);

      // Exit if hole collapsed (remaining <= 0 for this sample)
      if (remaining <= 0) break;

      // If we just expanded, break to go to simulation
      if (needsExpansion) break;
    }

    // 2. SIMULATION: random rollout to terminal
    let trips = node.depth;
    const simTotalBelief = { ...node.totalBelief };
    let simMassUsed = currentMassUsed;

    if (!rolledOut && remaining > 0) {
      while (remaining > 0 && trips < CONFIG.maxDepth) {
        // Get valid actions based on actual remaining mass
        const validActions = Object.entries(ACTIONS).filter(([_k, a]) =>
          remaining > a.out
        );
        if (validActions.length === 0) {
          rolledOut = true;
          break;
        }

        // Pick action using heuristic (prefer higher mass to close hole faster)
        validActions.sort((a, b) => (b[1].out + b[1].back) - (a[1].out + a[1].back));
        const [_key, act] = validActions[0];

        trips++;
        simMassUsed += act.out + act.back;
        remaining = trueMass - simMassUsed;

        // Compute observation and update belief (for accurate simulation)
        const observation = computeObservation(trueMass, simMassUsed);
        updateTotalBelief(simTotalBelief, simMassUsed, observation);
      }
    }

    // 3. BACKPROPAGATION: update stats along path
    const success = !rolledOut && remaining <= 0;
    const score = success ? Math.pow(CONFIG.tripDecay, trips) : 0;
    for (const n of path) {
      n.visits++;
      if (success) {
        n.wins += score;
        n.successes++;
        n.terminalTrips[trips] = (n.terminalTrips[trips] || 0) + 1;
      }
    }
  }

  return root;
}

/**
 * Alias for backward compatibility
 */
export function runMCTS(
  _rootBelief: Belief,
  startMin: number,
  startMax: number,
  massUsed: number,
  numIterations: number = CONFIG.simulations
): POMCTSNode {
  return runPOMCTS(startMin, startMax, massUsed, numIterations);
}
