/**
 * ElementFactory — creates individual desktop elements as PixiJS Containers.
 *
 * Implements: Desktop Renderer — visual element creation (Desk Smasher design doc)
 *
 * Each factory method builds a fully self-contained PixiJS Container using the
 * v8 Graphics API (method-chain with .fill()/.stroke(), NOT beginFill). The
 * returned container and primary graphics object are handed to DesktopManager,
 * which owns lifecycle (add/remove from stage).
 *
 * Icons are drawn via DESKTOP_ICONS / NOTIFICATION_ICONS definitions from
 * src/assets/svg-icons.ts — no emojis or external assets.
 */
import { Container, Graphics, Sprite, Text, TextStyle, Texture } from 'pixi.js';
import { ICON_COLORS, STICKY_COLORS, TITLEBAR_COLORS, NOTIF_TEXTS, rand, pick } from './element-types';
import { DESKTOP_ICONS, NOTIFICATION_ICONS } from '../assets/svg-icons';

// ---------------------------------------------------------------------------
// Emoji-to-notification-icon key mapping
// Maps the emoji strings stored in NOTIF_TEXTS to NOTIFICATION_ICONS keys.
// ---------------------------------------------------------------------------

const EMOJI_TO_NOTIF_KEY: Record<string, string> = {
  '📧': 'email',
  '🔄': 'update',
  '📅': 'calendar',
  '🔋': 'battery',
  '✅': 'check',
  '🍕': 'food',
  '💬': 'message',
  '📸': 'camera',
  '🖨️': 'printer',
  '📶': 'signal',
};

// ---------------------------------------------------------------------------
// ElementFactory
// ---------------------------------------------------------------------------

/** Result type returned by every factory method. */
export interface ElementVisual {
  container: Container;
  gfx: Graphics;
}

/**
 * Creates desktop element visuals using PixiJS Graphics.
 * Each factory method returns a Container with the element's graphics children
 * already added. The container is NOT added to any parent — that is the caller's
 * responsibility.
 */
export class ElementFactory {
  // Tracks how many icons have been created to cycle through symbol types.
  private iconCount = 0;

  /**
   * Creates a desktop icon: rounded coloured square with a generic symbol and label.
   *
   * @param label     - Text shown below the icon.
   * @param color     - Fill colour for the icon square. Defaults to a random ICON_COLOR.
   * @param size      - Icon square side length in px. Defaults to 64.
   * @returns Container and primary icon Graphics.
   */
  createIcon(
    label: string,
    color: number = pick(ICON_COLORS),
    size: number = 64,
  ): ElementVisual {
    const container = new Container();
    container.label = `icon-${label}`;

    const gfx = new Graphics()
      .roundRect(0, 0, size, size, 10)
      .fill(color)
      .roundRect(0, 0, size, size, 10)
      .stroke({ color: 0xffffff, width: 2, alpha: 0.5 });
    container.addChild(gfx);

    this.iconCount++;
    const iconDef = DESKTOP_ICONS[label] ?? DESKTOP_ICONS['Docs']!;
    const sym = new Graphics();
    sym.alpha = 0.85;
    iconDef.draw(sym, size / 2, size / 2, size * 0.45, 0xffffff);
    container.addChild(sym);

    const labelStyle = new TextStyle({
      fontSize: 11,
      fill: 0xffffff,
      fontFamily: 'sans-serif',
      align: 'center',
    });
    const labelTxt = new Text({ text: label, style: labelStyle });
    labelTxt.anchor.set(0.5, 0);
    labelTxt.position.set(size / 2, size + 4);
    container.addChild(labelTxt);

    return { container, gfx };
  }

