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
  DRAG_PARTICLES: 2,
  /** Snowflake arm count (always 6 for a real snowflake). */
  CURSOR_ARMS: 6,
  /** Snowflake main arm length from center (px). */
  CURSOR_ARM_LENGTH: 15,
  /** Barb length perpendicular to each arm, placed at midpoint (px). */
  CURSOR_BARB_LENGTH: 6,
  /** Center dot radius (px). */
  CURSOR_DOT: 3,
} as const;

export const freezeTool: ToolDefinition = {
  name: 'freeze',

  /**
   * Draws a proper snowflake: 6 main arms radiating from center, each with two
   * perpendicular barbs at the midpoint. White outline + light-blue fill for
   * visibility. Total diameter ~30px.
   * @param g - Graphics instance owned by MouseToolManager.
   */
  drawCursor(g: Graphics): void {
    const armLen  = FREEZE_CONFIG.CURSOR_ARM_LENGTH;
    const barbLen = FREEZE_CONFIG.CURSOR_BARB_LENGTH;
    const mid     = armLen * 0.5;

    for (let i = 0; i < FREEZE_CONFIG.CURSOR_ARMS; i++) {
      const angle = (i / FREEZE_CONFIG.CURSOR_ARMS) * Math.PI * 2;
      const ca = Math.cos(angle);
      const sa = Math.sin(angle);

      // Perpendicular direction for barbs.
      const bp = angle + Math.PI / 2;
      const cb = Math.cos(bp);
      const sb = Math.sin(bp);

      // Tip and midpoint of this arm.
      const tipX = ca * armLen;
      const tipY = sa * armLen;
      const midX = ca * mid;
      const midY = sa * mid;

      // White backing — main arm.
      g.moveTo(0, 0).lineTo(tipX, tipY).stroke({ color: 0xffffff, width: 3 });

      // Left barb (white backing).
      g.moveTo(midX, midY)
        .lineTo(midX + cb * barbLen, midY + sb * barbLen)
        .stroke({ color: 0xffffff, width: 3 });
      // Right barb (white backing).
      g.moveTo(midX, midY)
        .lineTo(midX - cb * barbLen, midY - sb * barbLen)
        .stroke({ color: 0xffffff, width: 3 });
    }

    // Colored pass on top — light blue main arms.
    for (let i = 0; i < FREEZE_CONFIG.CURSOR_ARMS; i++) {
      const angle = (i / FREEZE_CONFIG.CURSOR_ARMS) * Math.PI * 2;
      const ca = Math.cos(angle);
      const sa = Math.sin(angle);
      const bp = angle + Math.PI / 2;
      const cb = Math.cos(bp);
      const sb = Math.sin(bp);
      const mid2X = ca * mid;
      const mid2Y = sa * mid;

      g.moveTo(0, 0)
        .lineTo(ca * armLen, sa * armLen)
        .stroke({ color: 0x88ddff, width: 2 });
      g.moveTo(mid2X, mid2Y)
        .lineTo(mid2X + cb * barbLen, mid2Y + sb * barbLen)
        .stroke({ color: 0xaaeeff, width: 1.5 });
      g.moveTo(mid2X, mid2Y)
        .lineTo(mid2X - cb * barbLen, mid2Y - sb * barbLen)
        .stroke({ color: 0xaaeeff, width: 1.5 });
    }

    // Center dot — white core + bright blue.
    g.circle(0, 0, FREEZE_CONFIG.CURSOR_DOT + 1).fill({ color: 0xffffff });
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
