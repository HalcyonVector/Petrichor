import { useEffect, useRef } from 'react';
import * as Tone from 'tone';

interface VisualizerProps {
  analyser: Tone.Analyser | null;
  active: boolean;
}

export function Visualizer({ analyser, active }: VisualizerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const frameRef = useRef<number>(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return undefined;
    const ctx = canvas.getContext('2d');
    if (!ctx) return undefined;

    const draw = () => {
      const { width, height } = canvas;
      ctx.clearRect(0, 0, width, height);

      if (active && analyser) {
        const values = analyser.getValue() as Float32Array;
        ctx.beginPath();
        ctx.lineWidth = 2;
        ctx.strokeStyle = 'rgba(180, 200, 255, 0.85)';
        const sliceWidth = width / values.length;
        let x = 0;
        for (let i = 0; i < values.length; i++) {
          const y = (values[i] * 0.5 + 0.5) * height;
          if (i === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
          x += sliceWidth;
        }
        ctx.stroke();
      } else {
        ctx.beginPath();
        ctx.strokeStyle = 'rgba(180, 200, 255, 0.25)';
        ctx.moveTo(0, height / 2);
        ctx.lineTo(width, height / 2);
        ctx.stroke();
      }

      frameRef.current = requestAnimationFrame(draw);
    };

    frameRef.current = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(frameRef.current);
  }, [analyser, active]);

  return <canvas ref={canvasRef} width={800} height={160} className="visualizer" />;
}
