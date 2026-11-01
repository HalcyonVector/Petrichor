export type ScaleName = 'lydian' | 'major' | 'mixolydian' | 'dorian' | 'minor' | 'phrygian';

/** Fully-resolved synthesis parameters consumed by the AudioEngine. */
export interface AmbientParams {
  tempo: number; // BPM driving Tone.Transport
  scaleMode: ScaleName;
  rootNote: number; // MIDI note number of the key, e.g. 48 = C3; changes daily
  octaveShift: number; // -2..2, register shift for the whole mix
  brightness: number; // 0..1, drives lowpass filter cutoff
  padVoices: number; // 3..6, chord size / detuned voice count
  arpDensity: number; // 0..1, probability of an arp note per 8th
  hihatDensity: number; // 0..1, probability of a hihat hit per 16th
  /** 0..1, how busy the lo-fi kick/rim groove is. Optional: presets and share links saved before it existed play a soft default groove. */
  drumDensity?: number;
  rainAmount: number; // 0..1, filtered noise "rain" layer level
  windModulation: number; // 0..1, LFO rate/depth on the filter + panning
  warmth: number; // 0..1, detune/saturation amount, lower = colder/sparser
  reverbWet: number; // 0..1
}

export interface WeatherSnapshot {
  temperatureC: number;
  precipitationMm: number;
  cloudCoverPct: number;
  windSpeedKmh: number;
  weatherCode: number;
  isDay: boolean;
  source: 'client' | 'ip' | 'default';
  city?: string | null;
  /** Seconds offset from UTC at the weather location. Used to compute that location's local hour when it's a deliberate override (not wherever the browser happens to be). */
  utcOffsetSeconds?: number;
}

export interface ActivitySnapshot {
  /** 0..1, decaying score built from keyboard/mouse/scroll cadence. */
  activity: number;
  /** 0..1, keys-per-second normalized against a comfortable typing pace. */
  typingRate: number;
  /** Page Visibility API — true when the tab is hidden/backgrounded. */
  idle: boolean;
}

export interface LiveInputs {
  hour: number; // 0..24, local time as a float
  weather: WeatherSnapshot | null;
  activity: ActivitySnapshot;
  /** 0 = 1 January. Picks the day's key; omitted means C. */
  dayOfYear?: number;
  /** 0..1 position in the lunar cycle (0 new, 0.5 full). Omitted means no moon influence. */
  moonPhase?: number;
}

export interface Preset {
  name: string;
  params: AmbientParams;
  savedAt: string;
}
