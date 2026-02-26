import { PipelineConfig, SimulationResult, StageStat, UnitResult } from '../types';

// Box-Muller transform for Gaussian random numbers
function gaussianRandom(mean: number, stdev: number): number {
  const u = 1 - Math.random();
  const v = Math.random();
  const z = Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
  return z * stdev + mean;
}

export const runSimulation = (config: PipelineConfig): SimulationResult => {
  const { stages, simulationCount } = config;
  const unitResults: UnitResult[] = [];

  // 1. Run Monte Carlo for N units
  for (let i = 0; i < simulationCount; i++) {
    let currentCycleTime = 0;
    let isScrap = false;
    let failedAtStageId: string | null = null;
    const stageDetails: UnitResult['stageDetails'] = {};

    for (const stage of stages) {
      if (isScrap) break;

      let passes = 0;
      let durationInStage = 0;
      let stageFailed = false;
      let completedStage = false;

      // If rework is enabled, allow 1 rework attempt (2 total).
      // If rework is disabled, single attempt only.
      const maxAttempts = stage.reworkEnabled ? 2 : 1;

      for (let attempt = 1; attempt <= maxAttempts; attempt++) {
        // Duration with 10% Gaussian variance, floored at 0
        const runTime = Math.max(0, gaussianRandom(stage.meanDurationMinutes, stage.meanDurationMinutes * 0.1));
        durationInStage += runTime;

        // Roll for failure
        if (Math.random() >= stage.failureProbability) {
          passes = attempt;
          completedStage = true;
          break;
        } else {
          if (attempt < maxAttempts) {
            // Will retry — add rework time penalty
            durationInStage += (stage.reworkTimePenaltyMinutes || 0);
          } else {
            stageFailed = true;
          }
        }
      }

      currentCycleTime += durationInStage;

      stageDetails[stage.id] = {
        duration: durationInStage,
        passes: completedStage ? passes : 0,
        failed: stageFailed
      };

      if (stageFailed) {
        isScrap = true;
        failedAtStageId = stage.id;
      }
    }

    unitResults.push({
      id: i,
      isScrap,
      failedAtStageId,
      totalCycleTime: currentCycleTime,
      stageDetails
    });
  }

  // 2. Aggregate Results
  const totalUnits = simulationCount;
  const scrappedUnits = unitResults.filter(u => u.isScrap).length;
  const goodUnits = totalUnits - scrappedUnits;
  const overallYield = (goodUnits / totalUnits) * 100;

  // Cycle times for good units
  const goodUnitTimes = unitResults.filter(u => !u.isScrap).map(u => u.totalCycleTime);
  const avgCycleTime = goodUnitTimes.length > 0
    ? goodUnitTimes.reduce((a, b) => a + b, 0) / goodUnitTimes.length
    : 0;

  // P95
  goodUnitTimes.sort((a, b) => a - b);
  const cycleTimeP95 = goodUnitTimes.length > 0
    ? goodUnitTimes[Math.floor(goodUnitTimes.length * 0.95)]
    : 0;

  // Stage Stats
  const stageStats: StageStat[] = stages.map(stage => {
    const enteredUnits = unitResults.filter(u => u.stageDetails[stage.id] !== undefined);
    const passedUnits = enteredUnits.filter(u => !u.stageDetails[stage.id].failed);
    const failedCount = enteredUnits.length - passedUnits.length;

    const durations = enteredUnits.map(u => u.stageDetails[stage.id].duration);
    const avgDur = durations.length > 0 ? durations.reduce((a, b) => a + b, 0) / durations.length : 0;

    return {
      stageId: stage.id,
      stageName: stage.name,
      inputCount: enteredUnits.length,
      passCount: passedUnits.length,
      failCount: failedCount,
      yield: enteredUnits.length > 0 ? (passedUnits.length / enteredUnits.length) * 100 : 0,
      avgDuration: avgDur
    };
  });

  // Cycle Time Distribution (Histogram) — use Sturges' rule for bin count
  const cycleTimeDistribution = buildHistogram(goodUnitTimes);

  // Yield Trend (Cumulative)
  const yieldTrend = stages.map(stage => {
    const passedStageCount = unitResults.filter(u => {
      const detail = u.stageDetails[stage.id];
      return detail && !detail.failed;
    }).length;

    return {
      stageName: stage.name,
      cumulativeYield: (passedStageCount / totalUnits) * 100
    };
  });

  return {
    totalUnits,
    goodUnits,
    scrappedUnits,
    overallYield,
    avgCycleTime,
    cycleTimeP95,
    stageStats,
    cycleTimeDistribution,
    yieldTrend
  };
};

function buildHistogram(values: number[]): { bin: string; count: number }[] {
  if (values.length === 0) return [];

  // Sturges' rule: k = ceil(log2(n) + 1), clamped to [5, 30]
  const binCount = Math.max(5, Math.min(30, Math.ceil(Math.log2(values.length) + 1)));

  const minVal = values[0]; // already sorted
  const maxVal = values[values.length - 1];
  const range = maxVal - minVal;
  const binSize = range / binCount || 1;

  const bins: { bin: string; count: number }[] = [];
  for (let i = 0; i < binCount; i++) {
    const binStart = minVal + i * binSize;
    bins.push({ bin: Math.round(binStart).toString(), count: 0 });
  }

  for (const t of values) {
    const idx = Math.min(Math.floor((t - minVal) / binSize), binCount - 1);
    bins[idx].count++;
  }

  return bins;
}
