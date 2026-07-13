import { useEffect, useState } from 'react';
import type { WeatherSnapshot } from '../types';

const REFRESH_MS = 10 * 60 * 1000;

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
}

function getPosition(): Promise<GeolocationPosition | null> {
  if (!('geolocation' in navigator)) return Promise.resolve(null);
  return new Promise((resolve) => {
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve(pos),
      () => resolve(null),
      { timeout: 5000, maximumAge: 10 * 60 * 1000 },
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
        });
        setError(null);
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : 'weather fetch failed');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    fetchWeather();
    const id = setInterval(fetchWeather, REFRESH_MS);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [overrideWeather, locationOverride?.lat, locationOverride?.lon]);

  return {
    weather: overrideWeather ?? weather,
    loading: overrideWeather ? false : loading,
    error,
  };
}
