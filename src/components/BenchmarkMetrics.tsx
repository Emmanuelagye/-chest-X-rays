import React, { useState } from 'react';
import { 
  BarChart3, Target, ShieldAlert, CheckCircle, 
  HelpCircle, Sliders, TrendingUp
} from 'lucide-react';
import { 
  BENCHMARK_ROC_POINTS, 
  BENCHMARK_PR_POINTS, 
  CALIBRATION_DATA, 
  computeMetricsForThreshold 
} from '../utils/metrics';

export const BenchmarkMetrics: React.FC = () => {
  const [threshold, setThreshold] = useState<number>(0.50);
  const metrics = computeMetricsForThreshold(threshold);

  // SVG coordinate helpers
  const svgWidth = 400;
  const svgHeight = 280;
  const pad = 40;

  const toRocSvg = (fpr: number, tpr: number) => {
    const x = pad + fpr * (svgWidth - pad * 2);
    const y = svgHeight - pad - tpr * (svgHeight - pad * 2);
    return `${x},${y}`;
  };

  const rocPath = BENCHMARK_ROC_POINTS.map((pt, i) => {
    const coord = toRocSvg(pt.fpr, pt.tpr);
    return i === 0 ? `M ${coord}` : `L ${coord}`;
  }).join(' ');

  const currentFpr = metrics.fp / 768;
  const currentTpr = metrics.tp / 480;
  const currentPtSvg = toRocSvg(currentFpr, currentTpr).split(',');

  return (
    <div className="flex flex-col gap-6">
      {/* Title & Threshold Controller Bar */}
      <div className="p-5 bg-slate-900/90 border border-slate-800 rounded-xl flex flex-col md:flex-row md:items-center justify-between gap-5">
        <div>
          <h2 className="text-lg font-bold text-slate-100 flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-cyan-400" />
            Validation Benchmark Suite & Dynamic Operating Point
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Evaluated on N = 1,248 chest radiographs from NIH ChestX-ray14 & RSNA Pneumonia challenge test cohorts.
          </p>
        </div>

        {/* Dynamic Decision Threshold Scrubber */}
        <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 flex flex-col gap-2 min-w-[300px]">
          <div className="flex items-center justify-between text-xs">
            <span className="font-semibold text-slate-200 flex items-center gap-1.5">
              <Sliders className="w-3.5 h-3.5 text-cyan-400" />
              Decision Threshold (τ)
            </span>
            <span className="font-mono text-cyan-400 font-bold tabular-nums text-sm">
              {threshold.toFixed(2)}
            </span>
          </div>
          <input
            type="range"
            min="0.10"
            max="0.90"
            step="0.05"
            value={threshold}
            onChange={(e) => setThreshold(parseFloat(e.target.value))}
            className="accent-cyan-400 cursor-pointer"
          />
          <div className="flex items-center justify-between text-[10px] font-mono text-slate-400">
            <span>High Sensitivity Triage (0.35)</span>
            <span>Balanced (0.50)</span>
            <span>High Specificity (0.75)</span>
          </div>
        </div>
      </div>

      {/* KPI Numerical Metrics Strip (Strict Tabular Formatting) */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3.5">
        <div className="p-3.5 bg-slate-900/80 border border-slate-800 rounded-xl">
          <div className="text-[11px] font-mono text-slate-400 uppercase tracking-wider">Sensitivity (Recall)</div>
          <div className="text-2xl font-bold font-mono text-cyan-400 tabular-nums mt-1">
            {(metrics.sensitivity * 100).toFixed(1)}%
          </div>
          <div className="text-[10px] text-slate-400 mt-0.5">TP / (TP + FN)</div>
        </div>

        <div className="p-3.5 bg-slate-900/80 border border-slate-800 rounded-xl">
          <div className="text-[11px] font-mono text-slate-400 uppercase tracking-wider">Specificity</div>
          <div className="text-2xl font-bold font-mono text-emerald-400 tabular-nums mt-1">
            {(metrics.specificity * 100).toFixed(1)}%
          </div>
          <div className="text-[10px] text-slate-400 mt-0.5">TN / (TN + FP)</div>
        </div>

        <div className="p-3.5 bg-slate-900/80 border border-slate-800 rounded-xl">
          <div className="text-[11px] font-mono text-slate-400 uppercase tracking-wider">Precision (PPV)</div>
          <div className="text-2xl font-bold font-mono text-purple-400 tabular-nums mt-1">
            {(metrics.ppv * 100).toFixed(1)}%
          </div>
          <div className="text-[10px] text-slate-400 mt-0.5">TP / (TP + FP)</div>
        </div>

        <div className="p-3.5 bg-slate-900/80 border border-slate-800 rounded-xl">
          <div className="text-[11px] font-mono text-slate-400 uppercase tracking-wider">Neg. Pred. Value (NPV)</div>
          <div className="text-2xl font-bold font-mono text-blue-400 tabular-nums mt-1">
            {(metrics.npv * 100).toFixed(1)}%
          </div>
          <div className="text-[10px] text-slate-400 mt-0.5">TN / (TN + FN)</div>
        </div>

        <div className="p-3.5 bg-slate-900/80 border border-slate-800 rounded-xl">
          <div className="text-[11px] font-mono text-slate-400 uppercase tracking-wider">F1-Score</div>
          <div className="text-2xl font-bold font-mono text-amber-400 tabular-nums mt-1">
            {metrics.f1.toFixed(3)}
          </div>
          <div className="text-[10px] text-slate-400 mt-0.5">Harmonic Mean</div>
        </div>

        <div className="p-3.5 bg-slate-900/80 border border-slate-800 rounded-xl">
          <div className="text-[11px] font-mono text-slate-400 uppercase tracking-wider">AUROC</div>
          <div className="text-2xl font-bold font-mono text-rose-400 tabular-nums mt-1">
            {metrics.auroc.toFixed(3)}
          </div>
          <div className="text-[10px] text-slate-400 mt-0.5">CheXNet: 0.942</div>
        </div>
      </div>

      {/* Curves & Confusion Matrix Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Interactive ROC Curve */}
        <div className="p-5 bg-slate-900/90 border border-slate-800 rounded-xl flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-semibold text-slate-200 flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-cyan-400" />
                Receiver Operating Characteristic (ROC)
              </h3>
              <span className="text-xs font-mono text-cyan-400 font-bold">AUC = 0.942</span>
            </div>
            <p className="text-[11px] text-slate-400 mb-3">
              Plots True Positive Rate vs False Positive Rate. Current operating point highlighted.
            </p>

            <div className="bg-slate-950 rounded-xl border border-slate-800 p-2 flex justify-center">
              <svg viewBox={`0 0 ${svgWidth} ${svgHeight}`} className="w-full max-w-[340px]">
                {/* Axes and Grid */}
                <line x1={pad} y1={svgHeight - pad} x2={svgWidth - pad} y2={svgHeight - pad} stroke="#334155" strokeWidth="1" />
                <line x1={pad} y1={pad} x2={pad} y2={svgHeight - pad} stroke="#334155" strokeWidth="1" />
                
                {/* Chance diagonal */}
                <line x1={pad} y1={svgHeight - pad} x2={svgWidth - pad} y2={pad} stroke="#475569" strokeWidth="1" strokeDasharray="3 3" />

                {/* ROC Curve Area fill */}
                <path
                  d={`${rocPath} L ${svgWidth - pad},${svgHeight - pad} Z`}
                  fill="rgba(6, 182, 212, 0.12)"
                />
                
                {/* ROC Curve line */}
                <path d={rocPath} fill="none" stroke="#06b6d4" strokeWidth="2.5" />

                {/* Current Operating point */}
                <circle cx={currentPtSvg[0]} cy={currentPtSvg[1]} r="6" fill="#f59e0b" stroke="#0f172a" strokeWidth="2" />

                {/* Axis Labels */}
                <text x={svgWidth / 2} y={svgHeight - 10} fill="#94a3b8" fontSize="10" textAnchor="middle" fontFamily="JetBrains Mono">
                  False Positive Rate (1 - Specificity)
                </text>
                <text x={12} y={svgHeight / 2} fill="#94a3b8" fontSize="10" textAnchor="middle" transform={`rotate(-90 12,${svgHeight / 2})`} fontFamily="JetBrains Mono">
                  True Positive Rate (Sensitivity)
                </text>
              </svg>
            </div>
          </div>
          <div className="text-[11px] font-mono text-slate-400 text-center mt-2">
            Selected Point: TPR = {(currentTpr * 100).toFixed(1)}% · FPR = {(currentFpr * 100).toFixed(1)}%
          </div>
        </div>

        {/* Dynamic Confusion Matrix */}
        <div className="p-5 bg-slate-900/90 border border-slate-800 rounded-xl flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-semibold text-slate-200 flex items-center gap-2">
                <Target className="w-4 h-4 text-cyan-400" />
                Dynamic Confusion Matrix (τ = {threshold.toFixed(2)})
              </h3>
              <span className="text-xs font-mono text-slate-400">Total N = 1,248</span>
            </div>
            <p className="text-[11px] text-slate-400 mb-4">
              Real-time classification outcome distribution on the benchmark validation cohort.
            </p>

            <div className="grid grid-cols-2 gap-3 bg-slate-950 p-4 rounded-xl border border-slate-800">
              {/* True Positive */}
              <div className="p-3.5 rounded-lg bg-emerald-950/40 border border-emerald-800/60 flex flex-col justify-between">
                <div>
                  <div className="text-[10px] font-mono uppercase text-emerald-400 font-semibold tracking-wider">
                    True Positive (TP)
                  </div>
                  <div className="text-2xl font-bold font-mono text-emerald-300 tabular-nums mt-1">
                    {metrics.tp}
                  </div>
                </div>
                <div className="text-[10px] text-emerald-400/80 font-mono mt-2">
                  Pneumonia correctly detected
                </div>
              </div>

              {/* False Negative */}
              <div className="p-3.5 rounded-lg bg-rose-950/40 border border-rose-800/60 flex flex-col justify-between">
                <div>
                  <div className="text-[10px] font-mono uppercase text-rose-400 font-semibold tracking-wider">
                    False Negative (FN)
                  </div>
                  <div className="text-2xl font-bold font-mono text-rose-300 tabular-nums mt-1">
                    {metrics.fn}
                  </div>
                </div>
                <div className="text-[10px] text-rose-400/80 font-mono mt-2">
                  Missed pneumonias (Type II error)
                </div>
              </div>

              {/* False Positive */}
              <div className="p-3.5 rounded-lg bg-amber-950/40 border border-amber-800/60 flex flex-col justify-between">
                <div>
                  <div className="text-[10px] font-mono uppercase text-amber-400 font-semibold tracking-wider">
                    False Positive (FP)
                  </div>
                  <div className="text-2xl font-bold font-mono text-amber-300 tabular-nums mt-1">
                    {metrics.fp}
                  </div>
                </div>
                <div className="text-[10px] text-amber-400/80 font-mono mt-2">
                  False alarm on normal CXR
                </div>
              </div>

              {/* True Negative */}
              <div className="p-3.5 rounded-lg bg-cyan-950/40 border border-cyan-800/60 flex flex-col justify-between">
                <div>
                  <div className="text-[10px] font-mono uppercase text-cyan-400 font-semibold tracking-wider">
                    True Negative (TN)
                  </div>
                  <div className="text-2xl font-bold font-mono text-cyan-300 tabular-nums mt-1">
                    {metrics.tn}
                  </div>
                </div>
                <div className="text-[10px] text-cyan-400/80 font-mono mt-2">
                  Normal CXRs correctly cleared
                </div>
              </div>
            </div>
          </div>

          <div className="text-[11px] font-mono text-slate-400 mt-3 pt-3 border-t border-slate-800 flex justify-between">
            <span>Accuracy: {(metrics.balancedAccuracy * 100).toFixed(1)}%</span>
            <span>Odds Ratio: {metrics.diagnosticOddsRatio.toFixed(1)}</span>
          </div>
        </div>

        {/* Probability Calibration Reliability Plot */}
        <div className="p-5 bg-slate-900/90 border border-slate-800 rounded-xl flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-semibold text-slate-200 flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-cyan-400" />
                Reliability Calibration Plot
              </h3>
              <span className="text-xs font-mono text-emerald-400">ECE = 0.018</span>
            </div>
            <p className="text-[11px] text-slate-400 mb-3">
              Expected Calibration Error (ECE). Verifies predicted confidence reflects true disease frequency.
            </p>

            <div className="space-y-1.5 bg-slate-950 p-3 rounded-xl border border-slate-800">
              {CALIBRATION_DATA.slice(0, 7).map((bin) => (
                <div key={bin.bin} className="flex items-center gap-2 text-[11px] font-mono">
                  <span className="w-16 text-slate-400">{bin.bin}</span>
                  <div className="flex-1 h-3 bg-slate-900 rounded overflow-hidden relative border border-slate-800">
                    {/* Predicted marker */}
                    <div 
                      className="absolute top-0 bottom-0 w-0.5 bg-slate-400 z-10"
                      style={{ left: `${bin.predicted * 100}%` }}
                    />
                    {/* Observed bar */}
                    <div 
                      className="h-full bg-cyan-500/80"
                      style={{ width: `${bin.observed * 100}%` }}
                    />
                  </div>
                  <span className="w-12 text-right text-slate-300 tabular-nums">
                    {(bin.observed * 100).toFixed(0)}%
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="text-[11px] text-slate-400 mt-2">
            Gray tick mark indicates predicted bin midpoint; cyan fill indicates verified clinical disease rate.
          </div>
        </div>
      </div>
    </div>
  );
};
