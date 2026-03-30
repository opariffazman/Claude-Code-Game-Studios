/**
 * Tile Panel Builder — uses NineSliceSprite for proper pixel-art panel scaling.
 * Implements: UI chrome spec (Kenney pixel-adventure tiles).
 *
 * Borders are preserved at original pixel size; only the center stretches.
 * Panel tiles (tile_0000–tile_0003) are 32×32 with ~4px visible borders.
 * BORDER_INSET of 8px gives the nine-slice room to keep those borders crisp.
 */
import { Assets, Container, NineSliceSprite, Sprite, Texture } from 'pixi.js';

export type PanelStyle = 'beige' | 'brown' | 'blue' | 'dark';

const TILE_DIR = 'assets/kenney/ui/pixel-adventure/tiles';
const ADV_DIR = 'assets/kenney/ui/adventure';

const PANEL_TILES: Record<PanelStyle, string> = {
  beige: `${TILE_DIR}/tile_0000.png`,
  brown: `${TILE_DIR}/tile_0001.png`,
  blue:  `${TILE_DIR}/tile_0002.png`,
  dark:  `${TILE_DIR}/tile_0003.png`,
};

/** Border inset for NineSliceSprite — pixels from each edge kept unscaled. */
const BORDER_INSET = 8;

const BANNER = {
  left:   `${TILE_DIR}/tile_0043.png`,
  center: `${TILE_DIR}/tile_0044.png`,
  right:  `${TILE_DIR}/tile_0045.png`,
};

const SMALL_TILE_DIR = 'assets/kenney/ui/pixel-adventure/small-tiles';
/** Native 16x16 X icon from the pixel-adventure small tile set */
const CLOSE_BTN = `${SMALL_TILE_DIR}/tile_0055.png`;

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

  /**
   * Build a complete window: NineSlice panel background + banner title bar
   * + close button.
   */
  buildWindow(style: PanelStyle, w: number, h: number): Container {
    const c = new Container();
    c.label = `window-${style}`;

    // NineSliceSprite panel — corners stay at original pixel size, center fills.
    const panelTex = Assets.get<Texture>(PANEL_TILES[style]);
    if (panelTex) {
      const panel = new NineSliceSprite({
        texture:      panelTex,
        leftWidth:    BORDER_INSET,
        topHeight:    BORDER_INSET,
        rightWidth:   BORDER_INSET,
        bottomHeight: BORDER_INSET,
        width:        w,
        height:       h,
      });
      c.addChild(panel);
    }

    const banner = this.buildBanner(w - 16);
    if (banner) {
      banner.position.set(8, 4);
      c.addChild(banner);
    }

    // Close button — native 16x16 pixel-art X icon, no stretching
    const closeTex = Assets.get<Texture>(CLOSE_BTN);
    if (closeTex) {
      const btn = new Sprite(closeTex);
      btn.anchor.set(0.5);
      btn.position.set(w - 14, 20);
      // Render at 2x native size (32x32) for visibility, keeping pixel-art crisp
      btn.scale.set(2);
      c.addChild(btn);
    }

    return c;
  }

  /**
   * Build a bare panel (no window chrome) using NineSliceSprite.
   * Returns null if the texture has not been preloaded yet.
   */
  buildPanel(style: PanelStyle, w: number, h: number): NineSliceSprite | null {
    const tex = Assets.get<Texture>(PANEL_TILES[style]);
    if (!tex) return null;
    return new NineSliceSprite({
      texture:      tex,
      leftWidth:    BORDER_INSET,
      topHeight:    BORDER_INSET,
      rightWidth:   BORDER_INSET,
      bottomHeight: BORDER_INSET,
      width:        w,
      height:       h,
    });
  }

  /**
   * Build a red banner from three tiles: fixed left/right end-caps and a
   * NineSlice center piece that stretches to fill the remaining width.
   */
  buildBanner(width: number): Container | null {
    const lTex = Assets.get<Texture>(BANNER.left);
    const cTex = Assets.get<Texture>(BANNER.center);
    const rTex = Assets.get<Texture>(BANNER.right);
    if (!lTex || !cTex || !rTex) return null;

    const c  = new Container();
    const tw = 32; // tile width of each end-cap

    const left = new Sprite(lTex);
    left.width  = tw;
    left.height = 32;
    c.addChild(left);

    // Center piece uses NineSlice so it stretches cleanly without distorting
    // the subtle pixel-art shading at its edges.
    const center = new NineSliceSprite({
      texture:      cTex,
      leftWidth:    4,
      topHeight:    4,
      rightWidth:   4,
      bottomHeight: 4,
      width:        Math.max(0, width - tw * 2),
      height:       32,
    });
    center.position.set(tw, 0);
    c.addChild(center);

    const right = new Sprite(rTex);
    right.position.set(width - tw, 0);
    right.width  = tw;
    right.height = 32;
    c.addChild(right);

    return c;
  }
}
