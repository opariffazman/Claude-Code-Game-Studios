/**
 * Health Dashboard — centralized health bars pinned to the right edge of the screen.
 *
 * Three vertical progress bars show aggregate health per element category:
 *   Green  = animals (icon elements)
 *   Red    = structures (window + sticky + widget elements)
 *   Blue   = alerts (notification elements)
 *
 * Bars deplete top-to-bottom as elements are destroyed. A semi-transparent
 * background panel sits behind all bars for readability across all wallpapers.
 *
 * Implements: health-dashboard.md — centralized health display replacing per-window bars.
 * Depends on: TilePanelBuilder.preload() having run first (reuses preloaded SVG textures).
 */
import { Assets, Container, Graphics, NineSliceSprite, Texture } from 'pixi.js';
import type { DesktopElement, ElementType } from '../types';

// ---------------------------------------------------------------------------
// Asset paths (all already loaded by TilePanelBuilder.preload)
// ---------------------------------------------------------------------------

const SVG_DIR = 'assets/sprites/ui/adventure/Vector';

const BAR_BG_PATH = `${SVG_DIR}/progress_transparent.svg`;

const BAR_FILL_PATHS: Record<string, string> = {
  animals:    `${SVG_DIR}/progress_green.svg`,
  structures: `${SVG_DIR}/progress_red.svg`,
  alerts:     `${SVG_DIR}/progress_blue.svg`,
};

const BAR_BORDER_PATHS: Record<string, string> = {
  animals:    `${SVG_DIR}/progress_green_border.svg`,
  structures: `${SVG_DIR}/progress_red_border.svg`,
  alerts:     `${SVG_DIR}/progress_blue_border.svg`,
};

// ---------------------------------------------------------------------------
// Tuning knobs (matches health-dashboard.md Tuning Knobs table)
// ---------------------------------------------------------------------------

/** Bar width in pixels. */
const DASHBOARD_WIDTH_PX = 20;
/** Gap between bars in pixels. */
const DASHBOARD_SPACING_PX = 8;
/** Distance from screen right edge to rightmost bar. */
const DASHBOARD_RIGHT_MARGIN_PX = 12;
/** Bar height as fraction of screen height. */
const DASHBOARD_HEIGHT_RATIO = 0.55;
/** Top edge of dashboard as fraction of screen height. */
const DASHBOARD_TOP_RATIO = 0.15;
/** Background panel alpha. */
const DASHBOARD_BG_ALPHA = 0.25;
/** Background panel corner radius in pixels. */
const DASHBOARD_BG_RADIUS = 8;
/** Padding inside background panel on all sides. */
const DASHBOARD_BG_PADDING = 10;

/** Rounded cap height in the rasterised SVG texture (matches TilePanelBuilder CAP). */
const CAP_INSET = 10;
/** Minimum fill height in pixels — keeps rounded caps visible near zero health. */
const MIN_FILL_HEIGHT = 20;

const CATEGORIES = ['animals', 'structures', 'alerts'] as const;
type Category = (typeof CATEGORIES)[number];

// ---------------------------------------------------------------------------
// Category mapping
// ---------------------------------------------------------------------------

/** Map an ElementType to its dashboard category. Returns null for excluded types. */
function getCategory(type: ElementType): Category | null {
  switch (type) {
    case 'icon':                              return 'animals';
    case 'window': case 'sticky': case 'widget': return 'structures';
    case 'notification':                      return 'alerts';
    default:                                  return null; // taskbar excluded
  }
}

// ---------------------------------------------------------------------------
// Internal state
// ---------------------------------------------------------------------------

interface BarState {
  /** Category this bar tracks. */
  category: Category;
  /** Background track sprite. */
  bg: NineSliceSprite;
  /** Colored fill sprite — height shrinks as health depletes. */
  fill: NineSliceSprite;
  /** Border overlay sprite — rendered above fill. */
  border: NineSliceSprite;
  /** Maximum fill height in pixels at current screen size. */
  fullHeight: number;
  /** Top Y of the bar track in container-local coordinates. */
  baseY: number;
  /** Sum of maxHealth across all tracked elements (set on build/rebuild). */
  maxHealthSum: number;
}

// ---------------------------------------------------------------------------
// HealthDashboard
// ---------------------------------------------------------------------------

/**
 * Centralized health dashboard showing aggregate health per element category.
 *
 * Lifecycle:
 *   1. `new HealthDashboard(parent, screenW, screenH)` — creates container.
 *   2. `build(elements)` — after TilePanelBuilder.preload() and desktop generation.
 *   3. `onDamage(elements)` — after any health decrement in the hit pipeline.
 *   4. `resize(screenW, screenH)` — on window resize (after debounce).
 *   5. `destroy()` — cleanup.
 */
export class HealthDashboard {
  private readonly container: Container;
  private bgPanel: Graphics | null = null;
  private bars: BarState[] = [];
  private _ready = false;
  private screenW: number;
  private screenH: number;

  constructor(parent: Container, screenW: number, screenH: number) {
    this.screenW = screenW;
    this.screenH = screenH;
    this.container = new Container();
    this.container.label = 'health-dashboard';
    parent.addChild(this.container);
  }

  // ---------------------------------------------------------------------------
  // Public API
  // ---------------------------------------------------------------------------

