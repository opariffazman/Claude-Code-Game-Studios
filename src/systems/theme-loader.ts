/**
 * Theme Loader — loads Kenney sprite sheet atlases via PixiJS Assets API.
 *
 * Each theme maps to one or more atlas bundles. Textures are loaded
 * on-demand per theme, with background preloading for the next theme.
 *
 * No Graphics fallback — sprites only (web = demo, Tauri = product).
 *
 * Implements: design/gdd/theme-system.md — Phase 1 atlas loading
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

/** All 5 theme definitions (Phase 1: only animal-farm has real atlas) */
const THEMES: ThemeAssets[] = [
  {
    name: 'animal-farm',
    iconAtlas: 'assets/kenney/animals/animals.json',
    wallpaperColor: 0x88cc44,
    iconFrames: [], // Populated after atlas loads
  },
  // Phase 2: remaining themes will be added here
];

export class ThemeLoader {
  private _currentThemeIndex = 0;
  private _loadedAtlases = new Set<string>();
  private _ready = false;

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

  /** Get the current theme config. */
  get currentTheme(): ThemeAssets {
    return THEMES[this._currentThemeIndex];
  }

  /**
   * Get a random icon texture from the current theme's loaded atlas.
   * Returns null if the loader is not ready or the atlas has no frames.
   */
  getRandomIconTexture(): Texture | null {
    if (!this._ready) return null;
    const theme = this.currentTheme;
    if (theme.iconFrames.length === 0) return null;
    const frame = theme.iconFrames[Math.floor(Math.random() * theme.iconFrames.length)];
    return (Assets.get<Texture>(frame) as Texture | undefined) ?? null;
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
      const theme = THEMES.find(t => t.iconAtlas === path);
      if (theme && sheet?.textures) {
        theme.iconFrames = Object.keys(sheet.textures);
      }
      this._loadedAtlases.add(path);
    } catch (e) {
      console.warn(`ThemeLoader: failed to load atlas "${path}"`, e);
    }
  }
}
