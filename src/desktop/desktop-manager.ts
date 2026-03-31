/**
 * DesktopManager — generates procedural fake desktops and manages element lifecycle.
 *
 * Implements: Desktop Renderer — desktop orchestration (Desk Smasher design doc)
 *
 * Responsibilities:
 *   - Pick a random WallpaperPalette and build the wallpaper background
 *   - Spawn randomised counts of each element type via ElementFactory
 *   - Maintain a DesktopElement[] that mirrors the PixiJS display tree
 *   - Drive impulse physics (velocity + friction + edge-bounce) each frame
 *   - Accept wallpaper damage marks via crackWallpaper() (6 damage types)
 *   - Expose destruction progress and rebuild via reset()
 *
 * All element counts come from DESKTOP_CONFIG — never hardcoded here.
 * All visual creation is delegated to ElementFactory.
 *
 * PixiJS v8: uses Graphics method-chain API (.rect().fill()), new Text({text,style}),
 * and container.label for node naming.
 */
import { Assets, Container, Graphics, NineSliceSprite, Sprite, Text, TextStyle, Texture } from 'pixi.js';
import type { ThemeLoader } from '../systems/theme-loader';
import type { TilePanelBuilder, PanelStyle } from '../ui/tile-panel';
import { ADV_BANNER_MODERN, ADV_BANNER_HANGING } from '../ui/tile-panel';
import { DESKTOP_CONFIG, LAYOUT_CONFIG } from '../config';
import {
  WALLPAPER_PALETTES, ICON_LABELS, WINDOW_TITLES, STICKY_TEXTS, NOTIF_TEXTS,
  ICON_COLORS, TITLEBAR_COLORS, STICKY_COLORS,
  rand, randInt, pick, shuffle,
} from './element-types';
import { ElementFactory } from './element-factory';
import {
  resolveZone,
  generateIconGrid,
  generateWindowTiled,
  generateNotifStack,
  validatePlacements,
} from './layout-resolver';
import type { DesktopElement, ElementType, WallpaperPalette } from '../types';
import type { Theme } from '../systems/theme-system';

let nextId = 0;

// ---------------------------------------------------------------------------
// DesktopManager
// ---------------------------------------------------------------------------

export class DesktopManager {
  private readonly parent: Container;
  private readonly factory: ElementFactory;
  private container: Container;

  private _elements: DesktopElement[] = [];
  /** Parallel array: PixiJS Container for each DesktopElement at the same index. */
  private containers: Container[] = [];

  /**
   * Per-element respawn callbacks, keyed by element id.
   * Registered by createFunctionalWindow() and cleared on full reset().
   * Called from respawnElement() after the new container is placed so
   * content classes can re-populate their window on respawn.
   *
   * @param container - The freshly-built replacement Container for the element.
   */
  private _respawnCallbacks: Map<string, (container: Container) => void> = new Map();

  /** Running health totals — updated by buildDesktop() and recordDamage(). */
  private _totalHealth = 0;
  private _currentHealth = 0;

  /** Active wallpaper damage marks — oldest removed when cap is hit. */
  private _damageMarks: import('pixi.js').Graphics[] = [];
  private static readonly MAX_DAMAGE_MARKS = 30;

  /** Reference to the taskbar Container — set by buildTaskbar() on every build. */
  private _taskbarContainer: Container | null = null;
  /** Taskbar height in pixels at last buildTaskbar() call. */
  private _taskbarH = 0;

  private screenW: number;
  private screenH: number;
  /** Viewport dimensions at the last buildDesktop() call — used as the reference for resize scaling. */
  private _buildW = 0;
  private _buildH = 0;
  private _wallpaperColor: number = WALLPAPER_PALETTES[0].bg;

  /**
   * Session content — set once per buildDesktop() call, preserved across resize rebuilds.
   * This allows _rebuildLayout() to regenerate the same content at new viewport dimensions
   * without re-randomising what is shown.
   */
  private _currentPalette: WallpaperPalette = WALLPAPER_PALETTES[0];
  private _sessionIconCount = 0;
  private _sessionWindowCount = 0;
  private _sessionNotifCount = 0;

  /** Optional ThemeLoader — when set, sprite icons are used instead of Graphics icons. */
  private _themeLoader: ThemeLoader | null = null;

  /** Optional TilePanelBuilder — when set and ready, tile-based windows are used. */
  private _tilePanelBuilder: TilePanelBuilder | null = null;

  /**
   * Optional theme overrides injected by rebuildWithTheme().
   * When non-null, buildDesktop() uses these instead of the global data pools.
   * Cleared to null after each use so reset() retains random-palette behavior.
   */
  private _themeWallpaper: WallpaperPalette | null = null;
  private _themeIconColors: readonly number[] | null = null;
  private _themeTitlebarColors: readonly number[] | null = null;
  private _themeStickyColors: readonly number[] | null = null;

  /** Active theme name for the current build pass — used to select adventure panel assets. */
  private _activeThemeName: string | undefined = undefined;

  /**
   * Active color arrays for the current build pass.
   * Set at the start of buildDesktop() from either theme overrides or global pools.
   * Element builder methods read these instead of importing global arrays directly.
   */
  private _activeIconColors: readonly number[] = ICON_COLORS;
  private _activeTitlebarColors: readonly number[] = TITLEBAR_COLORS;
  private _activeStickyColors: readonly number[] = STICKY_COLORS;

  /**
   * Constructs the manager and immediately builds the first desktop.
   *
   * @param parent  - PixiJS Container to add the desktop subtree to.
   * @param screenW - Logical canvas width in px.
   * @param screenH - Logical canvas height in px.
   */
  constructor(parent: Container, screenW: number, screenH: number) {
    this.parent = parent;
    this.factory = new ElementFactory();
    this.screenW = screenW;
    this.screenH = screenH;

    this.container = new Container();
    this.container.label = 'desktop';
    this.parent.addChild(this.container);

    // Do NOT call buildDesktop() here — app.ts calls reset() after wiring the
    // ThemeLoader so the first build always has sprites ready.
    // Implements: desk-smasher-8l3 — no flash of un-themed desktop on startup.
  }

  // ---------------------------------------------------------------------------
  // Queries
  // ---------------------------------------------------------------------------

  /**
   * Returns the topmost alive element whose bounding box contains (x, y),
   * or null if none. Iterates in reverse so elements drawn last (on top) win.
   *
   * @param x - Logical X coordinate.
   * @param y - Logical Y coordinate.
   */
  getElementAt(x: number, y: number): DesktopElement | null {
    for (let i = this._elements.length - 1; i >= 0; i--) {
      const el = this._elements[i];
      if (el.destroyed) continue;
      if (x >= el.x && x <= el.x + el.width && y >= el.y && y <= el.y + el.height) {
        return el;
      }
    }
    return null;
  }

  /**
   * Returns the PixiJS Container paired with the given element, or null if
   * the element is not found in the active element list.
   *
   * Lookup is by element id so the caller does not need to know the internal
   * parallel-array index.
   *
   * @param el - A DesktopElement previously returned by this manager.
   */
  getContainerForElement(el: DesktopElement): import('pixi.js').Container | null {
    const idx = this._elements.findIndex((e) => e.id === el.id);
    if (idx === -1) return null;
    return this.containers[idx] ?? null;
  }

  /**
   * Returns a random alive element, or null if all are destroyed.
   * Zero-allocation: counts then walks the list rather than building a filtered array.
   */
  getRandomAlive(): DesktopElement | null {
    // Taskbar is excluded — it is immune to keyboard hits.
    // Implements: desk-smasher-381 — taskbar immune to damage.
    let aliveCount = 0;
    for (const el of this._elements) {
      if (!el.destroyed && el.type !== 'taskbar') aliveCount++;
    }
    if (aliveCount === 0) return null;
    let target = Math.floor(Math.random() * aliveCount);
    for (const el of this._elements) {
      if (!el.destroyed && el.type !== 'taskbar') {
        if (target === 0) return el;
        target--;
      }
    }
    return null;
  }

