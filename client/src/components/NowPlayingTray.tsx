import type { CSSProperties, Ref } from 'react';
import type * as Tone from 'tone';
import type { AmbientParams, WeatherSnapshot } from '../types';
import { formatClock } from '../lib/formatTime';
import { weatherLabel } from '../lib/weatherLabel';
import { Visualizer } from './Visualizer';
import { IconClose, IconDownload, IconRecord, IconSliders, IconStopRecord } from './trayIcons';
import { keyName } from '../audio/musicTheory';

interface NowPlayingTrayProps {
  hour: number;
  weather: WeatherSnapshot | null;
  /** True when the weather fetch failed and there's no earlier reading. */
  weatherOffline: boolean;
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
  hour, weather, weatherOffline, params, isManual, focus, sleepLabel, analyser, started, onStart, onStop,
  volume, onVolumeChange,
  isRecording, recordingUrl, recordingError, onStartRecording, onStopRecording,
  drawerOpen, onToggleDrawer, drawerToggleRef,
}: NowPlayingTrayProps) {
  const meta = [
    weatherLabel(weather, weatherOffline),
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
          className={`tray-pill tray-rec${isRecording ? ' tray-rec--live' : ''}`}
          onClick={isRecording ? onStopRecording : onStartRecording}
          disabled={!started}
          aria-label={isRecording ? 'Stop recording' : 'Record'}
          title={started ? (isRecording ? 'Stop recording' : 'Record this session') : 'Start playback to record'}
        >
          {isRecording ? <IconStopRecord /> : <IconRecord />}
          <span className="tray-pill-label">{isRecording ? 'Stop' : 'Rec'}</span>
        </button>

        {recordingUrl && (
          <a
            className="tray-pill tray-pill--icon"
            href={recordingUrl}
            download={`petrichor-session-${Date.now()}.webm`}
            aria-label="Download recording"
            title="Download recording"
          >
            <IconDownload />
          </a>
        )}

        <button
          ref={drawerToggleRef}
          className={`tray-pill tray-drawer-toggle${drawerOpen ? ' tray-drawer-toggle--open' : ''}`}
          onClick={onToggleDrawer}
          aria-label={drawerOpen ? 'Close studio panel' : 'Open studio panel'}
          aria-expanded={drawerOpen}
          title="Studio: focus, sleep timer, mixer, presets"
        >
          {drawerOpen ? <IconClose /> : <IconSliders />}
          <span className="tray-pill-label">Studio</span>
        </button>
      </div>

      {recordingError && <div className="tray-error">{recordingError}</div>}
    </div>
  );
}
