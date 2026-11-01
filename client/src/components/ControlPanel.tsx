import type { CSSProperties } from 'react';
import type { MixLayer } from '../audio/AudioEngine';
import type { Preset } from '../types';
import type { PresetSource } from '../lib/presetsStore';
import { LocationPicker } from './LocationPicker';
import { SLEEP_TIMER_OPTIONS, formatCountdown } from '../lib/sleepTimer';
import { IconDownload, IconRecord, IconStopRecord } from './trayIcons';

export interface SimState {
  hour: number;
  precipitationMm: number;
  cloudCoverPct: number;
  windSpeedKmh: number;
  temperatureC: number;
  activity: number;
  weatherCode: number;
}

// Representative WMO codes for each type, matched to the client/src/lib/weatherCode.ts classifier.
const WEATHER_TYPES: { key: string; label: string; code: number }[] = [
  { key: 'clear', label: 'Clear', code: 0 },
  { key: 'rain', label: 'Rain', code: 63 },
  { key: 'snow', label: 'Snow', code: 73 },
  { key: 'storm', label: 'Storm', code: 95 },
  { key: 'fog', label: 'Fog', code: 45 },
];

const MIX_LAYERS: { key: MixLayer; label: string }[] = [
  { key: 'pad', label: 'Pad' },
  { key: 'bass', label: 'Bass' },
  { key: 'arp', label: 'Arp' },
  { key: 'melody', label: 'Melody' },
  { key: 'hihat', label: 'Hihat' },
  { key: 'drums', label: 'Drums' },
  { key: 'rain', label: 'Rain' },
  { key: 'nature', label: 'Nature' },
];

export type StudioSection = 'sound' | 'source' | 'presets' | 'record';

interface ControlPanelProps {
  /** Which Studio tab is showing. */
  section: StudioSection;
  simulate: boolean;
  onToggleSimulate: (v: boolean) => void;
  sim: SimState;
  onSimChange: (patch: Partial<SimState>) => void;
  mix: Record<MixLayer, number>;
  onMixChange: (layer: MixLayer, value: number) => void;
  presets: Preset[];
  presetsSource: PresetSource;
  presetName: string;
  onPresetNameChange: (v: string) => void;
  onSavePreset: () => void;
  onLoadPreset: (name: string) => void;
  onDeletePreset: (name: string) => void;
  manualActive: boolean;
  onClearManual: () => void;
  onCopyShareLink: () => void;
  linkCopied: boolean;
  locationLabel: string | null;
  onSelectLocation: (lat: number, lon: number, label: string) => void;
  onClearLocation: () => void;
  started: boolean;
  focus: boolean;
  onFocusChange: (focus: boolean) => void;
  sleepEndsAt: number | null;
  sleepMinutes: number | null;
  sleepRemainingMs: number;
  fading: boolean;
  onSetSleep: (minutes: number | null) => void;
  isRecording: boolean;
  /** Elapsed time of the running recording, e.g. "1:05". */
  recordingElapsed: string | null;
  recordingUrl: string | null;
  recordingError: string | null;
  onStartRecording: () => void;
  onStopRecording: () => void;
}

function fillVar(value: number, min: number, max: number): CSSProperties {
  return { '--val': (value - min) / (max - min) } as CSSProperties;
}

const ICON_PROPS = {
  width: 14,
  height: 14,
  viewBox: '0 0 16 16',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.5,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
  'aria-hidden': true,
};

function IconLink() {
  return (
    <svg {...ICON_PROPS}>
      <path d="M6.5 9.5 9.5 6.5" />
      <path d="M7 4.2 8.3 2.9a2.6 2.6 0 0 1 3.7 3.7L10.7 7.9M9 11.8l-1.3 1.3a2.6 2.6 0 0 1-3.7-3.7L5.3 8.1" />
    </svg>
  );
}

