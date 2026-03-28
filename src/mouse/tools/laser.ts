/**
 * Laser tool definition — precision beam with high single-target damage.
 *
 * Implements: Mouse Tool System (Desk Smasher design doc)
 * Design: click fires a vertical beam (particle column), 2 extra damage (3 total).
 *         Drag emits a continuous beam effect at the cursor position.
 */

import { Graphics } from 'pixi.js';
import type { DesktopElement } from '../../types';
import type { ParticleManager } from '../../vfx/particle-manager';
import type { AudioManager } from '../../audio/audio-manager';
import type { ToolDefinition } from './index';

/** Tuning values. */
const LASER_CONFIG = {
  /** Extra damage dealt by a laser click. */
  EXTRA_DAMAGE: 2,
  /** Number of beam segments emitted on click. */
  BEAM_SEGMENTS: 8,
  /** Vertical spacing between beam segments (px). */
  BEAM_SEGMENT_SPACING: 20,
  /** Diamond cursor half-width and half-height (px). */
  CURSOR_HALF: 15,
  CURSOR_HALF_W: 12,
} as const;

export const laserTool: ToolDefinition = {
  name: 'laser',

  /**
   * Draws the green diamond cursor for the laser tool.
   * @param g - Graphics instance owned by MouseToolManager.
   */
  drawCursor(g: Graphics): void {
    g.poly([
      0, -LASER_CONFIG.CURSOR_HALF,
      LASER_CONFIG.CURSOR_HALF_W, 0,
      0, LASER_CONFIG.CURSOR_HALF,
      -LASER_CONFIG.CURSOR_HALF_W, 0,
    ]).stroke({ color: 0x44ff44, width: 2 });
    g.circle(0, 0, 3).fill({ color: 0x44ff44 });
  },

  /**
   * Click: emit a vertical particle beam upward, return 2 extra damage.
   */
  applyClick(
    x: number,
    y: number,
    _target: DesktopElement | null,
    _allElements: DesktopElement[],
    particles: ParticleManager,
    audio: AudioManager,
  ): { extraDamage: number; aoeTargets: DesktopElement[] } {
    audio.play('zap');
    for (let i = 0; i < LASER_CONFIG.BEAM_SEGMENTS; i++) {
      particles.emit(x, y - i * LASER_CONFIG.BEAM_SEGMENT_SPACING, 3, {
        speed: 50,
        gravity: -100,
        life: 0.3,
        spread: 0.3,
        scale: 0.5,
      });
    }
    return { extraDamage: LASER_CONFIG.EXTRA_DAMAGE, aoeTargets: [] };
  },

  /**
   * Drag: continuous beam particles at cursor position.
   */
  applyDrag(
    x: number,
    y: number,
    _allElements: DesktopElement[],
    particles: ParticleManager,
    _audio: AudioManager,
  ): DesktopElement[] {
    particles.emit(x, y - 30, 4, { speed: 30, gravity: -80, life: 0.2, spread: 0.2, scale: 0.3 });
    particles.emit(x, y, 2, { speed: 20, gravity: 0, life: 0.15, scale: 0.5 });
    return [];
  },

  /** Laser has no special release behaviour. */
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
