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
  DRAG_PARTICLES: 3,
  /** Particle count on release. */
  FLING_PARTICLES: 20,
  /** Cursor arm top position y (px). */
  CURSOR_ARM_TOP: -12,
  /** Cursor arm bottom position y (px). */
  CURSOR_ARM_BOTTOM: 4,
  /** Cursor arm x offset (px). */
  CURSOR_ARM_X: 10,
} as const;

export const magnetTool: ToolDefinition = {
  name: 'magnet',

  /**
   * Draws the purple U-shape cursor for the magnet tool.
   * @param g - Graphics instance owned by MouseToolManager.
   */
  drawCursor(g: Graphics): void {
    // Left arm
    g.moveTo(-MAGNET_CONFIG.CURSOR_ARM_X, MAGNET_CONFIG.CURSOR_ARM_TOP)
      .lineTo(-MAGNET_CONFIG.CURSOR_ARM_X, MAGNET_CONFIG.CURSOR_ARM_BOTTOM)
      .stroke({ color: 0xcc44ff, width: 3 });
    // Right arm
    g.moveTo(MAGNET_CONFIG.CURSOR_ARM_X, MAGNET_CONFIG.CURSOR_ARM_TOP)
      .lineTo(MAGNET_CONFIG.CURSOR_ARM_X, MAGNET_CONFIG.CURSOR_ARM_BOTTOM)
      .stroke({ color: 0xcc44ff, width: 3 });
    // Bottom bridge
    g.moveTo(-MAGNET_CONFIG.CURSOR_ARM_X, MAGNET_CONFIG.CURSOR_ARM_BOTTOM)
      .lineTo(-MAGNET_CONFIG.CURSOR_ARM_X, MAGNET_CONFIG.CURSOR_ARM_BOTTOM + 4)
      .lineTo(MAGNET_CONFIG.CURSOR_ARM_X, MAGNET_CONFIG.CURSOR_ARM_BOTTOM + 4)
      .lineTo(MAGNET_CONFIG.CURSOR_ARM_X, MAGNET_CONFIG.CURSOR_ARM_BOTTOM)
      .stroke({ color: 0xcc44ff, width: 3 });
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
