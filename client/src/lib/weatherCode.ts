/**
 * Open-Meteo reports current conditions as a WMO weather code. Only the
 * bands relevant to the sky's visuals are classified here: snow (so
 * precipitation renders as snowflakes instead of rain) and thunderstorms
 * (so lightning shows up at all). Everything else falls through to the
 * existing rain/cloud handling driven by precipitation and cloud cover.
 */

const SNOW_CODES = new Set([71, 73, 75, 77, 85, 86]);
const THUNDERSTORM_CODES = new Set([95, 96, 99]);

export function isSnowing(weatherCode: number | undefined): boolean {
  return weatherCode !== undefined && SNOW_CODES.has(weatherCode);
}

export function isThunderstorm(weatherCode: number | undefined): boolean {
  return weatherCode !== undefined && THUNDERSTORM_CODES.has(weatherCode);
}
