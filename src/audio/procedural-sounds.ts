/**
 * Procedural sound generators for Desk Smasher.
 *
 * Each generator is a pure function that synthesizes a sound effect using the
 * Web Audio API. Generators are called with an AudioContext, destination node,
 * current time, and pitch multiplier. They create and connect their own
 * oscillators/buffers and handle all cleanup via automatic stop scheduling.
 *
 * Pitch multiplier allows variation without changing core sound character.
 */

import type { SoundType } from '../types';

/**
 * Signature for a sound generator function.
 * The generator must not allocate or store state — it synthesizes synchronously
 * and schedules all node stops to avoid dangling resources.
 */
export type SoundGenerator = (
  ctx: AudioContext,
  destination: AudioNode,
  now: number,
  pitchMult: number
) => void;

/**
 * Bright percussive pop — descending sine pitch with fast decay.
 * Character: short, punchy, percussive (like a button click or bubble pop).
 * Duration: ~150ms
 */
export const playPop: SoundGenerator = (ctx, dest, now, pitch) => {
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = 'sine';
  osc.frequency.setValueAtTime(600 * pitch, now);
  osc.frequency.exponentialRampToValueAtTime(200 * pitch, now + 0.1);
  gain.gain.setValueAtTime(0.3, now);
  gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
  osc.connect(gain).connect(dest);
  osc.start(now);
  osc.stop(now + 0.15);
};

/**
 * Crunchy impact noise — brief white noise burst with exponential decay.
 * Character: harsh, destructive, material-breaking (glass, wood, plastic).
 * Duration: ~120ms
 */
export const playCrack: SoundGenerator = (ctx, dest, now, pitch) => {
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
  source.connect(gain).connect(dest);
  source.start(now);
};

/**
 * Bouncy ascending-then-descending sweep — sine arc with medium decay.
 * Character: playful, sproingy, elastic (like a rubber ball or spring).
 * Duration: ~350ms
 */
export const playBoing: SoundGenerator = (ctx, dest, now, pitch) => {
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = 'sine';
  osc.frequency.setValueAtTime(150 * pitch, now);
  osc.frequency.exponentialRampToValueAtTime(400 * pitch, now + 0.1);
  osc.frequency.exponentialRampToValueAtTime(100 * pitch, now + 0.3);
  gain.gain.setValueAtTime(0.3, now);
  gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
  osc.connect(gain).connect(dest);
  osc.start(now);
  osc.stop(now + 0.35);
};

/**
 * Swooshing air movement — filtered noise with pitchable playback.
 * Character: motion, speed, air displacement (like a swing or fast object).
 * Duration: ~200ms
 */
export const playWhoosh: SoundGenerator = (ctx, dest, now, pitch) => {
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
  source.connect(filter).connect(gain).connect(dest);
  source.start(now);
};

/**
 * Splattered impact — sawtooth sweep with downward pitch and fast decay.
 * Character: wet, sloppy, liquid impact (paint splat, mud splash).
 * Duration: ~200ms
 */
export const playSplat: SoundGenerator = (ctx, dest, now, pitch) => {
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = 'sawtooth';
  osc.frequency.setValueAtTime(300 * pitch, now);
  osc.frequency.exponentialRampToValueAtTime(50 * pitch, now + 0.15);
  gain.gain.setValueAtTime(0.25, now);
  gain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);
  osc.connect(gain).connect(dest);
  osc.start(now);
  osc.stop(now + 0.2);
};

/**
 * Delicate glass/crystal shimmer — two layered high sine tones with fast decay.
 * Character: precious, fragile, bell-like (glass break, wind chime).
 * Duration: ~150ms
 */
export const playTinkle: SoundGenerator = (ctx, dest, now, pitch) => {
  const osc1 = ctx.createOscillator();
  const gain1 = ctx.createGain();
  osc1.type = 'sine';
  osc1.frequency.setValueAtTime(2500 * pitch, now);
  osc1.frequency.linearRampToValueAtTime(2200 * pitch, now + 0.15);
  gain1.gain.setValueAtTime(0.25, now);
  gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
  osc1.connect(gain1).connect(dest);
  osc1.start(now);
  osc1.stop(now + 0.15);

  const osc2 = ctx.createOscillator();
  const gain2 = ctx.createGain();
  osc2.type = 'sine';
  osc2.frequency.setValueAtTime(3800 * pitch, now);
  osc2.frequency.linearRampToValueAtTime(3400 * pitch, now + 0.15);
  gain2.gain.setValueAtTime(0.25, now);
  gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
  osc2.connect(gain2).connect(dest);
  osc2.start(now);
  osc2.stop(now + 0.15);
};

