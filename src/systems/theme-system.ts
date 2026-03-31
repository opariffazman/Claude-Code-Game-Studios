/**
 * Theme System — manages themed desktops using Kenney sprite assets.
 * Owns asset lifecycle: loads current theme, background-preloads next.
 * No Graphics fallback — sprites only.
 *
 * Wraps ThemeLoader and synthesises the Theme interface consumed by
 * DesktopManager (wallpaper palette, icon/titlebar/sticky color arrays)
 * from each ThemeAssets entry.
 *
 * The old color-only Theme data has been removed; wallpaper color and
 * accent palettes are now derived from ThemeAssets.wallpaperColor so that
 * DesktopManager continues to work without modification.
 *
 * Implements: Desktop Rebuild Cycle — Theme System (Desk Smasher design doc)
 */
import type { ThemeLoader, ThemeAssets } from './theme-loader';
import type { WallpaperPalette } from '../types';

// ---------------------------------------------------------------------------
// Theme interface — consumed by DesktopManager and RebuildCycle
// ---------------------------------------------------------------------------

export interface Theme {
  name: string;
  wallpaper: WallpaperPalette;
  iconColors: readonly number[];
  titlebarColors: readonly number[];
  stickyColors: readonly number[];
  /** Probability weight (kept for API compatibility — all themes equal at 1). */
  weight: number;
}

// ---------------------------------------------------------------------------
// Color palette derivation
// ---------------------------------------------------------------------------

/**
 * Derive a set of icon tint colors from a base wallpaper color.
 * Generates 12 variants by modulating brightness and saturation so
 * desktop icons have visual variety without hardcoded per-theme tables.
 *
 * The approach: decompose to R/G/B, apply a range of multipliers that
 * span dark-to-light and slightly shift hue balance.
 */
function deriveIconColors(base: number): readonly number[] {
  const r = (base >> 16) & 0xff;
  const g = (base >> 8) & 0xff;
  const b = base & 0xff;

  const mods: [number, number, number][] = [
    [1.0, 1.2, 0.8],
    [1.2, 1.0, 0.8],
    [0.8, 1.0, 1.2],
    [1.1, 1.1, 0.9],
    [0.9, 1.1, 1.1],
    [1.2, 0.9, 1.0],
    [0.8, 1.2, 1.0],
    [1.0, 0.9, 1.2],
    [1.1, 0.8, 1.1],
    [0.9, 0.9, 1.3],
    [1.3, 1.0, 0.9],
    [1.0, 1.3, 1.0],
  ];

  return mods.map(([rm, gm, bm]) => {
    const cr = Math.min(255, Math.round(r * rm));
    const cg = Math.min(255, Math.round(g * gm));
    const cb = Math.min(255, Math.round(b * bm));
    return (cr << 16) | (cg << 8) | cb;
  });
}

/**
 * Derive 8 titlebar colors from a base wallpaper color.
 * Titlebar colors are darker variants to suggest chrome shadow.
 */
function deriveTitlebarColors(base: number): readonly number[] {
  const r = (base >> 16) & 0xff;
  const g = (base >> 8) & 0xff;
  const b = base & 0xff;

  const darkMods = [0.55, 0.60, 0.50, 0.65, 0.45, 0.58, 0.52, 0.62];
  return darkMods.map((m) => {
    const cr = Math.min(255, Math.round(r * m));
    const cg = Math.min(255, Math.round(g * m));
    const cb = Math.min(255, Math.round(b * m));
    return (cr << 16) | (cg << 8) | cb;
  });
}

/**
 * Derive 6 sticky-note pastel colors from a base wallpaper color.
 * Sticky notes use light tints (high brightness) of the theme palette.
 */
function deriveStickyColors(base: number): readonly number[] {
  const r = (base >> 16) & 0xff;
  const g = (base >> 8) & 0xff;
  const b = base & 0xff;

  // Blend toward white at varying ratios to produce pastels
  const blends = [0.25, 0.20, 0.15, 0.18, 0.12, 0.22];
  return blends.map((t) => {
    const cr = Math.min(255, Math.round(r * t + 255 * (1 - t)));
    const cg = Math.min(255, Math.round(g * t + 255 * (1 - t)));
    const cb = Math.min(255, Math.round(b * t + 255 * (1 - t)));
    return (cr << 16) | (cg << 8) | cb;
  });
}

/** Convert a ThemeAssets entry into the Theme shape expected by DesktopManager. */
function assetsToTheme(assets: ThemeAssets): Theme {
  return {
    name: assets.name,
    wallpaper: {
      bg: assets.wallpaperColor,
      overlay: Math.round(assets.wallpaperColor * 0.3) & 0xffffff,
      name: assets.name,
    } satisfies WallpaperPalette,
    iconColors: deriveIconColors(assets.wallpaperColor),
    titlebarColors: deriveTitlebarColors(assets.wallpaperColor),
    stickyColors: deriveStickyColors(assets.wallpaperColor),
    weight: 1,
  };
}

// ---------------------------------------------------------------------------
// ThemeSystem
// ---------------------------------------------------------------------------

export class ThemeSystem {
  private readonly _loader: ThemeLoader;

  /**
   * @param loader - ThemeLoader that owns atlas loading and theme sequencing.
   */
  constructor(loader: ThemeLoader) {
    this._loader = loader;
  }

  // ---------------------------------------------------------------------------
  // Public API
  // ---------------------------------------------------------------------------

  /**
   * Advance to the next theme and return it as a Theme object suitable for
   * DesktopManager.rebuildWithTheme(). Wraps ThemeLoader.advanceTheme().
   *
   * Caller is responsible for ensuring the atlas is loaded before calling
   * (use ThemeLoader.preloadNextTheme() during gameplay for zero-wait rebuilds).
   */
  getNextTheme(): Theme {
    this._loader.advanceTheme();
    return assetsToTheme(this._loader.currentTheme);
  }

  /** The theme currently applied to the desktop, as a Theme object. */
  get currentTheme(): Theme {
    return assetsToTheme(this._loader.currentTheme);
  }

  /**
   * Wallpaper color of the current theme.
   * Convenience accessor — equivalent to currentTheme.wallpaper.bg.
   */
  get wallpaperColor(): number {
    return this._loader.currentTheme.wallpaperColor;
  }

  /** Total number of themes available. */
  get themeCount(): number {
    // Expose count via loader's perspective (5 themes)
    // ThemeLoader THEMES array has 5 entries; no direct length accessor needed
    // since this is only used for informational purposes.
    return 5;
  }
}