  /**
   * Destruction progress in [0, 1]: 0 = pristine, 1 = fully destroyed.
   * Reads from running counters updated by buildDesktop() and recordDamage()
   * rather than iterating the element list every frame.
   */
  get destructionProgress(): number {
    if (this._totalHealth === 0) return 0;
    return 1 - (this._currentHealth / this._totalHealth);
  }

  /**
   * Record that `amount` health points have been removed from an element.
   * Must be called from app.ts whenever element.health is decremented so
   * that destructionProgress stays accurate without a per-frame reduce pass.
   *
   * @param amount - Number of health points deducted (default 1).
   */
  recordDamage(amount: number = 1): void {
    this._currentHealth = Math.max(0, this._currentHealth - amount);
  }

  /** True when every element has been destroyed. */
  get allDestroyed(): boolean {
    return this._elements.length > 0 && this._elements.every((e) => e.destroyed);
  }

  /** The wallpaper background colour of the current desktop palette. */
  get wallpaperColor(): number {
    return this._wallpaperColor;
  }

  /** Read-only snapshot of current DesktopElements (alive and destroyed). */
  get elements(): DesktopElement[] {
    return this._elements;
  }

  /**
   * The PixiJS Container for the current taskbar, or null before first build.
   * Used by HealthDashboard to embed horizontal health bars inside the taskbar.
   */
  get taskbarContainer(): Container | null {
    return this._taskbarContainer;
  }

  /**
   * Taskbar geometry — width equals the current screen width.
   * Used by HealthDashboard to compute bar dimensions on build/resize.
   */
  get taskbarDimensions(): { w: number; h: number } {
    return { w: this.screenW, h: this._taskbarH };
  }

  /**
   * Wire a ThemeLoader so buildIcons() uses sprite textures when available.
   * Call once from app.ts after both systems are created.
   *
   * @param loader - An initialised ThemeLoader instance.
   */
  setThemeLoader(loader: ThemeLoader): void {
    this._themeLoader = loader;
  }

  /**
   * Wire a TilePanelBuilder so buildWindows() uses Kenney tile panels when ready.
   * Call once from app.ts after preload() has completed.
   *
   * @param builder - An initialised TilePanelBuilder instance.
   */
  setTilePanelBuilder(builder: TilePanelBuilder): void {
    this._tilePanelBuilder = builder;
  }

  /**
   * Creates a functional window (titled panel) at a fixed position and registers
   * it as a regular DesktopElement so it participates in hit detection, physics,
   * and respawn just like any other window.
   *
   * Returns the window's inner content Container — callers (e.g. app.ts) add
   * their own UI children to this container.  On element respawn the onRespawn
   * callback is invoked with the freshly-built replacement content Container so
   * the caller can re-populate it.
   *
   * Returns null only if called before buildDesktop() has run (container not
   * yet initialised).
   *
   * @param title      - Window title shown in the panel header.
   * @param x          - Absolute X position in canvas pixels.
   * @param y          - Absolute Y position in canvas pixels.
   * @param w          - Width in canvas pixels.
   * @param h          - Height in canvas pixels.
   * @param onRespawn   - Optional callback invoked after respawn with the new
   *                      inner content Container so content can be rebuilt.
   * @param elementType - Optional ElementType override (default: 'window').
   *                      Pass 'notification' to have the health dashboard treat
   *                      this window as a notification element (blue pips).
   */
  createFunctionalWindow(
    title: string,
    x: number,
    y: number,
    w: number,
    h: number,
    onRespawn?: (container: Container) => void,
    elementType?: import('../types').ElementType,
  ): { element: DesktopElement; container: Container } | null {
    const style = 'brown';
    const themeName = this._themeLoader?.currentTheme?.name;
    let windowContainer: Container;

    if (this._tilePanelBuilder?.isReady) {
      windowContainer = this._tilePanelBuilder.buildWindow(style, w, h, themeName);
    } else {
      // Graphics fallback: simple rectangle panel
      const c = new Container();
      c.label = `func-window-${title}`;
      const bg = new Graphics().rect(0, 0, w, h).fill({ color: 0x2a2a3a });
      const titleBar = new Graphics().rect(0, 0, w, 28).fill({ color: 0x44445a });
      const titleStyle = new TextStyle({ fontSize: 12, fill: 0xffffff, fontFamily: 'sans-serif' });
      const titleText = new Text({ text: title, style: titleStyle });
      titleText.position.set(8, 6);
      c.addChild(bg, titleBar, titleText);
      windowContainer = c;
    }

    windowContainer.position.set(x, y);
    this.container.addChild(windowContainer);

    // Inner content container — callers attach their UI children here.
    const contentContainer = new Container();
    contentContainer.label = `func-window-content-${title}`;
    windowContainer.addChild(contentContainer);

    // desk-smasher-53s: apply optional elementType override so the health dashboard
    // can track Milestones as a 'notification' element (blue pips).
    const el: DesktopElement = {
      id: `el-${nextId++}`,
      type: elementType ?? 'window',
      label: title,
      health: DESKTOP_CONFIG.HEALTH.window,
      maxHealth: DESKTOP_CONFIG.HEALTH.window,
      destroyed: false,
      x, y, width: w, height: h,
      vx: 0, vy: 0, rotSpeed: 0,
    };

    this._elements.push(el);
    this.containers.push(windowContainer);
    this._totalHealth += el.maxHealth;
    this._currentHealth += el.maxHealth;

    if (onRespawn) {
      this._respawnCallbacks.set(el.id, onRespawn);
    }

    return { element: el, container: contentContainer };
  }

  /**
   * Create a milestone banner element using banner_modern.svg stretched horizontally.
   *
   * Unlike createFunctionalWindow() which uses square adventure panels, this method
   * builds a wide horizontal banner backed by the banner_modern SVG texture.
   * The returned container is the inner content area; callers attach text/log children.
   *
   * Implements: desk-smasher-517 — milestone banner as destructible desktop element.
   *
   * @param title - Label string used in the element's id and label.
   * @param x     - Absolute X position in canvas pixels.
   * @param y     - Absolute Y position in canvas pixels.
   * @param w     - Width in canvas pixels (stretched horizontally).
   * @param h     - Height in canvas pixels.
   * @returns Object with the DesktopElement and its inner content Container, or null
   *          if the banner_modern texture is not yet loaded.
   */
  createMilestoneBanner(
    title: string,
    x: number,
    y: number,
    w: number,
    h: number,
    onRespawn?: (container: Container) => void,
  ): { element: DesktopElement; container: Container } | null {
    const bannerTex = Assets.get<Texture>(ADV_BANNER_MODERN);
    if (!bannerTex) return null;

    const c = new Container();
    c.label = `milestone-${title}`;

    // Banner background — stretched horizontally to fill (w x h).
    const bg = new Sprite(bannerTex);
    bg.width = w;
    bg.height = h;
    c.addChild(bg);

    // Inner content container — callers attach their UI children here.
    const content = new Container();
    content.label = 'func-content';
    content.position.set(15, 8);
    c.addChild(content);

    c.position.set(x, y);
    this.container.addChild(c);

    const el: DesktopElement = {
      id: `milestone-${nextId++}`,
      type: 'milestone',
      label: title,
      health: DESKTOP_CONFIG.HEALTH.milestone ?? 3,
      maxHealth: DESKTOP_CONFIG.HEALTH.milestone ?? 3,
      destroyed: false,
      x, y, width: w, height: h,
      vx: 0, vy: 0, rotSpeed: 0,
    };

    this._elements.push(el);
    this.containers.push(c);
    this._totalHealth += el.maxHealth;
    this._currentHealth += el.maxHealth;

    if (onRespawn) {
      this._respawnCallbacks.set(el.id, onRespawn);
    }

    return { element: el, container: content };
  }

