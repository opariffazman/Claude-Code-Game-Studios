/**
 * Theme Loader — loads Kenney assets via PixiJS Assets API.
 *
 * animal-farm and fantasy-kingdom load individual PNGs from
 * public/assets/kenney/animals/ (30 files). The remaining themes
 * still use sprite-sheet atlases until those directories are migrated.
 *
 * No Graphics fallback — sprites only (web = demo, Tauri = product).
 *
 * Implements: design/gdd/theme-system.md — Phase 1 asset loading (all 5 themes)
 *
 * Note: fantasy-kingdom shares the animals icon set with animal-farm. In Phase 2
 * (UI packs) it will receive unique window chrome via the optional uiAtlas field.
 */
import { Assets, Texture } from 'pixi.js';

/** Per-theme asset configuration */
export interface ThemeAssets {
  name: string;
  /** Directory path for individual icon PNGs (relative to public/).
   *  Set when the theme uses individual files rather than an atlas. */
  iconDir?: string;
  /** List of PNG filenames without extension — used when iconDir is set. */
  iconFiles?: string[];
  /** Spritesheet atlas path (relative to public/).
   *  Used for themes whose assets have not been migrated to individual PNGs. */
  iconAtlas?: string;
  /** UI panel atlas path (for window chrome — Phase 2) */
  uiAtlas?: string;
  /** UI chrome sprite paths (relative to public/) */
  ui?: {
    windowPanel?: string;   // Window background panel
    titleBar?: string;      // Title bar panel
    closeButton?: string;   // Close/X button
    stickyPanel?: string;   // Sticky note panel
    notifBar?: string;      // Notification bar
  };
  /** Loaded UI textures (populated after loading) */
  uiTextures?: Record<string, Texture>;
  /** Wallpaper color */
  wallpaperColor: number;
  /** Populated after loading — texture references in shuffle order.
   *  For individual-PNG themes these come from Assets.load(urls[]).
   *  For atlas themes these come from the spritesheet .textures record. */
  iconTextures: Texture[];
  /** Frame/filename list — kept for backward-compat callers that only need .length */
  iconFrames: string[];
}

/** All 5 theme definitions */
const THEMES: ThemeAssets[] = [
  {
    name: 'animal-farm',
    iconDir: 'assets/kenney/animals',
    iconFiles: [
      'bear', 'buffalo', 'chick', 'chicken', 'cow', 'crocodile',
      'dog', 'duck', 'elephant', 'frog', 'giraffe', 'goat',
      'gorilla', 'hippo', 'horse', 'monkey', 'moose', 'narwhal',
      'owl', 'panda', 'parrot', 'penguin', 'pig', 'rabbit',
      'rhino', 'sloth', 'snake', 'walrus', 'whale', 'zebra',
    ],
    ui: {
      windowPanel: 'assets/kenney/ui/adventure/panel_brown.png',
    },
    wallpaperColor: 0x5b8c3e,  // Soft forest green — better contrast with bright animal sprites
    iconTextures: [],
    iconFrames: [],
  },
  {
    name: 'pixel-adventure',
    iconAtlas: 'assets/kenney/generic-items/generic-items.json',
    wallpaperColor: 0x6b4226,
    iconTextures: [],
    iconFrames: [],
  },
  {
    name: 'space-station',
    iconAtlas: 'assets/kenney/vehicles/vehicles.json',
    wallpaperColor: 0x1a1a3e,
    iconTextures: [],
    iconFrames: [],
  },
  {
    name: 'fantasy-kingdom',
    // Reuses animals icon set; Phase 2 will add a unique UI chrome atlas
    iconDir: 'assets/kenney/animals',
    iconFiles: [
      'bear', 'buffalo', 'chick', 'chicken', 'cow', 'crocodile',
      'dog', 'duck', 'elephant', 'frog', 'giraffe', 'goat',
      'gorilla', 'hippo', 'horse', 'monkey', 'moose', 'narwhal',
      'owl', 'panda', 'parrot', 'penguin', 'pig', 'rabbit',
      'rhino', 'sloth', 'snake', 'walrus', 'whale', 'zebra',
    ],
    wallpaperColor: 0x3d2b56,  // Purple twilight — distinct from animal-farm forest green
    iconTextures: [],
    iconFrames: [],
  },
  {
    name: 'rpg-quest',
    // Reuses generic-items atlas; Phase 2 will add a unique UI chrome atlas
    iconAtlas: 'assets/kenney/generic-items/generic-items.json',
    wallpaperColor: 0x8b4513,
    iconTextures: [],
    iconFrames: [],
  },
];

