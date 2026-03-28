/**
 * Tool registry — exports the ToolDefinition interface and all 5 tool instances.
 *
 * Implements: Mouse Tool System (Desk Smasher design doc)
 *
 * Add new tools here and to TOOLS array; MouseToolManager picks them up automatically.
 */

import { Graphics } from 'pixi.js';
import type { DesktopElement, MouseToolType } from '../../types';
import type { ParticleManager } from '../../vfx/particle-manager';
import type { AudioManager } from '../../audio/audio-manager';

// ---------------------------------------------------------------------------
// ToolDefinition interface
// ---------------------------------------------------------------------------

/**
 * Contract every tool must satisfy.
 * MouseToolManager delegates all tool-specific work to these methods.
 */
export interface ToolDefinition {
  /** Which tool type this definition implements. */
  readonly name: MouseToolType;

  /**
   * Draw the cursor indicator into `g` (already cleared before each call).
   * @param g - Graphics instance owned by MouseToolManager.
   */
  drawCursor(g: Graphics): void;

  /**
   * Handle a click at `(x, y)`.
   * @returns extraDamage added on top of the base damage, plus any AoE targets hit.
   */
  applyClick(
    x: number,
    y: number,
    target: DesktopElement | null,
    allElements: DesktopElement[],
    particles: ParticleManager,
    audio: AudioManager,
  ): { extraDamage: number; aoeTargets: DesktopElement[] };

  /**
   * Handle a drag frame at `(x, y)`.
   * @returns Elements the drag crossed that should receive damage this frame.
   */
  applyDrag(
    x: number,
    y: number,
    allElements: DesktopElement[],
    particles: ParticleManager,
    audio: AudioManager,
  ): DesktopElement[];

  /**
   * Handle mouse button release at `(x, y)` after a drag.
   * Bomb explodes; magnet flings; most tools no-op.
   */
  onDragEnd(
    x: number,
    y: number,
    allElements: DesktopElement[],
    particles: ParticleManager,
    audio: AudioManager,
  ): void;
}

// ---------------------------------------------------------------------------
// Tool instances
// ---------------------------------------------------------------------------

export { hammerTool } from './hammer';
export { laserTool }  from './laser';
export { bombTool }   from './bomb';
export { freezeTool } from './freeze';
export { magnetTool } from './magnet';

import { hammerTool } from './hammer';
import { laserTool }  from './laser';
import { bombTool }   from './bomb';
import { freezeTool } from './freeze';
import { magnetTool } from './magnet';

/**
 * Ordered array of all tool definitions — the cycle order matches this array.
 * MouseToolManager advances currentIndex mod TOOLS.length on each cycleTool() call.
 */
export const TOOLS: readonly ToolDefinition[] = [
  hammerTool,
  laserTool,
  bombTool,
  freezeTool,
  magnetTool,
] as const;
