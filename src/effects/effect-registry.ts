/**
 * EffectRegistry — manages pluggable destruction and damage effects.
 *
 * Effects register by name and are selected randomly or by name.
 * This satisfies the Open/Closed principle: new effects are added by
 * calling register() without modifying dispatch or caller code.
 *
 * Usage:
 * ```ts
 * const registry = new EffectRegistry();
 * registerDestructionEffects(registry);
 * registry.getRandom()(element, container, particles, audio);
 * ```
 */
import type { Container } from 'pixi.js';
import type { DesktopElement } from '../types';
import type { ParticleManager } from '../vfx/particle-manager';
import type { AudioManager } from '../audio/audio-manager';

/**
 * A single pluggable effect function.
 * Receives the logical element data, its PixiJS display container,
 * the particle emission system, and the audio playback manager.
 */
export type EffectFn = (
  element: DesktopElement,
  container: Container,
  particles: ParticleManager,
  audio: AudioManager,
) => void;

/**
 * Registry of named effect functions. Effects are keyed by a short
 * identifier string (e.g. 'shatter', 'bounce'). Callers retrieve
 * effects by name or by random selection.
 */
export class EffectRegistry {
  private effects = new Map<string, EffectFn>();

  /**
   * Register an effect under a unique name.
   * Re-registering the same name overwrites the previous entry.
   * @param name - Unique identifier for the effect.
   * @param fn - Effect implementation conforming to EffectFn.
   */
  register(name: string, fn: EffectFn): void {
    this.effects.set(name, fn);
  }

  /**
   * Retrieve an effect by name.
   * @param name - The registered effect name.
   * @returns The EffectFn, or undefined if not registered.
   */
  get(name: string): EffectFn | undefined {
    return this.effects.get(name);
  }

  /**
   * Returns a uniformly random effect from all registered effects.
   * Throws if the registry is empty.
   */
  getRandom(): EffectFn {
    const keys = Array.from(this.effects.keys());
    if (keys.length === 0) throw new Error('EffectRegistry: no effects registered');
    const key = keys[Math.floor(Math.random() * keys.length)];
    return this.effects.get(key) as EffectFn;
  }

  /**
   * Returns a random effect excluding the named effects.
   * Falls back to a fully random pick if all effects are excluded.
   * @param names - Effect names to exclude from selection.
   */
  getRandomExcluding(names: string[]): EffectFn {
    const excludeSet = new Set(names);
    const candidates = Array.from(this.effects.entries()).filter(
      ([name]) => !excludeSet.has(name),
    );
    if (candidates.length === 0) return this.getRandom();
    const [, fn] = candidates[Math.floor(Math.random() * candidates.length)];
    return fn;
  }

  /** Total number of registered effects. */
  get count(): number {
    return this.effects.size;
  }

  /** Ordered list of all registered effect names. */
  get names(): string[] {
    return Array.from(this.effects.keys());
  }
}
