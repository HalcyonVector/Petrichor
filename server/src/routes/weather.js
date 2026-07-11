import { Router } from 'express';
import { geolocateRequest } from '../lib/geolocateIp.js';

const router = Router();

const DEFAULT_LAT = Number(process.env.DEFAULT_LAT ?? 51.5074); // London
const DEFAULT_LON = Number(process.env.DEFAULT_LON ?? -0.1278);

const CURRENT_FIELDS = [
  'temperature_2m',
  'precipitation',
  'rain',
  'cloud_cover',
  'wind_speed_10m',
  'weather_code',
  'is_day',
].join(',');

// Simple in-memory cache so bursty client polling doesn't hammer Open-Meteo.
const cache = new Map(); // key: "lat,lon" -> { expires, payload }
const CACHE_MS = 5 * 60 * 1000;

router.get('/', async (req, res) => {
  try {
    let lat = Number(req.query.lat);
    let lon = Number(req.query.lon);
    let source = 'client';

    if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
      const geo = await geolocateRequest(req);
      if (geo) {
        lat = geo.lat;
        lon = geo.lon;
        source = 'ip';
      } else {
        lat = DEFAULT_LAT;
        lon = DEFAULT_LON;
        source = 'default';
      }
    }

    const cacheKey = `${lat.toFixed(2)},${lon.toFixed(2)}`;
    const cached = cache.get(cacheKey);
    if (cached && cached.expires > Date.now()) {
      return res.json({ ...cached.payload, source, cached: true });
    }

    const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=${CURRENT_FIELDS}&timezone=auto`;
    const response = await fetch(url, { signal: AbortSignal.timeout(5000) });
    if (!response.ok) throw new Error(`Open-Meteo responded ${response.status}`);
    const data = await response.json();

    const payload = {
      lat,
      lon,
      temperatureC: data.current.temperature_2m,
      precipitationMm: data.current.precipitation,
      rainMm: data.current.rain,
      cloudCoverPct: data.current.cloud_cover,
      windSpeedKmh: data.current.wind_speed_10m,
      weatherCode: data.current.weather_code,
      isDay: Boolean(data.current.is_day),
      fetchedAt: data.current.time,
    };

    cache.set(cacheKey, { expires: Date.now() + CACHE_MS, payload });
    res.json({ ...payload, source, cached: false });
  } catch (err) {
    console.error('[weather] failed:', err.message);
    res.status(502).json({ error: 'weather_unavailable', message: err.message });
  }
});

export default router;
