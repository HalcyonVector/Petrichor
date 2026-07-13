import { describe, it, expect } from 'vitest';
import {
  celestialPosition,
  horizonGlowIntensity,
  horizonSilhouetteColor,
  pickCelestialBody,
  skyGradientStops,
  starFieldOpacity,
} from './skyMath';

describe('celestialPosition', () => {
  it('peaks at the highest point (smallest yPct) at the middle of the arc', () => {
    const rise = celestialPosition(6, 'sun');
    const zenith = celestialPosition(12, 'sun');
    const set = celestialPosition(18, 'sun');

    expect(zenith.yPct).toBeLessThan(rise.yPct);
    expect(zenith.glow).toBeGreaterThan(rise.glow);
    expect(zenith.arc).toBeCloseTo(1);
    expect(rise.arc).toBeCloseTo(0);
    // rise and set sit at the same height at the arc's edges
    expect(Math.abs(rise.yPct - set.yPct)).toBeLessThan(1);
  });

  it('moves left to right across the arc', () => {
    const early = celestialPosition(7, 'sun');
    const late = celestialPosition(17, 'sun');
    expect(late.xPct).toBeGreaterThan(early.xPct);
  });

  it('wraps the moon arc across midnight', () => {
    const p = celestialPosition(0, 'moon'); // midpoint of the 18:00–06:00 arc
    expect(p.body).toBe('moon');
    expect(p.yPct).toBeLessThan(celestialPosition(18, 'moon').yPct);
  });
});

describe('pickCelestialBody', () => {
  it('trusts weather.isDay when it is known', () => {
    expect(pickCelestialBody(2, true)).toBe('sun'); // odd but explicit — trust the signal over the clock
    expect(pickCelestialBody(14, false)).toBe('moon');
  });

  it('falls back to the hour when isDay is unknown', () => {
    expect(pickCelestialBody(10, undefined)).toBe('sun');
    expect(pickCelestialBody(23, undefined)).toBe('moon');
  });
});

const RGB_PATTERN = /^rgb\((\d+), (\d+), (\d+)\)$/;

function parseRgb(css: string): [number, number, number] {
  const match = css.match(RGB_PATTERN);
  if (!match) throw new Error(`not a valid rgb() string: ${css}`);
  return [Number(match[1]), Number(match[2]), Number(match[3])];
}

describe('skyGradientStops', () => {
  it('always produces well-formed, non-NaN rgb() strings across the full input range', () => {
    for (let night = 0; night <= 1; night += 0.2) {
      for (let cloud = 0; cloud <= 100; cloud += 20) {
        const { top, bottom } = skyGradientStops(night, cloud);
        for (const channel of [...parseRgb(top), ...parseRgb(bottom)]) {
          expect(Number.isFinite(channel)).toBe(true);
          expect(channel).toBeGreaterThanOrEqual(0);
          expect(channel).toBeLessThanOrEqual(255);
        }
      }
    }
  });

  it('returns a bright top at full day and a dark top at full night', () => {
    const day = parseRgb(skyGradientStops(0, 0).top);
    const night = parseRgb(skyGradientStops(1, 0).top);
    const brightness = (rgb: [number, number, number]) => rgb[0] + rgb[1] + rgb[2];
    expect(brightness(day)).toBeGreaterThan(brightness(night));
  });

  it('flattens toward grey as cloud cover rises, at fixed night', () => {
    const clear = skyGradientStops(0.5, 0);
    const overcast = skyGradientStops(0.5, 100);
    expect(clear.top).not.toBe(overcast.top);
  });
});

describe('starFieldOpacity', () => {
  it('is fully dark (no stars) at noon with no cloud', () => {
    expect(starFieldOpacity(0, 0)).toBe(0);
  });

  it('is highest at deep night with clear skies', () => {
    expect(starFieldOpacity(1, 0)).toBe(1);
  });

  it('is damped by heavy cloud cover even at night', () => {
    expect(starFieldOpacity(1, 100)).toBeLessThan(starFieldOpacity(1, 0));
  });

  it('never leaves the 0..1 range', () => {
    for (let night = 0; night <= 1; night += 0.25) {
      for (let cloud = 0; cloud <= 100; cloud += 25) {
        const v = starFieldOpacity(night, cloud);
        expect(v).toBeGreaterThanOrEqual(0);
        expect(v).toBeLessThanOrEqual(1);
      }
    }
  });
});

describe('horizonGlowIntensity', () => {
  it('peaks right at sunrise/sunset (arc 0)', () => {
    expect(horizonGlowIntensity('sun', 0)).toBe(1);
  });

  it('fades to 0 once the sun is well clear of the horizon', () => {
    expect(horizonGlowIntensity('sun', 0.4)).toBe(0);
    expect(horizonGlowIntensity('sun', 1)).toBe(0);
  });

  it('never applies to the moon', () => {
    expect(horizonGlowIntensity('moon', 0)).toBe(0);
  });
});

describe('horizonSilhouetteColor', () => {
  it('produces well-formed rgb() strings and darkens toward night', () => {
    const day = horizonSilhouetteColor(0).match(/\d+/g)!.map(Number);
    const night = horizonSilhouetteColor(1).match(/\d+/g)!.map(Number);
    const brightness = (rgb: number[]) => rgb.reduce((a, b) => a + b, 0);
    expect(brightness(day)).toBeGreaterThan(brightness(night));
  });
});
