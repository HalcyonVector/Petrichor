import { describe, it, expect } from 'vitest';
import { retryDelayMs } from './useWeather';

describe('retryDelayMs', () => {
  it('backs off from 30s, doubling, capped at the 10 minute refresh', () => {
    expect(retryDelayMs(1)).toBe(30_000);
    expect(retryDelayMs(2)).toBe(60_000);
    expect(retryDelayMs(3)).toBe(120_000);
    expect(retryDelayMs(10)).toBe(600_000);
  });
});
