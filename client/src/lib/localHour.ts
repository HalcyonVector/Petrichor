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
