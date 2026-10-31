import type { AmbientParams, LiveInputs, ScaleName } from '../types';
import { rainIntensity } from '../lib/weatherIntensity';
import { keyRootForDay } from '../audio/musicTheory';

function clamp(v: number, min = 0, max = 1): number {
  return Math.max(min, Math.min(max, v));
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * clamp(t);
}

/**
 * 0 at solar noon-ish (14:00), 1 at the dead of night (03:00), smooth
 * cosine curve in between. Everything time-driven below is expressed in
 * terms of this single "how nighttime does it feel" value.
 */
export function nightness(hour: number): number {
  return (Math.cos(((hour - 3) / 24) * 2 * Math.PI) + 1) / 2;
}

function pickScaleMode(hour: number, night: number): ScaleName {
  if (night > 0.85) return 'phrygian';
  if (night > 0.6) return 'minor';
  if (night > 0.4) return 'dorian';
  if (night > 0.2) return 'mixolydian';
  return hour >= 10 && hour <= 16 ? 'lydian' : 'major';
}

const FALLBACK_WEATHER = {
  temperatureC: 15,
  precipitationMm: 0,
  cloudCoverPct: 40,
  windSpeedKmh: 10,
};

/**
 * Pure function: live inputs (time, weather, interaction activity) in,
 * fully-resolved synthesis parameters out. Keeping this side-effect-free
 * makes the mapping easy to reason about (and to simulate in the UI).
 */
export function mapInputsToParams(inputs: LiveInputs): AmbientParams {
  const { hour, weather, activity, dayOfYear } = inputs;
  const night = nightness(hour);

  const temperatureC = weather?.temperatureC ?? FALLBACK_WEATHER.temperatureC;
  const precipitationMm = weather?.precipitationMm ?? FALLBACK_WEATHER.precipitationMm;
  const cloudCoverPct = weather?.cloudCoverPct ?? FALLBACK_WEATHER.cloudCoverPct;
  const windSpeedKmh = weather?.windSpeedKmh ?? FALLBACK_WEATHER.windSpeedKmh;

  const tempo = lerp(96, 56, night);

  const octaveShift = night > 0.65 ? -1 : night < 0.25 ? 1 : 0;

  const brightnessFromTime = 1 - night;
  const brightness = clamp(brightnessFromTime - (cloudCoverPct / 100) * 0.45);

  const warmth = clamp(0.3 + (temperatureC - 5) / 40);
  const padVoices = 3 + Math.round(warmth * 2.5);

  const rainAmount = rainIntensity(precipitationMm);
  const hihatDensity = clamp(0.03 + rainAmount * 0.42 + activity.activity * 0.06);

  const windModulation = clamp(windSpeedKmh / 40);

  const arpDensity = clamp(0.06 + activity.activity * 0.55 + activity.typingRate * 0.25);

  const reverbWet = lerp(0.22, 0.55, night);

  return {
    tempo,
    scaleMode: pickScaleMode(hour, night),
    rootNote: dayOfYear === undefined ? 48 : keyRootForDay(dayOfYear),
    octaveShift,
    brightness,
    padVoices,
    arpDensity,
    hihatDensity,
    rainAmount,
    windModulation,
    warmth,
    reverbWet,
  };
}
