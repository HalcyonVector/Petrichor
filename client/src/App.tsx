import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AudioEngine, type MixLayer } from './audio/AudioEngine';
import { useTimeOfDay } from './inputs/useTimeOfDay';
import { useWeather } from './inputs/useWeather';
import { useActivity } from './inputs/useActivity';
import { useRecorder } from './inputs/useRecorder';
import { useWakeLock } from './inputs/useWakeLock';
import { useLightning } from './inputs/useLightning';
import { useMediaSession } from './inputs/useMediaSession';
import { mapInputsToParams } from './mapping/parameterMapping';
import { isThunderstorm } from './lib/weatherCode';
import { listPresets, savePreset, deletePreset } from './lib/presetsStore';
import type { PresetSource } from './lib/presetsStore';
import { buildShareUrl, readShareParamsFromLocation } from './lib/shareLink';
import { copyToClipboard } from './lib/clipboard';
import {
  hasSeenOnboarding, loadStoredLocation, loadStoredMix, loadStoredVolume, markOnboardingSeen,
  saveStoredLocation, saveStoredMix, saveStoredVolume,
  type StoredLocation,
} from './lib/localSettings';
import { SkyScene } from './components/SkyScene';
import { NowPlayingTray } from './components/NowPlayingTray';
import { OnboardingHint } from './components/OnboardingHint';
import { ControlPanel, type SimState } from './components/ControlPanel';
import { StatusPanel } from './components/StatusPanel';
import type { AmbientParams, LiveInputs, Preset, WeatherSnapshot } from './types';
import './App.css';

const DEFAULT_SIM: SimState = {
  hour: 21,
  precipitationMm: 1.5,
  cloudCoverPct: 70,
  windSpeedKmh: 15,
  temperatureC: 12,
  activity: 0.3,
  weatherCode: 0,
};

const DEFAULT_MIX: Record<MixLayer, number> = { pad: 1, bass: 1, arp: 1, hihat: 1, rain: 1 };

