// Wormhole Calculator Type Definitions

export interface Belief {
  min: number;
  max: number;
}

export interface Action {
  out: number;
  back: number;
  label: string;
  isHic: boolean;
}

export interface ActionResult {
  key: string;
  act: Action;
  visits: number;
  wins: number;
  successes: number;
  total: number;
  successRate: number;
  strategyScore: number;
  avgSteps: number;
  mass: number;
  guaranteedSafe: boolean;
}

export interface ReturnResult extends ActionResult {
  collapseRate: number;
  isReturn: true;
}

export interface TripDistribution {
  trips: number;
  pct: number;
}

export type Observation = 'fresh' | 'shrink' | 'crit' | 'collapsed';

export interface HistoryEntry {
  type: string;
  label: string;
  mass: number;
  ship?: string;
  note?: string;
  timestamp: string;
}

export interface AppState {
  massUsed: number;
  knownMinStart: number;
  knownMaxStart: number;
  hasUnknownMass: boolean;
  history: HistoryEntry[];
}

export interface RecommendedStrategy {
  sequence: string[];
  tripDistribution: TripDistribution[];
  actionResults: ActionResult[];
  nextAction: ActionResult | null;
  minRemaining: number;
  maxRemaining: number;
  belief: Belief;
  isReturn: boolean;
  shipUsedOut?: string;
  mctsIterations?: number;
}