  // ---------------------------------------------------------------------------
  // Mutations
  // ---------------------------------------------------------------------------

  /**
   * Applies a random-direction velocity impulse to the element.
   * Uses DESKTOP_CONFIG force range scaled by the optional strength multiplier.
   *
   * @param el       - Target element.
   * @param strength - Force multiplier (default 1).
   */
  applyImpulse(el: DesktopElement, strength: number = 1): void {
    const angle = Math.random() * Math.PI * 2;
    const force = rand(DESKTOP_CONFIG.IMPULSE_FORCE_MIN, DESKTOP_CONFIG.IMPULSE_FORCE_MAX) * strength;
    el.vx += Math.cos(angle) * force;
    el.vy += Math.sin(angle) * force;
    el.rotSpeed += (Math.random() - 0.5) * 2 * strength;
  }

  /**
   * Adds a damage mark on the wallpaper at (x, y).
   * Picks one of 6 damage types at random:
   *   0 — crack (spider-web fracture lines)
   *   1 — burn  (dark scorched circle with embers)
   *   2 — dent  (concentric rings / crater)
   *   3 — splat (colourful paint blob with satellites)
   *   4 — pixel (digital-glitch grid of squares)
   *   5 — scratch (diagonal claw marks)
   *
   * @param x - Wallpaper-space X coordinate.
   * @param y - Wallpaper-space Y coordinate.
   * @param toolName - Active tool name for consistent damage type. Random if omitted.
   */
  private static readonly TOOL_DAMAGE_MAP: Record<string, number> = {
    hammer: 0,   // crack lines
    laser: 1,    // burn mark
    bomb: 2,     // dent/crater
    freeze: 4,   // pixel corruption (frost)
    magnet: -1,  // no wallpaper stamp — uses particle effect instead
    // Implements: desk-smasher-5nc — magnet suction particles instead of stamps.
  };

  crackWallpaper(x: number, y: number, toolName?: string): void {
    // Remove oldest mark when cap is hit (FIFO)
    if (this._damageMarks.length >= DesktopManager.MAX_DAMAGE_MARKS) {
      const oldest = this._damageMarks.shift();
      if (oldest) {
        oldest.destroy();
      }
    }
    const damageType = toolName !== undefined && DesktopManager.TOOL_DAMAGE_MAP[toolName] !== undefined
      ? DesktopManager.TOOL_DAMAGE_MAP[toolName]
      : Math.floor(Math.random() * 6);
    // Magnet uses twirl particles (emitted by the tool itself) — no wallpaper stamp.
    // Implements: desk-smasher-5nc — magnet suction particles instead of stamps.
    if (damageType === -1) return;
    const mark = new Graphics();
    mark.position.set(x, y);

    switch (damageType) {
      case 0: {
        // Crack: heavy spider-web fracture lines — deep orange hammer impact
        const numLines = 5 + Math.floor(Math.random() * 3);
        // Small impact burst at center — 3–4 debris dots
        const numDebris = 3 + Math.floor(Math.random() * 2);
        for (let d = 0; d < numDebris; d++) {
          const a = Math.random() * Math.PI * 2;
          const r = 3 + Math.random() * 5;
          mark.circle(Math.cos(a) * r, Math.sin(a) * r, 1.5 + Math.random() * 1.5)
            .fill({ color: 0x663300, alpha: 0.5 + Math.random() * 0.2 });
        }
        for (let i = 0; i < numLines; i++) {
          const angle = Math.random() * Math.PI * 2;
          const len = 40 + Math.random() * 30;
          const midX = Math.cos(angle) * len * 0.4 + (Math.random() - 0.5) * 14;
          const midY = Math.sin(angle) * len * 0.4 + (Math.random() - 0.5) * 14;
          mark.moveTo(0, 0).lineTo(midX, midY)
            .lineTo(Math.cos(angle) * len, Math.sin(angle) * len)
            .stroke({ color: 0x663300, width: 3 + Math.random() * 1.5, alpha: 0.45 + Math.random() * 0.2 });
        }
        break;
      }
      case 1: {
        // Laser: thin precise burn line — single straight cut with green glow
        const cutLen = 30 + Math.random() * 40;
        const cutAngle = Math.random() * Math.PI; // 0–180° so it reads as a line, not a dot
        const dx = Math.cos(cutAngle);
        const dy = Math.sin(cutAngle);
        // Outer glow — wide, faint
        mark.moveTo(-dx * cutLen, -dy * cutLen)
          .lineTo(dx * cutLen, dy * cutLen)
          .stroke({ color: 0x00ff44, width: 5, alpha: 0.15 });
        // Mid glow
        mark.moveTo(-dx * cutLen, -dy * cutLen)
          .lineTo(dx * cutLen, dy * cutLen)
          .stroke({ color: 0x00ee33, width: 2.5, alpha: 0.4 });
        // Core cut — bright, sharp
        mark.moveTo(-dx * cutLen, -dy * cutLen)
          .lineTo(dx * cutLen, dy * cutLen)
          .stroke({ color: 0x88ffaa, width: 1, alpha: 0.85 });
        // Entry/exit scorch dots at line ends
        mark.circle(-dx * cutLen, -dy * cutLen, 2).fill({ color: 0x00ff44, alpha: 0.6 });
        mark.circle(dx * cutLen, dy * cutLen, 2).fill({ color: 0x00ff44, alpha: 0.6 });
        break;
      }
      case 2: {
        // Bomb: large explosive crater — dark center, orange/red debris cloud
        const size = 28 + Math.random() * 20;
        // Outer scorch ring — wide orange halo
        mark.circle(0, 0, size * 1.6).fill({ color: 0xff4400, alpha: 0.12 });
        // Mid blast ring
        mark.circle(0, 0, size * 1.2).fill({ color: 0xcc2200, alpha: 0.2 });
        // Inner crater — darkest
        mark.circle(0, 0, size * 0.75).fill({ color: 0x660000, alpha: 0.45 });
        // Center void — near black
        mark.circle(0, 0, size * 0.35).fill({ color: 0x220000, alpha: 0.6 });
        // Crater rim stroke
        mark.circle(0, 0, size * 0.75).stroke({ color: 0xff6600, width: 3, alpha: 0.5 });
        // Debris scatter — 8–12 orange/red chunks at varying distances
        const numDebris = 8 + Math.floor(Math.random() * 5);
        for (let i = 0; i < numDebris; i++) {
          const a = Math.random() * Math.PI * 2;
          const dist = size * (0.9 + Math.random() * 0.9);
          const dr = 2.5 + Math.random() * 5;
          const debrisColor = Math.random() > 0.5 ? 0xff6600 : 0xcc3300;
          mark.circle(Math.cos(a) * dist, Math.sin(a) * dist, dr)
            .fill({ color: debrisColor, alpha: 0.5 + Math.random() * 0.3 });
        }
        // Radial blast streaks — short jagged lines outward
        for (let i = 0; i < 6; i++) {
          const a = (i / 6) * Math.PI * 2 + Math.random() * 0.4;
          const streakLen = size * (0.8 + Math.random() * 0.5);
          mark.moveTo(Math.cos(a) * size * 0.5, Math.sin(a) * size * 0.5)
            .lineTo(Math.cos(a) * streakLen, Math.sin(a) * streakLen)
            .stroke({ color: 0xff8800, width: 1.5, alpha: 0.35 + Math.random() * 0.2 });
        }
        break;
      }
      case 3: {
        // Splat: colourful paint blob with satellite blobs
        const splatColors = [0xff4444, 0x44aaff, 0xffcc00, 0xff69b4, 0x44ff44, 0xff8800, 0xaa44ff];
        const splatColor = splatColors[Math.floor(Math.random() * splatColors.length)];
        const blobR = 12 + Math.random() * 18;
        mark.circle(0, 0, blobR).fill({ color: splatColor, alpha: 0.7 });
        for (let i = 0; i < 4 + Math.floor(Math.random() * 4); i++) {
          const a = Math.random() * Math.PI * 2;
          const dist = blobR * (0.8 + Math.random() * 1.2);
          const r = 3 + Math.random() * 6;
          mark.circle(Math.cos(a) * dist, Math.sin(a) * dist, r)
            .fill({ color: splatColor, alpha: 0.5 + Math.random() * 0.3 });
        }
        break;
      }
      case 4: {
        // Pixel: ice blue digital-glitch grid — freeze corruption
        const cellSize = 5 + Math.random() * 3;
        const spread = 3 + Math.floor(Math.random() * 3);
        for (let gx = -spread; gx <= spread; gx++) {
          for (let gy = -spread; gy <= spread; gy++) {
            if (Math.random() > 0.5) continue;
            const color = Math.random() > 0.5 ? 0x88ccff : 0xaaeeff;
            mark.rect(gx * cellSize, gy * cellSize, cellSize - 1, cellSize - 1)
              .fill({ color, alpha: 0.15 + Math.random() * 0.2 });
          }
        }
        break;
      }
      case 5: {
        // Scratch: bright purple diagonal claw marks — magnet force
        const numScratches = 3 + Math.floor(Math.random() * 2);
        const angle = -0.3 + Math.random() * 0.6;
        for (let i = 0; i < numScratches; i++) {
          const offsetX = (i - numScratches / 2) * (6 + Math.random() * 3);
          const len = 30 + Math.random() * 40;
          const startX = offsetX - Math.cos(angle) * len / 2;
          const startY = -Math.sin(angle) * len / 2;
          const endX = offsetX + Math.cos(angle) * len / 2;
          const endY = Math.sin(angle) * len / 2;
          mark.moveTo(startX, startY).lineTo(endX, endY)
            .stroke({ color: 0x9933ff, width: 1.5 + Math.random(), alpha: 0.5 });
        }
        break;
      }
    }

    // Insert above wallpaper background (index 0) but below desktop elements.
    if (this.container.children.length > 1) {
      this.container.addChildAt(mark, 1);
    } else {
      this.container.addChild(mark);
    }
    this._damageMarks.push(mark);
  }

