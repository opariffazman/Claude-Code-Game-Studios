// PROTOTYPE - NOT FOR PRODUCTION
// Question: Is keyboard-mashing a fake desktop with destruction effects fun?
// Date: 2026-03-28

import { Container, Graphics, GraphicsContext } from 'pixi.js';
import { DesktopElement } from './desktop';
import { ParticleManager } from './particles';
import { AudioEngine } from './audio-engine';

type MouseTool = 'hammer' | 'laser' | 'bomb' | 'freeze' | 'magnet';

const TOOLS: MouseTool[] = ['hammer', 'laser', 'bomb', 'freeze', 'magnet'];

export class MouseTools {
  private currentIndex = 0;
  private cursor: Graphics;
  private trail: Graphics;
  private container: Container;
  private particles: ParticleManager;
  private audio: AudioEngine;
  private dragDamageTimers = new Map<string, number>();
  private lastX = 0;
  private lastY = 0;
  private lastDragX = 0;
  private lastDragY = 0;
  private hasDragStart = false;

  constructor(parent: Container, particles: ParticleManager, audio: AudioEngine) {
    this.container = new Container();
    this.container.label = 'mouse-tools';
    parent.addChild(this.container);
    this.particles = particles;
    this.audio = audio;

    // Persistent trail drawn on drag — cleared on desktop rebuild
    this.trail = new Graphics();
    this.trail.label = 'drag-trail';
    this.container.addChild(this.trail);

    // Custom cursor that shows current tool
    this.cursor = new Graphics();
    this.cursor.visible = false;
    this.container.addChild(this.cursor);

    // Track mouse position for cursor
    window.addEventListener('mousemove', (e) => {
      this.cursor.position.set(e.clientX, e.clientY);
      this.cursor.visible = true;
    });

    this.drawCursor();
  }

  get currentTool(): MouseTool {
    return TOOLS[this.currentIndex];
  }

  /** Advance to the next tool — called by main.ts after a click or drag completes. */
  cycleTool(): void {
    this.nextTool();
  }

  /** Cycle to next tool */
  private nextTool(): void {
    this.currentIndex = (this.currentIndex + 1) % TOOLS.length;
    this.drawCursor();
  }

  /** Draw cursor indicator for current tool */
  private drawCursor(): void {
    this.cursor.clear();
    // Remove any existing context and redraw
    switch (this.currentTool) {
      case 'hammer':
        // Red circle with crosshair
        this.cursor.circle(0, 0, 18).stroke({ color: 0xff4444, width: 3 });
        this.cursor.moveTo(-12, 0).lineTo(12, 0).stroke({ color: 0xff4444, width: 2 });
        this.cursor.moveTo(0, -12).lineTo(0, 12).stroke({ color: 0xff4444, width: 2 });
        break;
      case 'laser':
        // Green diamond
        this.cursor.poly([0, -15, 12, 0, 0, 15, -12, 0]).stroke({ color: 0x44ff44, width: 2 });
        this.cursor.circle(0, 0, 3).fill(0x44ff44);
        break;
      case 'bomb':
        // Orange circle with dots
        this.cursor.circle(0, 0, 14).fill({ color: 0xff8800, alpha: 0.3 });
        this.cursor.circle(0, 0, 14).stroke({ color: 0xff8800, width: 2 });
        this.cursor.circle(0, 0, 4).fill(0xff8800);
        break;
      case 'freeze':
        // Blue snowflake-ish (6 lines from center)
        for (let i = 0; i < 6; i++) {
          const angle = (i / 6) * Math.PI * 2;
          this.cursor.moveTo(0, 0).lineTo(Math.cos(angle) * 14, Math.sin(angle) * 14)
            .stroke({ color: 0x44ccff, width: 2 });
        }
        this.cursor.circle(0, 0, 3).fill(0x44ccff);
        break;
      case 'magnet':
        // Purple U-shape
        this.cursor.moveTo(-10, -12).lineTo(-10, 4).stroke({ color: 0xcc44ff, width: 3 });
        this.cursor.moveTo(10, -12).lineTo(10, 4).stroke({ color: 0xcc44ff, width: 3 });
        // Arc at bottom connecting the U
        this.cursor.moveTo(-10, 4).lineTo(-10, 8).lineTo(10, 8).lineTo(10, 4)
          .stroke({ color: 0xcc44ff, width: 3 });
        break;
    }
  }

