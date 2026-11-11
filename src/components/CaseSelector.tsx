import React from 'react';
import { ClinicalCase } from '../types/pipeline';
import { User, Activity, AlertCircle, CheckCircle2, ChevronRight } from 'lucide-react';

interface CaseSelectorProps {
  cases: ClinicalCase[];
  selectedCaseId: string;
  onSelectCase: (c: ClinicalCase) => void;
}

export const CaseSelector: React.FC<CaseSelectorProps> = ({
  cases,
  selectedCaseId,
  onSelectCase,
}) => {
  return (
    <div className="flex flex-col gap-2.5">
      <div className="flex items-center justify-between text-xs font-mono text-slate-400 uppercase tracking-wider px-1">
        <span>Clinical Patient Cohort ({cases.length} Cases)</span>
        <span>Select for Radiographic Analysis</span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {cases.map((c) => {
          const isSelected = selectedCaseId === c.id;
          const isNormal = c.groundTruth === 'Normal';

          return (
            <button
              key={c.id}
              onClick={() => onSelectCase(c)}
              className={`p-3.5 rounded-xl border text-left transition-all flex flex-col justify-between group ${
                isSelected
                  ? 'bg-cyan-950/40 border-cyan-500/60 shadow-lg shadow-cyan-950/40 ring-1 ring-cyan-500/30'
                  : 'bg-slate-900/80 border-slate-800 hover:border-slate-700 hover:bg-slate-900'
              }`}
            >
              <div>
                {/* Header Tag */}
                <div className="flex items-center justify-between text-[11px] mb-2">
                  <span className="font-mono text-slate-400">{c.patientId}</span>
                  <span
                    className={`font-semibold ${
                      isNormal ? 'text-emerald-400' : 'text-rose-400'
                    }`}
                  >
                    {c.groundTruth}
                  </span>
                </div>

                {/* Case Title */}
                <h4 className="text-xs font-bold text-slate-100 group-hover:text-cyan-300 transition-colors line-clamp-1 mb-1">
                  {c.title}
                </h4>

                {/* Patient demographics */}
                <div className="text-[11px] text-slate-400 mb-2">
                  {c.age} Y / {c.sex} · {c.projection} View
                </div>

                {/* Clinical summary snippet */}
                <p className="text-[11px] text-slate-400 line-clamp-2 leading-relaxed">
                  {c.clinicalHistory}
                </p>
              </div>

              {/* Vitals summary strip */}
              <div className="pt-2.5 mt-3 border-t border-slate-800/80 flex items-center justify-between text-[10px] font-mono text-slate-400">
                <span>SpO2: <strong className="text-slate-200">{c.vitals.spO2Percent}%</strong></span>
                <span>WBC: <strong className="text-slate-200">{c.vitals.wbcCount.split(' ')[0]}</strong></span>
                <span>RALE: <strong className="text-cyan-400">{c.defaultRaleScore}/8</strong></span>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};