  // ---------------------------------------------------------------------------
  // Lifecycle
  // ---------------------------------------------------------------------------

  /**
   * Advances physics for all alive, non-taskbar elements.
   * Applies velocity, friction decay, rotation, and edge bouncing.
   * Frame-rate independent via dt (seconds).
   *
   * @param dt              - Delta time in seconds.
   * @param speedMultiplier - Optional velocity scale (e.g. chaos multiplier). Default 1.
   */
  update(dt: number, speedMultiplier: number = 1): void {
    const friction = DESKTOP_CONFIG.FRICTION;
    const minVel = DESKTOP_CONFIG.MIN_VELOCITY;
    const taskbarH = DESKTOP_CONFIG.TASKBAR_HEIGHT;

    for (let i = 0; i < this._elements.length; i++) {
      const el = this._elements[i];
      if (el.destroyed) continue;
      if (el.type === 'taskbar') continue;

      if (Math.abs(el.vx) < minVel && Math.abs(el.vy) < minVel) {
        el.vx = 0;
        el.vy = 0;
        continue;
      }

      const c = this.containers[i];
      c.x += el.vx * dt * speedMultiplier;
      c.y += el.vy * dt * speedMultiplier;
      c.rotation += el.rotSpeed * dt;

      el.vx *= friction;
      el.vy *= friction;
      el.rotSpeed *= friction;

      el.x = c.x;
      el.y = c.y;

      // Edge bouncing (damp on impact)
      if (el.x < 0) {
        el.x = 0; c.x = 0; el.vx *= -0.7;
      }
      if (el.x + el.width > this.screenW) {
        el.x = this.screenW - el.width; c.x = el.x; el.vx *= -0.7;
      }
      if (el.y < 0) {
        el.y = 0; c.y = 0; el.vy *= -0.7;
      }
      if (el.y + el.height > this.screenH - taskbarH) {
        el.y = this.screenH - taskbarH - el.height; c.y = el.y; el.vy *= -0.7;
      }
    }
  }

  /**
   * Destroys all existing display objects and rebuilds a fresh desktop.
   * Resets all element state.
   */
  reset(): void {
    this.container.removeChildren();
    this._elements = [];
    this.containers = [];
    this._damageMarks = [];
    this._respawnCallbacks.clear();
    this.factory.resetIconCount();
    this.buildDesktop();
  }

  /**
   * Updates the stored logical dimensions when the browser window is resized.
   * Does NOT rebuild or randomise the desktop — existing elements stay in place.
   * The next natural rebuild cycle (after all elements are destroyed) will pick
   * up the new dimensions via screenW/screenH.
   *
   * Wallpaper coverage on expand is handled by the oversized rect (-500 offsets)
   * drawn in buildWallpaper(); PixiJS resizeTo:window auto-scales the canvas.
   *
   * Implements: desk-smasher-d2i — resize must not randomise the desktop.
   *
   * @param w - New logical canvas width in px.
   * @param h - New logical canvas height in px.
   */
  resize(w: number, h: number): void {
    this.screenW = w;
    this.screenH = h;

    // Reset container transform — PixiJS resizeTo:window handles canvas scaling.
    // Applying our own scale on top of that double-scales and produces wrong results.
    // Instead, rebuild the layout at the new viewport dimensions using the same
    // session content (same theme, same counts) so nothing re-randomises.
    // Implements: desk-smasher-0p7 — resize must not randomise or stretch the desktop.
    this.container.scale.set(1);
    this.container.position.set(0, 0);
    this._rebuildLayout();
  }

  /**
   * Rebuilds the visual layout at the current screenW/screenH using the saved
   * session content (same palette, same element counts, same theme).
   *
   * Called by resize() so the desktop fills the new viewport without re-randomising
   * what is shown. PixiJS resizeTo:window has already resized the canvas; this method
   * only repositions and redraws the PixiJS display tree.
   *
   * Does NOT call buildDesktop() — that would re-randomise content. Instead it
   * directly invokes the individual build methods with the saved session values.
   */
  private _rebuildLayout(): void {
    // Clear all visual elements — remove from display tree and drop references.
    this.container.removeChildren();
    this._elements = [];
    this.containers = [];
    this._damageMarks = [];
    this._respawnCallbacks.clear();
    this.factory.resetIconCount();

    // Reset icon shuffle so sprites are re-distributed the same way as at build time.
    this._themeLoader?.resetShuffle();

    // Rebuild wallpaper and chrome at new dimensions.
    this.buildWallpaper(this._currentPalette);
    this.buildTaskbar();

    // Rebuild content using the full theme icon count (same as original build).
    // Implements: desk-smasher-dbt — all icons always shown.
    this.buildIcons(this._sessionIconCount || (this._themeLoader?.currentTheme.iconFrames.length ?? 30));
    // desk-smasher-7r5: buildWindows() removed — only functional windows from app.ts exist.
    // this.buildWindows(this._sessionWindowCount || randInt(2, 3));
    // desk-smasher-30t: notification panels removed — AchievementToast handles milestones.
    // this.buildNotifications(this._sessionNotifCount || randInt(2, 3));

    // desk-smasher-ao7: decorative hanging banner removed.
    // const hangingTex = Assets.get<Texture>(ADV_BANNER_HANGING);
    // if (hangingTex) {
    //   const banner = new Sprite(hangingTex);
    //   banner.anchor.set(0.5, 0);
    //   const bannerScale = this.screenW / 1920;
    //   banner.scale.set(bannerScale * 0.8);
    //   banner.position.set(this.screenW / 2, 0);
    //   this.container.addChild(banner);
    // }

    // Re-snapshot build dimensions and health totals.
    this._buildW = this.screenW;
    this._buildH = this.screenH;
    this._totalHealth = this._elements.reduce((sum, e) => sum + e.maxHealth, 0);
    this._currentHealth = this._totalHealth;
  }

