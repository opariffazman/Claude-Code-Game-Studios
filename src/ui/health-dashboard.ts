/**
 * Health Dashboard — horizontal health bars embedded in the taskbar.
 *
 * Three horizontal bars show aggregate health per element category:
 *   Green  = animals (icon elements)
 *   Red    = structures (window + sticky + widget elements)
 *   Blue   = alerts (notification elements)
 *
 * Bars sit between the Start button and the tray icons, filling proportionally
 * left-to-right as health depletes. Implemented as plain Graphics rounded rects
 * so no SVG rotation hacks are required.
 *
 * Implements: health-dashboard.md — centralized health display, taskbar-embedded layout.
 * Spec: desk-smasher-v37 — horizontal bars in taskbar replacing right-edge dashboard.
 */
import { Container, Graphics } from 'pixi.js';
import type { DesktopElement, ElementType } from '../types';

// ---------------------------------------------------------------------------
// Bar colors per category
// ---------------------------------------------------------------------------

const BAR_COLORS: Record<string, number> = {
  animals:    0x44cc44,
  structures: 0xcc4444,
  alerts:     0x4488cc,
};

// ---------------------------------------------------------------------------
// Layout tuning knobs
// ---------------------------------------------------------------------------

/** Left edge of bar area — after Start button (50 px) plus a small gap. */
const BAR_AREA_START_X = 55;
/** Right margin reserved for tray icons + clock. */
const BAR_AREA_RIGHT_RESERVE = 120;
/** Gap in pixels between adjacent bars. */
const BAR_GAP = 6;
/** Bar height as a fraction of taskbar height. */
const BAR_HEIGHT_RATIO = 0.5;
/** Corner radius on rounded rect bars. */
const BAR_CORNER_RADIUS = 4;
/** Background track alpha. */
const BAR_BG_ALPHA = 0.3;
/** Minimum fill width in pixels — keeps bar visible near zero health. */
const MIN_FILL_W = 6;

const CATEGORIES = ['animals', 'structures', 'alerts'] as const;
type Category = (typeof CATEGORIES)[number];

// ---------------------------------------------------------------------------
// Category mapping
// ---------------------------------------------------------------------------

/** Map an ElementType to its dashboard category. Returns null for excluded types. */
function getCategory(type: ElementType): Category | null {
  switch (type) {
    case 'icon':                                   return 'animals';
    case 'window': case 'sticky': case 'widget':   return 'structures';
    case 'notification':                           return 'alerts';
    default:                                       return null; // taskbar excluded
  }
}

// ---------------------------------------------------------------------------
// Internal state
// ---------------------------------------------------------------------------

interface BarState {
  /** Category this bar tracks. */
  category: Category;
  /** Dark track behind the fill. */
  bgRect: Graphics;
  /** Colored fill rect — width shrinks as health depletes. */
  fillRect: Graphics;
  /** X origin of this bar in taskbar-local coordinates. */
  barX: number;
  /** Y origin of this bar in taskbar-local coordinates. */
  barY: number;
  /** Maximum bar width at full health. */
  maxW: number;
  /** Bar height in pixels. */
  barH: number;
  /** Sum of maxHealth across all tracked elements (set on build/rebuild). */
  maxHealthSum: number;
}

// ---------------------------------------------------------------------------
// HealthDashboard
// ---------------------------------------------------------------------------

/**
 * Centralized health dashboard — horizontal bars inside the taskbar container.
 *
 * Lifecycle:
 *   1. `new HealthDashboard()` — no-op until build() is called.
 *   2. `build(elements, taskbarContainer, taskbarW, taskbarH)` — after desktop generation.
 *   3. `onDamage(elements)` — after any health decrement in the hit pipeline.
 *   4. `resize(elements, screenW, screenH)` — on window resize (after debounce).
 *   5. `destroy()` — cleanup.
 */
export class HealthDashboard {
  /** Container owned by this dashboard — child of the taskbar container. */
  private dashContainer: Container | null = null;
  private bars: BarState[] = [];
  private _ready = false;

  // Cached taskbar reference + dims — used by resize() to rebuild without
  // requiring app.ts to re-pass the taskbar container.
  private _taskbarContainer: Container | null = null;
  private _taskbarW = 0;
  private _taskbarH = 0;

  // screenW/H kept for API compatibility with the resize() call in app.ts.
  private _screenW: number;
  private _screenH: number;

  constructor(_parent: Container, screenW: number, screenH: number) {
    // _parent is no longer used — bars live inside the taskbar container.
    // Parameter kept for API compatibility so app.ts construction site is unchanged.
    this._screenW = screenW;
    this._screenH = screenH;
  }

  // ---------------------------------------------------------------------------
  // Public API
  // ---------------------------------------------------------------------------

