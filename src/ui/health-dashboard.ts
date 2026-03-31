/**
 * Health Dashboard — horizontal health bars embedded in the taskbar.
 *
 * Three horizontal bars show aggregate health per element category:
 *   Green  = animals (icon elements)
 *   Red    = structures (window + sticky + widget elements)
 *   Blue   = alerts (notification elements)
 *
 * Bars sit between the Start button and the tray icons, filling proportionally
 * left-to-right as health depletes. Implemented as NineSliceSprite pairs using
 * the opaque Kenney adventure progress SVGs:
 *   - progress_white_horizontal.svg  — visible grey/white empty track
 *   - progress_green/red/blue_horizontal.svg — solid colored fills
 *
 * Implements: health-dashboard.md — centralized health display, taskbar-embedded layout.
 * Spec: desk-smasher-v37 — horizontal bars in taskbar replacing right-edge dashboard.
 */
import { Assets, Container, NineSliceSprite, Texture } from 'pixi.js';
import type { DesktopElement, ElementType } from '../types';

// ---------------------------------------------------------------------------
// SVG asset paths
// ---------------------------------------------------------------------------

const SVG_DIR = 'assets/kenney/ui/adventure/svg';
const BAR_BG_PATH = `${SVG_DIR}/progress_white_horizontal.svg`;
const BAR_FILL_PATHS: Record<string, string> = {
  animals:    `${SVG_DIR}/progress_green_horizontal.svg`,
  structures: `${SVG_DIR}/progress_red_horizontal.svg`,
  alerts:     `${SVG_DIR}/progress_blue_horizontal.svg`,
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
/** Minimum fill width in pixels — keeps bar visible near zero health. */
const MIN_FILL_W = 6;

/**
 * NineSlice cap width in texture pixels.
 * The 32×16 SVGs are loaded at resolution 4, giving 128×64 texture pixels.
 * The rounded caps span ~8 SVG px on each side → 8 × 4 = 32 texture px.
 */
const CAP = 32;

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
  /** Colored fill NineSliceSprite — width adjusted on damage. */
  fillSprite: NineSliceSprite;
  /** Maximum bar visual width at full health (equals singleBarW). */
  maxW: number;
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
 *   2. `preload()` — load SVG assets before build().
 *   3. `build(elements, taskbarContainer, taskbarW, taskbarH)` — after desktop generation.
 *   4. `onDamage(elements)` — after any health decrement in the hit pipeline.
 *   5. `resize(elements, screenW, screenH)` — on window resize (after debounce).
 *   6. `destroy()` — cleanup.
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
   * Preload all opaque Kenney progress SVGs required by the bars.
   * Must be awaited before calling build().
   */
  async preload(): Promise<void> {
    const paths = [BAR_BG_PATH, ...Object.values(BAR_FILL_PATHS)];
    for (const path of paths) {
      Assets.add({ alias: path, src: path, data: { resolution: 4 } });
    }
    await Assets.load(paths);
  }

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

    // Retrieve preloaded textures — bail if assets are not yet loaded.
    let bgTex: Texture;
    try {
      bgTex = Texture.from(BAR_BG_PATH);
    } catch {
      return;
    }

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

      // Background track — opaque white/grey capsule.
      const bg = new NineSliceSprite({
        texture:     bgTex,
        leftWidth:   CAP,
        topHeight:   0,
        rightWidth:  CAP,
        bottomHeight: 0,
        width:  singleBarW,
        height: barH,
      });
      bg.label = `health-bg-${cat}`;
      bg.position.set(barX, barY);
      this.dashContainer.addChild(bg);

      // Colored fill — solid opaque capsule, starts at full width.
      let fillTex: Texture;
      try {
        fillTex = Texture.from(BAR_FILL_PATHS[cat]);
      } catch {
        xCursor += singleBarW + BAR_GAP;
        continue;
      }

      const fill = new NineSliceSprite({
        texture:     fillTex,
        leftWidth:   CAP,
        topHeight:   0,
        rightWidth:  CAP,
        bottomHeight: 0,
        width:  singleBarW,
        height: barH,
      });
      fill.label = `health-fill-${cat}`;
      fill.position.set(barX, barY);
      this.dashContainer.addChild(fill);

      const maxHealthSum = elements
        .filter(e => getCategory(e.type) === cat)
        .reduce((sum, e) => sum + e.maxHealth, 0);

      this.bars.push({
        category: cat,
        fillSprite: fill,
        maxW: singleBarW,
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

      const ratio = bar.maxHealthSum > 0 ? currentHealthSum / bar.maxHealthSum : 0;
      bar.fillSprite.width = Math.max(MIN_FILL_W, bar.maxW * ratio);
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
