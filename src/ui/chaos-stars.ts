/**
 * ChaosStars — GTA-style wanted level indicator in the taskbar.
 * 5 stars that light up yellow as chaos meter increases.
 *
 * Implements: desk-smasher-rq8 — chaos wanted stars in taskbar tray area.
 *
 * Chaos level → active stars mapping:
 *   Level 0: 0 stars (all grey)
 *   Level 1: 2 stars
 *   Level 2: 3 stars
 *   Level 3: 5 stars (max chaos)
 */
import { Assets, Container, Sprite, Texture } from 'pixi.js';
import type { ChaosLevel } from '../types';

const SVG_DIR = 'assets/kenney/ui/adventure/svg';
const STAR_ACTIVE = `${SVG_DIR}/minimap_icon_star_yellow.svg`;
const STAR_INACTIVE = `${SVG_DIR}/minimap_icon_star_white.svg`;

const STAR_COUNT = 5;
const STAR_SIZE = 18;
const STAR_SPACING = 4;

/** Maps chaos level to number of active (yellow) stars. */
const LEVEL_TO_STARS: Record<ChaosLevel, number> = {
  0: 0,
  1: 2,
  2: 3,
  3: 5,
};

export class ChaosStars {
  private readonly _container: Container;
  private _stars: Sprite[] = [];
  private _activeTexture: Texture | null = null;
  private _inactiveTexture: Texture | null = null;
  private _ready = false;

  constructor() {
    this._container = new Container();
    this._container.label = 'chaos-stars';
  }

  /** Preload both star SVG textures at high resolution. */
  async preload(): Promise<void> {
    Assets.add({ alias: STAR_ACTIVE, src: STAR_ACTIVE, data: { resolution: 4 } });
    Assets.add({ alias: STAR_INACTIVE, src: STAR_INACTIVE, data: { resolution: 4 } });
    await Assets.load([STAR_ACTIVE, STAR_INACTIVE]);
    this._activeTexture = Assets.get<Texture>(STAR_ACTIVE) ?? null;
    this._inactiveTexture = Assets.get<Texture>(STAR_INACTIVE) ?? null;
  }

  /**
   * Build the star sprites inside the given taskbar container at the specified position.
   * Call this after every desktop build/rebuild.
   *
   * @param taskbarContainer - The taskbar Container to attach stars to.
   * @param x - Left edge of the star row in taskbar-local coordinates.
   * @param y - Top edge of the star row in taskbar-local coordinates.
   */
  build(taskbarContainer: Container, x: number, y: number): void {
    this._container.removeChildren();
    this._stars = [];

    if (!this._activeTexture || !this._inactiveTexture) return;

    taskbarContainer.addChild(this._container);

    for (let i = 0; i < STAR_COUNT; i++) {
      const star = new Sprite(this._inactiveTexture);
      star.width = STAR_SIZE;
      star.height = STAR_SIZE;
      star.position.set(x + i * (STAR_SIZE + STAR_SPACING), y);
      this._container.addChild(star);
      this._stars.push(star);
    }
    this._ready = true;
  }

  /**
   * Update star textures to reflect the current chaos level.
   * Call once per frame from the game loop.
   *
   * @param level - Current chaos level (0–3).
   */
  update(level: ChaosLevel): void {
    if (!this._ready || !this._activeTexture || !this._inactiveTexture) return;
    const activeCount = LEVEL_TO_STARS[level] ?? 0;
    for (let i = 0; i < this._stars.length; i++) {
      this._stars[i].texture = i < activeCount ? this._activeTexture : this._inactiveTexture;
    }
  }

  /** True once textures are loaded and build() has been called successfully. */
  get isReady(): boolean {
    return this._ready;
  }
}
