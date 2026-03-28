// PROTOTYPE - NOT FOR PRODUCTION
// Question: Is keyboard-mashing a fake desktop with destruction effects fun?
// Date: 2026-03-28

import { SafetyLimiter } from './safety-limiter';

type SoundType = 'pop' | 'crack' | 'boing' | 'whoosh' | 'splat' | 'tinkle' | 'zap' | 'squish' | 'vortex';

export class AudioEngine {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private safety: SafetyLimiter;
  private muted = false;

  constructor(safety: SafetyLimiter) {
    this.safety = safety;
  }

  /** Must be called from a user gesture (click/keypress) to satisfy autoplay policy */
  ensureContext(): void {
    if (this.ctx) return;
    this.ctx = new AudioContext();
    this.masterGain = this.ctx.createGain();
    this.masterGain.gain.value = this.safety.maxVolume;
    this.masterGain.connect(this.ctx.destination);
  }

  toggleMute(): void {
    this.muted = !this.muted;
    if (this.masterGain) {
      this.masterGain.gain.value = this.muted ? 0 : this.safety.maxVolume;
    }
  }

  play(type: SoundType): void {
    if (!this.ctx || !this.masterGain || this.muted) return;

    const now = this.ctx.currentTime;
    // Random pitch variation +-20%
    const pitchMult = 0.8 + Math.random() * 0.4;

    switch (type) {
      case 'pop': this.playPop(now, pitchMult); break;
      case 'crack': this.playCrack(now, pitchMult); break;
      case 'boing': this.playBoing(now, pitchMult); break;
      case 'whoosh': this.playWhoosh(now, pitchMult); break;
      case 'splat':   this.playSplat(now, pitchMult);   break;
      case 'tinkle':  this.playTinkle(now, pitchMult);  break;
      case 'zap':     this.playZap(now, pitchMult);     break;
      case 'squish':  this.playSquish(now, pitchMult);  break;
      case 'vortex':  this.playVortex(now, pitchMult);  break;
    }
  }

  playRandom(): void {
    const sounds: SoundType[] = ['pop', 'crack', 'boing', 'whoosh', 'splat', 'tinkle', 'zap', 'squish', 'vortex'];
    this.play(sounds[Math.floor(Math.random() * sounds.length)]);
  }

  /** Play a sound determined by the key code — same key always plays same sound+pitch */
  playForKey(keyCode: string): void {
    if (!this.ctx || !this.masterGain || this.muted) return;

    // Hash the keyCode to get a consistent index
    let hash = 0;
    for (let i = 0; i < keyCode.length; i++) {
      hash = ((hash << 5) - hash) + keyCode.charCodeAt(i);
      hash |= 0;
    }

    const sounds: SoundType[] = ['pop', 'crack', 'boing', 'whoosh', 'splat', 'tinkle', 'zap', 'squish', 'vortex'];
    const soundIndex = Math.abs(hash) % sounds.length;
    const pitchIndex = Math.abs(hash >> 4) % 8;

    // Consistent pitch per key: 0.7 to 1.4 in 8 steps
    const pitch = 0.7 + (pitchIndex / 7) * 0.7;

    const now = this.ctx.currentTime;
    const type = sounds[soundIndex];

    switch (type) {
      case 'pop': this.playPop(now, pitch); break;
      case 'crack': this.playCrack(now, pitch); break;
      case 'boing': this.playBoing(now, pitch); break;
      case 'whoosh': this.playWhoosh(now, pitch); break;
      case 'splat': this.playSplat(now, pitch); break;
      case 'tinkle': this.playTinkle(now, pitch); break;
      case 'zap': this.playZap(now, pitch); break;
      case 'squish': this.playSquish(now, pitch); break;
      case 'vortex': this.playVortex(now, pitch); break;
    }
  }

