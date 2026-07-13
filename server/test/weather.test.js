import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app.js';

function mockOpenMeteoResponse(overrides = {}) {
  return {
    ok: true,
    status: 200,
    json: async () => ({
      current: {
        temperature_2m: 18.5,
        precipitation: 0.2,
        rain: 0.2,
        cloud_cover: 40,
        wind_speed_10m: 12,
        weather_code: 3,
        is_day: 1,
        time: '2026-01-01T12:00',
        ...overrides,
      },
      utc_offset_seconds: 32400, // UTC+9, e.g. Japan
    }),
  };
}

describe('GET /api/weather', () => {
  const app = createApp();

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('uses provided coordinates and normalizes the response shape', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => mockOpenMeteoResponse()));

    const res = await request(app).get('/api/weather?lat=10.1&lon=20.2');
    expect(res.status).toBe(200);
    expect(res.body.source).toBe('client');
    expect(res.body.temperatureC).toBe(18.5);
    expect(res.body.precipitationMm).toBe(0.2);
    expect(res.body.cloudCoverPct).toBe(40);
    expect(res.body.windSpeedKmh).toBe(12);
    expect(res.body.isDay).toBe(true);
    expect(res.body.utcOffsetSeconds).toBe(32400);
  });

  it('falls back to a default location when coordinates are omitted (test client is loopback)', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => mockOpenMeteoResponse()));

    const res = await request(app).get('/api/weather');
    expect(res.status).toBe(200);
    expect(res.body.source).toBe('default');
  });

  it('returns 502 when the upstream weather API fails', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => ({ ok: false, status: 500 })));

    const res = await request(app).get('/api/weather?lat=33.3&lon=44.4');
    expect(res.status).toBe(502);
    expect(res.body.error).toBe('weather_unavailable');
  });
});
