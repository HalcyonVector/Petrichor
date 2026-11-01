export type Season = 'Winter' | 'Spring' | 'Summer' | 'Autumn';

/**
 * How wintry the date is, 0..1: 1 in midwinter (mid-January in the
 * northern hemisphere, mid-July in the southern), 0 in midsummer, a smooth
 * curve in between. Seasons fade toward a neutral 0.5 near the equator,
 * where they hardly exist. Unknown latitude is treated as northern.
 */
export function winterness(dayOfYear: number, latitude?: number): number {
  const north = (Math.cos((2 * Math.PI * (dayOfYear - 14)) / 365.25) + 1) / 2;
  if (latitude === undefined || !Number.isFinite(latitude)) return north;
  const hemisphere = latitude < 0 ? 1 - north : north;
  const strength = Math.min(1, Math.abs(latitude) / 23.5);
  return 0.5 + (hemisphere - 0.5) * strength;
}

/** Meteorological season for the date (Dec-Feb winter in the north), flipped for the southern hemisphere. */
export function seasonName(dayOfYear: number, latitude?: number): Season {
  const northern: Season =
    dayOfYear >= 334 || dayOfYear < 59 ? 'Winter' : dayOfYear < 151 ? 'Spring' : dayOfYear < 243 ? 'Summer' : 'Autumn';
  if (latitude === undefined || latitude >= 0) return northern;
  return ({ Winter: 'Summer', Spring: 'Autumn', Summer: 'Winter', Autumn: 'Spring' } as const)[northern];
}
