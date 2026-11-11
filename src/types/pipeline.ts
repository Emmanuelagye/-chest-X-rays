export type DiagnosisCategory = 
  | 'Bacterial Pneumonia' 
  | 'Viral Pneumonia' 
  | 'COVID-19' 
  | 'Normal' 
  | 'Pleural Effusion';

export interface PatientVitals {
  tempCelsius: number;
  heartRateBpm: number;
  respRateBpm: number;
  spO2Percent: number;
  wbcCount: string;
  crpLevel: string;
}

export interface ClinicalCase {
  id: string;
  title: string;
  patientId: string;
  age: number;
  sex: 'Male' | 'Female';
  projection: 'PA' | 'AP';
  clinicalHistory: string;
  vitals: PatientVitals;
  groundTruth: DiagnosisCategory;
  groundTruthDetails: string;
  imageUrl: string;
  focusZone: string;
  defaultRaleScore: number;
  gradCamCoordinates: {
    cx: number;
    cy: number;
    radiusX: number;
    radiusY: number;
    intensity: number;
    secondaryZone?: {
      cx: number;
      cy: number;
      radiusX: number;
      radiusY: number;
      intensity: number;
    };
  };
}

export type BackboneType = 'DenseNet-121' | 'ResNet-50-SE' | 'Swin-ViT' | 'EfficientNet-V2';

export interface ModelBackboneInfo {
  id: BackboneType;
  name: string;
  architecture: string;
  parameters: string;
  gflops: number;
  latencyMs: number;
  aurocBenchmark: number;
  receptiveField: string;
  highlights: string[];
  denseFeatures: string[];
}

export interface PreprocessingConfig {
  targetResolution: 224 | 512;
  claheEnabled: boolean;
  claheClipLimit: number;
  claheGridSize: number;
  lungSegMaskEnabled: boolean;
  intensityNorm: 'z-score' | 'min-max' | 'histogram';
  windowWidth: number;
  windowLevel: number;
  invertFilm: boolean;
}

export type ColormapType = 'jet' | 'turbo' | 'viridis' | 'inferno';

export interface GradCamConfig {
  targetLayer: string;
  colormap: ColormapType;
  opacity: number;
  threshold: number;
  showAnatomicalZones: boolean;
}

export interface InferenceResult {
  pneumoniaProbability: number;
  predictedClass: DiagnosisCategory;
  confidenceInterval: [number, number];
  classProbabilities: {
    bacterial: number;
    viral: number;
    covid19: number;
    normal: number;
    effusion: number;
  };
  uncertaintyScore: number; // Epistemic uncertainty
  raleScore: number; // 0-8
  triagePriority: 'STAT' | 'Urgent' | 'Routine';
  latencyMs: number;
  backboneUsed: BackboneType;
  primaryZoneAffected: string;
}

export interface AnatomicalZoneFinding {
  zone: 'Right Upper' | 'Right Middle' | 'Right Lower' | 'Left Upper' | 'Left Lower';
  status: 'Consolidation' | 'Infiltrate' | 'Ground-Glass' | 'Clear';
  severity: 'Mild' | 'Moderate' | 'Severe' | 'None';
  description: string;
}

export interface DifferentialDiagnosisItem {
  condition: string;
  likelihoodPercent: number;
  clinicalRationale: string;
}

export interface AiRadiologistReport {
  radiologistImpression: string;
  primaryDiagnosis: string;
  diagnosticConfidence: number;
  radiographicFindings: {
    lungsAndPleura: string;
    cardiomediastinum: string;
    bonesAndSoftTissues: string;
    qualityAssessment: string;
  };
  anatomicalZones: AnatomicalZoneFinding[];
  differentialDiagnoses: DifferentialDiagnosisItem[];
  clinicalRecommendations: string[];
  urgencyTriage: 'STAT' | 'Urgent' | 'Routine';
  generatedAt: string;
}

export interface RocPoint {
  fpr: number;
  tpr: number;
  threshold: number;
}

export interface PrPoint {
  recall: number;
  precision: number;
  threshold: number;
}
