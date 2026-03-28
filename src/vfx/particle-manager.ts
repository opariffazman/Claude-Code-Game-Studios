/**
 * ParticleManager — object-pooled particle rendering system.
 *
 * Pre-allocates a fixed pool of PixiJS `Graphics` objects backed by shared
 * `GraphicsContext` shapes (circle, square, triangle). Inactive particles are
 * recycled rather than destroyed, keeping GC pressure near zero in the hot
 * update path.
 *
 * Safety contract: `emit()` consults `SafetyLimiter.canFlash()` before
 * recording a flash event for bright bursts (count > 5).  The check-then-
 * record pair is synchronous and is never split across an await boundary.
 *
 * Single-thread-only: all methods must be called from the main/render thread.
 *
 * @example
 * ```typescript
 * const particles = new ParticleManager(stage, safetyLimiter);
 *
 * // Emit 12 particles at a hit point:
 * particles.emit(hitX, hitY, 12, { speed: 400, life: 0.6 });
 *
 * // In the game loop:
 * particles.update(app.ticker.deltaMS / 1000);
 *
 * // Cleanup:
 * particles.destroy();
 * ```
 */
import { Container, Graphics, GraphicsContext } from 'pixi.js';
import { PARTICLE_CONFIG } from '../config';
import type { ParticleConfig } from '../types';
import type { SafetyLimiter } from '../core/safety-limiter';

// ---------------------------------------------------------------------------
// Internal types
// ---------------------------------------------------------------------------

/** State for a single active particle. Wraps its PixiJS display object. */
interface ActiveParticle {
  /** The pooled Graphics node currently owned by this particle. */
  gfx: Graphics;
  /** Horizontal velocity in px/s. */
  vx: number;
  /** Vertical velocity in px/s. */
  vy: number;
  /** Remaining lifetime in seconds. */
  life: number;
  /** Original lifetime used to compute normalised alpha. */
  maxLife: number;
  /** Downward acceleration in px/s². */
  gravity: number;
  /** Angular velocity in radians/s. */
  rotationSpeed: number;
  /** Per-frame scale multiplier (< 1 shrinks over time). */
  scaleDecay: number;
}

// ---------------------------------------------------------------------------
// Default emission values
// ---------------------------------------------------------------------------

const DEFAULT_SPEED   = 300;   // px/s
const DEFAULT_GRAVITY = 400;   // px/s²
const DEFAULT_LIFE    = 0.8;   // seconds
const DEFAULT_SPREAD  = Math.PI * 2; // radians — full circle
const DEFAULT_SCALE   = 1;

// ---------------------------------------------------------------------------
// ParticleManager
// ---------------------------------------------------------------------------

export class ParticleManager {
  /** Container that owns all pooled Graphics nodes. */
  private readonly _container: Container;

  /** Idle Graphics objects ready to be acquired. Stack: O(1) push/pop. */
  private readonly _pool: Graphics[] = [];

  /** Currently live particles, updated every frame. */
  private readonly _active: ActiveParticle[] = [];

  /** WCAG flash-rate enforcer. */
  private readonly _safety: SafetyLimiter;

  // Shared GraphicsContext instances — allocated once, reused by all particles.
  // Each context draws in white (0xffffff); actual colour is applied via tint.
  private readonly _ctxCircle:   GraphicsContext;
  private readonly _ctxSquare:   GraphicsContext;
  private readonly _ctxTriangle: GraphicsContext;
  /** Indexed for O(1) random shape selection. */
  private readonly _shapes: readonly GraphicsContext[];

  // ---------------------------------------------------------------------------
  // Construction / destruction
  // ---------------------------------------------------------------------------

  /**
   * Initialises the particle system and pre-allocates all pool objects.
   *
   * @param parent        - PixiJS container that will own the particle layer.
   * @param safetyLimiter - Shared safety limiter for WCAG flash-rate enforcement.
   *
   * @example
   * ```typescript
   * const particles = new ParticleManager(app.stage, safetyLimiter);
   * ```
   */
  constructor(parent: Container, safetyLimiter: SafetyLimiter) {
    this._safety = safetyLimiter;

    // Build shared shape contexts (v8 fluent chain).
    this._ctxCircle   = new GraphicsContext().circle(0, 0, 4).fill(0xffffff);
    this._ctxSquare   = new GraphicsContext().rect(-3, -3, 6, 6).fill(0xffffff);
    this._ctxTriangle = new GraphicsContext().poly([0, -5, 5, 4, -5, 4]).fill(0xffffff);
    this._shapes = [this._ctxCircle, this._ctxSquare, this._ctxTriangle];

    // Create and attach a dedicated container so particles compose cleanly.
    this._container = new Container();
    this._container.label = 'particles';
    parent.addChild(this._container);

    // Pre-allocate pool — zero allocations at runtime.
    for (let i = 0; i < PARTICLE_CONFIG.POOL_SIZE; i++) {
      const g = new Graphics(this._ctxCircle);
      g.visible = false;
      this._container.addChild(g);
      this._pool.push(g);
    }
  }

