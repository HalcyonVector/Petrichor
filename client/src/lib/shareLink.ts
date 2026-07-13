import type { AmbientParams, ScaleName } from '../types';

const SCALE_MODES: ScaleName[] = ['lydian', 'major', 'mixolydian', 'dorian', 'minor', 'phrygian'];
const QUERY_KEY = 'sound';

const NUMBER_FIELDS: (keyof AmbientParams)[] = [
  'tempo', 'rootNote', 'octaveShift', 'brightness', 'padVoices',
  'arpDensity', 'hihatDensity', 'rainAmount', 'windModulation', 'warmth', 'reverbWet',
];

function isValidParams(value: unknown): value is AmbientParams {
  if (!value || typeof value !== 'object') return false;
  const p = value as Record<string, unknown>;
  if (!NUMBER_FIELDS.every((key) => typeof p[key] === 'number' && Number.isFinite(p[key] as number))) return false;
  return typeof p.scaleMode === 'string' && SCALE_MODES.includes(p.scaleMode as ScaleName);
}

/** Resolved sound → URL-safe encoded string. Round-trips through decodeShareParams. */
export function encodeShareParams(params: AmbientParams): string {
  return encodeURIComponent(btoa(JSON.stringify(params)));
}

/** Untrusted URL input → AmbientParams, or null if malformed/tampered/incomplete. Never throws. */
export function decodeShareParams(encoded: string): AmbientParams | null {
  try {
    const parsed = JSON.parse(atob(decodeURIComponent(encoded)));
    return isValidParams(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

/** Current page URL with the resolved sound encoded into a `sound` query param, everything else stripped. */
export function buildShareUrl(params: AmbientParams): string {
  const url = new URL(window.location.href);
  url.search = '';
  url.searchParams.set(QUERY_KEY, encodeShareParams(params));
  return url.toString();
}

/** Reads and decodes the `sound` param from the current page URL, if present and valid. */
export function readShareParamsFromLocation(): AmbientParams | null {
  const value = new URLSearchParams(window.location.search).get(QUERY_KEY);
  return value ? decodeShareParams(value) : null;
}
