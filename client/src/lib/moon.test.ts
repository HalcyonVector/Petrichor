import { describe, it, expect } from 'vitest';
import { moonIllumination, moonLitPath, moonPhase, moonPhaseName } from './moon';

const cyclicDistance = (a: number, b: number) => Math.min(Math.abs(a - b), 1 - Math.abs(a - b));

describe('moonPhase', () => {
  it('is near new at a known new moon (2024-01-11 11:57 UTC)', () => {
    expect(cyclicDistance(moonPhase(Date.UTC(2024, 0, 11, 11, 57)), 0)).toBeLessThan(0.03);
  });

  it('is near full at a known full moon (2024-01-25 17:54 UTC)', () => {
    expect(Math.abs(moonPhase(Date.UTC(2024, 0, 25, 17, 54)) - 0.5)).toBeLessThan(0.03);
  });

  it('stays within 0..1, including before the reference date', () => {
    for (const t of [Date.UTC(1990, 5, 1), Date.UTC(2026, 10, 1), Date.UTC(2050, 0, 1)]) {
      const p = moonPhase(t);
      expect(p).toBeGreaterThanOrEqual(0);
      expect(p).toBeLessThan(1);
    }
  });
});

describe('moonIllumination / moonPhaseName', () => {
  it('goes dark at new, fully lit at full, half at the quarters', () => {
    expect(moonIllumination(0)).toBeCloseTo(0);
    expect(moonIllumination(0.5)).toBeCloseTo(1);
    expect(moonIllumination(0.25)).toBeCloseTo(0.5);
  });

  it('names the phases', () => {
    expect(moonPhaseName(0.01)).toBe('New moon');
    expect(moonPhaseName(0.12)).toBe('Waxing crescent');
    expect(moonPhaseName(0.5)).toBe('Full moon');
    expect(moonPhaseName(0.75)).toBe('Last quarter');
    expect(moonPhaseName(0.9)).toBe('Waning crescent');
  });
});

describe('moonLitPath', () => {
  it('lights the right limb when waxing and the left when waning', () => {
    expect(moonLitPath(0.2)).toMatch(/^M0,-1 A1,1 0 0 1 0,1/);
    expect(moonLitPath(0.8)).toMatch(/^M0,-1 A1,1 0 0 0 0,1/);
  });

  it('collapses the terminator to a straight line at the quarters', () => {
    expect(moonLitPath(0.25)).toContain('A0.0000,1');
  });
});
