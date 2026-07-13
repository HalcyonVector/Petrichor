# Ambient Weather Engine: Procedural Generative Music from Live Weather, Time & Activity

A full-stack generative ambient/lo-fi music engine that composes and synthesizes music **in real time, with no sample playback**: every pad, bass note, arpeggio, hi-hat, and rain texture is built from oscillators, filters, and envelopes via the Web Audio API, continuously reshaped by the time of day, live weather at your location, and how actively you're using the page. The same inputs drive a full-viewport animated sky: sun/moon position, stars, and rain are the visual read-out of exactly what the audio engine is reacting to, not a themed skin bolted on afterward. Built with React, TypeScript, Tone.js, and Express.

> **What it's for:** a self-playing soundscape you leave running in a tab while you work. The sound engine, not just a themed music player, is the thing that was built here.

---

## Disclaimer

This project is for personal and educational use. It is **not a medical, therapeutic, or clinical audio tool**: it makes no claims about focus, sleep, or wellness outcomes. Generated audio is unbounded and probabilistic; volume and intensity can vary as inputs change, so use your device's volume controls and don't rely on it in situations requiring undivided auditory attention. Live weather is sourced from a free-tier public API and may be delayed, cached, or (rarely) unavailable, in which case the engine falls back to sensible defaults rather than failing silently.

---

## Features

### Synthesis Engine (no samples)

- **Pad layer**: `PolySynth` of detuned fat-sawtooth voices through an LFO-modulated lowpass filter into reverb; chord notes come from a scale-degree random walk so harmonic motion drifts smoothly instead of jumping
- **Sub bass**: `MonoSynth` sine voice with its own filter envelope, tracking the pad's root note an octave down
- **Arpeggio**: `PluckSynth`, probability-gated per 8th note by a live-driven density parameter
- **Hi-hat**: `NoiseSynth` (white noise, fast decay), probability-gated per 16th note, density driven by rain
- **Rain texture**: continuous pink noise through a bandpass filter, gain driven by live precipitation
- **Wind-driven drift**: slow pan LFO and filter-cutoff LFO both modulated by live wind speed
- **Per-layer mixer**: independent 0–150% mix controls for pad/bass/arp/hihat/rain, layered on top of (not replacing) the automatic weather/time/activity mapping
- **Music theory core**: scale/mode selection (lydian → major → mixolydian → dorian → minor → phrygian), chord-stacking, and scale-degree random walks live in a dependency-free module (`musicTheory.ts`)

### Live Inputs

