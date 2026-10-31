import type { MixLayer } from '../audio/AudioEngine';

const VOLUME_KEY = 'ambient-weather-engine:volume';
const MIX_KEY = 'ambient-weather-engine:mix';
const LOCATION_KEY = 'ambient-weather-engine:location';
const ONBOARDED_KEY = 'ambient-weather-engine:onboarded';
const MIX_LAYERS: MixLayer[] = ['pad', 'bass', 'arp', 'hihat', 'drums', 'rain'];

export interface StoredLocation {
  lat: number;
  lon: number;
  label: string;
}

/** Small persisted-settings helpers: local-only, best-effort, never throw. A blocked or full
 * localStorage just means the app falls back to defaults instead of crashing. */

export function loadStoredVolume(fallback: number): number {
  try {
    const raw = localStorage.getItem(VOLUME_KEY);
    if (raw === null) return fallback;
    const value = Number(raw);
    return Number.isFinite(value) && value >= 0 && value <= 1 ? value : fallback;
  } catch {
    return fallback;
  }
}

export function saveStoredVolume(volume: number): void {
  try {
    localStorage.setItem(VOLUME_KEY, String(volume));
  } catch {
    // quota exceeded or storage disabled; not worth surfacing to the user
  }
}

export function loadStoredMix(fallback: Record<MixLayer, number>): Record<MixLayer, number> {
  try {
    const raw = localStorage.getItem(MIX_KEY);
    if (raw === null) return fallback;
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    if (!parsed || typeof parsed !== 'object') return fallback;
    // Layer by layer, so a mix saved before a layer existed keeps its other
    // levels and the new layer just starts at its default.
    const merged = { ...fallback };
    MIX_LAYERS.forEach((layer) => {
      const value = parsed[layer];
      if (typeof value === 'number' && Number.isFinite(value)) merged[layer] = value;
    });
    return merged;
  } catch {
    return fallback;
  }
}

export function saveStoredMix(mix: Record<MixLayer, number>): void {
  try {
    localStorage.setItem(MIX_KEY, JSON.stringify(mix));
  } catch {
    // quota exceeded or storage disabled; not worth surfacing to the user
  }
}

export function loadStoredLocation(): StoredLocation | null {
  try {
    const raw = localStorage.getItem(LOCATION_KEY);
    if (raw === null) return null;
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    const valid =
      typeof parsed.lat === 'number' && Number.isFinite(parsed.lat) &&
      typeof parsed.lon === 'number' && Number.isFinite(parsed.lon) &&
      typeof parsed.label === 'string';
    return valid ? (parsed as unknown as StoredLocation) : null;
  } catch {
    return null;
  }
}

export function saveStoredLocation(location: StoredLocation | null): void {
  try {
    if (location) localStorage.setItem(LOCATION_KEY, JSON.stringify(location));
    else localStorage.removeItem(LOCATION_KEY);
  } catch {
    // quota exceeded or storage disabled; not worth surfacing to the user
  }
}

export function hasSeenOnboarding(): boolean {
  try {
    return localStorage.getItem(ONBOARDED_KEY) === 'true';
  } catch {
    return false;
  }
}

export function markOnboardingSeen(): void {
  try {
    localStorage.setItem(ONBOARDED_KEY, 'true');
  } catch {
    // quota exceeded or storage disabled; the hint just reappears next visit
  }
}
