import React, { useRef, useEffect, useState, useCallback } from 'react';
import { 
  ZoomIn, ZoomOut, RotateCcw, Eye, Sliders, Maximize2, 
  Ruler, Grid, Contrast, Flame, RefreshCw
} from 'lucide-react';
import { ClinicalCase, ColormapType } from '../types/pipeline';
import { applyWindowLevelToImageData, applyClaheToCanvas, drawGradCamOnCanvas } from '../utils/imageProcessing';

interface CxrViewerProps {
  currentCase: ClinicalCase;
  colormap: ColormapType;
  setColormap: (map: ColormapType) => void;
  gradCamOpacity: number;
  setGradCamOpacity: (val: number) => void;
  gradCamThreshold: number;
  setGradCamThreshold: (val: number) => void;
  claheEnabled: boolean;
  setClaheEnabled: (val: boolean) => void;
  windowLevel: number;
  setWindowLevel: (val: number) => void;
  windowWidth: number;
  setWindowWidth: (val: number) => void;
  invertFilm: boolean;
  setInvertFilm: (val: boolean) => void;
}

export const CxrViewer: React.FC<CxrViewerProps> = ({
  currentCase,
  colormap,
  setColormap,
  gradCamOpacity,
  setGradCamOpacity,
  gradCamThreshold,
  setGradCamThreshold,
  claheEnabled,
  setClaheEnabled,
  windowLevel,
  setWindowLevel,
  windowWidth,
  setWindowWidth,
  invertFilm,
  setInvertFilm,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const baseCanvasRef = useRef<HTMLCanvasElement>(null);
  const heatCanvasRef = useRef<HTMLCanvasElement>(null);

  // Zoom and Pan state
  const [zoom, setZoom] = useState<number>(1);
  const [pan, setPan] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [dragStart, setDragStart] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  // Interactive Tools
  const [activeTool, setActiveTool] = useState<'pan' | 'split' | 'ruler'>('split');
  const [splitPos, setSplitPos] = useState<number>(50); // percentage 0-100
  const [showZones, setShowZones] = useState<boolean>(true);

  // Calibrated Ruler Measurement
  const [rulerPoints, setRulerPoints] = useState<{ x1: number; y1: number; x2: number; y2: number } | null>(null);
  const [isDrawingRuler, setIsDrawingRuler] = useState<boolean>(false);

  // Image source loaded
  const imageElementRef = useRef<HTMLImageElement | null>(null);

  // Load and cache image
  useEffect(() => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.src = currentCase.imageUrl;
    img.onload = () => {
      imageElementRef.current = img;
      renderViewer();
    };
  }, [currentCase.imageUrl]);

  // Main canvas render pipeline
  const renderViewer = useCallback(() => {
    const img = imageElementRef.current;
    if (!img) return;

    const baseCanvas = baseCanvasRef.current;
    const heatCanvas = heatCanvasRef.current;
    if (!baseCanvas || !heatCanvas) return;

    const width = 800;
    const height = 800;
    baseCanvas.width = width;
    baseCanvas.height = height;
    heatCanvas.width = width;
    heatCanvas.height = height;

    const baseCtx = baseCanvas.getContext('2d', { willReadFrequently: true });
    const heatCtx = heatCanvas.getContext('2d', { willReadFrequently: true });
    if (!baseCtx || !heatCtx) return;

    // 1. Draw base radiograph
    baseCtx.drawImage(img, 0, 0, width, height);

    // 2. Apply Window/Level and Inversion
    const imgData = baseCtx.getImageData(0, 0, width, height);
    applyWindowLevelToImageData(imgData.data, windowLevel, windowWidth, invertFilm);
    baseCtx.putImageData(imgData, 0, 0);

    // 3. Apply CLAHE if enabled
    if (claheEnabled) {
      applyClaheToCanvas(baseCtx, width, height, 2.2, 8);
    }

    // 4. Render Grad-CAM Heatmap
    heatCtx.clearRect(0, 0, width, height);
    drawGradCamOnCanvas(
      heatCtx,
      width,
      height,
      currentCase.gradCamCoordinates,
      colormap,
      gradCamThreshold,
      gradCamOpacity
    );
  }, [currentCase, windowLevel, windowWidth, invertFilm, claheEnabled, colormap, gradCamThreshold, gradCamOpacity]);

  useEffect(() => {
    renderViewer();
  }, [renderViewer]);

  // Reset view
  const handleReset = () => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
    setWindowLevel(128);
    setWindowWidth(255);
    setInvertFilm(false);
    setClaheEnabled(false);
    setSplitPos(50);
    setRulerPoints(null);
  };

  // Preset Window/Level
  const setPreset = (wl: number, ww: number) => {
    setWindowLevel(wl);
    setWindowWidth(ww);
  };

  // Mouse wheel zoom
  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? -0.15 : 0.15;
    setZoom((prev) => Math.min(3.5, Math.max(0.8, prev + delta)));
  };

  // Mouse drag handlers
  const handleMouseDown = (e: React.MouseEvent) => {
    if (activeTool === 'pan') {
      setIsDragging(true);
      setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
    } else if (activeTool === 'ruler') {
      const rect = containerRef.current?.getBoundingClientRect();
      if (!rect) return;
      const x = (e.clientX - rect.left) / zoom;
      const y = (e.clientY - rect.top) / zoom;
      setRulerPoints({ x1: x, y1: y, x2: x, y2: y });
      setIsDrawingRuler(true);
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isDragging && activeTool === 'pan') {
      setPan({ x: e.clientX - dragStart.x, y: e.clientY - dragStart.y });
    } else if (isDrawingRuler && activeTool === 'ruler' && rulerPoints) {
      const rect = containerRef.current?.getBoundingClientRect();
      if (!rect) return;
      const x = (e.clientX - rect.left) / zoom;
      const y = (e.clientY - rect.top) / zoom;
      setRulerPoints((prev) => (prev ? { ...prev, x2: x, y2: y } : null));
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
    setIsDrawingRuler(false);
  };

  // Ruler length in mm (assuming 0.143 mm/px at 800x800)
  const getRulerLengthMm = () => {
    if (!rulerPoints) return 0;
    const dx = rulerPoints.x2 - rulerPoints.x1;
    const dy = rulerPoints.y2 - rulerPoints.y1;
    const px = Math.sqrt(dx * dx + dy * dy);
    return (px * 0.42).toFixed(1); // Scaled mm estimate
  };

  return (
    <div className="flex flex-col h-full bg-slate-950 border border-slate-800 rounded-xl overflow-hidden shadow-2xl">
      {/* Top Console Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-2.5 bg-slate-900/90 border-b border-slate-800 text-xs">
        {/* Left: Interactive View Tools */}
        <div className="flex items-center gap-1.5 p-1 bg-slate-950 rounded-lg border border-slate-800">
          <button
            onClick={() => setActiveTool('split')}
            className={`px-2.5 py-1 rounded font-medium transition-colors ${
              activeTool === 'split' ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30' : 'text-slate-400 hover:text-slate-200'
            }`}
            title="Split comparison slider"
          >
            Split Wipe
          </button>
          <button
            onClick={() => setActiveTool('pan')}
            className={`px-2.5 py-1 rounded font-medium transition-colors ${
              activeTool === 'pan' ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30' : 'text-slate-400 hover:text-slate-200'
            }`}
            title="Pan & drag radiograph"
          >
            Pan View
          </button>
          <button
            onClick={() => setActiveTool('ruler')}
            className={`px-2.5 py-1 rounded font-medium flex items-center gap-1 transition-colors ${
              activeTool === 'ruler' ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30' : 'text-slate-400 hover:text-slate-200'
            }`}
            title="Calibrated caliper measurement"
          >
            <Ruler className="w-3 h-3" />
            Caliper Ruler
          </button>
        </div>

        {/* Center: Window/Level Presets */}
        <div className="flex items-center gap-1.5 text-slate-400">
          <span className="text-[11px] font-mono text-slate-400 uppercase tracking-wider mr-1">Preset:</span>
          <button
            onClick={() => setPreset(128, 255)}
            className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 text-[11px] transition-colors"
          >
            Default CXR
          </button>
          <button
            onClick={() => setPreset(105, 150)}
            className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 text-[11px] transition-colors"
          >
            Lung Field
          </button>
          <button
            onClick={() => setPreset(165, 210)}
            className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 text-[11px] transition-colors"
          >
            Bone / Ribs
          </button>
        </div>

        {/* Right: Quick Action Toggles */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setClaheEnabled(!claheEnabled)}
            className={`px-2.5 py-1 rounded font-mono text-[11px] flex items-center gap-1 transition-colors ${
              claheEnabled ? 'bg-emerald-950/80 text-emerald-400 border border-emerald-700/50' : 'bg-slate-800 text-slate-400 hover:text-slate-200'
            }`}
            title="Contrast-Limited Adaptive Histogram Equalization"
          >
            <Contrast className="w-3 h-3" />
            CLAHE: {claheEnabled ? 'ON' : 'OFF'}
          </button>

          <button
            onClick={() => setInvertFilm(!invertFilm)}
            className={`px-2 py-1 rounded text-[11px] transition-colors ${
              invertFilm ? 'bg-amber-950/80 text-amber-300 border border-amber-700/50' : 'bg-slate-800 text-slate-400 hover:text-slate-200'
            }`}
            title="Invert film negative/positive"
          >
            Invert Film
          </button>

          <button
            onClick={() => setShowZones(!showZones)}
            className={`px-2 py-1 rounded text-[11px] flex items-center gap-1 transition-colors ${
              showZones ? 'bg-cyan-950/80 text-cyan-300 border border-cyan-800/50' : 'bg-slate-800 text-slate-400 hover:text-slate-200'
            }`}
          >
            <Grid className="w-3 h-3" />
            Zones
          </button>

          <button
            onClick={handleReset}
            className="p-1 text-slate-400 hover:text-slate-200 rounded hover:bg-slate-800"
            title="Reset zoom and calibration"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Main Radiograph Viewport */}
      <div 
        ref={containerRef}
        onWheel={handleWheel}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        className={`relative flex-1 bg-black flex items-center justify-center overflow-hidden select-none ${
          activeTool === 'pan' ? (isDragging ? 'cursor-grabbing' : 'cursor-grab') : activeTool === 'ruler' ? 'cursor-crosshair' : 'cursor-default'
        }`}
        style={{ minHeight: '480px' }}
      >
        {/* Canvas Stage with Transform */}
        <div 
          className="relative transition-transform duration-75 origin-center"
          style={{
            transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
            width: '800px',
            height: '800px',
          }}
        >
          {/* Base X-Ray Canvas */}
          <canvas
            ref={baseCanvasRef}
            className="absolute inset-0 w-full h-full object-contain pointer-events-none"
          />

          {/* Grad-CAM Heatmap Canvas (clipped if split mode) */}
          <div 
            className="absolute inset-0 overflow-hidden pointer-events-none"
            style={{
              clipPath: activeTool === 'split' ? `polygon(${splitPos}% 0, 100% 0, 100% 100%, ${splitPos}% 100%)` : 'none',
            }}
          >
            <canvas
              ref={heatCanvasRef}
              className="w-full h-full object-contain"
            />
          </div>

          {/* Split Wipe Line */}
          {activeTool === 'split' && (
            <div 
              className="absolute top-0 bottom-0 pointer-events-none"
              style={{ left: `${splitPos}%`, transform: 'translateX(-50%)' }}
            >
              <div className="w-0.5 h-full bg-cyan-400 shadow-[0_0_8px_rgba(6,182,212,0.8)]" />
              <div className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-6 h-6 rounded-full bg-slate-900 border border-cyan-400 flex items-center justify-center text-[10px] text-cyan-300 font-mono shadow-md">
                ↔
              </div>
            </div>
          )}

          {/* Anatomical Zones Grid Overlay */}
          {showZones && (
            <svg className="absolute inset-0 w-full h-full pointer-events-none opacity-40">
              {/* Midline */}
              <line x1="400" y1="80" x2="400" y2="720" stroke="#06b6d4" strokeWidth="1" strokeDasharray="4 4" />
              {/* Right Upper / Middle / Lower dividing horizontal lines */}
              <line x1="120" y1="340" x2="380" y2="340" stroke="#06b6d4" strokeWidth="0.8" strokeDasharray="3 3" />
              <line x1="100" y1="520" x2="380" y2="520" stroke="#06b6d4" strokeWidth="0.8" strokeDasharray="3 3" />
              {/* Left Upper / Lower horizontal line */}
              <line x1="420" y1="400" x2="700" y2="400" stroke="#06b6d4" strokeWidth="0.8" strokeDasharray="3 3" />

              <text x="240" y="240" fill="#22d3ee" fontSize="12" fontFamily="JetBrains Mono" textAnchor="middle">RU Zone</text>
              <text x="240" y="440" fill="#22d3ee" fontSize="12" fontFamily="JetBrains Mono" textAnchor="middle">RM Zone</text>
              <text x="240" y="640" fill="#22d3ee" fontSize="12" fontFamily="JetBrains Mono" textAnchor="middle">RL Zone</text>
              <text x="560" y="260" fill="#22d3ee" fontSize="12" fontFamily="JetBrains Mono" textAnchor="middle">LU Zone</text>
              <text x="560" y="580" fill="#22d3ee" fontSize="12" fontFamily="JetBrains Mono" textAnchor="middle">LL Zone</text>
            </svg>
          )}

          {/* Calibrated Measurement Ruler */}
          {rulerPoints && (
            <svg className="absolute inset-0 w-full h-full pointer-events-none z-20">
              <line 
                x1={rulerPoints.x1} 
                y1={rulerPoints.y1} 
                x2={rulerPoints.x2} 
                y2={rulerPoints.y2} 
                stroke="#eab308" 
                strokeWidth="2" 
                strokeDasharray="3 3"
              />
              <circle cx={rulerPoints.x1} cy={rulerPoints.y1} r="4" fill="#eab308" />
              <circle cx={rulerPoints.x2} cy={rulerPoints.y2} r="4" fill="#eab308" />
              <rect 
                x={(rulerPoints.x1 + rulerPoints.x2) / 2 - 35} 
                y={(rulerPoints.y1 + rulerPoints.y2) / 2 - 18} 
                width="70" 
                height="18" 
                fill="#0f172a" 
                stroke="#eab308" 
                rx="3" 
              />
              <text 
                x={(rulerPoints.x1 + rulerPoints.x2) / 2} 
                y={(rulerPoints.y1 + rulerPoints.y2) / 2 - 5} 
                fill="#fef08a" 
                fontSize="11" 
                fontFamily="JetBrains Mono" 
                textAnchor="middle"
              >
                {getRulerLengthMm()} mm
              </text>
            </svg>
          )}
        </div>

        {/* Viewport HUD Info Tags */}
        <div className="absolute top-3 left-3 flex flex-col gap-1 text-[11px] font-mono text-slate-400 bg-slate-950/70 p-2 rounded border border-slate-800 backdrop-blur-sm pointer-events-none">
          <div className="text-slate-200 font-semibold">{currentCase.patientId} · {currentCase.projection} ERECT</div>
          <div>WL: {windowLevel} / WW: {windowWidth}</div>
          <div>Zoom: {Math.round(zoom * 100)}%</div>
        </div>

        {/* Split Slider scrubber below if active */}
        {activeTool === 'split' && (
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 w-72 bg-slate-900/90 border border-slate-700/80 rounded-lg p-2.5 backdrop-blur-md flex items-center gap-3">
            <span className="text-[10px] font-mono text-slate-400 uppercase tracking-wider">Raw CXR</span>
            <input
              type="range"
              min="0"
              max="100"
              value={splitPos}
              onChange={(e) => setSplitPos(parseFloat(e.target.value))}
              className="flex-1 accent-cyan-400 cursor-ew-resize"
            />
            <span className="text-[10px] font-mono text-cyan-400 uppercase tracking-wider">Grad-CAM</span>
          </div>
        )}
      </div>

      {/* Bottom Diagnostic Control Deck */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 p-4 bg-slate-900/95 border-t border-slate-800 text-xs">
        {/* 1. Window / Level Slider */}
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center justify-between text-slate-300">
            <span className="font-medium flex items-center gap-1">
              <Sliders className="w-3.5 h-3.5 text-cyan-400" />
              Window Center (WL)
            </span>
            <span className="font-mono text-cyan-400 tabular-nums">{windowLevel}</span>
          </div>
          <input
            type="range"
            min="20"
            max="235"
            value={windowLevel}
            onChange={(e) => setWindowLevel(parseInt(e.target.value, 10))}
            className="accent-cyan-400 cursor-pointer"
          />
          <div className="flex items-center justify-between text-[11px] text-slate-400">
            <span>Window Width (WW)</span>
            <span className="font-mono tabular-nums">{windowWidth}</span>
          </div>
          <input
            type="range"
            min="40"
            max="255"
            value={windowWidth}
            onChange={(e) => setWindowWidth(parseInt(e.target.value, 10))}
            className="accent-cyan-400 cursor-pointer"
          />
        </div>

        {/* 2. Grad-CAM Activation Threshold */}
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center justify-between text-slate-300">
            <span className="font-medium flex items-center gap-1">
              <Flame className="w-3.5 h-3.5 text-amber-400" />
              Activation Cutoff
            </span>
            <span className="font-mono text-amber-400 tabular-nums">{gradCamThreshold.toFixed(2)}</span>
          </div>
          <input
            type="range"
            min="0.05"
            max="0.85"
            step="0.05"
            value={gradCamThreshold}
            onChange={(e) => setGradCamThreshold(parseFloat(e.target.value))}
            className="accent-amber-400 cursor-pointer"
          />
          <div className="text-[11px] text-slate-400">
            Filters lower-order feature gradients below saliency threshold.
          </div>
        </div>

        {/* 3. Heatmap Opacity & Colormap */}
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center justify-between text-slate-300">
            <span className="font-medium">Heatmap Alpha</span>
            <span className="font-mono text-slate-300 tabular-nums">{Math.round(gradCamOpacity * 100)}%</span>
          </div>
          <input
            type="range"
            min="0.1"
            max="1.0"
            step="0.05"
            value={gradCamOpacity}
            onChange={(e) => setGradCamOpacity(parseFloat(e.target.value))}
            className="accent-cyan-400 cursor-pointer"
          />
          <div className="flex items-center gap-1 pt-1">
            {(['jet', 'turbo', 'inferno', 'viridis'] as ColormapType[]).map((map) => (
              <button
                key={map}
                onClick={() => setColormap(map)}
                className={`flex-1 py-1 px-1.5 rounded text-[10px] font-mono uppercase tracking-wider transition-colors ${
                  colormap === map ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40' : 'bg-slate-800 text-slate-400 hover:text-slate-200'
                }`}
              >
                {map}
              </button>
            ))}
          </div>
        </div>

        {/* 4. Zoom and Navigation Controls */}
        <div className="flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-300">
            <span className="font-medium">Magnification</span>
            <span className="font-mono text-cyan-400 tabular-nums">{(zoom * 100).toFixed(0)}%</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setZoom((prev) => Math.max(0.8, prev - 0.2))}
              className="flex-1 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded flex items-center justify-center gap-1"
            >
              <ZoomOut className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setZoom((prev) => Math.min(3.5, prev + 0.2))}
              className="flex-1 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded flex items-center justify-center gap-1"
            >
              <ZoomIn className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => { setZoom(1); setPan({ x: 0, y: 0 }); }}
              className="py-1.5 px-3 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded font-mono text-[11px]"
            >
              1:1 Fit
            </button>
          </div>
          <div className="text-[11px] text-slate-400 truncate">
            Primary Focus: <span className="text-slate-200 font-medium">{currentCase.focusZone}</span>
          </div>
        </div>
      </div>
    </div>
  );
};