  /**
   * Build (or rebuild) the dashboard bars from the current element list.
   * Call this after desktop generation and after every rebuild cycle.
   *
   * Bars for categories with zero elements are hidden automatically.
   *
   * @param elements - The full element list from DesktopManager.
   */
  build(elements: DesktopElement[]): void {
    if (elements.length === 0) return;

    this.container.removeChildren();
    this.bars = [];
    this.bgPanel = null;
    this._ready = false;

    const barH   = this.screenH * DASHBOARD_HEIGHT_RATIO;
    const topY   = this.screenH * DASHBOARD_TOP_RATIO;

    // Determine which categories have at least one element.
    const activeCategories = CATEGORIES.filter(cat =>
      elements.some(e => getCategory(e.type) === cat),
    );

    if (activeCategories.length === 0) return;

    // Total dashboard footprint for background panel sizing.
    const totalBarsW = activeCategories.length * DASHBOARD_WIDTH_PX
      + (activeCategories.length - 1) * DASHBOARD_SPACING_PX;
    const panelX = this.screenW - DASHBOARD_RIGHT_MARGIN_PX - totalBarsW
      - DASHBOARD_BG_PADDING;
    const panelY = topY - DASHBOARD_BG_PADDING;
    const panelW = totalBarsW + DASHBOARD_BG_PADDING * 2;
    const panelH = barH + DASHBOARD_BG_PADDING * 2;

    // Semi-transparent background panel.
    this.bgPanel = new Graphics();
    this.bgPanel
      .roundRect(panelX, panelY, panelW, panelH, DASHBOARD_BG_RADIUS)
      .fill({ color: 0x000000, alpha: DASHBOARD_BG_ALPHA });
    this.container.addChild(this.bgPanel);

    // Build one bar per active category, left to right.
    let xOffset = 0;
    for (const cat of activeCategories) {
      const x = this.screenW - DASHBOARD_RIGHT_MARGIN_PX - totalBarsW + xOffset;

      const bgTex     = Assets.get<Texture>(BAR_BG_PATH);
      const fillTex   = Assets.get<Texture>(BAR_FILL_PATHS[cat]);
      const borderTex = Assets.get<Texture>(BAR_BORDER_PATHS[cat]);

      if (!bgTex || !fillTex || !borderTex) {
        xOffset += DASHBOARD_WIDTH_PX + DASHBOARD_SPACING_PX;
        continue;
      }

      // Background track.
      const bg = new NineSliceSprite({
        texture:      bgTex,
        leftWidth:    0,
        topHeight:    CAP_INSET,
        rightWidth:   0,
        bottomHeight: CAP_INSET,
        width:        DASHBOARD_WIDTH_PX,
        height:       barH,
      });
      bg.position.set(x, topY);
      this.container.addChild(bg);

      // Colored fill — starts at full height, shrinks as health depletes.
      // Uses the plain fill SVG (no border) so depletion is visible.
      // The background track (transparent) acts as the frame.
      const fill = new NineSliceSprite({
        texture:      fillTex,
        leftWidth:    0,
        topHeight:    CAP_INSET,
        rightWidth:   0,
        bottomHeight: CAP_INSET,
        width:        DASHBOARD_WIDTH_PX,
        height:       barH,
      });
      fill.position.set(x, topY);
      this.container.addChild(fill);

      // No separate border sprite — the transparent bg IS the frame.
      // The _border SVGs contain the same fill color + outline, which
      // hides the depletion. Just bg (empty track) + fill (colored) is correct.
      const border = bg; // alias for BarState — bg acts as both track and frame

      // Compute initial maxHealth sum for this category.
      const maxHealthSum = elements
        .filter(e => getCategory(e.type) === cat)
        .reduce((sum, e) => sum + e.maxHealth, 0);

      this.bars.push({
        category:     cat,
        bg,
        fill,
        border,
        fullHeight:   barH,
        baseY:        topY,
        maxHealthSum,
      });

      xOffset += DASHBOARD_WIDTH_PX + DASHBOARD_SPACING_PX;
    }

    this._ready = true;
  }

  /**
   * Recompute bar fill heights based on current element health.
   * Call after every health decrement in the hit pipeline (both keyboard
   * and mouse/tool paths). No per-frame iteration — fires only on damage.
   *
   * @param elements - The full element list from DesktopManager.
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
      const newH   = Math.max(MIN_FILL_HEIGHT, bar.fullHeight * ratio);
      const newFillY = bar.baseY + (bar.fullHeight - newH); // bottom-pinned

      bar.fill.height = newH;
      bar.fill.y      = newFillY;
    }
  }

  /**
   * Reposition and resize bars when the window dimensions change.
   * Snaps fill to current health percentage without animation.
   * Call after the debounced resize settles in app.ts.
   *
   * @param elements - Current element list (for re-snapping fill ratios).
   * @param screenW  - New screen width in pixels.
   * @param screenH  - New screen height in pixels.
   */
  resize(elements: DesktopElement[], screenW: number, screenH: number): void {
    this.screenW = screenW;
    this.screenH = screenH;
    // Rebuild geometry entirely — simpler and always correct.
    this.build(elements);
    // Snap fill heights to current health state (no tween).
    this.onDamage(elements);
  }

  /**
   * Show or hide the dashboard container (used by parent-lock overlay).
   */
  setVisible(visible: boolean): void {
    this.container.visible = visible;
  }

  /** Whether the dashboard has been built and is ready to receive damage events. */
  get isReady(): boolean {
    return this._ready;
  }

  /** Remove the dashboard container and all children from the scene. */
  destroy(): void {
    this.container.parent?.removeChild(this.container);
    this.container.destroy({ children: true });
    this.bars = [];
    this._ready = false;
  }
}
