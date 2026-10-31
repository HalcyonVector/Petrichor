import { describe, it, expect } from 'vitest';
import { applyFocusMode } from './focusMode';
import type { AmbientParams } from '../types';

const BUSY: AmbientParams = {
  tempo: 90,
  scaleMode: 'lydian',
  rootNote: 50,
  octaveShift: 1,
  brightness: 0.9,
  padVoices: 5,
  arpDensity: 0.85,
  hihatDensity: 0.4,
  drumDensity: 0.7,
  rainAmount: 0.5,
  windModulation: 0.3,
  warmth: 0.6,
  reverbWet: 0.3,
};

describe('applyFocusMode', () => {
  it('holds the arp at a fixed low density regardless of activity', () => {
    expect(applyFocusMode(BUSY).arpDensity).toBe(0.08);
    expect(applyFocusMode({ ...BUSY, arpDensity: 0.06 }).arpDensity).toBe(0.08);
  });

  it('thins percussion and softens brightness', () => {
    const focused = applyFocusMode(BUSY);
    expect(focused.hihatDensity).toBeLessThan(BUSY.hihatDensity);
    expect(focused.drumDensity!).toBeLessThan(BUSY.drumDensity!);
    expect(focused.brightness).toBeLessThan(BUSY.brightness);
  });

  it('leaves key, mode, tempo and weather textures alone', () => {
    const focused = applyFocusMode(BUSY);
    expect(focused.rootNote).toBe(BUSY.rootNote);
    expect(focused.scaleMode).toBe(BUSY.scaleMode);
    expect(focused.tempo).toBe(BUSY.tempo);
    expect(focused.rainAmount).toBe(BUSY.rainAmount);
  });

  it('caps drums for older params that have no drumDensity', () => {
    const { drumDensity: _omit, ...legacy } = BUSY;
    expect(applyFocusMode(legacy).drumDensity).toBe(0.12);
  });

  it('does not mutate its input', () => {
    const copy = { ...BUSY };
    applyFocusMode(BUSY);
    expect(BUSY).toEqual(copy);
  });
});
