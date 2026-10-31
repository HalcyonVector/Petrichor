import * as Tone from 'tone';
import { drumHitsForStep } from './drumPattern';
import { buildChord, midiToNoteName, nextChordDegree, scaleDegreeToMidi } from './musicTheory';
import type { ScaleName } from '../types';
import type { AmbientParams } from '../types';

const DEFAULT_PARAMS: AmbientParams = {
  tempo: 70,
  scaleMode: 'major',
  rootNote: 48,
  octaveShift: 0,
  brightness: 0.5,
  padVoices: 3,
  arpDensity: 0.3,
  hihatDensity: 0.1,
  drumDensity: 0.3,
  rainAmount: 0,
  windModulation: 0.2,
  warmth: 0.5,
  reverbWet: 0.4,
};

export type MixLayer = 'pad' | 'bass' | 'arp' | 'hihat' | 'drums' | 'rain';

/** Used for presets and share links saved before the drum layer existed. */
const FALLBACK_DRUM_DENSITY = 0.3;
/** Lo-fi lilt on the 16ths. Shared by the drums and the hi-hat. */
const SWING = 0.18;

// Base levels each layer sits at when its mix control is at 1 (100%) — the
// same balance the engine has always used, now expressed as a starting
// point the per-layer mixer multiplies against.
const BASE_DB: Record<'pad' | 'bass' | 'arp' | 'hihat' | 'kick' | 'rim', number> = {
  pad: -12,
  bass: -15,
  arp: -18,
  hihat: -24,
  kick: -13,
  rim: -21,
};
const RAIN_BASE_GAIN = 0.18;

/**
 * The synthesis engine: a handful of Tone.js layers (pad, sub bass, plucked
 * arp, hihat, filtered rain noise) driven by Tone.Transport loops. All
 * musical decisions (which chord, which note) are made live inside the loop
 * callbacks so `updateParams` can reshape the sound of a piece that's
 * already playing, rather than restarting anything.
 */
export class AudioEngine {
  private params: AmbientParams = DEFAULT_PARAMS;
  private started = false;
  private chordDegree = 0;
  // The key and mode actually sounding right now. Live params can change at
  // any moment (a mode threshold crossed, midnight's key change), but these
  // only catch up at the next chord change, so the harmony never shifts in
  // the middle of a phrase and the arp always agrees with the pad.
  private harmonyScale: ScaleName = DEFAULT_PARAMS.scaleMode;
  private harmonyRoot = DEFAULT_PARAMS.rootNote + DEFAULT_PARAMS.octaveShift * 12;
  private mixLevels: Record<MixLayer, number> = { pad: 1, bass: 1, arp: 1, hihat: 1, drums: 1, rain: 1 };

  private master!: Tone.Gain;
  private analyser!: Tone.Analyser;
  private reverb!: Tone.Reverb;
  private padFilter!: Tone.Filter;
  private filterLfo!: Tone.LFO;
  private panLfo!: Tone.LFO;
  private panner!: Tone.Panner;

  private padSynth!: Tone.PolySynth<Tone.Synth>;
  private bassSynth!: Tone.MonoSynth;
  private arpSynth!: Tone.PluckSynth;
  private hihat!: Tone.NoiseSynth;
  private kick!: Tone.MembraneSynth;
  private kickFilter!: Tone.Filter;
  private rim!: Tone.NoiseSynth;
  private rimFilter!: Tone.Filter;
  private rainNoise!: Tone.Noise;
  private rainFilter!: Tone.Filter;
  private rainGain!: Tone.Gain;
  private thunderSynth!: Tone.NoiseSynth;
  private thunderFilter!: Tone.Filter;

  private padLoop?: Tone.Loop;
  private arpLoop?: Tone.Loop;
  private hihatLoop?: Tone.Loop;
  private drumLoop?: Tone.Loop;

  private recordingDestination?: MediaStreamAudioDestinationNode;

  private built = false;

