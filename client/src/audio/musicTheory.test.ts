import { describe, it, expect } from 'vitest';
import { buildChord, keyName, keyRootForDay, midiToNoteName, nextChordDegree, pickWeighted, randomWalkDegree, scaleDegreeToMidi } from './musicTheory';

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

describe('nextChordDegree', () => {
  it('always moves to a different, in-range chord', () => {
    for (let degree = 0; degree < 7; degree++) {
      for (let i = 0; i < 50; i++) {
        const next = nextChordDegree(degree);
        expect(next).not.toBe(degree);
        expect(next).toBeGreaterThanOrEqual(0);
        expect(next).toBeLessThanOrEqual(6);
      }
    }
  });

  it('resolves V to I most of the time', () => {
    let toTonic = 0;
    const runs = 2000;
    for (let i = 0; i < runs; i++) if (nextChordDegree(4) === 0) toTonic++;
    expect(toTonic / runs).toBeGreaterThan(0.45);
  });

  it('is deterministic for a given random source', () => {
    expect(nextChordDegree(4, () => 0)).toBe(0);
    expect(nextChordDegree(4, () => 0.999)).toBe(3);
  });

  it('only uses I, IV and vi in focus mode, even from other chords', () => {
    for (const start of [0, 1, 2, 3, 4, 5, 6]) {
      for (let i = 0; i < 50; i++) {
        expect([0, 3, 5]).toContain(nextChordDegree(start, Math.random, true));
      }
    }
  });
});

describe('keyRootForDay', () => {
  it('starts on C3 and steps around the circle of fifths', () => {
    expect(keyName(keyRootForDay(0))).toBe('C');
    expect(keyName(keyRootForDay(1))).toBe('G');
    expect(keyName(keyRootForDay(2))).toBe('D');
    expect(keyRootForDay(0)).toBe(48);
  });

  it('visits all 12 keys over 12 days, within A2..G#3', () => {
    const roots = Array.from({ length: 12 }, (_, d) => keyRootForDay(d));
    expect(new Set(roots.map((r) => r % 12)).size).toBe(12);
    roots.forEach((r) => {
      expect(r).toBeGreaterThanOrEqual(45);
      expect(r).toBeLessThanOrEqual(56);
    });
    expect(keyRootForDay(12)).toBe(keyRootForDay(0));
  });

  it('falls back to C for non-finite input', () => {
    expect(keyRootForDay(Number.NaN)).toBe(48);
  });
});
