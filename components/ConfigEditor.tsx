import React from 'react';
import { PipelineConfig, StageConfig } from '../types';
import { Trash2, Plus, AlertCircle } from 'lucide-react';

interface ConfigEditorProps {
  config: PipelineConfig;
  onConfigChange: (newConfig: PipelineConfig) => void;
  isSimulating: boolean;
}

export const ConfigEditor: React.FC<ConfigEditorProps> = ({ config, onConfigChange, isSimulating }) => {
  const updateStage = (index: number, updates: Partial<StageConfig>) => {
    const newStages = [...config.stages];
    newStages[index] = { ...newStages[index], ...updates };
    onConfigChange({ ...config, stages: newStages });
  };

  const removeStage = (index: number) => {
    const newStages = config.stages.filter((_, i) => i !== index);
    onConfigChange({ ...config, stages: newStages });
  };

  const addStage = () => {
    const newStage: StageConfig = {
      id: `s${Date.now()}`,
      name: 'New Stage',
      meanDurationMinutes: 30,
      failureProbability: 0.05,
      reworkEnabled: false,
      reworkTimePenaltyMinutes: 0
    };
    onConfigChange({ ...config, stages: [...config.stages, newStage] });
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-slate-200 h-full flex flex-col">
      <div className="p-4 border-b border-slate-100 bg-slate-50 flex justify-between items-center">
        <h2 className="font-semibold text-slate-800 flex items-center gap-2">
          Pipeline Configuration
        </h2>
        <div className="text-xs text-slate-500 bg-slate-200 px-2 py-1 rounded">
          {config.stages.length} Stages
        </div>
      </div>
      
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {config.stages.map((stage, idx) => (
          <div key={stage.id} className="border border-slate-200 rounded-lg p-4 bg-white shadow-sm relative group transition-all hover:border-blue-300 hover:shadow-md">
            <button 
              onClick={() => removeStage(idx)}
              disabled={isSimulating}
              className="absolute top-2 right-2 p-1 text-slate-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity disabled:opacity-0"
              title="Remove Stage"
            >
              <Trash2 size={16} />
            </button>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="col-span-1 md:col-span-2">
                <label className="block text-xs font-medium text-slate-500 mb-1">Stage Name</label>
                <input
                  type="text"
                  value={stage.name}
                  onChange={(e) => updateStage(idx, { name: e.target.value })}
                  disabled={isSimulating}
                  className="w-full text-sm font-semibold text-slate-800 border-b border-slate-200 focus:border-blue-500 outline-none pb-1 bg-transparent"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">Mean Duration (min)</label>
                <input
                  type="number"
                  min="0"
                  value={stage.meanDurationMinutes}
                  onChange={(e) => updateStage(idx, { meanDurationMinutes: parseFloat(e.target.value) || 0 })}
                  disabled={isSimulating}
                  className="w-full text-sm border rounded px-2 py-1.5 focus:ring-2 focus:ring-blue-100 outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">Failure Rate (0-1)</label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min="0"
                    max="1"
                    step="0.01"
                    value={stage.failureProbability}
                    onChange={(e) => updateStage(idx, { failureProbability: parseFloat(e.target.value) || 0 })}
                    disabled={isSimulating}
                    className="w-20 text-sm border rounded px-2 py-1.5 focus:ring-2 focus:ring-blue-100 outline-none"
                  />
                  <span className="text-xs text-slate-400">
                    ({(stage.failureProbability * 100).toFixed(1)}%)
                  </span>
                </div>
              </div>

              <div className="col-span-1 md:col-span-2 pt-2 border-t border-slate-100">
                <div className="flex items-center gap-2 mb-2">
                  <input
                    type="checkbox"
                    id={`rework-${stage.id}`}
                    checked={stage.reworkEnabled}
                    onChange={(e) => updateStage(idx, { reworkEnabled: e.target.checked })}
                    disabled={isSimulating}
                    className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                  />
                  <label htmlFor={`rework-${stage.id}`} className="text-sm text-slate-700 select-none cursor-pointer">
                    Enable Rework on Failure
                  </label>
                </div>
                
                {stage.reworkEnabled && (
                  <div className="ml-6 animate-in fade-in slide-in-from-top-1 duration-200">
                    <label className="block text-xs font-medium text-slate-500 mb-1">Rework Penalty (min)</label>
                    <input
                      type="number"
                      min="0"
                      value={stage.reworkTimePenaltyMinutes || 0}
                      onChange={(e) => updateStage(idx, { reworkTimePenaltyMinutes: parseFloat(e.target.value) || 0 })}
                      disabled={isSimulating}
                      className="w-full text-sm border rounded px-2 py-1.5 focus:ring-2 focus:ring-blue-100 outline-none bg-slate-50"
                    />
                    <p className="text-[10px] text-slate-400 mt-1 flex items-center gap-1">
                      <AlertCircle size={10} /> Adds time and retries once.
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}

        <button
          onClick={addStage}
          disabled={isSimulating}
          className="w-full py-3 border-2 border-dashed border-slate-300 rounded-lg text-slate-500 hover:border-blue-400 hover:text-blue-500 hover:bg-blue-50 transition-colors flex items-center justify-center gap-2 font-medium text-sm"
        >
          <Plus size={16} /> Add Stage
        </button>
      </div>

      <div className="p-4 border-t border-slate-200 bg-slate-50">
        <label className="block text-xs font-medium text-slate-500 mb-1">Simulated Units</label>
        <input
          type="number"
          min="100"
          max="50000"
          step="100"
          value={config.simulationCount}
          onChange={(e) => onConfigChange({ ...config, simulationCount: parseInt(e.target.value) || 1000 })}
          disabled={isSimulating}
          className="w-full text-sm border rounded px-2 py-2 focus:ring-2 focus:ring-blue-100 outline-none"
        />
        <p className="text-[10px] text-slate-400 mt-1">Higher counts increase accuracy but take longer.</p>
      </div>
    </div>
  );
};