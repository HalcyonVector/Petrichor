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

describe('daily key', () => {
  it('defaults to C3 when no day is given', () => {
    expect(mapInputsToParams(inputs()).rootNote).toBe(48);
  });

  it('changes key from one day to the next', () => {
    const today = mapInputsToParams(inputs({ dayOfYear: 100 }));
    const tomorrow = mapInputsToParams(inputs({ dayOfYear: 101 }));
    expect(today.rootNote).not.toBe(tomorrow.rootNote);
  });
});

describe('drum groove density', () => {
  it('is busier in the afternoon than at 3am', () => {
    const day = mapInputsToParams(inputs({ hour: 14 }));
    const night = mapInputsToParams(inputs({ hour: 3 }));
    expect(day.drumDensity!).toBeGreaterThan(night.drumDensity!);
  });

  it('fills out with activity and stays within 0..1', () => {
    const idle = mapInputsToParams(inputs({ activity: { activity: 0, typingRate: 0, idle: true } }));
    const busy = mapInputsToParams(inputs({ activity: { activity: 1, typingRate: 1, idle: false } }));
    expect(busy.drumDensity!).toBeGreaterThan(idle.drumDensity!);
    expect(busy.drumDensity!).toBeLessThanOrEqual(1);
    expect(idle.drumDensity!).toBeGreaterThanOrEqual(0);
  });
});

describe('moonlight', () => {
  it('brightens a clear night under a full moon and darkens it under a new moon', () => {
    const clearNight = { hour: 2, weather: weather({ cloudCoverPct: 0 }) };
    const full = mapInputsToParams(inputs({ ...clearNight, moonPhase: 0.5 }));
    const none = mapInputsToParams(inputs({ ...clearNight, moonPhase: 0 }));
    const unset = mapInputsToParams(inputs(clearNight));
    expect(full.brightness).toBeGreaterThan(unset.brightness);
    expect(none.brightness).toBeLessThanOrEqual(unset.brightness);
  });

  it('has no effect under full cloud or at midday', () => {
    const overcast = { hour: 2, weather: weather({ cloudCoverPct: 100 }) };
    expect(mapInputsToParams(inputs({ ...overcast, moonPhase: 0.5 })).brightness).toBeCloseTo(
      mapInputsToParams(inputs(overcast)).brightness,
    );
    expect(mapInputsToParams(inputs({ hour: 14, moonPhase: 0.5 })).brightness).toBeCloseTo(
      mapInputsToParams(inputs({ hour: 14 })).brightness,
      2,
    );
  });
});

describe('nature textures', () => {
  it('has crickets on a warm, dry night only', () => {
    const warmNight = mapInputsToParams(inputs({ hour: 1, weather: weather({ temperatureC: 24 }) }));
    expect(warmNight.crickets!).toBeGreaterThan(0.3);
    expect(mapInputsToParams(inputs({ hour: 1, weather: weather({ temperatureC: 5 }) })).crickets).toBe(0);
    expect(mapInputsToParams(inputs({ hour: 14, weather: weather({ temperatureC: 24 }) })).crickets).toBe(0);
    expect(mapInputsToParams(inputs({ hour: 1, weather: weather({ temperatureC: 24, precipitationMm: 1 }) })).crickets).toBe(0);
  });

  it('has birds around dawn, fewer at dusk, none at midday or in hard frost', () => {
    const dawn = mapInputsToParams(inputs({ hour: 6.5 })).birds!;
    const dusk = mapInputsToParams(inputs({ hour: 18.5 })).birds!;
    expect(dawn).toBeCloseTo(1);
    expect(dusk).toBeGreaterThan(0);
    expect(dusk).toBeLessThan(dawn);
    expect(mapInputsToParams(inputs({ hour: 13 })).birds).toBe(0);
    expect(mapInputsToParams(inputs({ hour: 6.5, weather: weather({ temperatureC: -10 }) })).birds).toBe(0);
    expect(mapInputsToParams(inputs({ hour: 6.5, weather: weather({ precipitationMm: 3 }) })).birds!).toBeLessThan(dawn);
  });

  it('shimmers only while it snows', () => {
    expect(mapInputsToParams(inputs({ weather: weather({ weatherCode: 73, precipitationMm: 1 }) })).snowShimmer!).toBeGreaterThan(0);
    expect(mapInputsToParams(inputs({ weather: weather({ weatherCode: 63, precipitationMm: 1 }) })).snowShimmer).toBe(0);
  });
});

describe('seasons', () => {
  it('makes winter slower, darker and wetter than summer, all else equal', () => {
    const winter = mapInputsToParams(inputs({ winterness: 1 }));
    const summer = mapInputsToParams(inputs({ winterness: 0 }));
    expect(winter.tempo).toBeLessThan(summer.tempo);
    expect(winter.brightness).toBeLessThan(summer.brightness);
    expect(winter.reverbWet).toBeGreaterThan(summer.reverbWet);
    expect(winter.arpDensity).toBeLessThanOrEqual(summer.arpDensity);
  });

  it('is neutral at the equinox (winterness 0.5) and when unknown', () => {
    expect(mapInputsToParams(inputs({ winterness: 0.5 })).tempo).toBeCloseTo(mapInputsToParams(inputs()).tempo);
  });
});
