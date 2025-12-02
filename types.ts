export interface StageConfig {
  id: string;
  name: string;
  meanDurationMinutes: number;
  failureProbability: number; // 0.0 to 1.0
  reworkEnabled: boolean;
  reworkTimePenaltyMinutes?: number;
}

export interface PipelineConfig {
  stages: StageConfig[];
  simulationCount: number;
}

export interface UnitResult {
  id: number;
  isScrap: boolean;
  failedAtStageId: string | null;
  totalCycleTime: number;
  stageDetails: Record<string, {
    duration: number;
    passes: number; // 1 if passed first time, >1 if rework
    failed: boolean; // true if ultimately failed/scrapped here
  }>;
}

export interface StageStat {
  stageId: string;
  stageName: string;
  inputCount: number;
  passCount: number;
  failCount: number;
  yield: number;
  avgDuration: number;
}

export interface SimulationResult {
  totalUnits: number;
  goodUnits: number;
  scrappedUnits: number;
  overallYield: number;
  avgCycleTime: number;
  cycleTimeP95: number;
  stageStats: StageStat[];
  cycleTimeDistribution: { bin: string; count: number }[];
  yieldTrend: { stageName: string; cumulativeYield: number }[];
}