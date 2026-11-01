import * as Tone from 'tone';

/**
 * Nature textures layered over the music, all synthesized like everything
 * else: wind gusts (swelling, sweeping filtered noise), crickets (tiny high
 * chirps in threes), birdsong (short pitch-swept tweets), snow shimmer
 * (sparse high bell tones), and a slow chord swell when the sun rises or
 * sets. Everything feeds one bus, so the "Nature" mixer channel controls the
 * lot. How much of each plays is decided by the caller (AudioEngine), from
 * the mapped parameters.
 */
export class NatureVoices {
  private bus: Tone.Gain;
  private windNoise: Tone.Noise;
  private windFilter: Tone.Filter;
  private windGain: Tone.Gain;
  private cricket: Tone.Synth;
  private cricketPan: Tone.Panner;
  private bird: Tone.Synth;
  private birdPan: Tone.Panner;
  private bell: Tone.PolySynth<Tone.Synth>;
  private swellSynth: Tone.PolySynth<Tone.Synth>;

  constructor(dry: Tone.InputNode, wet: Tone.InputNode) {
    this.bus = new Tone.Gain(1);
    this.bus.connect(dry);
    this.bus.connect(wet);

    this.windGain = new Tone.Gain(0).connect(this.bus);
    this.windFilter = new Tone.Filter({ frequency: 500, type: 'bandpass', Q: 0.9 }).connect(this.windGain);
    this.windNoise = new Tone.Noise('pink').connect(this.windFilter);
    this.windNoise.start();

    this.cricketPan = new Tone.Panner(0).connect(this.bus);
    this.cricket = new Tone.Synth({
      oscillator: { type: 'sine' },
      envelope: { attack: 0.003, decay: 0.02, sustain: 0, release: 0.01 },
      volume: -31,
    }).connect(this.cricketPan);

    this.birdPan = new Tone.Panner(0).connect(this.bus);
    this.bird = new Tone.Synth({
      oscillator: { type: 'sine' },
      envelope: { attack: 0.006, decay: 0.05, sustain: 0.6, release: 0.04 },
      volume: -27,
    }).connect(this.birdPan);

    this.bell = new Tone.PolySynth({
      voice: Tone.Synth,
      maxPolyphony: 6,
      options: {
        oscillator: { type: 'sine' },
        envelope: { attack: 0.005, decay: 1.4, sustain: 0, release: 1.6 },
        volume: -24,
      },
    });
    this.bell.connect(wet);

    this.swellSynth = new Tone.PolySynth({
      voice: Tone.Synth,
      maxPolyphony: 8,
      options: {
        oscillator: { type: 'fatsine', count: 3, spread: 18 },
        envelope: { attack: 4, decay: 2, sustain: 0.6, release: 6 },
        volume: -17,
      },
    });
    this.swellSynth.connect(wet);
  }

  setLevel(linear: number) {
    this.bus.gain.rampTo(Math.max(0, linear), 0.2);
  }

  /** Called once a bar: maybe a gust, more often and stronger with more wind; a light bed of air when windy. */
  windBar(time: number, wind: number) {
    const base = wind > 0.15 ? wind * 0.02 : 0;
    if (wind < 0.12 || Math.random() > 0.2 + wind * 0.6) {
      this.windGain.gain.linearRampToValueAtTime(base, time + 2);
      return;
    }
    const peak = 0.04 + wind * 0.16;
    const rise = 1.5 + Math.random() * 2;
    const fall = 3 + Math.random() * 3;
    const gain = this.windGain.gain;
    gain.cancelScheduledValues(time);
    gain.setValueAtTime(gain.getValueAtTime(time), time);
    gain.linearRampToValueAtTime(peak, time + rise);
    gain.linearRampToValueAtTime(base, time + rise + fall);
    const freq = this.windFilter.frequency;
    freq.cancelScheduledValues(time);
    freq.setValueAtTime(450, time);
    freq.exponentialRampToValueAtTime(700 + wind * 1300, time + rise);
    freq.exponentialRampToValueAtTime(500, time + rise + fall);
  }

  /** A burst of three quick chirps, somewhere in the stereo field. */
  chirp(time: number) {
    const f = 4200 + Math.random() * 500;
    this.cricketPan.pan.setValueAtTime(Math.random() * 1.4 - 0.7, time);
    for (let i = 0; i < 3; i++) this.cricket.triggerAttackRelease(f, 0.02, time + i * 0.045, 0.6);
  }

  /** A short call of 2 to 5 pitch-swept tweets. */
  birdCall(time: number) {
    this.birdPan.pan.setValueAtTime(Math.random() * 1.6 - 0.8, time);
    const tweets = 2 + Math.floor(Math.random() * 4);
    let t = time;
    for (let i = 0; i < tweets; i++) {
      const from = 2400 + Math.random() * 1800;
      const to = from * (0.65 + Math.random() * 0.8);
      const length = 0.05 + Math.random() * 0.08;
      this.bird.triggerAttack(from, t, 0.5 + Math.random() * 0.3);
      this.bird.frequency.exponentialRampToValueAtTime(to, t + length);
      this.bird.triggerRelease(t + length);
      t += length + 0.04 + Math.random() * 0.08;
    }
  }

  bellNote(note: string, time: number) {
    this.bell.triggerAttackRelease(note, 2, time, 0.5 + Math.random() * 0.3);
  }

  swell(notes: string[], time: number) {
    this.swellSynth.triggerAttackRelease(notes, 7, time, 0.6);
  }

  dispose() {
    [
      this.windNoise, this.windFilter, this.windGain, this.cricket, this.cricketPan, this.bird, this.birdPan,
      this.bell, this.swellSynth, this.bus,
    ].forEach((node) => node.dispose());
  }
}
