import { useEffect, useState } from 'react';

function currentHour(): number {
  const now = new Date();
  return now.getHours() + now.getMinutes() / 60 + now.getSeconds() / 3600;
}

/** Local time of day as a float in [0, 24). Ticks once a minute — plenty for slow ambient drift. */
export function useTimeOfDay(overrideHour: number | null): number {
  const [hour, setHour] = useState(currentHour);

  useEffect(() => {
    if (overrideHour !== null) return;
    const id = setInterval(() => setHour(currentHour()), 30_000);
    return () => clearInterval(id);
  }, [overrideHour]);

  return overrideHour ?? hour;
}
