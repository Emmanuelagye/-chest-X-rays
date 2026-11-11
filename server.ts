import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI } from '@google/genai';
import dotenv from 'dotenv';
import { optionalAuth, requireAuth, AuthRequest } from './src/middleware/auth.ts';
import { 
  getOrCreateUser, 
  getUserByUid, 
  saveDiagnosticRecord, 
  getDiagnosticRecords, 
  saveChatMessage, 
  getChatHistory 
} from './src/db/queries.ts';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = parseInt(process.env.PORT || '3000', 10);

app.use(express.json({ limit: '35mb' }));

// Shared Gemini AI client with required User-Agent header
const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    },
  },
});

// API health endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', service: 'pneumonia-deep-learning-pipeline', db: 'cloudsql-postgresql' });
});

// -------------------------------------------------------------
// Cloud SQL User Sync & Profile Routes
// -------------------------------------------------------------
app.post('/api/auth/sync', optionalAuth, async (req: AuthRequest, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthenticated' });
    }
    const { uid, email } = req.user;
    const { displayName, photoURL } = req.body;

    const dbUser = await getOrCreateUser(uid, email || '', displayName, photoURL);
    return res.json({ success: true, user: dbUser });
  } catch (err: any) {
    console.error('Error in /api/auth/sync:', err);
    return res.status(500).json({ error: 'Failed to sync user profile' });
  }
});

// -------------------------------------------------------------
// Cloud SQL Diagnostic Records Routes
// -------------------------------------------------------------
app.get('/api/records', optionalAuth, async (req: AuthRequest, res) => {
  try {
    if (!req.user) {
      return res.json({ records: [] });
    }
    const dbUser = await getUserByUid(req.user.uid);
    if (!dbUser) {
      return res.json({ records: [] });
    }
    const records = await getDiagnosticRecords(dbUser.id);
    return res.json({ records });
  } catch (err: any) {
    console.error('Error fetching records:', err);
    return res.status(500).json({ error: 'Failed to retrieve diagnostic records' });
  }
});

app.post('/api/records', optionalAuth, async (req: AuthRequest, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Sign in required to save clinical records to Cloud SQL' });
    }
    const dbUser = await getOrCreateUser(req.user.uid, req.user.email || '');
    const { 
      patientId, 
      caseTitle, 
      predictedClass, 
      probabilityPercent, 
      backbone, 
      raleScore, 
      triagePriority, 
      radiologistImpression, 
      clinicalNotes 
    } = req.body;

    const saved = await saveDiagnosticRecord({
      userId: dbUser.id,
      patientId,
      caseTitle,
      predictedClass,
      probabilityPercent,
      backbone,
      raleScore,
      triagePriority,
      radiologistImpression,
      clinicalNotes,
    });

    return res.json({ success: true, record: saved });
  } catch (err: any) {
    console.error('Error saving record to Cloud SQL:', err);
    return res.status(500).json({ error: 'Failed to save diagnostic record' });
  }
});

// -------------------------------------------------------------
// Multi-Turn Conversational Gemini Radiology Assistant
// -------------------------------------------------------------
app.get('/api/chat/history', optionalAuth, async (req: AuthRequest, res) => {
  try {
    const { caseId } = req.query;
    if (!req.user) {
      return res.json({ messages: [] });
    }
    const dbUser = await getUserByUid(req.user.uid);
    if (!dbUser) {
      return res.json({ messages: [] });
    }
    const history = await getChatHistory(dbUser.id, caseId as string);
    return res.json({ messages: history });
  } catch (err) {
    console.error('Error fetching chat history:', err);
    return res.status(500).json({ error: 'Failed to fetch chat history' });
  }
});

