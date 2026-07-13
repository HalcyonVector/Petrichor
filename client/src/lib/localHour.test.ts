import { describe, it, expect } from 'vitest';
import { hourFromUtcOffset } from './localHour';

describe('hourFromUtcOffset', () => {
  it('matches UTC hour exactly at zero offset', () => {
    expect(hourFromUtcOffset(0, 0)).toBe(0);
  });

  it('adds a positive offset', () => {
    expect(hourFromUtcOffset(9 * 3600, 0)).toBe(9);
  });

  it('wraps a negative offset into the previous day', () => {
    expect(hourFromUtcOffset(-5 * 3600, 0)).toBe(19);
  });

  it('wraps forward across midnight from a nonzero base time', () => {
    expect(hourFromUtcOffset(9 * 3600, 20 * 3600 * 1000)).toBe(5);
  });

  it('always stays within [0, 24)', () => {
    for (let offsetHours = -12; offsetHours <= 14; offsetHours += 1) {
      for (let baseHour = 0; baseHour < 24; baseHour += 3) {
        const hour = hourFromUtcOffset(offsetHours * 3600, baseHour * 3600 * 1000);
        expect(hour).toBeGreaterThanOrEqual(0);
        expect(hour).toBeLessThan(24);
      }
    }
  });
});
