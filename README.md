# Ambient Weather Engine

A procedural ambient/lo-fi music generator. It doesn't play samples — it
synthesizes everything live (oscillators, filters, envelopes, noise) using
[Tone.js](https://tonejs.github.io/) on top of the Web Audio API, and
continuously reshapes the sound from real inputs:

- **Time of day** — tempo, register (octave), and scale/mode drift from
  bright major/lydian at midday down to slower minor/phrygian tonalities
  at night.
- **Live weather** (via [Open-Meteo](https://open-meteo.com), no API key
  required) — rain intensity feeds a filtered noise layer and raises hihat
  density; cloud cover darkens the filter; wind speed drives filter/pan LFO
  modulation; temperature shifts harmonic "warmth" (detune/voicing).
- **Interaction activity** — keyboard/mouse/scroll cadence on the page (the
  closest thing a browser can honestly measure to "system activity", since
  it can't read real OS/CPU telemetry) drives arpeggio density and overall
  energy.

Meant to be left running in a tab while you work, like a retro music player
— except the engine, not just the skin, is the thing that was built here.

## Architecture

```
ambient-generator/
├── server/        Express API: weather proxy (+ IP geolocation fallback),
│                   preset storage, static hosting for the built client
└── client/        React + TypeScript + Vite frontend, Tone.js synthesis
    └── src/
        ├── audio/          AudioEngine (the DSP) + music theory helpers
        ├── inputs/         useTimeOfDay / useWeather / useActivity hooks
        ├── mapping/        pure function: live inputs -> synthesis params
        └── components/     ControlPanel, StatusPanel, Visualizer
```

**Signal chain** (see `client/src/audio/AudioEngine.ts`):

- **Pad layer** — `PolySynth` of detuned fat-sawtooth voices → LFO-modulated
  lowpass filter → reverb. Chord notes come from a scale-degree random walk
  (`musicTheory.ts`) so harmonic motion stays smooth instead of jumping.
- **Sub bass** — `MonoSynth` (sine) with its own filter envelope, following
  the pad's root note an octave down.
- **Arpeggio** — `PluckSynth`, probability-gated per 8th note by
  `arpDensity` (driven by activity/typing).
- **Hihat** — `NoiseSynth` (white noise, fast decay), probability-gated per
  16th note by `hihatDensity` (driven by rain).
- **Rain texture** — continuous pink noise through a bandpass filter, gain
  driven by precipitation.
- A slow **pan LFO** and **filter-cutoff LFO** (both driven by wind) give
  the whole mix its drift.

`mapping/parameterMapping.ts` is a pure function so it's easy to reason
about and to drive from the UI's **Simulate** mode (sliders for hour,
rain, cloud cover, wind, temperature, activity) without needing to wait for
real weather/time to change.

Presets store a resolved parameter snapshot server-side (`server/data/presets.json`)
so you can save/recall a sound you liked as a manual override, independent of
live or simulated inputs.

## Setup

Requires Node.js 18+ (uses global `fetch`).

```bash
npm run install:all
```

## Run (development)

```bash
npm run dev
```

This runs the Express API on `http://localhost:3001` and the Vite dev
server on `http://localhost:5173` (which proxies `/api/*` to the backend).
Open `http://localhost:5173`, click **Start** (audio requires a user
gesture per browser autoplay policy), and allow location access if you want
weather personalized to where you are — otherwise it falls back to
IP-based geolocation, then to a default location.

## Run (production-ish)

```bash
npm run build   # builds the client into client/dist
npm start        # Express serves the API + the built client on :3001
```

## Configuration

Optional environment variables for the server (e.g. in `server/.env` if you
add dotenv, or just set them in your shell):

- `PORT` — server port (default `3001`)
- `DEFAULT_LAT`, `DEFAULT_LON` — fallback coordinates used when neither
  browser geolocation nor IP geolocation succeed (default: London)

## Notes / honest limitations

- "System activity" is a browser-side proxy (keyboard/mouse/scroll cadence
  + tab visibility), not real OS CPU/process telemetry — that would require
  a native shell (e.g. Electron) with OS-level APIs, which is out of scope
  for a page you leave open in a tab.
- IP geolocation only works once this is deployed somewhere with a real
  public IP; on localhost it'll fall back to the default coordinates.
- The React root intentionally skips `<StrictMode>` — its dev-mode double
  effect invocation tears down and rebuilds the live Tone.js audio graph
  mid-session, which is more confusing than useful here.
