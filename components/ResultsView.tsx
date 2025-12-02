import React from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, 
  LineChart, Line, AreaChart, Area
} from 'recharts';
import { SimulationResult } from '../types';
import { Download, Activity, CheckCircle, Clock } from 'lucide-react';

interface ResultsViewProps {
  results: SimulationResult | null;
}

export const ResultsView: React.FC<ResultsViewProps> = ({ results }) => {
  if (!results) {
    return (
      <div className="h-full flex flex-col items-center justify-center text-slate-400 bg-slate-50/50 rounded-lg border-2 border-dashed border-slate-200">
        <Activity size={48} className="mb-4 opacity-20" />
        <p className="font-medium">No results yet</p>
        <p className="text-sm">Run a simulation to view analysis.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in zoom-in-95 duration-500">
      
      {/* Key Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-lg shadow-sm border border-slate-200">
          <div className="flex items-center gap-2 text-slate-500 mb-2">
            <CheckCircle size={18} className="text-emerald-500" />
            <span className="text-xs font-bold uppercase tracking-wider">Overall Yield</span>
          </div>
          <div className="text-3xl font-bold text-slate-800">
            {results.overallYield.toFixed(2)}<span className="text-lg text-slate-400">%</span>
          </div>
          <div className="text-xs text-slate-400 mt-1">
            {results.goodUnits.toLocaleString()} / {results.totalUnits.toLocaleString()} units passed
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg shadow-sm border border-slate-200">
          <div className="flex items-center gap-2 text-slate-500 mb-2">
            <Clock size={18} className="text-blue-500" />
            <span className="text-xs font-bold uppercase tracking-wider">Avg Cycle Time</span>
          </div>
          <div className="text-3xl font-bold text-slate-800">
            {results.avgCycleTime.toFixed(1)}
            <span className="text-sm font-medium text-slate-400 ml-1">min</span>
          </div>
          <div className="text-xs text-slate-400 mt-1">
            Per good unit
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg shadow-sm border border-slate-200">
          <div className="flex items-center gap-2 text-slate-500 mb-2">
            <Activity size={18} className="text-amber-500" />
            <span className="text-xs font-bold uppercase tracking-wider">95th Percentile</span>
          </div>
          <div className="text-3xl font-bold text-slate-800">
            {results.cycleTimeP95.toFixed(1)}
             <span className="text-sm font-medium text-slate-400 ml-1">min</span>
          </div>
          <div className="text-xs text-slate-400 mt-1">
            Max time for 95% of output
          </div>
        </div>

         <div className="bg-white p-4 rounded-lg shadow-sm border border-slate-200">
          <div className="flex items-center gap-2 text-slate-500 mb-2">
            <Download size={18} className="text-red-500" />
            <span className="text-xs font-bold uppercase tracking-wider">Scrap Rate</span>
          </div>
          <div className="text-3xl font-bold text-slate-800">
            {(100 - results.overallYield).toFixed(2)}<span className="text-lg text-slate-400">%</span>
          </div>
          <div className="text-xs text-slate-400 mt-1">
            {results.scrappedUnits.toLocaleString()} units lost
          </div>
        </div>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Stage Yield Chart */}
        <div className="bg-white p-4 rounded-lg shadow-sm border border-slate-200 flex flex-col">
          <h3 className="text-sm font-bold text-slate-700 mb-4">Stage-by-Stage Yield (%)</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={results.stageStats} layout="vertical" margin={{ left: 40 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={true} />
                <XAxis type="number" domain={[0, 100]} />
                <YAxis dataKey="stageName" type="category" width={100} tick={{fontSize: 11}} />
                <Tooltip 
                  formatter={(value: number) => [`${value.toFixed(2)}%`, 'Yield']}
                  contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                />
                <Bar dataKey="yield" fill="#10b981" radius={[0, 4, 4, 0]} barSize={20} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Cumulative Yield Trend */}
         <div className="bg-white p-4 rounded-lg shadow-sm border border-slate-200 flex flex-col">
          <h3 className="text-sm font-bold text-slate-700 mb-4">Cumulative Throughput (%)</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={results.yieldTrend}>
                <defs>
                  <linearGradient id="colorYield" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.1}/>
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="stageName" tick={{fontSize: 10}} interval={0} angle={-15} textAnchor="end" height={40}/>
                <YAxis domain={[0, 100]} />
                <Tooltip 
                  formatter={(value: number) => [`${value.toFixed(2)}%`, 'Cumulative Yield']} 
                  contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                />
                <Area type="monotone" dataKey="cumulativeYield" stroke="#3b82f6" fillOpacity={1} fill="url(#colorYield)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Cycle Time Distribution */}
        <div className="bg-white p-4 rounded-lg shadow-sm border border-slate-200 flex flex-col lg:col-span-2">
          <h3 className="text-sm font-bold text-slate-700 mb-4">Cycle Time Distribution (Good Units)</h3>
          <div className="h-64">
             <ResponsiveContainer width="100%" height="100%">
              <BarChart data={results.cycleTimeDistribution}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="bin" name="Time (min)" tick={{fontSize: 12}} />
                <YAxis />
                <Tooltip 
                  cursor={{fill: '#f1f5f9'}}
                  labelFormatter={(label) => `~${label} min`}
                  formatter={(value: number) => [value, 'Units']}
                  contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                />
                <Bar dataKey="count" fill="#6366f1" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

      </div>

      {/* Detailed Table */}
      <div className="bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100">
           <h3 className="text-sm font-bold text-slate-700">Detailed Stage Statistics</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left text-slate-500">
            <thead className="text-xs text-slate-700 uppercase bg-slate-50">
              <tr>
                <th className="px-6 py-3">Stage</th>
                <th className="px-6 py-3 text-right">Input</th>
                <th className="px-6 py-3 text-right">Passed</th>
                <th className="px-6 py-3 text-right">Failed</th>
                <th className="px-6 py-3 text-right">Yield</th>
                <th className="px-6 py-3 text-right">Avg Duration</th>
              </tr>
            </thead>
            <tbody>
              {results.stageStats.map((stat) => (
                <tr key={stat.stageId} className="bg-white border-b hover:bg-slate-50">
                  <td className="px-6 py-4 font-medium text-slate-900">{stat.stageName}</td>
                  <td className="px-6 py-4 text-right">{stat.inputCount.toLocaleString()}</td>
                  <td className="px-6 py-4 text-right text-emerald-600 font-medium">{stat.passCount.toLocaleString()}</td>
                  <td className="px-6 py-4 text-right text-red-500">{stat.failCount.toLocaleString()}</td>
                  <td className="px-6 py-4 text-right font-semibold text-slate-800">{stat.yield.toFixed(2)}%</td>
                  <td className="px-6 py-4 text-right">{stat.avgDuration.toFixed(1)} min</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
};