  /**
   * Destroys all existing display objects and rebuilds a fresh desktop using
   * the visual identity defined by the given Theme: its wallpaper palette,
   * icon colors, titlebar colors, and sticky colors override the global pools
   * for this single build, then clear so subsequent reset() calls are random.
   *
   * @param theme - The Theme to apply to the rebuilt desktop.
   */
  rebuildWithTheme(theme: Theme): void {
    this._themeWallpaper = theme.wallpaper;
    this._themeIconColors = theme.iconColors;
    this._themeTitlebarColors = theme.titlebarColors;
    this._themeStickyColors = theme.stickyColors;
    this.reset();
    // reset() calls buildDesktop() which reads and then clears the overrides.
  }

  // ---------------------------------------------------------------------------
  // Private: desktop construction
  // ---------------------------------------------------------------------------

  private buildDesktop(): void {
    // Snapshot viewport dimensions so resize() can compute the correct scale ratio.
    this._buildW = this.screenW;
    this._buildH = this.screenH;
    // Reset any container transform from a previous resize before re-building at native size.
    this.container.scale.set(1);
    this.container.position.set(0, 0);

    // Use theme overrides when set by rebuildWithTheme(), else pick randomly.
    const palette = this._themeWallpaper ?? pick(WALLPAPER_PALETTES);
    this._activeIconColors = this._themeIconColors ?? ICON_COLORS;
    this._activeTitlebarColors = this._themeTitlebarColors ?? TITLEBAR_COLORS;
    this._activeStickyColors = this._themeStickyColors ?? STICKY_COLORS;

    // Capture the active theme name before clearing overrides.
    this._activeThemeName = this._themeLoader?.currentTheme.name;

    // Clear overrides so the next reset() call uses random palettes.
    this._themeWallpaper = null;
    this._themeIconColors = null;
    this._themeTitlebarColors = null;
    this._themeStickyColors = null;

    // Reset icon shuffle so each new desktop gets unique icons in a different order.
    this._themeLoader?.resetShuffle();

    // Fix icon count to the full theme pool so all animals are always shown.
    // Implements: desk-smasher-dbt — always show all 30 icons (no random subset).
    this._currentPalette = palette;
    this._sessionIconCount = this._themeLoader?.currentTheme.iconFrames.length ?? 30;
    this._sessionWindowCount = randInt(2, 3);
    this._sessionNotifCount = randInt(2, 3);

    this._wallpaperColor = palette.bg;
    this.buildWallpaper(palette);
    this.buildTaskbar();
    // Implements: desk-smasher-dbt — all icons from theme pool in 3-col grid.
    this.buildIcons(this._sessionIconCount);
    // desk-smasher-7r5: buildWindows() removed — only functional windows from app.ts exist.
    // this.buildWindows(this._sessionWindowCount);
    // desk-smasher-f4k: stickies removed — don't fit the animal farm theme.
    // this.buildStickies(randInt(DESKTOP_CONFIG.STICKIES.min, DESKTOP_CONFIG.STICKIES.max));

    // desk-smasher-30t: notification panels removed — AchievementToast handles milestones.
    // this.buildNotifications(this._sessionNotifCount);

    // desk-smasher-ao7: decorative hanging banner removed.
    // desk-smasher-621: decorative hanging banner at top-center.
    // const hangingTex = Assets.get<Texture>(ADV_BANNER_HANGING);
    // if (hangingTex) {
    //   const banner = new Sprite(hangingTex);
    //   banner.anchor.set(0.5, 0);
    //   const bannerScale = this.screenW / 1920;
    //   banner.scale.set(bannerScale * 0.8);
    //   banner.position.set(this.screenW / 2, 0);
    //   this.container.addChild(banner);
    // }

    // Initialise cached health counters after all elements are created.
    this._totalHealth = this._elements.reduce((sum, e) => sum + e.maxHealth, 0);
    this._currentHealth = this._totalHealth;
  }

  private buildWallpaper(palette: WallpaperPalette): void {
    const bg = new Graphics()
      .rect(-500, -500, this.screenW + 1000, this.screenH + 1000)
      .fill(palette.bg);
    bg.label = 'wallpaper';
    this.container.addChild(bg);
  }

  private buildTaskbar(): void {
    // Scale taskbar height proportionally to viewport
    const baseTaskbarH = DESKTOP_CONFIG.TASKBAR_HEIGHT; // 48px baseline
    const taskbarScale = this.screenH / 768; // 1.0 at 768px, scales up/down
    const taskbarH = Math.round(baseTaskbarH * Math.max(0.5, Math.min(1.5, taskbarScale)));

    // Derived proportional values
    const btnSize = Math.round(taskbarH * 0.833); // ~40px at 48px taskbar
    const btnPad = Math.round(taskbarH * 0.083);  // ~4px at 48px taskbar
    const clockFontSize = Math.round(taskbarH * 0.292); // ~14px at 48px taskbar
    const clockRightPad = Math.round(taskbarH * 1.25); // ~60px at 48px taskbar
    const clockY = Math.round((taskbarH - clockFontSize) / 2);

    let c: Container;
    let gfx: Graphics | null = null;

    if (this._tilePanelBuilder?.isReady) {
      // Adventure dark panel for taskbar background.
      c = new Container();
      c.label = 'taskbar';

      const barSprite = this._tilePanelBuilder.buildTaskbarBg(this.screenW + 500, taskbarH + 200);
      if (barSprite) {
        c.addChild(barSprite);
      } else {
        // Fallback to Graphics if texture somehow missing.
        const bar = new Graphics()
          .rect(0, 0, this.screenW + 500, taskbarH + 200)
          .fill({ color: 0x1a1a2e, alpha: 0.9 });
        c.addChild(bar);
        gfx = bar;
      }

      // Round brown start button — scaled to taskbarH.
      const startBtn = this._tilePanelBuilder.buildStartButton();
      if (startBtn) {
        startBtn.position.set(btnPad, btnPad);
        startBtn.width = btnSize;
        startBtn.height = btnSize;
        c.addChild(startBtn);
      } else {
        const fallbackBtn = new Graphics()
          .roundRect(btnPad, btnPad, btnSize, btnSize, Math.round(btnSize * 0.15))
          .fill(0x8b5e3c);
        c.addChild(fallbackBtn);
      }

      // Animal icon inside start button — thematic and cute.
      // Implements: desk-smasher-ls0 — fill start button with random animal face.
      {
        const animalTex = this._themeLoader?.getNextIconTexture() ?? null;
        if (animalTex) {
          const icon = new Sprite(animalTex);
          icon.anchor.set(0.5);
          icon.width = btnSize * 0.6;
          icon.height = btnSize * 0.6;
          icon.position.set(btnPad + btnSize / 2, btnPad + btnSize / 2);
          c.addChild(icon);
        }
      }

      // Clock text — font size proportional to taskbarH.
      const clockStyle = new TextStyle({ fontSize: clockFontSize, fill: 0xffffff, fontFamily: 'monospace' });
      const clock = new Text({ text: '12:00', style: clockStyle });
      clock.position.set(this.screenW - clockRightPad, clockY);
      c.addChild(clock);

      // Tray icon area is reserved for ChaosStars — built and owned by app.ts.
      // Implements: desk-smasher-rq8 — chaos stars replace static checkbox tray icons.
    } else {
      // No tile builder — delegate to element factory.
      const result = this.factory.createTaskbar(this.screenW, taskbarH);
      c = result.container;
      gfx = result.gfx;
    }

    // Expose taskbar container and height for HealthDashboard wiring.
    this._taskbarContainer = c;
    this._taskbarH = taskbarH;

    c.position.set(0, this.screenH - taskbarH);
    this.container.addChild(c);
    void gfx; // gfx accessible via container if needed later

    const el: DesktopElement = {
      id: `el-${nextId++}`,
      type: 'taskbar',
      label: 'Taskbar',
      health: DESKTOP_CONFIG.HEALTH.taskbar,
      maxHealth: DESKTOP_CONFIG.HEALTH.taskbar,
      destroyed: false,
      x: 0,
      y: this.screenH - taskbarH,
      width: this.screenW,
      height: taskbarH,
      vx: 0,
      vy: 0,
      rotSpeed: 0,
    };
    this._elements.push(el);
    this.containers.push(c);
    void gfx; // gfx accessible via container if needed later
  }

