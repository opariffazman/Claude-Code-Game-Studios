/**
 * Health Dashboard — circle pip indicators in the taskbar.
 *
 * 3 groups of 5 pips each (green/red/blue). Filled circles = remaining health,
 * white circles = depleted. Like taskbar app icons on a real desktop.
 *
 * Implements: health-dashboard.md — centralized health display, taskbar-embedded layout.
 * Spec: desk-smasher-hii — pip indicators replacing horizontal bars.
 */
import { Assets, Container, Sprite, Texture } from 'pixi.js';
import type { DesktopElement, ElementType } from '../types';

// ---------------------------------------------------------------------------
// SVG asset paths
// ---------------------------------------------------------------------------

const SVG_DIR = 'assets/kenney/ui/adventure/svg';

const PIP_FILLS: Record<string, string> = {
  animals:    `${SVG_DIR}/progress_green_small.svg`,
  structures: `${SVG_DIR}/progress_red_small.svg`,
  alerts:     `${SVG_DIR}/progress_blue_small.svg`,
};
const PIP_EMPTY = `${SVG_DIR}/progress_white_small.svg`;

// ---------------------------------------------------------------------------
// Layout tuning knobs
// ---------------------------------------------------------------------------

/** Number of pip circles per category group. */
const PIPS_PER_CATEGORY = 5;
/** Display size of each pip in pixels. */
const PIP_SIZE = 20;
/** Gap between adjacent pips within a group. */
const PIP_SPACING = 4;
/** Gap between category groups. */
const GROUP_SPACING = 16;
/** Left edge of pip area — after Start button. */
const START_X = 55;

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

interface PipGroup {
  category: Category;
  pips: Sprite[];
  fillTexture: Texture;
  maxHealthSum: number;
}

// ---------------------------------------------------------------------------
// HealthDashboard
// ---------------------------------------------------------------------------

/**
 * Centralized health dashboard — circle pip indicators inside the taskbar container.
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
  private groups: PipGroup[] = [];
  private emptyTexture: Texture | null = null;
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
    // _parent is no longer used — pips live inside the taskbar container.
    // Parameter kept for API compatibility so app.ts construction site is unchanged.
    this._screenW = screenW;
    this._screenH = screenH;
  }

  // ---------------------------------------------------------------------------
  // Public API
  // ---------------------------------------------------------------------------

  /**
   * Preload all four pip SVGs required by the dashboard.
   * Must be awaited before calling build().
   */
  async preload(): Promise<void> {
    const paths = [...Object.values(PIP_FILLS), PIP_EMPTY];
    for (const p of paths) {
      Assets.add({ alias: p, src: p, data: { resolution: 4 } });
    }
    await Assets.load(paths);
  }

  /**
   * Build (or rebuild) the dashboard pip groups inside the taskbar container.
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
    this.groups = [];
    this._ready = false;

    const tbH = this._taskbarH;

    // Determine which categories have at least one element.
    const activeCategories = CATEGORIES.filter(cat =>
      elements.some(e => getCategory(e.type) === cat),
    );
    if (activeCategories.length === 0) return;

    // Retrieve preloaded empty texture — bail if assets are not yet loaded.
    let emptyTex: Texture;
    try {
      emptyTex = Texture.from(PIP_EMPTY);
    } catch {
      return;
    }
    this.emptyTexture = emptyTex;

    // Vertical center of pips within the taskbar.
    const barY = Math.round((tbH - PIP_SIZE) / 2);

    // New container — lives inside the taskbar at z-order top.
    this.dashContainer = new Container();
    this.dashContainer.label = 'health-dashboard';
    this._taskbarContainer.addChild(this.dashContainer);

    let xCursor = START_X;
    for (const cat of activeCategories) {
      // Retrieve fill texture for this category.
      let fillTex: Texture;
      try {
        fillTex = Texture.from(PIP_FILLS[cat]);
      } catch {
        // Skip this group — advance cursor by a full group width so layout stays stable.
        xCursor += PIPS_PER_CATEGORY * (PIP_SIZE + PIP_SPACING) - PIP_SPACING + GROUP_SPACING;
        continue;
      }

      const pips: Sprite[] = [];
      for (let i = 0; i < PIPS_PER_CATEGORY; i++) {
        const pip = new Sprite(fillTex);
        pip.width = PIP_SIZE;
        pip.height = PIP_SIZE;
        pip.position.set(xCursor + i * (PIP_SIZE + PIP_SPACING), barY);
        pip.label = `pip-${cat}-${i}`;
        this.dashContainer.addChild(pip);
        pips.push(pip);
      }

      const maxHealthSum = elements
        .filter(e => getCategory(e.type) === cat)
        .reduce((sum, e) => sum + e.maxHealth, 0);

      this.groups.push({ category: cat, pips, fillTexture: fillTex, maxHealthSum });

      // Advance past this group's pips plus the gap to the next group.
      xCursor += PIPS_PER_CATEGORY * (PIP_SIZE + PIP_SPACING) - PIP_SPACING + GROUP_SPACING;
    }

    this._ready = true;
  }

  /**
   * Swap pip textures to reflect current element health.
   * Pips deplete right-to-left — the rightmost pip goes empty first.
   * Call after every health decrement in the hit pipeline.
   *
   * @param elements - Full element list from DesktopManager.
   */
  onDamage(elements: DesktopElement[]): void {
    if (!this._ready || !this.emptyTexture) return;

    const emptyTex = this.emptyTexture;

    for (const group of this.groups) {
      let currentHealthSum = 0;
      for (const el of elements) {
        if (getCategory(el.type) === group.category && !el.destroyed) {
          currentHealthSum += el.health;
        }
      }

      const ratio = group.maxHealthSum > 0 ? currentHealthSum / group.maxHealthSum : 0;
      const filledCount = Math.ceil(ratio * PIPS_PER_CATEGORY);

      for (let i = 0; i < PIPS_PER_CATEGORY; i++) {
        // Pips deplete right-to-left: rightmost (index 4) goes empty first.
        const isFilled = i < filledCount;
        group.pips[i].texture = isFilled ? group.fillTexture : emptyTex;
      }
    }
  }

  /**
   * Reposition and resize pip groups when the window dimensions change.
   * Rebuilds geometry then snaps pip states to current health percentage.
   *
   * @param elements - Current element list (for re-snapping pip states).
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
    this.groups = [];
    this.emptyTexture = null;
    this._ready = false;
  }
}
