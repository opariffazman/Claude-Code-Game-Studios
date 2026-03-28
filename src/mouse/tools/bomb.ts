/**
 * Bomb tool definition — AoE click damage + fuse drag trail + explosion on release.
 *
 * Implements: Mouse Tool System (Desk Smasher design doc)
 * Design: click damages all elements within 200px radius with knockback.
 *         Drag leaves a fuse-spark trail. Release (onDragEnd) triggers a
 *         second AoE explosion at the release point with outward knockback.
 */

import { Graphics } from 'pixi.js';
import type { DesktopElement } from '../../types';
import type { ParticleManager } from '../../vfx/particle-manager';
import type { AudioManager } from '../../audio/audio-manager';
import type { ToolDefinition } from './index';

/** Tuning values. */
const BOMB_CONFIG = {
  /** AoE radius on click (px). */
  CLICK_RADIUS: 200,
  /** Knockback impulse applied to elements caught in click AoE (px/s). */
  CLICK_KNOCKBACK: 200,
  /** AoE radius on drag-end explosion (px). */
  EXPLODE_RADIUS: 180,
  /** Knockback impulse applied on drag-end explosion (px/s). */
  EXPLODE_KNOCKBACK: 250,
  /** Particle count on click. */
  CLICK_PARTICLES: 40,
  /** Particle count on drag (fuse sparks). */
  DRAG_PARTICLES: 5,
  /** Particle count on drag-end explosion. */
  EXPLODE_PARTICLES: 35,
  /** Cursor indicator radius (px). */
  CURSOR_RADIUS: 14,
  /** Center dot radius (px). */
  CURSOR_DOT: 4,
} as const;

export const bombTool: ToolDefinition = {
  name: 'bomb',

  /**
   * Draws the orange circle cursor for the bomb tool.
   * @param g - Graphics instance owned by MouseToolManager.
   */
  drawCursor(g: Graphics): void {
    g.circle(0, 0, BOMB_CONFIG.CURSOR_RADIUS).fill({ color: 0xff8800, alpha: 0.3 });
    g.circle(0, 0, BOMB_CONFIG.CURSOR_RADIUS).stroke({ color: 0xff8800, width: 2 });
    g.circle(0, 0, BOMB_CONFIG.CURSOR_DOT).fill({ color: 0xff8800 });
  },

  /**
   * Click: large particle burst + AoE knockback to all elements in radius.
   * No extra damage to direct target (AoE to nearby elements is the primary effect).
   */
  applyClick(
    x: number,
    y: number,
    _target: DesktopElement | null,
    allElements: DesktopElement[],
    particles: ParticleManager,
    audio: AudioManager,
  ): { extraDamage: number; aoeTargets: DesktopElement[] } {
    audio.play('pop');
    particles.emit(x, y, BOMB_CONFIG.CLICK_PARTICLES, {
      speed: 500,
      gravity: 200,
      life: 1.0,
      spread: Math.PI * 2,
      scale: 2.0,
    });

    const aoeTargets: DesktopElement[] = [];
    for (const el of allElements) {
      if (el.destroyed) continue;
      const ecx = el.x + el.width / 2;
      const ecy = el.y + el.height / 2;
      const dist = Math.sqrt((x - ecx) ** 2 + (y - ecy) ** 2);
      if (dist < BOMB_CONFIG.CLICK_RADIUS) {
        aoeTargets.push(el);
        const angle = Math.atan2(ecy - y, ecx - x);
        el.vx += Math.cos(angle) * BOMB_CONFIG.CLICK_KNOCKBACK;
        el.vy += Math.sin(angle) * BOMB_CONFIG.CLICK_KNOCKBACK;
      }
    }

    return { extraDamage: 0, aoeTargets };
  },

  /**
   * Drag: fuse-spark trail particles.
   */
  applyDrag(
    x: number,
    y: number,
    _allElements: DesktopElement[],
    particles: ParticleManager,
    _audio: AudioManager,
  ): DesktopElement[] {
    particles.emit(x, y, BOMB_CONFIG.DRAG_PARTICLES, {
      speed: 40,
      gravity: 50,
      life: 0.4,
      scale: 0.3,
    });
    return [];
  },

  /**
   * Release: explosion at the drag release point with outward AoE knockback.
   */
  onDragEnd(
    x: number,
    y: number,
    allElements: DesktopElement[],
    particles: ParticleManager,
    audio: AudioManager,
  ): void {
    audio.play('pop');
    particles.emit(x, y, BOMB_CONFIG.EXPLODE_PARTICLES, {
      speed: 450,
      gravity: 200,
      life: 0.8,
      spread: Math.PI * 2,
      scale: 1.8,
    });

    for (const el of allElements) {
      if (el.destroyed || el.type === 'taskbar') continue;
      const ecx = el.x + el.width / 2;
      const ecy = el.y + el.height / 2;
      const dist = Math.sqrt((x - ecx) ** 2 + (y - ecy) ** 2);
      if (dist < BOMB_CONFIG.EXPLODE_RADIUS) {
        const angle = Math.atan2(ecy - y, ecx - x);
        el.vx += Math.cos(angle) * BOMB_CONFIG.EXPLODE_KNOCKBACK;
        el.vy += Math.sin(angle) * BOMB_CONFIG.EXPLODE_KNOCKBACK;
      }
    }
  },
};