  /**
   * Removes the particle container from its parent and destroys all pooled
   * Graphics objects, releasing GPU resources.
   *
   * After calling `destroy()` this instance must not be used again.
   *
   * @example
   * ```typescript
   * // On scene teardown:
   * particles.destroy();
   * ```
   */
  destroy(): void {
    this._container.destroy({ children: true });
    this._pool.length   = 0;
    this._active.length = 0;
    this._ctxCircle.destroy();
    this._ctxSquare.destroy();
    this._ctxTriangle.destroy();
  }

  // ---------------------------------------------------------------------------
  // Public API
  // ---------------------------------------------------------------------------

  /**
   * Emits a burst of particles at world position `(x, y)`.
   *
   * Stops spawning early if the `MAX_ACTIVE` ceiling is reached. For bursts
   * larger than 5 particles, records one flash event with the safety limiter
   * (only if the WCAG budget permits).
   *
   * @param x      - World X coordinate of the emission point.
   * @param y      - World Y coordinate of the emission point.
   * @param count  - Requested number of particles to emit.
   * @param config - Optional per-burst overrides.
   *
   * @example
   * ```typescript
   * // Explosion at hit point:
   * particles.emit(300, 200, 20, { speed: 500, gravity: 600, life: 1.0 });
   *
   * // Gentle confetti:
   * particles.emit(400, 100, 8, { speed: 120, gravity: 80, spread: Math.PI });
   * ```
   */
  emit(x: number, y: number, count: number, config?: ParticleConfig): void {
    const speed    = config?.speed   ?? DEFAULT_SPEED;
    const gravity  = config?.gravity ?? DEFAULT_GRAVITY;
    const life     = config?.life    ?? DEFAULT_LIFE;
    const spread   = config?.spread  ?? DEFAULT_SPREAD;
    const scale    = config?.scale   ?? DEFAULT_SCALE;

    for (let i = 0; i < count; i++) {
      // Enforce active-particle ceiling before acquiring from pool.
      if (this._active.length >= PARTICLE_CONFIG.MAX_ACTIVE) break;

      const gfx = this._pool.pop();
      if (!gfx) break; // Pool exhausted (should not happen if POOL_SIZE >= MAX_ACTIVE).

      // Randomise shape, colour, direction.
      const shape = this._shapes[Math.floor(Math.random() * this._shapes.length)];
      const color = PARTICLE_CONFIG.COLORS[Math.floor(Math.random() * PARTICLE_CONFIG.COLORS.length)];
      // Bias upward: base angle points straight up, spread fans outward.
      const angle = -Math.PI / 2 + (Math.random() - 0.5) * spread;
      const spd   = speed * (0.5 + Math.random() * 0.5);

      gfx.context = shape;
      gfx.tint    = color;
      gfx.alpha   = 1;
      gfx.visible = true;
      gfx.position.set(x, y);
      gfx.scale.set(scale * (0.5 + Math.random()));
      gfx.rotation = Math.random() * Math.PI * 2;

      this._active.push({
        gfx,
        vx:            Math.cos(angle) * spd,
        vy:            Math.sin(angle) * spd,
        life,
        maxLife:       life,
        gravity,
        rotationSpeed: (Math.random() - 0.5) * 10,
        scaleDecay:    0.95 + Math.random() * 0.04,
      });
    }

    // Safety: record one flash event for bright bursts if budget allows.
    // The canFlash() + recordFlash() pair is synchronous — no yield between.
    if (count > 5 && this._safety.canFlash()) {
      this._safety.recordFlash();
    }
  }

  /**
   * Advances all active particles by `dt` seconds.
   *
   * Applies gravity, velocity, rotation, alpha fade, and scale decay.
   * Expired particles are returned to the pool. Iterates back-to-front so
   * splice removal is O(1) relative to the tail.
   *
   * Zero heap allocations per call — all state is mutated in-place.
   *
   * @param dt - Frame delta time in seconds.
   *
   * @example
   * ```typescript
   * app.ticker.add((ticker) => {
   *   particles.update(ticker.deltaMS / 1000);
   * });
   * ```
   */
  update(dt: number): void {
    for (let i = this._active.length - 1; i >= 0; i--) {
      const p = this._active[i];

      p.life -= dt;

      if (p.life <= 0) {
        // Return to pool.
        p.gfx.visible = false;
        this._pool.push(p.gfx);
        this._active.splice(i, 1);
        continue;
      }

      // Physics.
      p.vy       += p.gravity * dt;
      p.gfx.x   += p.vx * dt;
      p.gfx.y   += p.vy * dt;

      // Visual decay.
      p.gfx.rotation += p.rotationSpeed * dt;
      p.gfx.alpha     = p.life / p.maxLife;
      p.gfx.scale.x  *= p.scaleDecay;
      p.gfx.scale.y  *= p.scaleDecay;
    }
  }

  /**
   * Returns all active particles to the pool immediately without waiting for
   * their lifetime to expire.
   *
   * Useful for scene transitions or hard resets.
   *
   * @example
   * ```typescript
   * // On level reset:
   * particles.clear();
   * ```
   */
  clear(): void {
    for (let i = this._active.length - 1; i >= 0; i--) {
      const p = this._active[i];
      p.gfx.visible = false;
      this._pool.push(p.gfx);
    }
    this._active.length = 0;
  }

  /**
   * Number of particles currently alive and being updated.
   *
   * @example
   * ```typescript
   * console.log(`Active particles: ${particles.activeCount}`);
   * ```
   */
  get activeCount(): number {
    return this._active.length;
  }
}
