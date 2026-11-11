import React, { useState } from 'react';
import { Sliders, Activity, Sparkles, RefreshCw, Cpu, Layers } from 'lucide-react';
import { TRAINING_EPOCHS_DATA } from '../utils/metrics';

export const TrainingSimulator: React.FC = () => {
  const [lossType, setLossType] = useState<'focal' | 'weighted_bce' | 'bce'>('focal');
  const [focalGamma, setFocalGamma] = useState<number>(2.0);
  const [learningRate, setLearningRate] = useState<string>('1e-4');
  const [augmentation, setAugmentation] = useState<{
    cutmix: boolean;
    affineRotate: boolean;
    elasticDeform: boolean;
    horizontalFlip: boolean;
  }>({
    cutmix: true,
    affineRotate: true,
    elasticDeform: false,
    horizontalFlip: true,
  });

  const [activeEpochIndex, setActiveEpochIndex] = useState<number>(49);
  const activeEpoch = TRAINING_EPOCHS_DATA[activeEpochIndex];

  // SVG dimensions for training loss graph
  const svgWidth = 500;
  const svgHeight = 220;
  const pad = 35;

  const toLossSvg = (epoch: number, val: number, maxVal = 0.8) => {
    const x = pad + ((epoch - 1) / 49) * (svgWidth - pad * 2);
    const y = svgHeight - pad - (val / maxVal) * (svgHeight - pad * 2);
    return `${x},${y}`;
  };

  const trainLossPath = TRAINING_EPOCHS_DATA.map((d, i) => {
    const coord = toLossSvg(d.epoch, d.trainLoss);
    return i === 0 ? `M ${coord}` : `L ${coord}`;
  }).join(' ');

  const valLossPath = TRAINING_EPOCHS_DATA.map((d, i) => {
    const coord = toLossSvg(d.epoch, d.valLoss);
    return i === 0 ? `M ${coord}` : `L ${coord}`;
  }).join(' ');

  const aurocPath = TRAINING_EPOCHS_DATA.map((d, i) => {
    // Scale AUROC (0.6 to 1.0) into graph space
    const normalized = (d.valAuroc - 0.6) / 0.4;
    const x = pad + ((d.epoch - 1) / 49) * (svgWidth - pad * 2);
    const y = svgHeight - pad - normalized * (svgHeight - pad * 2);
    return i === 0 ? `M ${x},${y}` : `L ${x},${y}`;
  }).join(' ');

  return (
    <div className="flex flex-col gap-6">
      {/* Title */}
      <div className="p-5 bg-slate-900/90 border border-slate-800 rounded-xl">
        <h2 className="text-lg font-bold text-slate-100 flex items-center gap-2">
          <Activity className="w-5 h-5 text-cyan-400" />
          Model Training Hyperparameters & Convergence Studio
        </h2>
        <p className="text-xs text-slate-400 mt-1">
          Simulated fine-tuning environment for DenseNet-121 pre-trained on ImageNet and adapted to ChestX-ray14.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Left Column: Hyperparameter Controls */}
        <div className="p-5 bg-slate-900/90 border border-slate-800 rounded-xl flex flex-col gap-4">
          <h3 className="text-sm font-semibold text-slate-200 flex items-center gap-2">
            <Sliders className="w-4 h-4 text-cyan-400" />
            Training Configuration
          </h3>

          {/* Loss Function */}
          <div>
            <label className="text-[11px] font-mono text-slate-400 uppercase tracking-wider block mb-1.5">
              Loss Function
            </label>
            <div className="flex flex-col gap-1.5">
              {[
                { id: 'focal', name: 'Focal Loss (Lin et al.)', desc: 'Focuses on hard false negatives' },
                { id: 'weighted_bce', name: 'Class-Weighted BCE', desc: 'β = 2.4 penalty for underrepresented positive cases' },
                { id: 'bce', name: 'Standard Binary Cross-Entropy', desc: 'Baseline unweighted likelihood' },
              ].map((item) => (
                <button
                  key={item.id}
                  onClick={() => setLossType(item.id as any)}
                  className={`p-2.5 rounded-lg border text-left text-xs transition-colors ${
                    lossType === item.id
                      ? 'bg-cyan-950/60 border-cyan-500/50 text-cyan-300'
                      : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <div className="font-semibold text-slate-200">{item.name}</div>
                  <div className="text-[10px] text-slate-400 mt-0.5">{item.desc}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Focal Gamma Slider if Focal Loss */}
          {lossType === 'focal' && (
            <div className="p-3 bg-slate-950 rounded-lg border border-slate-800 flex flex-col gap-1.5">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-300">Focusing Parameter (γ)</span>
                <span className="font-mono text-cyan-400 font-bold tabular-nums">{focalGamma.toFixed(1)}</span>
              </div>
              <input
                type="range"
                min="1.0"
                max="4.0"
                step="0.5"
                value={focalGamma}
                onChange={(e) => setFocalGamma(parseFloat(e.target.value))}
                className="accent-cyan-400 cursor-pointer"
              />
            </div>
          )}

          {/* Data Augmentation Checkboxes */}
          <div>
            <label className="text-[11px] font-mono text-slate-400 uppercase tracking-wider block mb-2">
              Radiographic Data Augmentations
            </label>
            <div className="grid grid-cols-2 gap-2 text-xs">
              {[
                { key: 'cutmix', label: 'CutMix / MixUp' },
                { key: 'affineRotate', label: 'Affine Rot (±10°)' },
                { key: 'horizontalFlip', label: 'Horizontal Flip' },
                { key: 'elasticDeform', label: 'Elastic Deform' },
              ].map((aug) => (
                <button
                  key={aug.key}
                  onClick={() =>
                    setAugmentation((prev) => ({
                      ...prev,
                      [aug.key]: !prev[aug.key as keyof typeof prev],
                    }))
                  }
                  className={`p-2 rounded-lg border text-left text-[11px] transition-colors ${
                    augmentation[aug.key as keyof typeof augmentation]
                      ? 'bg-cyan-950/50 border-cyan-500/40 text-cyan-300'
                      : 'bg-slate-950 border-slate-800 text-slate-400'
                  }`}
                >
                  {aug.label}
                </button>
              ))}
            </div>
          </div>

          {/* Learning Rate Scheduler */}
          <div>
            <label className="text-[11px] font-mono text-slate-400 uppercase tracking-wider block mb-1.5">
              Learning Rate Scheduler
            </label>
            <div className="p-2.5 bg-slate-950 rounded-lg border border-slate-800 text-xs font-mono text-slate-300 flex items-center justify-between">
              <span>Cosine Annealing + Warmup</span>
              <span className="text-cyan-400">1e-4 → 1e-6</span>
            </div>
          </div>
        </div>

        {/* Right 2 Columns: Convergence Curves */}
        <div className="p-5 bg-slate-900/90 border border-slate-800 rounded-xl lg:col-span-2 flex flex-col justify-between">
          <div>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
              <h3 className="text-sm font-semibold text-slate-200">
                50-Epoch Convergence Curves & Validation AUROC
              </h3>
              <div className="flex items-center gap-4 text-xs font-mono">
                <span className="flex items-center gap-1.5 text-cyan-400">
                  <span className="w-2.5 h-0.5 bg-cyan-400 rounded-full" />
                  Train Loss
                </span>
                <span className="flex items-center gap-1.5 text-amber-400">
                  <span className="w-2.5 h-0.5 bg-amber-400 rounded-full" />
                  Val Loss
                </span>
                <span className="flex items-center gap-1.5 text-emerald-400">
                  <span className="w-2.5 h-0.5 bg-emerald-400 rounded-full" />
                  Val AUROC
                </span>
              </div>
            </div>

            {/* SVG Training Chart */}
            <div className="bg-slate-950 rounded-xl border border-slate-800 p-2 flex justify-center overflow-hidden">
              <svg viewBox={`0 0 ${svgWidth} ${svgHeight}`} className="w-full h-auto">
                {/* Horizontal grid lines */}
                <line x1={pad} y1={pad} x2={svgWidth - pad} y2={pad} stroke="#1e293b" strokeWidth="1" />
                <line x1={pad} y1={(pad + svgHeight - pad) / 2} x2={svgWidth - pad} y2={(pad + svgHeight - pad) / 2} stroke="#1e293b" strokeWidth="1" />
                <line x1={pad} y1={svgHeight - pad} x2={svgWidth - pad} y2={svgHeight - pad} stroke="#334155" strokeWidth="1" />
                <line x1={pad} y1={pad} x2={pad} y2={svgHeight - pad} stroke="#334155" strokeWidth="1" />

                {/* Training Loss Path */}
                <path d={trainLossPath} fill="none" stroke="#06b6d4" strokeWidth="2" />
                {/* Validation Loss Path */}
                <path d={valLossPath} fill="none" stroke="#f59e0b" strokeWidth="2" strokeDasharray="4 2" />
                {/* AUROC Curve */}
                <path d={aurocPath} fill="none" stroke="#10b981" strokeWidth="2" />

                {/* Active Epoch Vertical Cursor */}
                {activeEpoch && (
                  <line
                    x1={pad + ((activeEpoch.epoch - 1) / 49) * (svgWidth - pad * 2)}
                    y1={pad}
                    x2={pad + ((activeEpoch.epoch - 1) / 49) * (svgWidth - pad * 2)}
                    y2={svgHeight - pad}
                    stroke="#ffffff"
                    strokeWidth="1.2"
                    strokeDasharray="2 2"
                    opacity="0.8"
                  />
                )}

                {/* Axis Labels */}
                <text x={pad} y={svgHeight - 12} fill="#64748b" fontSize="10" fontFamily="JetBrains Mono">
                  Epoch 1
                </text>
                <text x={svgWidth - pad} y={svgHeight - 12} fill="#64748b" fontSize="10" textAnchor="end" fontFamily="JetBrains Mono">
                  Epoch 50
                </text>
              </svg>
            </div>

            {/* Epoch scrubber */}
            <div className="mt-3 flex items-center gap-3">
              <span className="text-[11px] font-mono text-slate-400">Scrub Epoch:</span>
              <input
                type="range"
                min="0"
                max="49"
                value={activeEpochIndex}
                onChange={(e) => setActiveEpochIndex(parseInt(e.target.value, 10))}
                className="flex-1 accent-cyan-400 cursor-pointer"
              />
              <span className="text-xs font-mono font-bold text-cyan-400 w-16 text-right">
                Ep #{activeEpoch.epoch}
              </span>
            </div>
          </div>

          {/* Active Epoch Telemetry Readout */}
          <div className="grid grid-cols-4 gap-3 p-3 bg-slate-950 rounded-xl border border-slate-800 text-xs font-mono mt-3">
            <div>
              <span className="text-slate-400 text-[10px] uppercase block">Train Loss</span>
              <span className="text-cyan-400 font-bold tabular-nums">{activeEpoch.trainLoss}</span>
            </div>
            <div>
              <span className="text-slate-400 text-[10px] uppercase block">Val Loss</span>
              <span className="text-amber-400 font-bold tabular-nums">{activeEpoch.valLoss}</span>
            </div>
            <div>
              <span className="text-slate-400 text-[10px] uppercase block">Train AUROC</span>
              <span className="text-slate-200 tabular-nums">{activeEpoch.trainAuroc}</span>
            </div>
            <div>
              <span className="text-slate-400 text-[10px] uppercase block">Validation AUROC</span>
              <span className="text-emerald-400 font-bold tabular-nums">{activeEpoch.valAuroc}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
