import { describe, it, expect } from 'vitest';
import { mapInputsToParams } from './parameterMapping';
import type { ActivitySnapshot, LiveInputs, WeatherSnapshot } from '../types';

const CALM_ACTIVITY: ActivitySnapshot = { activity: 0, typingRate: 0, idle: false };

function weather(overrides: Partial<WeatherSnapshot> = {}): WeatherSnapshot {
  return {
    temperatureC: 15,
    precipitationMm: 0,
    cloudCoverPct: 40,
    windSpeedKmh: 10,
    weatherCode: 0,
    isDay: true,
    source: 'client',
    ...overrides,
  };
}

function inputs(overrides: Partial<LiveInputs> = {}): LiveInputs {
  return { hour: 14, weather: weather(), activity: CALM_ACTIVITY, ...overrides };
}

describe('mapInputsToParams', () => {
  it('is faster and brighter at midday than in the dead of night', () => {
    const day = mapInputsToParams(inputs({ hour: 14 }));
    const night = mapInputsToParams(inputs({ hour: 3 }));

    expect(day.tempo).toBeGreaterThan(night.tempo);
    expect(day.brightness).toBeGreaterThan(night.brightness);
  });

  it('raises hihat density and the rain layer as precipitation increases', () => {
    const dry = mapInputsToParams(inputs({ weather: weather({ precipitationMm: 0 }) }));
    const wet = mapInputsToParams(inputs({ weather: weather({ precipitationMm: 4 }) }));

    expect(wet.hihatDensity).toBeGreaterThan(dry.hihatDensity);
    expect(wet.rainAmount).toBeGreaterThan(dry.rainAmount);
  });

  it('raises arp density with interaction activity and typing rate', () => {
    const idle = mapInputsToParams(inputs({ activity: { activity: 0, typingRate: 0, idle: true } }));
    const busy = mapInputsToParams(inputs({ activity: { activity: 1, typingRate: 1, idle: false } }));

    expect(busy.arpDensity).toBeGreaterThan(idle.arpDensity);
  });

  it('darkens brightness as cloud cover increases, holding time of day fixed', () => {
    const clear = mapInputsToParams(inputs({ weather: weather({ cloudCoverPct: 0 }) }));
    const overcast = mapInputsToParams(inputs({ weather: weather({ cloudCoverPct: 100 }) }));

    expect(overcast.brightness).toBeLessThan(clear.brightness);
  });

  it('falls back to sane defaults when weather has not loaded yet', () => {
    const params = mapInputsToParams(inputs({ weather: null }));
    expect(params.tempo).toBeGreaterThan(0);
    expect(params.hihatDensity).toBeGreaterThanOrEqual(0);
    expect(params.rainAmount).toBe(0);
  });

  it('keeps every 0..1 parameter within bounds across a spread of hours', () => {
    for (let hour = 0; hour < 24; hour += 1) {
      const params = mapInputsToParams(inputs({ hour }));
      for (const key of ['brightness', 'arpDensity', 'hihatDensity', 'rainAmount', 'windModulation', 'warmth', 'reverbWet'] as const) {
        expect(params[key]).toBeGreaterThanOrEqual(0);
        expect(params[key]).toBeLessThanOrEqual(1);
      }
    }
  });
});
