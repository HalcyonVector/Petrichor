import { describe, it, expect } from 'vitest';
import { isPrivateIp } from '../src/lib/geolocateIp.js';

describe('isPrivateIp', () => {
  it('flags loopback and private ranges', () => {
    expect(isPrivateIp('127.0.0.1')).toBe(true);
    expect(isPrivateIp('10.0.0.5')).toBe(true);
    expect(isPrivateIp('192.168.1.10')).toBe(true);
    expect(isPrivateIp('172.16.0.1')).toBe(true);
    expect(isPrivateIp('172.31.255.255')).toBe(true);
    expect(isPrivateIp('::1')).toBe(true);
  });

  it('treats missing IPs as private (fail safe)', () => {
    expect(isPrivateIp(undefined)).toBe(true);
    expect(isPrivateIp('')).toBe(true);
  });

  it('does not flag public-looking IPs', () => {
    expect(isPrivateIp('8.8.8.8')).toBe(false);
    expect(isPrivateIp('203.0.113.42')).toBe(false);
    expect(isPrivateIp('172.32.0.1')).toBe(false); // just outside the 172.16-31 private block
  });
});
