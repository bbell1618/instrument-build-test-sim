import React, { useState, useEffect, useCallback } from 'react';
import { Play, RotateCcw, Box, FileJson, Bookmark, BookmarkCheck } from 'lucide-react';
import { PipelineConfig, SimulationResult } from './types';
import { DEFAULT_PIPELINE_CONFIG } from './constants';
import { runSimulation } from './services/simulator';
import { ConfigEditor, getConfigErrors } from './components/ConfigEditor';
import { ResultsView } from './components/ResultsView';

const STORAGE_KEY = 'instrument-sim-config';

function loadSavedConfig(): PipelineConfig {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (parsed && Array.isArray(parsed.stages) && typeof parsed.simulationCount === 'number') {
        return parsed;
      }
    }
  } catch {
    // Corrupted data, fall back to default
  }
  return DEFAULT_PIPELINE_CONFIG;
}

function saveConfig(config: PipelineConfig) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
  } catch {
    // Storage full or unavailable, silently ignore
  }
}

const App: React.FC = () => {
  const [config, setConfig] = useState<PipelineConfig>(loadSavedConfig);
  const [results, setResults] = useState<SimulationResult | null>(null);
  const [baseline, setBaseline] = useState<SimulationResult | null>(null);
  const [isSimulating, setIsSimulating] = useState(false);
  const [showJson, setShowJson] = useState(false);

  // Persist config to localStorage on change
  useEffect(() => {
    saveConfig(config);
  }, [config]);

  const validationErrors = getConfigErrors(config);
  const canRun = validationErrors.length === 0 && config.stages.length > 0;

  const handleRunSimulation = useCallback(() => {
    if (!canRun) return;
    setIsSimulating(true);
    setTimeout(() => {
      const res = runSimulation(config);
      setResults(res);
      setIsSimulating(false);
    }, 50);
  }, [config, canRun]);

  // Auto-run on first load if config is valid
  useEffect(() => {
    if (canRun) {
      handleRunSimulation();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Keyboard shortcut: Ctrl+Enter or Cmd+Enter to run simulation
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        e.preventDefault();
        handleRunSimulation();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [handleRunSimulation]);

  const handleReset = () => {
    setConfig(DEFAULT_PIPELINE_CONFIG);
    setResults(null);
    setBaseline(null);
    localStorage.removeItem(STORAGE_KEY);
  };

  const handleSetBaseline = () => {
    if (baseline) {
      setBaseline(null);
    } else if (results) {
      setBaseline(results);
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col text-slate-800">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 px-6 py-4 shadow-sm z-10">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-blue-600 p-2 rounded-lg text-white">
              <Box size={24} />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-900 tracking-tight">Instrument Build & Test Sim</h1>
              <p className="text-xs text-slate-500 font-medium">Production Pipeline Monte Carlo Simulator</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleSetBaseline}
              disabled={!results && !baseline}
              className={`p-2 rounded-lg transition-colors ${baseline ? 'text-blue-600 bg-blue-50 hover:bg-blue-100' : 'text-slate-500 hover:bg-slate-100'} disabled:opacity-30`}
              title={baseline ? 'Clear baseline comparison' : 'Set current results as baseline for comparison'}
            >
              {baseline ? <BookmarkCheck size={20} /> : <Bookmark size={20} />}
            </button>
            <button
              onClick={() => setShowJson(!showJson)}
              className="p-2 text-slate-500 hover:bg-slate-100 rounded-lg transition-colors"
              title="View Config JSON"
            >
              <FileJson size={20} />
            </button>
            <div className="h-6 w-px bg-slate-200 mx-1"></div>
            <button
              onClick={handleReset}
              disabled={isSimulating}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-slate-600 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors disabled:opacity-50"
            >
              <RotateCcw size={16} /> Reset
            </button>
            <button
              onClick={handleRunSimulation}
              disabled={isSimulating || !canRun}
              title={!canRun ? 'Fix validation errors before running' : 'Run simulation (Ctrl+Enter)'}
              className="flex items-center gap-2 px-5 py-2 text-sm font-bold text-white bg-blue-600 rounded-lg hover:bg-blue-700 active:bg-blue-800 transition-all shadow-sm hover:shadow-md disabled:opacity-70 disabled:cursor-not-allowed"
            >
              {isSimulating ? (
                 <>
                   <span className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></span>
                   Simulating...
                 </>
              ) : (
                <>
                  <Play size={16} fill="currentColor" /> Run
                </>
              )}
            </button>
          </div>
        </div>
        {baseline && (
          <div className="max-w-7xl mx-auto mt-2">
            <div className="text-[11px] text-blue-600 bg-blue-50 border border-blue-200 rounded px-3 py-1 inline-flex items-center gap-1.5">
              <BookmarkCheck size={12} />
              Comparing against baseline ({baseline.overallYield.toFixed(1)}% yield, {baseline.avgCycleTime.toFixed(0)} min avg)
            </div>
          </div>
        )}
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-6 grid grid-cols-1 lg:grid-cols-12 gap-6 overflow-hidden">

        {/* Left Panel: Configuration */}
        <div className={`lg:col-span-4 h-full flex flex-col transition-all duration-300 ${showJson ? 'hidden lg:flex' : 'flex'}`}>
           <ConfigEditor
             config={config}
             onConfigChange={setConfig}
             isSimulating={isSimulating}
           />
        </div>

        {/* Center/Right Panel: Visualization & Results */}
        <div className={`lg:col-span-${showJson ? '12' : '8'} h-full flex flex-col space-y-6 overflow-hidden`}>

           {showJson && (
             <div className="bg-slate-900 text-slate-50 p-6 rounded-lg font-mono text-sm overflow-auto h-96 shadow-inner border border-slate-700">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-slate-400 font-bold uppercase tracking-wider">Configuration JSON</h3>
                  <button onClick={() => setShowJson(false)} className="text-blue-400 hover:underline">Close</button>
                </div>
                <pre>{JSON.stringify(config, null, 2)}</pre>
             </div>
           )}

           {!showJson && (
             <ResultsView results={results} baseline={baseline} />
           )}

        </div>
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-slate-200 py-4 text-center text-xs text-slate-400">
        <p>
          Simulates the flow of units through defined stages.
          Uses Box-Muller transform for duration variance and pure probability rolls for failure/rework.
          <span className="mx-2">&middot;</span>
          <kbd className="px-1.5 py-0.5 bg-slate-100 border border-slate-200 rounded text-[10px] font-mono">Ctrl+Enter</kbd> to run
        </p>
      </footer>
    </div>
  );
};

export default App;
