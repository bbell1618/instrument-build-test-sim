import { describe, it, expect } from 'vitest';
import { runSimulation } from '../services/simulator';
import { PipelineConfig } from '../types';

function makeConfig(overrides?: Partial<PipelineConfig>): PipelineConfig {
  return {
    simulationCount: 500,
    stages: [
      {
        id: 's1',
        name: 'Assembly',
        meanDurationMinutes: 30,
        failureProbability: 0.05,
        reworkEnabled: true,
        reworkTimePenaltyMinutes: 15,
      },
      {
        id: 's2',
        name: 'Test',
        meanDurationMinutes: 20,
        failureProbability: 0.10,
        reworkEnabled: false,
        reworkTimePenaltyMinutes: 0,
      },
    ],
    ...overrides,
  };
}

describe('runSimulation', () => {
  it('returns correct total units count', () => {
    const result = runSimulation(makeConfig({ simulationCount: 200 }));
    expect(result.totalUnits).toBe(200);
  });

  it('good + scrapped = total', () => {
    const result = runSimulation(makeConfig());
    expect(result.goodUnits + result.scrappedUnits).toBe(result.totalUnits);
  });

  it('overall yield is between 0 and 100', () => {
    const result = runSimulation(makeConfig());
    expect(result.overallYield).toBeGreaterThanOrEqual(0);
    expect(result.overallYield).toBeLessThanOrEqual(100);
  });

  it('average cycle time is positive for non-zero good units', () => {
    const result = runSimulation(makeConfig({ simulationCount: 1000 }));
    if (result.goodUnits > 0) {
      expect(result.avgCycleTime).toBeGreaterThan(0);
    }
  });

  it('P95 >= average cycle time', () => {
    const result = runSimulation(makeConfig({ simulationCount: 1000 }));
    if (result.goodUnits > 0) {
      expect(result.cycleTimeP95).toBeGreaterThanOrEqual(result.avgCycleTime);
    }
  });

  it('produces stage stats for each configured stage', () => {
    const config = makeConfig();
    const result = runSimulation(config);
    expect(result.stageStats).toHaveLength(config.stages.length);
    expect(result.stageStats[0].stageName).toBe('Assembly');
    expect(result.stageStats[1].stageName).toBe('Test');
  });

  it('stage input counts are consistent (each stage gets output of previous)', () => {
    const result = runSimulation(makeConfig({ simulationCount: 1000 }));
    // First stage should see all units
    expect(result.stageStats[0].inputCount).toBe(result.totalUnits);
    // Second stage input <= first stage pass count
    expect(result.stageStats[1].inputCount).toBeLessThanOrEqual(result.stageStats[0].passCount);
  });

  it('per-stage yield is between 0 and 100', () => {
    const result = runSimulation(makeConfig());
    for (const stat of result.stageStats) {
      expect(stat.yield).toBeGreaterThanOrEqual(0);
      expect(stat.yield).toBeLessThanOrEqual(100);
    }
  });

  it('zero failure probability produces 100% yield', () => {
    const config: PipelineConfig = {
      simulationCount: 500,
      stages: [
        {
          id: 's1',
          name: 'Perfect',
          meanDurationMinutes: 10,
          failureProbability: 0,
          reworkEnabled: false,
          reworkTimePenaltyMinutes: 0,
        },
      ],
    };
    const result = runSimulation(config);
    expect(result.overallYield).toBe(100);
    expect(result.scrappedUnits).toBe(0);
    expect(result.goodUnits).toBe(500);
  });

  it('100% failure probability with no rework scraps everything', () => {
    const config: PipelineConfig = {
      simulationCount: 200,
      stages: [
        {
          id: 's1',
          name: 'Doomed',
          meanDurationMinutes: 10,
          failureProbability: 1.0,
          reworkEnabled: false,
          reworkTimePenaltyMinutes: 0,
        },
      ],
    };
    const result = runSimulation(config);
    expect(result.overallYield).toBe(0);
    expect(result.scrappedUnits).toBe(200);
    expect(result.goodUnits).toBe(0);
  });

  it('generates a cycle time distribution histogram', () => {
    const result = runSimulation(makeConfig({ simulationCount: 1000 }));
    if (result.goodUnits > 0) {
      expect(result.cycleTimeDistribution.length).toBeGreaterThan(0);
      // Sum of histogram counts should equal good units
      const histTotal = result.cycleTimeDistribution.reduce((sum, b) => sum + b.count, 0);
      expect(histTotal).toBe(result.goodUnits);
    }
  });

  it('generates yield trend with correct stage names', () => {
    const config = makeConfig();
    const result = runSimulation(config);
    expect(result.yieldTrend).toHaveLength(config.stages.length);
    expect(result.yieldTrend[0].stageName).toBe('Assembly');
    expect(result.yieldTrend[1].stageName).toBe('Test');
    // Cumulative yield should decrease or stay same across stages
    expect(result.yieldTrend[1].cumulativeYield).toBeLessThanOrEqual(result.yieldTrend[0].cumulativeYield);
  });

  it('handles single stage pipeline', () => {
    const config: PipelineConfig = {
      simulationCount: 100,
      stages: [
        {
          id: 's1',
          name: 'Only Stage',
          meanDurationMinutes: 15,
          failureProbability: 0.1,
          reworkEnabled: true,
          reworkTimePenaltyMinutes: 10,
        },
      ],
    };
    const result = runSimulation(config);
    expect(result.stageStats).toHaveLength(1);
    expect(result.totalUnits).toBe(100);
    expect(result.goodUnits + result.scrappedUnits).toBe(100);
  });

  it('rework-enabled stages have higher yield than non-rework with same failure rate', () => {
    // Statistical test — run large N to reduce variance
    const reworkConfig: PipelineConfig = {
      simulationCount: 10000,
      stages: [{
        id: 's1', name: 'Rework', meanDurationMinutes: 10,
        failureProbability: 0.3, reworkEnabled: true, reworkTimePenaltyMinutes: 5,
      }],
    };
    const noReworkConfig: PipelineConfig = {
      simulationCount: 10000,
      stages: [{
        id: 's1', name: 'NoRework', meanDurationMinutes: 10,
        failureProbability: 0.3, reworkEnabled: false, reworkTimePenaltyMinutes: 0,
      }],
    };
    const reworkResult = runSimulation(reworkConfig);
    const noReworkResult = runSimulation(noReworkConfig);
    expect(reworkResult.overallYield).toBeGreaterThan(noReworkResult.overallYield);
  });
});