  private buildIcons(count: number): void {
    /**
     * Implements: design/gdd/desktop-layout.md §2 — Icon Grid Rules
     * Implements: docs/architecture/layout-generation-algorithm.md §2
     * Implements: desk-smasher-dbt — all 30 animals shown in two 3-col × 5-row grids.
     * Implements: desk-smasher-u1y — split into top-left (15) and bottom-right (15).
     *
     * All theme icons are shown every generation. Order is shuffled via
     * ThemeLoader.resetShuffle() so each desktop feels fresh. The sequential
     * getNextIconTexture() calls ensure no duplicates across both grids.
     * No initial rotation — rotation is earned through smashing (damage wobble).
     */
    const useSprites = this._themeLoader?.isReady ?? false;

    // Always show the full theme icon pool — no random subset.
    // Implements: desk-smasher-dbt — iconCount = full theme pool size.
    const iconCount = useSprites
      ? this._themeLoader!.currentTheme.iconFrames.length
      : count;

    // Shuffle label fallbacks to match icon count.
    const labels = shuffle(ICON_LABELS).slice(0, iconCount);
    if (useSprites) {
      // resetShuffle() randomises the ORDER animals appear in; all are still shown.
      this._themeLoader!.resetShuffle();
    }

    const halfCount = Math.ceil(iconCount / 2);

    // Group 1: top-left (first 15 icons via sequential getNextIconTexture calls).
    // Group 2: bottom-right (remaining icons — shuffle continues from where group 1 left off).
    this._buildIconGrid(halfCount,          labels, 0,         LAYOUT_CONFIG.ICON_ZONE);
    this._buildIconGrid(iconCount - halfCount, labels, halfCount, LAYOUT_CONFIG.ICON_ZONE_2);
  }

  /**
   * Renders a single icon grid group into the given zone.
   * Implements: desk-smasher-u1y — shared helper for both icon corner groups.
   *
   * @param count    - Number of icons to place in this grid.
   * @param labels   - Full shuffled label fallback array (indexed by globalOffset + i).
   * @param globalOffset - Index offset into `labels` for this group (0 for group 1, halfCount for group 2).
   * @param zoneCfg  - Zone descriptor from LAYOUT_CONFIG (fractional x/y/w/h).
   */
  private _buildIconGrid(
    count: number,
    labels: string[],
    globalOffset: number,
    zoneCfg: { x: number; y: number; w: number; h: number; padding: number },
  ): void {
    const useSprites = this._themeLoader?.isReady ?? false;

    // Fixed icon size — always the same regardless of count.
    // Fixes: desk-smasher-yy2 — size derived solely from viewport scale.
    const baseScale = Math.min(this.screenW, this.screenH) / 1200;
    const iconSize = Math.round(LAYOUT_CONFIG.ICON_TARGET_SIZE * baseScale);

    const cols = LAYOUT_CONFIG.ICON_COLS_LARGE;

    const iconZone = resolveZone(zoneCfg, this.screenW, this.screenH);
    const placements = generateIconGrid(
      iconZone,
      count,
      iconSize,
      iconSize,
      cols,
      LAYOUT_CONFIG.ICON_JITTER,
    );

    const taskbarH = Math.round(DESKTOP_CONFIG.TASKBAR_HEIGHT * Math.max(0.5, Math.min(1.5, this.screenH / 768)));
    const taskbarY = this.screenH - taskbarH;

    const validated = validatePlacements(placements, [], [], iconZone, taskbarY);

    for (let i = 0; i < validated.icons.length; i++) {
      const p = validated.icons[i]!;
      const color = pick(this._activeIconColors);

      let displayLabel: string;
      let c: import('pixi.js').Container;

      if (useSprites) {
        const texture = this._themeLoader!.getNextIconTexture();
        if (texture) {
          const frames = this._themeLoader!.currentTheme.iconFrames;
          const frameName = frames[(globalOffset + i) % frames.length] ?? labels[globalOffset + i] ?? `Icon ${globalOffset + i}`;
          displayLabel = frameName.charAt(0).toUpperCase() + frameName.slice(1);
          // Pass fixed iconSize — uniform scale so all icons are the same pixel size.
          // Fixes: desk-smasher-yy2
          ({ container: c } = this.factory.createSpriteIcon(texture, displayLabel, iconSize, iconSize));
        } else {
          displayLabel = labels[globalOffset + i] ?? `Icon ${globalOffset + i}`;
          ({ container: c } = this.factory.createIcon(displayLabel, color, iconSize));
        }
      } else {
        displayLabel = labels[globalOffset + i] ?? `Icon ${globalOffset + i}`;
        ({ container: c } = this.factory.createIcon(displayLabel, color, iconSize));
      }

      c.position.set(p.x, p.y);
      // NO initial rotation — icons start tidy. Rotation happens after hits.
      // Implements: desktop-layout.md §2 "Visual Treatment".
      c.rotation = 0;
      this.container.addChild(c);

      const el: DesktopElement = {
        id: `el-${nextId++}`,
        type: 'icon',
        label: displayLabel,
        health: DESKTOP_CONFIG.HEALTH.icon,
        maxHealth: DESKTOP_CONFIG.HEALTH.icon,
        destroyed: false,
        x: p.x, y: p.y,
        width: p.w, height: p.h,
        vx: 0, vy: 0, rotSpeed: 0,
      };
      this._elements.push(el);
      this.containers.push(c);
    }
  }

  private buildWindows(count: number): void {
    /**
     * Implements: design/gdd/desktop-layout.md §3 — Window Placement Rules
     * Implements: docs/architecture/layout-generation-algorithm.md §3
     * Fixes: desk-smasher-9fp — replaced cascade with tiled placement so each
     *   window occupies its own non-overlapping slot and is fully visible.
     *
     * Layout grid:
     *   count=1 → full zone
     *   count=2 → 2 columns, side by side
     *   count=3 → 2×2 grid, bottom-right slot empty
     *
     * Count is capped at 3. Z-order: first window at back, last at front.
     */
    const cappedCount = Math.min(count, 3);
    const titles = shuffle(WINDOW_TITLES).slice(0, cappedCount);

    // Resolve window zone — tiled placement fills slots, so min/max size
    // percentages are no longer used for sizing (slot dimensions determine size).
    const windowZone = resolveZone(LAYOUT_CONFIG.WINDOW_ZONE, this.screenW, this.screenH);

    const TILED_PADDING = 15; // px gap between slot edge and window edge
    const placements = generateWindowTiled(
      windowZone,
      cappedCount,
      TILED_PADDING,
      LAYOUT_CONFIG.WINDOW_JITTER,
    );

    // Priority: TilePanelBuilder (tile-based) > ThemeLoader sprite panel > Graphics fallback.
    const windowTexture: Texture | null = this._themeLoader?.getUITexture('windowPanel') ?? null;
    const styles: PanelStyle[] = ['beige', 'brown', 'blue', 'dark'];

    placements.forEach((p, i) => {
      const title = titles[i] ?? `Window ${i}`;
      const titleColor = this._activeTitlebarColors[i % this._activeTitlebarColors.length];

      let c: Container;

      if (this._tilePanelBuilder?.isReady) {
        const style = styles[i % styles.length];
        const themeName = this._themeLoader?.currentTheme?.name;
        const windowContainer = this._tilePanelBuilder.buildWindow(style, p.w, p.h, themeName);
        windowContainer.position.set(p.x, p.y);
        c = windowContainer;
      } else if (windowTexture) {
        c = this._buildSpriteWindow(title, p.w, p.h, titleColor, windowTexture);
        c.position.set(p.x, p.y);
      } else {
        ({ container: c } = this.factory.createWindow(title, p.w, p.h, titleColor));
        c.position.set(p.x, p.y);
      }

      this.container.addChild(c);

      const el: DesktopElement = {
        id: `el-${nextId++}`,
        type: 'window',
        label: title,
        health: DESKTOP_CONFIG.HEALTH.window,
        maxHealth: DESKTOP_CONFIG.HEALTH.window,
        destroyed: false,
        x: p.x, y: p.y, width: p.w, height: p.h,
        vx: 0, vy: 0, rotSpeed: 0,
      };
      this._elements.push(el);
      this.containers.push(c);
    });
  }

