import type { CSSProperties, Ref } from 'react';
import type * as Tone from 'tone';
import type { AmbientParams, WeatherSnapshot } from '../types';
import { formatClock } from '../lib/formatTime';
import { weatherLabel } from '../lib/weatherLabel';
import { Visualizer } from './Visualizer';
import { IconClose, IconExpand, IconPlay, IconSliders, IconStop } from './trayIcons';
import { keyName } from '../audio/musicTheory';

interface NowPlayingTrayProps {
  hour: number;
  weather: WeatherSnapshot | null;
  /** True when the weather fetch failed and there's no earlier reading. */
  weatherOffline: boolean;
  /** Where the weather is from: a picked city, "Your location", etc. */
  place: string | null;
  /** The chord sounding right now, e.g. "Am". */
  chord: string | null;
  /** Increments when the key or mode changes, to replay the highlight. */
  keyCue: number;
  params: AmbientParams;
  isManual: boolean;
  focus: boolean;
  sleepLabel: string | null;
  analyser: Tone.Analyser | null;
  lowPower: boolean;
  started: boolean;
  onStart: () => void;
  onStop: () => void;
  volume: number;
  onVolumeChange: (v: number) => void;
  /** "0:42" while a recording is running, else null. Shown as a REC badge that opens the Record tab. */
  recordingLabel: string | null;
  onOpenRecording: () => void;
  drawerOpen: boolean;
  onToggleDrawer: () => void;
  drawerToggleRef?: Ref<HTMLButtonElement>;
  onEnterImmersive: () => void;
  immersiveToggleRef?: Ref<HTMLButtonElement>;
}

export function NowPlayingTray({
  hour, weather, weatherOffline, place, chord, keyCue, params, isManual, focus, sleepLabel, analyser, lowPower, started, onStart, onStop,
  volume, onVolumeChange,
  recordingLabel, onOpenRecording,
  drawerOpen, onToggleDrawer, drawerToggleRef, onEnterImmersive, immersiveToggleRef,
}: NowPlayingTrayProps) {
  const where = [
    place,
    weatherLabel(weather, weatherOffline),
    weather ? `${Math.round(weather.temperatureC)}°C` : null,
  ];
  const keyLabel = `${keyName(params.rootNote)} ${params.scaleMode.toUpperCase()}`;
  const after = [
    `${Math.round(params.tempo)} BPM`,
    isManual ? 'PRESET' : null,
    focus ? 'FOCUS' : null,
    sleepLabel,
  ];
  const join = (parts: (string | null)[]) => parts.filter(Boolean).join(' · ');

  return (
    <div className="tray">
      <div className="tray-top">
        <span className="tray-place">{join(where) || '\u00a0'}</span>
        <span className="tray-top-right">
          {recordingLabel && (
            <button type="button" className="tray-rec-badge" onClick={onOpenRecording} title="Recording: open the Record tab">
              <span className="tray-rec-dot" aria-hidden="true" />
              REC {recordingLabel}
            </button>
          )}
          {chord && (
            <span key={chord} className="tray-chord" title="Chord playing now">
              {chord}
            </span>
          )}
        </span>
      </div>
      <div className="tray-time">{formatClock(hour)}</div>
      <div className="tray-meta">
        <span key={keyCue} className={keyCue > 0 ? 'tray-meta-key tray-meta-key--changed' : 'tray-meta-key'}>
          {keyLabel}
        </span>
        {' · '}
        {join(after)}
      </div>

      <Visualizer analyser={analyser} active={started} lowPower={lowPower} />

      <div className="tray-row">
        <button
          className="tray-play"
          onClick={started ? onStop : onStart}
          aria-label={started ? 'Stop' : 'Start'}
          title={started ? 'Stop (Space)' : 'Start (Space)'}
        >
          {started ? <IconStop /> : <IconPlay />}
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
          ref={immersiveToggleRef}
          className="tray-pill tray-pill--icon"
          onClick={onEnterImmersive}
          aria-label="Immersive view"
          title="Immersive view: just the sky and the music"
        >
          <IconExpand />
        </button>

        <button
          ref={drawerToggleRef}
          className={`tray-pill tray-drawer-toggle${drawerOpen ? ' tray-drawer-toggle--open' : ''}`}
          onClick={onToggleDrawer}
          aria-label={drawerOpen ? 'Close studio' : 'Open studio'}
          aria-expanded={drawerOpen}
          title="Studio: focus, sleep timer, mixer, presets, recording"
        >
          {drawerOpen ? <IconClose /> : <IconSliders />}
          <span className="tray-pill-label">Studio</span>
        </button>
      </div>

      {!started && (
        <div className="tray-hint">
          or press <kbd>Space</kbd>
        </div>
      )}
    </div>
  );
}
