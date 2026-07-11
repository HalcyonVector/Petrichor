import type { Preset } from '../types';

export interface SimState {
  hour: number;
  precipitationMm: number;
  cloudCoverPct: number;
  windSpeedKmh: number;
  temperatureC: number;
  activity: number;
}

interface ControlPanelProps {
  started: boolean;
  onStart: () => void;
  onStop: () => void;
  volume: number;
  onVolumeChange: (v: number) => void;
  simulate: boolean;
  onToggleSimulate: (v: boolean) => void;
  sim: SimState;
  onSimChange: (patch: Partial<SimState>) => void;
  presets: Preset[];
  presetName: string;
  onPresetNameChange: (v: string) => void;
  onSavePreset: () => void;
  onLoadPreset: (name: string) => void;
  onDeletePreset: (name: string) => void;
  manualActive: boolean;
  onClearManual: () => void;
}

export function ControlPanel({
  started, onStart, onStop, volume, onVolumeChange,
  simulate, onToggleSimulate, sim, onSimChange,
  presets, presetName, onPresetNameChange, onSavePreset, onLoadPreset, onDeletePreset,
  manualActive, onClearManual,
}: ControlPanelProps) {
  return (
    <div className="control-panel">
      <div className="row">
        {!started ? (
          <button className="primary" onClick={onStart}>▶ Start</button>
        ) : (
          <button className="primary" onClick={onStop}>■ Stop</button>
        )}
        <label className="volume">
          Volume
          <input
            type="range" min={0} max={1} step={0.01} value={volume}
            onChange={(e) => onVolumeChange(Number(e.target.value))}
          />
        </label>
      </div>

      <div className="row mode-toggle">
        <label>
          <input type="radio" checked={!simulate} onChange={() => onToggleSimulate(false)} />
          Live inputs
        </label>
        <label>
          <input type="radio" checked={simulate} onChange={() => onToggleSimulate(true)} />
          Simulate
        </label>
        {manualActive && (
          <button className="ghost" onClick={onClearManual}>← back to {simulate ? 'simulate' : 'live'}</button>
        )}
      </div>

      {simulate && (
        <div className="sim-sliders">
          <label>
            Hour of day: {sim.hour.toFixed(1)}
            <input type="range" min={0} max={23.99} step={0.1} value={sim.hour}
              onChange={(e) => onSimChange({ hour: Number(e.target.value) })} />
          </label>
          <label>
            Precipitation: {sim.precipitationMm.toFixed(1)}mm/h
            <input type="range" min={0} max={6} step={0.1} value={sim.precipitationMm}
              onChange={(e) => onSimChange({ precipitationMm: Number(e.target.value) })} />
          </label>
          <label>
            Cloud cover: {sim.cloudCoverPct.toFixed(0)}%
            <input type="range" min={0} max={100} step={1} value={sim.cloudCoverPct}
              onChange={(e) => onSimChange({ cloudCoverPct: Number(e.target.value) })} />
          </label>
          <label>
            Wind: {sim.windSpeedKmh.toFixed(0)}km/h
            <input type="range" min={0} max={60} step={1} value={sim.windSpeedKmh}
              onChange={(e) => onSimChange({ windSpeedKmh: Number(e.target.value) })} />
          </label>
          <label>
            Temperature: {sim.temperatureC.toFixed(0)}°C
            <input type="range" min={-10} max={40} step={1} value={sim.temperatureC}
              onChange={(e) => onSimChange({ temperatureC: Number(e.target.value) })} />
          </label>
          <label>
            Activity: {(sim.activity * 100).toFixed(0)}%
            <input type="range" min={0} max={1} step={0.01} value={sim.activity}
              onChange={(e) => onSimChange({ activity: Number(e.target.value) })} />
          </label>
        </div>
      )}

      <div className="presets">
        <h3>Presets</h3>
        <div className="row">
          <input
            type="text" placeholder="preset name" value={presetName}
            onChange={(e) => onPresetNameChange(e.target.value)}
          />
          <button onClick={onSavePreset} disabled={!presetName.trim()}>Save current sound</button>
        </div>
        <ul>
          {presets.map((p) => (
            <li key={p.name}>
              <span>{p.name}</span>
              <button className="ghost" onClick={() => onLoadPreset(p.name)}>Load</button>
              <button className="ghost danger" onClick={() => onDeletePreset(p.name)}>Delete</button>
            </li>
          ))}
          {presets.length === 0 && <li className="empty">No presets saved yet.</li>}
        </ul>
      </div>
    </div>
  );
}
