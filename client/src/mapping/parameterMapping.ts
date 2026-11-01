import type { AmbientParams, LiveInputs, ScaleName } from '../types';
import { rainIntensity } from '../lib/weatherIntensity';
import { keyRootForDay } from '../audio/musicTheory';
import { moonIllumination } from '../lib/moon';
import { isSnowing } from '../lib/weatherCode';

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
  const { hour, weather, activity, dayOfYear, moonPhase, winterness } = inputs;
  const night = nightness(hour);

  const temperatureC = weather?.temperatureC ?? FALLBACK_WEATHER.temperatureC;
  const precipitationMm = weather?.precipitationMm ?? FALLBACK_WEATHER.precipitationMm;
  const cloudCoverPct = weather?.cloudCoverPct ?? FALLBACK_WEATHER.cloudCoverPct;
  const windSpeedKmh = weather?.windSpeedKmh ?? FALLBACK_WEATHER.windSpeedKmh;

  // Seasons, centered: +0.5 midwinter, -0.5 midsummer. Winter is a touch
  // slower, darker and more reverberant; summer a touch quicker and busier.
  const season = winterness === undefined ? 0 : winterness - 0.5;

  const tempo = lerp(96, 56, night) - season * 6;

  const octaveShift = night > 0.65 ? -1 : night < 0.25 ? 1 : 0;

  const brightnessFromTime = 1 - night;
  // Moonlight: at night a full moon lifts the tone a little, a new moon
  // darkens it, both fading out as cloud hides the sky.
  const moonlight =
    moonPhase === undefined ? 0 : night * (moonIllumination(moonPhase) - 0.5) * 0.14 * (1 - cloudCoverPct / 100);
  const brightness = clamp(brightnessFromTime - (cloudCoverPct / 100) * 0.45 + moonlight - season * 0.08);

  const warmth = clamp(0.3 + (temperatureC - 5) / 40);
  const padVoices = 3 + Math.round(warmth * 2.5);

  const rainAmount = rainIntensity(precipitationMm);
  const hihatDensity = clamp(0.03 + rainAmount * 0.42 + activity.activity * 0.06);

  // The groove sits back at night and when you're idle, and fills out during
  // the day and while you're busy. Heavy rain softens it a little so the
  // rain texture can come forward.
  const drumDensity = clamp(0.1 + (1 - night) * 0.35 + activity.activity * 0.25 - rainAmount * 0.1);

  // Nature: crickets on warm, dry nights; birds around dawn (and a few at
  // dusk), quieter in rain and absent in hard frost; a bell-like shimmer
  // while it snows.
  const weatherCode = weather?.weatherCode ?? 0;
  const dry = precipitationMm < 0.05;
  const crickets = dry && temperatureC >= 15 ? clamp((night - 0.55) / 0.3) * clamp(0.3 + (temperatureC - 15) / 10) : 0;
  const dawn = Math.max(0, 1 - Math.abs(hour - 6.5) / 2);
  const dusk = Math.max(0, 1 - Math.abs(hour - 18.5) / 1.5) * 0.4;
  const birds = temperatureC > -2 ? Math.max(dawn, dusk) * (precipitationMm > 0.5 ? 0.3 : 1) : 0;
  const snowShimmer = isSnowing(weatherCode) ? clamp(0.4 + rainAmount * 0.6) : 0;

  const windModulation = clamp(windSpeedKmh / 40);

  const arpDensity = clamp(0.06 + activity.activity * 0.55 + activity.typingRate * 0.25 - season * 0.08);

  const reverbWet = clamp(lerp(0.22, 0.55, night) + season * 0.1);

  return {
    tempo,
    scaleMode: pickScaleMode(hour, night),
    rootNote: dayOfYear === undefined ? 48 : keyRootForDay(dayOfYear),
    octaveShift,
    brightness,
    padVoices,
    arpDensity,
    hihatDensity,
    drumDensity,
    rainAmount,
    crickets,
    birds,
    snowShimmer,
    windModulation,
    warmth,
    reverbWet,
  };
}
