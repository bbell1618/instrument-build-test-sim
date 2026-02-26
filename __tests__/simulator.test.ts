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
    expect(result.stageStats[0].inputCount).toBe(result.totalUnits);
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

describe('cycleTimeStats', () => {
  it('computes median, stddev, min, max correctly', () => {
    const result = runSimulation(makeConfig({ simulationCount: 1000 }));
    const stats = result.cycleTimeStats;
    if (result.goodUnits > 0) {
      expect(stats.median).toBeGreaterThan(0);
      expect(stats.stddev).toBeGreaterThanOrEqual(0);
      expect(stats.min).toBeLessThanOrEqual(stats.median);
      expect(stats.max).toBeGreaterThanOrEqual(stats.median);
      expect(stats.min).toBeLessThanOrEqual(stats.max);
      expect(stats.p95).toBeGreaterThanOrEqual(stats.median);
    }
  });

  it('returns zero stats when all units are scrapped', () => {
    const config: PipelineConfig = {
      simulationCount: 100,
      stages: [{
        id: 's1', name: 'Fail', meanDurationMinutes: 10,
        failureProbability: 1.0, reworkEnabled: false, reworkTimePenaltyMinutes: 0,
      }],
    };
    const result = runSimulation(config);
    expect(result.cycleTimeStats.avg).toBe(0);
    expect(result.cycleTimeStats.median).toBe(0);
    expect(result.cycleTimeStats.stddev).toBe(0);
  });
});

describe('bottleneck analysis', () => {
  it('identifies the lowest-yield stage as yield bottleneck', () => {
    const config: PipelineConfig = {
      simulationCount: 5000,
      stages: [
        { id: 's1', name: 'Easy', meanDurationMinutes: 10, failureProbability: 0.01, reworkEnabled: false, reworkTimePenaltyMinutes: 0 },
        { id: 's2', name: 'Hard', meanDurationMinutes: 10, failureProbability: 0.20, reworkEnabled: false, reworkTimePenaltyMinutes: 0 },
      ],
    };
    const result = runSimulation(config);
    expect(result.bottleneck.yieldBottleneck).not.toBeNull();
    expect(result.bottleneck.yieldBottleneck!.stageName).toBe('Hard');
  });

  it('identifies the slowest stage as time bottleneck', () => {
    const config: PipelineConfig = {
      simulationCount: 1000,
      stages: [
        { id: 's1', name: 'Fast', meanDurationMinutes: 5, failureProbability: 0, reworkEnabled: false, reworkTimePenaltyMinutes: 0 },
        { id: 's2', name: 'Slow', meanDurationMinutes: 100, failureProbability: 0, reworkEnabled: false, reworkTimePenaltyMinutes: 0 },
      ],
    };
    const result = runSimulation(config);
    expect(result.bottleneck.timeBottleneck).not.toBeNull();
    expect(result.bottleneck.timeBottleneck!.stageName).toBe('Slow');
    expect(result.bottleneck.timeBottleneck!.pctOfTotal).toBeGreaterThan(50);
  });

  it('returns null bottlenecks when no failures occur', () => {
    const config: PipelineConfig = {
      simulationCount: 100,
      stages: [
        { id: 's1', name: 'Perfect', meanDurationMinutes: 10, failureProbability: 0, reworkEnabled: false, reworkTimePenaltyMinutes: 0 },
      ],
    };
    const result = runSimulation(config);
    expect(result.bottleneck.yieldBottleneck).toBeNull();
  });
});
