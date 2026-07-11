import { useEffect, useState } from 'react';
import type { WeatherSnapshot } from '../types';

const REFRESH_MS = 10 * 60 * 1000;

interface WeatherApiResponse {
  temperatureC: number;
  precipitationMm: number;
  cloudCoverPct: number;
  windSpeedKmh: number;
  weatherCode: number;
  isDay: boolean;
  source: 'client' | 'ip' | 'default';
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
 * Fetches live weather through the backend proxy, using browser geolocation
 * when granted and letting the server fall back to IP-based location
 * otherwise. Pass a non-null override to freeze/simulate a weather state
 * (used by the UI's "simulate" mode) instead of polling.
 */
export function useWeather(overrideWeather: WeatherSnapshot | null) {
  const [weather, setWeather] = useState<WeatherSnapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (overrideWeather) return;
    let cancelled = false;

    async function fetchWeather() {
      setLoading(true);
      try {
        const pos = await getPosition();
        const query = pos ? `?lat=${pos.coords.latitude}&lon=${pos.coords.longitude}` : '';
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
          source: pos ? 'client' : data.source,
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
  }, [overrideWeather]);

  return {
    weather: overrideWeather ?? weather,
    loading: overrideWeather ? false : loading,
    error,
  };
}
