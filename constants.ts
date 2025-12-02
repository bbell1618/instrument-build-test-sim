import { PipelineConfig } from './types';

export const DEFAULT_PIPELINE_CONFIG: PipelineConfig = {
  simulationCount: 2000,
  stages: [
    {
      id: 's1',
      name: 'Mechanical Assembly',
      meanDurationMinutes: 45,
      failureProbability: 0.02, // 2% fail
      reworkEnabled: true,
      reworkTimePenaltyMinutes: 30,
    },
    {
      id: 's2',
      name: 'Electronics Assembly',
      meanDurationMinutes: 60,
      failureProbability: 0.05, // 5% fail
      reworkEnabled: true,
      reworkTimePenaltyMinutes: 45,
    },
    {
      id: 's3',
      name: 'Calibration',
      meanDurationMinutes: 30,
      failureProbability: 0.10, // 10% fail
      reworkEnabled: false, // If calibration fails, unit is scrapped (example)
      reworkTimePenaltyMinutes: 0,
    },
    {
      id: 's4',
      name: 'Functional Test',
      meanDurationMinutes: 20,
      failureProbability: 0.03,
      reworkEnabled: true,
      reworkTimePenaltyMinutes: 20,
    },
    {
      id: 's5',
      name: 'Final QC',
      meanDurationMinutes: 15,
      failureProbability: 0.01,
      reworkEnabled: true,
      reworkTimePenaltyMinutes: 15,
    },
  ],
};