  /**
   * Creates a desktop icon using a sprite texture from the active theme.
   * The sprite is displayed at the given width/height (natural size * scale),
   * so the hitbox and visual match exactly.
   *
   * Implements: desk-smasher-8lo — use sprite's actual dimensions, not a 64px square.
   *
   * @param texture  - A Texture from the loaded theme atlas.
   * @param label    - Text shown below the icon.
   * @param width    - Desired display width in px.
   * @param height   - Desired display height in px.
   * @returns Container and primary Sprite (cast to Graphics for registry compat).
   */
  createSpriteIcon(
    texture: Texture,
    label: string,
    width: number,
    height: number,
  ): ElementVisual {
    const container = new Container();
    container.label = `icon-${label}`;

    const sprite = new Sprite(texture);
    sprite.anchor.set(0.5);
    // Preserve aspect ratio — scale uniformly to fit within the cell.
    // Setting width/height independently stretches non-square textures (e.g. 154x132 animals).
    const maxDim = Math.max(sprite.texture.width, sprite.texture.height);
    const uniformScale = Math.min(width, height) / maxDim;
    sprite.scale.set(uniformScale);
    sprite.position.set(width / 2, height / 2);
    container.addChild(sprite);

    // Return sprite as gfx so damage tinting works on the sprite itself
    return { container, gfx: sprite as unknown as Graphics };
  }

  /**
   * Creates a desktop window: title bar + body with faux content lines and a shadow.
   *
   * @param title      - Title bar text.
   * @param w          - Window width in px.
   * @param h          - Window height in px.
   * @param titleColor - Title bar fill colour. Defaults to a random TITLEBAR_COLOR.
   * @param bodyColor  - Window body fill colour. Defaults to 0xf0f4ff.
   * @returns Container and primary body Graphics.
   */
  createWindow(
    title: string,
    w: number,
    h: number,
    titleColor: number = pick(TITLEBAR_COLORS),
    bodyColor: number = 0xf0f4ff,
  ): ElementVisual {
    const container = new Container();
    container.label = `window-${title}`;

    const titleBarH = 32;

    // Shadow (drawn first, behind body)
    const shadow = new Graphics()
      .roundRect(3, 3, w, h, 8)
      .fill({ color: 0x000000, alpha: 0.2 });
    container.addChild(shadow);

    const gfx = new Graphics()
      .roundRect(0, 0, w, h, 8)
      .fill(bodyColor)
      .roundRect(0, 0, w, h, 8)
      .stroke({ color: 0xcccccc, width: 1 });
    container.addChild(gfx);

    const titleBar = new Graphics()
      .roundRect(0, 0, w, titleBarH, 8)
      .fill(titleColor)
      .rect(0, titleBarH - 8, w, 8)
      .fill(titleColor);
    container.addChild(titleBar);

    const titleStyle = new TextStyle({ fontSize: 13, fill: 0xffffff, fontFamily: 'sans-serif' });
    const titleText = new Text({ text: title, style: titleStyle });
    titleText.position.set(10, 7);
    container.addChild(titleText);

    const closeBtn = new Graphics()
      .circle(w - 18, titleBarH / 2, 8)
      .fill(0xff4444);
    container.addChild(closeBtn);

    // Faux content lines
    const contentGfx = new Graphics();
    for (let line = 0; line < 6; line++) {
      const lineW = 60 + Math.random() * (w - 100);
      contentGfx.rect(15, titleBarH + 15 + line * 22, lineW, 10)
        .fill({ color: 0x000000, alpha: 0.15 });
    }
    container.addChild(contentGfx);

    return { container, gfx };
  }

  /**
   * Creates a sticky note: coloured rectangle with a dog-ear fold and wrapped text.
   *
   * @param text  - Note body text (word-wrapped).
   * @param w     - Sticky width in px.
   * @param h     - Sticky height in px.
   * @param color - Background fill colour. Defaults to a random STICKY_COLOR.
   * @returns Container and primary background Graphics.
   */
  createSticky(
    text: string,
    w: number,
    h: number,
    color: number = pick(STICKY_COLORS),
  ): ElementVisual {
    const container = new Container();
    container.label = `sticky-${text}`;
    container.rotation = rand(-0.1, 0.1);

    const gfx = new Graphics()
      .rect(0, 0, w, h)
      .fill(color)
      .rect(0, 0, w, h)
      .stroke({ color: 0x000000, width: 1, alpha: 0.1 });
    container.addChild(gfx);

    // Dog-ear fold triangle in top-right corner
    const fold = new Graphics()
      .poly([w - 15, 0, w, 0, w, 15])
      .fill({ color: 0x000000, alpha: 0.1 });
    container.addChild(fold);

    const textStyle = new TextStyle({
      fontSize: 12,
      fill: 0x333333,
      fontFamily: 'sans-serif',
      wordWrap: true,
      wordWrapWidth: w - 16,
    });
    const txt = new Text({ text, style: textStyle });
    txt.position.set(8, 10);
    container.addChild(txt);

    return { container, gfx };
  }