  /**
   * Builds a window container using a Kenney UI sprite panel as the background.
   * The panel is stretched to fill (w x h). Title bar, close button, and faux
   * content lines are rendered on top via Graphics/Text, matching the Graphics
   * window layout.
   *
   * PixiJS v8: Sprite(texture) + width/height assignment stretches the texture.
   */
  private _buildSpriteWindow(
    title: string,
    w: number,
    h: number,
    titleColor: number,
    panelTexture: Texture,
  ): Container {
    const container = new Container();
    container.label = `window-${title}`;

    const titleBarH = 32;

    // Shadow behind panel
    const shadow = new Graphics()
      .roundRect(3, 3, w, h, 8)
      .fill({ color: 0x000000, alpha: 0.2 });
    container.addChild(shadow);

    // Sprite panel stretched to window dimensions
    const panel = new Sprite(panelTexture);
    panel.width = w;
    panel.height = h;
    container.addChild(panel);

    // Title bar overlay
    const titleBar = new Graphics()
      .roundRect(0, 0, w, titleBarH, 8)
      .fill({ color: titleColor, alpha: 0.9 })
      .rect(0, titleBarH - 8, w, 8)
      .fill({ color: titleColor, alpha: 0.9 });
    container.addChild(titleBar);

    const titleStyle = new TextStyle({ fontSize: 13, fill: 0xffffff, fontFamily: 'sans-serif' });
    const titleText = new Text({ text: title, style: titleStyle });
    titleText.position.set(10, 7);
    container.addChild(titleText);

    // Close button
    const closeBtn = new Graphics()
      .circle(w - 18, titleBarH / 2, 8)
      .fill(0xff4444);
    container.addChild(closeBtn);

    // Faux content lines
    const contentGfx = new Graphics();
    for (let line = 0; line < 6; line++) {
      const lineW = 60 + Math.random() * (w - 100);
      contentGfx.rect(15, titleBarH + 15 + line * 22, lineW, 10)
        .fill({ color: 0x000000, alpha: 0.1 });
    }
    container.addChild(contentGfx);

    return container;
  }

  private buildStickies(count: number): void {
    const texts = shuffle(STICKY_TEXTS).slice(0, count);

    texts.forEach((text, i) => {
      const w = 100;
      const h = 80;
      const x = Math.round(rand(0.65, 0.88) * this.screenW);
      const y = Math.round(rand(0.05, 0.55) * this.screenH);
      const color = this._activeStickyColors[i % this._activeStickyColors.length];

      const { container: c } = this.factory.createSticky(text, w, h, color);
      c.position.set(x, y);
      this.container.addChild(c);

      const el: DesktopElement = {
        id: `el-${nextId++}`,
        type: 'sticky',
        label: text,
        health: DESKTOP_CONFIG.HEALTH.sticky,
        maxHealth: DESKTOP_CONFIG.HEALTH.sticky,
        destroyed: false,
        x, y, width: w, height: h,
        vx: 0, vy: 0, rotSpeed: 0,
      };
      this._elements.push(el);
      this.containers.push(c);
    });
  }

  private buildNotifications(count: number): void {
    /**
     * Implements: design/gdd/desktop-layout.md §4 — Notification Placement Rules
     * Implements: docs/architecture/layout-generation-algorithm.md §4
     *
     * Notifications stack deterministically in the top-right NOTIF_ZONE.
     * Right-aligned, top-to-bottom, no randomness — matches real OS notification
     * behavior and guarantees no overlap.
     */
    const notifs = shuffle(NOTIF_TEXTS).slice(0, count);
    const bannerTex = this._tilePanelBuilder?.isReady
      ? Assets.get<Texture>(ADV_BANNER_MODERN)
      : undefined;

    // Determine banner dimensions from texture or use viewport-proportional fallback.
    // Implements: desktop-layout.md §4 — width = W * NOTIF_WIDTH_PCT.
    const bannerScale = this.screenW / 1920;
    const bannerW = Math.round(LAYOUT_CONFIG.NOTIF_WIDTH_PCT * this.screenW);
    const bannerH = bannerTex
      ? Math.round(bannerW * (bannerTex.height / bannerTex.width))
      : Math.max(40, Math.round(this.screenH * 0.05));

    // Resolve notification zone and generate deterministic stack positions.
    const notifZone = resolveZone(LAYOUT_CONFIG.NOTIF_ZONE, this.screenW, this.screenH);
    const placements = generateNotifStack(
      notifZone,
      count,
      bannerW,
      bannerH,
      LAYOUT_CONFIG.NOTIF_GAP,
    );

    placements.forEach((p, i) => {
      const notif = notifs[i];
      if (!notif) return;
      const color = pick([0x4488ff, 0x44cc44, 0xff8844, 0xcc44cc]);

      let c: Container;
      if (bannerTex) {
        // desk-smasher-reu: use adventure banner_modern sprite as notification background.
        c = new Container();
        c.label = `notification-banner-${i}`;
        const banner = new Sprite(bannerTex);
        banner.width = p.w;
        banner.height = p.h;
        c.addChild(banner);
        const textStyle = new TextStyle({ fontSize: Math.round(12 * bannerScale), fill: 0x3a2010, fontFamily: 'sans-serif' });
        const label = new Text({ text: notif.text, style: textStyle });
        label.anchor.set(0.5, 0.5);
        label.position.set(p.w / 2, p.h / 2);
        c.addChild(label);
      } else {
        ({ container: c } = this.factory.createNotification(notif.text, notif.icon, p.w, p.h, color));
      }
      c.position.set(p.x, p.y);
      this.container.addChild(c);

      const el: DesktopElement = {
        id: `el-${nextId++}`,
        type: 'notification',
        label: notif.text,
        health: DESKTOP_CONFIG.HEALTH.notification,
        maxHealth: DESKTOP_CONFIG.HEALTH.notification,
        destroyed: false,
        x: p.x, y: p.y, width: p.w, height: p.h,
        vx: 0, vy: 0, rotSpeed: 0,
      };
      this._elements.push(el);
      this.containers.push(c);
    });
  }

  private buildWidgets(count: number): void {
    type WidgetBuilder = () => void;
    const builders: WidgetBuilder[] = [
      () => this.buildClockWidget(),
      () => this.buildWeatherWidget(),
      () => this.buildMusicWidget(),
    ];
    const chosen = shuffle(builders).slice(0, count);
    chosen.forEach((b) => b());
  }

  private buildClockWidget(): void {
    const w = 120;
    const h = 120;
    const x = Math.round(rand(0.55, 0.80) * this.screenW);
    const y = Math.round(rand(0.60, 0.85) * this.screenH);

    const { container: c } = this.factory.createClockWidget(w, h);
    c.position.set(x, y);
    this.container.addChild(c);

    const el: DesktopElement = {
      id: `el-${nextId++}`,
      type: 'widget',
      label: 'Clock Widget',
      health: DESKTOP_CONFIG.HEALTH.widget,
      maxHealth: DESKTOP_CONFIG.HEALTH.widget,
      destroyed: false,
      x, y, width: w, height: h,
      vx: 0, vy: 0, rotSpeed: 0,
    };
    this._elements.push(el);
    this.containers.push(c);
  }