  /** Builds the audio graph. Safe to call before Tone.start() — nodes just sit silent. */
  private build() {
    if (this.built) return;
    this.built = true;

    this.master = new Tone.Gain(0.85).toDestination();
    this.analyser = new Tone.Analyser('waveform', 1024);
    this.master.connect(this.analyser);

    this.panner = new Tone.Panner(0).connect(this.master);
    this.panLfo = new Tone.LFO({ frequency: 0.03, min: -0.6, max: 0.6 }).connect(this.panner.pan);
    this.panLfo.start();

    this.reverb = new Tone.Reverb({ decay: 9, wet: DEFAULT_PARAMS.reverbWet, preDelay: 0.05 });
    this.reverb.connect(this.panner);

    this.padFilter = new Tone.Filter({ frequency: 900, type: 'lowpass', rolloff: -24, Q: 0.7 });
    this.padFilter.connect(this.reverb);
    this.filterLfo = new Tone.LFO({ frequency: 0.05, min: 300, max: 1800 });
    this.filterLfo.connect(this.padFilter.frequency);
    this.filterLfo.start();

    this.padSynth = new Tone.PolySynth(Tone.Synth, {
      oscillator: { type: 'fatsawtooth', count: 3, spread: 20 },
      envelope: { attack: 4, decay: 2, sustain: 0.65, release: 8 },
    });
    this.padSynth.connect(this.padFilter);

    this.bassSynth = new Tone.MonoSynth({
      oscillator: { type: 'sine' },
      envelope: { attack: 2, decay: 1, sustain: 0.8, release: 5 },
      filter: { type: 'lowpass', frequency: 500, rolloff: -12 },
      filterEnvelope: { attack: 2, decay: 1, sustain: 0.9, release: 5, baseFrequency: 80, octaves: 2 },
    });
    this.bassSynth.connect(this.reverb);

    this.arpSynth = new Tone.PluckSynth({ attackNoise: 0.6, dampening: 3200, resonance: 0.86 });
    this.arpSynth.connect(this.padFilter);

    this.hihat = new Tone.NoiseSynth({
      noise: { type: 'white' },
      envelope: { attack: 0.001, decay: 0.06, sustain: 0, release: 0.02 },
    });
    this.hihat.connect(this.master);

    // Lo-fi drums: a soft, round kick with its top end rolled off, and a short
    // band-passed noise click standing in for a rim shot. Both are pure
    // synthesis like everything else.
    this.kickFilter = new Tone.Filter({ frequency: 700, type: 'lowpass', rolloff: -24 });
    this.kickFilter.connect(this.master);
    this.kick = new Tone.MembraneSynth({
      pitchDecay: 0.04,
      octaves: 5,
      oscillator: { type: 'sine' },
      envelope: { attack: 0.002, decay: 0.38, sustain: 0, release: 0.1 },
    });
    this.kick.connect(this.kickFilter);

    this.rimFilter = new Tone.Filter({ frequency: 1900, type: 'bandpass', Q: 2.5 });
    this.rimFilter.connect(this.master);
    this.rimFilter.connect(this.reverb);
    this.rim = new Tone.NoiseSynth({
      noise: { type: 'white' },
      envelope: { attack: 0.001, decay: 0.045, sustain: 0, release: 0.02 },
    });
    this.rim.connect(this.rimFilter);

    this.rainFilter = new Tone.Filter({ frequency: 2200, type: 'bandpass', Q: 0.6 });
    this.rainGain = new Tone.Gain(0).connect(this.master);
    this.rainFilter.connect(this.rainGain);
    this.rainNoise = new Tone.Noise('pink').connect(this.rainFilter);
    this.rainNoise.start();

    this.thunderFilter = new Tone.Filter({ frequency: 300, type: 'lowpass', rolloff: -24 });
    this.thunderFilter.connect(this.reverb);
    this.thunderSynth = new Tone.NoiseSynth({
      noise: { type: 'brown' },
      envelope: { attack: 0.01, decay: 1.8, sustain: 0, release: 2.5 },
    });
    this.thunderSynth.volume.value = -6;
    this.thunderSynth.connect(this.thunderFilter);

    Tone.Transport.bpm.value = this.params.tempo;
    Tone.Transport.swingSubdivision = '16n';
    Tone.Transport.swing = SWING;

    this.applyPadVolume();
    this.applyBassVolume();
    this.applyArpVolume();
    this.applyHihatVolume();
    this.applyDrumVolume();
    this.applyRainGain();
  }

  async start() {
    this.build();
    if (this.started) return;
    await Tone.start();
    this.scheduleLoops();
    Tone.Transport.start();
    this.started = true;
  }

