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
import { DESKTOP_CONFIG } from '../config';
import {
  WALLPAPER_PALETTES, ICON_LABELS, WINDOW_TITLES, STICKY_TEXTS, NOTIF_TEXTS,
  ICON_COLORS, TITLEBAR_COLORS, STICKY_COLORS,
  rand, randInt, pick, shuffle,
} from './element-types';
import { ElementFactory } from './element-factory';
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

  /** Running health totals — updated by buildDesktop() and recordDamage(). */
  private _totalHealth = 0;
  private _currentHealth = 0;

  /** Active wallpaper damage marks — oldest removed when cap is hit. */
  private _damageMarks: import('pixi.js').Graphics[] = [];
  private static readonly MAX_DAMAGE_MARKS = 30;

  private screenW: number;
  private screenH: number;
  private _wallpaperColor: number = WALLPAPER_PALETTES[0].bg;

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
    let aliveCount = 0;
    for (const el of this._elements) {
      if (!el.destroyed) aliveCount++;
    }
    if (aliveCount === 0) return null;
    let target = Math.floor(Math.random() * aliveCount);
    for (const el of this._elements) {
      if (!el.destroyed) {
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
    magnet: 5,   // scratch marks
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
    const mark = new Graphics();
    mark.position.set(x, y);

    switch (damageType) {
      case 0: {
        // Crack: spider-web fracture lines — orange tint for hammer impact
        const numLines = 3 + Math.floor(Math.random() * 4);
        for (let i = 0; i < numLines; i++) {
          const angle = Math.random() * Math.PI * 2;
          const len = 20 + Math.random() * 50;
          const midX = Math.cos(angle) * len * 0.4 + (Math.random() - 0.5) * 12;
          const midY = Math.sin(angle) * len * 0.4 + (Math.random() - 0.5) * 12;
          mark.moveTo(0, 0).lineTo(midX, midY)
            .lineTo(Math.cos(angle) * len, Math.sin(angle) * len)
            .stroke({ color: 0x884400, width: 1.5 + Math.random() * 1.5, alpha: 0.35 + Math.random() * 0.15 });
        }
        break;
      }
      case 1: {
        // Burn: bright green scorched marks with green embers — laser burns green
        const radius = 15 + Math.random() * 25;
        mark.circle(0, 0, radius).fill({ color: 0x22aa00, alpha: 0.5 });
        mark.circle(0, 0, radius * 0.6).fill({ color: 0x004400, alpha: 0.4 });
        mark.circle(0, 0, radius * 1.1).stroke({ color: 0x006600, width: 3, alpha: 0.3 });
        for (let i = 0; i < 5; i++) {
          const a = Math.random() * Math.PI * 2;
          const r = radius * (0.7 + Math.random() * 0.4);
          mark.circle(Math.cos(a) * r, Math.sin(a) * r, 2 + Math.random() * 2)
            .fill({ color: 0x44ff00, alpha: 0.4 + Math.random() * 0.3 });
        }
        break;
      }
      case 2: {
        // Dent: deep red crater with orange splash around edges — bomb impact
        const size = 12 + Math.random() * 20;
        mark.circle(0, 0, size).fill({ color: 0x880000, alpha: 0.3 });
        mark.circle(0, 0, size * 0.7).fill({ color: 0x660000, alpha: 0.25 });
        mark.circle(0, 0, size * 0.4).fill({ color: 0x440000, alpha: 0.2 });
        mark.circle(0, 0, size * 1.3).stroke({ color: 0xff6600, width: 2, alpha: 0.35 });
        for (let i = 0; i < 4; i++) {
          const a = Math.random() * Math.PI * 2;
          const dist = size * (1.0 + Math.random() * 0.6);
          const sr = 2 + Math.random() * 3;
          mark.circle(Math.cos(a) * dist, Math.sin(a) * dist, sr)
            .fill({ color: 0xff8800, alpha: 0.4 + Math.random() * 0.2 });
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
    this.factory.resetIconCount();
    this.buildDesktop();
  }

  /**
   * Updates the logical screen size and rebuilds the desktop to fit.
   * Called when the browser window is resized.
   *
   * @param w - New logical canvas width in px.
   * @param h - New logical canvas height in px.
   */
  resize(w: number, h: number): void {
    this.screenW = w;
    this.screenH = h;
    this.reset();
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

    this._wallpaperColor = palette.bg;
    this.buildWallpaper(palette);
    this.buildTaskbar();
    this.buildIcons(randInt(DESKTOP_CONFIG.ICONS.min, DESKTOP_CONFIG.ICONS.max));
    this.buildWindows(randInt(DESKTOP_CONFIG.WINDOWS.min, DESKTOP_CONFIG.WINDOWS.max));
    // desk-smasher-f4k: stickies removed — don't fit the animal farm theme.
    // this.buildStickies(randInt(DESKTOP_CONFIG.STICKIES.min, DESKTOP_CONFIG.STICKIES.max));

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

      // Clock text — font size proportional to taskbarH.
      const clockStyle = new TextStyle({ fontSize: clockFontSize, fill: 0xffffff, fontFamily: 'monospace' });
      const clock = new Text({ text: '12:00', style: clockStyle });
      clock.position.set(this.screenW - clockRightPad, clockY);
      c.addChild(clock);
    } else {
      // No tile builder — delegate to element factory.
      const result = this.factory.createTaskbar(this.screenW, taskbarH);
      c = result.container;
      gfx = result.gfx;
    }

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
    // When sprites are available show ALL frames; otherwise use the configured min/max range.
    // Implements: desk-smasher-1zl — show all 30 animals when sprite theme is active.
    const useSprites = this._themeLoader?.isReady ?? false;
    const iconCount = useSprites
      ? this._themeLoader!.currentTheme.iconFrames.length
      : count;

    // Implements: desk-smasher-qnn — scatter icons randomly across the full desktop.
    const labels = shuffle(ICON_LABELS).slice(0, iconCount);

    // Implements: desk-smasher-377 — scale animals relative to viewport, not fixed pixels.
    // On a 1920px screen this gives ~0.96 * 0.6 = ~0.48 effective scale; on a 600px screen ~0.3.
    const baseScale = Math.min(this.screenW, this.screenH) / 1200;
    const SPRITE_SCALE = baseScale * 0.6;

    const margin = 80;
    const taskbarH = Math.round(DESKTOP_CONFIG.TASKBAR_HEIGHT * Math.max(0.5, Math.min(1.5, this.screenH / 768)));
    const MIN_SPACING = 60;

    for (let i = 0; i < iconCount; i++) {
      const color = pick(this._activeIconColors);

      let displayLabel: string;
      let c: import('pixi.js').Container;
      let width: number;
      let height: number;

      if (useSprites) {
        const texture = this._themeLoader!.getNextIconTexture();
        if (texture) {
          // Derive label from the atlas frame name (e.g. "cat" -> "Cat")
          const frames = this._themeLoader!.currentTheme.iconFrames;
          const frameName = frames[i % frames.length] ?? labels[i] ?? `Icon ${i}`;
          displayLabel = frameName.charAt(0).toUpperCase() + frameName.slice(1);
          // Use sprite's natural dimensions scaled for desktop — hitbox matches visual.
          const spriteW = Math.round(texture.width * SPRITE_SCALE);
          const spriteH = Math.round(texture.height * SPRITE_SCALE);
          width = spriteW;
          height = spriteH;
          ({ container: c } = this.factory.createSpriteIcon(texture, displayLabel, spriteW, spriteH));
        } else {
          // Atlas loaded but getNextIconTexture returned null — fall back to Graphics icon.
          displayLabel = labels[i] ?? `Icon ${i}`;
          width = 64;
          height = 64;
          ({ container: c } = this.factory.createIcon(displayLabel, color, 64));
        }
      } else {
        displayLabel = labels[i] ?? `Icon ${i}`;
        width = 64;
        height = 64;
        ({ container: c } = this.factory.createIcon(displayLabel, color, 64));
      }

      // Scatter randomly across the full desktop with overlap retry.
      // Implements: desk-smasher-qnn — full-desktop icon scatter.
      let posX = 0;
      let posY = 0;
      let attempts = 0;
      do {
        posX = margin + Math.random() * (this.screenW - margin * 2 - width);
        posY = margin + Math.random() * (this.screenH - taskbarH - margin * 2 - height);
        attempts++;
      } while (attempts < 10 && this._elements.some(e => {
        const dx = e.x - posX;
        const dy = e.y - posY;
        return Math.sqrt(dx * dx + dy * dy) < MIN_SPACING;
      }));

      const x = Math.round(posX);
      const y = Math.round(posY);

      c.position.set(x, y);
      // Slight random rotation for a playful scattered feel.
      c.rotation = (Math.random() - 0.5) * 0.3;
      this.container.addChild(c);

      const el: DesktopElement = {
        id: `el-${nextId++}`,
        type: 'icon',
        label: displayLabel,
        health: DESKTOP_CONFIG.HEALTH.icon,
        maxHealth: DESKTOP_CONFIG.HEALTH.icon,
        destroyed: false,
        x, y,
        width,
        height,
        vx: 0, vy: 0, rotSpeed: 0,
      };
      this._elements.push(el);
      this.containers.push(c);
    }
  }

  private buildWindows(count: number): void {
    // Implements: desk-smasher-377 — cap at 2-3 windows, smaller size ranges to reduce clutter.
    const cappedCount = Math.min(count, 3);
    const titles = shuffle(WINDOW_TITLES).slice(0, cappedCount);

    // Priority: TilePanelBuilder (tile-based) > ThemeLoader sprite panel > Graphics fallback.
    const windowTexture: Texture | null = this._themeLoader?.getUITexture('windowPanel') ?? null;
    const styles: PanelStyle[] = ['beige', 'brown', 'blue', 'dark'];

    titles.forEach((title, i) => {
      const w = randInt(Math.round(this.screenW * 0.12), Math.round(this.screenW * 0.20));
      const h = randInt(Math.round(this.screenH * 0.15), Math.round(this.screenH * 0.25));
      const x = Math.round(rand(0.18, 0.65) * this.screenW);
      const y = Math.round(rand(0.05, 0.55) * this.screenH);
      const titleColor = this._activeTitlebarColors[i % this._activeTitlebarColors.length];

      let c: Container;

      if (this._tilePanelBuilder?.isReady) {
        // Use tile panels — each window gets a cycling PanelStyle.
        const style = styles[i % styles.length];
        const windowContainer = this._tilePanelBuilder.buildWindow(style, w, h);
        windowContainer.position.set(x, y);
        c = windowContainer;
      } else if (windowTexture) {
        c = this._buildSpriteWindow(title, w, h, titleColor, windowTexture);
        c.position.set(x, y);
      } else {
        ({ container: c } = this.factory.createWindow(title, w, h, titleColor));
        c.position.set(x, y);
      }

      this.container.addChild(c);

      const el: DesktopElement = {
        id: `el-${nextId++}`,
        type: 'window',
        label: title,
        health: DESKTOP_CONFIG.HEALTH.window,
        maxHealth: DESKTOP_CONFIG.HEALTH.window,
        destroyed: false,
        x, y, width: w, height: h,
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
    const notifs = shuffle(NOTIF_TEXTS).slice(0, count);
    const w = 220;
    const h = 50;

    notifs.forEach((notif, i) => {
      const x = Math.round(this.screenW - w - 10);
      const y = Math.round(this.screenH * 0.08) + i * 55;
      const color = pick([0x4488ff, 0x44cc44, 0xff8844, 0xcc44cc]);

      const { container: c } = this.factory.createNotification(notif.text, notif.icon, w, h, color);
      c.position.set(x, y);
      this.container.addChild(c);

      const el: DesktopElement = {
        id: `el-${nextId++}`,
        type: 'notification',
        label: notif.text,
        health: DESKTOP_CONFIG.HEALTH.notification,
        maxHealth: DESKTOP_CONFIG.HEALTH.notification,
        destroyed: false,
        x, y, width: w, height: h,
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
}
