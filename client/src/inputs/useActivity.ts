import { useEffect, useRef, useState } from 'react';
import type { ActivitySnapshot } from '../types';

const TICK_MS = 500;
const DECAY_PER_TICK = 0.92; // roughly an 8s half-life once input stops
const TYPING_WINDOW_MS = 4000;
const TYPING_MAX_KEYS_PER_SEC = 6; // normalization ceiling for "fast typing"

/**
 * Browsers can't read real OS/CPU telemetry, so this is a deliberate proxy
 * for "system activity": a decaying score built from keyboard, mouse, and
 * scroll cadence, damped further while the tab is hidden. It's an honest
 * substitute for the "how busy is the human at this machine" signal, not a
 * simulation of real system load.
 */
export function useActivity(overrideActivity: number | null): ActivitySnapshot {
  const [snapshot, setSnapshot] = useState<ActivitySnapshot>({ activity: 0.2, typingRate: 0, idle: false });
  const activityRef = useRef(0.2);
  const keyTimestamps = useRef<number[]>([]);
  const idleRef = useRef(false);

  useEffect(() => {
    if (overrideActivity !== null) return undefined;

    const bump = (amount: number) => {
      activityRef.current = Math.min(1, activityRef.current + amount);
    };

    const onKeydown = () => {
      bump(0.12);
      const now = performance.now();
      keyTimestamps.current.push(now);
    };
    const onMouseMove = () => bump(0.03);
    const onScroll = () => bump(0.05);
    const onVisibility = () => {
      idleRef.current = document.hidden;
    };

    window.addEventListener('keydown', onKeydown);
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('scroll', onScroll, { passive: true });
    document.addEventListener('visibilitychange', onVisibility);

    const id = setInterval(() => {
      activityRef.current *= DECAY_PER_TICK;
      if (idleRef.current) activityRef.current *= 0.9;

      const now = performance.now();
      keyTimestamps.current = keyTimestamps.current.filter((t) => now - t < TYPING_WINDOW_MS);
      const keysPerSec = keyTimestamps.current.length / (TYPING_WINDOW_MS / 1000);
      const typingRate = Math.min(1, keysPerSec / TYPING_MAX_KEYS_PER_SEC);

      setSnapshot({
        activity: Math.max(0, Math.min(1, activityRef.current)),
        typingRate,
        idle: idleRef.current,
      });
    }, TICK_MS);

    return () => {
      window.removeEventListener('keydown', onKeydown);
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('scroll', onScroll);
      document.removeEventListener('visibilitychange', onVisibility);
      clearInterval(id);
    };
  }, [overrideActivity]);

  if (overrideActivity !== null) {
    return { activity: overrideActivity, typingRate: overrideActivity, idle: false };
  }
  return snapshot;
}