- **Time of day**: tempo, register (octave), and scale/mode drift from bright major/lydian at midday to slower minor/phrygian tonalities at night, on a continuous day/night curve (not hard cutoffs)
- **Live weather** (via [Open-Meteo](https://open-meteo.com), no API key required): precipitation, cloud cover, wind speed, and temperature each map to a distinct synthesis parameter
- **Weather-type classification**: Open-Meteo's WMO weather code (`lib/weatherCode.ts`) distinguishes snow and thunderstorms from ordinary rain, driving both the sky visuals and the "now playing" weather label ("SNOW", "THUNDERSTORM") instead of treating every kind of precipitation as generic rain
- **Interaction activity**: keyboard/mouse/scroll cadence and tab-visibility state on the page itself, used as an honest, documented proxy for "system activity" since a browser sandbox can't read real OS/CPU telemetry
- **Simulate mode**: sliders for hour, rain, cloud cover, wind, temperature, and activity, plus a Clear/Rain/Snow/Storm weather-type picker, so you can preview "3am + heavy rain" (or a thunderstorm) without waiting for it to actually happen
- **Location picker**: search any city (Open-Meteo's free geocoding API) to deliberately listen to weather somewhere other than wherever you are. The sky's sun/moon position and the tempo/scale mapping follow *that place's* real local time (computed from the location's UTC offset, `lib/localHour.ts`), not the browser's own clock, so a picked city's night actually looks like night there. The choice persists across reloads; "Use my location" reverts to normal geolocation

### Session Capture

- **Recording**: taps the master bus into a `MediaStreamAudioDestinationNode` and records it with `MediaRecorder` (WebM/Opus where supported); stop recording and a "Download recording" link appears. Purely local capture, nothing is ever uploaded.

### Backend

- **Weather proxy**: server-side Open-Meteo fetch with a 5-minute in-memory cache, so bursty client polling never hammers the upstream API
- **IP geolocation fallback**: when browser geolocation is denied, the server best-effort resolves a location from the request IP, then falls back to a configured default
- **Presets API**: save/load/delete named snapshots of the resolved synthesis parameters (JSON-file backed), so you can recall a sound you liked as a manual override independent of live or simulated inputs
- **Static hosting**: serves the built client in production from the same Express process

### Presets: Local-First

- Preset save/load/delete goes through the backend when it's reachable, and **transparently falls back to `localStorage`** on any network failure. The UI shows an "offline · saved locally" badge so it's never a silent surprise. The client works as a presets-capable tool even with no backend running at all.

### Sharing

- **Copy share link** encodes the currently resolved sound (not the raw weather/time inputs, the actual `AmbientParams`) into a `?sound=` URL query param (`lib/shareLink.ts`). Opening that link loads it as a one-time manual override, same mechanism as loading a preset, then the URL is cleaned up so a refresh doesn't reapply it. The decoder validates every field before trusting it, so a malformed or tampered link just fails quietly instead of crashing the app.

### PWA

- Installable app shell (`manifest.webmanifest` + a minimal same-origin service worker that deliberately never caches `/api/*`, so weather/presets always stay live), with an SVG icon plus rasterized 192×192/512×512 PNGs for install flows that need them
- **Screen Wake Lock** while the engine is playing, so a phone or tablet doesn't fall asleep mid-session, with automatic re-acquisition if the tab regains visibility

### UI/UX: "Living Sky"

- The background **is** the interface, not decoration on top of one: a full-viewport sky whose gradient, sun/moon arc position, star density, and rain streaks are computed directly from the real hour and weather (`sky/skyMath.ts`, pure and unit-tested). These are the same inputs driving the synthesis engine, rendered instead of just logged
- Atmospheric depth beyond the flat gradient: a distant rolling-hills silhouette (tinted with the same day→night blend as the sky), a warm horizon glow that blooms in specifically around real sunrise/sunset and fades once the sun clears the horizon, and a field of slow-drifting ambient particles so the scene stays alive even on a still, clear, cloudless day
- Precipitation renders as rain or snow depending on the actual weather type, and a thunderstorm brings a randomized screen-flash lightning strike (`useLightning.ts`) paired with a low rumbling boom from the audio engine (`AudioEngine.triggerThunder()`); both are skipped under `prefers-reduced-motion` for the visual side
- A single minimal glass "now playing" tray floats at the bottom: time, a short weather/scale/tempo readout, a live waveform, play/stop, volume, and record. Everything else stays out of the way
- Every other control (Simulate mode, per-layer mixer, presets, the full input/parameter readout) lives in a collapsible "Studio" drawer styled as an instrument HUD: corner-bracketed panels, a segmented Live/Simulate toggle, and the same glowing brass slider skin used everywhere else, instead of raw browser form controls. Closeable three ways (an explicit close button, clicking outside, or Escape) after early feedback that the original tiny toggle icon was too easy to lose track of
- Start/Stop gated behind a user gesture (per browser autoplay policy), with a Space-bar shortcut once the page has focus (ignored while typing in a text field, so it doesn't hijack the preset-name input)
- **OS media controls** (`useMediaSession.ts`): publishes "Scale · Tempo" as now-playing metadata with real play/pause controls to the lock screen, notification shade, Control Center, or Chrome's media widget, so a session can be controlled after the screen locks or the tab is backgrounded, not just from inside the page
- **Volume and mixer levels persist** across reloads (`lib/localSettings.ts`); a "leave it running" tool shouldn't make you re-balance the mix every time you open the tab
- Deliberately single dark visual world (no light-mode toggle). A night sky doesn't make sense re-skinned light, so the app commits to one presentation instead of following the OS theme preference
- **First-run onboarding hint**: a one-time callout explaining what the app is reacting to and where the Studio lives, dismissed on "Got it" or automatically on first Start; the dismissal persists across reloads (`lib/localSettings.ts`)

### Resilience & Accessibility

- **React error boundary** (`components/ErrorBoundary.tsx`): a top-level class component wraps the whole app, so a thrown error during render doesn't blank the page. Shows a plain-language fallback with a Refresh button instead of a white screen
- **Studio drawer is a real focus trap, not just a visual overlay**: the main view and the drawer toggle native `inert` on each other based on which is open, so a closed drawer's controls are fully unreachable by Tab (not just visually hidden), and an open drawer keeps focus from leaking back to the page behind it. Opening the drawer moves focus to its close button; closing it returns focus to the toggle
- **Disambiguated per-item labels**: repeated "Load"/"Delete" buttons in the presets list carry item-specific `aria-label`s (e.g. "Load preset Rainy Night") instead of generic, indistinguishable ones
- **Visible focus retained everywhere inputs suppress the native outline**: the preset name field's focus ring comes from `:focus-within` on its parent row instead of disappearing

---

## Tech Stack

| Layer | Technology | Details |
|-------|-----------|---------|
| **Frontend Framework** | React 18 + TypeScript | Vite dev server + build, strict TS config |
| **Audio Synthesis** | Tone.js 15 (Web Audio API) | Oscillators, filters, envelopes, LFOs, noise generators (no sample playback) |
| **Recording** | `MediaRecorder` + `MediaStreamAudioDestinationNode` | Local-only capture of the live master bus |
| **State** | React hooks | `useTimeOfDay`, `useWeather`, `useActivity`, `useRecorder`, `useWakeLock`; no external state library needed |
| **PWA** | Web App Manifest + Service Worker + Wake Lock API | Installable shell, offline app cache, screen-sleep prevention |
| **OS Media Controls** | Media Session API | Lock-screen/notification play-pause + now-playing metadata |
| **Backend Framework** | Express (Node.js, ESM) | Weather proxy, IP geolocation fallback, presets CRUD, static hosting |
| **Weather Data** | Open-Meteo | Free, keyless current-conditions API |
| **Geocoding** | Open-Meteo Geocoding API | Free, keyless city search for the location picker, called directly from the client |
| **IP Geolocation** | ipapi.co | Free-tier, keyless fallback when browser geolocation is denied |
| **Persistence** | Flat JSON file (`server/data/presets.json`) + `localStorage` fallback | No database dependency; client-only mode still works |
| **Testing** | Vitest + Supertest | Pure-logic unit tests (client) and HTTP-level route tests (server) |
| **Dev Orchestration** | `concurrently` + `cross-env` | Runs client + server dev servers with one `npm run dev`; `cross-env` sets `PORT` cross-platform (works in PowerShell, not just bash) |

---

## Prerequisites

- **Node.js 18+**: [Download here](https://nodejs.org/) (needs global `fetch`)

No API keys, no database, no Docker required.

---

## Quick Start

```bash
npm run install:all   # installs root, server, and client dependencies
npm run dev            # runs API on :3001 and Vite dev server on :5273 (proxies /api)
```

Open `http://localhost:5273`, click **Start** (audio requires a user gesture), and allow location access if you want weather personalized to where you are. Otherwise it falls back to IP-based geolocation, then to a configured default location.

### Production

```bash
npm run build   # builds the client into client/dist (also enables the PWA service worker)
npm start        # Express serves the API + the built client on :5273 (one process, one port)
```

Note the port story is different between the two modes: in **dev**, the Vite client (`:5273`) and the Express API (`:3001`, proxied) are two separate processes that have to run side by side on different ports. In **production**, there's no Vite server at all. Express alone serves the built client and the API from a single process, and that's what defaults to `:5273` (override with the `PORT` env var).

### Tests

```bash
npm test   # runs the server suite (Vitest + Supertest), then the client suite (Vitest)
```

---

## Project Structure

```
ambient-weather-engine/
├── README.md
├── LICENSE
├── package.json                 # root dev orchestration (concurrently) + test runner
│
├── server/
│   ├── package.json
│   ├── vitest.config.js
│   ├── data/presets.json        # flat-file preset store
│   ├── test/
│   │   ├── health.test.js
│   │   ├── weather.test.js      # mocked Open-Meteo, cache + fallback paths
│   │   ├── presets.test.js      # CRUD against an isolated temp data file
│   │   └── geolocateIp.test.js
│   └── src/
│       ├── app.js               # createApp(): Express app (importable by tests)
│       ├── index.js             # createApp().listen(...)
│       ├── routes/
│       │   ├── weather.js       # Open-Meteo proxy + cache + geolocation fallback
│       │   └── presets.js       # preset CRUD
│       └── lib/
│           └── geolocateIp.js   # keyless IP → lat/lon best-effort lookup
│
└── client/
    ├── package.json
    ├── vite.config.ts           # dev proxy: /api → :3001
    ├── vitest.config.ts
    ├── tsconfig.json
    ├── index.html
    ├── public/
    │   ├── manifest.webmanifest
    │   ├── sw.js                 # app-shell service worker (never caches /api/*)
    │   ├── icon.svg
    │   ├── icon-192.png
    │   └── icon-512.png
    └── src/
        ├── main.tsx              # SW registration (production builds only), wraps <App> in <ErrorBoundary>
        ├── App.tsx               # wires inputs → mapping → engine → sky/tray/drawer
        ├── types.ts
        ├── audio/
        │   ├── AudioEngine.ts        # the DSP: layers, loops, mixer, recording tap, thunder
        │   ├── musicTheory.ts        # scales, chords, scale-degree random walk
        │   └── musicTheory.test.ts
        ├── sky/
        │   ├── skyMath.ts            # sun/moon arc, sky gradient, star opacity (pure)
        │   └── skyMath.test.ts
        ├── inputs/
        │   ├── useTimeOfDay.ts       # accepts a UTC-offset override for a picked location
        │   ├── useWeather.ts         # accepts a lat/lon override for a picked location
        │   ├── useActivity.ts
        │   ├── useRecorder.ts        # MediaRecorder lifecycle → downloadable blob URL
        │   ├── useWakeLock.ts
        │   ├── useLightning.ts       # randomized strike timing for storm sky/audio
        │   ├── useLightning.test.ts
        │   └── useMediaSession.ts    # OS lock-screen/notification play-pause + metadata
        ├── lib/
        │   ├── presetsStore.ts       # backend-first, localStorage-fallback preset CRUD
        │   ├── presetsStore.test.ts
        │   ├── weatherIntensity.ts   # shared rain-mm → 0..1 intensity (audio + sky)
        │   ├── weatherIntensity.test.ts
        │   ├── weatherLabel.ts       # short weather word for the tray ("LIGHT RAIN")
        │   ├── weatherLabel.test.ts
        │   ├── weatherCode.ts        # WMO code classifiers: isSnowing, isThunderstorm
        │   ├── weatherCode.test.ts
        │   ├── formatTime.ts         # fractional hour → "HH:MM"
        │   ├── formatTime.test.ts
        │   ├── localHour.ts          # UTC offset + real time → a location's local hour
        │   ├── localHour.test.ts
        │   ├── geocode.ts            # city name search (Open-Meteo geocoding, client-side)
        │   ├── geocode.test.ts
        │   ├── localSettings.ts      # localStorage load/save for volume, mix, location, onboarding-seen flag
        │   ├── localSettings.test.ts
        │   ├── shareLink.ts          # AmbientParams ↔ URL query param, validated
        │   ├── shareLink.test.ts
        │   └── clipboard.ts          # copy-to-clipboard with a legacy fallback
        ├── mapping/
        │   ├── parameterMapping.ts   # pure function: inputs → AmbientParams (+ nightness)
        │   └── parameterMapping.test.ts
        └── components/
            ├── SkyScene.tsx          # full-viewport animated background
            ├── NowPlayingTray.tsx    # primary glass panel: time, meta, transport
            ├── ControlPanel.tsx      # Studio drawer: simulate sliders, mixer, presets
            ├── LocationPicker.tsx    # city search, inside the Studio drawer
            ├── StatusPanel.tsx       # compact input/parameter readout, inside the drawer
            ├── Visualizer.tsx
            ├── ErrorBoundary.tsx     # top-level render-error fallback
            └── OnboardingHint.tsx    # one-time first-run callout
```

---

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/health` | Liveness check |
| GET | `/api/weather?lat=&lon=` | Current weather; falls back to IP geolocation, then a default location, when coordinates are omitted |
| GET | `/api/presets` | List saved presets |
| POST | `/api/presets` | Save/overwrite a preset (`{ name, params }`) |
| DELETE | `/api/presets/:name` | Delete a preset |

---

## Configuration

Optional environment variables for the server:

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | `5273` | Server port. `npm run dev` overrides this to `3001` for the API process specifically, so it doesn't collide with the Vite client dev server also on `5273`; see the Production note above |
| `DEFAULT_LAT` / `DEFAULT_LON` | London (`51.5074` / `-0.1278`) | Fallback coordinates when neither browser geolocation nor IP geolocation succeed |
| `PRESETS_DATA_FILE` | `server/data/presets.json` | Overrides the preset store path, used by the test suite to isolate test data from real presets |

---

## Architecture

```
                ┌───────────────────────────────┐
                │   React + Vite (Port 5273)    │
                │   Tone.js synthesis engine     │
                │   mixer + recorder + wake lock │
                │   time / weather / activity     │
                │   input hooks → param mapping   │
                └──────────────┬─────────────────┘
                               │ REST (/api/*), presets fall back to
                               │ localStorage when this is unreachable
                ┌──────────────▼─────────────────┐
                │   Express (Port 3001)           │
                │   weather proxy + cache          │
                │   IP geolocation fallback         │
                │   presets CRUD                    │
                └──────┬─────────────┬─────────────┘
                       │             │
              ┌────────▼───┐   ┌─────▼──────────┐
              │ Open-Meteo  │   │ presets.json    │
              │ (weather)   │   │ (flat file)      │
              └─────────────┘   └─────────────────┘
```

---

## Testing

```bash
npm test                         # both suites, from the repo root
npm test --prefix server         # Vitest + Supertest: health/weather/presets routes, IP-privacy check
npm test --prefix client         # Vitest: musicTheory, parameterMapping, skyMath, presetsStore fallback, etc.
```

Coverage is intentionally scoped to deterministic, side-effect-free logic: pure functions (`musicTheory.ts`, `parameterMapping.ts`, `skyMath.ts`, `weatherIntensity.ts`, `weatherLabel.ts`, `formatTime.ts`), the preset store's network-failure fallback, and the Express routes (with `fetch` mocked and the data file redirected to a temp path via `PRESETS_DATA_FILE`). The stateful, Tone.js-dependent `AudioEngine` and the DOM-heavy `SkyScene`/`NowPlayingTray` components are exercised by manual/browser testing rather than unit tests, since they wrap live Web Audio nodes and CSS animation respectively. That's also exactly how a real bug got caught during development: a color-mixing helper was accidentally fed an already-stringified `rgb(...)` value back into a hex-only parser, silently producing `NaN` channels that the browser's CSSOM rejected outright (an empty inline style, sky rendered black) while the original loose regex-based unit test didn't notice. The fix keeps color math in an `{r,g,b}` object until the final CSS-string conversion, and the test now asserts well-formed, in-range `rgb()` output across the whole input range instead of a loose brightness proxy.

---

## Honest Limitations

- **"System activity" is not real OS telemetry.** A browser sandbox can't read CPU/process load, so this is a deliberate proxy built from keyboard/mouse/scroll cadence and tab-visibility, documented as such rather than dressed up as something it isn't.
- **IP geolocation only resolves once deployed** with a real public IP; on localhost it always falls back to the configured default coordinates.
- ~~The sky can show the "wrong" sun/moon if the weather location's timezone doesn't match the browser's clock~~ **Fixed**: adding the location picker meant computing a location's real local hour from its UTC offset (`lib/localHour.ts`) rather than trusting the browser's own clock, and that fix applies universally, not just when a location is deliberately picked. Whatever location the weather ends up resolving to (your own, an IP guess, or the configured default), the sky's sun/moon now follows that place's actual time.
- **The IP-geolocation fallback is automatic, not opt-in.** Unlike browser geolocation (an explicit permission prompt), if you deny that prompt the backend silently tries to approximate your location from your IP via a third party (ipapi.co) with no separate consent step. This is disclosed both here and directly in the app's Studio drawer, and the "Weather" line always names which source (`client` / `ip` / `default`) is actually in use, but it's still worth knowing it happens.
- **Weather coordinates travel in a GET query string** (`/api/weather?lat=&lon=`) rather than a POST body. Low risk since it's a same-origin request to this app's own backend, but query strings can end up in server access logs, which isn't best practice for anything more sensitive than approximate weather-lookup coordinates.
- **The PWA icons aren't maskable-safe.** The SVG and PNG icons are tagged `purpose: "any"`, not `"maskable"`; a maskable variant needs extra padding so OS icon masks (circle, squircle, etc.) don't clip the artwork, which the current layout doesn't guarantee.
- React's `<StrictMode>` is intentionally omitted: its dev-mode double effect invocation tears down and rebuilds the live Tone.js audio graph mid-session, which is more confusing than useful here.

---

## Suggested Future Features

- **Additional live inputs**: season/day-of-week for longer-period variety, or a simple binaural/isochronic layer toggle for a focus-mode variant
- **Multi-listener sync**: a WebSocket relay so multiple browser tabs/people hear the same generative session in phase, for shared "listening rooms"
- **Dockerization**: a `docker-compose.yml` bundling client + server for one-command deployment, mirroring the setup used in other projects in this portfolio
- **Maskable PWA icon variant**: a version of the icon with enough safe-zone padding to survive OS icon masking, addressing the limitation noted above

---

## Author

**Sagnik**

GitHub: [@HalcyonVector](https://github.com/HalcyonVector)

---

## 📄 License

MIT License. See [LICENSE](./LICENSE). Free to use, modify, and distribute, with no warranty.
