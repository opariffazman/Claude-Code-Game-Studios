/**
 * Magnet tool definition — pulls nearby elements on click/drag, flings on release.
 *
 * Implements: Mouse Tool System (Desk Smasher design doc)
 * Design: click pulls all elements within 300px toward the click point.
 *         Drag continuously pulls nearby elements toward the cursor.
 *         Release (onDragEnd) flings all nearby elements outward.
 */

import { Graphics } from 'pixi.js';
import type { DesktopElement } from '../../types';
import type { ParticleManager } from '../../vfx/particle-manager';
import type { AudioManager } from '../../audio/audio-manager';
import type { ToolDefinition } from './index';

/** Tuning values. */
const MAGNET_CONFIG = {
  /** Pull radius on click (px). */
  CLICK_RADIUS: 300,
  /** Maximum pull force applied to elements at the edge of the click radius (px/s). */
  CLICK_MAX_FORCE: 150,
  /** Pull radius during drag (px). */
  DRAG_RADIUS: 250,
  /** Force applied per drag frame at the edge of the drag radius (px/frame-delta scaled). */
  DRAG_FORCE: 8,
  /** Fling radius on release (px). */
  FLING_RADIUS: 250,
  /** Outward fling impulse on release (px/s). */
  FLING_IMPULSE: 300,
  /** Particle count on click. */
  CLICK_PARTICLES: 10,
  /** Particle count per drag frame. */
  DRAG_PARTICLES: 1,
  /** Particle count on release. */
  FLING_PARTICLES: 20,
  /** Half-width between the two poles (px — center of each arm). */
  CURSOR_POLE_X: 9,
  /** Top of the horseshoe arc (y, px — negative = up). */
  CURSOR_ARC_TOP: -13,
  /** Bottom of the straight arm section (y, px). */
  CURSOR_ARM_BOTTOM: 6,
  /** Pole cap height (px). */
  CURSOR_CAP_H: 5,
  /** Stroke width for the magnet body (px). */
  CURSOR_STROKE_W: 5,
} as const;

