/**
 * Mouse Trail — sparkle particles following mouse movement.
 *
 * Spawns tinted sparkle particles along the mouse path at fixed pixel
 * intervals. Particles are drawn from an object pool backed by a single
 * shared GraphicsContext (one draw call per particle, GPU-friendly).
 *
 * The mousemove listener is self-wired in the constructor and torn down
 * by `destroy()`. The caller is responsible for calling `update(dt)` each
 * frame and `destroy()` when the trail is no longer needed.
 *
 * Pool sizing: MOUSE_TRAIL_CONFIG.POOL_SIZE particles are pre-allocated.
 * If all particles are active, new spawn requests are silently dropped
 * rather than growing beyond the pool. This keeps allocation zero in the
 * hot path.
 *
 * @example
 * ```ts
 * const trail = new MouseTrail(app.stage);
 *
 * // In game loop:
 * trail.update(app.ticker.deltaMS / 1000); // dt in seconds
 *
 * // On cleanup:
 * trail.destroy();
 * ```
 */

import { Container, Graphics, GraphicsContext } from 'pixi.js';
import { MOUSE_TRAIL_CONFIG, PARTICLE_CONFIG } from '../config';

// ---------------------------------------------------------------------------
// Internal types
// ---------------------------------------------------------------------------

interface TrailParticle {
  gfx: Graphics;
  /** Remaining life in seconds. */
  life: number;
  /** Initial life used to compute normalised fade. */
  maxLife: number;
  /** Velocity x (px/s). */
  vx: number;
  /** Velocity y (px/s). */
  vy: number;
}

// ---------------------------------------------------------------------------
// Shared GraphicsContext (one allocation for the entire pool)
// ---------------------------------------------------------------------------

/**
 * A 3-px white circle used as the base shape for every sparkle.
 * Tint is applied per-particle at spawn time.
 * Constructed once at module load; safe to share across MouseTrail instances.
 */
const SPARKLE_CTX = new GraphicsContext().circle(0, 0, 3).fill(0xffffff);

// ---------------------------------------------------------------------------
// MouseTrail
// ---------------------------------------------------------------------------

export class MouseTrail {
  private readonly trailContainer: Container;

  /** Pre-allocated inactive particles ready for checkout. */
  private readonly pool: Graphics[] = [];

  /** Currently live particles being updated each frame. */
  private readonly active: TrailParticle[] = [];

  /** Last known mouse X (canvas coords, after viewport→canvas conversion). */
  private lastX = 0;
  /** Last known mouse Y (canvas coords, after viewport→canvas conversion). */
  private lastY = 0;
  /** True once the first mousemove has set a valid position. */
  private hasPosition = false;

  /** Retained so the exact same function reference is removed on destroy. */
  private readonly _onMouseMove: (e: MouseEvent) => void;

  /** Retained so the exact same function reference is removed on destroy. */
  private readonly _onResize: () => void;

  // BUG-006/BUG-007 fix: cache canvas bounds so mousemove does not trigger
  // a layout read (getBoundingClientRect) on every event.
  private _canvasRect: DOMRect | null = null;
  private _canvasScaleX = 1;
  private _canvasScaleY = 1;

  // -------------------------------------------------------------------------
  // Constructor
  // -------------------------------------------------------------------------

  /**
   * @param parent - PixiJS Container to attach trail particles to.
   *                 The trail creates its own child Container so it can be
   *                 rendered above gameplay elements without reordering the
   *                 parent's display list.
   */
  constructor(parent: Container) {
    this.trailContainer = new Container();
    this.trailContainer.label = 'mouse-trail';
    parent.addChild(this.trailContainer);

    // Pre-allocate pool.
    for (let i = 0; i < MOUSE_TRAIL_CONFIG.POOL_SIZE; i++) {
      const g = new Graphics(SPARKLE_CTX);
      g.visible = false;
      this.trailContainer.addChild(g);
      this.pool.push(g);
    }

    // Cache canvas bounds for coordinate conversion; refresh on resize.
    this._onResize = () => this._updateCanvasRect();
    this._updateCanvasRect();
    window.addEventListener('resize', this._onResize);

    // Self-wire listener. Store the bound reference for teardown.
    // Convert viewport coords to PixiJS canvas coords using cached rect.
    this._onMouseMove = (e: MouseEvent) => {
      const x = this._canvasRect
        ? (e.clientX - this._canvasRect.left) * this._canvasScaleX
        : e.clientX;
      const y = this._canvasRect
        ? (e.clientY - this._canvasRect.top) * this._canvasScaleY
        : e.clientY;
      this._onMove(x, y);
    };
    window.addEventListener('mousemove', this._onMouseMove);
  }

