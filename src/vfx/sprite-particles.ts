/**
 * Sprite-based particle system using Kenney CC0 particle textures.
 *
 * Loads PNG sprites via the PixiJS v8 Assets API and renders them using
 * pooled Sprite objects for high-performance, visually-rich destruction
 * effects. Designed to coexist alongside the existing Graphics-based
 * ParticleManager — they share the same stage layer.
 *
 * Pool size: 200 Sprites (pre-allocated, zero runtime allocations on emit).
 * Physics: gravity + friction + alpha-fade + scale-decay, matching
 * ParticleManager behaviour so both systems feel cohesive.
 *
 * @example
 * ```typescript
 * const sp = new SpriteParticles(app.stage);
 * await sp.preload();
 *
 * // In destruction pipeline:
 * sp.emit(x, y, 8, 'spark');
 *
 * // In game loop:
 * sp.update(ticker.deltaMS / 1000);
 * ```
 */
import { Assets, Container, Sprite, Texture } from 'pixi.js';
import { PARTICLE_CONFIG } from '../config';

// ---------------------------------------------------------------------------
// Particle set definitions
// ---------------------------------------------------------------------------

/**
 * Texture sets mapped to destruction contexts.
 * Keys are the names callers pass to emit(); values are base filenames
 * (without extension) that live under BASE_PATH.
 */
const PARTICLE_SETS = {
  spark:  ['spark_01', 'spark_02', 'spark_03', 'spark_04', 'spark_05'],
  smoke:  ['smoke_01', 'smoke_02', 'smoke_03', 'smoke_04', 'smoke_05'],
  fire:   ['fire_01',  'fire_02',  'flame_01', 'flame_02', 'flame_03'],
  star:   ['star_01',  'star_02',  'star_03',  'star_04',  'star_05'],
  magic:  ['magic_01', 'magic_02', 'magic_03', 'magic_04', 'magic_05'],
  dirt:   ['dirt_01',  'dirt_02',  'dirt_03'],
} as const;

/** Union of all valid particle set names. */
export type ParticleSet = keyof typeof PARTICLE_SETS;

/**
 * The assets directory prefix for Kenney particle PNGs.
 * Vite serves the project root as-is (base: './'), so this path is
 * relative to the HTML file at the project root.
 */
const BASE_PATH = 'assets/sprites/particles/PNG (Transparent)/';

// ---------------------------------------------------------------------------
// Pool configuration
// ---------------------------------------------------------------------------

const POOL_SIZE = 200;

/** Scale range for sprites — the Kenney PNGs are 256 px, so scale down. */
const SCALE_MIN = 0.1;
const SCALE_MAX = 0.3;

// Physics defaults — intentionally match ParticleManager for cohesion.
const DEFAULT_SPEED   = 300;  // px/s
const DEFAULT_GRAVITY = 400;  // px/s²
const DEFAULT_LIFE    = 0.8;  // seconds
const DEFAULT_SPREAD  = Math.PI * 2;

// ---------------------------------------------------------------------------
// Internal types
// ---------------------------------------------------------------------------

/** Live state for one active sprite particle. */
interface ActiveSpriteParticle {
  /** The pooled Sprite owned by this particle. */
  sprite: Sprite;
  /** Horizontal velocity in px/s. */
  vx: number;
  /** Vertical velocity in px/s. */
  vy: number;
  /** Remaining lifetime in seconds. */
  life: number;
  /** Original lifetime (for normalised alpha). */
  maxLife: number;
  /** Downward acceleration in px/s². */
  gravity: number;
  /** Angular velocity in rad/s. */
  rotationSpeed: number;
  /** Per-frame scale multiplier (< 1 shrinks over time). */
  scaleDecay: number;
}

// ---------------------------------------------------------------------------
// Optional emit config (mirrors ParticleConfig shape)
// ---------------------------------------------------------------------------

/** Optional per-burst physics overrides. */
export interface SpriteParticleConfig {
  speed?:   number;
  gravity?: number;
  life?:    number;
  spread?:  number;
}

// ---------------------------------------------------------------------------
// SpriteParticles
// ---------------------------------------------------------------------------

export class SpriteParticles {
  /** Dedicated container — sits on top of the stage (added last). */
  private readonly _container: Container;

  /** Idle Sprites ready to be acquired. Stack for O(1) push/pop. */
  private readonly _pool: Sprite[] = [];

  /** Currently live particles updated every frame. */
  private readonly _active: ActiveSpriteParticle[] = [];

  /**
   * Loaded textures indexed by set name.
   * Populated by preload(); empty until then.
   */
  private readonly _textures: Partial<Record<ParticleSet, Texture[]>> = {};

  /** Whether preload() has completed successfully. */
  private _ready = false;

  // ---------------------------------------------------------------------------
  // Construction
  // ---------------------------------------------------------------------------

  /**
   * Creates the sprite-particle system and pre-allocates the Sprite pool.
   * Textures are NOT loaded here — call preload() before emitting.
   *
   * @param parent - PixiJS container to attach the particle layer to.
   */
  constructor(parent: Container) {
    this._container = new Container();
    this._container.label = 'sprite-particles';
    parent.addChild(this._container);

    // Pre-allocate pool — all sprites start invisible.
    for (let i = 0; i < POOL_SIZE; i++) {
      const s = new Sprite();
      s.visible = false;
      s.anchor.set(0.5);
      this._container.addChild(s);
      this._pool.push(s);
    }
  }

  // ---------------------------------------------------------------------------
  // Preload
  // ---------------------------------------------------------------------------

