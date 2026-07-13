import { useState } from 'react';
import { searchCities, formatCityLabel, type CityResult } from '../lib/geocode';

interface LocationPickerProps {
  locationLabel: string | null;
  onSelect: (lat: number, lon: number, label: string) => void;
  onClear: () => void;
}

/**
 * Lets you deliberately listen to weather somewhere other than wherever you
 * are, e.g. "what does 3am in Reykjavik sound like right now." Search hits
 * Open-Meteo's geocoding API directly from the client (a public gazetteer
 * lookup, no personal location data involved, unlike live weather fetches).
 */
export function LocationPicker({ locationLabel, onSelect, onClear }: LocationPickerProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<CityResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSearch = async () => {
    const trimmed = query.trim();
    if (!trimmed) return;
    setLoading(true);
    setError(null);
    try {
      const found = await searchCities(trimmed);
      setResults(found);
      if (found.length === 0) setError('No matches.');
    } catch {
      setError('Search failed. Try again.');
    } finally {
      setLoading(false);
    }
  };

  const handlePick = (city: CityResult) => {
    onSelect(city.latitude, city.longitude, formatCityLabel(city));
    setResults([]);
    setQuery('');
    setError(null);
  };

  return (
    <div className="hud-card">
      <h3>Location</h3>

      {locationLabel ? (
        <div className="location-active">
          <span>{locationLabel}</span>
          <button className="ghost" onClick={onClear}>
            Use my location
          </button>
        </div>
      ) : (
        <p className="location-hint">Using your own location.</p>
      )}

      <div className="preset-save-row">
        <input
          type="text"
          placeholder="Search a city…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && query.trim()) handleSearch();
          }}
        />
        <button onClick={handleSearch} disabled={!query.trim() || loading}>
          {loading ? '…' : 'Search'}
        </button>
      </div>

      {error && <div className="location-error">{error}</div>}

      {results.length > 0 && (
        <ul className="location-results">
          {results.map((city, i) => (
            <li key={i}>
              <button className="ghost location-result-btn" onClick={() => handlePick(city)}>
                {formatCityLabel(city)}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
