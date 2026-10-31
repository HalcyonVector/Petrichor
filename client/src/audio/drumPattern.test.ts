import { describe, it, expect } from 'vitest';
import { DRUM_SILENCE_THRESHOLD, drumHitsForStep } from './drumPattern';

const always = () => 0;
const never = () => 0.9999;

describe('drumHitsForStep', () => {
  it('is silent below the density threshold', () => {
    for (let s = 0; s < 16; s++) {
      expect(drumHitsForStep(s, DRUM_SILENCE_THRESHOLD / 2, always)).toEqual({ kick: 0, rim: 0 });
    }
  });

  it('always lands a kick on the downbeat once audible', () => {
    expect(drumHitsForStep(0, 0.1, never).kick).toBeGreaterThan(0);
    expect(drumHitsForStep(16, 0.1, never).kick).toBeGreaterThan(0);
  });

  it('keeps a sparse groove to just the downbeat when nothing else rolls', () => {
    const hits = Array.from({ length: 16 }, (_, s) => drumHitsForStep(s, 0.1, never));
    expect(hits.filter((h) => h.kick > 0)).toHaveLength(1);
    expect(hits.every((h) => h.rim === 0)).toBe(true);
  });

  it('puts rim clicks on the backbeat at higher density', () => {
    expect(drumHitsForStep(4, 0.8, always).rim).toBeGreaterThan(0);
    expect(drumHitsForStep(12, 0.8, always).rim).toBeGreaterThan(0);
    expect(drumHitsForStep(4, 0.15, always).rim).toBe(0);
  });

  it('plays more hits per bar as density rises', () => {
    const countHits = (density: number) => {
      let n = 0;
      for (let bar = 0; bar < 200; bar++) {
        for (let s = 0; s < 16; s++) {
          const h = drumHitsForStep(s, density);
          if (h.kick > 0) n++;
          if (h.rim > 0) n++;
        }
      }
      return n;
    };
    expect(countHits(0.9)).toBeGreaterThan(countHits(0.15) * 2);
  });

  it('returns velocities in 0..1 and treats NaN density as silence', () => {
    for (let s = 0; s < 16; s++) {
      const h = drumHitsForStep(s, 5, always);
      expect(h.kick).toBeGreaterThanOrEqual(0);
      expect(h.kick).toBeLessThanOrEqual(1);
      expect(h.rim).toBeLessThanOrEqual(1);
    }
    expect(drumHitsForStep(0, Number.NaN, always)).toEqual({ kick: 0, rim: 0 });
  });
});
