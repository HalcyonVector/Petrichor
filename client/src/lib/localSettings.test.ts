import { describe, it, expect, beforeEach } from 'vitest';
import {
  loadStoredVolume, saveStoredVolume,
  loadStoredMix, saveStoredMix,
  loadStoredLocation, saveStoredLocation,
  hasSeenOnboarding, markOnboardingSeen,
  loadStoredFocus, saveStoredFocus,
} from './localSettings';
import type { MixLayer } from '../audio/AudioEngine';

const DEFAULT_MIX: Record<MixLayer, number> = { pad: 1, bass: 1, arp: 1, melody: 1, hihat: 1, drums: 1, rain: 1 };

beforeEach(() => {
  localStorage.clear();
});

describe('volume persistence', () => {
  it('returns the fallback when nothing is stored', () => {
    expect(loadStoredVolume(0.85)).toBe(0.85);
  });

  it('round-trips a saved value', () => {
    saveStoredVolume(0.42);
    expect(loadStoredVolume(0.85)).toBe(0.42);
  });

  it('falls back on an out-of-range stored value', () => {
    localStorage.setItem('ambient-weather-engine:volume', '1.7');
    expect(loadStoredVolume(0.85)).toBe(0.85);
  });

  it('falls back on garbage stored data', () => {
    localStorage.setItem('ambient-weather-engine:volume', 'not-a-number');
    expect(loadStoredVolume(0.85)).toBe(0.85);
  });
});

describe('mix persistence', () => {
  it('returns the fallback when nothing is stored', () => {
    expect(loadStoredMix(DEFAULT_MIX)).toEqual(DEFAULT_MIX);
  });

  it('round-trips a saved mix', () => {
    const custom: Record<MixLayer, number> = { pad: 0.5, bass: 1.2, arp: 0, melody: 0.7, hihat: 0.8, drums: 0.6, rain: 1.5 };
    saveStoredMix(custom);
    expect(loadStoredMix(DEFAULT_MIX)).toEqual(custom);
  });

  it('keeps saved layers and defaults any missing ones (e.g. a mix saved before drums existed)', () => {
    localStorage.setItem(
      'ambient-weather-engine:mix',
      JSON.stringify({ pad: 0.4, bass: 1, arp: 1, hihat: 1, rain: 0.2, junk: 'x' }),
    );
    expect(loadStoredMix(DEFAULT_MIX)).toEqual({ ...DEFAULT_MIX, pad: 0.4, rain: 0.2 });
  });

  it('falls back on garbage stored data', () => {
    localStorage.setItem('ambient-weather-engine:mix', '{not valid json');
    expect(loadStoredMix(DEFAULT_MIX)).toEqual(DEFAULT_MIX);
  });
});

describe('location persistence', () => {
  it('returns null when nothing is stored', () => {
    expect(loadStoredLocation()).toBeNull();
  });

  it('round-trips a saved location', () => {
    const loc = { lat: 35.0116, lon: 135.7681, label: 'Kyoto, Japan' };
    saveStoredLocation(loc);
    expect(loadStoredLocation()).toEqual(loc);
  });

  it('clears the stored location when saved as null', () => {
    saveStoredLocation({ lat: 1, lon: 2, label: 'Somewhere' });
    saveStoredLocation(null);
    expect(loadStoredLocation()).toBeNull();
  });

  it('rejects an incomplete stored location', () => {
    localStorage.setItem('ambient-weather-engine:location', JSON.stringify({ lat: 1 }));
    expect(loadStoredLocation()).toBeNull();
  });

  it('falls back on garbage stored data', () => {
    localStorage.setItem('ambient-weather-engine:location', '{not valid json');
    expect(loadStoredLocation()).toBeNull();
  });
});

describe('onboarding flag', () => {
  it('is unseen by default', () => {
    expect(hasSeenOnboarding()).toBe(false);
  });

  it('stays seen once marked', () => {
    markOnboardingSeen();
    expect(hasSeenOnboarding()).toBe(true);
  });
});

describe('focus mode persistence', () => {
  it('defaults to off and round-trips', () => {
    expect(loadStoredFocus()).toBe(false);
    saveStoredFocus(true);
    expect(loadStoredFocus()).toBe(true);
    saveStoredFocus(false);
    expect(loadStoredFocus()).toBe(false);
  });
});
