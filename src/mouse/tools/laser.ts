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
  /** Outer reticle circle radius (px). */
  OUTER_R: 14,
  /** Inner reticle circle radius (px). */
  INNER_R: 5,
  /** Crosshair arm length beyond outer circle (px). */
  CROSSHAIR_EXT: 4,
  /** Gap between center and start of crosshair arm (px). */
  CROSSHAIR_GAP: 6,
} as const;

export const laserTool: ToolDefinition = {
  name: 'laser',

  /**
   * Draws a sci-fi targeting reticle: outer circle + crosshair arms + inner ring + center dot.
   * Total diameter ~28px. White outlines for visibility; bright green fill for glow feel.
   * @param g - Graphics instance owned by MouseToolManager.
   */
  drawCursor(g: Graphics): void {
    const OR = LASER_CONFIG.OUTER_R;
    const IR = LASER_CONFIG.INNER_R;
    const ext = LASER_CONFIG.CROSSHAIR_EXT;
    const gap = LASER_CONFIG.CROSSHAIR_GAP;

    // White halo behind outer ring.
    g.circle(0, 0, OR + 2).stroke({ color: 0xffffff, width: 3, alpha: 0.7 });

    // Outer circle — bright green.
    g.circle(0, 0, OR).stroke({ color: 0x00ff44, width: 2 });

    // Crosshair arms — white backing then green on top.
    // Four arms: up, down, left, right — each starts at `gap` from center.
    const arms: [number, number, number, number][] = [
      [0, -gap, 0, -(OR + ext)],
      [0,  gap, 0,  OR + ext],
      [-gap, 0, -(OR + ext), 0],
      [ gap, 0,  OR + ext,  0],
    ];
    for (const [x1, y1, x2, y2] of arms) {
      g.moveTo(x1, y1).lineTo(x2, y2).stroke({ color: 0xffffff, width: 3 });
    }
    for (const [x1, y1, x2, y2] of arms) {
      g.moveTo(x1, y1).lineTo(x2, y2).stroke({ color: 0x00ff44, width: 1.5 });
    }

    // Inner ring.
    g.circle(0, 0, IR).stroke({ color: 0x00ff44, width: 1.5 });

    // Center dot — white core for sharpness.
    g.circle(0, 0, 2.5).fill({ color: 0xffffff });
    g.circle(0, 0, 1.5).fill({ color: 0x00ff44 });
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