function IconCheck() {
  return (
    <svg {...ICON_PROPS}>
      <path d="M3.2 8.4 6.3 11.5 12.8 5" />
    </svg>
  );
}

function IconPlay() {
  return (
    <svg {...ICON_PROPS} fill="currentColor" stroke="none">
      <path d="M4.5 3.3v9.4a.6.6 0 0 0 .93.5l7.3-4.7a.6.6 0 0 0 0-1l-7.3-4.7a.6.6 0 0 0-.93.5Z" />
    </svg>
  );
}

function IconTrash() {
  return (
    <svg {...ICON_PROPS}>
      <path d="M3.3 4.7h9.4" />
      <path d="M6.2 4.7V3.3h3.6v1.4M6.7 7.3v3.6M9.3 7.3v3.6" />
      <path d="M4.4 4.7 5 12.1c.05.6.55 1 1.15 1h3.7c.6 0 1.1-.4 1.15-1l.6-7.4" />
    </svg>
  );
}

function IconDroplet() {
  return (
    <svg {...ICON_PROPS} width={22} height={22}>
      <path d="M8 2C8 2 3.3 7.6 3.3 10.4a4.7 4.7 0 0 0 9.4 0C12.7 7.6 8 2 8 2Z" />
    </svg>
  );
}

/** The "Studio" drawer: everything that shapes the sound but isn't part of the primary now-playing tray. */
export function ControlPanel({
  section,
  simulate, onToggleSimulate, sim, onSimChange,
  mix, onMixChange,
  presets, presetsSource, presetName, onPresetNameChange, onSavePreset, onLoadPreset, onDeletePreset,
  manualActive, onClearManual,
  onCopyShareLink, linkCopied,
  locationLabel, onSelectLocation, onClearLocation,
  started, focus, onFocusChange, sleepEndsAt, sleepMinutes, sleepRemainingMs, fading, onSetSleep,
  isRecording, recordingElapsed, recordingUrl, recordingError, onStartRecording, onStopRecording,
}: ControlPanelProps) {
  const segClass = (active: boolean) => (active ? 'segmented-btn segmented-btn--active' : 'segmented-btn');
  return (
    <div className="control-panel">
      {section === 'sound' && (
        <div className="hud-card">
          <h3>Session</h3>
          <div className="session-row">
            <span className="session-label" id="focus-label">Focus mode</span>
            <div className="segmented" role="group" aria-labelledby="focus-label">
              <button type="button" className={segClass(!focus)} aria-pressed={!focus} onClick={() => onFocusChange(false)}>
                Off
              </button>
              <button type="button" className={segClass(focus)} aria-pressed={focus} onClick={() => onFocusChange(true)}>
                On
              </button>
            </div>
            <p className="session-hint">
              Calmer chords, a quiet arp that ignores your typing, soft drums and no thunder. Still follows the
              weather and time.
            </p>
          </div>

          <div className="session-row">
            <span className="session-label" id="sleep-label">Sleep timer</span>
            <div className="segmented sleep-options" role="group" aria-labelledby="sleep-label">
              <button
                type="button"
                className={segClass(sleepEndsAt === null && !fading)}
                aria-pressed={sleepEndsAt === null && !fading}
                disabled={!started || fading}
                onClick={() => onSetSleep(null)}
              >
                Off
              </button>
              {SLEEP_TIMER_OPTIONS.map((minutes) => (
                <button
                  key={minutes}
                  type="button"
                  className={segClass(sleepMinutes === minutes)}
                  aria-pressed={sleepMinutes === minutes}
                  disabled={!started || fading}
                  aria-label={`Sleep in ${minutes} minutes`}
                  onClick={() => onSetSleep(minutes)}
                >
                  {minutes}m
                </button>
              ))}
            </div>
            <p className="session-hint" aria-live="polite">
              {fading
                ? 'Fading out…'
                : sleepEndsAt !== null
                  ? `Fades out and stops in ${formatCountdown(sleepRemainingMs)}.`
                  : started
                    ? 'Fades the music out gently over the last 30 seconds, then stops.'
                    : 'Start playback to set a timer.'}
            </p>
          </div>
        </div>
      )}

      {section === 'source' && (
        <div className="hud-card">
          <h3>Source</h3>
          <div className="segmented">
            <button
              type="button"
              className={!simulate ? 'segmented-btn segmented-btn--active' : 'segmented-btn'}
              aria-pressed={!simulate}
              onClick={() => onToggleSimulate(false)}
            >
              Live
            </button>
            <button
              type="button"
              className={simulate ? 'segmented-btn segmented-btn--active' : 'segmented-btn'}
              aria-pressed={simulate}
              onClick={() => onToggleSimulate(true)}
            >
              Simulate
            </button>
          </div>
          {manualActive && (
            <button className="ghost preset-return" onClick={onClearManual}>
              ← back to {simulate ? 'simulate' : 'live'}
            </button>
          )}

          {simulate && (
            <div className="weather-type-row">
              {WEATHER_TYPES.map((w) => (
                <button
                  key={w.key}
                  type="button"
                  className={sim.weatherCode === w.code ? 'segmented-btn segmented-btn--active' : 'segmented-btn'}
                  aria-pressed={sim.weatherCode === w.code}
                  onClick={() => onSimChange({ weatherCode: w.code })}
                >
                  {w.label}
                </button>
              ))}
            </div>
          )}

          {simulate && (
            <div className="sim-sliders">
              <label>
                <span>Hour of day</span>
                <b>{sim.hour.toFixed(1)}</b>
                <input
                  type="range" className="hud-range" min={0} max={23.99} step={0.1} value={sim.hour}
                  style={fillVar(sim.hour, 0, 23.99)}
                  onChange={(e) => onSimChange({ hour: Number(e.target.value) })}
                />
              </label>
              <label>
                <span>Precipitation</span>
                <b>{sim.precipitationMm.toFixed(1)}mm/h</b>
                <input
                  type="range" className="hud-range" min={0} max={6} step={0.1} value={sim.precipitationMm}
                  style={fillVar(sim.precipitationMm, 0, 6)}
                  onChange={(e) => onSimChange({ precipitationMm: Number(e.target.value) })}
                />
              </label>
              <label>
                <span>Cloud cover</span>
                <b>{sim.cloudCoverPct.toFixed(0)}%</b>
                <input
                  type="range" className="hud-range" min={0} max={100} step={1} value={sim.cloudCoverPct}
                  style={fillVar(sim.cloudCoverPct, 0, 100)}
                  onChange={(e) => onSimChange({ cloudCoverPct: Number(e.target.value) })}
                />
              </label>
              <label>
                <span>Wind</span>
                <b>{sim.windSpeedKmh.toFixed(0)}km/h</b>
                <input
                  type="range" className="hud-range" min={0} max={60} step={1} value={sim.windSpeedKmh}
                  style={fillVar(sim.windSpeedKmh, 0, 60)}
                  onChange={(e) => onSimChange({ windSpeedKmh: Number(e.target.value) })}
                />
              </label>
              <label>
                <span>Temperature</span>
                <b>{sim.temperatureC.toFixed(0)}°C</b>
                <input
                  type="range" className="hud-range" min={-10} max={40} step={1} value={sim.temperatureC}
                  style={fillVar(sim.temperatureC, -10, 40)}
                  onChange={(e) => onSimChange({ temperatureC: Number(e.target.value) })}
                />
              </label>
              <label>
                <span>Activity</span>
                <b>{(sim.activity * 100).toFixed(0)}%</b>
                <input
                  type="range" className="hud-range" min={0} max={1} step={0.01} value={sim.activity}
                  style={fillVar(sim.activity, 0, 1)}
                  onChange={(e) => onSimChange({ activity: Number(e.target.value) })}
                />
              </label>
            </div>
          )}

          {!simulate && (
            <div className="live-status">
              <span className="live-dot" />
              Following real-time inputs: time, weather, and your activity update the sound automatically.
            </div>
          )}
        </div>
      )}

      {section === 'source' && !simulate && (
        <LocationPicker locationLabel={locationLabel} onSelect={onSelectLocation} onClear={onClearLocation} />
      )}

      {section === 'sound' && (
        <div className="hud-card">
          <h3>Mixer</h3>
          <div className="mixer-sliders">
            {MIX_LAYERS.map(({ key, label }) => (
              <label key={key}>
                <span>{label}</span>
                <b>{Math.round(mix[key] * 100)}%</b>
                <input
                  type="range" className="hud-range" min={0} max={1.5} step={0.01} value={mix[key]}
                  style={fillVar(mix[key], 0, 1.5)}
                  onChange={(e) => onMixChange(key, Number(e.target.value))}
                />
              </label>
            ))}
          </div>
        </div>
      )}

      {section === 'presets' && (
        <div className="hud-card hud-card--wide">
          <h3>
            <span>Presets</span>
            {presetsSource === 'local' && <span className="badge">offline · saved locally</span>}
          </h3>
          <div className="preset-save-row">
            <input
              type="text" placeholder="Name this sound…" value={presetName}
              onChange={(e) => onPresetNameChange(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && presetName.trim()) onSavePreset();
              }}
            />
            <button onClick={onSavePreset} disabled={!presetName.trim()}>Save</button>
          </div>
          <button
            className={linkCopied ? 'share-link-btn share-link-btn--copied' : 'share-link-btn'}
            onClick={onCopyShareLink}
          >
            {linkCopied ? <IconCheck /> : <IconLink />}
            {linkCopied ? 'Link copied' : 'Copy share link'}
          </button>

          {presets.length > 0 ? (
            <ul className="presets-list">
              {presets.map((p) => (
                <li key={p.name}>
                  <span>{p.name}</span>
                  <button
                    className="preset-action-btn"
                    onClick={() => onLoadPreset(p.name)}
                    aria-label={`Load preset ${p.name}`}
                  >
                    <IconPlay /> Load
                  </button>
                  <button
                    className="preset-action-btn preset-action-btn--danger"
                    onClick={() => onDeletePreset(p.name)}
                    aria-label={`Delete preset ${p.name}`}
                  >
                    <IconTrash />
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <div className="presets-empty">
              <IconDroplet />
              <p>
                No presets saved yet.
                <br />
                Dial in a sound and save it here.
              </p>
            </div>
          )}
        </div>
      )}

      {section === 'record' && (
        <div className="hud-card hud-card--wide record-card">
          <h3>Record</h3>
          <p className="record-explainer">
            Save what Petrichor is playing as an audio file. Recording captures everything you hear from the
            moment you press record until you stop; then a download appears. It all stays on your device:
            nothing is uploaded.
          </p>

          <div className="record-row">
            <button
              type="button"
              className={isRecording ? 'record-btn record-btn--live' : 'record-btn'}
              onClick={isRecording ? onStopRecording : onStartRecording}
              disabled={!started && !isRecording}
            >
              {isRecording ? <IconStopRecord /> : <IconRecord />}
              {isRecording ? 'Stop recording' : 'Start recording'}
            </button>
            <span className="record-status" aria-live="polite">
              {isRecording
                ? `Recording · ${recordingElapsed ?? '0:00'}`
                : started
                  ? 'Ready'
                  : 'Start playback first'}
            </span>
          </div>

          {recordingUrl && !isRecording && (
            <a className="record-download" href={recordingUrl} download={`petrichor-session-${Date.now()}.webm`}>
              <IconDownload /> Download your recording (.webm)
            </a>
          )}
          {recordingError && <p className="record-error">{recordingError}</p>}
        </div>
      )}
    </div>
  );
}
