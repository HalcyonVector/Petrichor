import * as Tone from 'tone';
import { buildChord, midiToNoteName, randomWalkDegree, scaleDegreeToMidi } from './musicTheory';
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
  rainAmount: 0,
  windModulation: 0.2,
  warmth: 0.5,
  reverbWet: 0.4,
};

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
  private rainNoise!: Tone.Noise;
  private rainFilter!: Tone.Filter;
  private rainGain!: Tone.Gain;

  private padLoop?: Tone.Loop;
  private arpLoop?: Tone.Loop;
  private hihatLoop?: Tone.Loop;

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
    this.padSynth.volume.value = -12;
    this.padSynth.connect(this.padFilter);

    this.bassSynth = new Tone.MonoSynth({
      oscillator: { type: 'sine' },
      envelope: { attack: 2, decay: 1, sustain: 0.8, release: 5 },
      filter: { type: 'lowpass', frequency: 500, rolloff: -12 },
      filterEnvelope: { attack: 2, decay: 1, sustain: 0.9, release: 5, baseFrequency: 80, octaves: 2 },
    });
    this.bassSynth.volume.value = -15;
    this.bassSynth.connect(this.reverb);

    this.arpSynth = new Tone.PluckSynth({ attackNoise: 0.6, dampening: 3200, resonance: 0.86 });
    this.arpSynth.volume.value = -18;
    this.arpSynth.connect(this.padFilter);

    this.hihat = new Tone.NoiseSynth({
      noise: { type: 'white' },
      envelope: { attack: 0.001, decay: 0.06, sustain: 0, release: 0.02 },
    });
    this.hihat.volume.value = -24;
    this.hihat.connect(this.master);

    this.rainFilter = new Tone.Filter({ frequency: 2200, type: 'bandpass', Q: 0.6 });
    this.rainGain = new Tone.Gain(0).connect(this.master);
    this.rainFilter.connect(this.rainGain);
    this.rainNoise = new Tone.Noise('pink').connect(this.rainFilter);
    this.rainNoise.start();

    Tone.Transport.bpm.value = this.params.tempo;
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
    this.padLoop = this.arpLoop = this.hihatLoop = undefined;
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

    this.rainGain.gain.rampTo(next.rainAmount * 0.18, 2);
    this.rainFilter.frequency.rampTo(1400 + next.brightness * 2600, 3);

    this.reverb.wet.rampTo(next.reverbWet, 2);

    const detuneSpread = 8 + (1 - next.warmth) * 35; // colder => more detuned/dissonant spread
    this.padSynth.set({ oscillator: { spread: detuneSpread } });

    this.hihat.volume.rampTo(-24 + next.hihatDensity * 6, 1);
  }

  private currentRoot() {
    return this.params.rootNote + this.params.octaveShift * 12;
  }

  private scheduleLoops() {
    this.padLoop = new Tone.Loop((time) => {
      this.chordDegree = randomWalkDegree(this.chordDegree);
      const root = this.currentRoot();
      const chordSize = Math.max(3, Math.min(6, Math.round(this.params.padVoices)));
      const chord = buildChord(root, this.params.scaleMode, this.chordDegree, chordSize);
      const notes = chord.map(midiToNoteName);
      this.padSynth.triggerAttackRelease(notes, '2m', time);

      if (Math.random() < 0.65) {
        const bassNote = midiToNoteName(root - 12);
        this.bassSynth.triggerAttackRelease(bassNote, '1m', time);
      }
    }, '2m').start(0);

    this.arpLoop = new Tone.Loop((time) => {
      if (Math.random() > this.params.arpDensity) return;
      const root = this.currentRoot() + 12;
      const offsets = [0, 2, 4, 6];
      const degree = this.chordDegree + offsets[Math.floor(Math.random() * offsets.length)];
      const midi = scaleDegreeToMidi(root, this.params.scaleMode, degree);
      this.arpSynth.triggerAttackRelease(midiToNoteName(midi), '8n', time);
    }, '8n').start(0);

    this.hihatLoop = new Tone.Loop((time) => {
      if (Math.random() < this.params.hihatDensity) {
        this.hihat.triggerAttackRelease('16n', time);
      }
    }, '16n').start(0);
  }

  dispose() {
    this.stop();
    if (!this.built) return;
    [
      this.master, this.analyser, this.reverb, this.padFilter, this.filterLfo, this.panLfo, this.panner,
      this.padSynth, this.bassSynth, this.arpSynth, this.hihat, this.rainNoise, this.rainFilter, this.rainGain,
    ].forEach((node) => node?.dispose());
    this.built = false;
  }
}
