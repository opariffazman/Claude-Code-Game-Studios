/**
 * Tile Panel Builder — uses NineSliceSprite for proper pixel-art panel scaling.
 *
 * Panel tiles (tile_0000–tile_0003) are 32×32 with ~4px visible borders.
 * BORDER_INSET of 8px gives the nine-slice room to keep those borders crisp.
 *
 * Adventure panels (animal-farm theme): uses Kenney adventure pack SVGs loaded
 * at resolution 4 for crisp rendering on any display. SVG viewBox is 64×64;
 * rasterised texture is 256×256. Border is ~4px in viewBox = 16px in texture.
 * SVG_BORDER_INSET = 16 keeps adventure panel borders pixel-perfect.
 *
 * Implements: desk-smasher-eqh — damaged panel variants for destruction progression.
 * Implements: desk-smasher-pos — window panels filled with adventure pack content widgets.
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

const SVG_DIR = 'assets/sprites/ui/adventure/Vector';

/** Adventure pack panel paths keyed by theme name. */
const ADV_PANELS: Record<string, string> = {
  'animal-farm': `${SVG_DIR}/panel_brown_corners_b.svg`,
};

const ADV_GRID_PAPER = `${SVG_DIR}/panel_grid_paper.svg`;
const ADV_TASKBAR    = `${SVG_DIR}/panel_brown_dark.svg`;
const ADV_ROUND_BTN  = `${SVG_DIR}/round_brown.svg`;

/** Border inset for pixel-tile NineSliceSprite — pixels from each edge kept unscaled. */
const BORDER_INSET = 8;

/**
 * Border inset for adventure SVG NineSliceSprite.
 * SVG viewBox is 64px; loaded at resolution 4 → 256px texture.
 * Border is ~4px in viewBox → 16px in the rasterised texture.
 */
const SVG_BORDER_INSET = 16;

/** Adventure pack close button — standalone sprite, render at native size. */
const CLOSE_BTN = `${SVG_DIR}/button_red_close.svg`;

/** Damaged panel variant — swapped in when a window drops below 50% health.
 *  Implements: desk-smasher-eqh — damaged panel variants for destruction progression. */
export const ADV_PANEL_DAMAGED = `${SVG_DIR}/panel_brown_damaged.svg`;

/** Adventure progress bar sprites — background track, fill bars, and border frames.
 *  Preloaded here so HealthDashboard can reuse the textures without extra loading. */
const ADV_PROGRESS_BG           = `${SVG_DIR}/progress_transparent.svg`;
const ADV_PROGRESS_BORDER_GREEN = `${SVG_DIR}/progress_green_border.svg`;
const ADV_PROGRESS_BORDER_RED   = `${SVG_DIR}/progress_red_border.svg`;
const ADV_PROGRESS_BORDER_BLUE  = `${SVG_DIR}/progress_blue_border.svg`;

/** Adventure banner sprites — notification banners and decorative hanging banner. */
export const ADV_BANNER_MODERN  = `${SVG_DIR}/banner_modern.svg`;
export const ADV_BANNER_HANGING = `${SVG_DIR}/banner_hanging.svg`;

/** Adventure checkbox sprites — SVG versions from the Vector set. */
export const ADV_CHECKBOX_CHECKED = `${SVG_DIR}/checkbox_brown_checked.svg`;
export const ADV_CHECKBOX_EMPTY   = `${SVG_DIR}/checkbox_brown_empty.svg`;


export class TilePanelBuilder {
  private _ready = false;

  async preload(): Promise<void> {
    const svgPaths = [
      ...Object.values(ADV_PANELS),
      ADV_GRID_PAPER,
      ADV_TASKBAR,
      ADV_ROUND_BTN,
      CLOSE_BTN,
      ADV_PROGRESS_BG,
      ADV_PROGRESS_BORDER_GREEN,
      ADV_PROGRESS_BORDER_RED,
      ADV_PROGRESS_BORDER_BLUE,
      ADV_PANEL_DAMAGED,
      ADV_BANNER_MODERN,
      ADV_BANNER_HANGING,
    ];

    // De-duplicate: some widget paths overlap with named constants above.
    const uniqueSvgPaths = [...new Set(svgPaths)];

    // Register each SVG with a resolution of 4 so PixiJS rasterises at 256×256
    // (64px viewBox × 4). This gives crisp rendering at any display size without
    // nearest-neighbour filtering.
    for (const path of uniqueSvgPaths) {
      Assets.add({ alias: path, src: path, data: { resolution: 4 } });
    }

    // Load PNG pixel tiles normally (nearest-neighbour handles crispness for them).
    // Load all SVGs by alias — the resolution hint was registered above.
    await Assets.load([
      ...Object.values(PANEL_TILES),
      ...uniqueSvgPaths,
    ]);

    this._ready = true;
  }

