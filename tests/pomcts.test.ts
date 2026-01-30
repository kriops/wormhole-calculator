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

describe('Normal State with Shrink Observations', () => {
  it('should handle multiple shrinks without over-constraining total bounds', () => {
    // Simulate user scenario: Normal state -> multiple shrinks
    // This tests that observation constraints don't incorrectly cap total

    // Normal state: total 1800-2200M, massUsed=0
    let belief = { min: 1800, max: 2200 };
    let massUsed = 0;

    // Step 1: BS Hot out (294.2M) -> Shrink
    massUsed += 294.2;
    // Shrink constraint: total > massUsed/0.9, total <= 2*massUsed
    // This would give: 327 < total <= 588.4, which conflicts with 1800-2200
    // In the UI, this triggers fallback to visual bounds
    // For this test, we simulate the fallback: remaining 180-1100M
    const visualMin = 1800 * 0.1;  // 180M remaining
    const visualMax = 2200 * 0.5;  // 1100M remaining
    belief = { min: massUsed + visualMin, max: massUsed + visualMax };
    // belief = 474.2 - 1394.2M total

    // Step 2: BS Hot back (294.2M) -> Shrink
    massUsed += 294.2;
    belief = updateTotalBelief(belief, massUsed, 'shrink');
    // After this, belief should still be reasonable
    expect(belief.max).toBeGreaterThan(massUsed);  // Hole not collapsed
    expect(belief.max - massUsed).toBeGreaterThan(100);  // Reasonable remaining

    // Step 3: HIC Hot out (132.4M) -> Shrink
    massUsed += 132.4;
    belief = updateTotalBelief(belief, massUsed, 'shrink');
    expect(belief.max).toBeGreaterThan(massUsed);

    // Step 4: HIC Hot back (132.4M) -> Shrink
    massUsed += 132.4;
    belief = updateTotalBelief(belief, massUsed, 'shrink');
    expect(belief.max).toBeGreaterThan(massUsed);

    // Step 5: HIC Hot out (132.4M) - awaiting observation
    massUsed += 132.4;
    const remaining = { min: belief.min - massUsed, max: belief.max - massUsed };

    // Verify remaining is positive (hole not collapsed)
    expect(remaining.max).toBeGreaterThan(0);

    // Verify massUsed is NOT >= 90% of max total (crit not required)
    const critThreshold = 0.9 * belief.max;
    expect(massUsed).toBeLessThan(critThreshold);

    // This means shrink observation should be allowed, not just crit
  });
});

describe('avgSteps Bias Correction', () => {
  it('should estimate realistic trips for HIC H/H when 1-trip probability is partial', () => {
    // Scenario inspired by real game: after multiple jumps, remaining is 200-600M
    // HIC H/H = 132.4M out, 132.4M back = 264.8M total
    // 1-trip range: 200 to 264.8 (64.8M)
    // Full valid range: 200 to 600 (400M)
    // P(1 trip) = 64.8 / 400 = 16.2%
    // Expected trips ≈ 1.84 (definitely not 1.0)
    const root = runPOMCTS(200, 600, 0, 100000);
    const results = getMCTSActionResults(root);

    const hicHotHot = results.find(r => r.key === 'HIC_HOT');
    expect(hicHotHot).toBeDefined();
    // avgSteps should be around 1.5-2.5, definitely NOT biased to 1.0
    expect(hicHotHot!.avgSteps).toBeGreaterThan(1.3);
    expect(hicHotHot!.avgSteps).toBeLessThan(3.0);
  });

  it('should estimate ~1.7 trips for HIC in narrow remaining range (real game scenario)', () => {
    // User's real scenario: after BS Hot out + back with shrink observations
    // Final state: massUsed=588.4, total belief 713-1115, remaining 125-527M
    // For HIC H/H (132.4M out, 132.4M back):
    // - Valid range: 132.4 to 527 (need remaining > 132.4M for safe outbound)
    // - 1-trip range: 132.4 to 264.8 = 132.4M
    // - Total valid range: 132.4 to 527 = 394.6M
    // - P(1 trip) ≈ 33.5%
    // - Expected trips ≈ 1.67

    const root = runPOMCTS(713, 1115, 588, 100000);
    const results = getMCTSActionResults(root);

    const hicHotHot = results.find(r => r.key === 'HIC_HOT');
    expect(hicHotHot).toBeDefined();
    // avgSteps should be around 1.5-2.0, not biased to 1.0
    expect(hicHotHot!.avgSteps).toBeGreaterThan(1.3);
    expect(hicHotHot!.avgSteps).toBeLessThan(2.5);
  });

  it('should show high avgSteps when 1-trip probability is very low', () => {
    // Remaining 300-1000M
    // HIC H/H 1-trip range: 300 to 264.8 = 0 (already past 1-trip threshold)
    // All scenarios need 2+ trips
    const root = runPOMCTS(300, 1000, 0, 100000);
    const results = getMCTSActionResults(root);

    const hicHotHot = results.find(r => r.key === 'HIC_HOT');
    expect(hicHotHot).toBeDefined();
    // With no 1-trip scenarios, avgSteps should be 2+
    expect(hicHotHot!.avgSteps).toBeGreaterThanOrEqual(2.0);
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

  it('should show rollout risk for HIC HOT when remaining.min < 134', () => {
    // Scenario: remaining 100-200M
    // HIC HOT = 134M out, so if true remaining is 100-133M, user gets rolled
    // Success rate should NOT be 100% - roughly 66% of range is safe (134-200 / 100-200)
    const root = runPOMCTS(100, 200, 0, 100000);
    const results = getMCTSActionResults(root);

    const hicHot = results.find(r => r.key === 'HIC_HOT');
    expect(hicHot).toBeDefined();
    // Success rate should be around 66% (100 safe out of 100 range), definitely not 100%
    expect(hicHot!.successRate).toBeLessThan(0.95);
    expect(hicHot!.successRate).toBeGreaterThan(0.5);
  });
});
