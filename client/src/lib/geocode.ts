export interface CityResult {
  name: string;
  country: string;
  admin1?: string;
  latitude: number;
  longitude: number;
}

/**
 * City name search against Open-Meteo's free, keyless geocoding API,
 * called directly from the client rather than proxied through the backend.
 * Unlike live weather (which carries your actual coordinates), this is just
 * a public gazetteer lookup by name, no personal location data involved.
 */
export async function searchCities(query: string): Promise<CityResult[]> {
  const trimmed = query.trim();
  if (!trimmed) return [];

  const url = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(trimmed)}&count=5&language=en&format=json`;
  const res = await fetch(url, { signal: AbortSignal.timeout(5000) });
  if (!res.ok) throw new Error(`geocoding API responded ${res.status}`);
  const data = await res.json();
  if (!Array.isArray(data.results)) return [];

  return data.results.map((r: Record<string, unknown>) => ({
    name: String(r.name),
    country: typeof r.country === 'string' ? r.country : '',
    admin1: typeof r.admin1 === 'string' ? r.admin1 : undefined,
    latitude: Number(r.latitude),
    longitude: Number(r.longitude),
  }));
}

/** "Kyoto, Kyoto, Japan" style label for a search result or a saved location. */
export function formatCityLabel(city: CityResult): string {
  return [city.name, city.admin1, city.country].filter(Boolean).join(', ');
}