  private buildWeatherWidget(): void {
    const w = 140;
    const h = 60;
    const x = Math.round(rand(0.55, 0.80) * this.screenW);
    const y = Math.round(rand(0.60, 0.85) * this.screenH);

    const { container: c } = this.factory.createWeatherWidget(w, h);
    c.position.set(x, y);
    this.container.addChild(c);

    const el: DesktopElement = {
      id: `el-${nextId++}`,
      type: 'widget',
      label: 'Weather Widget',
      health: DESKTOP_CONFIG.HEALTH.widget,
      maxHealth: DESKTOP_CONFIG.HEALTH.widget,
      destroyed: false,
      x, y, width: w, height: h,
      vx: 0, vy: 0, rotSpeed: 0,
    };
    this._elements.push(el);
    this.containers.push(c);
  }

  private buildMusicWidget(): void {
    const w = 160;
    const h = 55;
    const x = Math.round(rand(0.55, 0.80) * this.screenW);
    const y = Math.round(rand(0.60, 0.85) * this.screenH);

    const { container: c } = this.factory.createMusicWidget(w, h);
    c.position.set(x, y);
    this.container.addChild(c);

    const el: DesktopElement = {
      id: `el-${nextId++}`,
      type: 'widget',
      label: 'Music Widget',
      health: DESKTOP_CONFIG.HEALTH.widget,
      maxHealth: DESKTOP_CONFIG.HEALTH.widget,
      destroyed: false,
      x, y, width: w, height: h,
      vx: 0, vy: 0, rotSpeed: 0,
    };
    this._elements.push(el);
    this.containers.push(c);
  }

  // ---------------------------------------------------------------------------
  // Public: individual element respawn (desk-smasher-hb7)
  // ---------------------------------------------------------------------------

  /**
   * Rebuilds a single destroyed element in-place: resets its health, assigns a
   * new random position appropriate to its type, creates a fresh PixiJS container,
   * and fades it in over ~0.3 seconds.
   *
   * Called by RespawnManager after the individual respawn timer fires.
   * The element's id and array slot are preserved — only the visual container
   * and position change.
   *
   * Edge cases:
   * - If the element is no longer in the array (e.g. full rebuild happened between
   *   destroy and respawn), the call is silently ignored.
   * - If ThemeLoader or TilePanelBuilder are unavailable, Graphics fallbacks are used.
   *
   * @param element - The DesktopElement to respawn (must have been destroyed).
   *
   * Usage:
   * ```typescript
   * desktop.respawnElement(element); // called from RespawnManager
   * ```
   */
  respawnElement(element: DesktopElement): void {
    const idx = this._elements.indexOf(element);
    if (idx === -1) return;

    // Destroy the old container (removes from stage and frees GPU resources).
    const oldContainer = this.containers[idx];
    if (oldContainer) {
      oldContainer.destroy({ children: true });
    }

    // Reset element state to full health at rest.
    element.health = element.maxHealth;
    element.destroyed = false;
    element.vx = 0;
    element.vy = 0;
    element.rotSpeed = 0;

    // Choose a new random position appropriate to the element type.
    const margin = 60;
    const taskbarH = this._getScaledTaskbarH();

    if (element.type === 'icon') {
      // Randomly pick either icon zone.
      const useZone2 = Math.random() > 0.5;
      const zone = useZone2 ? LAYOUT_CONFIG.ICON_ZONE_2 : LAYOUT_CONFIG.ICON_ZONE;
      element.x = zone.x * this.screenW + Math.random() * Math.max(0, zone.w * this.screenW - element.width);
      element.y = zone.y * this.screenH + Math.random() * Math.max(0, zone.h * this.screenH - element.height);
    } else if (element.type === 'window') {
      const zone = LAYOUT_CONFIG.WINDOW_ZONE;
      element.x = zone.x * this.screenW + Math.random() * Math.max(0, zone.w * this.screenW - element.width);
      element.y = zone.y * this.screenH + Math.random() * Math.max(0, zone.h * this.screenH - element.height);
    } else {
      // Generic random position within safe area (above taskbar).
      element.x = margin + Math.random() * Math.max(0, this.screenW - margin * 2 - element.width);
      element.y = margin + Math.random() * Math.max(0, this.screenH - taskbarH - margin * 2 - element.height);
    }

    // Build a fresh container for this element type.
    let newContainer: Container;

    if (element.type === 'icon') {
      const texture = this._themeLoader?.getNextIconTexture() ?? null;
      if (texture) {
        ({ container: newContainer } = this.factory.createSpriteIcon(
          texture,
          element.label,
          element.width,
          element.height,
        ));
      } else {
        ({ container: newContainer } = this.factory.createIcon(
          element.label,
          pick(this._activeIconColors),
          element.width,
        ));
      }
    } else if (element.type === 'window' && this._tilePanelBuilder?.isReady) {
      const styles: PanelStyle[] = ['beige', 'brown', 'blue', 'dark'];
      const style = styles[Math.floor(Math.random() * styles.length)]!;
      const themeName = this._themeLoader?.currentTheme?.name;
      newContainer = this._tilePanelBuilder.buildWindow(style, element.width, element.height, themeName);
    } else if (element.type === 'notification' && this._tilePanelBuilder?.isReady) {
      const bannerTex = Assets.get<Texture>(ADV_BANNER_MODERN);
      if (bannerTex) {
        const c = new Container();
        c.label = `notification-respawn-${element.id}`;
        const banner = new Sprite(bannerTex);
        banner.width = element.width;
        banner.height = element.height;
        c.addChild(banner);
        const bannerScale = this.screenW / 1920;
        const textStyle = new TextStyle({ fontSize: Math.round(12 * bannerScale), fill: 0x3a2010, fontFamily: 'sans-serif' });
        const label = new Text({ text: element.label, style: textStyle });
        label.anchor.set(0.5, 0.5);
        label.position.set(element.width / 2, element.height / 2);
        c.addChild(label);
        newContainer = c;
      } else {
        newContainer = new Container();
        newContainer.label = `respawn-fallback-${element.id}`;
      }
    } else {
      // Generic fallback — empty container (element still participates in physics/hit detection).
      newContainer = new Container();
      newContainer.label = `respawn-fallback-${element.id}`;
    }

    newContainer.position.set(element.x, element.y);
    newContainer.alpha = 0; // Start invisible for fade-in.
    this.container.addChild(newContainer);
    this.containers[idx] = newContainer;

    // desk-smasher-9ov: invoke registered respawn callback so functional windows
    // (CombatLog, ToolCard, ToolBag, Milestones) re-populate their content after respawn.
    const respawnCb = this._respawnCallbacks.get(element.id);
    if (respawnCb) {
      respawnCb(newContainer);
    }

    // Restore cached health counters so destructionProgress stays accurate.
    this._currentHealth += element.maxHealth;

    // Fade in over ~0.3 s using setInterval at ~60 Hz.
    let fadeTime = 0;
    const fadeIn = setInterval(() => {
      fadeTime += 0.016;
      newContainer.alpha = Math.min(1, fadeTime / 0.3);
      if (fadeTime >= 0.3) {
        newContainer.alpha = 1;
        clearInterval(fadeIn);
      }
    }, 16);
  }

  // ---------------------------------------------------------------------------
  // Private: layout helpers
  // ---------------------------------------------------------------------------

  /**
   * Returns the taskbar height in pixels, scaled to the current viewport height.
   * Mirrors the calculation in buildTaskbar() so respawnElement() places elements
   * in the correct safe area without re-building the taskbar.
   */
  private _getScaledTaskbarH(): number {
    const taskbarScale = this.screenH / 768;
    return Math.round(DESKTOP_CONFIG.TASKBAR_HEIGHT * Math.max(0.5, Math.min(1.5, taskbarScale)));
  }
}
