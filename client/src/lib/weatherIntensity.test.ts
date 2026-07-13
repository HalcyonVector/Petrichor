import { describe, it, expect } from 'vitest';
import { rainIntensity } from './weatherIntensity';

describe('rainIntensity', () => {
  it('is 0 for dry weather', () => {
    expect(rainIntensity(0)).toBe(0);
  });

  it('saturates at 1 for heavy rain (4mm/h and above)', () => {
    expect(rainIntensity(4)).toBe(1);
    expect(rainIntensity(10)).toBe(1);
  });

  it('scales linearly in between', () => {
    expect(rainIntensity(2)).toBeCloseTo(0.5);
  });

  it('never goes negative', () => {
    expect(rainIntensity(-5)).toBe(0);
  });
});
