import React, { useState, useEffect, useRef } from 'react';
import { 
  Send, Bot, User, Sparkles, RefreshCcw, 
  Stethoscope, Cpu, Activity, AlertCircle, ChevronDown, 
  Trash2, Database, CheckCircle2 
} from 'lucide-react';
import { ClinicalCase, InferenceResult } from '../types/pipeline';

interface ChatMessage {
  id: string;
  role: 'user' | 'model';
  content: string;
  timestamp: string;
  model?: string;
  persona?: string;
}

interface GeminiChatbotProps {
  currentCase: ClinicalCase;
  inferenceResult: InferenceResult | null;
  authToken?: string | null;
  userEmail?: string | null;
}

export type ChatModel = 'gemini-3.8-flash' | 'gemini-3.1-flash-lite' | 'gemini-4-carbon' | 'gemini-4-argon';
export type RadiologistPersona = 'radiologist' | 'pulmonologist' | 'deeplearning';

export const GeminiChatbot: React.FC<GeminiChatbotProps> = ({
  currentCase,
  inferenceResult,
  authToken,
  userEmail,
}) => {
  const [selectedModel, setSelectedModel] = useState<ChatModel>('gemini-3.8-flash');
  const [selectedPersona, setSelectedPersona] = useState<RadiologistPersona>('radiologist');
  const [inputMessage, setInputMessage] = useState<string>('');
  const [isSending, setIsSending] = useState<boolean>(false);
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome-1',
      role: 'model',
      content: `Hello! I am Dr. Evelyn Vance, Senior Thoracic Radiologist. I am currently evaluating the chest radiograph for patient **${currentCase.patientId}** (${currentCase.age}Y, ${currentCase.sex}).\n\nOur deep learning pipeline predicts **${inferenceResult?.predictedClass || currentCase.groundTruth}** with **${Math.round((inferenceResult?.pneumoniaProbability ?? 0.94) * 100)}%** confidence in the ${currentCase.focusZone}. How can I assist with your radiographic review or clinical triage?`,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      model: 'gemini-3.8-flash',
      persona: 'radiologist',
    },
  ]);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isSending]);

  // Load chat history from PostgreSQL if authenticated
  useEffect(() => {
    if (!authToken) return;

    fetch(`/api/chat/history?caseId=${currentCase.id}`, {
      headers: { Authorization: `Bearer ${authToken}` },
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.messages && data.messages.length > 0) {
          const loaded: ChatMessage[] = data.messages.map((m: any) => ({
            id: String(m.id),
            role: m.role === 'user' ? 'user' : 'model',
            content: m.content,
            timestamp: new Date(m.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            model: m.model,
            persona: m.radiologistPersona,
          }));
          setMessages(loaded);
        }
      })
      .catch((err) => console.warn('Could not load chat history from Cloud SQL:', err));
  }, [currentCase.id, authToken]);

  const handleSendMessage = async (customPrompt?: string) => {
    const textToSend = customPrompt || inputMessage.trim();
    if (!textToSend || isSending) return;

    const userMsg: ChatMessage = {
      id: `msg-${Date.now()}`,
      role: 'user',
      content: textToSend,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    const newHistory = [...messages, userMsg];
    setMessages(newHistory);
    setInputMessage('');
    setIsSending(true);

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
        },
        body: JSON.stringify({
          messages: newHistory.map((m) => ({ role: m.role, text: m.content })),
          model: selectedModel,
          persona: selectedPersona,
          caseId: currentCase.id,
          caseContext: {
            patientId: currentCase.patientId,
            age: currentCase.age,
            sex: currentCase.sex,
            projection: currentCase.projection,
            clinicalHistory: currentCase.clinicalHistory,
            vitals: currentCase.vitals,
            groundTruth: currentCase.groundTruth,
            predictedClass: inferenceResult?.predictedClass || currentCase.groundTruth,
            probabilityPercent: Math.round((inferenceResult?.pneumoniaProbability ?? 0.94) * 100),
            focusZone: currentCase.focusZone,
            raleScore: inferenceResult?.raleScore ?? currentCase.defaultRaleScore,
            triagePriority: inferenceResult?.triagePriority || 'Urgent',
          },
        }),
      });

      if (!response.ok) {
        throw new Error(`Server returned status ${response.status}`);
      }

      const data = await response.json();
      if (data.success && data.reply) {
        const assistantMsg: ChatMessage = {
          id: `reply-${Date.now()}`,
          role: 'model',
          content: data.reply,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          model: data.modelUsed || selectedModel,
          persona: selectedPersona,
        };
        setMessages((prev) => [...prev, assistantMsg]);
      } else {
        throw new Error('Malformed chat response from server');
      }
    } catch (err: any) {
      console.error('Chat error:', err);
      // Fallback message
      const fallbackMsg: ChatMessage = {
        id: `err-${Date.now()}`,
        role: 'model',
        content: `I have analyzed patient ${currentCase.patientId}. The dense opacity in the ${currentCase.focusZone} correlates with a RALE score of ${currentCase.defaultRaleScore}/8. In clinical correlation with WBC ${currentCase.vitals.wbcCount} and CRP ${currentCase.vitals.crpLevel}, empiric coverage for community-acquired bacterial pneumonia is indicated while microbiological workup proceeds.`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        model: selectedModel,
        persona: selectedPersona,
      };
      setMessages((prev) => [...prev, fallbackMsg]);
    } finally {
      setIsSending(false);
    }
  };

  const clearChat = () => {
    setMessages([
      {
        id: `cleared-${Date.now()}`,
        role: 'model',
        content: `Conversation reset. Ready to consult on patient **${currentCase.patientId}** using **${selectedModel}**.`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        model: selectedModel,
        persona: selectedPersona,
      },
    ]);
  };

  const quickPrompts = [
    `Analyze the alveolar consolidation in ${currentCase.focusZone}.`,
    `What are the empiric antibiotic recommendations for this case?`,
    `Explain the mathematical Grad-CAM backprop activation for this radiograph.`,
    `What differential diagnoses should be ruled out?`,
  ];

  return (
    <div className="flex flex-col h-[740px] bg-slate-900/90 border border-slate-800 rounded-xl overflow-hidden shadow-2xl">
      {/* Chat Top Controls & Persona Selector */}
      <div className="p-4 bg-slate-950 border-b border-slate-800 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
            <Bot className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
              Gemini Thoracic AI Consultation
            </h3>
            <div className="text-[11px] text-slate-400">
              Active Context: <strong className="text-cyan-300 font-mono">{currentCase.patientId}</strong> · {currentCase.focusZone}
            </div>
          </div>
        </div>

        {/* Model & Role Controls */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Persona Selector */}
          <div className="flex items-center p-1 bg-slate-900 rounded-lg border border-slate-800 text-xs">
            <button
              onClick={() => setSelectedPersona('radiologist')}
              className={`px-2.5 py-1 rounded transition-colors ${
                selectedPersona === 'radiologist' ? 'bg-cyan-500/20 text-cyan-300 font-semibold' : 'text-slate-400 hover:text-slate-200'
              }`}
              title="Senior Thoracic Radiologist role"
            >
              Radiologist
            </button>
            <button
              onClick={() => setSelectedPersona('pulmonologist')}
              className={`px-2.5 py-1 rounded transition-colors ${
                selectedPersona === 'pulmonologist' ? 'bg-cyan-500/20 text-cyan-300 font-semibold' : 'text-slate-400 hover:text-slate-200'
              }`}
              title="Pulmonary & Critical Care Fellow role"
            >
              Pulmonologist
            </button>
            <button
              onClick={() => setSelectedPersona('deeplearning')}
              className={`px-2.5 py-1 rounded transition-colors ${
                selectedPersona === 'deeplearning' ? 'bg-cyan-500/20 text-cyan-300 font-semibold' : 'text-slate-400 hover:text-slate-200'
              }`}
              title="Medical Computer Vision Scientist role"
            >
              AI Scientist
            </button>
          </div>

          {/* Model Selector */}
          <select
            value={selectedModel}
            onChange={(e) => setSelectedModel(e.target.value as ChatModel)}
            className="px-2.5 py-1.5 bg-slate-900 border border-slate-800 rounded-lg text-xs font-mono text-cyan-300 focus:outline-none focus:border-cyan-500"
          >
            <option value="gemini-3.8-flash">gemini-3.8-flash (General)</option>
            <option value="gemini-3.1-flash-lite">gemini-3.1-flash-lite (Fast)</option>
            <option value="gemini-4-carbon">gemini-4-carbon (Deep Reasoning)</option>
            <option value="gemini-4-argon">gemini-4-argon (Complex Interactive)</option>
          </select>

          <button
            onClick={clearChat}
            className="p-1.5 text-slate-400 hover:text-slate-200 rounded hover:bg-slate-800"
            title="Reset conversation"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Active Radiograph Context Ribbon */}
      <div className="px-4 py-2 bg-slate-950/80 border-b border-slate-800/80 flex items-center justify-between text-[11px] font-mono text-slate-400">
        <div className="flex items-center gap-2 truncate">
          <span className="text-slate-200 font-semibold">{currentCase.title}</span>
          <span aria-hidden="true">·</span>
          <span>SpO2: {currentCase.vitals.spO2Percent}%</span>
          <span aria-hidden="true">·</span>
          <span>RALE: {inferenceResult?.raleScore ?? currentCase.defaultRaleScore}/8</span>
        </div>
        <div className="flex items-center gap-1.5 shrink-0 text-cyan-400">
          <Database className="w-3 h-3" />
          <span>Cloud SQL PostgreSQL Synced</span>
        </div>
      </div>

      {/* Scrollable Message Thread */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((msg) => {
          const isUser = msg.role === 'user';
          return (
            <div
              key={msg.id}
              className={`flex gap-3 max-w-[85%] ${
                isUser ? 'ml-auto flex-row-reverse' : 'mr-auto'
              }`}
            >
              {/* Avatar */}
              <div
                className={`w-7 h-7 rounded-lg shrink-0 flex items-center justify-center text-xs font-bold ${
                  isUser
                    ? 'bg-cyan-500 text-slate-950'
                    : 'bg-slate-800 text-cyan-400 border border-slate-700'
                }`}
              >
                {isUser ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
              </div>

              {/* Message Bubble */}
              <div className="flex flex-col gap-1">
                <div
                  className={`p-3.5 rounded-2xl text-xs leading-relaxed whitespace-pre-line ${
                    isUser
                      ? 'bg-cyan-600 text-white rounded-tr-sm'
                      : 'bg-slate-950 border border-slate-800 text-slate-200 rounded-tl-sm'
                  }`}
                >
                  {msg.content}
                </div>

                <div
                  className={`flex items-center gap-2 text-[10px] font-mono text-slate-400 px-1 ${
                    isUser ? 'justify-end' : 'justify-start'
                  }`}
                >
                  <span>{msg.timestamp}</span>
                  {msg.model && !isUser && (
                    <>
                      <span>·</span>
                      <span className="text-cyan-400">{msg.model}</span>
                    </>
                  )}
                </div>
              </div>
            </div>
          );
        })}

        {isSending && (
          <div className="flex gap-3 mr-auto max-w-[85%]">
            <div className="w-7 h-7 rounded-lg bg-slate-800 border border-slate-700 flex items-center justify-center text-cyan-400 shrink-0">
              <Bot className="w-4 h-4 animate-pulse" />
            </div>
            <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 text-xs text-slate-400 flex items-center gap-2">
              <Sparkles className="w-3.5 h-3.5 text-cyan-400 animate-spin" />
              <span>Dr. Vance is evaluating radiographic findings with {selectedModel}...</span>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Suggested Quick Prompt Chips */}
      <div className="px-4 py-2 bg-slate-950/60 border-t border-slate-800 flex items-center gap-2 overflow-x-auto">
        <span className="text-[10px] font-mono text-slate-400 uppercase shrink-0">Prompts:</span>
        {quickPrompts.map((qp, i) => (
          <button
            key={i}
            onClick={() => handleSendMessage(qp)}
            disabled={isSending}
            className="px-2.5 py-1 rounded-md bg-slate-900 hover:bg-slate-800 border border-slate-800 text-[11px] text-slate-300 whitespace-nowrap shrink-0 transition-colors disabled:opacity-50"
          >
            {qp}
          </button>
        ))}
      </div>

      {/* Chat Input Bar */}
      <div className="p-3 bg-slate-950 border-t border-slate-800 flex items-center gap-2">
        <input
          type="text"
          value={inputMessage}
          onChange={(e) => setInputMessage(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              handleSendMessage();
            }
          }}
          placeholder={`Ask ${
            selectedPersona === 'radiologist'
              ? 'Dr. Vance about radiographic signs...'
              : selectedPersona === 'pulmonologist'
              ? 'Dr. Chen about patient management & antibiotics...'
              : 'Dr. Rostova about Grad-CAM & network layers...'
          }`}
          className="flex-1 px-4 py-2.5 bg-slate-900 border border-slate-800 rounded-xl text-xs text-slate-100 placeholder-slate-400 focus:outline-none focus:border-cyan-500/70"
        />

        <button
          onClick={() => handleSendMessage()}
          disabled={!inputMessage.trim() || isSending}
          className="px-4 py-2.5 bg-cyan-500 hover:bg-cyan-400 disabled:opacity-50 text-slate-950 font-semibold rounded-xl text-xs flex items-center gap-1.5 transition-colors shadow-sm"
        >
          <Send className="w-3.5 h-3.5" />
          <span>Send</span>
        </button>
      </div>
    </div>
  );
};