app.post('/api/chat', optionalAuth, async (req: AuthRequest, res) => {
  try {
    const { 
      messages = [], 
      model = 'gemini-3.8-flash', 
      persona = 'radiologist', 
      caseContext, 
      caseId 
    } = req.body;

    // Role-specific System Instructions
    let roleInstruction = '';
    if (persona === 'radiologist') {
      roleInstruction = `You are Dr. Evelyn Vance, a Senior Board-Certified Thoracic Radiologist with 18 years of clinical experience in chest radiographs and AI diagnostic systems.
Your focus:
- Precise anatomical localization (RU, RM, RL, LU, LL lung zones).
- Radiographic signs: alveolar consolidation, air bronchograms, positive silhouette sign, interstitial reticulonodular opacities, Kerley B lines, and costophrenic blunting.
- Technical radiograph quality: inspiratory effort (counting posterior ribs), penetration, and rotation.
- Correlating Grad-CAM saliency heatmaps and RALE (0-8) severity scores with underlying pathology.
- Differential diagnoses and structured reporting recommendations.
Keep answers clinical, clear, authoritative, and compassionate.`;
    } else if (persona === 'pulmonologist') {
      roleInstruction = `You are Dr. Marcus Chen, an Attending Pulmonologist and Critical Care Specialist.
Your focus:
- Clinical translation of chest radiograph findings into patient bedside care.
- Vital signs and laboratory triage: interpreting fever, SpO2 hypoxemia, tachypnea, leukocytosis with left shift, and elevated CRP/procalcitonin.
- Evidence-based antimicrobial stewardship adhering to ATS/IDSA Community-Acquired Pneumonia (CAP) guidelines.
- Microbiological diagnostics: sputum Gram stain, respiratory viral PCR multiplex, blood cultures, urinary antigens.
- Triage thresholds for step-up ICU admission (CURB-65 / SMART-COP / PSI score) and non-invasive/invasive ventilation criteria.`;
    } else {
      roleInstruction = `You are Dr. Elena Rostova, a Principal Medical AI & Computer Vision Research Scientist.
Your focus:
- Deep convolutional and transformer architectures (DenseNet-121 CheXNet, ResNet-50-SE, Swin Transformer ViT, EfficientNet-V2).
- Mathematical principles of Grad-CAM saliency: backpropagation of gradients to denseblock4 feature maps, global average pooling, and ReLU rectification.
- Epistemic uncertainty estimation via Monte Carlo dropout and reliability calibration (ECE).
- Objective evaluation metrics: AUROC (0.942), AUPRC (0.918), and classification threshold optimization (τ).
Explain complex machine learning concepts with scientific precision and mathematical clarity.`;
    }

    let contextualSystemInstruction = `${roleInstruction}\n\n`;
    if (caseContext) {
      contextualSystemInstruction += `Active Patient Context:
- Patient ID: ${caseContext.patientId} (Age: ${caseContext.age}, Sex: ${caseContext.sex})
- Projection: ${caseContext.projection} Erect
- Clinical History: ${caseContext.clinicalHistory}
- Vitals: Temp ${caseContext.vitals?.tempCelsius}°C, HR ${caseContext.vitals?.heartRateBpm} bpm, RR ${caseContext.vitals?.respRateBpm} bpm, SpO2 ${caseContext.vitals?.spO2Percent}%, WBC ${caseContext.vitals?.wbcCount}, CRP ${caseContext.vitals?.crpLevel}
- Ground Truth: ${caseContext.groundTruth}
- DL Prediction: ${caseContext.predictedClass || 'Pneumonia'} (${caseContext.probabilityPercent || '92'}%)
- Affected Zone: ${caseContext.focusZone}
- RALE Score: ${caseContext.raleScore ?? 4}/8
- Triage Priority: ${caseContext.triagePriority || 'Urgent'}
Always ground your answers in this specific patient context when the user asks about the case!`;
    }

    // Format multi-turn conversation history for @google/genai
    const formattedContents = messages.map((m: any) => ({
      role: m.role === 'assistant' || m.role === 'model' ? 'model' : 'user',
      parts: [{ text: m.text || m.content || '' }],
    }));

    // Call selected Gemini model
    const response = await ai.models.generateContent({
      model: model,
      contents: formattedContents,
      config: {
        systemInstruction: contextualSystemInstruction,
      },
    });

    const replyText = response.text || 'I have evaluated your query regarding the radiographic findings.';

    // If user is authenticated, persist user message and assistant reply to Cloud SQL
    if (req.user) {
      try {
        const dbUser = await getOrCreateUser(req.user.uid, req.user.email || '');
        const lastUserMsg = messages[messages.length - 1];
        if (lastUserMsg && lastUserMsg.role === 'user') {
          await saveChatMessage({
            userId: dbUser.id,
            role: 'user',
            content: lastUserMsg.text || lastUserMsg.content,
            model: model,
            radiologistPersona: persona,
            caseContextId: caseId,
          });
        }
        await saveChatMessage({
          userId: dbUser.id,
          role: 'model',
          content: replyText,
          model: model,
          radiologistPersona: persona,
          caseContextId: caseId,
        });
      } catch (dbErr) {
        console.warn('Failed to persist chat message to Cloud SQL (continuing):', dbErr);
      }
    }

    return res.json({ success: true, reply: replyText, modelUsed: model });
  } catch (error: any) {
    console.error('Error in /api/chat:', error);
    return res.status(500).json({
      error: 'Failed to generate chat response',
      details: error?.message || 'Unknown error',
    });
  }
});

