// Wormhole Calculator - Action Definitions

import { CONFIG } from './config';
import type { Action } from './types';

export interface SingleJump {
  mass: number;
  label: string;
  ship: 'BS' | 'HIC';
}

// Single jump actions (the atomic unit)
export const SINGLE_JUMPS: Record<string, SingleJump> = {
  'BS_HOT': { mass: CONFIG.bsHot, label: 'BS Hot', ship: 'BS' },
  'BS_COLD': { mass: CONFIG.bsCold, label: 'BS Cold', ship: 'BS' },
  'HIC_HOT': { mass: CONFIG.hicHot, label: 'HIC Hot', ship: 'HIC' },
  'HIC_COLD': { mass: CONFIG.hicCold, label: 'HIC Cold', ship: 'HIC' },
  'HIC_ENT': { mass: CONFIG.hicEnt, label: 'HIC Ent', ship: 'HIC' }
};

// Round trip combinations (for convenience display, built from single jumps)
export const ACTIONS: Record<string, Action> = {
  'BS_HOT': { out: CONFIG.bsHot, back: CONFIG.bsHot, label: 'BS H/H', isHic: false },
  'BS_COLD': { out: CONFIG.bsCold, back: CONFIG.bsCold, label: 'BS C/C', isHic: false },
  'BS_COLD_HOT': { out: CONFIG.bsCold, back: CONFIG.bsHot, label: 'BS C/H', isHic: false },
  'HIC_HOT': { out: CONFIG.hicHot, back: CONFIG.hicHot, label: 'HIC H/H', isHic: true },
  'HIC_COLD': { out: CONFIG.hicCold, back: CONFIG.hicCold, label: 'HIC C/C', isHic: true },
  'HIC_COLD_HOT': { out: CONFIG.hicCold, back: CONFIG.hicHot, label: 'HIC C/H', isHic: true },
  'HIC_ENT': { out: CONFIG.hicEnt, back: CONFIG.hicEnt, label: 'HIC E/E', isHic: true },
  'HIC_ENT_HOT': { out: CONFIG.hicEnt, back: CONFIG.hicHot, label: 'HIC E/H', isHic: true }
};
