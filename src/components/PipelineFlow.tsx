import React from 'react';
import { 
  Layers, Cpu, Eye, CheckCircle2, ArrowRight, ShieldCheck, 
  Binary, Compass, Database, Zap
} from 'lucide-react';
import { BackboneType, InferenceResult } from '../types/pipeline';

interface PipelineFlowProps {
  currentStage: number; // 1 to 5
  activeBackbone: BackboneType;
  setActiveBackbone: (backbone: BackboneType) => void;
  inferenceResult: InferenceResult | null;
  onRunStage: (stage: number) => void;
  isProcessing: boolean;
}

export const PipelineFlow: React.FC<PipelineFlowProps> = ({
  currentStage,
  activeBackbone,
  setActiveBackbone,
  inferenceResult,
  onRunStage,
  isProcessing,
}) => {
  const stages = [
    {
      num: 1,
      title: 'Preprocessing & Standardization',
      subtitle: 'CLAHE & Lung Segmentation',
      icon: Database,
      tensorIn: '1024 × 1024 (DICOM 16-bit)',
      tensorOut: '1 × 3 × 224 × 224 (Float32)',
      details: 'Histogram equalization (CLAHE clip 2.2), U-Net lung field segmentation mask, and Z-score standardization: (I - μ) / σ.',
    },
    {
      num: 2,
      title: 'Deep Feature Extraction',
      subtitle: activeBackbone,
      icon: Cpu,
      tensorIn: '1 × 3 × 224 × 224',
      tensorOut: '1 × 1024 × 7 × 7 (DenseBlock 4)',
      details: 'Dense feature reuse across 4 dense blocks with transition downsampling. Direct skip connections preserve fine alveolar boundaries.',
    },
    {
      num: 3,
      title: 'Grad-CAM Interpretability',
      subtitle: 'Gradient Backpropagation Saliency',
      icon: Eye,
      tensorIn: '1 × 1024 × 7 × 7 & Gradients',
      tensorOut: '224 × 224 Activation Map',
      details: 'Neuron importance weights α_k = (1/Z) Σ_ij (∂y^c / ∂A^k_ij). ReLU activation isolates positive evidence for consolidation.',
    },
    {
      num: 4,
      title: 'Multi-Task Classification',
      subtitle: 'GAP & Monte Carlo Triage',
      icon: Binary,
      tensorIn: '1024-dim Feature Vector',
      tensorOut: '5-Class Calibrated Probabilities',
      details: 'Softmax output with Monte Carlo dropout epistemic uncertainty estimation and Radiographic Assessment of Lung Edema (RALE) scoring.',
    },
    {
      num: 5,
      title: 'Radiological Structured Report',
      subtitle: 'Clinical Decision Support',
      icon: ShieldCheck,
      tensorIn: 'Predictions & DICOM Metadata',
      tensorOut: 'Structured Clinical Impression',
      details: 'Automated synthesis of anatomical zone findings, differential diagnoses ranking, and urgency triage (STAT / Urgent / Routine).',
    },
  ];

  return (
    <div className="flex flex-col gap-6">
      {/* Header and Backbone Switcher */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-5 bg-slate-900/90 border border-slate-800 rounded-xl">
        <div>
          <h2 className="text-lg font-bold text-slate-100 flex items-center gap-2">
            <Layers className="w-5 h-5 text-cyan-400" />
            End-to-End Deep Learning Pipeline Architecture
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Complete 5-stage automated clinical workflow from raw radiograph ingestion to explainable Grad-CAM saliency and structured reporting.
          </p>
        </div>

        {/* Backbone Selector */}
        <div className="flex items-center gap-2">
          <span className="text-xs font-mono text-slate-400 uppercase tracking-wider">Backbone:</span>
          <div className="flex items-center p-1 bg-slate-950 rounded-lg border border-slate-800">
            {(['DenseNet-121', 'ResNet-50-SE', 'Swin-ViT', 'EfficientNet-V2'] as BackboneType[]).map((bb) => (
              <button
                key={bb}
                onClick={() => setActiveBackbone(bb)}
                className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${
                  activeBackbone === bb
                    ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {bb}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Visual Pipeline Stage Stepper */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-3.5">
        {stages.map((st) => {
          const Icon = st.icon;
          const isDone = currentStage >= st.num;
          const isActive = currentStage === st.num;

          return (
            <div
              key={st.num}
              onClick={() => onRunStage(st.num)}
              className={`p-4 rounded-xl border flex flex-col justify-between cursor-pointer transition-all ${
                isActive
                  ? 'bg-cyan-950/40 border-cyan-500/60 shadow-lg shadow-cyan-950/50'
                  : isDone
                  ? 'bg-slate-900/90 border-slate-700/80 hover:border-slate-600'
                  : 'bg-slate-950/60 border-slate-800/60 opacity-60 hover:opacity-90'
              }`}
            >
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono font-bold text-cyan-400">0{st.num}</span>
                    <span className="text-[11px] font-mono text-slate-400 uppercase tracking-wider">Stage</span>
                  </div>
                  {isDone ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  ) : (
                    <div className="w-2 h-2 rounded-full bg-slate-700" />
                  )}
                </div>

                <div className="flex items-center gap-2 mb-1.5">
                  <Icon className={`w-4 h-4 ${isActive ? 'text-cyan-400' : 'text-slate-400'}`} />
                  <h3 className="text-xs font-semibold text-slate-200">{st.title}</h3>
                </div>
                <div className="text-[11px] text-cyan-400/90 font-mono mb-2">{st.subtitle}</div>

                <p className="text-[11px] text-slate-400 leading-relaxed mb-3">
                  {st.details}
                </p>
              </div>

              <div className="pt-2.5 border-t border-slate-800/80 text-[10px] font-mono text-slate-400 flex flex-col gap-0.5">
                <div className="truncate">In: <span className="text-slate-300">{st.tensorIn}</span></div>
                <div className="truncate">Out: <span className="text-cyan-400">{st.tensorOut}</span></div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Stage Deep Dive / Tensor Flow Diagram */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Tensor Dimensions & Mathematical Formulation */}
        <div className="p-5 bg-slate-900/90 border border-slate-800 rounded-xl flex flex-col justify-between">
          <div>
            <h3 className="text-sm font-semibold text-slate-200 mb-3 flex items-center gap-2">
              <Binary className="w-4 h-4 text-cyan-400" />
              Mathematical Operations
            </h3>
            
            <div className="space-y-3 text-xs text-slate-300">
              <div className="p-2.5 bg-slate-950 rounded-lg border border-slate-800">
                <div className="text-[11px] font-mono text-slate-400 uppercase tracking-wider mb-1">Dense Connectivity Rule:</div>
                <code className="text-cyan-300 font-mono text-xs">x_l = H_l([x_0, x_1, ..., x_l-1])</code>
                <div className="text-[11px] text-slate-400 mt-1">Growth rate k = 32 channels per composite convolution layer.</div>
              </div>

              <div className="p-2.5 bg-slate-950 rounded-lg border border-slate-800">
                <div className="text-[11px] font-mono text-slate-400 uppercase tracking-wider mb-1">Grad-CAM Importance Weights:</div>
                <code className="text-amber-300 font-mono text-xs">α_k^c = (1/Z) Σ_i Σ_j (∂y^c / ∂A_ij^k)</code>
                <div className="text-[11px] text-slate-400 mt-1">Gradients flowed back to 1024-channel feature map of denseblock4.</div>
              </div>

              <div className="p-2.5 bg-slate-950 rounded-lg border border-slate-800">
                <div className="text-[11px] font-mono text-slate-400 uppercase tracking-wider mb-1">Loss Function Formulation:</div>
                <code className="text-emerald-300 font-mono text-xs">FL(p_t) = -α_t (1 - p_t)^γ log(p_t)</code>
                <div className="text-[11px] text-slate-400 mt-1">Focal loss with γ = 2.0 to penalize easy negatives and handle disease imbalance.</div>
              </div>
            </div>
          </div>
        </div>

        {/* Live Tensor Execution Output */}
        <div className="p-5 bg-slate-900/90 border border-slate-800 rounded-xl lg:col-span-2">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-slate-200 flex items-center gap-2">
              <Zap className="w-4 h-4 text-cyan-400" />
              Inference Engine Execution State
            </h3>
            {inferenceResult && (
              <span className="text-xs font-mono text-emerald-400">
                Latency: {inferenceResult.latencyMs}ms · Uncertainty: ±{(inferenceResult.uncertaintyScore * 100).toFixed(1)}%
              </span>
            )}
          </div>

          {inferenceResult ? (
            <div className="space-y-4">
              {/* Primary Prediction Bar */}
              <div className="p-4 bg-slate-950 rounded-xl border border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <div className="text-xs font-mono text-slate-400 uppercase tracking-wider">Top Predicted Pathology</div>
                  <div className="text-lg font-bold text-slate-100 flex items-center gap-2 mt-0.5">
                    {inferenceResult.predictedClass}
                    <span className="text-xs font-mono px-2 py-0.5 rounded bg-cyan-950 text-cyan-300 border border-cyan-800">
                      {(inferenceResult.pneumoniaProbability * 100).toFixed(1)}% Prob
                    </span>
                  </div>
                  <div className="text-xs text-slate-400 mt-1">
                    Affected Region: <span className="text-slate-200">{inferenceResult.primaryZoneAffected}</span> · RALE Score: <span className="text-cyan-400 font-mono font-bold">{inferenceResult.raleScore}/8</span>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <div className="text-[11px] font-mono text-slate-400 uppercase tracking-wider">Triage Priority</div>
                    <div className={`text-sm font-bold font-mono ${
                      inferenceResult.triagePriority === 'STAT' ? 'text-rose-400' : inferenceResult.triagePriority === 'Urgent' ? 'text-amber-400' : 'text-emerald-400'
                    }`}>
                      {inferenceResult.triagePriority}
                    </div>
                  </div>
                </div>
              </div>

              {/* Multi-class probability distribution */}
              <div>
                <div className="text-xs font-mono text-slate-400 uppercase tracking-wider mb-2">Multi-Class Probability Distribution</div>
                <div className="space-y-2">
                  {[
                    { label: 'Bacterial Lobar Pneumonia', val: inferenceResult.classProbabilities.bacterial, color: 'bg-rose-500' },
                    { label: 'Viral Bronchopneumonia', val: inferenceResult.classProbabilities.viral, color: 'bg-amber-500' },
                    { label: 'COVID-19 Ground-Glass', val: inferenceResult.classProbabilities.covid19, color: 'bg-purple-500' },
                    { label: 'Normal Unremarkable CXR', val: inferenceResult.classProbabilities.normal, color: 'bg-emerald-500' },
                    { label: 'Parapneumonic Pleural Effusion', val: inferenceResult.classProbabilities.effusion, color: 'bg-blue-500' },
                  ].map((item) => (
                    <div key={item.label} className="flex items-center gap-3 text-xs">
                      <span className="w-52 text-slate-300 truncate">{item.label}</span>
                      <div className="flex-1 h-2 bg-slate-950 rounded-full overflow-hidden border border-slate-800">
                        <div 
                          className={`h-full ${item.color} transition-all duration-500`}
                          style={{ width: `${(item.val * 100).toFixed(1)}%` }}
                        />
                      </div>
                      <span className="w-14 text-right font-mono text-slate-400 tabular-nums">
                        {(item.val * 100).toFixed(1)}%
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="h-44 flex flex-col items-center justify-center text-slate-400 text-xs">
              <Compass className="w-8 h-8 text-slate-600 mb-2 animate-pulse" />
              <span>Pipeline waiting for execution. Click &quot;Run DL Inference&quot; to process the radiograph.</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
