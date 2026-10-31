import { useEffect, useRef } from 'react';
import type * as Tone from 'tone';

interface HorizonBandProps {
  analyser: Tone.Analyser | null;
  active: boolean;
}

const POINTS = 96;
const LAYERS = [
  { color: [90, 255, 200], phase: 0, speed: 0.35, lift: 1 },
  { color: [150, 140, 255], phase: 2.1, speed: 0.27, lift: 0.8 },
  { color: [255, 200, 130], phase: 4.2, speed: 0.42, lift: 0.6 },
] as const;

/**
 * Immersive mode's visualizer: a wide band of light along the horizon, like
 * an aurora sitting on the hills. Three soft ribbons rise and sway with the
 * music: their height follows the smoothed loudness, their shape the live
 * waveform, blended additively so overlaps glow. Not rendered under
 * prefers-reduced-motion (the caller checks).
 */
export function HorizonBand({ analyser, active }: HorizonBandProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return undefined;
    const ctx = canvas.getContext('2d');
    if (!ctx) return undefined;

    let frame = 0;
    let energy = 0;
    let gain = 6;
    const shape = new Float32Array(POINTS);
    const smooth = new Float32Array(POINTS);

    // 1:1 pixels on purpose: the ribbons are blurred anyway, and a smaller
    // backing store keeps the blur cheap on high-DPI screens.
    const resize = () => {
      const w = Math.max(1, canvas.clientWidth);
      const h = Math.max(1, canvas.clientHeight);
      if (canvas.width !== w || canvas.height !== h) {
        canvas.width = w;
        canvas.height = h;
      }
    };
    resize();
    const observer = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(resize) : null;
    observer?.observe(canvas);

    const draw = (now: number) => {
      const { width, height } = canvas;
      const t = now / 1000;
      ctx.clearRect(0, 0, width, height);

      if (active && analyser) {
        const values = analyser.getValue() as Float32Array;
        const step = values.length / POINTS;
        let sumSq = 0;
        let peak = 0;
        for (let i = 0; i < POINTS; i++) {
          let sum = 0;
          const start = Math.floor(i * step);
          const end = Math.max(start + 1, Math.floor((i + 1) * step));
          for (let j = start; j < end; j++) {
            sum += values[j];
            sumSq += values[j] * values[j];
          }
          shape[i] = sum / (end - start);
          peak = Math.max(peak, Math.abs(shape[i]));
        }
        const rms = Math.sqrt(sumSq / values.length);
        energy += (Math.min(1, rms * 6) - energy) * 0.06;
        const target = Math.min(12, Math.max(1, 0.8 / Math.max(peak, 0.001)));
        gain += (target - gain) * 0.04;
      } else {
        energy += (0 - energy) * 0.03;
        shape.fill(0);
      }

      // Spatial smoothing so the ribbons ripple rather than jitter.
      for (let i = 0; i < POINTS; i++) {
        let acc = 0;
        let n = 0;
        for (let k = -3; k <= 3; k++) {
          const j = i + k;
          if (j >= 0 && j < POINTS) {
            acc += shape[j];
            n++;
          }
        }
        smooth[i] = Math.max(-1, Math.min(1, (acc / n) * gain));
      }

      const base = height * 0.95;
      const maxRise = height * 0.85;
      ctx.globalCompositeOperation = 'lighter';
      ctx.filter = 'blur(10px)';

      for (const layer of LAYERS) {
        const [r, g, b] = layer.color;
        const tops: number[] = [];
        for (let i = 0; i < POINTS; i++) {
          const x = i / (POINTS - 1);
          const envelope = Math.sin(Math.PI * x) ** 0.6;
          const sway = 0.5 + 0.5 * Math.sin(x * Math.PI * 3 + t * layer.speed + layer.phase);
          const wave = 0.5 + 0.5 * smooth[i];
          const level = (0.22 + energy * 0.9) * layer.lift;
          tops.push(base - envelope * maxRise * level * (0.35 + 0.4 * sway + 0.35 * wave));
        }

        const minTop = Math.min(...tops);
        const grad = ctx.createLinearGradient(0, minTop, 0, base);
        grad.addColorStop(0, `rgba(${r}, ${g}, ${b}, 0)`);
        grad.addColorStop(0.25, `rgba(${r}, ${g}, ${b}, ${0.32 + energy * 0.35})`);
        grad.addColorStop(1, `rgba(${r}, ${g}, ${b}, 0.04)`);

        ctx.beginPath();
        ctx.moveTo(0, base);
        tops.forEach((y, i) => ctx.lineTo((i / (POINTS - 1)) * width, y));
        ctx.lineTo(width, base);
        ctx.closePath();
        ctx.fillStyle = grad;
        ctx.fill();
      }

      ctx.filter = 'none';
      ctx.globalCompositeOperation = 'source-over';
      frame = requestAnimationFrame(draw);
    };

    frame = requestAnimationFrame(draw);
    return () => {
      cancelAnimationFrame(frame);
      observer?.disconnect();
    };
  }, [analyser, active]);

  return <canvas ref={canvasRef} className="horizon-band" aria-hidden="true" />;
}
