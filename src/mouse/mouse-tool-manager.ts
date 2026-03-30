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
  /** Max trail segments before clear+restart (prevents GPU geometry bloat). */
  MAX_TRAIL_SEGMENTS: 80,
  /** Per-tool trail line styles — single stroke per segment for performance. */
  TRAIL_STYLES: {
    hammer: { color: 0xff4400, width: 10, alpha: 0.7 },
    laser:  { color: 0x00ff44, width: 3,  alpha: 0.9 },
    bomb:   { color: 0xffcc00, width: 8,  alpha: 0.5 },
    freeze: { color: 0x44ddff, width: 12, alpha: 0.4 },
    magnet: { color: 0xcc44ff, width: 5,  alpha: 0.7 },
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

  /** Drag frame counter for particle throttling — emit every 3rd frame. */
  private _dragFrameCount = 0;

  /** Trail segment counter — clear trail when cap is hit. */
  private _trailSegmentCount = 0;

  /** Accumulated drag distance for periodic wallpaper-stamp throttling. */
  private _dragDistAccum = 0;

  /** Minimum drag distance (px) between consecutive wallpaper damage stamps. */
  private static readonly STAMP_INTERVAL_PX = 40;

  /** Bound mousemove handler stored for removal on destroy. */
  private readonly _onMouseMove: (e: MouseEvent) => void;

  /** Bound resize handler stored for removal on destroy. */
  private readonly _onResize: () => void;

  // BUG-006/BUG-007 fix: cache canvas bounds so mousemove does not trigger
  // a layout read (getBoundingClientRect) on every event.
  private _canvasRect: DOMRect | null = null;
  private _canvasScaleX = 1;
  private _canvasScaleY = 1;

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

    // Cache canvas bounds for coordinate conversion; refresh on resize.
    this._onResize = () => this._updateCanvasRect();
    this._updateCanvasRect();
    window.addEventListener('resize', this._onResize);

    // Track cursor position so the cursor indicator follows the mouse.
    // Convert viewport coords to PixiJS canvas coords using cached rect.
    this._onMouseMove = (e: MouseEvent) => {
      const cx = this._canvasRect
        ? (e.clientX - this._canvasRect.left) * this._canvasScaleX
        : e.clientX;
      const cy = this._canvasRect
        ? (e.clientY - this._canvasRect.top) * this._canvasScaleY
        : e.clientY;
      this._cursor.position.set(cx, cy);
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
    window.removeEventListener('resize', this._onResize);
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
  applyDrag(
    x: number,
    y: number,
    allElements: DesktopElement[],
  ): { hitElements: DesktopElement[]; stamp: { x: number; y: number } | null } {
    this._lastX = x;
    this._lastY = y;
    this._dragFrameCount++;

    // Only emit particles every 3rd drag frame to reduce GPU load.
    const shouldEmitParticles = this._dragFrameCount % 3 === 0;

    // First frame of drag — record start point but emit no segment yet.
    if (!this._hasDragStart) {
      this._hasDragStart = true;
      this._lastDragX = x;
      this._lastDragY = y;

      if (shouldEmitParticles) {
        TOOLS[this._currentIndex].applyDrag(x, y, allElements, this._particles, this._audio);
      }
      return { hitElements: this._checkDragHits(x, y, allElements), stamp: null };
    }

    // Measure this segment's length BEFORE updating _lastDragX/Y.
    const segDist = Math.sqrt(
      (x - this._lastDragX) ** 2 + (y - this._lastDragY) ** 2,
    );

    // Trail line removed — wallpaper stamps are the sole drag visual.
    // this._drawTrailSegment(this._lastDragX, this._lastDragY, x, y);

    this._lastDragX = x;
    this._lastDragY = y;

    // Accumulate distance and fire a stamp when the threshold is crossed.
    this._dragDistAccum += segDist;
    let stamp: { x: number; y: number } | null = null;
    if (this._dragDistAccum >= MouseToolManager.STAMP_INTERVAL_PX) {
      this._dragDistAccum -= MouseToolManager.STAMP_INTERVAL_PX;
      stamp = { x, y };
    }

    // Delegate per-tool drag effect (throttled).
    if (shouldEmitParticles) {
      TOOLS[this._currentIndex].applyDrag(x, y, allElements, this._particles, this._audio);
    }

    // Universal AABB hit detection across all tools.
    return { hitElements: this._checkDragHits(x, y, allElements), stamp };
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
    this._dragFrameCount = 0;
    this._trailSegmentCount = 0;
    this._dragDistAccum = 0;
  }

  /**
   * Clear all persistent trail graphics and the drag-damage throttle map.
   * Called on desktop rebuild to remove accumulated damage trails.
   *
   * BUG-004 fix: also clears _dragDamageTimers so stale element IDs from the
   * previous desktop cycle do not grow the map unbounded.
   */
  clearTrails(): void {
    this._trail.clear();
    this._dragDamageTimers.clear();
  }

  // ---------------------------------------------------------------------------
  // Private helpers
  // ---------------------------------------------------------------------------

  /**
   * Read the canvas element's bounding rect and derive CSS→canvas scale factors.
   * Called once at construction and again on every window resize.
   *
   * BUG-006/BUG-007 fix: caching here avoids a forced layout read (getBoundingClientRect)
   * inside the high-frequency mousemove handler.
   */
  private _updateCanvasRect(): void {
    const canvas = document.querySelector('canvas');
    if (canvas) {
      this._canvasRect = canvas.getBoundingClientRect();
      // With autoDensity: true, PixiJS maps CSS pixels to stage coords.
      // Do NOT scale by devicePixelRatio — just subtract offset.
      this._canvasScaleX = 1;
      this._canvasScaleY = 1;
    }
  }

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
    // Cap: clear and restart when too many segments have accumulated.
    if (this._trailSegmentCount >= MOUSE_TOOL_CONFIG.MAX_TRAIL_SEGMENTS) {
      this._trail.clear();
      this._trailSegmentCount = 0;
    }

    // Single stroke per segment — performant, still visually distinct via width/color.
    const s = MOUSE_TOOL_CONFIG.TRAIL_STYLES[this.currentTool as MouseToolType]
      ?? MOUSE_TOOL_CONFIG.TRAIL_STYLES.hammer;
    this._trail
      .moveTo(x0, y0)
      .lineTo(x1, y1)
      .stroke({ color: s.color, width: s.width, alpha: s.alpha });

    this._trailSegmentCount++;
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
