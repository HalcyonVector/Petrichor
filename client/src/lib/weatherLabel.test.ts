import { describe, it, expect } from 'vitest';
import { weatherLabel } from './weatherLabel';
import type { WeatherSnapshot } from '../types';

function weather(overrides: Partial<WeatherSnapshot> = {}): WeatherSnapshot {
  return {
    temperatureC: 15,
    precipitationMm: 0,
    cloudCoverPct: 0,
    windSpeedKmh: 5,
    weatherCode: 0,
    isDay: true,
    source: 'client',
    ...overrides,
  };
}

describe('weatherLabel', () => {
  it('reports loading when weather has not arrived yet', () => {
    expect(weatherLabel(null)).toBe('LOADING');
  });

  it('prioritizes rain over cloud cover', () => {
    expect(weatherLabel(weather({ precipitationMm: 3, cloudCoverPct: 10 }))).toBe('HEAVY RAIN');
    expect(weatherLabel(weather({ precipitationMm: 0.5, cloudCoverPct: 10 }))).toBe('LIGHT RAIN');
  });

  it('falls through cloud cover bands when it is dry', () => {
    expect(weatherLabel(weather({ cloudCoverPct: 90 }))).toBe('OVERCAST');
    expect(weatherLabel(weather({ cloudCoverPct: 50 }))).toBe('PARTLY CLOUDY');
    expect(weatherLabel(weather({ cloudCoverPct: 5 }))).toBe('CLEAR');
  });

  it('reports snow instead of "rain" even though precipitationMm is still positive', () => {
    expect(weatherLabel(weather({ weatherCode: 73, precipitationMm: 2.5 }))).toBe('SNOW');
  });

  it('reports thunderstorm ahead of snow or rain', () => {
    expect(weatherLabel(weather({ weatherCode: 95, precipitationMm: 4 }))).toBe('THUNDERSTORM');
  });
});

describe('weatherLabel without a reading', () => {
  it('says LOADING while waiting and WEATHER OFFLINE once the fetch has failed', () => {
    expect(weatherLabel(null)).toBe('LOADING');
    expect(weatherLabel(null, true)).toBe('WEATHER OFFLINE');
  });
});

describe('drizzle', () => {
  it('labels the light precipitation the sky already draws as rain', () => {
    const base = { temperatureC: 20, cloudCoverPct: 80, windSpeedKmh: 5, weatherCode: 51, isDay: true, source: 'client' as const };
    expect(weatherLabel({ ...base, precipitationMm: 0.08 })).toBe('DRIZZLE');
    expect(weatherLabel({ ...base, precipitationMm: 0.04 })).toBe('OVERCAST');
    expect(weatherLabel({ ...base, precipitationMm: 0.5 })).toBe('LIGHT RAIN');
  });
});
