import type { AmbientParams, LiveInputs } from '../types';
import { formatClock } from '../lib/formatTime';
import { keyName } from '../audio/musicTheory';
import { moonIllumination, moonPhaseName } from '../lib/moon';
import { seasonName } from '../lib/seasons';

interface StatusPanelProps {
  inputs: LiveInputs;
  weatherOffline?: boolean;
  params: AmbientParams;
  isManual: boolean;
}

function fmt(n: number, digits = 1) {
  return n.toFixed(digits);
}

export function StatusPanel({ inputs, weatherOffline = false, params, isManual }: StatusPanelProps) {
  const { hour, weather, activity } = inputs;

  return (
    <div className="status-panel">
      <section className="hud-card">
        <h3>Inputs {isManual && <span className="badge">preset override</span>}</h3>
        <dl>
          <dt>Local time</dt>
          <dd>{formatClock(hour)}</dd>
          <dt>Weather</dt>
          <dd>
            {weather
              ? `${fmt(weather.temperatureC)}°C, ${fmt(weather.precipitationMm, 2)}mm rain, ${fmt(weather.cloudCoverPct, 0)}% cloud, ${fmt(weather.windSpeedKmh, 0)}km/h wind (${weather.source})`
              : weatherOffline
                ? 'unavailable right now, retrying. Playing with typical mild weather meanwhile.'
                : 'loading…'}
          </dd>
          {inputs.dayOfYear !== undefined && (
            <>
              <dt>Season</dt>
              <dd>
                {seasonName(inputs.dayOfYear, weather?.lat)}
                {weather?.lat !== undefined && weather.lat < 0 ? ' (southern hemisphere)' : ''}
              </dd>
            </>
          )}
          {inputs.moonPhase !== undefined && (
            <>
              <dt>Moon</dt>
              <dd>
                {moonPhaseName(inputs.moonPhase)} · {fmt(moonIllumination(inputs.moonPhase) * 100, 0)}% lit
              </dd>
            </>
          )}
          <dt>Activity</dt>
          <dd>{fmt(activity.activity * 100, 0)}% · typing {fmt(activity.typingRate * 100, 0)}%{activity.idle ? ' · idle tab' : ''}</dd>
        </dl>
      </section>
      <section className="hud-card">
        <h3>Resolved sound</h3>
        <dl>
          <dt>Tempo</dt>
          <dd>{fmt(params.tempo, 0)} BPM</dd>
          <dt>Scale</dt>
          <dd>{keyName(params.rootNote)} {params.scaleMode} (octave {params.octaveShift >= 0 ? '+' : ''}{params.octaveShift})</dd>
          <dt>Brightness</dt>
          <dd>{fmt(params.brightness * 100, 0)}%</dd>
          <dt>Pad voices</dt>
          <dd>{params.padVoices}</dd>
          <dt>Arp density</dt>
          <dd>{fmt(params.arpDensity * 100, 0)}%</dd>
          <dt>Hihat density</dt>
          <dd>{fmt(params.hihatDensity * 100, 0)}%</dd>
          <dt>Drum groove</dt>
          <dd>{params.drumDensity === undefined ? 'default' : `${fmt(params.drumDensity * 100, 0)}%`}</dd>
          <dt>Nature</dt>
          <dd>
            {[
              params.crickets ? `crickets ${fmt(params.crickets * 100, 0)}%` : null,
              params.birds ? `birds ${fmt(params.birds * 100, 0)}%` : null,
              params.snowShimmer ? `snow ${fmt(params.snowShimmer * 100, 0)}%` : null,
              params.windModulation > 0.12 ? `wind gusts ${fmt(params.windModulation * 100, 0)}%` : null,
            ]
              .filter(Boolean)
              .join(' · ') || 'quiet'}
          </dd>
          <dt>Rain layer</dt>
          <dd>{fmt(params.rainAmount * 100, 0)}%</dd>
          <dt>Wind modulation</dt>
          <dd>{fmt(params.windModulation * 100, 0)}%</dd>
          <dt>Reverb</dt>
          <dd>{fmt(params.reverbWet * 100, 0)}%</dd>
        </dl>
      </section>
    </div>
  );
}
