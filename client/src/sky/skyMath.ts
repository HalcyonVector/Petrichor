export type CelestialBody = 'sun' | 'moon';

export interface CelestialPosition {
  body: CelestialBody;
  xPct: number; // 0..100 across the viewport width
  yPct: number; // 0..100 down the viewport height (smaller = higher in the sky)
  glow: number; // 0..1, relative brightness — peaks at zenith, fades toward the horizon
  arc: number; // 0..1, raw arc height — 0 at rise/set, 1 at zenith (glow's input, exposed for effects like horizon glow)
}

/**
 * Traces a simple rise-to-set arc across the sky. The sun owns the 06:00–18:00
 * window and the moon owns the complementary half — which one is showing is
 * decided by the caller (from weather.isDay when available, hour otherwise),
 * not guessed here.
 */
export function celestialPosition(hour: number, body: CelestialBody): CelestialPosition {
  const start = body === 'sun' ? 6 : 18;
  const span = 12;
  let t = (hour - start) / span;
  t = ((t % 1) + 1) % 1;

  const xPct = 10 + t * 80;
  const arc = Math.sin(t * Math.PI); // 0 at horizon, 1 at zenith
  const yPct = 84 - arc * 64;
  const glow = 0.3 + arc * 0.7;

  return { body, xPct, yPct, glow, arc };
}

/**
 * How strongly a warm horizon glow should show under the sun — peaks right
 * at sunrise/sunset (arc near 0) and fades out by the time the sun is a
 * third of the way up its arc. The moon doesn't get one; night skies read
 * fine without a "moonrise glow" and it'd just look like stray light.
 */
export function horizonGlowIntensity(body: CelestialBody, arc: number): number {
  if (body !== 'sun') return 0;
  return Math.max(0, Math.min(1, 1 - arc / 0.4));
}

export function pickCelestialBody(hour: number, isDay: boolean | undefined): CelestialBody {
  if (typeof isDay === 'boolean') return isDay ? 'sun' : 'moon';
  return hour >= 6 && hour < 18 ? 'sun' : 'moon';
}

interface Rgb {
  r: number;
  g: number;
  b: number;
}

function hexToRgb(hex: string): Rgb {
  const clean = hex.replace('#', '');
  return {
    r: parseInt(clean.slice(0, 2), 16),
    g: parseInt(clean.slice(2, 4), 16),
    b: parseInt(clean.slice(4, 6), 16),
  };
}

// Stays in Rgb-object space until the final CSS string conversion — mixing
// twice (day→night, then →grey for cloud cover) previously fed an already-
// stringified "rgb(...)" back into a hex-only parser and produced NaN.
function mixRgb(a: Rgb, b: Rgb, t: number): Rgb {
  const clamped = Math.max(0, Math.min(1, t));
  return {
    r: Math.round(a.r + (b.r - a.r) * clamped),
    g: Math.round(a.g + (b.g - a.g) * clamped),
    b: Math.round(a.b + (b.b - a.b) * clamped),
  };
}

function rgbToCss(c: Rgb): string {
  return `rgb(${c.r}, ${c.g}, ${c.b})`;
}

const DAY_TOP = hexToRgb('#5f95dc');
const DAY_BOTTOM = hexToRgb('#cfe3f4');
const NIGHT_TOP = hexToRgb('#131826');
const NIGHT_BOTTOM = hexToRgb('#05070c');
const OVERCAST_GREY = hexToRgb('#7b818f');

export interface SkyGradient {
  top: string;
  bottom: string;
}

/**
 * Blends day → night by `night` (0..1, see mapping/parameterMapping.nightness),
 * then flattens both ends toward grey as cloud cover increases — an overcast
 * noon reads as dull, not blue; an overcast midnight reads as less inky.
 */
export function skyGradientStops(night: number, cloudCoverPct: number): SkyGradient {
  const cloudT = Math.max(0, Math.min(1, cloudCoverPct / 100)) * 0.55;
  const top = rgbToCss(mixRgb(mixRgb(DAY_TOP, NIGHT_TOP, night), OVERCAST_GREY, cloudT));
  const bottom = rgbToCss(mixRgb(mixRgb(DAY_BOTTOM, NIGHT_BOTTOM, night), OVERCAST_GREY, cloudT * 0.7));
  return { top, bottom };
}

/** Stars fade in with night and fade back out under heavy cloud cover. */
export function starFieldOpacity(night: number, cloudCoverPct: number): number {
  const cloudDamping = Math.max(0, Math.min(1, cloudCoverPct / 100)) * 0.75;
  return Math.max(0, Math.min(1, night - cloudDamping));
}

const DAY_HILL = hexToRgb('#3c5a78');
const NIGHT_HILL = hexToRgb('#04060a');

/** Distant-skyline silhouette color — blends day → night the same way the sky itself does. */
export function horizonSilhouetteColor(night: number): string {
  return rgbToCss(mixRgb(DAY_HILL, NIGHT_HILL, night));
}
