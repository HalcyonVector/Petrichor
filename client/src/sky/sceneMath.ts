import { rainIntensity } from '../lib/weatherIntensity';
import { isFoggy } from '../lib/weatherCode';

const clamp01 = (v: number) => Math.max(0, Math.min(1, v));

/**
 * How thick the fog banks are, 0..1. Full on a reported fog code; otherwise
 * low cloud starts to settle in as cover passes 75%, up to a light haze.
 */
export function fogAmount(cloudCoverPct: number, weatherCode: number | undefined): number {
  if (isFoggy(weatherCode)) return 1;
  return clamp01((cloudCoverPct - 75) / 25) * 0.55;
}

/**
 * Aurora strength, 0..1: only on properly dark, clear, dry nights. Fades in
 * as night deepens and out as cloud builds; any precipitation hides it.
 */
export function auroraAmount(night: number, cloudCoverPct: number, precipitationMm: number): number {
  if (precipitationMm > 0.05) return 0;
  return clamp01((night - 0.6) / 0.3) * clamp01((40 - cloudCoverPct) / 30);
}

/** Number of rain ripples on the ground: none when dry or snowing, more as rain gets heavier. */
export function rippleCount(precipitationMm: number, snowing: boolean): number {
  if (snowing || precipitationMm <= 0.05) return 0;
  return Math.round(4 + rainIntensity(precipitationMm) * 14);
}