  /** Apply the current tool's effect at a click position on a target element.
   *  Returns extra damage dealt (on top of the normal 1 from effects.applyRandom).
   *  Also applies unique visual/audio feedback per tool.
   */
  applyTool(x: number, y: number, target: DesktopElement | null, allElements: DesktopElement[]): {
    extraDamage: number;
    aoeTargets: DesktopElement[];
  } {
    const result = { extraDamage: 0, aoeTargets: [] as DesktopElement[] };

    switch (this.currentTool) {
      case 'hammer':
        // HAMMER: Big impact on single target, strong knockback, screen shake
        this.audio.play('crack');
        this.particles.emit(x, y, 20, { speed: 400, gravity: 500, life: 0.6, spread: Math.PI * 2, scale: 1.5 });
        result.extraDamage = 1; // Does 2 total damage (1 normal + 1 extra)
        if (target) {
          // Strong knockback
          const angle = Math.random() * Math.PI * 2;
          target.vx += Math.cos(angle) * 250;
          target.vy += Math.sin(angle) * 250;
        }
        break;

      case 'laser':
        // LASER: Precise hit, burns a line of particles from click point upward
        this.audio.play('zap');
        // Vertical beam particles
        for (let i = 0; i < 8; i++) {
          this.particles.emit(x, y - i * 20, 3, { speed: 50, gravity: -100, life: 0.3, spread: 0.3, scale: 0.5 });
        }
        result.extraDamage = 2; // Precision = more damage (3 total)
        break;

      case 'bomb':
        // BOMB: AoE explosion — damages ALL elements within radius
        this.audio.play('pop');
        this.particles.emit(x, y, 40, { speed: 500, gravity: 200, life: 1.0, spread: Math.PI * 2, scale: 2.0 });

        // Find nearby elements (within 200px radius)
        const RADIUS = 200;
        for (const el of allElements) {
          if (el.destroyed) continue;
          const ecx = el.x + el.width / 2;
          const ecy = el.y + el.height / 2;
          const dist = Math.sqrt((x - ecx) ** 2 + (y - ecy) ** 2);
          if (dist < RADIUS && el !== target) {
            result.aoeTargets.push(el);
            // Knockback away from explosion center
            const angle = Math.atan2(ecy - y, ecx - x);
            el.vx += Math.cos(angle) * 200;
            el.vy += Math.sin(angle) * 200;
          }
        }
        break;

      case 'freeze':
        // FREEZE: Stops target in place, makes it brittle (lower health)
        this.audio.play('tinkle');
        this.particles.emit(x, y, 15, { speed: 80, gravity: -50, life: 0.8, spread: Math.PI * 2, scale: 0.8 });
        if (target) {
          target.vx = 0;
          target.vy = 0;
          target.rotSpeed = 0;
          // Tint blue to show frozen
          target.gfx.tint = 0x88ccff;
          // Brittle: reduce remaining health by half
          target.health = Math.max(1, Math.floor(target.health / 2));
          setTimeout(() => {
            if (!target.destroyed) target.gfx.tint = 0xffffff;
          }, 2000);
        }
        break;

      case 'magnet':
        // MAGNET: Pulls nearby elements toward click point
        this.audio.play('vortex');
        this.particles.emit(x, y, 10, { speed: 30, gravity: 0, life: 0.5, spread: Math.PI * 2, scale: 0.6 });

        const PULL_RADIUS = 300;
        for (const el of allElements) {
          if (el.destroyed || el.type === 'taskbar') continue;
          const ecx = el.x + el.width / 2;
          const ecy = el.y + el.height / 2;
          const dist = Math.sqrt((x - ecx) ** 2 + (y - ecy) ** 2);
          if (dist < PULL_RADIUS) {
            // Pull toward click point
            const angle = Math.atan2(y - ecy, x - ecx);
            const force = (1 - dist / PULL_RADIUS) * 150;
            el.vx += Math.cos(angle) * force;
            el.vy += Math.sin(angle) * force;
          }
        }
        break;
    }

    return result;
  }

  get lastPosition() { return { x: this.lastX, y: this.lastY }; }

  /** Reset drag state — called on mouseup so the next drag starts fresh. */
  resetDrag(): void {
    this.hasDragStart = false;
  }

  /** Clear all persistent trail graphics — called on desktop rebuild. */
  clearTrails(): void {
    this.trail.clear();
  }

