/**
 * Theme Loader — loads Kenney sprite sheet atlases via PixiJS Assets API.
 *
 * Each theme maps to one or more atlas bundles. Textures are loaded
 * on-demand per theme, with background preloading for the next theme.
 *
 * No Graphics fallback — sprites only (web = demo, Tauri = product).
 *
 * Implements: design/gdd/theme-system.md — Phase 1 atlas loading (all 5 themes)
 *
 * Note: fantasy-kingdom and rpg-quest share atlases with animal-farm and
 * pixel-adventure. In Phase 2 (UI packs) they will receive unique window chrome
 * via the optional uiAtlas field.
 */
import { Assets, Texture } from 'pixi.js';

/** Per-theme asset configuration */
export interface ThemeAssets {
  name: string;
  /** Icon atlas path (relative to public/) */
  iconAtlas: string;
  /** UI panel atlas path (for window chrome — Phase 2) */
  uiAtlas?: string;
  /** Wallpaper color */
  wallpaperColor: number;
  /** List of texture frame names available in this theme's icon atlas */
  iconFrames: string[];
}

/** All 5 theme definitions */
const THEMES: ThemeAssets[] = [
  {
    name: 'animal-farm',
    iconAtlas: 'assets/kenney/animals/animals.json',
    wallpaperColor: 0x88cc44,
    iconFrames: [],
  },
  {
    name: 'pixel-adventure',
    iconAtlas: 'assets/kenney/generic-items/generic-items.json',
    wallpaperColor: 0x6b4226,
    iconFrames: [],
  },
  {
    name: 'space-station',
    iconAtlas: 'assets/kenney/vehicles/vehicles.json',
    wallpaperColor: 0x1a1a3e,
    iconFrames: [],
  },
  {
    name: 'fantasy-kingdom',
    // Reuses animals atlas; Phase 2 will add a unique UI chrome atlas
    iconAtlas: 'assets/kenney/animals/animals.json',
    wallpaperColor: 0x2d5a1e,
    iconFrames: [],
  },
  {
    name: 'rpg-quest',
    // Reuses generic-items atlas; Phase 2 will add a unique UI chrome atlas
    iconAtlas: 'assets/kenney/generic-items/generic-items.json',
    wallpaperColor: 0x8b4513,
    iconFrames: [],
  },
];

export class ThemeLoader {
  private _currentThemeIndex = 0;
  private _loadedAtlases = new Set<string>();
  private _ready = false;

  private _shuffledFrames: string[] = [];
  private _shuffleIndex = 0;

  /** Load the starting theme's atlas. */
  async loadInitialTheme(): Promise<void> {
    const theme = THEMES[this._currentThemeIndex];
    await this._loadAtlas(theme.iconAtlas);
    this._ready = true;
  }

  /**
   * Background-preload the next theme (call during gameplay).
   * Non-blocking — errors are swallowed intentionally.
   */
  async preloadNextTheme(): Promise<void> {
    const nextIndex = (this._currentThemeIndex + 1) % THEMES.length;
    const next = THEMES[nextIndex];
    if (!this._loadedAtlases.has(next.iconAtlas)) {
      // Background load — non-blocking
      Assets.backgroundLoad(next.iconAtlas).catch(() => {});
    }
  }

  /** Advance to the next theme (call on desktop rebuild). */
  advanceTheme(): void {
    this._currentThemeIndex = (this._currentThemeIndex + 1) % THEMES.length;
  }

  /**
   * Advance to the next theme, load its atlas if not already loaded, and
   * return it. Awaiting this guarantees the incoming theme's textures are
   * available before the desktop rebuilds.
   */
  async advanceAndLoad(): Promise<ThemeAssets> {
    this.advanceTheme();
    const theme = this.currentTheme;
    await this._loadAtlas(theme.iconAtlas);
    return theme;
  }

  /** Get the current theme config. */
  get currentTheme(): ThemeAssets {
    return THEMES[this._currentThemeIndex];
  }

  /**
   * Get a random icon texture from the current theme's loaded atlas.
   * Returns null if the loader is not ready or the atlas has no frames.
   *
   * @deprecated Use getNextIconTexture() to avoid duplicate icons per desktop.
   */
  getRandomIconTexture(): Texture | null {
    if (!this._ready) return null;
    const theme = this.currentTheme;
    if (theme.iconFrames.length === 0) return null;
    const frame = theme.iconFrames[Math.floor(Math.random() * theme.iconFrames.length)];
    return (Assets.get<Texture>(frame) as Texture | undefined) ?? null;
  }

  /**
   * Get the next unique icon texture using a shuffle-based approach so no
   * duplicate frames appear within a single desktop build.
   * Reshuffles the full frame list when exhausted.
   * Returns null if the loader is not ready or the atlas has no frames.
   */
  getNextIconTexture(): Texture | null {
    if (!this._ready) return null;
    const theme = this.currentTheme;
    if (theme.iconFrames.length === 0) return null;

    // Reshuffle when exhausted
    if (this._shuffleIndex >= this._shuffledFrames.length) {
      this._shuffledFrames = [...theme.iconFrames];
      // Fisher-Yates shuffle
      for (let i = this._shuffledFrames.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [this._shuffledFrames[i], this._shuffledFrames[j]] = [this._shuffledFrames[j], this._shuffledFrames[i]];
      }
      this._shuffleIndex = 0;
    }

    const frame = this._shuffledFrames[this._shuffleIndex++];
    return Assets.get(frame) ?? null;
  }

  /** Reset the shuffle state for a new desktop build — call before buildIcons(). */
  resetShuffle(): void {
    this._shuffleIndex = 0;
    this._shuffledFrames = [];
  }

  /**
   * Get a specific named texture from any loaded atlas.
   * Returns null if the frame is not found.
   */
  getTexture(name: string): Texture | null {
    return (Assets.get<Texture>(name) as Texture | undefined) ?? null;
  }

  /** True once loadInitialTheme() has resolved successfully. */
  get isReady(): boolean {
    return this._ready;
  }

  private async _loadAtlas(path: string): Promise<void> {
    if (this._loadedAtlases.has(path)) return;
    try {
      // PixiJS v8: Assets.load() on a .json spritesheet parses the atlas and
      // registers all frame textures so Assets.get('frameName') works after this.
      const sheet = await Assets.load<{ textures?: Record<string, Texture> }>(path);
      // Update iconFrames for ALL themes sharing this atlas path so that
      // fantasy-kingdom / rpg-quest (which reuse animals / generic-items) also
      // get their frame list populated without a second network request.
      const sharingThemes = THEMES.filter(t => t.iconAtlas === path);
      if (sheet?.textures) {
        const frames = Object.keys(sheet.textures);
        for (const t of sharingThemes) {
          t.iconFrames = frames;
        }
      }
      this._loadedAtlases.add(path);
    } catch (e) {
      console.warn(`ThemeLoader: failed to load atlas "${path}"`, e);
    }
  }
}
