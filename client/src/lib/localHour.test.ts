import { describe, it, expect } from 'vitest';
import { dayOfYear, hourFromUtcOffset } from './localHour';

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

describe('dayOfYear', () => {
  it('is 0 on 1 January and 364 on 31 December (non-leap year)', () => {
    expect(dayOfYear(Date.UTC(2026, 0, 1, 12), 0)).toBe(0);
    expect(dayOfYear(Date.UTC(2026, 11, 31, 12), 0)).toBe(364);
  });

  it('counts the leap day', () => {
    expect(dayOfYear(Date.UTC(2028, 11, 31, 12), 0)).toBe(365);
  });

  it("uses the location's own date when given a UTC offset", () => {
    // 23:00 UTC on 1 Jan is already 2 Jan in Tokyo (+9h).
    const now = Date.UTC(2026, 0, 1, 23);
    expect(dayOfYear(now, 0)).toBe(0);
    expect(dayOfYear(now, 9 * 3600)).toBe(1);
    // ...and still 31 Dec of the previous year in Honolulu (-10h) at 05:00 UTC on 1 Jan.
    expect(dayOfYear(Date.UTC(2026, 0, 1, 5), -10 * 3600)).toBe(364);
  });
});
