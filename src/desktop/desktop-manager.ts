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
import { Container, Graphics, Text, TextStyle } from 'pixi.js';
import { DESKTOP_CONFIG } from '../config';
import {
  WALLPAPER_PALETTES, ICON_LABELS, WINDOW_TITLES, STICKY_TEXTS, NOTIF_TEXTS,
  ICON_COLORS, TITLEBAR_COLORS, STICKY_COLORS,
  rand, randInt, pick, shuffle,
} from './element-types';
import { ElementFactory } from './element-factory';
import type { DesktopElement, ElementType, WallpaperPalette } from '../types';

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

  private screenW: number;
  private screenH: number;
  private _wallpaperColor: number = WALLPAPER_PALETTES[0].bg;

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

    this.buildDesktop();
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
   */
  getRandomAlive(): DesktopElement | null {
    const alive = this._elements.filter((e) => !e.destroyed);
    if (alive.length === 0) return null;
    return alive[Math.floor(Math.random() * alive.length)];
  }

  /** Destruction progress in [0, 1]: 0 = pristine, 1 = fully destroyed. */
  get destructionProgress(): number {
    const total = this._elements.reduce((s, e) => s + e.maxHealth, 0);
    const current = this._elements.reduce((s, e) => s + e.health, 0);
    return total === 0 ? 0 : 1 - current / total;
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
   */
  crackWallpaper(x: number, y: number): void {
    const damageType = Math.floor(Math.random() * 6);
    const mark = new Graphics();
    mark.position.set(x, y);

    switch (damageType) {
      case 0: {
        // Crack: spider-web fracture lines
        const numLines = 3 + Math.floor(Math.random() * 4);
        for (let i = 0; i < numLines; i++) {
          const angle = Math.random() * Math.PI * 2;
          const len = 20 + Math.random() * 50;
          const midX = Math.cos(angle) * len * 0.4 + (Math.random() - 0.5) * 12;
          const midY = Math.sin(angle) * len * 0.4 + (Math.random() - 0.5) * 12;
          mark.moveTo(0, 0).lineTo(midX, midY)
            .lineTo(Math.cos(angle) * len, Math.sin(angle) * len)
            .stroke({ color: 0x000000, width: 1.5 + Math.random() * 1.5, alpha: 0.35 + Math.random() * 0.15 });
        }
        break;
      }
      case 1: {
        // Burn: dark circle with scorched edges and orange embers
        const radius = 15 + Math.random() * 25;
        mark.circle(0, 0, radius).fill({ color: 0x1a0a00, alpha: 0.5 });
        mark.circle(0, 0, radius * 0.6).fill({ color: 0x000000, alpha: 0.4 });
        mark.circle(0, 0, radius * 1.1).stroke({ color: 0x332200, width: 3, alpha: 0.3 });
        for (let i = 0; i < 5; i++) {
          const a = Math.random() * Math.PI * 2;
          const r = radius * (0.7 + Math.random() * 0.4);
          mark.circle(Math.cos(a) * r, Math.sin(a) * r, 2 + Math.random() * 2)
            .fill({ color: 0xff6600, alpha: 0.4 + Math.random() * 0.3 });
        }
        break;
      }
      case 2: {
        // Dent: concentric rings suggesting depth with a highlight
        const size = 12 + Math.random() * 20;
        mark.circle(0, 0, size).fill({ color: 0x000000, alpha: 0.15 });
        mark.circle(0, 0, size * 0.7).fill({ color: 0x000000, alpha: 0.12 });
        mark.circle(0, 0, size * 0.4).fill({ color: 0x000000, alpha: 0.1 });
        mark.circle(size * -0.2, size * -0.2, size * 0.3)
          .fill({ color: 0xffffff, alpha: 0.08 });
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
        // Pixel: digital-glitch grid of sparse squares
        const cellSize = 5 + Math.random() * 3;
        const spread = 3 + Math.floor(Math.random() * 3);
        for (let gx = -spread; gx <= spread; gx++) {
          for (let gy = -spread; gy <= spread; gy++) {
            if (Math.random() > 0.5) continue;
            const brightness = Math.random();
            const color = brightness > 0.5 ? 0xffffff : 0x000000;
            mark.rect(gx * cellSize, gy * cellSize, cellSize - 1, cellSize - 1)
              .fill({ color, alpha: 0.15 + Math.random() * 0.2 });
          }
        }
        break;
      }
      case 5: {
        // Scratch: diagonal claw marks
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
            .stroke({ color: 0x000000, width: 1.5 + Math.random(), alpha: 0.3 + Math.random() * 0.15 });
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

  // ---------------------------------------------------------------------------
  // Private: desktop construction
  // ---------------------------------------------------------------------------

  private buildDesktop(): void {
    const palette = pick(WALLPAPER_PALETTES);
    this._wallpaperColor = palette.bg;
    this.buildWallpaper(palette);
    this.buildTaskbar();
    this.buildIcons(randInt(DESKTOP_CONFIG.ICONS.min, DESKTOP_CONFIG.ICONS.max));
    this.buildWindows(randInt(DESKTOP_CONFIG.WINDOWS.min, DESKTOP_CONFIG.WINDOWS.max));
    this.buildStickies(randInt(DESKTOP_CONFIG.STICKIES.min, DESKTOP_CONFIG.STICKIES.max));
    this.buildNotifications(randInt(DESKTOP_CONFIG.NOTIFICATIONS.min, DESKTOP_CONFIG.NOTIFICATIONS.max));
    this.buildWidgets(randInt(DESKTOP_CONFIG.WIDGETS.min, DESKTOP_CONFIG.WIDGETS.max));
  }

  private buildWallpaper(palette: WallpaperPalette): void {
    const bg = new Graphics()
      .rect(-500, -500, this.screenW + 1000, this.screenH + 1000)
      .fill(palette.bg);
    bg.label = 'wallpaper';
    this.container.addChild(bg);
  }

  private buildTaskbar(): void {
    const taskbarH = DESKTOP_CONFIG.TASKBAR_HEIGHT;
    const y = this.screenH - taskbarH;
    const { container: c, gfx } = this.factory.createTaskbar(this.screenW, taskbarH);
    c.position.set(0, y);
    this.container.addChild(c);

    const el: DesktopElement = {
      id: `el-${nextId++}`,
      type: 'taskbar',
      label: 'Taskbar',
      health: DESKTOP_CONFIG.HEALTH.taskbar,
      maxHealth: DESKTOP_CONFIG.HEALTH.taskbar,
      destroyed: false,
      x: 0,
      y,
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
    const labels = shuffle(ICON_LABELS).slice(0, count);

    const cols = 2;
    const spacingX = Math.round(this.screenW * 0.06);
    const spacingY = Math.round(this.screenH * 0.12);
    const startX = Math.round(this.screenW * 0.02);
    const startY = Math.round(this.screenH * 0.04);

    labels.forEach((label, i) => {
      const col = i % cols;
      const row = Math.floor(i / cols);
      const x = Math.round(startX + col * spacingX + rand(-15, 15));
      const y = Math.round(startY + row * spacingY + rand(-15, 15));
      const color = pick(ICON_COLORS);
      const iconSize = 64;

      const { container: c } = this.factory.createIcon(label, color, iconSize);
      c.position.set(x, y);
      this.container.addChild(c);

      const el: DesktopElement = {
        id: `el-${nextId++}`,
        type: 'icon',
        label,
        health: DESKTOP_CONFIG.HEALTH.icon,
        maxHealth: DESKTOP_CONFIG.HEALTH.icon,
        destroyed: false,
        x, y,
        width: iconSize,
        height: iconSize,
        vx: 0, vy: 0, rotSpeed: 0,
      };
      this._elements.push(el);
      this.containers.push(c);
    });
  }

  private buildWindows(count: number): void {
    const titles = shuffle(WINDOW_TITLES).slice(0, count);

    titles.forEach((title, i) => {
      const w = Math.round(rand(0.15, 0.32) * this.screenW);
      const h = Math.round(rand(0.20, 0.40) * this.screenH);
      const x = Math.round(rand(0.18, 0.65) * this.screenW);
      const y = Math.round(rand(0.05, 0.55) * this.screenH);
      const titleColor = TITLEBAR_COLORS[i % TITLEBAR_COLORS.length];

      const { container: c } = this.factory.createWindow(title, w, h, titleColor);
      c.position.set(x, y);
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

  private buildStickies(count: number): void {
    const texts = shuffle(STICKY_TEXTS).slice(0, count);

    texts.forEach((text, i) => {
      const w = 100;
      const h = 80;
      const x = Math.round(rand(0.65, 0.88) * this.screenW);
      const y = Math.round(rand(0.05, 0.55) * this.screenH);
      const color = STICKY_COLORS[i % STICKY_COLORS.length];

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
