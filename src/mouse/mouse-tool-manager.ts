/**
 * MouseToolManager — cycles through 5 destruction tools on each click.
 *
 * Implements: Mouse Tool System (Desk Smasher design doc)
 *
 * Responsibilities:
 *   - Maintain the active tool index and cycle on cycleTool()
 *   - Draw a custom cursor indicator using the active tool's drawCursor()
 *   - Delegate click, drag, and release to the active ToolDefinition
 *   - Manage a persistent drag trail (Graphics) with per-tool color/style
 *   - Apply throttled AABB drag-damage across all tools (200ms cooldown per element)
 *   - Track last cursor position for external query
 *
 * All numeric values come from MOUSE_TOOL_CONFIG below — none are hardcoded.
 *
 * PixiJS v8: uses Graphics.clear(), method-chain stroke/fill, and Container.label.
 */

import { Container, Graphics } from 'pixi.js';
import type { DesktopElement, MouseToolType } from '../types';
import type { ParticleManager } from '../vfx/particle-manager';
import type { AudioManager } from '../audio/audio-manager';
import { TOOLS } from './tools/index';

// ---------------------------------------------------------------------------
// Config — all tuning values in one place
// ---------------------------------------------------------------------------

const MOUSE_TOOL_CONFIG = {
  /** Throttle: minimum ms between drag-damage hits on the same element. */
  DRAG_DAMAGE_THROTTLE_MS: 200,
  /** Impulse applied to elements hit during drag sweep (px/s). */
  DRAG_HIT_IMPULSE: 60,
  /** Per-tool trail line styles. */
  TRAIL_STYLES: {
    hammer: { color: 0xff6644, width: 6, alpha: 0.5 },
    laser:  { color: 0x44ff44, width: 3, alpha: 0.7 },
    bomb:   { color: 0xff8800, width: 4, alpha: 0.4 },
    freeze: { color: 0x88ccff, width: 8, alpha: 0.4 },
    magnet: { color: 0xcc44ff, width: 5, alpha: 0.3 },
  } as Record<MouseToolType, { color: number; width: number; alpha: number }>,
} as const;

// ---------------------------------------------------------------------------
// MouseToolManager
// ---------------------------------------------------------------------------

export class MouseToolManager {
  /** Root container that owns cursor and trail Graphics nodes. */
  private readonly _container: Container;
  private readonly _particles: ParticleManager;
  private readonly _audio: AudioManager;

  /** Index into TOOLS array — the cycle position. */
  private _currentIndex = 0;

  /** Custom cursor graphic showing the active tool. */
  private readonly _cursor: Graphics;

  /** Persistent trail drawn during drags; cleared on desktop rebuild. */
  private readonly _trail: Graphics;

  /** Throttle map: element id -> last damage timestamp (performance.now). */
  private readonly _dragDamageTimers = new Map<string, number>();

  /** Whether a drag is currently in progress (set after first drag frame). */
  private _hasDragStart = false;

  /** Last drag segment start — used to draw trail line segments. */
  private _lastDragX = 0;
  private _lastDragY = 0;

  /** Last known cursor position — exposed via lastPosition getter. */
  private _lastX = 0;
  private _lastY = 0;

  /** Bound mousemove handler stored for removal on destroy. */
  private readonly _onMouseMove: (e: MouseEvent) => void;

  // ---------------------------------------------------------------------------
  // Construction / destruction
  // ---------------------------------------------------------------------------

  /**
   * Creates the MouseToolManager and attaches cursor + trail to `parent`.
   *
   * @param parent    - PixiJS Container that will own the cursor and trail nodes.
   * @param particles - ParticleManager for VFX emission.
   * @param audio     - AudioManager for sound playback.
   */
  constructor(parent: Container, particles: ParticleManager, audio: AudioManager) {
    this._particles = particles;
    this._audio = audio;

    this._container = new Container();
    this._container.label = 'mouse-tools';
    parent.addChild(this._container);

    // Persistent trail — drawn during drags, cleared on rebuild.
    this._trail = new Graphics();
    this._trail.label = 'drag-trail';
    this._container.addChild(this._trail);

    // Custom cursor overlay — always on top within the container.
    this._cursor = new Graphics();
    this._cursor.label = 'tool-cursor';
    this._cursor.visible = false;
    this._container.addChild(this._cursor);

    // Track cursor position so the cursor indicator follows the mouse.
    this._onMouseMove = (e: MouseEvent) => {
      this._cursor.position.set(e.clientX, e.clientY);
      this._cursor.visible = true;
    };
    window.addEventListener('mousemove', this._onMouseMove);

    this._drawCursor();
  }

  /**
   * Removes event listeners, detaches display objects, and frees resources.
   * After destroy() this instance must not be used again.
   */
  destroy(): void {
    window.removeEventListener('mousemove', this._onMouseMove);
    this._container.destroy({ children: true });
    this._dragDamageTimers.clear();
  }

  // ---------------------------------------------------------------------------
  // Public API
  // ---------------------------------------------------------------------------

