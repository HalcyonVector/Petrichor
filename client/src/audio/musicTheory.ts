import type { ScaleName } from '../types';

// Semitone intervals from the root for each mode, brightest to darkest —
// this ordering is what parameterMapping.ts leans on when picking a mode
// for a given time of day.
const SCALE_INTERVALS: Record<ScaleName, number[]> = {
  lydian: [0, 2, 4, 6, 7, 9, 11],
  major: [0, 2, 4, 5, 7, 9, 11],
  mixolydian: [0, 2, 4, 5, 7, 9, 10],
  dorian: [0, 2, 3, 5, 7, 9, 10],
  minor: [0, 2, 3, 5, 7, 8, 10],
  phrygian: [0, 1, 3, 5, 7, 8, 10],
};

const NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

/** Resolves a scale degree (can exceed the scale length, wraps with octave shift) to a MIDI note. */
export function scaleDegreeToMidi(root: number, scale: ScaleName, degree: number, octaveOffset = 0): number {
  const intervals = SCALE_INTERVALS[scale];
  const len = intervals.length;
  const octave = Math.floor(degree / len) + octaveOffset;
  const idx = ((degree % len) + len) % len;
  return root + intervals[idx] + octave * 12;
}

export function midiToNoteName(midi: number): string {
  const rounded = Math.round(midi);
  const name = NOTE_NAMES[((rounded % 12) + 12) % 12];
  const octave = Math.floor(rounded / 12) - 1;
  return `${name}${octave}`;
}

/** Stacks thirds from a scale degree to build a chord, returned as MIDI notes. */
export function buildChord(root: number, scale: ScaleName, degree: number, size = 3): number[] {
  const notes: number[] = [];
  for (let i = 0; i < size; i++) {
    notes.push(scaleDegreeToMidi(root, scale, degree + i * 2));
  }
  return notes;
}

/** Random walk across scale degrees so chord/arp motion stays smooth instead of jumping around. */
export function randomWalkDegree(current: number, span: [number, number] = [0, 6]): number {
  const steps = [-2, -1, -1, 1, 1, 2];
  const step = steps[Math.floor(Math.random() * steps.length)];
  let next = current + step;
  if (next < span[0]) next = span[0] + 1;
  if (next > span[1]) next = span[1] - 1;
  return next;
}

export function pickWeighted<T>(options: T[], weights: number[], rand: () => number = Math.random): T {
  const total = weights.reduce((a, b) => a + b, 0);
  let r = rand() * total;
  for (let i = 0; i < options.length; i++) {
    r -= weights[i];
    if (r <= 0) return options[i];
  }
  return options[options.length - 1];
}

// Where each chord (scale degree 0..6, i.e. I ii iii IV V vi vii) tends to
// move next, loosely following common-practice functional harmony: ii and IV
// lead to V, V resolves home to I (or deceptively to vi), and so on. The
// diminished vii is kept rare. No entry repeats its own chord, so the
// harmony always moves when a new chord is due.
const CHORD_TRANSITIONS: Record<number, [number, number][]> = {
  0: [[3, 3], [4, 2], [5, 3], [1, 2], [2, 1]],
  1: [[4, 5], [3, 1], [5, 1], [6, 0.3]],
  2: [[5, 4], [3, 3], [1, 1]],
  3: [[4, 4], [0, 3], [1, 2], [5, 1]],
  4: [[0, 6], [5, 3], [3, 1]],
  5: [[3, 4], [1, 3], [4, 2], [2, 1]],
  6: [[0, 5], [2, 1]],
};

// A calmer subset for focus mode: only the stable I, IV and vi chords, so the
// harmony drifts gently instead of building and resolving tension.
const FOCUS_TRANSITIONS: Record<number, [number, number][]> = {
  0: [[3, 3], [5, 2]],
  3: [[0, 3], [5, 1]],
  5: [[3, 2], [0, 2]],
};

/**
 * Picks the next chord's scale degree from a weighted transition table, so
 * progressions build tension and resolve (IV, V, I) instead of wandering at
 * random. Out-of-range input is wrapped into 0..6 first. In focus mode only
 * I, IV and vi are used.
 */
export function nextChordDegree(current: number, rand: () => number = Math.random, focus = false): number {
  const table = focus ? FOCUS_TRANSITIONS : CHORD_TRANSITIONS;
  const wrapped = ((Math.round(current) % 7) + 7) % 7;
  const options = table[wrapped] ?? table[0];
  return pickWeighted(
    options.map(([degree]) => degree),
    options.map(([, weight]) => weight),
    rand,
  );
}

/**
 * The key for a given day of the year, stepping one fifth per day around the
 * circle of fifths (C, G, D, A, ...) so neighbouring days sit in closely
 * related keys and all 12 come round every 12 days. Returned as a MIDI root
 * between A2 (45) and G#3 (56) so the register stays close to the original
 * C3; day 0 is C3 (48).
 */
export function keyRootForDay(dayOfYear: number): number {
  const day = Math.floor(Number.isFinite(dayOfYear) ? dayOfYear : 0);
  const pitchClass = (((day * 7) % 12) + 12) % 12;
  return 45 + ((pitchClass - 9 + 12) % 12);
}

/** Note name without octave for a MIDI root, e.g. 50 -> "D". */
export function keyName(midi: number): string {
  return NOTE_NAMES[((Math.round(midi) % 12) + 12) % 12];
}