  private playPop(now: number, pitch: number): void {
    const ctx = this.ctx!;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(600 * pitch, now);
    osc.frequency.exponentialRampToValueAtTime(200 * pitch, now + 0.1);
    gain.gain.setValueAtTime(0.3, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
    osc.connect(gain).connect(this.masterGain!);
    osc.start(now);
    osc.stop(now + 0.15);
  }

  private playCrack(now: number, pitch: number): void {
    const ctx = this.ctx!;
    const bufferSize = ctx.sampleRate * 0.1;
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bufferSize * 0.1));
    }
    const source = ctx.createBufferSource();
    source.buffer = buffer;
    source.playbackRate.value = pitch;
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.4, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);
    source.connect(gain).connect(this.masterGain!);
    source.start(now);
  }

  private playBoing(now: number, pitch: number): void {
    const ctx = this.ctx!;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(150 * pitch, now);
    osc.frequency.exponentialRampToValueAtTime(400 * pitch, now + 0.1);
    osc.frequency.exponentialRampToValueAtTime(100 * pitch, now + 0.3);
    gain.gain.setValueAtTime(0.3, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
    osc.connect(gain).connect(this.masterGain!);
    osc.start(now);
    osc.stop(now + 0.35);
  }

  private playWhoosh(now: number, pitch: number): void {
    const ctx = this.ctx!;
    const bufferSize = ctx.sampleRate * 0.2;
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      const t = i / bufferSize;
      data[i] = (Math.random() * 2 - 1) * Math.sin(t * Math.PI) * 0.5;
    }
    const source = ctx.createBufferSource();
    source.buffer = buffer;
    source.playbackRate.value = pitch;
    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(1000 * pitch, now);
    filter.Q.value = 2;
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.3, now);
    source.connect(filter).connect(gain).connect(this.masterGain!);
    source.start(now);
  }

  private playSplat(now: number, pitch: number): void {
    const ctx = this.ctx!;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(300 * pitch, now);
    osc.frequency.exponentialRampToValueAtTime(50 * pitch, now + 0.15);
    gain.gain.setValueAtTime(0.25, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);
    osc.connect(gain).connect(this.masterGain!);
    osc.start(now);
    osc.stop(now + 0.2);
  }

  // Delicate glass/crystal shimmer — two high sine oscillators with fast decay
  private playTinkle(now: number, pitch: number): void {
    const ctx = this.ctx!;

    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(2500 * pitch, now);
    osc1.frequency.linearRampToValueAtTime(2200 * pitch, now + 0.15);
    gain1.gain.setValueAtTime(0.25, now);
    gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
    osc1.connect(gain1).connect(this.masterGain!);
    osc1.start(now);
    osc1.stop(now + 0.15);

    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(3800 * pitch, now);
    osc2.frequency.linearRampToValueAtTime(3400 * pitch, now + 0.15);
    gain2.gain.setValueAtTime(0.25, now);
    gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
    osc2.connect(gain2).connect(this.masterGain!);
    osc2.start(now);
    osc2.stop(now + 0.15);
  }

  // Electric/digital glitch — square wave with rapid frequency jumps and layered noise burst
  private playZap(now: number, pitch: number): void {
    const ctx = this.ctx!;

    const osc = ctx.createOscillator();
    const oscGain = ctx.createGain();
    osc.type = 'square';
    osc.frequency.setValueAtTime(1500 * pitch, now);
    osc.frequency.linearRampToValueAtTime(8000 * pitch, now + 0.04);
    osc.frequency.linearRampToValueAtTime(500 * pitch, now + 0.12);
    oscGain.gain.setValueAtTime(0.30, now);
    oscGain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);
    osc.connect(oscGain).connect(this.masterGain!);
    osc.start(now);
    osc.stop(now + 0.12);

    const noiseSize = ctx.sampleRate * 0.08;
    const noiseBuffer = ctx.createBuffer(1, noiseSize, ctx.sampleRate);
    const noiseData = noiseBuffer.getChannelData(0);
    for (let i = 0; i < noiseSize; i++) {
      noiseData[i] = (Math.random() * 2 - 1) * Math.exp(-i / (noiseSize * 0.3));
    }
    const noiseSource = ctx.createBufferSource();
    noiseSource.buffer = noiseBuffer;
    const noiseGain = ctx.createGain();
    noiseGain.gain.setValueAtTime(0.30, now);
    noiseSource.connect(noiseGain).connect(this.masterGain!);
    noiseSource.start(now);
  }

  // Wet/gooey — sawtooth through low-pass filter with downward frequency slide and gain wobble
  private playSquish(now: number, pitch: number): void {
    const ctx = this.ctx!;

    const osc = ctx.createOscillator();
    const filter = ctx.createBiquadFilter();
    const gain = ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(400 * pitch, now);
    osc.frequency.linearRampToValueAtTime(150 * pitch, now + 0.25);

    filter.type = 'lowpass';
    filter.frequency.value = 800;
    filter.Q.value = 5;

    gain.gain.setValueCurveAtTime(
      new Float32Array([0.28, 0.15, 0.25, 0.10]),
      now,
      0.25,
    );

    osc.connect(filter).connect(gain).connect(this.masterGain!);
    osc.start(now);
    osc.stop(now + 0.25);
  }

  // Swirling suction — sine with up-then-down frequency arc and layered bandpass noise
  private playVortex(now: number, pitch: number): void {
    const ctx = this.ctx!;

    const osc = ctx.createOscillator();
    const oscGain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(800 * pitch, now);
    osc.frequency.linearRampToValueAtTime(2000 * pitch, now + 0.15);
    osc.frequency.linearRampToValueAtTime(300 * pitch, now + 0.35);
    oscGain.gain.setValueAtTime(0.32, now);
    oscGain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
    osc.connect(oscGain).connect(this.masterGain!);
    osc.start(now);
    osc.stop(now + 0.35);

    const noiseSize = ctx.sampleRate * 0.35;
    const noiseBuffer = ctx.createBuffer(1, noiseSize, ctx.sampleRate);
    const noiseData = noiseBuffer.getChannelData(0);
    for (let i = 0; i < noiseSize; i++) {
      noiseData[i] = Math.random() * 2 - 1;
    }
    const noiseSource = ctx.createBufferSource();
    noiseSource.buffer = noiseBuffer;
    const bpFilter = ctx.createBiquadFilter();
    bpFilter.type = 'bandpass';
    bpFilter.frequency.value = 1500;
    bpFilter.Q.value = 2;
    const noiseGain = ctx.createGain();
    noiseGain.gain.setValueAtTime(0.32, now);
    noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
    noiseSource.connect(bpFilter).connect(noiseGain).connect(this.masterGain!);
    noiseSource.start(now);
    noiseSource.stop(now + 0.35);
  }
}
