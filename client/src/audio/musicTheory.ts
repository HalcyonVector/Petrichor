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

export function pickWeighted<T>(options: T[], weights: number[]): T {
  const total = weights.reduce((a, b) => a + b, 0);
  let r = Math.random() * total;
  for (let i = 0; i < options.length; i++) {
    r -= weights[i];
    if (r <= 0) return options[i];
  }
  return options[options.length - 1];
}
