import { useEffect, useMemo, useRef, useState } from 'react';
import { AudioEngine } from './audio/AudioEngine';
import { useTimeOfDay } from './inputs/useTimeOfDay';
import { useWeather } from './inputs/useWeather';
import { useActivity } from './inputs/useActivity';
import { mapInputsToParams } from './mapping/parameterMapping';
import { ControlPanel, type SimState } from './components/ControlPanel';
import { StatusPanel } from './components/StatusPanel';
import { Visualizer } from './components/Visualizer';
import type { AmbientParams, LiveInputs, Preset, WeatherSnapshot } from './types';
import './App.css';

const DEFAULT_SIM: SimState = {
  hour: 21,
  precipitationMm: 1.5,
  cloudCoverPct: 70,
  windSpeedKmh: 15,
  temperatureC: 12,
  activity: 0.3,
};

export default function App() {
  const engineRef = useRef<AudioEngine | null>(null);
  if (!engineRef.current) engineRef.current = new AudioEngine();

  const [started, setStarted] = useState(false);
  const [volume, setVolume] = useState(0.85);
  const [simulate, setSimulate] = useState(false);
  const [sim, setSim] = useState<SimState>(DEFAULT_SIM);
  const [manualParams, setManualParams] = useState<AmbientParams | null>(null);
  const [presets, setPresets] = useState<Preset[]>([]);
  const [presetName, setPresetName] = useState('');

  const liveHour = useTimeOfDay(simulate ? sim.hour : null);

  const simWeather: WeatherSnapshot | null = simulate
    ? {
        temperatureC: sim.temperatureC,
        precipitationMm: sim.precipitationMm,
        cloudCoverPct: sim.cloudCoverPct,
        windSpeedKmh: sim.windSpeedKmh,
        weatherCode: 0,
        isDay: sim.hour > 6 && sim.hour < 20,
        source: 'client',
      }
    : null;
  const { weather } = useWeather(simWeather);
  const activity = useActivity(simulate ? sim.activity : null);

  const inputs: LiveInputs = useMemo(() => ({ hour: liveHour, weather, activity }), [liveHour, weather, activity]);
  const liveParams = useMemo(() => mapInputsToParams(inputs), [inputs]);
  const effectiveParams = manualParams ?? liveParams;

  useEffect(() => {
    engineRef.current?.updateParams(effectiveParams);
  }, [effectiveParams]);

  useEffect(() => {
    engineRef.current?.setMasterVolume(volume);
  }, [volume]);

  useEffect(() => {
    fetch('/api/presets')
      .then((r) => r.json())
      .then(setPresets)
      .catch(() => {});
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
    setStarted(true);
  };

  const handleStop = () => {
    engineRef.current?.stop();
    setStarted(false);
  };

  const handleSavePreset = async () => {
    const name = presetName.trim();
    if (!name) return;
    const res = await fetch('/api/presets', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, params: effectiveParams }),
    });
    if (res.ok) {
      const entry: Preset = await res.json();
      setPresets((prev) => [...prev.filter((p) => p.name !== name), entry]);
      setPresetName('');
    }
  };

  const handleLoadPreset = (name: string) => {
    const preset = presets.find((p) => p.name === name);
    if (preset) setManualParams(preset.params);
  };

  const handleDeletePreset = async (name: string) => {
    await fetch(`/api/presets/${encodeURIComponent(name)}`, { method: 'DELETE' });
    setPresets((prev) => prev.filter((p) => p.name !== name));
  };

  return (
    <div className="app">
      <header>
        <h1>Ambient Weather Engine</h1>
        <p className="subtitle">
          Procedural ambient music synthesized live from time of day, weather, and how you're using this page.
        </p>
      </header>

      <Visualizer analyser={engineRef.current.getAnalyser()} active={started} />

      <ControlPanel
        started={started}
        onStart={handleStart}
        onStop={handleStop}
        volume={volume}
        onVolumeChange={setVolume}
        simulate={simulate}
        onToggleSimulate={(v) => {
          setSimulate(v);
          setManualParams(null);
        }}
        sim={sim}
        onSimChange={(patch) => setSim((prev) => ({ ...prev, ...patch }))}
        presets={presets}
        presetName={presetName}
        onPresetNameChange={setPresetName}
        onSavePreset={handleSavePreset}
        onLoadPreset={handleLoadPreset}
        onDeletePreset={handleDeletePreset}
        manualActive={manualParams !== null}
        onClearManual={() => setManualParams(null)}
      />

      <StatusPanel inputs={inputs} params={effectiveParams} isManual={manualParams !== null} />

      <footer>
        <p>
          Synthesis engine built on Tone.js oscillators, filters, and envelopes — no samples. Weather via
          Open-Meteo. Leave it running.
        </p>
      </footer>
    </div>
  );
}
