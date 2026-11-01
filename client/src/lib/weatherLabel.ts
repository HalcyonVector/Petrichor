import type { WeatherSnapshot } from '../types';
import { isSnowing, isThunderstorm } from './weatherCode';

/** Short, human weather word for the "now playing" meta line: "LIGHT RAIN", not "1.20mm". */
export function weatherLabel(weather: WeatherSnapshot | null, offline = false): string {
  if (!weather) return offline ? 'WEATHER OFFLINE' : 'LOADING';
  const { precipitationMm, cloudCoverPct, weatherCode } = weather;

  if (isThunderstorm(weatherCode)) return 'THUNDERSTORM';
  if (isSnowing(weatherCode)) return 'SNOW';
  if (precipitationMm > 2) return 'HEAVY RAIN';
  if (precipitationMm > 0.1) return 'LIGHT RAIN';
  // Matches the sky, which starts drawing rain (and ripples) from 0.05 mm/h.
  if (precipitationMm > 0.05) return 'DRIZZLE';
  if (cloudCoverPct > 70) return 'OVERCAST';
  if (cloudCoverPct > 30) return 'PARTLY CLOUDY';
  return 'CLEAR';
}
