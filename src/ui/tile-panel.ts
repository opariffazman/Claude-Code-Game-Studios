/**
 * Tile Panel Builder — uses NineSliceSprite for proper pixel-art panel scaling.
 *
 * Panel tiles (tile_0000–tile_0003) are 32×32 with ~4px visible borders.
 * BORDER_INSET of 8px gives the nine-slice room to keep those borders crisp.
 * Close button is the adventure pack's standalone button_red_close.png.
 */
import { Assets, Container, NineSliceSprite, Sprite, Texture } from 'pixi.js';

export type PanelStyle = 'beige' | 'brown' | 'blue' | 'dark';

const TILE_DIR = 'assets/kenney/ui/pixel-adventure/tiles';

const PANEL_TILES: Record<PanelStyle, string> = {
  beige: `${TILE_DIR}/tile_0000.png`,
  brown: `${TILE_DIR}/tile_0001.png`,
  blue:  `${TILE_DIR}/tile_0002.png`,
  dark:  `${TILE_DIR}/tile_0003.png`,
};

/** Border inset for NineSliceSprite — pixels from each edge kept unscaled. */
const BORDER_INSET = 8;

/** Adventure pack close button — standalone sprite, render at native size. */
const CLOSE_BTN = 'assets/kenney/ui/adventure/close_red.png';

export class TilePanelBuilder {
  private _ready = false;

  async preload(): Promise<void> {
    await Assets.load([
      ...Object.values(PANEL_TILES),
      CLOSE_BTN,
    ]);
    this._ready = true;
  }

  get isReady(): boolean { return this._ready; }

  /** Build a window: NineSlice panel + close button. No banner. */
  buildWindow(style: PanelStyle, w: number, h: number): Container {
    const c = new Container();
    c.label = `window-${style}`;

    // NineSliceSprite panel — borders preserved, center stretches
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

    // Close button — native size, top-right corner
    const closeTex = Assets.get<Texture>(CLOSE_BTN);
    if (closeTex) {
      const btn = new Sprite(closeTex);
      btn.anchor.set(1, 0);
      btn.position.set(w - 4, 4);
      c.addChild(btn);
    }

    return c;
  }

  /** Build a bare panel (no close button) using NineSliceSprite. */
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
}
