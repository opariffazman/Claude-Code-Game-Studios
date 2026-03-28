/**
 * Screen Shake — additive intensity with exponential decay.
 *
 * Each frame `update()` applies a random offset to the provided PixiJS
 * Container (typically the root scene container) and multiplies the
 * internal intensity by the configured decay factor. Multiple triggers
 * stack additively up to `MAX_INTENSITY`.
 *
 * This is a visual-only system with no game-state side-effects. It must
 * NOT be used to reposition gameplay objects — pass only a dedicated
 * "camera/view" container that sits above gameplay geometry.
 *
 * @example
 * ```ts
 * const shake = new ScreenShake();
 *
 * // When something hits:
 * shake.trigger(8);
 *
 * // In the game loop (dt-independent — uses fixed per-frame decay):
 * shake.update(sceneContainer);
 * ```
 */

import { Container } from 'pixi.js';
import { SCREEN_SHAKE_CONFIG } from '../config';

export class ScreenShake {
  private _intensity = 0;

  // -------------------------------------------------------------------------
  // Public API
  // -------------------------------------------------------------------------

  /**
   * Add `amount` to the current shake intensity, capped at MAX_INTENSITY.
   *
   * Stacks additively so simultaneous impacts feel cumulative without
   * exceeding the configured maximum displacement.
   *
   * @param amount - Shake intensity to add (pixels of max displacement).
   *                 Values <= 0 are ignored.
   */
  trigger(amount: number): void {
    if (amount <= 0) return;
    this._intensity = Math.min(
      SCREEN_SHAKE_CONFIG.MAX_INTENSITY,
      this._intensity + amount,
    );
  }

  /**
   * Apply a random positional offset to `container` then decay intensity.
   *
   * When intensity drops below 0.5 px the container is snapped back to
   * origin (0, 0) and intensity is zeroed to avoid sub-pixel drift.
   *
   * Call once per rendered frame. Not dt-compensated — decay is per-frame,
   * so results are frame-rate dependent. At 60 fps the half-life is
   * approximately 6 frames (~100 ms).
   *
   * @param container - The PixiJS Container whose x/y will be displaced.
   *                    Must not be null.
   */
  update(container: Container): void {
    if (this._intensity < 0.5) {
      container.x = 0;
      container.y = 0;
      this._intensity = 0;
      return;
    }

    const offset = this._intensity * 2;
    container.x = (Math.random() - 0.5) * offset;
    container.y = (Math.random() - 0.5) * offset;
    this._intensity *= SCREEN_SHAKE_CONFIG.DECAY;
  }

  /**
   * Current shake intensity in pixels of maximum displacement.
   *
   * Useful for driving secondary effects (e.g. volume swell, blur amount).
   * Ranges from 0 to MAX_INTENSITY.
   */
  get intensity(): number {
    return this._intensity;
  }

  /**
   * Immediately stop all shake and reset the container offset to (0, 0).
   *
   * Does not take a container argument — call `update(container)` once
   * after `reset()` if you need the container repositioned immediately.
   */
  reset(): void {
    this._intensity = 0;
  }
}