  get isReady(): boolean { return this._ready; }

  /**
   * Build a window: NineSlice panel + optional grid-paper interior + close button.
   *
   * When theme has a matching adventure panel (e.g. 'animal-farm'), the adventure
   * SVG panel texture is used instead of pixel tiles. A grid-paper inset is then
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

    const isAdventure = theme != null && ADV_PANELS[theme] != null;

    // Select panel texture: adventure pack takes priority over pixel tiles.
    const panelPath = isAdventure ? ADV_PANELS[theme!] : PANEL_TILES[style];
    const inset = isAdventure ? SVG_BORDER_INSET : BORDER_INSET;
    const panelTex = Assets.get<Texture>(panelPath);
    if (panelTex) {
      if (!isAdventure) {
        panelTex.source.scaleMode = 'nearest'; // Crisp pixel art, no bilinear blur
      }
      const panel = new NineSliceSprite({
        texture:      panelTex,
        leftWidth:    inset,
        topHeight:    inset,
        rightWidth:   inset,
        bottomHeight: inset,
        width:        w,
        height:       h,
      });
      c.addChild(panel);
    }

    // Title bar strip — dark brown bar just below the top border, adventure themes only.
    if (isAdventure) {
      const titleBarTex = Assets.get<Texture>(ADV_TASKBAR);
      if (titleBarTex) {
        const titleBar = new NineSliceSprite({
          texture:      titleBarTex,
          leftWidth:    SVG_BORDER_INSET,
          topHeight:    SVG_BORDER_INSET,
          rightWidth:   SVG_BORDER_INSET,
          bottomHeight: SVG_BORDER_INSET,
          width:        w - 8,
          height:       28,
        });
        titleBar.position.set(4, 4);
        c.addChild(titleBar);
      }
    }

    // Health bar — vertical progress bar on the right edge of adventure windows.
    // Uses NineSliceSprite to stretch only the middle of each capsule SVG, keeping
    // the rounded top/bottom caps (~8px each) pixel-perfect at any window height.
    // Fill is bottom-aligned: height shrinks and Y is pushed down as health drops.
    // Implements: desk-smasher-6fa — live health bar on window panels.
    // Fixes: desk-smasher-b2m — NineSlice capsule bars instead of blob-scaled sprites.
    // Per-window health bars removed — replaced by centralized HealthDashboard (desk-smasher-kyx)

    // Close button — scaled proportionally to window size, top-right corner.
    const closeTex = Assets.get<Texture>(CLOSE_BTN);
    if (closeTex) {
      // SVG rasterised at 4x — no nearest-neighbour needed
      const btn = new Sprite(closeTex);
      btn.anchor.set(1, 0);
      // Scale close button proportionally to window size
      const btnScale = Math.min(w, h) / 600; // was /300 — now 50% smaller
      const clampedScale = Math.max(0.15, Math.min(0.5, btnScale));
      btn.scale.set(clampedScale);
      btn.position.set(w - 4, 4);
      c.addChild(btn);
    }

    return c;
  }

  /** Build a bare panel (no close button) using NineSliceSprite. */
  buildPanel(style: PanelStyle, w: number, h: number): NineSliceSprite | null {
    const tex = Assets.get<Texture>(PANEL_TILES[style]);
    if (!tex) return null;
    tex.source.scaleMode = 'nearest'; // Crisp pixel art, no bilinear blur
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
    // SVG rasterised at 4x — no nearest-neighbour needed
    return new NineSliceSprite({
      texture:      tex,
      leftWidth:    SVG_BORDER_INSET,
      topHeight:    SVG_BORDER_INSET,
      rightWidth:   SVG_BORDER_INSET,
      bottomHeight: SVG_BORDER_INSET,
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
    // SVG rasterised at 4x — no nearest-neighbour needed
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
    // SVG rasterised at 4x — no nearest-neighbour needed
    return new NineSliceSprite({
      texture:      tex,
      leftWidth:    SVG_BORDER_INSET,
      topHeight:    SVG_BORDER_INSET,
      rightWidth:   SVG_BORDER_INSET,
      bottomHeight: SVG_BORDER_INSET,
      width:        w,
      height:       h,
    });
  }

}
