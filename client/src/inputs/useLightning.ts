import { useEffect, useState } from 'react';

const MIN_DELAY_MS = 4000;
const MAX_DELAY_MS = 13000;

export function nextLightningDelay(): number {
  return MIN_DELAY_MS + Math.random() * (MAX_DELAY_MS - MIN_DELAY_MS);
}

/**
 * Fires an incrementing counter at randomized intervals while `active` is
 * true. Consumers (the sky's flash overlay, the engine's thunder sound)
 * just watch the counter change on each render; they don't manage timing.
 * Starts at 0, so callers should treat 0 as "no strike yet" rather than a
 * real trigger.
 */
export function useLightning(active: boolean): number {
  const [trigger, setTrigger] = useState(0);

  useEffect(() => {
    if (!active) return undefined;
    let timeoutId: ReturnType<typeof setTimeout>;

    const schedule = () => {
      timeoutId = setTimeout(() => {
        setTrigger((t) => t + 1);
        schedule();
      }, nextLightningDelay());
    };
    schedule();

    return () => clearTimeout(timeoutId);
  }, [active]);

  return trigger;
}