export default function App() {
  const engineRef = useRef<AudioEngine | null>(null);
  if (!engineRef.current) engineRef.current = new AudioEngine();

  const mainRegionRef = useRef<HTMLDivElement>(null);
  const drawerRef = useRef<HTMLElement>(null);
  const drawerCloseRef = useRef<HTMLButtonElement>(null);
  const drawerToggleRef = useRef<HTMLButtonElement>(null);
  const drawerHasMounted = useRef(false);

  const [started, setStarted] = useState(false);
  const [volume, setVolume] = useState(() => loadStoredVolume(0.85));
  const [simulate, setSimulate] = useState(false);
  const [sim, setSim] = useState<SimState>(DEFAULT_SIM);
  const [mix, setMix] = useState<Record<MixLayer, number>>(() => loadStoredMix(DEFAULT_MIX));
  const [manualParams, setManualParams] = useState<AmbientParams | null>(null);
  const [presets, setPresets] = useState<Preset[]>([]);
  const [presetsSource, setPresetsSource] = useState<PresetSource>('server');
  const [presetName, setPresetName] = useState('');
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [linkCopied, setLinkCopied] = useState(false);
  const [locationOverride, setLocationOverride] = useState<StoredLocation | null>(() => loadStoredLocation());
  const [showOnboarding, setShowOnboarding] = useState(() => !hasSeenOnboarding());

  const dismissOnboarding = () => {
    setShowOnboarding(false);
    markOnboardingSeen();
  };

  useWakeLock(started);

  // A shared sound in the URL loads once as a manual override, same as a
  // preset, then the URL is cleaned up so refreshing doesn't re-trigger it.
  useEffect(() => {
    const shared = readShareParamsFromLocation();
    if (shared) {
      setManualParams(shared);
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, []);

  useEffect(() => {
    if (!drawerOpen) return undefined;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setDrawerOpen(false);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [drawerOpen]);

  // Only one of the main view or the drawer is reachable by keyboard/screen
  // reader at a time, matching what's visible. Without this, the drawer's
  // controls stay tabbable while slid off-screen and closed, and the sky's
  // controls stay reachable behind the open drawer's backdrop.
  useEffect(() => {
    if (mainRegionRef.current) mainRegionRef.current.inert = drawerOpen;
    if (drawerRef.current) drawerRef.current.inert = !drawerOpen;

    if (!drawerHasMounted.current) {
      drawerHasMounted.current = true;
      return;
    }
    if (drawerOpen) drawerCloseRef.current?.focus();
    else drawerToggleRef.current?.focus();
  }, [drawerOpen]);

  const simWeather: WeatherSnapshot | null = simulate
    ? {
        temperatureC: sim.temperatureC,
        precipitationMm: sim.precipitationMm,
        cloudCoverPct: sim.cloudCoverPct,
        windSpeedKmh: sim.windSpeedKmh,
        weatherCode: sim.weatherCode,
        isDay: sim.hour > 6 && sim.hour < 20,
        source: 'client',
      }
    : null;
  const { weather } = useWeather(simWeather, !simulate ? locationOverride : null);
  const activity = useActivity(simulate ? sim.activity : null);
  // When a location override is active, the hour reflects that place's
  // actual local time (from the weather response's UTC offset), not
  // wherever the browser happens to be.
  const liveHour = useTimeOfDay(simulate ? sim.hour : null, !simulate ? weather?.utcOffsetSeconds ?? null : null);

  const inputs: LiveInputs = useMemo(() => ({ hour: liveHour, weather, activity }), [liveHour, weather, activity]);
  const liveParams = useMemo(() => mapInputsToParams(inputs), [inputs]);
  const effectiveParams = manualParams ?? liveParams;

  const lightningTrigger = useLightning(isThunderstorm(inputs.weather?.weatherCode));
  useEffect(() => {
    if (lightningTrigger === 0) return;
    engineRef.current?.triggerThunder();
  }, [lightningTrigger]);

  const getRecordingStream = useCallback(() => engineRef.current?.getRecordingStream() ?? null, []);
  const recorder = useRecorder(getRecordingStream);

  useEffect(() => {
    engineRef.current?.updateParams(effectiveParams);
  }, [effectiveParams]);

  useEffect(() => {
    engineRef.current?.setMasterVolume(volume);
    saveStoredVolume(volume);
  }, [volume]);

  useEffect(() => {
    listPresets().then(({ presets: loaded, source }) => {
      setPresets(loaded);
      setPresetsSource(source);
    });
  }, []);

  useEffect(
    () => () => {
      engineRef.current?.dispose();
    },
    [],
  );

  const handleStart = async () => {
    const engine = engineRef.current;
    if (!engine) return;
    await engine.start();
    engine.setMasterVolume(volume);
    engine.updateParams(effectiveParams);
    Object.entries(mix).forEach(([layer, level]) => engine.setLayerMix(layer as MixLayer, level));
    setStarted(true);
    if (showOnboarding) dismissOnboarding();
  };

  const handleStop = () => {
    if (recorder.isRecording) recorder.stop();
    engineRef.current?.stop();
    setStarted(false);
  };

  // Refs so the Space-bar listener below always calls the freshest
  // handleStart/handleStop (closing over current volume/mix/params)
  // without having to re-subscribe the listener on every render.
  const handleStartRef = useRef(handleStart);
  const handleStopRef = useRef(handleStop);
  handleStartRef.current = handleStart;
  handleStopRef.current = handleStop;

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.code !== 'Space') return;
      const tag = (e.target as HTMLElement | null)?.tagName.toLowerCase();
      if (tag === 'input' || tag === 'textarea' || tag === 'select' || tag === 'button') return;
      e.preventDefault();
      if (started) handleStopRef.current();
      else handleStartRef.current();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [started]);

  const scaleLabel = effectiveParams.scaleMode.charAt(0).toUpperCase() + effectiveParams.scaleMode.slice(1);
  useMediaSession(
    started,
    { title: `${scaleLabel} · ${Math.round(effectiveParams.tempo)} BPM`, artist: 'Ambient Weather Engine' },
    handleStart,
    handleStop,
  );

  const handleMixChange = (layer: MixLayer, level: number) => {
    setMix((prev) => {
      const next = { ...prev, [layer]: level };
      saveStoredMix(next);
      return next;
    });
    engineRef.current?.setLayerMix(layer, level);
  };

  const handleSavePreset = async () => {
    const name = presetName.trim();
    if (!name) return;
    const { preset, source } = await savePreset(name, effectiveParams);
    setPresets((prev) => [...prev.filter((p) => p.name !== name), preset]);
    setPresetsSource(source);
    setPresetName('');
  };

  const handleLoadPreset = (name: string) => {
    const preset = presets.find((p) => p.name === name);
    if (preset) setManualParams(preset.params);
  };

  const handleDeletePreset = async (name: string) => {
    const { source } = await deletePreset(name);
    setPresets((prev) => prev.filter((p) => p.name !== name));
    setPresetsSource(source);
  };

  const handleCopyShareLink = async () => {
    const ok = await copyToClipboard(buildShareUrl(effectiveParams));
    if (ok) {
      setLinkCopied(true);
      setTimeout(() => setLinkCopied(false), 2000);
    }
  };

  const handleSelectLocation = (lat: number, lon: number, label: string) => {
    const loc: StoredLocation = { lat, lon, label };
    setLocationOverride(loc);
    saveStoredLocation(loc);
  };

  const handleClearLocation = () => {
    setLocationOverride(null);
    saveStoredLocation(null);
  };

  return (
    <div className="app">
      <div ref={mainRegionRef}>
        <SkyScene hour={inputs.hour} weather={inputs.weather} lightningTrigger={lightningTrigger} />

        <div className="brand">Ambient Weather Engine</div>

        <main className="stage">
          {showOnboarding && <OnboardingHint onDismiss={dismissOnboarding} />}
          <NowPlayingTray
            hour={inputs.hour}
            weather={inputs.weather}
            params={effectiveParams}
            isManual={manualParams !== null}
            analyser={engineRef.current.getAnalyser()}
            started={started}
            onStart={handleStart}
            onStop={handleStop}
            volume={volume}
            onVolumeChange={setVolume}
            isRecording={recorder.isRecording}
            recordingUrl={recorder.recordingUrl}
            recordingError={recorder.error}
            onStartRecording={recorder.start}
            onStopRecording={recorder.stop}
            drawerOpen={drawerOpen}
            onToggleDrawer={() => setDrawerOpen((v) => !v)}
            drawerToggleRef={drawerToggleRef}
          />
        </main>
      </div>

      {drawerOpen && <div className="drawer-backdrop" onClick={() => setDrawerOpen(false)} />}

      <aside ref={drawerRef} className={`drawer${drawerOpen ? ' drawer--open' : ''}`} aria-hidden={!drawerOpen}>
        <div className="drawer-inner">
          <div className="drawer-header">
            <span>Studio</span>
            <button ref={drawerCloseRef} className="drawer-close" onClick={() => setDrawerOpen(false)}>
              ✕ Close
            </button>
          </div>

          <ControlPanel
            simulate={simulate}
            onToggleSimulate={(v) => {
              setSimulate(v);
              setManualParams(null);
            }}
            sim={sim}
            onSimChange={(patch) => setSim((prev) => ({ ...prev, ...patch }))}
            mix={mix}
            onMixChange={handleMixChange}
            presets={presets}
            presetsSource={presetsSource}
            presetName={presetName}
            onPresetNameChange={setPresetName}
            onSavePreset={handleSavePreset}
            onLoadPreset={handleLoadPreset}
            onDeletePreset={handleDeletePreset}
            manualActive={manualParams !== null}
            onClearManual={() => setManualParams(null)}
            onCopyShareLink={handleCopyShareLink}
            linkCopied={linkCopied}
            locationLabel={locationOverride?.label ?? null}
            onSelectLocation={handleSelectLocation}
            onClearLocation={handleClearLocation}
          />

          <StatusPanel inputs={inputs} params={effectiveParams} isManual={manualParams !== null} />

          <p className="drawer-footnote">
            Synthesis engine built on Tone.js oscillators, filters, and envelopes (no samples). Weather via
            Open-Meteo.
          </p>
          <p className="drawer-footnote">
            Location: only sent to this app's own backend, never stored. If you decline browser location
            access, the backend guesses roughly from your IP via ipapi.co instead. The "Weather" line above
            always names the source in use (client, ip, or default).
          </p>
        </div>
      </aside>
    </div>
  );
}
