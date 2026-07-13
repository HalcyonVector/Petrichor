import { useEffect, useState } from 'react';
import { hourFromUtcOffset } from '../lib/localHour';

function currentHour(utcOffsetSeconds: number | null): number {
  if (utcOffsetSeconds !== null) return hourFromUtcOffset(utcOffsetSeconds);
  const now = new Date();
  return now.getHours() + now.getMinutes() / 60 + now.getSeconds() / 3600;
}

/**
 * Local time of day as a float in [0, 24). Ticks once a minute, plenty for
 * slow ambient drift. Pass `utcOffsetSeconds` when the weather location has
 * been deliberately overridden (the location picker), so the hour reflects
 * that place's actual local time instead of wherever the browser is.
 */
export function useTimeOfDay(overrideHour: number | null, utcOffsetSeconds: number | null = null): number {
  const [hour, setHour] = useState(() => currentHour(utcOffsetSeconds));

  useEffect(() => {
    if (overrideHour !== null) return undefined;
    setHour(currentHour(utcOffsetSeconds));
    const id = setInterval(() => setHour(currentHour(utcOffsetSeconds)), 30_000);
    return () => clearInterval(id);
  }, [overrideHour, utcOffsetSeconds]);

  return overrideHour ?? hour;
}
