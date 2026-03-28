// PROTOTYPE - NOT FOR PRODUCTION
// Question: Is keyboard-mashing a fake desktop with destruction effects fun?
// Date: 2026-03-28

import { Container, Graphics, GraphicsContext } from 'pixi.js';
import { SafetyLimiter } from './safety-limiter';

interface ActiveParticle {
  gfx: Graphics;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  gravity: number;
  rotationSpeed: number;
  scaleDecay: number;
}

const POOL_SIZE = 500;
const COLORS = [0xff4444, 0x44aaff, 0xffcc00, 0xff69b4, 0x44ff44, 0xff8800, 0xaa44ff];

// Pre-built graphics contexts for different shapes
const circleCtx = new GraphicsContext().circle(0, 0, 4).fill(0xffffff);
const squareCtx = new GraphicsContext().rect(-3, -3, 6, 6).fill(0xffffff);
const triangleCtx = new GraphicsContext().poly([0, -5, 5, 4, -5, 4]).fill(0xffffff);
const SHAPES = [circleCtx, squareCtx, triangleCtx];

export class ParticleManager {
  private container: Container;
  private pool: Graphics[] = [];
  private active: ActiveParticle[] = [];
  private safety: SafetyLimiter;

  constructor(parent: Container, safety: SafetyLimiter) {
    this.container = new Container();
    this.container.label = 'particles';
    parent.addChild(this.container);
    this.safety = safety;

    // Pre-allocate pool
    for (let i = 0; i < POOL_SIZE; i++) {
      const g = new Graphics(circleCtx);
      g.visible = false;
      this.container.addChild(g);
      this.pool.push(g);
    }
  }

  emit(x: number, y: number, count: number, config?: {
    speed?: number;
    gravity?: number;
    life?: number;
    spread?: number;
    scale?: number;
  }): void {
    const speed = config?.speed ?? 300;
    const gravity = config?.gravity ?? 400;
    const life = config?.life ?? 0.8;
    const spread = config?.spread ?? Math.PI * 2;
    const scale = config?.scale ?? 1;

    for (let i = 0; i < count; i++) {
      const gfx = this.pool.pop();
      if (!gfx) break; // Pool exhausted

      const angle = -Math.PI / 2 + (Math.random() - 0.5) * spread;
      const spd = speed * (0.5 + Math.random() * 0.5);
      const color = COLORS[Math.floor(Math.random() * COLORS.length)];
      const shape = SHAPES[Math.floor(Math.random() * SHAPES.length)];

      gfx.context = shape;
      gfx.tint = color;
      gfx.position.set(x, y);
      gfx.scale.set(scale * (0.5 + Math.random()));
      gfx.rotation = Math.random() * Math.PI * 2;
      gfx.alpha = 1;
      gfx.visible = true;

      this.active.push({
        gfx,
        vx: Math.cos(angle) * spd,
        vy: Math.sin(angle) * spd,
        life,
        maxLife: life,
        gravity,
        rotationSpeed: (Math.random() - 0.5) * 10,
        scaleDecay: 0.95 + Math.random() * 0.04,
      });
    }

    // Record flash for safety if emitting bright particles
    if (count > 5 && this.safety.canFlash()) {
      this.safety.recordFlash();
    }
  }

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

      p.vy += p.gravity * dt;
      p.gfx.x += p.vx * dt;
      p.gfx.y += p.vy * dt;
      p.gfx.rotation += p.rotationSpeed * dt;
      p.gfx.alpha = p.life / p.maxLife;
      p.gfx.scale.x *= p.scaleDecay;
      p.gfx.scale.y *= p.scaleDecay;
    }
  }

  get activeCount(): number {
    return this.active.length;
  }
}