export class ThemeLoader {
  private _currentThemeIndex = 0;
  /** Tracks loaded keys — URL for individual PNGs, atlas path for atlases */
  private _loadedKeys = new Set<string>();
  private _ready = false;

  private _shuffledIndices: number[] = [];
  private _shuffleIndex = 0;

  /** Load the starting theme's assets. */
  async loadInitialTheme(): Promise<void> {
    const theme = THEMES[this._currentThemeIndex];
    await this._loadTheme(theme);
    this._ready = true;
  }

  /**
   * Background-preload the next theme (call during gameplay).
   * Non-blocking — errors are swallowed intentionally.
   */
  async preloadNextTheme(): Promise<void> {
    const nextIndex = (this._currentThemeIndex + 1) % THEMES.length;
    const next = THEMES[nextIndex];
    if (next.iconDir && next.iconFiles) {
      const key = `${next.iconDir}/*`;
      if (!this._loadedKeys.has(key)) {
        const urls = next.iconFiles.map(f => `${next.iconDir}/${f}.png`);
        Assets.backgroundLoad(urls).catch(() => {});
      }
    } else if (next.iconAtlas && !this._loadedKeys.has(next.iconAtlas)) {
      Assets.backgroundLoad(next.iconAtlas).catch(() => {});
    }
  }

  /** Advance to the next theme (call on desktop rebuild). */
  advanceTheme(): void {
    this._currentThemeIndex = (this._currentThemeIndex + 1) % THEMES.length;
  }

  /**
   * Advance to the next theme, load its assets if not already loaded, and
   * return it. Awaiting this guarantees the incoming theme's textures are
   * available before the desktop rebuilds.
   */
  async advanceAndLoad(): Promise<ThemeAssets> {
    this.advanceTheme();
    const theme = this.currentTheme;
    await this._loadTheme(theme);
    return theme;
  }

  /** Get the current theme config. */
  get currentTheme(): ThemeAssets {
    return THEMES[this._currentThemeIndex];
  }

  /**
   * Get a random icon texture from the current theme's loaded assets.
   * Returns null if the loader is not ready or the theme has no textures.
   *
   * @deprecated Use getNextIconTexture() to avoid duplicate icons per desktop.
   */
  getRandomIconTexture(): Texture | null {
    if (!this._ready) return null;
    const theme = this.currentTheme;
    if (theme.iconTextures.length === 0) return null;
    return theme.iconTextures[Math.floor(Math.random() * theme.iconTextures.length)] ?? null;
  }

  /**
   * Get the next unique icon texture using a shuffle-based approach so no
   * duplicate icons appear within a single desktop build.
   * Reshuffles the full texture list when exhausted.
   * Returns null if the loader is not ready or the theme has no textures.
   */
  getNextIconTexture(): Texture | null {
    if (!this._ready) return null;
    const theme = this.currentTheme;
    if (theme.iconTextures.length === 0) return null;

    // Reshuffle when exhausted
    if (this._shuffleIndex >= this._shuffledIndices.length) {
      // Build index array and Fisher-Yates shuffle
      this._shuffledIndices = Array.from({ length: theme.iconTextures.length }, (_, i) => i);
      for (let i = this._shuffledIndices.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [this._shuffledIndices[i], this._shuffledIndices[j]] = [
          this._shuffledIndices[j], this._shuffledIndices[i],
        ];
      }
      this._shuffleIndex = 0;
    }

    return theme.iconTextures[this._shuffledIndices[this._shuffleIndex++]] ?? null;
  }

