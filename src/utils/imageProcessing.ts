import { ColormapType } from '../types/pipeline';

// Scientific Colormap RGB interpolation routines
export function getColormapRgb(val: number, map: ColormapType): [number, number, number] {
  // Clamping val to [0, 1]
  const t = Math.max(0, Math.min(1, val));

  if (map === 'jet') {
    // Standard Medical Jet colormap
    const r = Math.max(0, Math.min(1, 1.5 - Math.abs(t * 4 - 3)));
    const g = Math.max(0, Math.min(1, 1.5 - Math.abs(t * 4 - 2)));
    const b = Math.max(0, Math.min(1, 1.5 - Math.abs(t * 4 - 1)));
    return [Math.round(r * 255), Math.round(g * 255), Math.round(b * 255)];
  }

  if (map === 'turbo') {
    // Google Turbo colormap polynomial approximation
    const r = Math.max(0, Math.min(1, 0.1357 + t * (4.5974 - t * (42.327 - t * (130.588 - t * (150.566 - t * 58.138))))));
    const g = Math.max(0, Math.min(1, 0.0914 + t * (2.1856 + t * (4.8052 - t * (14.0195 - t * (4.2109 - t * 2.7747))))));
    const b = Math.max(0, Math.min(1, 0.1066 + t * (12.5598 - t * (41.658 - t * (44.664 - t * (24.786 - t * 4.417))))));
    return [Math.round(r * 255), Math.round(g * 255), Math.round(b * 255)];
  }

  if (map === 'inferno') {
    // Matplotlib Inferno
    const r = Math.max(0, Math.min(1, t < 0.25 ? t * 2 : t < 0.7 ? 0.5 + (t - 0.25) * 1.1 : 1.0));
    const g = Math.max(0, Math.min(1, t < 0.4 ? t * 0.4 : t < 0.8 ? 0.16 + (t - 0.4) * 1.8 : 0.88 + (t - 0.8) * 0.6));
    const b = Math.max(0, Math.min(1, t < 0.3 ? 0.3 + t * 2.2 : t < 0.6 ? 0.96 - (t - 0.3) * 2.5 : 0.2 + (t - 0.6) * 1.2));
    return [Math.round(r * 255), Math.round(g * 255), Math.round(b * 255)];
  }

  // Default: Viridis
  const r = Math.max(0, Math.min(1, t < 0.5 ? 0.27 + t * 0.3 : 0.42 + (t - 0.5) * 1.1));
  const g = Math.max(0, Math.min(1, t < 0.3 ? t * 1.5 : 0.45 + (t - 0.3) * 0.75));
  const b = Math.max(0, Math.min(1, t < 0.5 ? 0.33 + t * 0.8 : 0.73 - (t - 0.5) * 1.2));
  return [Math.round(r * 255), Math.round(g * 255), Math.round(b * 255)];
}

// Window/Level pixel remapping
export function applyWindowLevelToImageData(
  data: Uint8ClampedArray,
  windowCenter: number, // 0 to 255
  windowWidth: number,  // 1 to 255
  invert: boolean
) {
  const minVal = windowCenter - windowWidth / 2;
  const maxVal = windowCenter + windowWidth / 2;
  const range = maxVal - minVal;

  for (let i = 0; i < data.length; i += 4) {
    // Luminance
    const lum = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
    let normalized = (lum - minVal) / (range || 1);
    normalized = Math.max(0, Math.min(1, normalized));

    let finalVal = Math.round(normalized * 255);
    if (invert) {
      finalVal = 255 - finalVal;
    }

    data[i] = finalVal;
    data[i + 1] = finalVal;
    data[i + 2] = finalVal;
  }
}

