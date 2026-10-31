/** Velocity (0..1) for each drum voice on one 16th-note step; 0 means no hit. */
export interface DrumHit {
  kick: number;
  rim: number;
}

const SILENT: DrumHit = { kick: 0, rim: 0 };

/** Below this density the groove drops out entirely, leaving just the ambient layers. */
export const DRUM_SILENCE_THRESHOLD = 0.08;

/**
 * One step of a soft, probabilistic lo-fi groove. `step` is the 16th-note
 * position in the bar (0..15). The downbeat kick is the anchor; everything
 * else (the "and of 3" kick, the 2-and-4 rim clicks, ghost notes) fades in as
 * density rises, so a quiet night is a lone heartbeat kick and a busy
 * afternoon is a full head-nodding pattern. Swing is applied by the
 * transport, not here.
 */
export function drumHitsForStep(step: number, density: number, rand: () => number = Math.random): DrumHit {
  if (!(density >= DRUM_SILENCE_THRESHOLD)) return SILENT;
  const s = ((Math.round(step) % 16) + 16) % 16;
  const d = Math.min(1, density);
  const chance = (p: number) => rand() < p;

  let kick = 0;
  if (s === 0) kick = 0.9;
  else if (s === 10 && chance(0.15 + d * 0.65)) kick = 0.7;
  else if (s === 7 && chance(d * 0.3)) kick = 0.55;
  else if (s === 14 && chance(d * 0.15)) kick = 0.45;

  let rim = 0;
  if ((s === 4 || s === 12) && d > 0.2 && chance(0.3 + d * 0.7)) rim = 0.75;
  else if (s % 2 === 1 && chance(d * 0.08)) rim = 0.25; // ghost notes

  return { kick, rim };
}