  /**
   * Build (or rebuild) the dashboard bars inside the taskbar container.
   * Call after desktop generation and after every rebuild cycle.
   *
   * @param elements         - Full element list from DesktopManager.
   * @param taskbarContainer - The taskbar Container from DesktopManager.
   * @param taskbarW         - Width of the taskbar in pixels.
   * @param taskbarH         - Height of the taskbar in pixels.
   */
  build(
    elements: DesktopElement[],
    taskbarContainer?: Container,
    taskbarW?: number,
    taskbarH?: number,
  ): void {
    // Update cached taskbar refs when new ones are provided.
    if (taskbarContainer !== undefined) this._taskbarContainer = taskbarContainer;
    if (taskbarW !== undefined) this._taskbarW = taskbarW;
    if (taskbarH !== undefined) this._taskbarH = taskbarH;

    if (!this._taskbarContainer || elements.length === 0) return;

    // Tear down previous build.
    if (this.dashContainer) {
      this._taskbarContainer.removeChild(this.dashContainer);
      this.dashContainer.destroy({ children: true });
      this.dashContainer = null;
    }
    this.bars = [];
    this._ready = false;

    const tbW = this._taskbarW;
    const tbH = this._taskbarH;

    // Determine which categories have at least one element.
    const activeCategories = CATEGORIES.filter(cat =>
      elements.some(e => getCategory(e.type) === cat),
    );
    if (activeCategories.length === 0) return;

    // Compute per-bar geometry.
    const barAreaW = tbW - BAR_AREA_RIGHT_RESERVE - BAR_AREA_START_X;
    const barCount = activeCategories.length;
    const singleBarW = Math.max(
      MIN_FILL_W,
      (barAreaW - (barCount - 1) * BAR_GAP) / barCount,
    );
    const barH = Math.round(tbH * BAR_HEIGHT_RATIO);
    const barY = Math.round((tbH - barH) / 2);

    // New container — lives inside the taskbar at z-order top.
    this.dashContainer = new Container();
    this.dashContainer.label = 'health-dashboard';
    this._taskbarContainer.addChild(this.dashContainer);

    let xCursor = BAR_AREA_START_X;
    for (const cat of activeCategories) {
      const barX = xCursor;

      // Dark background track.
      const bgRect = new Graphics()
        .roundRect(barX, barY, singleBarW, barH, BAR_CORNER_RADIUS)
        .fill({ color: 0x000000, alpha: BAR_BG_ALPHA });
      bgRect.label = `health-bg-${cat}`;
      this.dashContainer.addChild(bgRect);

      // Colored fill — starts full width.
      const fillRect = new Graphics()
        .roundRect(barX, barY, singleBarW, barH, BAR_CORNER_RADIUS)
        .fill(BAR_COLORS[cat]);
      fillRect.label = `health-fill-${cat}`;
      this.dashContainer.addChild(fillRect);

      const maxHealthSum = elements
        .filter(e => getCategory(e.type) === cat)
        .reduce((sum, e) => sum + e.maxHealth, 0);

      this.bars.push({
        category:     cat,
        bgRect,
        fillRect,
        barX,
        barY,
        maxW:         singleBarW,
        barH,
        maxHealthSum,
      });

      xCursor += singleBarW + BAR_GAP;
    }

    this._ready = true;
  }

  /**
   * Recompute bar fill widths based on current element health.
   * Call after every health decrement in the hit pipeline.
   *
   * @param elements - Full element list from DesktopManager.
   */
  onDamage(elements: DesktopElement[]): void {
    if (!this._ready) return;

    for (const bar of this.bars) {
      let currentHealthSum = 0;
      for (const el of elements) {
        if (getCategory(el.type) === bar.category && !el.destroyed) {
          currentHealthSum += el.health;
        }
      }

      const ratio  = bar.maxHealthSum > 0 ? currentHealthSum / bar.maxHealthSum : 0;
      const newW   = Math.max(MIN_FILL_W, bar.maxW * ratio);

      bar.fillRect
        .clear()
        .roundRect(bar.barX, bar.barY, newW, bar.barH, BAR_CORNER_RADIUS)
        .fill(BAR_COLORS[bar.category]);
    }
  }

  /**
   * Reposition and resize bars when the window dimensions change.
   * Rebuilds geometry then snaps fill to current health percentage.
   *
   * @param elements - Current element list (for re-snapping fill ratios).
   * @param screenW  - New screen width (stored for API compatibility).
   * @param screenH  - New screen height (stored for API compatibility).
   */
  resize(elements: DesktopElement[], screenW: number, screenH: number): void {
    this._screenW = screenW;
    this._screenH = screenH;
    // Taskbar dims re-provided by app.ts via the desktop getter before resize() is called.
    // If taskbar container is still valid, rebuild geometry at new size.
    this.build(elements);
    this.onDamage(elements);
  }

  /**
   * Show or hide the dashboard container (used by parent-lock overlay).
   */
  setVisible(visible: boolean): void {
    if (this.dashContainer) this.dashContainer.visible = visible;
  }

  /** Whether the dashboard has been built and is ready to receive damage events. */
  get isReady(): boolean {
    return this._ready;
  }

  /** Remove the dashboard container and all children from the scene. */
  destroy(): void {
    if (this.dashContainer) {
      this.dashContainer.parent?.removeChild(this.dashContainer);
      this.dashContainer.destroy({ children: true });
      this.dashContainer = null;
    }
    this.bars = [];
    this._ready = false;
  }
}
