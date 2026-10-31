import { describe, it, expect, beforeEach } from 'vitest';
import { buildShareUrl, decodeShareParams, encodeShareParams, readShareParamsFromLocation } from './shareLink';
import type { AmbientParams } from '../types';

const PARAMS: AmbientParams = {
  tempo: 66,
  scaleMode: 'dorian',
  rootNote: 48,
  octaveShift: -1,
  brightness: 0.19,
  padVoices: 4,
  arpDensity: 0.3,
  hihatDensity: 0.21,
  rainAmount: 0.38,
  windModulation: 0.44,
  warmth: 0.55,
  reverbWet: 0.47,
};

describe('encodeShareParams / decodeShareParams', () => {
  it('round-trips the optional drumDensity, and accepts older links without it', () => {
    const withDrums = { ...PARAMS, drumDensity: 0.4 };
    expect(decodeShareParams(encodeShareParams(withDrums))).toEqual(withDrums);
    expect(decodeShareParams(encodeShareParams(PARAMS))).toEqual(PARAMS);
  });

  it('rejects a non-numeric drumDensity', () => {
    const bad = encodeURIComponent(btoa(JSON.stringify({ ...PARAMS, drumDensity: 'loud' })));
    expect(decodeShareParams(bad)).toBeNull();
  });

  it('round-trips a full AmbientParams object', () => {
    const encoded = encodeShareParams(PARAMS);
    expect(decodeShareParams(encoded)).toEqual(PARAMS);
  });

  it('rejects garbage input instead of throwing', () => {
    expect(decodeShareParams('not-valid-base64!!!')).toBeNull();
    expect(decodeShareParams(encodeURIComponent(btoa('null')))).toBeNull();
    expect(decodeShareParams(encodeURIComponent(btoa('42')))).toBeNull();
  });

  it('rejects an object missing required fields', () => {
    const incomplete = { tempo: 70, scaleMode: 'major' };
    const encoded = encodeURIComponent(btoa(JSON.stringify(incomplete)));
    expect(decodeShareParams(encoded)).toBeNull();
  });

  it('rejects an invalid scaleMode value', () => {
    const bad = { ...PARAMS, scaleMode: 'blues' };
    const encoded = encodeURIComponent(btoa(JSON.stringify(bad)));
    expect(decodeShareParams(encoded)).toBeNull();
  });

  it('rejects non-finite numeric fields (NaN/Infinity smuggled through JSON-like input)', () => {
    // JSON.parse can't produce NaN/Infinity from valid JSON, but a hand-crafted
    // payload with a string in a numeric field should still be rejected.
    const bad = { ...PARAMS, tempo: 'fast' };
    const encoded = encodeURIComponent(btoa(JSON.stringify(bad)));
    expect(decodeShareParams(encoded)).toBeNull();
  });
});

describe('buildShareUrl / readShareParamsFromLocation', () => {
  beforeEach(() => {
    window.history.replaceState({}, '', '/');
  });

  it('builds a URL whose query round-trips back to the same params', () => {
    const url = buildShareUrl(PARAMS);
    const parsed = new URL(url);
    window.history.replaceState({}, '', parsed.pathname + parsed.search);
    expect(readShareParamsFromLocation()).toEqual(PARAMS);
  });

  it('returns null when there is no sound param in the URL', () => {
    window.history.replaceState({}, '', '/');
    expect(readShareParamsFromLocation()).toBeNull();
  });

  it('strips any pre-existing query params when building a share URL', () => {
    window.history.replaceState({}, '', '/?foo=bar&baz=qux');
    const url = buildShareUrl(PARAMS);
    const parsed = new URL(url);
    expect(parsed.searchParams.get('foo')).toBeNull();
    expect(parsed.searchParams.get('baz')).toBeNull();
    expect(parsed.searchParams.has('sound')).toBe(true);
  });
});
