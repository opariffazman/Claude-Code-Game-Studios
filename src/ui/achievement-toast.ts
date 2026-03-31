/**
 * AchievementToast — shows milestone banners that auto-remove after 3 s.
 *
 * Toasts stack vertically from the top-centre of the screen and slide out of
 * the list when their timer expires. No PixiJS Loader usage — all rendering
 * is done with Graphics and Text (no asset dependencies).
 *
 * Usage:
 * ```ts
 * const toast = new AchievementToast(uiLayer, app.screen.width);
 * toast.show('First Strike!');
 * ```
 */
import { Assets, Container, Graphics, Sprite, Text, TextStyle, Texture } from 'pixi.js';
import { ADV_BANNER_CLASSIC_CURTAIN } from './tile-panel';

const TOAST_DURATION_MS = 3000;
const TOAST_H = 40;
const TOAST_MARGIN = 8;
const TOAST_MAX_W = 300;

export class AchievementToast {
  private readonly _container: Container;
  private readonly _toasts: Container[] = [];
  private readonly _screenW: number;

  /**
   * @param parent  - Container to attach toast nodes to (typically the UI layer).
   * @param screenW - Current canvas width in pixels, used to centre toasts.
   */
  constructor(parent: Container, screenW: number) {
    this._screenW = screenW;
    this._container = new Container();
    this._container.label = 'achievement-toasts';
    parent.addChild(this._container);
  }

  /**
   * Show an achievement toast banner. Appears at the top-centre of the screen,
   * stacks above previously active toasts, and auto-removes after 3 s.
   *
   * @param label - Human-readable achievement text (e.g. "10 Animals Smashed!").
   */
  show(label: string): void {
    const w = Math.min(TOAST_MAX_W, this._screenW * 0.25);

    const toast = new Container();

    // Adventure banner background — uses the preloaded banner_modern SVG sprite.
    // Falls back to a gold Graphics roundRect if the texture is not yet loaded.
    const bannerTex = Assets.get<Texture>(ADV_BANNER_CLASSIC_CURTAIN);
    if (bannerTex) {
      const bg = new Sprite(bannerTex);
      bg.width = w;
      bg.height = TOAST_H;
      toast.addChild(bg);
    } else {
      const bg = new Graphics()
        .roundRect(0, 0, w, TOAST_H, 8)
        .fill({ color: 0xffcc00, alpha: 0.9 })
        .roundRect(0, 0, w, TOAST_H, 8)
        .stroke({ color: 0xff8800, width: 2 });
      toast.addChild(bg);
    }

    // Label text centred inside the banner
    const style = new TextStyle({
      fontSize: 14,
      fill: 0x333333,
      fontFamily: 'sans-serif',
      fontWeight: 'bold',
    });
    const text = new Text({ text: `\u2B50 ${label}`, style });
    text.anchor.set(0.5);
    text.position.set(w / 2, TOAST_H / 2);
    toast.addChild(text);

    // Stack above existing toasts at top-centre
    const yOffset = this._toasts.length * (TOAST_H + TOAST_MARGIN);
    toast.position.set((this._screenW - w) / 2, 10 + yOffset);

    this._container.addChild(toast);
    this._toasts.push(toast);

    // Auto-remove after duration and reflow remaining toasts
    setTimeout(() => {
      if (!toast.destroyed) {
        toast.destroy({ children: true });
      }
      const idx = this._toasts.indexOf(toast);
      if (idx !== -1) {
        this._toasts.splice(idx, 1);
      }
      // Reposition remaining toasts so there are no gaps
      this._toasts.forEach((t, i) => {
        t.y = 10 + i * (TOAST_H + TOAST_MARGIN);
      });
    }, TOAST_DURATION_MS);
  }
}
