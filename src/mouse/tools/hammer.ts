/**
 * Hammer tool definition — strong single-target knockback with a sparks drag trail.
 *
 * Implements: Mouse Tool System (Desk Smasher design doc)
 * Design: click deals 2 total damage (1 normal + 1 extra), random-direction knockback.
 *         Drag emits spark particles as the cursor sweeps across the desktop.
 */

import { Graphics } from 'pixi.js';
import type { DesktopElement } from '../../types';
import type { ParticleManager } from '../../vfx/particle-manager';
import type { AudioManager } from '../../audio/audio-manager';
import type { ToolDefinition } from './index';

/** Tuning values — all sourced here so designers can adjust without touching logic. */
const HAMMER_CONFIG = {
  /** Knockback speed applied to the target on click (px/s). */
  KNOCKBACK_SPEED: 250,
  /** Extra damage on top of the base 1 dealt by the calling system. */
  EXTRA_DAMAGE: 1,
  /** Particle count for click impact burst. */
  CLICK_PARTICLES: 20,
  /** Particle count per drag frame. */
  DRAG_PARTICLES: 6,
  /** Cursor indicator radius (px). */
  CURSOR_RADIUS: 18,
  /** Cursor crosshair half-length (px). */
  CROSSHAIR_HALF: 12,
} as const;

export const hammerTool: ToolDefinition = {
  name: 'hammer',

  /**
   * Draws the red crosshair cursor for the hammer tool.
   * @param g - Graphics instance owned by MouseToolManager (cleared before each call).
   */
  drawCursor(g: Graphics): void {
    g.circle(0, 0, HAMMER_CONFIG.CURSOR_RADIUS).stroke({ color: 0xff4444, width: 3 });
    g.moveTo(-HAMMER_CONFIG.CROSSHAIR_HALF, 0)
      .lineTo(HAMMER_CONFIG.CROSSHAIR_HALF, 0)
      .stroke({ color: 0xff4444, width: 2 });
    g.moveTo(0, -HAMMER_CONFIG.CROSSHAIR_HALF)
      .lineTo(0, HAMMER_CONFIG.CROSSHAIR_HALF)
      .stroke({ color: 0xff4444, width: 2 });
  },

  /**
   * Click: emit impact burst, apply knockback, return 1 extra damage.
   */
  applyClick(
    x: number,
    y: number,
    target: DesktopElement | null,
    _allElements: DesktopElement[],
    particles: ParticleManager,
    audio: AudioManager,
  ): { extraDamage: number; aoeTargets: DesktopElement[] } {
    audio.play('crack');
    particles.emit(x, y, HAMMER_CONFIG.CLICK_PARTICLES, {
      speed: 400,
      gravity: 500,
      life: 0.6,
      spread: Math.PI * 2,
      scale: 1.5,
    });

    if (target) {
      const angle = Math.random() * Math.PI * 2;
      target.vx += Math.cos(angle) * HAMMER_CONFIG.KNOCKBACK_SPEED;
      target.vy += Math.sin(angle) * HAMMER_CONFIG.KNOCKBACK_SPEED;
    }

    return { extraDamage: HAMMER_CONFIG.EXTRA_DAMAGE, aoeTargets: [] };
  },

  /**
   * Drag: emit spark trail particles as the cursor sweeps.
   * Actual drag-damage and hit detection is handled by MouseToolManager.
   */
  applyDrag(
    x: number,
    y: number,
    _allElements: DesktopElement[],
    particles: ParticleManager,
    _audio: AudioManager,
  ): DesktopElement[] {
    particles.emit(x, y, HAMMER_CONFIG.DRAG_PARTICLES, {
      speed: 150,
      gravity: 100,
      life: 0.2,
      scale: 0.4,
    });
    return [];
  },

  /** Hammer has no special release behaviour. */
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