export const magnetTool: ToolDefinition = {
  name: 'magnet',

  /**
   * Draws a horseshoe magnet: U-shaped body with a semicircle arc at the top,
   * left pole capped red, right pole capped blue. White outline. ~28px tall.
   * @param g - Graphics instance owned by MouseToolManager.
   */
  drawCursor(g: Graphics): void {
    const px    = MAGNET_CONFIG.CURSOR_POLE_X;
    const arcY  = MAGNET_CONFIG.CURSOR_ARC_TOP;
    const armB  = MAGNET_CONFIG.CURSOR_ARM_BOTTOM;
    const capH  = MAGNET_CONFIG.CURSOR_CAP_H;
    const sw    = MAGNET_CONFIG.CURSOR_STROKE_W;
    const halfW = sw / 2;

    // --- White outline layer (drawn first, slightly wider) ---

    // Left arm outline.
    g.moveTo(-px, arcY).lineTo(-px, armB).stroke({ color: 0xffffff, width: sw + 3 });
    // Right arm outline.
    g.moveTo(px, arcY).lineTo(px, armB).stroke({ color: 0xffffff, width: sw + 3 });
    // Arc outline connecting tops — approximated with a semicircle via arc.
    // PixiJS v8 arc: arc(cx, cy, r, startAngle, endAngle, anticlockwise)
    g.moveTo(-px, arcY)
      .arc(0, arcY, px, Math.PI, 0, true)
      .stroke({ color: 0xffffff, width: sw + 3 });

    // Left pole cap outline.
    g.rect(-px - halfW - 1.5, armB - 1, sw + 3, capH + 2).fill({ color: 0xffffff });
    // Right pole cap outline.
    g.rect(px - halfW - 1.5, armB - 1, sw + 3, capH + 2).fill({ color: 0xffffff });

    // --- Colored body layer ---

    // Left arm — silver-gray body.
    g.moveTo(-px, arcY).lineTo(-px, armB).stroke({ color: 0xaaaacc, width: sw });
    // Right arm — silver-gray body.
    g.moveTo(px, arcY).lineTo(px, armB).stroke({ color: 0xaaaacc, width: sw });
    // Arc — silver-gray.
    g.moveTo(-px, arcY)
      .arc(0, arcY, px, Math.PI, 0, true)
      .stroke({ color: 0xaaaacc, width: sw });

    // Left (south) pole cap — RED.
    g.rect(-px - halfW, armB, sw, capH).fill({ color: 0xff2222 });
    // Right (south) pole cap — BLUE.
    g.rect(px - halfW, armB, sw, capH).fill({ color: 0x2266ff });

    // Pole cap text-like highlight strips.
    g.rect(-px - halfW + 1, armB + 1, sw - 2, 2).fill({ color: 0xff8888, alpha: 0.7 });
    g.rect(px - halfW + 1, armB + 1, sw - 2, 2).fill({ color: 0x88aaff, alpha: 0.7 });
  },

  /**
   * Click: pull all non-taskbar elements within CLICK_RADIUS toward click point.
   */
  applyClick(
    x: number,
    y: number,
    _target: DesktopElement | null,
    allElements: DesktopElement[],
    particles: ParticleManager,
    audio: AudioManager,
  ): { extraDamage: number; aoeTargets: DesktopElement[] } {
    audio.play('vortex');
    particles.emit(x, y, MAGNET_CONFIG.CLICK_PARTICLES, {
      speed: 30,
      gravity: 0,
      life: 0.5,
      spread: Math.PI * 2,
      scale: 0.6,
    });

    for (const el of allElements) {
      if (el.destroyed || el.type === 'taskbar') continue;
      const ecx = el.x + el.width / 2;
      const ecy = el.y + el.height / 2;
      const dist = Math.sqrt((x - ecx) ** 2 + (y - ecy) ** 2);
      if (dist < MAGNET_CONFIG.CLICK_RADIUS) {
        const angle = Math.atan2(y - ecy, x - ecx);
        const force = (1 - dist / MAGNET_CONFIG.CLICK_RADIUS) * MAGNET_CONFIG.CLICK_MAX_FORCE;
        el.vx += Math.cos(angle) * force;
        el.vy += Math.sin(angle) * force;
      }
    }

    return { extraDamage: 0, aoeTargets: [] };
  },

  /**
   * Drag: continuously pull nearby elements toward the cursor each frame.
   */
  applyDrag(
    x: number,
    y: number,
    allElements: DesktopElement[],
    particles: ParticleManager,
    _audio: AudioManager,
  ): DesktopElement[] {
    for (const el of allElements) {
      if (el.destroyed || el.type === 'taskbar') continue;
      const ecx = el.x + el.width / 2;
      const ecy = el.y + el.height / 2;
      const dist = Math.sqrt((x - ecx) ** 2 + (y - ecy) ** 2);
      if (dist < MAGNET_CONFIG.DRAG_RADIUS) {
        const angle = Math.atan2(y - ecy, x - ecx);
        const force = (1 - dist / MAGNET_CONFIG.DRAG_RADIUS) * MAGNET_CONFIG.DRAG_FORCE;
        el.vx += Math.cos(angle) * force;
        el.vy += Math.sin(angle) * force;
      }
    }
    particles.emit(x, y, MAGNET_CONFIG.DRAG_PARTICLES, {
      speed: 20,
      gravity: 0,
      life: 0.3,
      scale: 0.3,
    });
    return [];
  },

  /**
   * Release: fling all nearby elements outward from the release point.
   */
  onDragEnd(
    x: number,
    y: number,
    allElements: DesktopElement[],
    particles: ParticleManager,
    audio: AudioManager,
  ): void {
    audio.play('boing');
    for (const el of allElements) {
      if (el.destroyed || el.type === 'taskbar') continue;
      const ecx = el.x + el.width / 2;
      const ecy = el.y + el.height / 2;
      const dist = Math.sqrt((x - ecx) ** 2 + (y - ecy) ** 2);
      if (dist < MAGNET_CONFIG.FLING_RADIUS) {
        const angle = Math.atan2(ecy - y, ecx - x);
        el.vx += Math.cos(angle) * MAGNET_CONFIG.FLING_IMPULSE;
        el.vy += Math.sin(angle) * MAGNET_CONFIG.FLING_IMPULSE;
      }
    }
    particles.emit(x, y, MAGNET_CONFIG.FLING_PARTICLES, {
      speed: 300,
      gravity: 150,
      life: 0.6,
      spread: Math.PI * 2,
      scale: 1.0,
    });
  },
};
