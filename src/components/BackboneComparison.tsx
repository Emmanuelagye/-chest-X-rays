import React, { useState } from 'react';
import { Cpu, Layers, Zap, Shield, Check, Activity, BarChart2 } from 'lucide-react';
import { MODEL_BACKBONES } from '../data/clinicalCases';
import { BackboneType } from '../types/pipeline';

interface BackboneComparisonProps {
  activeBackbone: BackboneType;
  setActiveBackbone: (b: BackboneType) => void;
}

export const BackboneComparison: React.FC<BackboneComparisonProps> = ({
  activeBackbone,
  setActiveBackbone,
}) => {
  const [selectedLayerIndex, setSelectedLayerIndex] = useState<number>(3); // 0 to 3
  const currentModel = MODEL_BACKBONES.find((m) => m.id === activeBackbone) || MODEL_BACKBONES[0];

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="p-5 bg-slate-900/90 border border-slate-800 rounded-xl">
        <h2 className="text-lg font-bold text-slate-100 flex items-center gap-2">
          <Cpu className="w-5 h-5 text-cyan-400" />
          Deep Learning Backbone Architecture & Feature Activation Inspector
        </h2>
        <p className="text-xs text-slate-400 mt-1">
          Comparative empirical analysis between convolutional neural networks and vision transformers for thoracic disease classification.
        </p>
      </div>

      {/* Model Selection Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {MODEL_BACKBONES.map((model) => {
          const isSelected = activeBackbone === model.id;
          return (
            <div
              key={model.id}
              onClick={() => setActiveBackbone(model.id)}
              className={`p-4 rounded-xl border cursor-pointer transition-all flex flex-col justify-between ${
                isSelected
                  ? 'bg-cyan-950/40 border-cyan-500/60 shadow-lg shadow-cyan-950/40'
                  : 'bg-slate-900/80 border-slate-800 hover:border-slate-700'
              }`}
            >
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] font-mono text-cyan-400 uppercase tracking-wider">{model.architecture}</span>
                  {isSelected && <span className="text-[10px] font-mono text-cyan-300 px-1.5 py-0.5 rounded bg-cyan-900/50">ACTIVE</span>}
                </div>
                <h3 className="text-sm font-bold text-slate-100 mb-1">{model.name}</h3>
                
                <div className="grid grid-cols-2 gap-2 my-3 text-[11px] font-mono bg-slate-950 p-2.5 rounded-lg border border-slate-800/80">
                  <div>
                    <span className="text-slate-400 block text-[9px] uppercase">Params</span>
                    <span className="text-slate-200 font-semibold">{model.parameters}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[9px] uppercase">Latency</span>
                    <span className="text-cyan-400 font-semibold">{model.latencyMs} ms</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[9px] uppercase">GFLOPs</span>
                    <span className="text-slate-200">{model.gflops}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[9px] uppercase">AUROC</span>
                    <span className="text-emerald-400 font-bold">{model.aurocBenchmark}</span>
                  </div>
                </div>
              </div>

              <div className="text-[11px] text-slate-400 line-clamp-2">
                {model.highlights[0]}
              </div>
            </div>
          );
        })}
      </div>

      {/* Deep Feature Activation Layer Visualizer */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Layer Stage Selector */}
        <div className="p-5 bg-slate-900/90 border border-slate-800 rounded-xl">
          <h3 className="text-sm font-semibold text-slate-200 flex items-center gap-2 mb-3">
            <Layers className="w-4 h-4 text-cyan-400" />
            Layer Hierarchy & Receptive Field
          </h3>
          <p className="text-xs text-slate-400 mb-4">
            Select a network layer to inspect downsampling resolution and feature map channel activations.
          </p>

          <div className="space-y-2">
            {currentModel.denseFeatures.map((feat, idx) => (
              <button
                key={feat}
                onClick={() => setSelectedLayerIndex(idx)}
                className={`w-full text-left p-3 rounded-lg border transition-colors flex items-center justify-between text-xs font-mono ${
                  selectedLayerIndex === idx
                    ? 'bg-cyan-950/60 border-cyan-500/50 text-cyan-300'
                    : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
                }`}
              >
                <span>{feat}</span>
                <span className="text-[10px] text-slate-400">
                  {idx === 0 ? '56×56' : idx === 1 ? '28×28' : idx === 2 ? '14×14' : '7×7 (Latent)'}
                </span>
              </button>
            ))}
          </div>

          <div className="mt-4 p-3 bg-slate-950 rounded-lg border border-slate-800 text-[11px] text-slate-400 space-y-1">
            <div className="text-slate-300 font-medium">Receptive Field Dynamics:</div>
            <div>{currentModel.receptiveField}</div>
          </div>
        </div>

        {/* Feature Map Simulation Grid */}
        <div className="p-5 bg-slate-900/90 border border-slate-800 rounded-xl lg:col-span-2">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-slate-200 flex items-center gap-2">
              <Activity className="w-4 h-4 text-cyan-400" />
              Simulated Intermediate Activation Feature Channels
            </h3>
            <span className="text-xs font-mono text-cyan-400">
              {currentModel.denseFeatures[selectedLayerIndex]}
            </span>
          </div>

          <p className="text-xs text-slate-400 mb-4">
            Visualizing 8 representative latent convolutional filter outputs demonstrating low-level edge filters progressing to high-level consolidation detectors.
          </p>

          <div className="grid grid-cols-4 gap-3">
            {Array.from({ length: 8 }).map((_, i) => {
              // Synthetic stylized filter pattern
              const filterType = (i + selectedLayerIndex) % 4;
              return (
                <div key={i} className="flex flex-col gap-1">
                  <div className="aspect-square bg-slate-950 rounded-lg border border-slate-800 overflow-hidden relative flex items-center justify-center p-1">
                    {/* Simulated filter texture */}
                    <div 
                      className={`w-full h-full rounded transition-all duration-300 ${
                        filterType === 0
                          ? 'bg-gradient-to-tr from-cyan-950 via-cyan-800/60 to-slate-900'
                          : filterType === 1
                          ? 'bg-gradient-to-b from-slate-900 via-amber-950/60 to-slate-950'
                          : filterType === 2
                          ? 'bg-radial from-cyan-400/30 via-slate-900 to-black'
                          : 'bg-gradient-to-r from-slate-950 via-purple-950/50 to-slate-900'
                      }`}
                    />
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                      <span className="text-[10px] font-mono text-cyan-300/80 font-bold">
                        Ch #{i * 16 + 4}
                      </span>
                    </div>
                  </div>
                  <div className="text-[10px] font-mono text-slate-400 text-center">
                    {selectedLayerIndex === 3 ? 'Consolidation Focus' : selectedLayerIndex === 0 ? 'Rib/Edge Filter' : 'Vascular Marking'}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Model Architecture Highlights */}
      <div className="p-5 bg-slate-900/90 border border-slate-800 rounded-xl">
        <h3 className="text-sm font-semibold text-slate-200 mb-3 flex items-center gap-2">
          <Shield className="w-4 h-4 text-cyan-400" />
          Key Architectural Advantages of {currentModel.name}
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs text-slate-300">
          {currentModel.highlights.map((h, i) => (
            <div key={i} className="p-3 bg-slate-950 rounded-lg border border-slate-800 flex items-start gap-2.5">
              <Check className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
              <span>{h}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
