// POMCTS - Node Class for Tree Search

import { ACTIONS } from '../actions';
import { CONFIG } from '../config';
import type { Action, Belief, Observation } from '../types';

/**
 * POMCTS Node - represents a state in the partially observable search tree.
 * Nodes branch on (action, observation) pairs to properly handle belief updates.
 */
export class POMCTSNode {
  totalBelief: Belief;
  massUsed: number;
  parent: POMCTSNode | null;
  incomingAction: Action | null;
  incomingActionKey: string | null;
  incomingObservation: Observation | null;
  children: Record<string, Record<string, POMCTSNode>>;
  visits: number;
  wins: number;
  depth: number;
  terminalTrips: Record<number, number>;

  constructor(
    totalBelief: Belief,
    massUsed: number,
    parent: POMCTSNode | null = null,
    incomingAction: Action | null = null,
    incomingActionKey: string | null = null,
    incomingObservation: Observation | null = null,
    depth: number = 0
  ) {
    this.totalBelief = { min: totalBelief.min, max: totalBelief.max };
    this.massUsed = massUsed;
    this.parent = parent;
    this.incomingAction = incomingAction;
    this.incomingActionKey = incomingActionKey;
    this.incomingObservation = incomingObservation;

    // Children indexed by action key, then observation
    // this.children[actionKey][observation] = POMCTSNode
    this.children = {};

    this.visits = 0;
    this.wins = 0;
    this.depth = depth;
    this.terminalTrips = {};
  }

  /**
   * Compute remaining mass belief from total belief
   */
  getRemainingBelief(): Belief {
    return {
      min: Math.max(0, this.totalBelief.min - this.massUsed),
      max: Math.max(0, this.totalBelief.max - this.massUsed)
    };
  }

  /**
   * Check if this node represents a terminal state (hole collapsed)
   */
  isTerminal(): boolean {
    const remaining = this.getRemainingBelief();
    return remaining.max <= 0;
  }

  /**
   * Get valid actions from this state.
   * Filters out actions that can't survive outbound or would take too many trips.
   * Allows inefficient safe actions only when no efficient action is guaranteed safe.
   */
  getValidActions(): Array<[string, Action]> {
    const remaining = this.getRemainingBelief();
    const minMassPerTrip = remaining.max / CONFIG.maxReasonableTrips;

    // Check if any efficient action is guaranteed safe
    const hasEfficientSafeAction = Object.values(ACTIONS).some(act => {
      const tripMass = act.out + act.back;
      const isEfficient = tripMass >= minMassPerTrip;
      const isSafe = act.out < remaining.min;
      return isEfficient && isSafe && remaining.max > act.out;
    });

    return Object.entries(ACTIONS).filter(([_key, act]) => {
      if (remaining.max <= act.out) return false;  // Can't survive outbound

      const tripMass = act.out + act.back;
      const isEfficient = tripMass >= minMassPerTrip;
      const isSafe = act.out < remaining.min;

      // Allow efficient actions
      if (isEfficient) return true;

      // Allow inefficient safe actions only if no efficient action is safe
      if (isSafe && !hasEfficientSafeAction) return true;

      return false;
    });
  }

  /**
   * Get child node for (action, observation) pair, or null if not exists
   */
  getChild(actionKey: string, observation: string): POMCTSNode | null {
    if (this.children[actionKey] && this.children[actionKey][observation]) {
      return this.children[actionKey][observation];
    }
    return null;
  }

  /**
   * Set child node for (action, observation) pair
   */
  setChild(actionKey: string, observation: string, child: POMCTSNode): void {
    if (!this.children[actionKey]) {
      this.children[actionKey] = {};
    }
    this.children[actionKey][observation] = child;
  }

  /**
   * Check if child exists for (action, observation) pair
   */
  hasChild(actionKey: string, observation: string): boolean {
    return !!(this.children[actionKey] && this.children[actionKey][observation]);
  }

  /**
   * Aggregate stats for an action across all observation branches
   */
  getActionStats(actionKey: string): { visits: number; wins: number } {
    const branches = this.children[actionKey];
    if (!branches) return { visits: 0, wins: 0 };

    let totalVisits = 0;
    let totalWins = 0;
    for (const obs in branches) {
      totalVisits += branches[obs].visits;
      totalWins += branches[obs].wins;
    }
    return { visits: totalVisits, wins: totalWins };
  }

  /**
   * UCB1 for an action (aggregated across observation branches)
   */
  ucb1ForAction(actionKey: string, C: number = 1.414): number {
    const stats = this.getActionStats(actionKey);
    if (stats.visits === 0) return Infinity;
    const exploitation = stats.wins / stats.visits;
    const exploration = C * Math.sqrt(Math.log(this.visits) / stats.visits);
    return exploitation + exploration;
  }

  /**
   * Get all action keys that have any children
   */
  getExploredActions(): string[] {
    return Object.keys(this.children);
  }
}
