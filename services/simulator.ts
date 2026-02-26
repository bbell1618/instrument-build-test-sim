import { PipelineConfig, SimulationResult, StageStat, UnitResult, CycleTimeStats, BottleneckAnalysis } from '../types';

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

      const maxAttempts = stage.reworkEnabled ? 2 : 1;

      for (let attempt = 1; attempt <= maxAttempts; attempt++) {
        const runTime = Math.max(0, gaussianRandom(stage.meanDurationMinutes, stage.meanDurationMinutes * 0.1));
        durationInStage += runTime;

        if (Math.random() >= stage.failureProbability) {
          passes = attempt;
          completedStage = true;
          break;
        } else {
          if (attempt < maxAttempts) {
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

  // Cycle time stats (good units only)
  const goodUnitTimes = unitResults.filter(u => !u.isScrap).map(u => u.totalCycleTime);
  goodUnitTimes.sort((a, b) => a - b);
  const cycleTimeStats = computeCycleTimeStats(goodUnitTimes);

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

  // Bottleneck analysis
  const bottleneck = computeBottleneck(stageStats, cycleTimeStats.avg);

  // Cycle Time Distribution (Histogram)
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
    avgCycleTime: cycleTimeStats.avg,
    cycleTimeP95: cycleTimeStats.p95,
    cycleTimeStats,
    bottleneck,
    stageStats,
    cycleTimeDistribution,
    yieldTrend
  };
};

function computeCycleTimeStats(sortedTimes: number[]): CycleTimeStats {
  if (sortedTimes.length === 0) {
    return { avg: 0, median: 0, stddev: 0, min: 0, max: 0, p95: 0 };
  }

  const n = sortedTimes.length;
  const sum = sortedTimes.reduce((a, b) => a + b, 0);
  const avg = sum / n;

  const median = n % 2 === 0
    ? (sortedTimes[n / 2 - 1] + sortedTimes[n / 2]) / 2
    : sortedTimes[Math.floor(n / 2)];

  const variance = sortedTimes.reduce((acc, t) => acc + (t - avg) ** 2, 0) / n;
  const stddev = Math.sqrt(variance);

  return {
    avg,
    median,
    stddev,
    min: sortedTimes[0],
    max: sortedTimes[n - 1],
    p95: sortedTimes[Math.floor(n * 0.95)]
  };
}

function computeBottleneck(stageStats: StageStat[], avgTotalCycleTime: number): BottleneckAnalysis {
  if (stageStats.length === 0) {
    return { yieldBottleneck: null, timeBottleneck: null };
  }

  // Yield bottleneck: stage with the lowest yield (most failures)
  const worstYield = stageStats.reduce((worst, s) =>
    s.yield < worst.yield ? s : worst
  , stageStats[0]);

  const yieldBottleneck = worstYield.failCount > 0 ? {
    stageName: worstYield.stageName,
    stageId: worstYield.stageId,
    yield: worstYield.yield,
    unitsLost: worstYield.failCount,
  } : null;

  // Time bottleneck: stage consuming the most time
  const slowest = stageStats.reduce((worst, s) =>
    s.avgDuration > worst.avgDuration ? s : worst
  , stageStats[0]);

  const timeBottleneck = avgTotalCycleTime > 0 ? {
    stageName: slowest.stageName,
    stageId: slowest.stageId,
    avgDuration: slowest.avgDuration,
    pctOfTotal: (slowest.avgDuration / avgTotalCycleTime) * 100,
  } : null;

  return { yieldBottleneck, timeBottleneck };
}

function buildHistogram(values: number[]): { bin: string; count: number }[] {
  if (values.length === 0) return [];

  const binCount = Math.max(5, Math.min(30, Math.ceil(Math.log2(values.length) + 1)));

  const minVal = values[0];
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
