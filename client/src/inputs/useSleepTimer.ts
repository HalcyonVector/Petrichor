import { useEffect, useRef, useState } from 'react';
import { sleepRemainingMs } from '../lib/sleepTimer';

export interface SleepTimer {
  /** Epoch ms when the music should be silent, or null when no timer is set. */
  endsAt: number | null;
  /** The length that was chosen, for highlighting it in the UI. */
  minutes: number | null;
  remainingMs: number;
  /** Start a timer for this many minutes, or pass null to cancel. */
  set: (minutes: number | null) => void;
}

/**
 * Counts down to a stop time. `onFadeStart` fires once, `fadeMs` before the
 * end, so the caller can fade the music out and finish exactly on time.
 * The timer cancels itself when playback stops, since there's nothing left
 * to put to sleep.
 */
export function useSleepTimer(started: boolean, fadeMs: number, onFadeStart: (fadeMs: number) => void): SleepTimer {
  const [endsAt, setEndsAt] = useState<number | null>(null);
  const [minutes, setMinutes] = useState<number | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const onFadeStartRef = useRef(onFadeStart);
  onFadeStartRef.current = onFadeStart;

  useEffect(() => {
    if (!started) {
      setEndsAt(null);
      setMinutes(null);
    }
  }, [started]);

  useEffect(() => {
    if (endsAt === null) return undefined;
    const tick = () => {
      const t = Date.now();
      setNow(t);
      const remaining = sleepRemainingMs(endsAt, t);
      if (remaining <= fadeMs) {
        setEndsAt(null);
        setMinutes(null);
        onFadeStartRef.current(remaining);
      }
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [endsAt, fadeMs]);

  const set = (next: number | null) => {
    const t = Date.now();
    setNow(t);
    setMinutes(next);
    setEndsAt(next === null ? null : t + next * 60_000);
  };

  return { endsAt, minutes, remainingMs: endsAt === null ? 0 : sleepRemainingMs(endsAt, now), set };
}
