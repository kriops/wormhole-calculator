// POMCTS Algorithm Tests

import { describe, it, expect } from 'vitest';
import { runPOMCTS } from '../src/pomcts/algorithm';
import { getMCTSActionResults, getMCTSTripDistribution } from '../src/pomcts/results';
import { computeObservation, updateTotalBelief } from '../src/pomcts/observation';

describe('POMCTS Fresh Hole', () => {
  it('should recommend BS action on fresh C247', () => {
    // Fresh hole: 1800-2200M total mass, 0 used
    const root = runPOMCTS(1800, 2200, 0, 100000);
    const results = getMCTSActionResults(root);

    // Best action should be BS, not HIC
    expect(results.length).toBeGreaterThan(0);
    expect(results[0].key).toMatch(/^BS_/);
    expect(results[0].successRate).toBeGreaterThan(0.85);
  });

  it('should estimate 4-6 trips for fresh hole with BS C/H', () => {
    const root = runPOMCTS(1800, 2200, 0, 100000);
    const results = getMCTSActionResults(root);

    const bsAction = results.find(r => r.key === 'BS_COLD_HOT');
    expect(bsAction).toBeDefined();
    // BS C/H = 200+300 = 500M per trip, 1800-2200M total → 3.6-4.4 trips
    // With variance and rollout simulation, expect 4-6 trips
    expect(bsAction!.avgSteps).toBeGreaterThanOrEqual(3);
    expect(bsAction!.avgSteps).toBeLessThanOrEqual(7);
  });

  it('should have >85% success rate for BS actions', () => {
    const root = runPOMCTS(1800, 2200, 0, 100000);
    const results = getMCTSActionResults(root);

    // All BS actions should have high success rates
    const bsActions = results.filter(r => r.key.startsWith('BS_'));
    expect(bsActions.length).toBeGreaterThan(0);

    for (const action of bsActions) {
      expect(action.successRate).toBeGreaterThan(0.85);
    }
  });

  it('should return trip distribution for successful runs', () => {
    const root = runPOMCTS(1800, 2200, 0, 100000);
    const distribution = getMCTSTripDistribution(root);

    expect(distribution.length).toBeGreaterThan(0);
    // Most trips should be 3-7 for fresh hole (accounting for variance)
    const mostLikelyTrips = distribution.reduce((a, b) =>
      a.pct > b.pct ? a : b
    );
    expect(mostLikelyTrips.trips).toBeGreaterThanOrEqual(3);
    expect(mostLikelyTrips.trips).toBeLessThanOrEqual(7);
  });
});

describe('POMCTS Partially Used Hole', () => {
  it('should still recommend BS after 1000M used', () => {
    // After 2 trips of BS C/H (500M each), 1000M used
    const root = runPOMCTS(1800, 2200, 1000, 100000);
    const results = getMCTSActionResults(root);

    expect(results.length).toBeGreaterThan(0);
    expect(results[0].key).toMatch(/^BS_/);
  });

  it('should estimate 2-4 more trips after 1000M used', () => {
    const root = runPOMCTS(1800, 2200, 1000, 100000);
    const results = getMCTSActionResults(root);

    const bestBS = results.find(r => r.key.startsWith('BS_'));
    expect(bestBS).toBeDefined();
    // 800-1200M remaining → 1.6-2.4 BS trips, with variance expect 2-4
    expect(bestBS!.avgSteps).toBeGreaterThanOrEqual(1);
    expect(bestBS!.avgSteps).toBeLessThanOrEqual(5);
  });
});

describe('Observation Functions', () => {
  it('should return fresh when >50% remaining', () => {
    // 2000M total, 500M used → 75% remaining
    expect(computeObservation(2000, 500)).toBe('fresh');
  });

  it('should return shrink when 10-50% remaining', () => {
    // 2000M total, 1200M used → 40% remaining
    expect(computeObservation(2000, 1200)).toBe('shrink');
  });

  it('should return crit when <=10% remaining', () => {
    // 2000M total, 1850M used → 7.5% remaining
    expect(computeObservation(2000, 1850)).toBe('crit');
  });

  it('should return collapsed when no mass remaining', () => {
    expect(computeObservation(2000, 2000)).toBe('collapsed');
    expect(computeObservation(2000, 2100)).toBe('collapsed');
  });
});

describe('Belief Update Functions', () => {
  it('should narrow belief on fresh observation', () => {
    const belief = { min: 1800, max: 2200 };
    const updated = updateTotalBelief(belief, 500, 'fresh');

    // fresh means >50% remaining → total > 2*massUsed = 1000
    // So min should be at least 1001
    expect(updated.min).toBeGreaterThanOrEqual(1001);
    expect(updated.max).toBe(2200); // max unchanged
  });

  it('should narrow belief on shrink observation', () => {
    const belief = { min: 1800, max: 2200 };
    const updated = updateTotalBelief(belief, 1200, 'shrink');

    // shrink means 10-50% remaining
    // min: massUsed/0.9 + 1 = 1334
    // max: 2*massUsed = 2400 (but capped at original 2200)
    expect(updated.min).toBeGreaterThanOrEqual(1334);
    expect(updated.max).toBeLessThanOrEqual(2400);
  });

  it('should narrow belief on crit observation', () => {
    const belief = { min: 1800, max: 2200 };
    const updated = updateTotalBelief(belief, 1900, 'crit');

    // crit means <=10% remaining → total <= massUsed/0.9 = 2111
    expect(updated.max).toBeLessThanOrEqual(2112);
  });
});

describe('Edge Cases', () => {
  it('should handle nearly empty hole', () => {
    // Very little mass remaining
    const root = runPOMCTS(1800, 2200, 1900, 10000);
    const results = getMCTSActionResults(root);

    // Should still produce results
    expect(results.length).toBeGreaterThan(0);
  });

  it('should handle exact mass scenarios', () => {
    // Exactly at shrink threshold
    const root = runPOMCTS(2000, 2000, 1000, 10000);
    const results = getMCTSActionResults(root);

    expect(results.length).toBeGreaterThan(0);
    // With 1000M remaining, should recommend BS
    expect(results[0].key).toMatch(/^BS_/);
  });

  it('should recommend safe actions over risky ones when rollout risk exists', () => {
    // Scenario: remaining 16-86M
    // HIC Cold (30M out) has rollout risk when remaining.min < 30
    // HIC E/H (1.5M out, 134M back) is safe AND efficient
    // Safe actions should have higher success rate than risky ones

    const root = runPOMCTS(16, 86, 0, 100000);
    const results = getMCTSActionResults(root);

    // Find HIC E/H (safe) and HIC C variants (risky)
    const hicEntHot = results.find(r => r.key === 'HIC_ENT_HOT');
    const hicCold = results.find(r => r.key === 'HIC_COLD' || r.key === 'HIC_COLD_HOT');

    // HIC E/H should be available (it's efficient and safe)
    expect(hicEntHot).toBeDefined();

    // If HIC C is available, HIC E/H should have higher success rate
    // (because HIC C has rollout risk with min remaining = 16M < 30M)
    if (hicCold) {
      expect(hicEntHot!.successRate).toBeGreaterThanOrEqual(hicCold.successRate);
    }
  });
});
