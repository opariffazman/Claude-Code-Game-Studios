// PROTOTYPE - NOT FOR PRODUCTION
// Question: Is keyboard-mashing a fake desktop with destruction effects fun?
// Date: 2026-03-28

import { Container, Graphics, GraphicsContext } from 'pixi.js';

const TRAIL_POOL_SIZE = 100;
const SPAWN_DISTANCE = 5; // pixels between spawns
const COLORS = [0xff4444, 0x44aaff, 0xffcc00, 0xff69b4, 0x44ff44, 0xff8800, 0xaa44ff];

interface TrailParticle {
  gfx: Graphics;
  life: number;
  maxLife: number;
  vx: number;
  vy: number;
}

const sparkleCtx = new GraphicsContext().circle(0, 0, 3).fill(0xffffff);

export class MouseTrail {
  private container: Container;
  private pool: Graphics[] = [];
  private active: TrailParticle[] = [];
  private lastX = 0;
  private lastY = 0;
  private hasPosition = false;

  constructor(parent: Container) {
    this.container = new Container();
    this.container.label = 'mouse-trail';
    parent.addChild(this.container);

    for (let i = 0; i < TRAIL_POOL_SIZE; i++) {
      const g = new Graphics(sparkleCtx);
      g.visible = false;
      this.container.addChild(g);
      this.pool.push(g);
    }

    // Self-wire mousemove
    window.addEventListener('mousemove', (e) => {
      this.updateMousePosition(e.clientX, e.clientY);
    });
  }

  updateMousePosition(x: number, y: number): void {
    if (!this.hasPosition) {
      this.lastX = x;
      this.lastY = y;
      this.hasPosition = true;
      return;
    }

    const dx = x - this.lastX;
    const dy = y - this.lastY;
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (dist >= SPAWN_DISTANCE) {
      const count = Math.floor(dist / SPAWN_DISTANCE);
      for (let i = 0; i < count; i++) {
        this.spawnSparkle(
          this.lastX + (dx / count) * i,
          this.lastY + (dy / count) * i
        );
      }
      this.lastX = x;
      this.lastY = y;
    }
  }

  private spawnSparkle(x: number, y: number): void {
    const gfx = this.pool.pop();
    if (!gfx) return;

    const color = COLORS[Math.floor(Math.random() * COLORS.length)];
    const life = 0.3 + Math.random() * 0.2;

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
      p.gfx.scale.x *= 0.97;
      p.gfx.scale.y *= 0.97;
    }
  }
}
