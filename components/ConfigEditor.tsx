import React, { useMemo, useRef } from 'react';
import { PipelineConfig, StageConfig } from '../types';
import { Trash2, Plus, AlertCircle, AlertTriangle, ChevronUp, ChevronDown, Upload, Download } from 'lucide-react';

interface ConfigEditorProps {
  config: PipelineConfig;
  onConfigChange: (newConfig: PipelineConfig) => void;
  isSimulating: boolean;
}

interface ValidationError {
  stageIndex: number;
  field: string;
  message: string;
}

function validateConfig(config: PipelineConfig): ValidationError[] {
  const errors: ValidationError[] = [];
  config.stages.forEach((stage, idx) => {
    if (!stage.name.trim()) {
      errors.push({ stageIndex: idx, field: 'name', message: 'Stage name is required' });
    }
    if (stage.meanDurationMinutes <= 0) {
      errors.push({ stageIndex: idx, field: 'meanDurationMinutes', message: 'Duration must be > 0' });
    }
    if (stage.failureProbability < 0 || stage.failureProbability > 1) {
      errors.push({ stageIndex: idx, field: 'failureProbability', message: 'Must be between 0 and 1' });
    }
    if (stage.reworkEnabled && (stage.reworkTimePenaltyMinutes ?? 0) < 0) {
      errors.push({ stageIndex: idx, field: 'reworkTimePenaltyMinutes', message: 'Penalty cannot be negative' });
    }
  });
  return errors;
}

export function getConfigErrors(config: PipelineConfig): ValidationError[] {
  return validateConfig(config);
}

