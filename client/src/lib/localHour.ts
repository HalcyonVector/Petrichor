/**
 * Local hour at a location, derived from the current real UTC time plus that
 * location's fixed UTC offset, not the viewer's own clock. Used when a
 * weather location is deliberately overridden (the location picker) so the
 * sky's sun/moon actually matches what time it is *there*, not what time it
 * is where the browser happens to be.
 */
export function hourFromUtcOffset(utcOffsetSeconds: number, nowMs: number = Date.now()): number {
  const utcHour = (nowMs / 1000 / 3600) % 24;
  const hour = utcHour + utcOffsetSeconds / 3600;
  return ((hour % 24) + 24) % 24;
}

/**
 * Day of the year (0 = 1 January) at a location. With a UTC offset it's the
 * date *there*, otherwise the browser's own local date. Feeds the daily key
 * change, so a picked city ticks over to tomorrow's key at its own midnight.
 */
export function dayOfYear(nowMs: number = Date.now(), utcOffsetSeconds: number | null = null): number {
  let year: number;
  let month: number;
  let date: number;
  if (utcOffsetSeconds !== null) {
    const there = new Date(nowMs + utcOffsetSeconds * 1000);
    [year, month, date] = [there.getUTCFullYear(), there.getUTCMonth(), there.getUTCDate()];
  } else {
    const here = new Date(nowMs);
    [year, month, date] = [here.getFullYear(), here.getMonth(), here.getDate()];
  }
  return Math.round((Date.UTC(year, month, date) - Date.UTC(year, 0, 1)) / 86_400_000);
}
