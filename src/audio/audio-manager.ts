/**
 * AudioManager — manages a Web Audio context, polyphony limiting,
 * and routes all sound playback through SafetyLimiter volume clamping.
 *
 * Sounds are played as procedural oscillator bursts.
 * Active voice count is tracked for polyphony limiting at MAX_POLYPHONY.
 */

import { AUDIO_CONFIG } from '../config';
import { SafetyLimiter } from '../core/safety-limiter';
import type { SoundType } from '../types';
import {
  SOUND_GENERATORS,
  pitchForKey,
  type SoundGenerator,
} from './procedural-sounds';

/**
 * AudioManager — provides high-level sound playback API.
 *
 * Creates and owns a single AudioContext. Manages polyphony (simultaneous voices)
 * by tracking active sources and capping at MAX_POLYPHONY. All sounds are routed
 * through a master gain node controlled by SafetyLimiter.clampVolume().
 *
 * Usage:
 * ```ts
 * const safety = new SafetyLimiter();
 * const audio = new AudioManager(safety);
 * audio.ensureContext(); // Call from user gesture
 * audio.play('pop');     // Random pitch
 * audio.playForKey('KeyA'); // Deterministic pitch by key
 * ```
 */
export class AudioManager {
  private context: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private muted = false;
  private activeVoices = 0;
  private readonly safety: SafetyLimiter;

  /**
   * @param safetyLimiter - Instance to clamp volume levels
   */
  constructor(safetyLimiter: SafetyLimiter) {
    this.safety = safetyLimiter;
  }

  /**
   * Lazily creates and resumes the AudioContext.
   * Must be called from a user gesture (click, key press) to satisfy browser autoplay policy.
   * Safe to call multiple times.
   */
  ensureContext(): void {
    if (this.context) return;

    this.context = new AudioContext();
    this.masterGain = this.context.createGain();

    // Set initial master volume via SafetyLimiter
    const clamped = this.safety.clampVolume(0.7);
    this.masterGain.gain.value = clamped;

    this.masterGain.connect(this.context.destination);
  }

  /**
   * Plays a sound at a random pitch within the configured range.
   * Silently no-ops if polyphony limit is reached or context is not ready.
   *
   * @param type - Sound identifier from SoundType union
   *
   * Example:
   * ```ts
   * audio.play('pop'); // Random pitch 0.7–1.4
   * audio.play('crack');
   * ```
   */
  play(type: SoundType): void {
    if (!this.context || !this.masterGain || this.muted) return;
    if (this.activeVoices >= AUDIO_CONFIG.MAX_POLYPHONY) return;

    const generator = SOUND_GENERATORS[type];
    if (!generator) return;

    // Random pitch within PITCH_MIN–PITCH_MAX
    const pitchMult =
      AUDIO_CONFIG.PITCH_MIN +
      Math.random() * (AUDIO_CONFIG.PITCH_MAX - AUDIO_CONFIG.PITCH_MIN);

    const now = this.context.currentTime;
    this.activeVoices++;

    // Schedule voice cleanup when sound naturally ends
    // (estimated from sound generator durations: 80–400ms)
    const estimatedDuration = 0.5; // Conservative upper bound
    setTimeout(() => {
      this.activeVoices = Math.max(0, this.activeVoices - 1);
    }, estimatedDuration * 1000);

    // Invoke generator with master gain as destination
    generator(this.context, this.masterGain, now, pitchMult);
  }

  /**
   * Plays a sound determined entirely by the keyboard key code.
   * Same key always produces the same sound type and pitch for consistent feedback.
   * Useful for predictable keyboard smashing audio.
   *
   * @param keyCode - Keyboard event code string (e.g., "KeyA", "Space", "ArrowUp")
   *
   * Example:
   * ```ts
   * document.addEventListener('keydown', (e) => {
   *   audio.playForKey(e.code);
   * });
   * ```
   */
  playForKey(keyCode: string): void {
    if (!this.context || !this.masterGain || this.muted) return;
    if (this.activeVoices >= AUDIO_CONFIG.MAX_POLYPHONY) return;

    const { type, pitch } = pitchForKey(keyCode);
    const generator = SOUND_GENERATORS[type];
    if (!generator) return;

    const now = this.context.currentTime;
    this.activeVoices++;

    const estimatedDuration = 0.5;
    setTimeout(() => {
      this.activeVoices = Math.max(0, this.activeVoices - 1);
    }, estimatedDuration * 1000);

    generator(this.context, this.masterGain, now, pitch);
  }

  /**
   * Toggles audio on/off by controlling the master gain.
   * When muted, volume is set to 0. When unmuted, volume returns to safety-clamped level.
   */
  toggleMute(): void {
    this.muted = !this.muted;
    if (this.masterGain) {
      if (this.muted) {
        this.masterGain.gain.value = 0;
      } else {
        const clamped = this.safety.clampVolume(0.7);
        this.masterGain.gain.value = clamped;
      }
    }
  }

  /**
   * Returns true if audio is currently muted.
   */
  get isMuted(): boolean {
    return this.muted;
  }

  /**
   * Returns true if AudioContext is ready (created and not suspended).
   */
  get isReady(): boolean {
    return this.context !== null && this.context.state !== 'suspended';
  }

  /**
   * Closes the AudioContext and releases all resources.
   * After calling destroy(), the AudioManager is no longer usable.
   */
  destroy(): void {
    if (this.context) {
      void this.context.close();
      this.context = null;
      this.masterGain = null;
    }
  }
}
