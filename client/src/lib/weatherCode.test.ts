import { describe, it, expect } from 'vitest';
import { isSnowing, isThunderstorm, isFoggy } from './weatherCode';

describe('isSnowing', () => {
  it('recognizes snow fall and snow shower codes', () => {
    for (const code of [71, 73, 75, 77, 85, 86]) {
      expect(isSnowing(code)).toBe(true);
    }
  });

  it('does not flag rain, clear, or thunderstorm codes as snow', () => {
    for (const code of [0, 1, 3, 61, 63, 65, 95]) {
      expect(isSnowing(code)).toBe(false);
    }
  });

  it('treats an unknown weather code as not snowing', () => {
    expect(isSnowing(undefined)).toBe(false);
  });
});

describe('isThunderstorm', () => {
  it('recognizes thunderstorm codes, with and without hail', () => {
    for (const code of [95, 96, 99]) {
      expect(isThunderstorm(code)).toBe(true);
    }
  });

  it('does not flag rain or snow codes as a thunderstorm', () => {
    for (const code of [0, 61, 75, 85]) {
      expect(isThunderstorm(code)).toBe(false);
    }
  });

  it('treats an unknown weather code as not a thunderstorm', () => {
    expect(isThunderstorm(undefined)).toBe(false);
  });
});

describe('isFoggy', () => {
  it('recognizes the WMO fog codes only', () => {
    expect(isFoggy(45)).toBe(true);
    expect(isFoggy(48)).toBe(true);
    expect(isFoggy(3)).toBe(false);
    expect(isFoggy(undefined)).toBe(false);
  });
});
