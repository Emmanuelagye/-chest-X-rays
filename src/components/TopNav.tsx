import React from 'react';
import { Activity, Sparkles, MessageSquare, LogIn, LogOut, User } from 'lucide-react';

interface TopNavProps {
  activeTab: 'console' | 'pipeline' | 'gradcam' | 'chat' | 'benchmark' | 'training';
  setActiveTab: (tab: 'console' | 'pipeline' | 'gradcam' | 'chat' | 'benchmark' | 'training') => void;
  onRunInference: () => void;
  isProcessing: boolean;
  currentUser: { email: string | null; displayName: string | null; photoURL: string | null } | null;
  onSignIn: () => void;
  onSignOut: () => void;
}

export const TopNav: React.FC<TopNavProps> = ({
  activeTab,
  setActiveTab,
  onRunInference,
  isProcessing,
  currentUser,
  onSignIn,
  onSignOut,
}) => {
  return (
    <header className="flex items-center justify-between gap-8 px-6 py-3.5 bg-slate-950/90 border-b border-slate-800/80 backdrop-blur-md sticky top-0 z-50">
      {/* Zone 1: Brand Wordmark (Single text element with clean styling) */}
      <div className="flex items-center gap-2.5 shrink-0">
        <div className="w-8 h-8 rounded-lg bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
          <Activity className="w-4 h-4" />
        </div>
        <span className="text-base font-bold tracking-tight text-slate-100 whitespace-nowrap">
          PneumoScan <span className="text-cyan-400 font-semibold text-xs tracking-normal ml-1 px-1.5 py-0.5 rounded bg-cyan-950/60 border border-cyan-800/50">DenseNet-121</span>
        </span>
      </div>

      {/* Zone 2: Concise Single-Line Navigation Links */}
      <nav className="hidden lg:flex items-center gap-7 text-xs font-medium text-slate-400">
        <button
          onClick={() => setActiveTab('console')}
          className={`hover:text-cyan-400 transition-colors whitespace-nowrap shrink-0 pb-1 border-b-2 ${
            activeTab === 'console'
              ? 'border-cyan-400 text-cyan-400 font-semibold'
              : 'border-transparent text-slate-300'
          }`}
        >
          Radiograph Diagnostic Console
        </button>
        <button
          onClick={() => setActiveTab('pipeline')}
          className={`hover:text-cyan-400 transition-colors whitespace-nowrap shrink-0 pb-1 border-b-2 ${
            activeTab === 'pipeline'
              ? 'border-cyan-400 text-cyan-400 font-semibold'
              : 'border-transparent text-slate-300'
          }`}
        >
          Pipeline Architecture
        </button>
        <button
          onClick={() => setActiveTab('gradcam')}
          className={`hover:text-cyan-400 transition-colors whitespace-nowrap shrink-0 pb-1 border-b-2 ${
            activeTab === 'gradcam'
              ? 'border-cyan-400 text-cyan-400 font-semibold'
              : 'border-transparent text-slate-300'
          }`}
        >
          Explainable AI (Grad-CAM)
        </button>
        <button
          onClick={() => setActiveTab('chat')}
          className={`hover:text-cyan-400 transition-colors whitespace-nowrap shrink-0 pb-1 border-b-2 flex items-center gap-1.5 ${
            activeTab === 'chat'
              ? 'border-cyan-400 text-cyan-400 font-semibold'
              : 'border-transparent text-slate-300'
          }`}
        >
          <MessageSquare className="w-3.5 h-3.5" />
          Gemini Chatbot
        </button>
        <button
          onClick={() => setActiveTab('benchmark')}
          className={`hover:text-cyan-400 transition-colors whitespace-nowrap shrink-0 pb-1 border-b-2 ${
            activeTab === 'benchmark'
              ? 'border-cyan-400 text-cyan-400 font-semibold'
              : 'border-transparent text-slate-300'
          }`}
        >
          Validation Benchmark & ROC
        </button>
      </nav>

      {/* Zone 3: Primary Action & Authentication */}
      <div className="flex items-center gap-3 shrink-0">
        {currentUser ? (
          <div className="flex items-center gap-2">
            <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 bg-slate-900 border border-slate-800 rounded-lg text-xs font-mono text-slate-300">
              <User className="w-3.5 h-3.5 text-cyan-400" />
              <span className="truncate max-w-[120px]">{currentUser.displayName || currentUser.email}</span>
            </div>
            <button
              onClick={onSignOut}
              className="p-1.5 text-slate-400 hover:text-slate-200 rounded-lg hover:bg-slate-800 transition-colors"
              title="Sign Out"
            >
              <LogOut className="w-3.5 h-3.5" />
            </button>
          </div>
        ) : (
          <button
            onClick={onSignIn}
            className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-300 bg-slate-900 border border-slate-800 rounded-lg hover:bg-slate-800 hover:text-white transition-colors whitespace-nowrap shrink-0"
          >
            <LogIn className="w-3.5 h-3.5 text-cyan-400" />
            Sign In with Google
          </button>
        )}

        <button
          onClick={onRunInference}
          disabled={isProcessing}
          className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-slate-950 bg-cyan-400 rounded-lg hover:bg-cyan-300 disabled:opacity-60 disabled:cursor-not-allowed transition-colors whitespace-nowrap shrink-0 shadow-sm shadow-cyan-900/30"
        >
          <Sparkles className="w-3.5 h-3.5 text-slate-950" />
          {isProcessing ? 'Executing Pipeline...' : 'Run DL Inference'}
        </button>
      </div>
    </header>
  );
};
