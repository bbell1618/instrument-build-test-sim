import { PipelineConfig, SimulationResult, StageStat, UnitResult } from '../types';

// Helper to generate Gaussian random number (Box-Muller transform)
// Used to vary duration slightly around the mean for realism
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
      // Skip remaining stages if already scrapped
      if (isScrap) break;

      let passes = 0;
      let durationInStage = 0;
      let stageFailed = false;
      let completedStage = false;

      // Logic: Simple pass/fail. 
      // If reworkEnabled, we might loop. For simplicity, we allow max 1 rework attempt to avoid infinite loops in this toy model,
      // or we can treat rework as just "adding time" and passing.
      // Let's implement: If fail -> check rework. If rework -> add time, roll again. If fail again -> scrap.
      
      const maxAttempts = stage.reworkEnabled ? 2 : 1;
      
      for (let attempt = 1; attempt <= maxAttempts; attempt++) {
        // Base duration + some noise (10% variance)
        const runTime = Math.max(0, gaussianRandom(stage.meanDurationMinutes, stage.meanDurationMinutes * 0.1));
        durationInStage += runTime;

        // Roll for failure
        const rolled = Math.random();
        if (rolled >= stage.failureProbability) {
          // Pass
          passes = attempt;
          completedStage = true;
          break;
        } else {
          // Fail
          if (attempt < maxAttempts) {
             // Will retry (rework), add penalty
             durationInStage += (stage.reworkTimePenaltyMinutes || 0);
          } else {
            // Final failure for this stage
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

  // Cycle times (only for good units usually, but let's include all for "time spent" analysis, 
  // though typically cycle time metric implies "time to produce a GOOD unit". 
  // Let's stick to Good Units for Avg Cycle Time).
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
    // Count how many units entered this stage
    // A unit enters stage N if it didn't fail at any stage prior to N
    // We can infer this from unitResults.
    
    // Units that entered = Units that have a record in stageDetails OR failed at a previous stage? 
    // Actually, our loop logic: "Skip remaining stages if already scrapped". 
    // So if stageDetails[stage.id] exists, it entered.
    
    const enteredUnits = unitResults.filter(u => u.stageDetails[stage.id] !== undefined);
    const passedUnits = enteredUnits.filter(u => !u.stageDetails[stage.id].failed);
    const failedCount = enteredUnits.length - passedUnits.length;
    
    const durations = enteredUnits.map(u => u.stageDetails[stage.id].duration);
    const avgDur = durations.length > 0 ? durations.reduce((a,b)=>a+b,0)/durations.length : 0;

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

  // Cycle Time Distribution (Histogram)
  const binCount = 20;
  const maxTime = Math.max(...goodUnitTimes, 100);
  const minTime = Math.min(...goodUnitTimes, 0);
  const range = maxTime - minTime;
  const binSize = range / binCount || 10;
  
  const histogram: Record<string, number> = {};
  for(let i = 0; i < binCount; i++) {
    const binLabel = Math.floor(minTime + (i * binSize)).toString();
    histogram[binLabel] = 0;
  }

  goodUnitTimes.forEach(t => {
    const binIndex = Math.min(Math.floor((t - minTime) / binSize), binCount - 1);
    const binLabel = Math.floor(minTime + (binIndex * binSize)).toString();
    if (histogram[binLabel] !== undefined) {
      histogram[binLabel]++;
    }
  });

  const cycleTimeDistribution = Object.entries(histogram).map(([bin, count]) => ({
    bin,
    count
  })).sort((a,b) => parseInt(a.bin) - parseInt(b.bin));

  // Yield Trend (Cumulative)
  // How many units survived up to stage N?
  const yieldTrend = stages.map(stage => {
    // Units that successfully completed this stage
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