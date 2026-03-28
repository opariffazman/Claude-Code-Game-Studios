/**
 * Freeze tool definition — stops target motion and halves remaining health.
 *
 * Implements: Mouse Tool System (Desk Smasher design doc)
 * Design: click zeroes velocity and rotSpeed on the target, halves health to
 *         make it brittle. Drag emits an ice-particle trail.
 *
 * NOTE: The prototype tinted target.gfx blue, but DesktopElement is a pure data
 * interface with no gfx reference. The visual tint is a UI concern and must be
 * implemented by the UI/desktop layer via an event or signal (out of scope here).
 * Motion freeze + health halving are the data-layer effects implemented here.
 */

import { Graphics } from 'pixi.js';
import type { DesktopElement } from '../../types';
import type { ParticleManager } from '../../vfx/particle-manager';
import type { AudioManager } from '../../audio/audio-manager';
import type { ToolDefinition } from './index';

/** Tuning values. */
const FREEZE_CONFIG = {
  /** Minimum health after freeze (prevents instant-kill brittleness). */
  MIN_HEALTH_AFTER_FREEZE: 1,
  /** Particle count on click. */
  CLICK_PARTICLES: 15,
  /** Particle count per drag frame. */
  DRAG_PARTICLES: 5,
  /** Snowflake cursor arm count. */
  CURSOR_ARMS: 6,
  /** Snowflake arm length (px). */
  CURSOR_ARM_LENGTH: 14,
  /** Center dot radius (px). */
  CURSOR_DOT: 3,
} as const;

export const freezeTool: ToolDefinition = {
  name: 'freeze',

  /**
   * Draws the blue snowflake cursor for the freeze tool.
   * @param g - Graphics instance owned by MouseToolManager.
   */
  drawCursor(g: Graphics): void {
    for (let i = 0; i < FREEZE_CONFIG.CURSOR_ARMS; i++) {
      const angle = (i / FREEZE_CONFIG.CURSOR_ARMS) * Math.PI * 2;
      g.moveTo(0, 0)
        .lineTo(
          Math.cos(angle) * FREEZE_CONFIG.CURSOR_ARM_LENGTH,
          Math.sin(angle) * FREEZE_CONFIG.CURSOR_ARM_LENGTH,
        )
        .stroke({ color: 0x44ccff, width: 2 });
    }
    g.circle(0, 0, FREEZE_CONFIG.CURSOR_DOT).fill({ color: 0x44ccff });
  },

  /**
   * Click: stop target motion, halve health, emit ice particles.
   */
  applyClick(
    x: number,
    y: number,
    target: DesktopElement | null,
    _allElements: DesktopElement[],
    particles: ParticleManager,
    audio: AudioManager,
  ): { extraDamage: number; aoeTargets: DesktopElement[] } {
    audio.play('tinkle');
    particles.emit(x, y, FREEZE_CONFIG.CLICK_PARTICLES, {
      speed: 80,
      gravity: -50,
      life: 0.8,
      spread: Math.PI * 2,
      scale: 0.8,
    });

    if (target) {
      target.vx = 0;
      target.vy = 0;
      target.rotSpeed = 0;
      target.health = Math.max(
        FREEZE_CONFIG.MIN_HEALTH_AFTER_FREEZE,
        Math.floor(target.health / 2),
      );
    }

    return { extraDamage: 0, aoeTargets: [] };
  },

  /**
   * Drag: ice particle trail along the cursor path.
   */
  applyDrag(
    x: number,
    y: number,
    _allElements: DesktopElement[],
    particles: ParticleManager,
    _audio: AudioManager,
  ): DesktopElement[] {
    particles.emit(x, y, FREEZE_CONFIG.DRAG_PARTICLES, {
      speed: 30,
      gravity: -20,
      life: 0.5,
      spread: Math.PI,
      scale: 0.4,
    });
    return [];
  },

  /** Freeze has no special release behaviour. */
  onDragEnd(
    _x: number,
    _y: number,
    _allElements: DesktopElement[],
    _particles: ParticleManager,
    _audio: AudioManager,
  ): void {
    // No-op.
  },
};