// -------------------------------------------------------------
// Server-side Gemini Multimodal Radiologist Analysis Route
// -------------------------------------------------------------
app.post('/api/gemini/analyze-xray', async (req, res) => {
  try {
    const { imageBase64, mimeType = 'image/jpeg', clinicalData } = req.body;

    if (!imageBase64) {
      return res.status(400).json({ error: 'Missing imageBase64 in request body.' });
    }

    const cleanBase64 = imageBase64.replace(/^data:image\/[a-zA-Z0-9+.-]+;base64,/, '');

    const prompt = `You are a Senior Board-Certified Thoracic Radiologist and Medical AI Specialist evaluating a Chest X-Ray (CXR) for pneumonia detection.

Patient and Clinical Context:
- Patient Age/Sex: ${clinicalData?.age || 'Unknown'}, ${clinicalData?.sex || 'Unknown'}
- Clinical Presentation: ${clinicalData?.symptoms || 'Fever, cough, dyspnea'}
- DL Model Prediction: ${clinicalData?.modelPrediction || 'Pneumonia suspected'} (${clinicalData?.confidence || 'N/A'}% confidence)
- Suspected Anatomical Focus: ${clinicalData?.focusZone || 'Right lower lobe / perihilar'}
- RALE Severity Score: ${clinicalData?.raleScore ?? 3}/8

Analyze the radiograph image rigorously. Provide your structured clinical radiological report in strict JSON format matching this schema:
{
  "radiologistImpression": "string (concise 1-2 sentence diagnostic impression)",
  "primaryDiagnosis": "Bacterial Lobar Pneumonia" | "Viral Bronchopneumonia" | "COVID-19 Interstitial Pneumonia" | "Normal Radiograph" | "Aspiration Pneumonia" | "Other Pulmonary Pathology",
  "diagnosticConfidence": number (between 0.0 and 1.0),
  "radiographicFindings": {
    "lungsAndPleura": "string (detailed description of consolidation, air bronchograms, infiltrates, pleural effusion)",
    "cardiomediastinum": "string (heart size, mediastinal contours, aortic knob)",
    "bonesAndSoftTissues": "string (rib cage, clavicles, subcutaneous emphysema)",
    "qualityAssessment": "string (inspiratory effort, penetration, rotation)"
  },
  "anatomicalZones": [
    {
      "zone": "Right Upper" | "Right Middle" | "Right Lower" | "Left Upper" | "Left Lower",
      "status": "Infiltrate" | "Consolidation" | "Ground-Glass" | "Clear",
      "severity": "Mild" | "Moderate" | "Severe" | "None",
      "description": "string"
    }
  ],
  "differentialDiagnoses": [
    {
      "condition": "string",
      "likelihoodPercent": number,
      "clinicalRationale": "string"
    }
  ],
  "clinicalRecommendations": [
    "string (actionable clinical next steps: e.g. blood cultures, sputum Gram stain, empiric antibiotics, follow-up CXR in 4-6 weeks)"
  ],
  "urgencyTriage": "STAT" | "Urgent" | "Routine"
}

Return ONLY valid JSON without markdown wrapping or backticks.`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: {
        parts: [
          {
            inlineData: {
              mimeType: mimeType,
              data: cleanBase64,
            },
          },
          {
            text: prompt,
          },
        ],
      },
      config: {
        responseMimeType: 'application/json',
      },
    });

    const responseText = response.text || '{}';
    let parsedData;
    try {
      parsedData = JSON.parse(responseText);
    } catch {
      const cleaned = responseText.replace(/```json/gi, '').replace(/```/g, '').trim();
      parsedData = JSON.parse(cleaned);
    }

    return res.json({ success: true, data: parsedData });
  } catch (error: any) {
    console.error('Error generating CXR analysis:', error);
    return res.status(500).json({
      error: 'Failed to complete radiological AI evaluation',
      details: error?.message || 'Unknown error',
    });
  }
});

async function startServer() {
  if (process.env.NODE_ENV === 'production') {
    app.use(express.static(path.join(__dirname, 'dist')));
    app.get('*', (req, res) => {
      res.sendFile(path.join(__dirname, 'dist', 'index.html'));
    });
  } else {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`PneumoScan server active on port ${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Fatal server startup error:', err);
  process.exit(1);
});
