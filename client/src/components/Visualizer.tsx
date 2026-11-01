import { useEffect, useRef } from 'react';
import type * as Tone from 'tone';

interface VisualizerProps {
  analyser: Tone.Analyser | null;
  active: boolean;
  /** Low-power mode: about 20 fps and no glow. */
  lowPower?: boolean;
}

const POINTS = 160;

/**
 * The tray's waveform. Ambient audio is quiet, so the raw signal is
 * auto-gained (smoothly, so it doesn't jump) to fill the strip, drawn as a
 * soft glowing line with a faint fill beneath. While stopped it "breathes":
 * a slow, low sine, so the tray never has a blank gap. Under
 * prefers-reduced-motion the idle line is drawn still.
 */
export function Visualizer({ analyser, active, lowPower = false }: VisualizerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return undefined;
    const ctx = canvas.getContext('2d');
    if (!ctx) return undefined;

    const reducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
    let frame = 0;
    let lastDraw = 0;
    let gain = 4;
    const ys = new Float32Array(POINTS);

    // Match the backing store to the displayed size, so lines stay crisp.
    const resize = () => {
      const dpr = window.devicePixelRatio || 1;
      const w = Math.max(1, Math.round(canvas.clientWidth * dpr));
      const h = Math.max(1, Math.round(canvas.clientHeight * dpr));
      if (canvas.width !== w || canvas.height !== h) {
        canvas.width = w;
        canvas.height = h;
      }
    };
    resize();
    const observer = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(resize) : null;
    observer?.observe(canvas);

    const draw = (now: number) => {
      if (lowPower && now - lastDraw < 50) {
        frame = requestAnimationFrame(draw);
        return;
      }
      lastDraw = now;
      const { width, height } = canvas;
      const mid = height / 2;
      ctx.clearRect(0, 0, width, height);

      if (active && analyser) {
        const values = analyser.getValue() as Float32Array;
        const step = values.length / POINTS;
        let peak = 0;
        for (let i = 0; i < POINTS; i++) {
          // Average each bucket: a smoother line than point sampling.
          let sum = 0;
          const start = Math.floor(i * step);
          const end = Math.max(start + 1, Math.floor((i + 1) * step));
          for (let j = start; j < end; j++) sum += values[j];
          ys[i] = sum / (end - start);
          peak = Math.max(peak, Math.abs(ys[i]));
        }
        const target = Math.min(14, Math.max(1, 0.85 / Math.max(peak, 0.001)));
        gain += (target - gain) * 0.05;
        for (let i = 0; i < POINTS; i++) ys[i] = Math.max(-1, Math.min(1, ys[i] * gain));
      } else {
        const t = reducedMotion ? 0 : now / 1000;
        for (let i = 0; i < POINTS; i++) {
          const x = i / (POINTS - 1);
          const envelope = Math.sin(Math.PI * x); // taper to the edges
          ys[i] = envelope * 0.18 * Math.sin(x * Math.PI * 3 + t * 0.8) * (0.7 + 0.3 * Math.sin(t * 0.5));
        }
      }

      const amp = mid * 0.9;
      const xAt = (i: number) => (i / (POINTS - 1)) * width;

      ctx.beginPath();
      ctx.moveTo(0, mid);
      for (let i = 0; i < POINTS; i++) ctx.lineTo(xAt(i), mid - ys[i] * amp);
      ctx.lineTo(width, mid);
      ctx.closePath();
      const fill = ctx.createLinearGradient(0, 0, 0, height);
      fill.addColorStop(0, 'rgba(242, 197, 104, 0.18)');
      fill.addColorStop(0.5, 'rgba(242, 197, 104, 0.04)');
      fill.addColorStop(1, 'rgba(160, 190, 255, 0.14)');
      ctx.fillStyle = fill;
      ctx.fill();

      const stroke = ctx.createLinearGradient(0, 0, width, 0);
      stroke.addColorStop(0, 'rgba(170, 195, 255, 0)');
      stroke.addColorStop(0.2, 'rgba(170, 195, 255, 0.9)');
      stroke.addColorStop(0.5, active ? 'rgba(255, 214, 140, 1)' : 'rgba(255, 214, 140, 0.55)');
      stroke.addColorStop(0.8, 'rgba(170, 195, 255, 0.9)');
      stroke.addColorStop(1, 'rgba(170, 195, 255, 0)');
      ctx.beginPath();
      for (let i = 0; i < POINTS; i++) {
        const y = mid - ys[i] * amp;
        if (i === 0) ctx.moveTo(xAt(i), y);
        else ctx.lineTo(xAt(i), y);
      }
      const dpr = window.devicePixelRatio || 1;
      ctx.lineWidth = 1.75 * dpr;
      ctx.lineJoin = 'round';
      ctx.strokeStyle = stroke;
      ctx.shadowColor = 'rgba(255, 214, 140, 0.6)';
      ctx.shadowBlur = lowPower ? 0 : (active ? 10 : 5) * dpr;
      ctx.stroke();
      ctx.shadowBlur = 0;

      if (!reducedMotion || active) frame = requestAnimationFrame(draw);
    };

    frame = requestAnimationFrame(draw);
    return () => {
      cancelAnimationFrame(frame);
      observer?.disconnect();
    };
  }, [analyser, active, lowPower]);

  return <canvas ref={canvasRef} className="visualizer" aria-hidden="true" />;
}
