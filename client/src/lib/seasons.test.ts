import { describe, it, expect } from 'vitest';
import { seasonName, winterness } from './seasons';

describe('winterness', () => {
  it('peaks in mid-January and bottoms out in mid-July in the north', () => {
    expect(winterness(14, 51)).toBeCloseTo(1, 2);
    expect(winterness(196, 51)).toBeLessThan(0.02);
  });

  it('is flipped in the southern hemisphere', () => {
    expect(winterness(14, -34)).toBeLessThan(0.02);
    expect(winterness(196, -34)).toBeGreaterThan(0.98);
  });

  it('fades toward neutral at the equator and assumes north when unknown', () => {
    expect(winterness(14, 0)).toBeCloseTo(0.5);
    expect(winterness(14)).toBeCloseTo(1, 2);
  });
});

describe('seasonName', () => {
  it('names northern seasons and flips them for the south', () => {
    expect(seasonName(10, 51)).toBe('Winter');
    expect(seasonName(100, 51)).toBe('Spring');
    expect(seasonName(200, 51)).toBe('Summer');
    expect(seasonName(304, 51)).toBe('Autumn');
    expect(seasonName(200, -34)).toBe('Winter');
    expect(seasonName(304, -34)).toBe('Spring');
  });
});
