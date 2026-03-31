/**
 * Chaos Meter — tracks input frequency and provides escalation level.
 *
 * A rolling window counts events-per-second and maps to 4 discrete levels
 * (0–3). Higher levels trigger more intense visual and audio feedback. The
 * window is pruned lazily on every `update()` call rather than via timers,
 * keeping this system free of side-effects and easy to unit-test.
 *
 * @example
 * ```ts
 * const meter = new ChaosMeter();
 *
 * // In your input handler:
 * meter.recordInput();
 *
 * // In your game loop (called every frame):
 * meter.update();
 * console.log(meter.level);          // 0 | 1 | 2 | 3
 * console.log(meter.eventsPerSecond); // raw EPS for HUD / debug
 * ```
 */

import { CHAOS_CONFIG } from '../config';
import type { ChaosLevel } from '../types';

export class ChaosMeter {
  /** Timestamps (ms) of recorded input events still inside the rolling window. */
  private events: number[] = [];

  /** Cached level recomputed each `update()`. */
  private _level: ChaosLevel = 0;

  // -------------------------------------------------------------------------
  // Public API
  // -------------------------------------------------------------------------

  /**
   * Record an input event at the current time.
   *
   * Call this from every keyboard/mouse/touch input handler that should
   * contribute to chaos (e.g. key-down, click, tap). Safe to call many
   * times per frame — the window caps the effective EPS.
   *
   * Thread-safety: not thread-safe; call only from the main JS thread.
   */
  recordInput(): void {
    this.events.push(performance.now());
  }

  /**
   * Current chaos level derived from events-per-second.
   *
   * | Level | Threshold (EPS)      |
   * |-------|----------------------|
   * | 0     | < LEVEL_THRESHOLDS[0]|
   * | 1     | >= LEVEL_THRESHOLDS[0]|
   * | 2     | >= LEVEL_THRESHOLDS[1]|
   * | 3     | >= LEVEL_THRESHOLDS[2]|
   *
   * Updated by `update()`. Stale between frames but accurate enough for
   * visual feedback systems that also run per-frame.
   */
  get level(): ChaosLevel {
    return this._level;
  }

  /**
   * Raw events-per-second value computed over the rolling window.
   *
   * Useful for debug overlays and analytics. Updated by `update()`.
   */
  get eventsPerSecond(): number {
    return this.events.length / (CHAOS_CONFIG.WINDOW_MS / 1000);
  }

  /**
   * Prune expired events from the rolling window and recompute the level.
   *
   * Must be called once per game-loop tick. Complexity: O(n) where n is the
   * number of events in the current window — at typical input rates this is
   * bounded well below 100 events even at chaos level 3.
   */
  update(): void {
    const cutoff = performance.now() - CHAOS_CONFIG.WINDOW_MS;
    // Remove events older than the rolling window (oldest-first in the array).
    let i = 0;
    while (i < this.events.length && this.events[i] <= cutoff) {
      i++;
    }
    if (i > 0) {
      this.events.splice(0, i);
    }

    this._level = this._computeLevel();
  }

  /**
   * Clear all recorded events and reset the level to 0.
   *
   * Useful when restarting a round or re-entering a game state. Safe to
   * call on an already-empty meter.
   */
  reset(): void {
    this.events.length = 0;
    this._level = 0;
  }

  // -------------------------------------------------------------------------
  // Private helpers
  // -------------------------------------------------------------------------

  /**
   * Map the current EPS to a discrete ChaosLevel using CHAOS_CONFIG thresholds.
   *
   * Thresholds are checked highest-first so only one branch is taken.
   */
  private _computeLevel(): ChaosLevel {
    const eps = this.eventsPerSecond;
    const t = CHAOS_CONFIG.LEVEL_THRESHOLDS;

    if (eps >= t[2]) return 3;
    if (eps >= t[1]) return 2;
    if (eps >= t[0]) return 1;
    return 0;
  }
}
