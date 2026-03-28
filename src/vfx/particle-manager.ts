/**
 * ParticleManager — object-pooled particle system for burst effects.
 *
 * Maintains a fixed pool of PixiJS Graphics objects. Inactive particles
 * are recycled rather than destroyed, keeping GC pressure near zero.
 * Active particle count is capped at PARTICLE_CONFIG.MAX_ACTIVE.
 */
import type { Container } from 'pixi.js';
import { PARTICLE_CONFIG } from '../config';
import type { ParticleConfig } from '../types';

/** Internal state for a single pooled particle. */
interface Particle {
  active: boolean;
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  scale: number;
  color: number;
}

export class ParticleManager {
  private pool: Particle[];
  private activeCount = 0;
  private readonly stage: Container;

  /** @param stage - PixiJS container that receives particle display objects. */
  constructor(stage: Container) {
    this.stage = stage;
    this.pool = Array.from({ length: PARTICLE_CONFIG.POOL_SIZE }, () =>
      this.createInactiveParticle(),
    );
  }

  /**
   * Emit a burst of particles at the given position.
   * Silently skips emission if the active cap is reached.
   * @param x - World X position.
   * @param y - World Y position.
   * @param count - Number of particles to emit.
   * @param config - Optional overrides for speed, gravity, life, spread, scale.
   */
  emit(x: number, y: number, count: number, config: ParticleConfig = {}): void {
    for (let i = 0; i < count; i++) {
      if (this.activeCount >= PARTICLE_CONFIG.MAX_ACTIVE) break;
      const particle = this.acquireParticle();
      if (!particle) break;
      this.initParticle(particle, x, y, config);
    }
  }

  /**
   * Update all active particles. Call once per frame.
   * @param dt - Delta time in seconds.
   */
  update(dt: number): void {
    for (const p of this.pool) {
      if (!p.active) continue;
      p.life -= dt;
      if (p.life <= 0) {
        p.active = false;
        this.activeCount--;
        continue;
      }
      p.x += p.vx * dt * 60;
      p.y += p.vy * dt * 60;
      // TODO Sprint 2: sync PixiJS display object position/alpha from p
    }
  }

  // --- Private ---

  private createInactiveParticle(): Particle {
    return { active: false, x: 0, y: 0, vx: 0, vy: 0, life: 0, maxLife: 1, scale: 1, color: 0xffffff };
  }

  private acquireParticle(): Particle | null {
    for (const p of this.pool) {
      if (!p.active) return p;
    }
    return null;
  }

  private initParticle(p: Particle, x: number, y: number, config: ParticleConfig): void {
    const speed = config.speed ?? 3;
    const spread = config.spread ?? Math.PI * 2;
    const angle = Math.random() * spread;

    p.active = true;
    p.x = x;
    p.y = y;
    p.vx = Math.cos(angle) * speed * (0.5 + Math.random() * 0.5);
    p.vy = Math.sin(angle) * speed * (0.5 + Math.random() * 0.5);
    p.life = config.life ?? (0.3 + Math.random() * 0.4);
    p.maxLife = p.life;
    p.scale = config.scale ?? (0.5 + Math.random() * 0.5);
    p.color = PARTICLE_CONFIG.COLORS[Math.floor(Math.random() * PARTICLE_CONFIG.COLORS.length)];
    this.activeCount++;
  }
}
