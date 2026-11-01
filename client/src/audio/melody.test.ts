import { describe, it, expect } from 'vitest';
import { generatePhrase, nearestChordTone } from './melody';

function seeded(seed: number) {
  let s = seed;
  return () => {
    s = (s * 1664525 + 1013904223) % 4294967296;
    return s / 4294967296;
  };
}

const isChordTone = (degree: number, chordDegree: number) =>
  [0, 2, 4].some((o) => (((degree - chordDegree - o) % 7) + 7) % 7 === 0);

describe('nearestChordTone', () => {
  it('snaps to the nearest root/third/fifth of the chord', () => {
    expect(nearestChordTone(1, 0)).toBe(0); // between C and E in C: C (tie goes to the first found)
    expect(nearestChordTone(3, 0)).toBe(2);
    expect(nearestChordTone(6, 0)).toBe(7);
    expect(isChordTone(nearestChordTone(5, 4), 4)).toBe(true);
  });
});

describe('generatePhrase', () => {
  it('produces 3 to 6 non-overlapping notes inside two bars, in range', () => {
    for (let seed = 1; seed < 300; seed++) {
      const rand = seeded(seed);
      const chord = seed % 7;
      const phrase = generatePhrase(chord, rand);
      expect(phrase.length).toBeGreaterThanOrEqual(3);
      expect(phrase.length).toBeLessThanOrEqual(6);
      phrase.forEach((n, i) => {
        expect(n.degree).toBeGreaterThanOrEqual(-1);
        expect(n.degree).toBeLessThanOrEqual(9);
        expect(n.step + n.length).toBeLessThanOrEqual(30);
        expect(n.length).toBeGreaterThan(0);
        if (i > 0) expect(n.step).toBeGreaterThanOrEqual(phrase[i - 1].step + phrase[i - 1].length);
      });
    }
  });

  it('starts and ends on chord tones', () => {
    for (let seed = 1; seed < 300; seed++) {
      const chord = seed % 7;
      const phrase = generatePhrase(chord, seeded(seed));
      expect(isChordTone(phrase[0].degree, chord)).toBe(true);
      expect(isChordTone(phrase[phrase.length - 1].degree, chord)).toBe(true);
    }
  });

  it('moves mostly by step (no jumps wider than a third)', () => {
    for (let seed = 1; seed < 200; seed++) {
      const phrase = generatePhrase(seed % 7, seeded(seed));
      for (let i = 1; i < phrase.length - 1; i++) {
        expect(Math.abs(phrase[i].degree - phrase[i - 1].degree)).toBeLessThanOrEqual(2);
      }
    }
  });
});

describe('generatePhrase: no stuck notes', () => {
  it('never repeats the same note back to back, including the final resolution', () => {
    for (let seed = 1; seed < 400; seed++) {
      const phrase = generatePhrase(seed % 7, seeded(seed));
      for (let i = 1; i < phrase.length; i++) {
        expect(phrase[i].degree).not.toBe(phrase[i - 1].degree);
      }
    }
  });
});
