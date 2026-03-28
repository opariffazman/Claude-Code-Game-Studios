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
  /** Hammer head width (px). */
  HEAD_W: 22,
  /** Hammer head height (px). */
  HEAD_H: 12,
  /** Handle width (px). */
  HANDLE_W: 6,
  /** Handle height (px). */
  HANDLE_H: 18,
} as const;

export const hammerTool: ToolDefinition = {
  name: 'hammer',

  /**
   * Draws a hammer shape: rectangular head + handle, centered at (0,0).
   * Total height ~30px. White outline for visibility on any background.
   * @param g - Graphics instance owned by MouseToolManager (cleared before each call).
   */
  drawCursor(g: Graphics): void {
    const hw = HAMMER_CONFIG.HEAD_W;
    const hh = HAMMER_CONFIG.HEAD_H;
    const hdw = HAMMER_CONFIG.HANDLE_W;
    const hdh = HAMMER_CONFIG.HANDLE_H;

    // Position head at top, handle hanging below — total span ~30px.
    const headTop = -15;
    const headLeft = -hw / 2;
    const handleTop = headTop + hh;

    // White outline pass (drawn slightly larger).
    g.rect(headLeft - 2, headTop - 2, hw + 4, hh + 4).fill({ color: 0xffffff });
    g.rect(-hdw / 2 - 2, handleTop - 1, hdw + 4, hdh + 2).fill({ color: 0xffffff });

    // Hammer head — deep orange fill.
    g.rect(headLeft, headTop, hw, hh).fill({ color: 0xff5500 });

    // Face highlight on head (lighter strip at top).
    g.rect(headLeft + 2, headTop + 2, hw - 4, 4).fill({ color: 0xff8844 });

    // Handle — dark wood brown.
    g.rect(-hdw / 2, handleTop, hdw, hdh).fill({ color: 0x7a4400 });

    // Handle highlight.
    g.rect(-hdw / 2 + 1, handleTop + 2, 2, hdh - 4).fill({ color: 0xaa6622 });
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