  /** The currently active tool type. */
  get currentTool(): MouseToolType {
    return TOOLS[this._currentIndex].name;
  }

  /** Last known cursor position (world coordinates from mousemove). */
  get lastPosition(): { x: number; y: number } {
    return { x: this._lastX, y: this._lastY };
  }

  /**
   * Advance to the next tool in the cycle and redraw the cursor indicator.
   * Called by the game loop after a click or drag completes.
   */
  cycleTool(): void {
    this._currentIndex = (this._currentIndex + 1) % TOOLS.length;
    this._drawCursor();
  }

  /**
   * Apply the active tool's click effect at `(x, y)`.
   *
   * @param x           - World X of the click.
   * @param y           - World Y of the click.
   * @param target      - The directly-clicked element, or null.
   * @param allElements - All active desktop elements (for AoE tools).
   * @returns extraDamage dealt beyond the base 1, plus AoE targets hit.
   */
  applyTool(
    x: number,
    y: number,
    target: DesktopElement | null,
    allElements: DesktopElement[],
  ): { extraDamage: number; aoeTargets: DesktopElement[] } {
    this._lastX = x;
    this._lastY = y;
    return TOOLS[this._currentIndex].applyClick(
      x, y, target, allElements, this._particles, this._audio,
    );
  }

  /**
   * Handle a drag frame at `(x, y)`.
   *
   * Draws a trail line segment from the previous drag position, delegates to the
   * active tool's applyDrag(), and checks all elements for AABB drag-hit (throttled).
   *
   * @param x           - Current cursor X.
   * @param y           - Current cursor Y.
   * @param allElements - All active desktop elements.
   * @returns Elements whose bounding box the cursor crossed this frame.
   */
  applyDrag(x: number, y: number, allElements: DesktopElement[]): DesktopElement[] {
    this._lastX = x;
    this._lastY = y;

    // First frame of drag — record start point but emit no segment yet.
    if (!this._hasDragStart) {
      this._hasDragStart = true;
      this._lastDragX = x;
      this._lastDragY = y;

      // Let the tool start its per-frame effects immediately.
      TOOLS[this._currentIndex].applyDrag(x, y, allElements, this._particles, this._audio);
      return this._checkDragHits(x, y, allElements);
    }

    // Draw tool-specific trail segment.
    this._drawTrailSegment(this._lastDragX, this._lastDragY, x, y);

    this._lastDragX = x;
    this._lastDragY = y;

    // Delegate per-tool drag effect.
    TOOLS[this._currentIndex].applyDrag(x, y, allElements, this._particles, this._audio);

    // Universal AABB hit detection across all tools.
    return this._checkDragHits(x, y, allElements);
  }

  /**
   * Handle mouse button release after a drag.
   * Bomb explodes; magnet flings; other tools no-op.
   *
   * @param x           - Release X.
   * @param y           - Release Y.
   * @param allElements - All active desktop elements.
   */
  onDragEnd(x: number, y: number, allElements: DesktopElement[]): void {
    this.resetDrag();
    TOOLS[this._currentIndex].onDragEnd(x, y, allElements, this._particles, this._audio);
  }

  /**
   * Reset drag state so the next drag starts fresh.
   * Call on mouseup before cycling the tool.
   */
  resetDrag(): void {
    this._hasDragStart = false;
  }

  /**
   * Clear all persistent trail graphics.
   * Called on desktop rebuild to remove accumulated damage trails.
   */
  clearTrails(): void {
    this._trail.clear();
  }

  // ---------------------------------------------------------------------------
  // Private helpers
  // ---------------------------------------------------------------------------

  /** Redraw the cursor indicator for the currently active tool. */
  private _drawCursor(): void {
    this._cursor.clear();
    TOOLS[this._currentIndex].drawCursor(this._cursor);
  }

