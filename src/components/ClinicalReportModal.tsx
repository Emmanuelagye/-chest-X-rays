import React from 'react';
import { 
  X, FileText, Printer, Download, Check, AlertTriangle, 
  Stethoscope, Building, Calendar, User, ShieldAlert 
} from 'lucide-react';
import { AiRadiologistReport, ClinicalCase, InferenceResult } from '../types/pipeline';

interface ClinicalReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  report: AiRadiologistReport | null;
  currentCase: ClinicalCase;
  inferenceResult: InferenceResult | null;
}

export const ClinicalReportModal: React.FC<ClinicalReportModalProps> = ({
  isOpen,
  onClose,
  report,
  currentCase,
  inferenceResult,
}) => {
  const [copied, setCopied] = React.useState(false);

  if (!isOpen || !report) return null;

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadJson = () => {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(report, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `DICOM_SR_${currentCase.patientId}_report.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  const handleCopy = () => {
    const text = `
THORACIC RADIOLOGY & DEEP LEARNING CLINICAL REPORT
Patient ID: ${currentCase.patientId} | Age: ${currentCase.age} | Sex: ${currentCase.sex}
IMPRESSION: ${report.radiologistImpression}
PRIMARY DIAGNOSIS: ${report.primaryDiagnosis} (Confidence: ${(report.diagnosticConfidence * 100).toFixed(1)}%)
RALE SCORE: ${inferenceResult?.raleScore ?? currentCase.defaultRaleScore}/8 | TRIAGE: ${report.urgencyTriage}

FINDINGS:
- Lungs & Pleura: ${report.radiographicFindings.lungsAndPleura}
- Cardiomediastinum: ${report.radiographicFindings.cardiomediastinum}
- Bones & Soft Tissues: ${report.radiographicFindings.bonesAndSoftTissues}
- Technical Quality: ${report.radiographicFindings.qualityAssessment}

RECOMMENDATIONS:
${report.clinicalRecommendations.map((r, i) => `${i + 1}. ${r}`).join('\n')}
    `.trim();

    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-3xl w-full my-8 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Top Modal Action Bar */}
        <div className="flex items-center justify-between px-6 py-4 bg-slate-950 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-cyan-400" />
            <h3 className="text-sm font-bold text-slate-100">
              DICOM Structured Report (SR) · Thoracic AI Evaluation
            </h3>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleCopy}
              className="px-3 py-1.5 text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg flex items-center gap-1.5 transition-colors"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : null}
              {copied ? 'Copied' : 'Copy Text'}
            </button>
            <button
              onClick={handleDownloadJson}
              className="px-3 py-1.5 text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg flex items-center gap-1.5 transition-colors"
            >
              <Download className="w-3.5 h-3.5" />
              JSON
            </button>
            <button
              onClick={handlePrint}
              className="px-3 py-1.5 text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg flex items-center gap-1.5 transition-colors"
            >
              <Printer className="w-3.5 h-3.5" />
              Print
            </button>
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors ml-2"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Structured Clinical Report Body */}
        <div className="p-6 overflow-y-auto space-y-6 text-xs text-slate-300 leading-relaxed font-sans">
          {/* Hospital Header Banner */}
          <div className="flex flex-col md:flex-row md:items-center justify-between pb-4 border-b border-slate-800 gap-3">
            <div>
              <div className="flex items-center gap-2 text-slate-100 font-bold text-base">
                <Building className="w-4 h-4 text-cyan-400" />
                Department of Thoracic Radiology & Pulmonary Medicine
              </div>
              <div className="text-[11px] text-slate-400 mt-0.5">
                Computer-Assisted Detection & Quantitative Triage Subsystem
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span className={`px-2.5 py-1 rounded text-xs font-mono font-bold tracking-wider ${
                report.urgencyTriage === 'STAT' ? 'bg-rose-950 text-rose-300 border border-rose-800' :
                report.urgencyTriage === 'Urgent' ? 'bg-amber-950 text-amber-300 border border-amber-800' :
                'bg-emerald-950 text-emerald-300 border border-emerald-800'
              }`}>
                TRIAGE: {report.urgencyTriage}
              </span>
            </div>
          </div>

          {/* Patient Metadata Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-3.5 bg-slate-950 rounded-xl border border-slate-800 font-mono text-[11px]">
            <div>
              <span className="text-slate-400 block">PATIENT ID:</span>
              <span className="text-slate-100 font-semibold">{currentCase.patientId}</span>
            </div>
            <div>
              <span className="text-slate-400 block">AGE / SEX:</span>
              <span className="text-slate-100">{currentCase.age} Y / {currentCase.sex}</span>
            </div>
            <div>
              <span className="text-slate-400 block">PROJECTION:</span>
              <span className="text-slate-100">{currentCase.projection} ERECT</span>
            </div>
            <div>
              <span className="text-slate-400 block">STUDY DATE:</span>
              <span className="text-slate-100">{report.generatedAt.split('T')[0]}</span>
            </div>
          </div>

          {/* IMPRESSION (Clinical Diagnostic Core) */}
          <div className="p-4 bg-cyan-950/20 border border-cyan-800/40 rounded-xl">
            <div className="text-xs font-mono uppercase tracking-wider text-cyan-400 font-bold mb-1.5">
              Radiological Diagnostic Impression
            </div>
            <p className="text-sm font-semibold text-slate-100 leading-snug">
              {report.radiologistImpression}
            </p>
            <div className="mt-2.5 flex flex-wrap items-center gap-3 text-xs text-slate-300">
              <span>Primary: <strong className="text-cyan-300">{report.primaryDiagnosis}</strong></span>
              <span aria-hidden="true" className="text-slate-600">·</span>
              <span>Model Confidence: <strong className="text-emerald-400 font-mono tabular-nums">{(report.diagnosticConfidence * 100).toFixed(1)}%</strong></span>
              <span aria-hidden="true" className="text-slate-600">·</span>
              <span>RALE Score: <strong className="text-amber-400 font-mono">{inferenceResult?.raleScore ?? currentCase.defaultRaleScore} / 8</strong></span>
            </div>
          </div>

          {/* DETAILED FINDINGS */}
          <div>
            <div className="text-xs font-mono uppercase tracking-wider text-slate-400 font-bold mb-2 pb-1 border-b border-slate-800">
              Detailed Radiographic Findings
            </div>
            <div className="space-y-3">
              <div>
                <strong className="text-slate-200">Lungs & Pleural Spaces: </strong>
                <span className="text-slate-300">{report.radiographicFindings.lungsAndPleura}</span>
              </div>
              <div>
                <strong className="text-slate-200">Cardiomediastinal Silhouette: </strong>
                <span className="text-slate-300">{report.radiographicFindings.cardiomediastinum}</span>
              </div>
              <div>
                <strong className="text-slate-200">Osseous & Extrathoracic Tissues: </strong>
                <span className="text-slate-300">{report.radiographicFindings.bonesAndSoftTissues}</span>
              </div>
              <div>
                <strong className="text-slate-200">Examination Quality: </strong>
                <span className="text-slate-400">{report.radiographicFindings.qualityAssessment}</span>
              </div>
            </div>
          </div>

          {/* ANATOMICAL ZONE TABLE */}
          {report.anatomicalZones && report.anatomicalZones.length > 0 && (
            <div>
              <div className="text-xs font-mono uppercase tracking-wider text-slate-400 font-bold mb-2 pb-1 border-b border-slate-800">
                Anatomical Lung Zone Breakdown
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border border-slate-800 rounded-lg overflow-hidden">
                  <thead className="bg-slate-950 font-mono text-slate-400 uppercase text-[10px]">
                    <tr>
                      <th className="py-2 px-3">Lung Zone</th>
                      <th className="py-2 px-3">Pathology Status</th>
                      <th className="py-2 px-3">Severity</th>
                      <th className="py-2 px-3">Radiographic Description</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800 bg-slate-900/50">
                    {report.anatomicalZones.map((z) => (
                      <tr key={z.zone} className="hover:bg-slate-800/40">
                        <td className="py-2 px-3 font-medium text-slate-200">{z.zone}</td>
                        <td className="py-2 px-3">
                          <span className={z.status !== 'Clear' ? 'text-rose-400 font-semibold' : 'text-emerald-400'}>
                            {z.status}
                          </span>
                        </td>
                        <td className="py-2 px-3 font-mono text-[11px] text-slate-300">{z.severity}</td>
                        <td className="py-2 px-3 text-slate-400 text-[11px]">{z.description}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* DIFFERENTIAL DIAGNOSES */}
          {report.differentialDiagnoses && report.differentialDiagnoses.length > 0 && (
            <div>
              <div className="text-xs font-mono uppercase tracking-wider text-slate-400 font-bold mb-2 pb-1 border-b border-slate-800">
                Differential Diagnoses Ranking
              </div>
              <div className="space-y-2">
                {report.differentialDiagnoses.map((diff) => (
                  <div key={diff.condition} className="p-2.5 bg-slate-950 rounded-lg border border-slate-800 flex items-start justify-between gap-3">
                    <div>
                      <div className="font-semibold text-slate-200">{diff.condition}</div>
                      <div className="text-[11px] text-slate-400 mt-0.5">{diff.clinicalRationale}</div>
                    </div>
                    <span className="font-mono text-xs font-bold text-cyan-400 tabular-nums shrink-0">
                      {diff.likelihoodPercent}% Likelihood
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* CLINICAL MANAGEMENT RECOMMENDATIONS */}
          <div className="p-4 bg-slate-950 rounded-xl border border-slate-800">
            <div className="text-xs font-mono uppercase tracking-wider text-emerald-400 font-bold mb-2 flex items-center gap-1.5">
              <Stethoscope className="w-3.5 h-3.5" />
              Actionable Clinical Next Steps
            </div>
            <ul className="space-y-1.5 text-xs text-slate-300 list-disc list-inside">
              {report.clinicalRecommendations.map((rec, idx) => (
                <li key={idx} className="leading-relaxed">
                  {rec}
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3 bg-slate-950 border-t border-slate-800 flex items-center justify-between text-[11px] text-slate-400">
          <span>AI Assisted Clinical Decision Support System · For Medical Professional Verification</span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg transition-colors"
          >
            Close Report
          </button>
        </div>
      </div>
    </div>
  );
};