export const ConfigEditor: React.FC<ConfigEditorProps> = ({ config, onConfigChange, isSimulating }) => {
  const validationErrors = useMemo(() => validateConfig(config), [config]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const getFieldError = (stageIndex: number, field: string): string | undefined => {
    return validationErrors.find(e => e.stageIndex === stageIndex && e.field === field)?.message;
  };

  const updateStage = (index: number, updates: Partial<StageConfig>) => {
    const newStages = [...config.stages];
    newStages[index] = { ...newStages[index], ...updates };
    onConfigChange({ ...config, stages: newStages });
  };

  const removeStage = (index: number) => {
    const newStages = config.stages.filter((_, i) => i !== index);
    onConfigChange({ ...config, stages: newStages });
  };

  const moveStage = (index: number, direction: -1 | 1) => {
    const target = index + direction;
    if (target < 0 || target >= config.stages.length) return;
    const newStages = [...config.stages];
    [newStages[index], newStages[target]] = [newStages[target], newStages[index]];
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

  const handleExportConfig = () => {
    const blob = new Blob([JSON.stringify(config, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'pipeline-config.json';
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleImportConfig = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const parsed = JSON.parse(ev.target?.result as string);
        if (parsed && Array.isArray(parsed.stages) && typeof parsed.simulationCount === 'number') {
          onConfigChange(parsed);
        }
      } catch {
        // Invalid JSON, ignore
      }
    };
    reader.readAsText(file);
    // Reset input so the same file can be re-imported
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-slate-200 h-full flex flex-col">
      <div className="p-4 border-b border-slate-100 bg-slate-50">
        <div className="flex justify-between items-center mb-2">
          <h2 className="font-semibold text-slate-800 flex items-center gap-2">
            Pipeline Configuration
          </h2>
          <div className="flex items-center gap-2">
            {validationErrors.length > 0 && (
              <div className="text-xs text-amber-600 bg-amber-50 px-2 py-1 rounded flex items-center gap-1" title={`${validationErrors.length} validation issue(s)`}>
                <AlertTriangle size={12} />
                {validationErrors.length}
              </div>
            )}
            <div className="text-xs text-slate-500 bg-slate-200 px-2 py-1 rounded">
              {config.stages.length} Stages
            </div>
          </div>
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleExportConfig}
            disabled={isSimulating}
            className="flex items-center gap-1 px-2.5 py-1 text-[11px] font-medium text-slate-500 bg-white border border-slate-200 rounded hover:bg-slate-50 transition-colors disabled:opacity-50"
            title="Export pipeline config as JSON"
          >
            <Download size={12} /> Export
          </button>
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={isSimulating}
            className="flex items-center gap-1 px-2.5 py-1 text-[11px] font-medium text-slate-500 bg-white border border-slate-200 rounded hover:bg-slate-50 transition-colors disabled:opacity-50"
            title="Import pipeline config from JSON"
          >
            <Upload size={12} /> Import
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".json"
            onChange={handleImportConfig}
            className="hidden"
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {config.stages.length === 0 && (
          <div className="text-center py-8 text-slate-400">
            <AlertCircle size={32} className="mx-auto mb-2 opacity-40" />
            <p className="text-sm font-medium">No stages defined</p>
            <p className="text-xs mt-1">Add at least one stage to run a simulation.</p>
          </div>
        )}

        {config.stages.map((stage, idx) => {
          const nameError = getFieldError(idx, 'name');
          const durationError = getFieldError(idx, 'meanDurationMinutes');
          const failureError = getFieldError(idx, 'failureProbability');
          const reworkError = getFieldError(idx, 'reworkTimePenaltyMinutes');
          const hasErrors = nameError || durationError || failureError || reworkError;

          return (
            <div key={stage.id} className={`border rounded-lg p-4 bg-white shadow-sm relative group transition-all hover:shadow-md ${hasErrors ? 'border-amber-300 hover:border-amber-400' : 'border-slate-200 hover:border-blue-300'}`}>
              {/* Stage controls: reorder + delete */}
              <div className="absolute top-2 right-2 flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                  onClick={() => moveStage(idx, -1)}
                  disabled={isSimulating || idx === 0}
                  className="p-1 text-slate-400 hover:text-blue-500 disabled:opacity-30 disabled:hover:text-slate-400"
                  title="Move up"
                >
                  <ChevronUp size={14} />
                </button>
                <button
                  onClick={() => moveStage(idx, 1)}
                  disabled={isSimulating || idx === config.stages.length - 1}
                  className="p-1 text-slate-400 hover:text-blue-500 disabled:opacity-30 disabled:hover:text-slate-400"
                  title="Move down"
                >
                  <ChevronDown size={14} />
                </button>
                <button
                  onClick={() => removeStage(idx)}
                  disabled={isSimulating}
                  className="p-1 text-slate-400 hover:text-red-500 disabled:opacity-0"
                  title="Remove Stage"
                >
                  <Trash2 size={14} />
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="col-span-1 md:col-span-2">
                  <label className="block text-xs font-medium text-slate-500 mb-1">Stage Name</label>
                  <input
                    type="text"
                    value={stage.name}
                    onChange={(e) => updateStage(idx, { name: e.target.value })}
                    disabled={isSimulating}
                    className={`w-full text-sm font-semibold text-slate-800 border-b outline-none pb-1 bg-transparent ${nameError ? 'border-amber-400' : 'border-slate-200 focus:border-blue-500'}`}
                  />
                  {nameError && <p className="text-[10px] text-amber-600 mt-1">{nameError}</p>}
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1">Mean Duration (min)</label>
                  <input
                    type="number"
                    min="0"
                    value={stage.meanDurationMinutes}
                    onChange={(e) => updateStage(idx, { meanDurationMinutes: parseFloat(e.target.value) || 0 })}
                    disabled={isSimulating}
                    className={`w-full text-sm border rounded px-2 py-1.5 outline-none ${durationError ? 'border-amber-400 focus:ring-2 focus:ring-amber-100' : 'focus:ring-2 focus:ring-blue-100'}`}
                  />
                  {durationError && <p className="text-[10px] text-amber-600 mt-1">{durationError}</p>}
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
                      className={`w-20 text-sm border rounded px-2 py-1.5 outline-none ${failureError ? 'border-amber-400 focus:ring-2 focus:ring-amber-100' : 'focus:ring-2 focus:ring-blue-100'}`}
                    />
                    <span className="text-xs text-slate-400">
                      ({(stage.failureProbability * 100).toFixed(1)}%)
                    </span>
                  </div>
                  {failureError && <p className="text-[10px] text-amber-600 mt-1">{failureError}</p>}
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
                        className={`w-full text-sm border rounded px-2 py-1.5 outline-none bg-slate-50 ${reworkError ? 'border-amber-400 focus:ring-2 focus:ring-amber-100' : 'focus:ring-2 focus:ring-blue-100'}`}
                      />
                      {reworkError && <p className="text-[10px] text-amber-600 mt-1">{reworkError}</p>}
                      <p className="text-[10px] text-slate-400 mt-1 flex items-center gap-1">
                        <AlertCircle size={10} /> Adds time and retries once.
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}

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
          onChange={(e) => {
            const val = parseInt(e.target.value) || 1000;
            onConfigChange({ ...config, simulationCount: Math.max(100, Math.min(50000, val)) });
          }}
          disabled={isSimulating}
          className="w-full text-sm border rounded px-2 py-2 focus:ring-2 focus:ring-blue-100 outline-none"
        />
        <p className="text-[10px] text-slate-400 mt-1">Higher counts increase accuracy but take longer (100–50,000).</p>
      </div>
    </div>
  );
};
