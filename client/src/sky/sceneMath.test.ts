import { describe, it, expect } from 'vitest';
import { auroraAmount, fogAmount, rippleCount } from './sceneMath';

describe('fogAmount', () => {
  it('is full on a fog code regardless of cloud', () => {
    expect(fogAmount(10, 45)).toBe(1);
  });

  it('is zero up to 75% cloud, then a light haze', () => {
    expect(fogAmount(75, 3)).toBe(0);
    expect(fogAmount(100, 3)).toBeCloseTo(0.55);
    expect(fogAmount(90, 3)).toBeGreaterThan(0);
    expect(fogAmount(90, 3)).toBeLessThan(0.55);
  });
});

describe('auroraAmount', () => {
  it('needs a dark, clear, dry night', () => {
    expect(auroraAmount(1, 0, 0)).toBe(1);
    expect(auroraAmount(0.3, 0, 0)).toBe(0); // daytime
    expect(auroraAmount(1, 60, 0)).toBe(0); // cloudy
    expect(auroraAmount(1, 0, 1)).toBe(0); // raining
  });

  it('fades in between those extremes and stays in range', () => {
    const partial = auroraAmount(0.75, 25, 0);
    expect(partial).toBeGreaterThan(0);
    expect(partial).toBeLessThan(1);
  });
});

describe('rippleCount', () => {
  it('is zero when dry or snowing', () => {
    expect(rippleCount(0, false)).toBe(0);
    expect(rippleCount(3, true)).toBe(0);
  });

  it('grows with rain', () => {
    expect(rippleCount(4, false)).toBeGreaterThan(rippleCount(0.3, false));
    expect(rippleCount(0.3, false)).toBeGreaterThanOrEqual(4);
  });
});