  // -------------------------------------------------------------------------
  // Public API
  // -------------------------------------------------------------------------

  /**
   * Advance all active particles by `dt` seconds.
   *
   * Particles whose life has expired are recycled back to the pool.
   * Iterate in reverse so splice does not skip indices.
   *
   * @param dt - Delta time in **seconds** (e.g. `ticker.deltaMS / 1000`).
   */
  update(dt: number): void {
    for (let i = this.active.length - 1; i >= 0; i--) {
      const p = this.active[i];
      p.life -= dt;

      if (p.life <= 0) {
        p.gfx.visible = false;
        this.pool.push(p.gfx);
        this.active.splice(i, 1);
        continue;
      }

      p.gfx.x += p.vx * dt;
      p.gfx.y += p.vy * dt;
      p.gfx.alpha = p.life / p.maxLife;
      // Shrink uniformly so particle disappears before fully fading.
      p.gfx.scale.x *= 0.97;
      p.gfx.scale.y *= 0.97;
    }
  }

  /**
   * Remove the mousemove listener and destroy all graphics resources.
   *
   * After calling this, neither `update()` nor any spawning will occur.
   * The caller should discard this instance after `destroy()`.
   */
  destroy(): void {
    window.removeEventListener('mousemove', this._onMouseMove);
    window.removeEventListener('resize', this._onResize);
    this.trailContainer.destroy({ children: true });
    this.active.length = 0;
    this.pool.length = 0;
  }

  // -------------------------------------------------------------------------
  // Private helpers
  // -------------------------------------------------------------------------

  /**
   * Read the canvas element's bounding rect and derive CSS→canvas scale factors.
   * Called once at construction and again on every window resize.
   *
   * BUG-006/BUG-007 fix: caching here avoids a forced layout read inside the
   * high-frequency mousemove handler.
   */
  private _updateCanvasRect(): void {
    const canvas = document.querySelector('canvas');
    if (canvas) {
      this._canvasRect = canvas.getBoundingClientRect();
      // With autoDensity: true, PixiJS maps CSS pixels to stage coords.
      // Do NOT scale by devicePixelRatio — just subtract offset.
      this._canvasScaleX = 1;
      this._canvasScaleY = 1;
    }
  }

  /**
   * Called by the mousemove handler. Interpolates spawn positions along the
   * movement vector and emits one sparkle every SPAWN_DISTANCE_PX pixels.
   */
  private _onMove(x: number, y: number): void {
    if (!this.hasPosition) {
      this.lastX = x;
      this.lastY = y;
      this.hasPosition = true;
      return;
    }

    const dx = x - this.lastX;
    const dy = y - this.lastY;
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (dist >= MOUSE_TRAIL_CONFIG.SPAWN_DISTANCE_PX) {
      const count = Math.floor(dist / MOUSE_TRAIL_CONFIG.SPAWN_DISTANCE_PX);
      for (let i = 0; i < count; i++) {
        const t = i / count;
        this._spawnSparkle(
          this.lastX + dx * t,
          this.lastY + dy * t,
        );
      }
      this.lastX = x;
      this.lastY = y;
    }
  }

  /**
   * Check out one Graphics from the pool, configure it, and push it onto
   * the active list. Silently dropped if the pool is empty (zero allocation
   * guarantee for the hot path).
   */
  private _spawnSparkle(x: number, y: number): void {
    const gfx = this.pool.pop();
    if (!gfx) return; // Pool exhausted — drop silently.

    const colors = PARTICLE_CONFIG.COLORS;
    const color = colors[Math.floor(Math.random() * colors.length)];
    const lifeRange = MOUSE_TRAIL_CONFIG.LIFE_MAX - MOUSE_TRAIL_CONFIG.LIFE_MIN;
    const life = MOUSE_TRAIL_CONFIG.LIFE_MIN + Math.random() * lifeRange;

    gfx.context = SPARKLE_CTX;
    gfx.tint = color;
    gfx.position.set(x, y);
    gfx.scale.set(0.5 + Math.random() * 1.0);
    gfx.alpha = 1;
    gfx.visible = true;

    this.active.push({
      gfx,
      life,
      maxLife: life,
      vx: (Math.random() - 0.5) * 30,
      vy: (Math.random() - 0.5) * 30,
    });
  }
}
