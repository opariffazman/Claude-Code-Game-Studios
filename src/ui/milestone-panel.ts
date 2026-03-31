/**
 * MilestonePanel — stacks horizontal banner entries for session milestones.
 *
 * Lives on uiLayer as a simple display panel (NOT a functional window).
 * Anchored to the top-right of the screen. Oldest entry is evicted when the
 * panel exceeds MAX_ENTRIES so the list never overflows.
 *
 * Implements: desk-smasher-7jg — milestone entries persist visibly in the
 * top-right area as stacked adventure banners.
 */
import { Assets, Container, Sprite, Text, TextStyle, Texture } from 'pixi.js';

const MAX_ENTRIES = 5;
const BANNER_W = 220;
const BANNER_H = 40;
const BANNER_GAP = 6;

/**
 * Banner texture path — must match the alias registered by TilePanelBuilder.preload().
 * TilePanelBuilder uses SVG_DIR = 'assets/sprites/ui/adventure/Vector' (tile-panel.ts:28).
 */
const BANNER_PATH = 'assets/sprites/ui/adventure/Vector/banner_modern.svg';

export class MilestonePanel {
  private readonly _container: Container;
  private readonly _entries: Container[] = [];

  /**
   * @param parent  - Container to attach panel to (typically the UI layer).
   * @param screenW - Current canvas width in pixels, used to anchor to right edge.
   */
  constructor(parent: Container, screenW: number) {
    this._container = new Container();
    this._container.label = 'milestone-panel';
    this._container.position.set(screenW - BANNER_W - 15, 15);
    parent.addChild(this._container);
  }

  /**
   * Add a milestone entry banner. If the panel is full (MAX_ENTRIES), the
   * oldest entry is removed before the new one is appended.
   *
   * @param label - Human-readable milestone text (e.g. "10 Animals Smashed!").
   */
  addEntry(label: string): void {
    const entry = new Container();

    // Adventure banner background — uses the preloaded banner_modern SVG sprite.
    // Falls back gracefully (transparent bg) if the texture is not yet loaded.
    const bannerTex = Assets.get<Texture>(BANNER_PATH);
    if (bannerTex) {
      const bg = new Sprite(bannerTex);
      bg.width = BANNER_W;
      bg.height = BANNER_H;
      entry.addChild(bg);
    }

    const style = new TextStyle({
      fontSize: 12,
      fill: 0xffffff,
      fontFamily: 'sans-serif',
      fontWeight: 'bold',
    });
    const text = new Text({ text: `\u2605 ${label}`, style });
    text.anchor.set(0.5);
    text.position.set(BANNER_W / 2, BANNER_H / 2);
    entry.addChild(text);

    this._entries.push(entry);

    // Evict oldest entry if over the limit
    if (this._entries.length > MAX_ENTRIES) {
      const oldest = this._entries.shift()!;
      oldest.destroy({ children: true });
    }

    // Reflow all entries so positions are contiguous (no gaps after eviction)
    for (let i = 0; i < this._entries.length; i++) {
      this._entries[i].position.set(0, i * (BANNER_H + BANNER_GAP));
    }

    this._container.addChild(entry);
  }
}