  /** Called every frame while mouse button is held and moving.
   *  Returns elements whose bounds the cursor crossed (throttled to 200ms per element).
   */
  applyDrag(x: number, y: number, allElements: DesktopElement[]): DesktopElement[] {
    this.lastX = x;
    this.lastY = y;

    // Draw a persistent trail line segment from the last drag position to the current one.
    // The line style varies per tool to reinforce the tool's identity.
    if (!this.hasDragStart) {
      this.hasDragStart = true;
      this.lastDragX = x;
      this.lastDragY = y;
      return []; // First point — no segment to draw yet
    }

    const toolColors: Record<string, { color: number; width: number; alpha: number }> = {
      'hammer': { color: 0xff6644, width: 6, alpha: 0.5 },   // Orange scratch
      'laser':  { color: 0x44ff44, width: 3, alpha: 0.7 },   // Green beam burn
      'bomb':   { color: 0xff8800, width: 4, alpha: 0.4 },   // Orange fuse trail
      'freeze': { color: 0x88ccff, width: 8, alpha: 0.4 },   // Wide ice streak
      'magnet': { color: 0xcc44ff, width: 5, alpha: 0.3 },   // Purple energy line
    };

    const style = toolColors[this.currentTool] ?? toolColors['hammer'];
    this.trail
      .moveTo(this.lastDragX, this.lastDragY)
      .lineTo(x, y)
      .stroke({ color: style.color, width: style.width, alpha: style.alpha });

    this.lastDragX = x;
    this.lastDragY = y;

    const hitElements: DesktopElement[] = [];

    switch (this.currentTool) {
      case 'hammer':
        // SWEEP: damage any element the cursor passes over + leave scratch trail
        this.particles.emit(x, y, 6, { speed: 150, gravity: 100, life: 0.2, scale: 0.4 });
        break;

      case 'laser':
        // BEAM: continuous vertical beam particles at cursor
        this.particles.emit(x, y - 30, 4, { speed: 30, gravity: -80, life: 0.2, spread: 0.2, scale: 0.3 });
        this.particles.emit(x, y, 2, { speed: 20, gravity: 0, life: 0.15, scale: 0.5 });
        break;

      case 'bomb':
        // FUSE TRAIL: leave a trail of sparks that will explode on mouseup
        this.particles.emit(x, y, 5, { speed: 40, gravity: 50, life: 0.4, scale: 0.3 });
        break;

      case 'freeze':
        // ICE TRAIL: freeze particles along drag path
        this.particles.emit(x, y, 5, { speed: 30, gravity: -20, life: 0.5, spread: Math.PI, scale: 0.4 });
        break;

      case 'magnet':
        // PULL: continuously pull nearby elements toward cursor
        for (const el of allElements) {
          if (el.destroyed || el.type === 'taskbar') continue;
          const ecx = el.x + el.width / 2;
          const ecy = el.y + el.height / 2;
          const dist = Math.sqrt((x - ecx) ** 2 + (y - ecy) ** 2);
          if (dist < 250) {
            const angle = Math.atan2(y - ecy, x - ecx);
            const force = (1 - dist / 250) * 8;
            el.vx += Math.cos(angle) * force;
            el.vy += Math.sin(angle) * force;
          }
        }
        this.particles.emit(x, y, 3, { speed: 20, gravity: 0, life: 0.3, scale: 0.3 });
        break;
    }

    // All tools: damage any element the drag cursor crosses (AABB check, throttled)
    for (const el of allElements) {
      if (el.destroyed || el.type === 'taskbar') continue;
      if (x >= el.x && x <= el.x + el.width && y >= el.y && y <= el.y + el.height) {
        const now = performance.now();
        const key = el.label;
        if (!this.dragDamageTimers.has(key) || now - this.dragDamageTimers.get(key)! > 200) {
          this.dragDamageTimers.set(key, now);
          hitElements.push(el);
          // Push element away from cursor
          const ecx = el.x + el.width / 2;
          const ecy = el.y + el.height / 2;
          const angle = Math.atan2(ecy - y, ecx - x);
          el.vx += Math.cos(angle) * 60;
          el.vy += Math.sin(angle) * 60;
        }
      }
    }

    return hitElements;
  }

  /** Called on mouseup — bomb explodes at release point, magnet flings outward. */
  onDragEnd(x: number, y: number, allElements: DesktopElement[]): void {
    this.resetDrag();
    switch (this.currentTool) {
      case 'bomb':
        // EXPLODE at release point
        this.audio.play('pop');
        this.particles.emit(x, y, 35, { speed: 450, gravity: 200, life: 0.8, spread: Math.PI * 2, scale: 1.8 });
        for (const el of allElements) {
          if (el.destroyed || el.type === 'taskbar') continue;
          const dist = Math.sqrt((x - el.x - el.width / 2) ** 2 + (y - el.y - el.height / 2) ** 2);
          if (dist < 180) {
            const angle = Math.atan2(el.y + el.height / 2 - y, el.x + el.width / 2 - x);
            el.vx += Math.cos(angle) * 250;
            el.vy += Math.sin(angle) * 250;
          }
        }
        break;

      case 'magnet':
        // RELEASE: fling all nearby elements outward
        this.audio.play('boing');
        for (const el of allElements) {
          if (el.destroyed || el.type === 'taskbar') continue;
          const dist = Math.sqrt((x - el.x - el.width / 2) ** 2 + (y - el.y - el.height / 2) ** 2);
          if (dist < 250) {
            const angle = Math.atan2(el.y + el.height / 2 - y, el.x + el.width / 2 - x);
            el.vx += Math.cos(angle) * 300;
            el.vy += Math.sin(angle) * 300;
          }
        }
        this.particles.emit(x, y, 20, { speed: 300, gravity: 150, life: 0.6, spread: Math.PI * 2, scale: 1.0 });
        break;
    }

    // Cycle tool after drag interaction completes
    this.nextTool();
  }
}
