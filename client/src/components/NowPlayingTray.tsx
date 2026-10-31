import type { CSSProperties, Ref } from 'react';
import type * as Tone from 'tone';
import type { AmbientParams, WeatherSnapshot } from '../types';
import { formatClock } from '../lib/formatTime';
import { weatherLabel } from '../lib/weatherLabel';
import { Visualizer } from './Visualizer';
import { keyName } from '../audio/musicTheory';

interface NowPlayingTrayProps {
  hour: number;
  weather: WeatherSnapshot | null;
  params: AmbientParams;
  isManual: boolean;
  focus: boolean;
  sleepLabel: string | null;
  analyser: Tone.Analyser | null;
  started: boolean;
  onStart: () => void;
  onStop: () => void;
  volume: number;
  onVolumeChange: (v: number) => void;
  isRecording: boolean;
  recordingUrl: string | null;
  recordingError: string | null;
  onStartRecording: () => void;
  onStopRecording: () => void;
  drawerOpen: boolean;
  onToggleDrawer: () => void;
  drawerToggleRef?: Ref<HTMLButtonElement>;
}

export function NowPlayingTray({
  hour, weather, params, isManual, focus, sleepLabel, analyser, started, onStart, onStop,
  volume, onVolumeChange,
  isRecording, recordingUrl, recordingError, onStartRecording, onStopRecording,
  drawerOpen, onToggleDrawer, drawerToggleRef,
}: NowPlayingTrayProps) {
  const meta = [
    weatherLabel(weather),
    weather ? `${Math.round(weather.temperatureC)}°C` : null,
    `${keyName(params.rootNote)} ${params.scaleMode.toUpperCase()}`,
    `${Math.round(params.tempo)} BPM`,
    isManual ? 'PRESET' : null,
    focus ? 'FOCUS' : null,
    sleepLabel,
  ]
    .filter(Boolean)
    .join(' · ');

  return (
    <div className="tray">
      <div className="tray-time">{formatClock(hour)}</div>
      <div className="tray-meta">{meta}</div>

      <Visualizer analyser={analyser} active={started} />

      <div className="tray-row">
        <button
          className="tray-play"
          onClick={started ? onStop : onStart}
          aria-label={started ? 'Stop' : 'Start'}
        >
          {started ? '■' : '▶'}
        </button>

        <input
          type="range"
          className="hud-range tray-volume"
          min={0}
          max={1}
          step={0.01}
          value={volume}
          onChange={(e) => onVolumeChange(Number(e.target.value))}
          style={{ '--val': volume } as CSSProperties}
          aria-label="Volume"
        />

        <button
          className={`tray-dot${isRecording ? ' tray-dot--live' : ''}`}
          onClick={isRecording ? onStopRecording : onStartRecording}
          disabled={!started}
          aria-label={isRecording ? 'Stop recording' : 'Record'}
          title={isRecording ? 'Stop recording' : 'Record'}
        >
          ●
        </button>

        {recordingUrl && (
          <a
            className="tray-download"
            href={recordingUrl}
            download={`ambient-session-${Date.now()}.webm`}
            aria-label="Download recording"
            title="Download recording"
          >
            ⬇
          </a>
        )}

        <button
          ref={drawerToggleRef}
          className={`tray-drawer-toggle${drawerOpen ? ' tray-drawer-toggle--open' : ''}`}
          onClick={onToggleDrawer}
          aria-label={drawerOpen ? 'Close studio panel' : 'Open studio panel'}
          aria-expanded={drawerOpen}
          title="Studio"
        >
          {drawerOpen ? '✕' : '⚙'}
        </button>
      </div>

      {recordingError && <div className="tray-error">{recordingError}</div>}
    </div>
  );
}