// Contrast-Limited Adaptive Histogram Equalization (CLAHE) approximation
export function applyClaheToCanvas(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  clipLimit: number = 2.0,
  gridSize: number = 8
) {
  const imgData = ctx.getImageData(0, 0, width, height);
  const data = imgData.data;
  const tileW = Math.floor(width / gridSize);
  const tileH = Math.floor(height / gridSize);

  // Simple, high-performance local adaptive contrast enhancement
  for (let gy = 0; gy < gridSize; gy++) {
    for (let gx = 0; gx < gridSize; gx++) {
      const startX = gx * tileW;
      const startY = gy * tileH;
      const endX = Math.min(width, startX + tileW);
      const endY = Math.min(height, startY + tileH);

      // 1. Calculate local histogram
      const hist = new Uint32Array(256);
      let totalPixels = 0;

      for (let y = startY; y < endY; y++) {
        for (let x = startX; x < endX; x++) {
          const idx = (y * width + x) * 4;
          const lum = Math.round(0.299 * data[idx] + 0.587 * data[idx + 1] + 0.114 * data[idx + 2]);
          hist[lum]++;
          totalPixels++;
        }
      }

      // 2. Clip histogram according to clipLimit
      const clipVal = Math.floor((totalPixels / 256) * clipLimit);
      let excess = 0;
      for (let i = 0; i < 256; i++) {
        if (hist[i] > clipVal) {
          excess += hist[i] - clipVal;
          hist[i] = clipVal;
        }
      }
      const bonus = Math.floor(excess / 256);
      for (let i = 0; i < 256; i++) {
        hist[i] += bonus;
      }

      // 3. Compute CDF
      const cdf = new Float32Array(256);
      let sum = 0;
      for (let i = 0; i < 256; i++) {
        sum += hist[i];
        cdf[i] = sum / (totalPixels || 1);
      }

      // 4. Equalize pixels in this tile
      for (let y = startY; y < endY; y++) {
        for (let x = startX; x < endX; x++) {
          const idx = (y * width + x) * 4;
          const origLum = Math.round(0.299 * data[idx] + 0.587 * data[idx + 1] + 0.114 * data[idx + 2]);
          const newLum = Math.round(cdf[origLum] * 255);
          
          // Blend slightly with original for natural look
          const blended = Math.round(0.7 * newLum + 0.3 * origLum);
          data[idx] = blended;
          data[idx + 1] = blended;
          data[idx + 2] = blended;
        }
      }
    }
  }

  ctx.putImageData(imgData, 0, 0);
}

// Generate Grad-CAM 2D Canvas Layer
export function drawGradCamOnCanvas(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  coords: {
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
  },
  colormap: ColormapType,
  threshold: number,
  opacity: number
) {
  // Scale coords relative to actual canvas resolution (base is 1000x1000)
  const sx = width / 1000;
  const sy = height / 1000;

  const c1x = coords.cx * sx;
  const c1y = coords.cy * sy;
  const r1x = coords.radiusX * sx;
  const r1y = coords.radiusY * sy;

  const hasSec = !!coords.secondaryZone;
  const c2x = (coords.secondaryZone?.cx ?? 0) * sx;
  const c2y = (coords.secondaryZone?.cy ?? 0) * sy;
  const r2x = (coords.secondaryZone?.radiusX ?? 1) * sx;
  const r2y = (coords.secondaryZone?.radiusY ?? 1) * sy;
  const int2 = coords.secondaryZone?.intensity ?? 0;

  const imgData = ctx.createImageData(width, height);
  const data = imgData.data;

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      // Gaussian activation for primary zone
      const dx1 = (x - c1x) / r1x;
      const dy1 = (y - c1y) / r1y;
      const d1Sq = dx1 * dx1 + dy1 * dy1;
      let act = coords.intensity * Math.exp(-0.5 * d1Sq);

      // Secondary zone
      if (hasSec) {
        const dx2 = (x - c2x) / r2x;
        const dy2 = (y - c2y) / r2y;
        const d2Sq = dx2 * dx2 + dy2 * dy2;
        const act2 = int2 * Math.exp(-0.5 * d2Sq);
        act = Math.max(act, act2);
      }

      const idx = (y * width + x) * 4;

      if (act >= threshold && act > 0.05) {
        // Map activation to colormap
        const [r, g, b] = getColormapRgb(act, colormap);
        const alpha = Math.min(255, Math.round(((act - threshold) / (1 - threshold + 0.001)) * opacity * 255));
        data[idx] = r;
        data[idx + 1] = g;
        data[idx + 2] = b;
        data[idx + 3] = alpha;
      } else {
        data[idx + 3] = 0;
      }
    }
  }

  ctx.putImageData(imgData, 0, 0);
}
