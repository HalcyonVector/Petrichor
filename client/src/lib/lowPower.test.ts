import { describe, it, expect } from 'vitest';
import { detectLowPowerDevice, resolveLowPower } from './lowPower';

describe('detectLowPowerDevice', () => {
  it('flags data saver, very weak hardware, or modest cores and memory together', () => {
    expect(detectLowPowerDevice({ hardwareConcurrency: 16, connection: { saveData: true } })).toBe(true);
    expect(detectLowPowerDevice({ hardwareConcurrency: 2 })).toBe(true);
    expect(detectLowPowerDevice({ hardwareConcurrency: 8, deviceMemory: 2 })).toBe(true);
    expect(detectLowPowerDevice({ hardwareConcurrency: 4, deviceMemory: 4 })).toBe(true);
  });

  it('leaves capable, mixed or unknown devices alone', () => {
    expect(detectLowPowerDevice({ hardwareConcurrency: 8, deviceMemory: 8 })).toBe(false);
    expect(detectLowPowerDevice({ hardwareConcurrency: 4, deviceMemory: 8 })).toBe(false);
    expect(detectLowPowerDevice({ hardwareConcurrency: 4 })).toBe(false);
    expect(detectLowPowerDevice({})).toBe(false);
  });
});

describe('resolveLowPower', () => {
  it('follows the setting, with auto deferring to detection', () => {
    expect(resolveLowPower('on', false)).toBe(true);
    expect(resolveLowPower('off', true)).toBe(false);
    expect(resolveLowPower('auto', true)).toBe(true);
    expect(resolveLowPower('auto', false)).toBe(false);
  });
});
