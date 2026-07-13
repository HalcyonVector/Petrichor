import { describe, it, expect } from 'vitest';
import { buildChord, midiToNoteName, pickWeighted, randomWalkDegree, scaleDegreeToMidi } from './musicTheory';

describe('scaleDegreeToMidi', () => {
  it('degree 0 is the root', () => {
    expect(scaleDegreeToMidi(48, 'major', 0)).toBe(48);
  });

  it('wraps to the next octave once degree exceeds the scale length', () => {
    // major scale has 7 degrees; degree 7 should land exactly an octave above the root
    expect(scaleDegreeToMidi(48, 'major', 7)).toBe(60);
  });

  it('applies octaveOffset on top of the wrapped degree', () => {
    expect(scaleDegreeToMidi(48, 'major', 0, 1)).toBe(60);
    expect(scaleDegreeToMidi(48, 'major', 0, -1)).toBe(36);
  });

  it('handles negative degrees by wrapping backwards', () => {
    // degree -1 in a 7-note scale wraps to the last scale index, one octave down
    expect(scaleDegreeToMidi(48, 'major', -1)).toBe(48 + 11 - 12);
  });
});

describe('midiToNoteName', () => {
  it('names known MIDI notes correctly', () => {
    expect(midiToNoteName(60)).toBe('C4');
    expect(midiToNoteName(69)).toBe('A4');
    expect(midiToNoteName(61)).toBe('C#4');
  });
});

describe('buildChord', () => {
  it('returns the requested number of stacked-third notes', () => {
    const chord = buildChord(48, 'major', 0, 4);
    expect(chord).toHaveLength(4);
  });

  it('stacks thirds so each note is higher than the last', () => {
    const chord = buildChord(48, 'major', 0, 3);
    expect(chord[1]).toBeGreaterThan(chord[0]);
    expect(chord[2]).toBeGreaterThan(chord[1]);
  });
});

describe('randomWalkDegree', () => {
  it('never leaves the given span, even after many steps', () => {
    let degree = 3;
    for (let i = 0; i < 500; i++) {
      degree = randomWalkDegree(degree, [0, 6]);
      expect(degree).toBeGreaterThanOrEqual(0);
      expect(degree).toBeLessThanOrEqual(6);
    }
  });
});

describe('pickWeighted', () => {
  it('always picks the only non-zero-weighted option', () => {
    for (let i = 0; i < 20; i++) {
      expect(pickWeighted(['a', 'b', 'c'], [0, 1, 0])).toBe('b');
    }
  });
});