  /**
   * Creates a toast notification: rounded pill with emoji icon and message text.
   *
   * @param text  - Notification message.
   * @param icon  - Emoji icon string (rendered as Text).
   * @param w     - Notification width in px.
   * @param h     - Notification height in px.
   * @param color - Background fill colour. Defaults to a random accent colour.
   * @returns Container and primary background Graphics.
   */
  createNotification(
    text: string,
    icon: string,
    w: number,
    h: number,
    color: number = pick([0x4488ff, 0x44cc44, 0xff8844, 0xcc44cc]),
  ): ElementVisual {
    const container = new Container();
    container.label = `notif-${text}`;

    const gfx = new Graphics()
      .roundRect(0, 0, w, h, 12)
      .fill({ color, alpha: 0.95 })
      .roundRect(0, 0, w, h, 12)
      .stroke({ color: 0xffffff, width: 1, alpha: 0.3 });
    container.addChild(gfx);

    const notifKey = EMOJI_TO_NOTIF_KEY[icon] ?? 'email';
    const notifDef = NOTIFICATION_ICONS[notifKey] ?? NOTIFICATION_ICONS['email']!;
    const iconGfx = new Graphics();
    // Draw notification icon centred in a 26x26 area at left of pill (offset 10,12)
    notifDef.draw(iconGfx, 10 + 13, 12 + 13, 22, 0xffffff);
    iconGfx.alpha = 0.9;
    container.addChild(iconGfx);

    const textStyle = new TextStyle({ fontSize: 12, fill: 0xffffff, fontFamily: 'sans-serif' });
    const txt = new Text({ text, style: textStyle });
    txt.position.set(40, 16);
    container.addChild(txt);

    return { container, gfx };
  }

  /**
   * Creates the taskbar: a dark translucent bar spanning the bottom of the screen.
   *
   * @param w - Screen width (bar will fill this width).
   * @param h - Taskbar height in px (typically DESKTOP_CONFIG.TASKBAR_HEIGHT).
   * @returns Container and primary bar Graphics.
   */
  createTaskbar(w: number, h: number): ElementVisual {
    const container = new Container();
    container.label = 'taskbar';

    const gfx = new Graphics()
      .rect(0, 0, w + 500, h + 200)
      .fill({ color: 0x1a1a2e, alpha: 0.9 });
    container.addChild(gfx);

    const startBtn = new Graphics()
      .roundRect(4, 4, 40, 40, 6)
      .fill(0x3366cc);
    container.addChild(startBtn);

    const clockStyle = new TextStyle({ fontSize: 14, fill: 0xffffff, fontFamily: 'monospace' });
    const clock = new Text({ text: '12:00', style: clockStyle });
    clock.position.set(w - 60, 14);
    container.addChild(clock);

    return { container, gfx };
  }

