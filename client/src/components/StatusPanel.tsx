import type { AmbientParams, LiveInputs } from '../types';

interface StatusPanelProps {
  inputs: LiveInputs;
  params: AmbientParams;
  isManual: boolean;
}

function fmt(n: number, digits = 1) {
  return n.toFixed(digits);
}

export function StatusPanel({ inputs, params, isManual }: StatusPanelProps) {
  const { hour, weather, activity } = inputs;
  const totalMinutes = Math.round(hour * 60) % (24 * 60);
  const h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;

  return (
    <div className="status-panel">
      <section>
        <h3>Inputs {isManual && <span className="badge">preset override</span>}</h3>
        <dl>
          <dt>Local time</dt>
          <dd>{String(h).padStart(2, '0')}:{String(m).padStart(2, '0')}</dd>
          <dt>Weather</dt>
          <dd>
            {weather
              ? `${fmt(weather.temperatureC)}°C, ${fmt(weather.precipitationMm, 2)}mm rain, ${fmt(weather.cloudCoverPct, 0)}% cloud, ${fmt(weather.windSpeedKmh, 0)}km/h wind (${weather.source})`
              : 'loading…'}
          </dd>
          <dt>Activity</dt>
          <dd>{fmt(activity.activity * 100, 0)}% · typing {fmt(activity.typingRate * 100, 0)}%{activity.idle ? ' · idle tab' : ''}</dd>
        </dl>
      </section>
      <section>
        <h3>Resolved sound</h3>
        <dl>
          <dt>Tempo</dt>
          <dd>{fmt(params.tempo, 0)} BPM</dd>
          <dt>Scale</dt>
          <dd>{params.scaleMode} (root {params.rootNote}, octave {params.octaveShift >= 0 ? '+' : ''}{params.octaveShift})</dd>
          <dt>Brightness</dt>
          <dd>{fmt(params.brightness * 100, 0)}%</dd>
          <dt>Pad voices</dt>
          <dd>{params.padVoices}</dd>
          <dt>Arp density</dt>
          <dd>{fmt(params.arpDensity * 100, 0)}%</dd>
          <dt>Hihat density</dt>
          <dd>{fmt(params.hihatDensity * 100, 0)}%</dd>
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
