import { describe, it, expect } from 'vitest';
import { formatCountdown, sleepRemainingMs } from './sleepTimer';

describe('sleepRemainingMs', () => {
  it('counts down and clamps at zero', () => {
    expect(sleepRemainingMs(10_000, 4_000)).toBe(6_000);
    expect(sleepRemainingMs(10_000, 12_000)).toBe(0);
  });
});

describe('formatCountdown', () => {
  it('formats minutes and seconds under an hour', () => {
    expect(formatCountdown(15 * 60_000)).toBe('15:00');
    expect(formatCountdown(65_000)).toBe('1:05');
  });

  it('adds hours from an hour up', () => {
    expect(formatCountdown(90 * 60_000)).toBe('1:30:00');
    expect(formatCountdown(3_600_000 + 5_000)).toBe('1:00:05');
  });

  it('rounds partial seconds up and never goes negative', () => {
    expect(formatCountdown(400)).toBe('0:01');
    expect(formatCountdown(0)).toBe('0:00');
    expect(formatCountdown(-5)).toBe('0:00');
  });
});
