import { describe, it, expect, afterEach, vi } from 'vitest';
import { formatCityLabel, searchCities } from './geocode';

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('searchCities', () => {
  it('returns an empty array for a blank query without fetching', async () => {
    const fetchSpy = vi.fn();
    vi.stubGlobal('fetch', fetchSpy);
    expect(await searchCities('   ')).toEqual([]);
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('maps a well-formed response into CityResult objects', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => ({
        ok: true,
        json: async () => ({
          results: [
            { name: 'Kyoto', country: 'Japan', admin1: 'Kyoto Prefecture', latitude: 35.0116, longitude: 135.7681 },
          ],
        }),
      })),
    );

    const results = await searchCities('Kyoto');
    expect(results).toEqual([
      { name: 'Kyoto', country: 'Japan', admin1: 'Kyoto Prefecture', latitude: 35.0116, longitude: 135.7681 },
    ]);
  });

  it('returns an empty array when the API has no matches (no results key at all)', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => ({ ok: true, json: async () => ({}) })),
    );
    expect(await searchCities('asdkjfhaskjdfh')).toEqual([]);
  });

  it('throws when the upstream API fails, for the caller to handle', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => ({ ok: false, status: 500 })));
    await expect(searchCities('Kyoto')).rejects.toThrow();
  });
});

describe('formatCityLabel', () => {
  it('joins name, admin1, and country', () => {
    expect(formatCityLabel({ name: 'Kyoto', admin1: 'Kyoto Prefecture', country: 'Japan', latitude: 0, longitude: 0 })).toBe(
      'Kyoto, Kyoto Prefecture, Japan',
    );
  });

  it('skips a missing admin1', () => {
    expect(formatCityLabel({ name: 'Reykjavik', country: 'Iceland', latitude: 0, longitude: 0 })).toBe('Reykjavik, Iceland');
  });
});
