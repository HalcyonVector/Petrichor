import { useEffect, useState } from 'react';
import type { WeatherSnapshot } from '../types';

const REFRESH_MS = 10 * 60 * 1000;
/** After a failed fetch, retry sooner than the normal refresh: 30s, 60s, 120s... capped at REFRESH_MS. */
export function retryDelayMs(consecutiveFailures: number): number {
  return Math.min(REFRESH_MS, 30_000 * 2 ** Math.max(0, consecutiveFailures - 1));
}

/** 'offline' means the last attempt failed and there's no earlier reading to fall back on. */
export type WeatherStatus = 'loading' | 'live' | 'offline' | 'simulated';

export interface LocationOverride {
  lat: number;
  lon: number;
}

interface WeatherApiResponse {
  temperatureC: number;
  precipitationMm: number;
  cloudCoverPct: number;
  windSpeedKmh: number;
  weatherCode: number;
  isDay: boolean;
  source: 'client' | 'ip' | 'default';
  utcOffsetSeconds?: number;
  lat?: number;
}

function getPosition(): Promise<GeolocationPosition | null> {
  if (!('geolocation' in navigator)) return Promise.resolve(null);
  return new Promise((resolve) => {
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve(pos),
      () => resolve(null),
      { timeout: 15000, maximumAge: 10 * 60 * 1000 },
    );
  });
}

/**
 * Fetches live weather through the backend proxy. Resolution order:
 * 1. `locationOverride`, when set (the location picker) — always used, browser
 *    geolocation is skipped entirely.
 * 2. Browser geolocation, when granted.
 * 3. The server's own IP-based / default-location fallback.
 * Pass a non-null `overrideWeather` to freeze/simulate a weather state (the
 * UI's "simulate" mode) instead of polling either of the above.
 */
export function useWeather(overrideWeather: WeatherSnapshot | null, locationOverride?: LocationOverride | null) {
  const [weather, setWeather] = useState<WeatherSnapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (overrideWeather) return undefined;
    let cancelled = false;
    let failures = 0;
    let timer: ReturnType<typeof setTimeout> | undefined;

    async function fetchWeather() {
      setLoading(true);
      try {
        let query = '';
        let usedGeolocation = false;

        if (locationOverride) {
          query = `?lat=${locationOverride.lat}&lon=${locationOverride.lon}`;
        } else {
          const pos = await getPosition();
          if (pos) {
            query = `?lat=${pos.coords.latitude}&lon=${pos.coords.longitude}`;
            usedGeolocation = true;
          }
        }

        const res = await fetch(`/api/weather${query}`);
        if (!res.ok) throw new Error(`weather API responded ${res.status}`);
        const data: WeatherApiResponse = await res.json();
        if (cancelled) return;
        setWeather({
          temperatureC: data.temperatureC,
          precipitationMm: data.precipitationMm,
          cloudCoverPct: data.cloudCoverPct,
          windSpeedKmh: data.windSpeedKmh,
          weatherCode: data.weatherCode,
          isDay: data.isDay,
          source: locationOverride || usedGeolocation ? 'client' : data.source,
          utcOffsetSeconds: data.utcOffsetSeconds,
          lat: typeof data.lat === 'number' ? data.lat : undefined,
        });
        setError(null);
        failures = 0;
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : 'weather fetch failed');
        failures++;
      } finally {
        if (!cancelled) {
          setLoading(false);
          timer = setTimeout(fetchWeather, failures > 0 ? retryDelayMs(failures) : REFRESH_MS);
        }
      }
    }

    fetchWeather();
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [overrideWeather, locationOverride?.lat, locationOverride?.lon]);

  const status: WeatherStatus = overrideWeather
    ? 'simulated'
    : weather
      ? 'live'
      : error && !loading
        ? 'offline'
        : 'loading';

  return {
    weather: overrideWeather ?? weather,
    loading: overrideWeather ? false : loading,
    error,
    status,
  };
}