  /** Reset the shuffle state for a new desktop build — call before buildIcons(). */
  resetShuffle(): void {
    this._shuffleIndex = 0;
    this._shuffledIndices = [];
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

  /**
   * Get a loaded UI texture by key (e.g. 'windowPanel').
   * Returns null if the current theme has no UI textures or the key is absent.
   */
  getUITexture(key: string): Texture | null {
    return this.currentTheme.uiTextures?.[key] ?? null;
  }

  /** Dispatch to individual-PNG or atlas loader based on theme config. */
  private async _loadTheme(theme: ThemeAssets): Promise<void> {
    if (theme.iconDir && theme.iconFiles) {
      await this._loadThemeIcons(theme);
    } else if (theme.iconAtlas) {
      await this._loadAtlas(theme);
    }

    // Load UI chrome sprites if the theme declares any.
    if (theme.ui) {
      const uiPaths = Object.entries(theme.ui).filter(([, v]) => v) as [string, string][];
      const urls = uiPaths.map(([, path]) => path);
      if (urls.length > 0) {
        try {
          const loaded: Record<string, Texture> = await Assets.load(urls);
          theme.uiTextures = {};
          for (const [key, path] of uiPaths) {
            theme.uiTextures[key] = loaded[path] ?? (Assets.get(path) as Texture);
          }
        } catch (e) {
          console.warn(`ThemeLoader: failed to load UI chrome sprites for "${theme.name}"`, e);
        }
      }
    }
  }

  /**
   * Load individual PNGs for themes that use iconDir/iconFiles.
   * PixiJS v8: Assets.load(string[]) returns Promise<Record<string, Texture>>
   * keyed by the URL strings passed in.
   */
  private async _loadThemeIcons(theme: ThemeAssets): Promise<void> {
    if (!theme.iconDir || !theme.iconFiles) return;
    const key = `${theme.iconDir}/*`;
    if (this._loadedKeys.has(key)) return;

    const urls = theme.iconFiles.map(f => `${theme.iconDir}/${f}.png`);
    try {
      // Assets.load with an array returns Record<url, Texture> in PixiJS v8
      const loaded: Record<string, Texture> = await Assets.load(urls);

      // Populate all themes sharing the same iconDir (e.g. fantasy-kingdom
      // shares the animals directory with animal-farm) so they don't re-fetch.
      const sharingThemes = THEMES.filter(
        t => t.iconDir === theme.iconDir && t.iconFiles,
      );
      for (const t of sharingThemes) {
        const tUrls = t.iconFiles!.map(f => `${t.iconDir}/${f}.png`);
        t.iconTextures = tUrls.map(url => loaded[url] ?? Assets.get(url));
        t.iconFrames = t.iconFiles!;
      }

      this._loadedKeys.add(key);
    } catch (e) {
      console.warn(`ThemeLoader: failed to load icons from "${theme.iconDir}"`, e);
    }
  }

  /**
   * Load a spritesheet atlas for themes that still use iconAtlas.
   * After loading, iconTextures and iconFrames are populated on all themes
   * sharing the same atlas path (e.g. rpg-quest shares generic-items with
   * pixel-adventure).
   */
  private async _loadAtlas(theme: ThemeAssets): Promise<void> {
    if (!theme.iconAtlas) return;
    const path = theme.iconAtlas;
    if (this._loadedKeys.has(path)) return;
    try {
      // PixiJS v8: Assets.load() on a .json spritesheet parses the atlas and
      // registers all frame textures so Assets.get('frameName') works after this.
      const sheet = await Assets.load<{ textures?: Record<string, Texture> }>(path);
      const sharingThemes = THEMES.filter(t => t.iconAtlas === path);
      if (sheet?.textures) {
        const frames = Object.keys(sheet.textures);
        const textures = Object.values(sheet.textures);
        for (const t of sharingThemes) {
          t.iconFrames = frames;
          t.iconTextures = textures;
        }
      }
      this._loadedKeys.add(path);
    } catch (e) {
      console.warn(`ThemeLoader: failed to load atlas "${path}"`, e);
    }
  }
}