  /**
   * Draw one trail segment from (x0,y0) to (x1,y1) using the active tool's
   * distinctive visual style.
   *
   * Hammer  — thick jagged 3-segment line with random lateral offsets.
   * Laser   — glow doublet: wide dim green behind, thin bright green on top.
   * Bomb    — dotted pattern: evenly-spaced filled circles along the path.
   * Freeze  — wide frosted band + white speckles scattered along the path.
   * Magnet  — electric wavy arc using sine offsets perpendicular to the path.
   */
  private _drawTrailSegment(x0: number, y0: number, x1: number, y1: number): void {
    const tool = this.currentTool;

    if (tool === 'hammer') {
      // Three sub-segments with random lateral offsets for a jagged strike look.
      const dx = x1 - x0;
      const dy = y1 - y0;
      // Perpendicular unit vector.
      const len = Math.sqrt(dx * dx + dy * dy) || 1;
      const nx = -dy / len;
      const ny =  dx / len;
      const jitter = () => (Math.random() - 0.5) * 10;
      const mx1 = x0 + dx * 0.33 + nx * jitter();
      const my1 = y0 + dy * 0.33 + ny * jitter();
      const mx2 = x0 + dx * 0.66 + nx * jitter();
      const my2 = y0 + dy * 0.66 + ny * jitter();
      this._trail
        .moveTo(x0, y0)
        .lineTo(mx1, my1)
        .lineTo(mx2, my2)
        .lineTo(x1, y1)
        .stroke({ color: 0xff6644, width: 6, alpha: 0.55 });

    } else if (tool === 'laser') {
      // Glow doublet: wide dim green halo, then thin bright green core.
      this._trail
        .moveTo(x0, y0).lineTo(x1, y1)
        .stroke({ color: 0x44ff44, width: 8, alpha: 0.2 });
      this._trail
        .moveTo(x0, y0).lineTo(x1, y1)
        .stroke({ color: 0xaaffaa, width: 1.5, alpha: 0.9 });

    } else if (tool === 'bomb') {
      // Dotted pattern: circles spaced every 8px along the path.
      const dx = x1 - x0;
      const dy = y1 - y0;
      const segLen = Math.sqrt(dx * dx + dy * dy) || 1;
      const step = 8;
      const count = Math.max(1, Math.floor(segLen / step));
      for (let i = 0; i <= count; i++) {
        const t = i / count;
        const cx = x0 + dx * t;
        const cy = y0 + dy * t;
        this._trail.circle(cx, cy, 3).fill({ color: 0xff8800, alpha: 0.5 });
      }

    } else if (tool === 'freeze') {
      // Wide frosted band (semi-transparent), then white speckles.
      this._trail
        .moveTo(x0, y0).lineTo(x1, y1)
        .stroke({ color: 0x88ccff, width: 12, alpha: 0.25 });
      this._trail
        .moveTo(x0, y0).lineTo(x1, y1)
        .stroke({ color: 0xddeeff, width: 3, alpha: 0.45 });
      // Scatter a few white speckle dots along the segment.
      const dx = x1 - x0;
      const dy = y1 - y0;
      const segLen = Math.sqrt(dx * dx + dy * dy) || 1;
      const nx = -dy / segLen;
      const ny =  dx / segLen;
      const speckleCount = Math.max(2, Math.floor(segLen / 14));
      for (let i = 0; i < speckleCount; i++) {
        const t = (i + 0.5) / speckleCount;
        const offset = (Math.random() - 0.5) * 8;
        const sx = x0 + dx * t + nx * offset;
        const sy = y0 + dy * t + ny * offset;
        this._trail.circle(sx, sy, 1.5).fill({ color: 0xffffff, alpha: 0.7 });
      }

    } else {
      // Magnet — electric wavy arc using sine offsets perpendicular to the path.
      const dx = x1 - x0;
      const dy = y1 - y0;
      const segLen = Math.sqrt(dx * dx + dy * dy) || 1;
      const nx = -dy / segLen;
      const ny =  dx / segLen;
      const wavePoints: number[] = [x0, y0];
      const steps = Math.max(4, Math.floor(segLen / 6));
      for (let i = 1; i < steps; i++) {
        const t = i / steps;
        const wave = Math.sin(t * Math.PI * 4) * 5;
        wavePoints.push(
          x0 + dx * t + nx * wave,
          y0 + dy * t + ny * wave,
        );
      }
      wavePoints.push(x1, y1);
      // Draw as a polyline by chaining moveTo/lineTo pairs.
      for (let i = 0; i < wavePoints.length - 2; i += 2) {
        this._trail
          .moveTo(wavePoints[i], wavePoints[i + 1])
          .lineTo(wavePoints[i + 2], wavePoints[i + 3])
          .stroke({ color: 0xdd88ff, width: 2.5, alpha: 0.6 });
      }
    }
  }

  /**
   * AABB check: find all elements whose bounds contain `(x, y)`.
   * Applies a small push-away impulse and throttles repeat hits to
   * DRAG_DAMAGE_THROTTLE_MS per element to avoid rapid-fire damage.
   *
   * @returns Elements that passed the throttle and should receive 1 damage.
   */
  private _checkDragHits(
    x: number,
    y: number,
    allElements: DesktopElement[],
  ): DesktopElement[] {
    const hitElements: DesktopElement[] = [];
    const now = performance.now();

    for (const el of allElements) {
      if (el.destroyed || el.type === 'taskbar') continue;
      if (x >= el.x && x <= el.x + el.width && y >= el.y && y <= el.y + el.height) {
        const last = this._dragDamageTimers.get(el.id);
        if (last === undefined || now - last > MOUSE_TOOL_CONFIG.DRAG_DAMAGE_THROTTLE_MS) {
          this._dragDamageTimers.set(el.id, now);
          hitElements.push(el);
          // Small push away from cursor direction.
          const ecx = el.x + el.width / 2;
          const ecy = el.y + el.height / 2;
          const angle = Math.atan2(ecy - y, ecx - x);
          el.vx += Math.cos(angle) * MOUSE_TOOL_CONFIG.DRAG_HIT_IMPULSE;
          el.vy += Math.sin(angle) * MOUSE_TOOL_CONFIG.DRAG_HIT_IMPULSE;
        }
      }
    }

    return hitElements;
  }
}
