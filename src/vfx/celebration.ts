/**
 * CelebrationEffect — massive particle burst when all desktop elements are cleared.
 *
 * Fires confetti from five evenly-spaced X positions across the screen,
 * a bottom-up fountain from centre, and a 200 ms delayed second wave.
 * All emission uses the existing pooled ParticleManager and SpriteParticles
 * systems; no new display objects are allocated at fire-time.
 *
 * Performance contract:
 *   - First wave:  5 × 30 Graphics + 5 × 5 star + 5 × 3 magic = ~190 particles
 *   - Fountain:    50 Graphics particles
 *   - Second wave: 3 × 20 Graphics + 3 × 4 spark = ~72 particles
 *   Total peak: ~312 (spread across 200 ms, pooled — well inside MAX_ACTIVE)
 *
 * @example
 * ```typescript
 * const celebration = new CelebrationEffect(particles, spriteParticles, screenShake);
 * celebration.fire(app.screen.width, app.screen.height);
 * ```
 */
import type { ParticleManager } from './particle-manager';
import type { SpriteParticles } from './sprite-particles';
import type { ScreenShake } from './screen-shake';

export class CelebrationEffect {
  private readonly _particles: ParticleManager;
  private readonly _spriteParticles: SpriteParticles;
  private readonly _screenShake: ScreenShake;

  /**
   * @param particles        - Shared Graphics-based particle manager.
   * @param spriteParticles  - Shared sprite-based particle system.
   * @param screenShake      - Shared screen-shake controller.
   */
  constructor(
    particles: ParticleManager,
    spriteParticles: SpriteParticles,
    screenShake: ScreenShake,
  ) {
    this._particles = particles;
    this._spriteParticles = spriteParticles;
    this._screenShake = screenShake;
  }

  /**
   * Fire the full-clear celebration. Call once when all damageable elements
   * are destroyed. Safe to call multiple times (each call fires independently).
   *
   * @param screenW - Current canvas width in pixels.
   * @param screenH - Current canvas height in pixels.
   */
  fire(screenW: number, screenH: number): void {
    // -------------------------------------------------------------------------
    // Wave 1 — immediate burst from five evenly-spaced positions
    // -------------------------------------------------------------------------
    this._screenShake.trigger(15);

    const burstCount = 5;
    for (let i = 0; i < burstCount; i++) {
      const x = (screenW / (burstCount + 1)) * (i + 1);
      const y = screenH * 0.4;

      // Large colorful Graphics burst — full-circle spread for confetti feel
      this._particles.emit(x, y, 30, {
        speed:   500,
        gravity: 300,
        life:    1.5,
        spread:  Math.PI * 2,
        scale:   2.0,
      });

      // Sprite overlays — stars and magic orbs for reward feedback
      this._spriteParticles.emit(x, y, 5, 'star');
      this._spriteParticles.emit(x, y, 3, 'magic');
    }

    // -------------------------------------------------------------------------
    // Fountain — bottom-up fountain from screen centre
    // -------------------------------------------------------------------------
    this._particles.emit(screenW / 2, screenH * 0.8, 50, {
      speed:   600,
      gravity: 400,
      life:    2.0,
      spread:  Math.PI * 0.8,
      scale:   1.5,
    });

    // -------------------------------------------------------------------------
    // Wave 2 — delayed second burst (200 ms) for multi-beat payoff
    // -------------------------------------------------------------------------
    setTimeout(() => {
      this._screenShake.trigger(10);

      for (let i = 0; i < 3; i++) {
        const x = Math.random() * screenW;
        const y = Math.random() * screenH * 0.6;

        this._particles.emit(x, y, 20, {
          speed:   400,
          gravity: 200,
          life:    1.0,
          scale:   1.8,
        });
        this._spriteParticles.emit(x, y, 4, 'spark');
      }
    }, 200);
  }
}
