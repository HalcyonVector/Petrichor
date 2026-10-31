import { useEffect, useRef, useState, type Ref } from 'react';
import { formatClock } from '../lib/formatTime';

interface ImmersiveOverlayProps {
  chord: string | null;
  keyLabel: string;
  place: string | null;
  weather: string;
  hour: number;
  started: boolean;
  /** Increments on each key/mode change, to replay the highlight. */
  keyCue: number;
  onExit: () => void;
  containerRef?: Ref<HTMLDivElement>;
}

const IDLE_MS = 3000;

/**
 * Immersive mode: the tray is hidden and the sky fills the screen, with the
 * chord and key in large type. Clicking anywhere (or Escape, handled by the
 * app) returns to the normal view. After a few seconds without the mouse
 * moving, the cursor and the exit hint fade out too.
 */
export function ImmersiveOverlay({
  chord, keyLabel, place, weather, hour, started, keyCue, onExit, containerRef,
}: ImmersiveOverlayProps) {
  const [idle, setIdle] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    const wake = () => {
      setIdle(false);
      clearTimeout(timer.current);
      timer.current = setTimeout(() => setIdle(true), IDLE_MS);
    };
    wake();
    window.addEventListener('mousemove', wake);
    window.addEventListener('touchstart', wake);
    window.addEventListener('keydown', wake);
    return () => {
      clearTimeout(timer.current);
      window.removeEventListener('mousemove', wake);
      window.removeEventListener('touchstart', wake);
      window.removeEventListener('keydown', wake);
    };
  }, []);

  return (
    <div
      ref={containerRef}
      className={`immersive${idle ? ' immersive--idle' : ''}`}
      role="region"
      aria-label="Immersive view"
      tabIndex={-1}
      onClick={onExit}
    >
      <div className="immersive-center">
        <div key={chord ?? 'none'} className="immersive-chord">
          {started ? chord ?? ' ' : ' '}
        </div>
        <div key={keyCue} className={keyCue > 0 ? 'immersive-key immersive-key--changed' : 'immersive-key'}>
          {keyLabel}
        </div>
        <div className="immersive-meta">
          {[place, weather, formatClock(hour)].filter(Boolean).join(' · ')}
        </div>
        {!started && <div className="immersive-hint-play">Press Space to play</div>}
      </div>

      <button
        type="button"
        className="immersive-exit"
        onClick={(e) => {
          e.stopPropagation();
          onExit();
        }}
      >
        Exit immersive view <kbd>Esc</kbd>
      </button>
    </div>
  );
}
