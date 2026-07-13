/** HH:MM from a fractional hour, rounding at the minute level so 22.999… reads "23:00", never "22:60". */
export function formatClock(hour: number): string {
  const totalMinutes = Math.round(hour * 60) % (24 * 60);
  const h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}
