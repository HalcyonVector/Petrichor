import { describe, it, expect } from 'vitest';
import { nextLightningDelay } from './useLightning';

describe('nextLightningDelay', () => {
  it('always falls within the 4s-13s strike interval', () => {
    for (let i = 0; i < 200; i++) {
      const delay = nextLightningDelay();
      expect(delay).toBeGreaterThanOrEqual(4000);
      expect(delay).toBeLessThanOrEqual(13000);
    }
  });
});