/**
 * Electric digital glitch — square wave with rapid frequency jumps and
 * layered noise burst. Character: synthetic, digital, electrical (laser, spark, error).
 * Duration: ~120ms
 */
export const playZap: SoundGenerator = (ctx, dest, now, pitch) => {
  const osc = ctx.createOscillator();
  const oscGain = ctx.createGain();
  osc.type = 'square';
  osc.frequency.setValueAtTime(1500 * pitch, now);
  osc.frequency.linearRampToValueAtTime(8000 * pitch, now + 0.04);
  osc.frequency.linearRampToValueAtTime(500 * pitch, now + 0.12);
  oscGain.gain.setValueAtTime(0.3, now);
  oscGain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);
  osc.connect(oscGain).connect(dest);
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
  noiseGain.gain.setValueAtTime(0.3, now);
  noiseSource.connect(noiseGain).connect(dest);
  noiseSource.start(now);
};

/**
 * Wet gooey sound — sawtooth through low-pass filter with downward frequency
 * slide and wobbling gain envelope. Character: squishy, mucous, soft (slime, ooze).
 * Duration: ~250ms
 */
export const playSquish: SoundGenerator = (ctx, dest, now, pitch) => {
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
    new Float32Array([0.28, 0.15, 0.25, 0.1]),
    now,
    0.25
  );

  osc.connect(filter).connect(gain).connect(dest);
  osc.start(now);
  osc.stop(now + 0.25);
};

/**
 * Swirling suction vortex — sine with up-then-down frequency arc and
 * layered bandpass noise. Character: spiraling, vacuum, suction (wormhole, drain).
 * Duration: ~350ms
 */
export const playVortex: SoundGenerator = (ctx, dest, now, pitch) => {
  const osc = ctx.createOscillator();
  const oscGain = ctx.createGain();
  osc.type = 'sine';
  osc.frequency.setValueAtTime(800 * pitch, now);
  osc.frequency.linearRampToValueAtTime(2000 * pitch, now + 0.15);
  osc.frequency.linearRampToValueAtTime(300 * pitch, now + 0.35);
  oscGain.gain.setValueAtTime(0.32, now);
  oscGain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
  osc.connect(oscGain).connect(dest);
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
  noiseSource.connect(bpFilter).connect(noiseGain).connect(dest);
  noiseSource.start(now);
  noiseSource.stop(now + 0.35);
};

/**
 * Registry mapping SoundType to generator function.
 * Used to dispatch playback requests to the correct synthesis routine.
 */
export const SOUND_GENERATORS: Record<SoundType, SoundGenerator> = {
  pop: playPop,
  crack: playCrack,
  boing: playBoing,
  whoosh: playWhoosh,
  splat: playSplat,
  tinkle: playTinkle,
  zap: playZap,
  squish: playSquish,
  vortex: playVortex,
};

/**
 * Deterministic key-to-sound mapping.
 * Same key always produces the same SoundType and pitch for predictable audio feedback.
 *
 * The hash algorithm creates two independent pseudo-random values from the keyCode:
 * - soundIndex: which of 9 sound generators to use
 * - pitchIndex: which of 8 pitch steps (0.7–1.4) to use
 *
 * @param keyCode - Keyboard event keyCode string (e.g., "KeyA", "Space")
 * @returns Object with selected SoundType and pitch multiplier [0.7, 1.4]
 */
export function pitchForKey(keyCode: string): {
  type: SoundType;
  pitch: number;
} {
  const sounds: SoundType[] = [
    'pop',
    'crack',
    'boing',
    'whoosh',
    'splat',
    'tinkle',
    'zap',
    'squish',
    'vortex',
  ];

  // Simple hash function: fold characters into a single integer
  let hash = 0;
  for (let i = 0; i < keyCode.length; i++) {
    hash = ((hash << 5) - hash) + keyCode.charCodeAt(i);
    hash |= 0; // Force to 32-bit integer
  }

  // Extract two indices from different bit ranges
  const soundIndex = Math.abs(hash) % sounds.length;
  const pitchIndex = Math.abs(hash >> 4) % 8;

  // Map pitchIndex (0–7) to pitch range [0.7, 1.4] in 8 equal steps
  const pitch = 0.7 + (pitchIndex / 7) * 0.7;

  return {
    type: sounds[soundIndex],
    pitch,
  };
}
