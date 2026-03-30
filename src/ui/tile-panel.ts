/**
 * Tile Panel Builder — uses NineSliceSprite for proper pixel-art panel scaling.
 *
 * Panel tiles (tile_0000–tile_0003) are 32×32 with ~4px visible borders.
 * BORDER_INSET of 8px gives the nine-slice room to keep those borders crisp.
 * Close button is the adventure pack's standalone button_red_close.png.
 *
 * Adventure panels (animal-farm theme): uses Kenney adventure pack 64×64 panels
 * with ~8px border insets. Grid-paper interior is inset from the panel edges.
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

/** Adventure pack panel paths keyed by theme name. */
const ADV_PANELS: Record<string, string> = {
  'animal-farm': 'assets/kenney/ui/adventure/panel_brown_corners_b.png',
};

const ADV_GRID_PAPER = 'assets/kenney/ui/adventure/panel_grid_paper.png';
const ADV_TASKBAR    = 'assets/kenney/ui/adventure/panel_brown_dark.png';
const ADV_ROUND_BTN  = 'assets/kenney/ui/adventure/round_brown.png';

/** Border inset for NineSliceSprite — pixels from each edge kept unscaled. */
const BORDER_INSET = 8;

/** Adventure pack close button — standalone sprite, render at native size. */
const CLOSE_BTN = 'assets/kenney/ui/adventure/close_red.png';

export class TilePanelBuilder {
  private _ready = false;

  async preload(): Promise<void> {
    await Assets.load([
      ...Object.values(PANEL_TILES),
      ...Object.values(ADV_PANELS),
      ADV_GRID_PAPER,
      ADV_TASKBAR,
      ADV_ROUND_BTN,
      CLOSE_BTN,
    ]);
    this._ready = true;
  }

  get isReady(): boolean { return this._ready; }

  /**
   * Build a window: NineSlice panel + optional grid-paper interior + close button.
   *
   * When theme has a matching adventure panel (e.g. 'animal-farm'), the adventure
   * panel texture is used instead of pixel tiles. A grid-paper inset is then
   * added inside the window to give it a notebook-paper interior.
   *
   * @param style - PanelStyle for pixel-tile fallback.
   * @param w     - Window width in px.
   * @param h     - Window height in px.
   * @param theme - Optional theme name to select adventure panel.
   */
  buildWindow(style: PanelStyle, w: number, h: number, theme?: string): Container {
    const c = new Container();
    c.label = `window-${style}`;

    // Select panel texture: adventure pack takes priority over pixel tiles.
    const panelPath = (theme && ADV_PANELS[theme]) ? ADV_PANELS[theme] : PANEL_TILES[style];
    const panelTex = Assets.get<Texture>(panelPath);
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

    // Grid-paper interior inset — only for adventure-panel themes.
    if (theme && ADV_PANELS[theme]) {
      const gridTex = Assets.get<Texture>(ADV_GRID_PAPER);
      if (gridTex) {
        const grid = new NineSliceSprite({
          texture:      gridTex,
          leftWidth:    BORDER_INSET,
          topHeight:    BORDER_INSET,
          rightWidth:   BORDER_INSET,
          bottomHeight: BORDER_INSET,
          width:        w - 16,
          height:       h - 40,  // inset from panel edges, below close button row
        });
        grid.position.set(8, 32);
        c.addChild(grid);
      }
    }

    // Close button — native size, top-right corner.
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

  /**
   * Build a taskbar background using the adventure dark panel when loaded,
   * or return null to signal the caller should fall back to Graphics.
   *
   * @param w - Full bar width (typically screenW + 500 for overflow).
   * @param h - Full bar height (taskbarH + 200 for overflow).
   */
  buildTaskbarBg(w: number, h: number): NineSliceSprite | null {
    const tex = Assets.get<Texture>(ADV_TASKBAR);
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
   * Build a round start-button sprite using round_brown, or null if not loaded.
   * Caller positions and sizes it as needed.
   */
  buildStartButton(): Sprite | null {
    const tex = Assets.get<Texture>(ADV_ROUND_BTN);
    if (!tex) return null;
    return new Sprite(tex);
  }

  /**
   * Build a grid-paper sticky background using NineSliceSprite.
   * Returns null if the texture is not yet loaded.
   *
   * @param w - Sticky width in px.
   * @param h - Sticky height in px.
   */
  buildStickyBg(w: number, h: number): NineSliceSprite | null {
    const tex = Assets.get<Texture>(ADV_GRID_PAPER);
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