  stop() {
    if (!this.started) return;
    Tone.Transport.stop();
    this.padLoop?.dispose();
    this.arpLoop?.dispose();
    this.hihatLoop?.dispose();
    this.drumLoop?.dispose();
    this.padLoop = this.arpLoop = this.hihatLoop = this.drumLoop = undefined;
    this.started = false;
  }

  isStarted() {
    return this.started;
  }

  getAnalyser(): Tone.Analyser | null {
    return this.built ? this.analyser : null;
  }

  setMasterVolume(linear01: number) {
    if (!this.built) return;
    const clamped = Math.max(0, Math.min(1, linear01));
    this.master.gain.rampTo(clamped, 0.2);
  }

  /**
   * Per-layer mix control, independent of the automatic weather/time/activity
   * mapping. `level` is a linear multiplier: 1 = the layer's normal level,
   * 0 = silent. Safe to call before the engine is built — the level is
   * just remembered and applied once `build()` runs.
   */
  setLayerMix(layer: MixLayer, level: number) {
    this.mixLevels[layer] = Math.max(0, Math.min(1.5, level));
    if (!this.built) return;
    switch (layer) {
      case 'pad':
        this.applyPadVolume();
        break;
      case 'bass':
        this.applyBassVolume();
        break;
      case 'arp':
        this.applyArpVolume();
        break;
      case 'hihat':
        this.applyHihatVolume();
        break;
      case 'drums':
        this.applyDrumVolume();
        break;
      case 'rain':
        this.applyRainGain();
        break;
    }
  }

  /**
   * Taps the master bus into a MediaStreamAudioDestinationNode so the live
   * output can be fed to a MediaRecorder. Created lazily and reused across
   * calls — this is a permanent tap, not a per-recording connection.
   */
  getRecordingStream(): MediaStream | null {
    if (!this.built) return null;
    if (!this.recordingDestination) {
      const rawContext = Tone.getContext().rawContext as unknown as AudioContext;
      this.recordingDestination = rawContext.createMediaStreamDestination();
      this.master.connect(this.recordingDestination);
    }
    return this.recordingDestination.stream;
  }

  /** A one-off rumble for a lightning strike during a thunderstorm — not part of the continuous mix. */
  triggerThunder() {
    if (!this.built || !this.started) return;
    const now = Tone.now();
    this.thunderFilter.frequency.cancelScheduledValues(now);
    this.thunderFilter.frequency.setValueAtTime(500, now);
    this.thunderFilter.frequency.exponentialRampToValueAtTime(120, now + 1.6);
    this.thunderSynth.triggerAttackRelease('2n', now);
  }

  updateParams(next: AmbientParams) {
    this.params = next;
    if (!this.built) return;

    Tone.Transport.bpm.rampTo(next.tempo, 4);

    const cutoffCenter = 200 + next.brightness * 4200;
    const cutoffSpread = 250 + next.windModulation * 900;
    this.filterLfo.min = Math.max(80, cutoffCenter - cutoffSpread);
    this.filterLfo.max = cutoffCenter + cutoffSpread;
    this.filterLfo.frequency.rampTo(0.015 + next.windModulation * 0.25, 3);

    this.panLfo.frequency.rampTo(0.01 + next.windModulation * 0.08, 3);

    this.applyRainGain();
    this.rainFilter.frequency.rampTo(1400 + next.brightness * 2600, 3);

    this.reverb.wet.rampTo(next.reverbWet, 2);

    const detuneSpread = 8 + (1 - next.warmth) * 35; // colder => more detuned/dissonant spread
    // Warmer weather swells in more slowly; cold weather is crisper.
    const padAttack = 2.5 + next.warmth * 3;
    this.padSynth.set({ oscillator: { spread: detuneSpread }, envelope: { attack: padAttack } });
    // Cold makes the plucks glassy and bright, warmth makes them rounder.
    this.arpSynth.dampening = 1800 + (1 - next.warmth) * 3400;

    this.applyHihatVolume();
  }

  private mixToDb(mix: number): number {
    return Tone.gainToDb(Math.max(0.001, mix));
  }

  private applyPadVolume() {
    this.padSynth.volume.rampTo(BASE_DB.pad + this.mixToDb(this.mixLevels.pad), 0.2);
  }

  private applyBassVolume() {
    this.bassSynth.volume.rampTo(BASE_DB.bass + this.mixToDb(this.mixLevels.bass), 0.2);
  }