  /**
   * Creates a clock widget: analogue clock face with hour/minute hands.
   *
   * @param w - Widget bounding-box width in px.
   * @param h - Widget bounding-box height in px.
   * @returns Container and primary background Graphics.
   */
  createClockWidget(w: number, h: number): ElementVisual {
    const container = new Container();
    container.label = 'widget-clock';

    const cx = w / 2;
    const cy = h / 2;
    const radius = Math.min(w, h) / 2;

    const gfx = new Graphics()
      .circle(cx, cy, radius)
      .fill({ color: 0x222244, alpha: 0.85 })
      .circle(cx, cy, radius)
      .stroke({ color: 0x4466aa, width: 2 });
    container.addChild(gfx);

    const hands = new Graphics();
    hands.moveTo(cx, cy).lineTo(cx + 15, cy - 25).stroke({ color: 0xffffff, width: 3 });
    hands.moveTo(cx, cy).lineTo(cx - 10, cy - 35).stroke({ color: 0xffffff, width: 2 });
    hands.circle(cx, cy, 4).fill(0xff4444);
    container.addChild(hands);

    const twelveStyle = new TextStyle({ fontSize: 14, fill: 0xffffff, fontFamily: 'monospace' });
    const twelve = new Text({ text: '12', style: twelveStyle });
    twelve.anchor.set(0.5);
    twelve.position.set(cx, 10);
    container.addChild(twelve);

    return { container, gfx };
  }

  /**
   * Creates a weather widget: rounded card with sun graphic, temperature, and condition.
   *
   * @param w - Widget width in px.
   * @param h - Widget height in px.
   * @returns Container and primary background Graphics.
   */
  createWeatherWidget(w: number, h: number): ElementVisual {
    const container = new Container();
    container.label = 'widget-weather';

    const gfx = new Graphics()
      .roundRect(0, 0, w, h, 14)
      .fill({ color: 0x2288cc, alpha: 0.85 })
      .roundRect(0, 0, w, h, 14)
      .stroke({ color: 0x44aaff, width: 1 });
    container.addChild(gfx);

    const sun = new Graphics()
      .circle(25, h / 2, 14)
      .fill(0xffcc00);
    container.addChild(sun);

    const tempStyle = new TextStyle({
      fontSize: 22,
      fill: 0xffffff,
      fontFamily: 'sans-serif',
      fontWeight: 'bold',
    });
    const temp = new Text({ text: '72°F', style: tempStyle });
    temp.position.set(50, 8);
    container.addChild(temp);

    const descStyle = new TextStyle({ fontSize: 11, fill: 0xccddff, fontFamily: 'sans-serif' });
    const desc = new Text({ text: 'Sunny', style: descStyle });
    desc.position.set(50, 36);
    container.addChild(desc);

    return { container, gfx };
  }

  /**
   * Creates a music player widget: dark pill with play button, track name, and progress bar.
   *
   * @param w - Widget width in px.
   * @param h - Widget height in px.
   * @returns Container and primary background Graphics.
   */
  createMusicWidget(w: number, h: number): ElementVisual {
    const container = new Container();
    container.label = 'widget-music';

    const gfx = new Graphics()
      .roundRect(0, 0, w, h, 10)
      .fill({ color: 0x332255, alpha: 0.90 })
      .roundRect(0, 0, w, h, 10)
      .stroke({ color: 0xaa66ff, width: 1 });
    container.addChild(gfx);

    const playBtn = new Graphics()
      .poly([14, 14, 14, h - 14, 36, h / 2])
      .fill(0xaa66ff);
    container.addChild(playBtn);

    const trackStyle = new TextStyle({ fontSize: 11, fill: 0xffffff, fontFamily: 'sans-serif' });
    const track = new Text({ text: 'Lo-fi Beats', style: trackStyle });
    track.position.set(44, 10);
    container.addChild(track);

    const barBg = new Graphics()
      .rect(44, 30, w - 54, 6)
      .fill({ color: 0xffffff, alpha: 0.2 });
    container.addChild(barBg);

    const progress = new Graphics()
      .rect(44, 30, Math.round((w - 54) * rand(0.1, 0.9)), 6)
      .fill(0xaa66ff);
    container.addChild(progress);

    return { container, gfx };
  }

  /**
   * Resets the internal icon symbol counter.
   * Useful in tests to produce deterministic symbol sequences.
   */
  resetIconCount(): void {
    this.iconCount = 0;
  }
}

// Re-export NOTIF_TEXTS so DesktopManager can resolve notification icons without
// importing from element-types directly through a second path.
export { NOTIF_TEXTS };
