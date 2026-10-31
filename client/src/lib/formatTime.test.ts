import { describe, it, expect } from 'vitest';
import { formatClock, formatElapsed } from './formatTime';

describe('formatClock', () => {
  it('pads single-digit hours and minutes', () => {
    expect(formatClock(1 + 5 / 60)).toBe('01:05');
  });

  it('rounds to the nearest minute instead of truncating', () => {
    expect(formatClock(14.999)).toBe('15:00');
  });

  it('rolls a near-midnight rounding into 00:00 instead of 24:00 or 23:60', () => {
    expect(formatClock(23.9999)).toBe('00:00');
  });

  it('handles exact whole hours', () => {
    expect(formatClock(9)).toBe('09:00');
  });
});

describe('formatElapsed', () => {
  it('rounds down and formats minutes and hours', () => {
    expect(formatElapsed(0)).toBe('0:00');
    expect(formatElapsed(999)).toBe('0:00');
    expect(formatElapsed(65_400)).toBe('1:05');
    expect(formatElapsed(3_725_000)).toBe('1:02:05');
    expect(formatElapsed(-50)).toBe('0:00');
  });
});
