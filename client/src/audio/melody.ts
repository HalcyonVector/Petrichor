/** One note of a melody phrase, on the 16th-note grid of the two bars it plays over. */
export interface MelodyNote {
  /** Scale degree relative to the melody's root (0 = tonic, 7 = an octave up). */
  degree: number;
  /** Start position in 16ths from the downbeat (0..31 across two bars). */
  step: number;
  /** Length in 16ths. */
  length: number;
  velocity: number;
}

const PHRASE_STEPS = 32; // two bars of 16ths: one pad chord
const MIN_DEGREE = -1;
const MAX_DEGREE = 9;

const clampDegree = (d: number) => Math.max(MIN_DEGREE, Math.min(MAX_DEGREE, d));

/** The chord tone (root, third or fifth of the chord on `chordDegree`, any octave) nearest to `degree`. */
export function nearestChordTone(degree: number, chordDegree: number): number {
  let best = chordDegree;
  for (let octave = -2; octave <= 2; octave++) {
    for (const offset of [0, 2, 4]) {
      const candidate = chordDegree + offset + octave * 7;
      if (candidate < MIN_DEGREE || candidate > MAX_DEGREE) continue;
      if (Math.abs(candidate - degree) < Math.abs(best - degree) || best < MIN_DEGREE || best > MAX_DEGREE) {
        best = candidate;
      }
    }
  }
  return best;
}

/** The nearest chord tone other than `degree` itself, preferring the one below. */
function resolveAwayFrom(degree: number, chordDegree: number): number {
  for (let distance = 1; distance <= 4; distance++) {
    for (const candidate of [degree - distance, degree + distance]) {
      if (candidate < MIN_DEGREE || candidate > MAX_DEGREE) continue;
      if ([0, 2, 4].some((o) => (((candidate - chordDegree - o) % 7) + 7) % 7 === 0)) return candidate;
    }
  }
  return degree;
}

/**
 * A short, singable phrase over one chord: 3 to 6 notes that rise then fall,
 * mostly by step with the occasional leap, starting and ending on chord
 * tones so it always sounds like it belongs to the harmony and comes to
 * rest. Leaves a little space at the end of the two bars so phrases breathe.
 */
export function generatePhrase(chordDegree: number, rand: () => number = Math.random): MelodyNote[] {
  const count = 3 + Math.floor(rand() * 4);
  const lengths = [2, 2, 4, 4, 6];
  const notes: MelodyNote[] = [];

  // Start low-to-mid on a chord tone, leaving headroom for the phrase to rise.
  const startOffset = [0, 2, 4][Math.floor(rand() * 3)];
  let degree = nearestChordTone((chordDegree + startOffset) % 7, chordDegree);
  let step = [0, 2, 4][Math.floor(rand() * 3)];
  const peak = Math.max(1, Math.floor(count / 2));

  for (let i = 0; i < count; i++) {
    const last = i === count - 1;
    let length = last ? 6 + Math.floor(rand() * 3) : lengths[Math.floor(rand() * lengths.length)];
    if (step + length > PHRASE_STEPS - 2) length = Math.max(2, PHRASE_STEPS - 2 - step);
    if (step >= PHRASE_STEPS - 2) break;

    notes.push({
      degree: last ? nearestChordTone(degree, chordDegree) : degree,
      step,
      length,
      velocity: i === 0 || last ? 0.7 : 0.5 + rand() * 0.2,
    });

    step += length;
    const direction = i < peak ? 1 : -1;
    const interval = rand() < 0.2 ? 2 : 1;
    let next = degree + direction * interval;
    // Turn around at the edge of the range rather than repeating the note.
    if (next > MAX_DEGREE || next < MIN_DEGREE) next = degree - direction * interval;
    degree = clampDegree(next);
  }

  // End on a chord tone, and not on the note just played: when snapping
  // would repeat it, resolve to the nearest other chord tone, preferring
  // one below (a phrase settling down rather than stalling).
  const end = notes[notes.length - 1];
  end.degree = nearestChordTone(end.degree, chordDegree);
  const before = notes[notes.length - 2];
  if (before && end.degree === before.degree) {
    end.degree = resolveAwayFrom(before.degree, chordDegree);
  }
  return notes;
}