  private applyArpVolume() {
    this.arpSynth.volume.rampTo(BASE_DB.arp + this.mixToDb(this.mixLevels.arp), 0.2);
  }

  private applyHihatVolume() {
    const densityDb = this.params.hihatDensity * 6;
    this.hihat.volume.rampTo(BASE_DB.hihat + densityDb + this.mixToDb(this.mixLevels.hihat), 1);
  }

  private applyDrumVolume() {
    const mixDb = this.mixToDb(this.mixLevels.drums);
    this.kick.volume.rampTo(BASE_DB.kick + mixDb, 0.2);
    this.rim.volume.rampTo(BASE_DB.rim + mixDb, 0.2);
  }

  private applyRainGain() {
    this.rainGain.gain.rampTo(this.params.rainAmount * RAIN_BASE_GAIN * this.mixLevels.rain, 2);
  }

  private targetRoot() {
    return this.params.rootNote + this.params.octaveShift * 12;
  }

  /** Brings the sounding key/mode up to date. Called only on chord changes. */
  private latchHarmony(): boolean {
    const root = this.targetRoot();
    const changed = root !== this.harmonyRoot || this.params.scaleMode !== this.harmonyScale;
    this.harmonyRoot = root;
    this.harmonyScale = this.params.scaleMode;
    return changed;
  }

  private scheduleLoops() {
    this.padLoop = new Tone.Loop((time) => {
      // A new key or mode lands on its tonic chord, so the change is heard
      // as arriving somewhere rather than as a wrong note.
      const harmonyChanged = this.latchHarmony();
      this.chordDegree = harmonyChanged ? 0 : nextChordDegree(this.chordDegree);
      const root = this.harmonyRoot;
      const scale = this.harmonyScale;
      const chordSize = Math.max(3, Math.min(6, Math.round(this.params.padVoices)));
      const chord = buildChord(root, scale, this.chordDegree, chordSize);
      const notes = chord.map(midiToNoteName);
      this.padSynth.triggerAttackRelease(notes, '2m', time);

      if (Math.random() < 0.65) {
        // The bass follows the chord's own root, which is what makes the
        // progression readable underneath the pad.
        const bassNote = midiToNoteName(scaleDegreeToMidi(root - 12, scale, this.chordDegree));
        this.bassSynth.triggerAttackRelease(bassNote, '1m', time);
      }
    }, '2m').start(0);

    this.arpLoop = new Tone.Loop((time) => {
      if (Math.random() > this.params.arpDensity) return;
      const root = this.harmonyRoot + 12;
      const offsets = [0, 2, 4, 6];
      const degree = this.chordDegree + offsets[Math.floor(Math.random() * offsets.length)];
      const midi = scaleDegreeToMidi(root, this.harmonyScale, degree);
      this.arpSynth.triggerAttackRelease(midiToNoteName(midi), '8n', time);
    }, '8n').start(0);

    this.hihatLoop = new Tone.Loop((time) => {
      if (Math.random() < this.params.hihatDensity) {
        this.hihat.triggerAttackRelease('16n', time);
      }
    }, '16n').start(0);

    // Step position comes from the transport itself, so the pattern stays
    // locked to the bar line however the tempo ramps.
    const ticksPer16th = Tone.Transport.PPQ / 4;
    this.drumLoop = new Tone.Loop((time) => {
      const step = Math.round(Tone.Transport.getTicksAtTime(time) / ticksPer16th) % 16;
      const { kick, rim } = drumHitsForStep(step, this.params.drumDensity ?? FALLBACK_DRUM_DENSITY);
      if (kick > 0) this.kick.triggerAttackRelease('F1', '8n', time, kick);
      if (rim > 0) this.rim.triggerAttackRelease('32n', time, rim);
    }, '16n').start(0);
  }

  dispose() {
    this.stop();
    if (!this.built) return;
    if (this.recordingDestination) {
      this.master.disconnect(this.recordingDestination);
      this.recordingDestination = undefined;
    }
    [
      this.master, this.analyser, this.reverb, this.padFilter, this.filterLfo, this.panLfo, this.panner,
      this.padSynth, this.bassSynth, this.arpSynth, this.hihat, this.kick, this.kickFilter, this.rim, this.rimFilter,
      this.rainNoise, this.rainFilter, this.rainGain,
      this.thunderSynth, this.thunderFilter,
    ].forEach((node) => node?.dispose());
    this.built = false;
  }
}
