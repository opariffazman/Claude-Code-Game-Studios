/**
 * Tile Panel Builder — assembles windows from Kenney pixel-adventure tiles.
 */
import { Assets, Container, Sprite, Texture } from 'pixi.js';

export type PanelStyle = 'beige' | 'brown' | 'blue' | 'dark';

const TILE_DIR = 'assets/kenney/ui/pixel-adventure/tiles';
const ADV_DIR = 'assets/kenney/ui/adventure';

const PANEL_TILES: Record<PanelStyle, string> = {
  beige: `${TILE_DIR}/tile_0000.png`,
  brown: `${TILE_DIR}/tile_0001.png`,
  blue: `${TILE_DIR}/tile_0002.png`,
  dark: `${TILE_DIR}/tile_0003.png`,
};

const BANNER = {
  left: `${TILE_DIR}/tile_0043.png`,
  center: `${TILE_DIR}/tile_0044.png`,
  right: `${TILE_DIR}/tile_0045.png`,
};

const CLOSE_BTN = `${ADV_DIR}/close_red.png`;

export class TilePanelBuilder {
  private _ready = false;

  async preload(): Promise<void> {
    await Assets.load([
      ...Object.values(PANEL_TILES),
      ...Object.values(BANNER),
      CLOSE_BTN,
    ]);
    this._ready = true;
  }

  get isReady(): boolean { return this._ready; }

  buildWindow(style: PanelStyle, w: number, h: number): Container {
    const c = new Container();
    c.label = `window-${style}`;

    const panelTex = Assets.get<Texture>(PANEL_TILES[style]);
    if (panelTex) {
      const bg = new Sprite(panelTex);
      bg.width = w;
      bg.height = h;
      c.addChild(bg);
    }

    const banner = this.buildBanner(w - 16);
    if (banner) {
      banner.position.set(8, 4);
      c.addChild(banner);
    }

    const closeTex = Assets.get<Texture>(CLOSE_BTN);
    if (closeTex) {
      const btn = new Sprite(closeTex);
      btn.anchor.set(0.5);
      btn.position.set(w - 16, 20);
      btn.width = 24;
      btn.height = 24;
      c.addChild(btn);
    }

    return c;
  }

  buildPanel(style: PanelStyle, w: number, h: number): Sprite | null {
    const tex = Assets.get<Texture>(PANEL_TILES[style]);
    if (!tex) return null;
    const s = new Sprite(tex);
    s.width = w;
    s.height = h;
    return s;
  }

  buildBanner(width: number): Container | null {
    const lTex = Assets.get<Texture>(BANNER.left);
    const cTex = Assets.get<Texture>(BANNER.center);
    const rTex = Assets.get<Texture>(BANNER.right);
    if (!lTex || !cTex || !rTex) return null;

    const c = new Container();
    const tw = 32;

    const left = new Sprite(lTex);
    left.width = tw;
    left.height = 32;
    c.addChild(left);

    const center = new Sprite(cTex);
    center.position.set(tw, 0);
    center.width = Math.max(0, width - tw * 2);
    center.height = 32;
    c.addChild(center);

    const right = new Sprite(rTex);
    right.position.set(width - tw, 0);
    right.width = tw;
    right.height = 32;
    c.addChild(right);

    return c;
  }
}
