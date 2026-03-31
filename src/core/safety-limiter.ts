/**
 * Safety Limiter — enforces WCAG photosensitivity and audio volume limits.
 *
 * WCAG guideline: no more than 3 visual flashes per second (rolling window).
 * All visual/audio systems must check with this before emitting output.
 *
 * This is a safety-critical system — it has extensive unit tests.
 *
 * Single-thread contract: `canFlash()` and `recordFlash()` must be called as
 * a paired check-then-record within the same synchronous execution context.
 * Do not yield between the two calls.
 *
 * @example
 * ```typescript
 * const limiter = new SafetyLimiter();
 *
 * // Before triggering a flash effect:
 * if (limiter.canFlash()) {
 *   limiter.recordFlash();
 *   triggerFlashEffect();
 * }
 *
 * // Before playing audio:
 * gainNode.gain.value = Math.min(rawVolume, limiter.maxVolume);
 * ```
 */
import { SAFETY_CONFIG } from '../config';

export class SafetyLimiter {
  /** Timestamps (performance.now) of flashes recorded in the current window. */
  private _flashTimestamps: number[] = [];

  // ---------------------------------------------------------------------------
  // Flash budget API
  // ---------------------------------------------------------------------------

  /**
   * Returns true if a new flash is permitted under the WCAG budget.
   *
   * Prunes timestamps older than FLASH_WINDOW_MS on every call so the
   * result always reflects the live rolling window. Does NOT record a flash;
   * callers must follow a `true` return with `recordFlash()`.
   *
   * @example
   * ```typescript
   * if (limiter.canFlash()) {
   *   limiter.recordFlash();
   *   playScreenFlash();
   * }
   * ```
   */
  canFlash(): boolean {
    this._pruneWindow();
    return this._flashTimestamps.length < SAFETY_CONFIG.MAX_FLASHES_PER_SECOND;
  }

  /**
   * Records a flash event at the current timestamp.
   *
   * Must only be called after `canFlash()` returned true. Calling this
   * without first checking `canFlash()` can push the flash count above the
   * WCAG budget.
   *
   * @example
   * ```typescript
   * if (limiter.canFlash()) {
   *   limiter.recordFlash();
   *   playScreenFlash();
   * }
   * ```
   */
  recordFlash(): void {
    this._flashTimestamps.push(performance.now());
  }

  /**
   * How many more flashes are available in the current rolling window.
   *
   * Systems that need to batch-check before spawning a burst of effects
   * (e.g. particle systems) should read this value once and compare it
   * against the intended burst count before emitting anything.
   *
   * @example
   * ```typescript
   * const burstCount = 3;
   * if (limiter.flashesRemaining >= burstCount) {
   *   for (let i = 0; i < burstCount; i++) {
   *     limiter.recordFlash();
   *     spawnParticleBurst(i);
   *   }
   * }
   * ```
   */
  get flashesRemaining(): number {
    this._pruneWindow();
    return SAFETY_CONFIG.MAX_FLASHES_PER_SECOND - this._flashTimestamps.length;
  }

  // ---------------------------------------------------------------------------
  // Audio API
  // ---------------------------------------------------------------------------

  /**
   * The maximum permitted audio gain value (0–1).
   *
   * Route all Web Audio GainNode values through this ceiling.
   * No system may bypass this cap.
   *
   * @example
   * ```typescript
   * gainNode.gain.value = Math.min(desiredGain, limiter.maxVolume);
   * ```
   */
  get maxVolume(): number {
    return SAFETY_CONFIG.MAX_VOLUME;
  }

  /**
   * Clamps a raw gain value to the configured maximum.
   *
   * @deprecated Use `Math.min(raw, limiter.maxVolume)` instead.
   *   This convenience wrapper will be removed in a future release.
   *   Migration: replace `limiter.clampVolume(v)` with
   *   `Math.min(v, limiter.maxVolume)`.
   *
   * @param raw - Desired volume in range 0–1.
   * @returns Clamped volume in range 0–maxVolume.
   *
   * @example
   * ```typescript
   * // Deprecated — prefer:
   * gainNode.gain.value = Math.min(rawVolume, limiter.maxVolume);
   * ```
   */
  clampVolume(raw: number): number {
    return Math.min(raw, SAFETY_CONFIG.MAX_VOLUME);
  }

  // ---------------------------------------------------------------------------
  // Testing / lifecycle
  // ---------------------------------------------------------------------------

  /**
   * Clears all recorded flash timestamps.
   *
   * Intended for use in unit tests to reset state between test cases.
   * Do not call this in production code paths.
   *
   * @example
   * ```typescript
   * beforeEach(() => { limiter.reset(); });
   * ```
   */
  reset(): void {
    // Truncate in-place to avoid reallocation.
    this._flashTimestamps.length = 0;
  }

  // ---------------------------------------------------------------------------
  // Private helpers
  // ---------------------------------------------------------------------------

  /**
   * Removes timestamps that fall outside the rolling flash window.
   *
   * Zero-allocation: walks from the front of the array (oldest timestamps
   * first) and splices only the expired prefix, reusing the existing Array
   * allocation rather than filtering into a new one.
   */
  private _pruneWindow(): void {
    const cutoff = performance.now() - SAFETY_CONFIG.FLASH_WINDOW_MS;
    let i = 0;
    while (i < this._flashTimestamps.length && this._flashTimestamps[i] <= cutoff) {
      i++;
    }
    if (i > 0) {
      this._flashTimestamps.splice(0, i);
    }
  }
}
