/** HH:MM from a fractional hour, rounding at the minute level so 22.999… reads "23:00", never "22:60". */
export function formatClock(hour: number): string {
  const totalMinutes = Math.round(hour * 60) % (24 * 60);
  const h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

/** Elapsed time as "M:SS" (or "H:MM:SS" from an hour), rounding down so it never runs ahead. */
export function formatElapsed(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const ss = String(total % 60).padStart(2, '0');
  return h > 0 ? `${h}:${String(m).padStart(2, '0')}:${ss}` : `${m}:${ss}`;
}
