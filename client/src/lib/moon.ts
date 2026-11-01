/** Mean length of the lunar cycle (new moon to new moon), in days. */
const SYNODIC_MONTH = 29.530588853;
/** A known new moon: 2000-01-06 18:14 UTC. */
const REFERENCE_NEW_MOON_MS = Date.UTC(2000, 0, 6, 18, 14);
const DAY_MS = 86_400_000;

/**
 * Where the moon is in its cycle, 0..1: 0 = new, 0.25 = first quarter,
 * 0.5 = full, 0.75 = last quarter. Uses the mean synodic month, which is
 * within about a day of the true phase: plenty for drawing the sky.
 */
export function moonPhase(nowMs: number = Date.now()): number {
  const days = (nowMs - REFERENCE_NEW_MOON_MS) / DAY_MS;
  const phase = (days / SYNODIC_MONTH) % 1;
  return phase < 0 ? phase + 1 : phase;
}

/** Fraction of the disc that's lit, 0 (new) to 1 (full). */
export function moonIllumination(phase: number): number {
  return (1 - Math.cos(2 * Math.PI * phase)) / 2;
}

export function moonPhaseName(phase: number): string {
  const p = ((phase % 1) + 1) % 1;
  if (p < 0.03 || p >= 0.97) return 'New moon';
  if (p < 0.22) return 'Waxing crescent';
  if (p < 0.28) return 'First quarter';
  if (p < 0.47) return 'Waxing gibbous';
  if (p < 0.53) return 'Full moon';
  if (p < 0.72) return 'Waning gibbous';
  if (p < 0.78) return 'Last quarter';
  return 'Waning crescent';
}

/**
 * SVG path (in a -1..1 box) for the lit part of the moon. The lit limb is
 * a half circle on the sunward side; the terminator is a half ellipse whose
 * width follows the phase, bulging into the dark side for a crescent and
 * into the lit side for a gibbous moon. Waxing is lit on the right (as seen
 * from the northern hemisphere), waning on the left.
 */
export function moonLitPath(phase: number): string {
  const p = ((phase % 1) + 1) % 1;
  const rx = Math.abs(Math.cos(2 * Math.PI * p));
  const waxing = p < 0.5;
  const gibbous = moonIllumination(p) > 0.5;
  // Waxing: right limb from top to bottom, then the terminator back up.
  const limbSweep = waxing ? 1 : 0;
  const terminatorSweep = waxing === gibbous ? 1 : 0;
  return `M0,-1 A1,1 0 0 ${limbSweep} 0,1 A${rx.toFixed(4)},1 0 0 ${terminatorSweep} 0,-1 Z`;
}