  /**
   * Loads all particle textures via the PixiJS v8 Assets API.
   * Must be awaited before calling emit().
   *
   * Failures for individual files are caught and logged; the system still
   * works with whatever textures loaded successfully.
   *
   * @example
   * ```typescript
   * await spriteParticles.preload();
   * ```
   */
  async preload(): Promise<void> {
    const setNames = Object.keys(PARTICLE_SETS) as ParticleSet[];

    await Promise.all(
      setNames.map(async (setName) => {
        const filenames = PARTICLE_SETS[setName] as readonly string[];
        const textures: Texture[] = [];

        await Promise.all(
          filenames.map(async (filename) => {
            const url = `${BASE_PATH}${filename}.png`;
            try {
              const tex: Texture = await Assets.load(url);
              textures.push(tex);
            } catch (err) {
              console.warn(`[SpriteParticles] Failed to load "${url}":`, err);
            }
          }),
        );

        if (textures.length > 0) {
          this._textures[setName] = textures;
        }
      }),
    );

    this._ready = true;
    const loadedSets = setNames.filter((n) => (this._textures[n]?.length ?? 0) > 0);
    console.log(`[SpriteParticles] Preloaded ${loadedSets.length}/${setNames.length} sets`);
  }

  // ---------------------------------------------------------------------------
  // Public API
  // ---------------------------------------------------------------------------

  /**
   * Emits a burst of sprite particles at world position (x, y).
   *
   * Silently skips if preload() has not completed or if the requested
   * texture set failed to load. Capped by PARTICLE_CONFIG.MAX_ACTIVE
   * shared with the Graphics-based system.
   *
   * @param x      - World X coordinate.
   * @param y      - World Y coordinate.
   * @param count  - Number of particles to emit.
   * @param set    - Texture set to draw from (e.g. 'spark', 'dirt').
   * @param config - Optional physics overrides.
   *
   * @example
   * ```typescript
   * spriteParticles.emit(300, 200, 8, 'spark');
   * spriteParticles.emit(300, 200, 3, 'dirt', { speed: 150, life: 0.5 });
   * ```
   */
  emit(
    x: number,
    y: number,
    count: number,
    set: ParticleSet,
    config?: SpriteParticleConfig,
  ): void {
    if (!this._ready) return;

    const textures = this._textures[set];
    if (!textures || textures.length === 0) return;

    const speed   = config?.speed   ?? DEFAULT_SPEED;
    const gravity = config?.gravity ?? DEFAULT_GRAVITY;
    const life    = config?.life    ?? DEFAULT_LIFE;
    const spread  = config?.spread  ?? DEFAULT_SPREAD;

    for (let i = 0; i < count; i++) {
      if (this._active.length >= PARTICLE_CONFIG.MAX_ACTIVE) break;

      const sprite = this._pool.pop();
      if (!sprite) break;

      // Pick a random texture from the set.
      const tex   = textures[Math.floor(Math.random() * textures.length)];
      const color = PARTICLE_CONFIG.COLORS[Math.floor(Math.random() * PARTICLE_CONFIG.COLORS.length)];

      // Bias upward: base angle is straight up, spread fans out.
      const angle = -Math.PI / 2 + (Math.random() - 0.5) * spread;
      const spd   = speed * (0.5 + Math.random() * 0.5);
      const scale = SCALE_MIN + Math.random() * (SCALE_MAX - SCALE_MIN);

      sprite.texture  = tex;
      sprite.tint     = color;
      sprite.alpha    = 1;
      sprite.visible  = true;
      sprite.position.set(x, y);
      sprite.scale.set(scale);
      sprite.rotation = Math.random() * Math.PI * 2;

      this._active.push({
        sprite,
        vx:            Math.cos(angle) * spd,
        vy:            Math.sin(angle) * spd,
        life,
        maxLife:       life,
        gravity,
        rotationSpeed: (Math.random() - 0.5) * 10,
        scaleDecay:    0.95 + Math.random() * 0.04,
      });
    }
  }

  /**
   * Advances all active sprite particles by dt seconds.
   *
   * Applies gravity, velocity, rotation, alpha fade, and scale decay.
   * Expired particles are returned to the pool. Iterates back-to-front
   * for O(1) splice removal.
   *
   * @param dt - Frame delta time in seconds.
   */
  update(dt: number): void {
    for (let i = this._active.length - 1; i >= 0; i--) {
      const p = this._active[i];

      p.life -= dt;

      if (p.life <= 0) {
        p.sprite.visible = false;
        this._pool.push(p.sprite);
        this._active.splice(i, 1);
        continue;
      }

      // Physics.
      p.vy             += p.gravity * dt;
      p.sprite.x       += p.vx * dt;
      p.sprite.y       += p.vy * dt;

      // Visual decay.
      p.sprite.rotation += p.rotationSpeed * dt;
      p.sprite.alpha     = p.life / p.maxLife;
      p.sprite.scale.x  *= p.scaleDecay;
      p.sprite.scale.y  *= p.scaleDecay;
    }
  }

  /**
   * Returns all active particles to the pool without waiting for lifetime
   * expiry. Use on scene transitions and hard resets.
   */
  clear(): void {
    for (let i = this._active.length - 1; i >= 0; i--) {
      const p = this._active[i];
      p.sprite.visible = false;
      this._pool.push(p.sprite);
    }
    this._active.length = 0;
  }

  /**
   * Removes the particle container from its parent and releases all
   * Sprite objects. Do not use this instance after calling destroy().
   */
  destroy(): void {
    this._container.destroy({ children: true });
    this._pool.length   = 0;
    this._active.length = 0;
  }

  /**
   * Number of sprite particles currently alive and being updated.
   *
   * @example
   * ```typescript
   * console.log(`Sprite particles: ${spriteParticles.activeCount}`);
   * ```
   */
  get activeCount(): number {
    return this._active.length;
  }
}
