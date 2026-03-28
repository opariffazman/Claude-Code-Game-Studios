/**
 * Theme System — manages desktop visual themes and ensures variety between rebuilds.
 * Each theme defines a wallpaper palette, icon color set, titlebar colors, and sticky colors.
 * Tracks last-used theme to prevent consecutive repeats.
 *
 * Implements: Desktop Rebuild Cycle — Theme System (Desk Smasher design doc)
 */
import type { WallpaperPalette } from '../types';

// ---------------------------------------------------------------------------
// Theme interface
// ---------------------------------------------------------------------------

export interface Theme {
  name: string;
  wallpaper: WallpaperPalette;
  iconColors: readonly number[];
  titlebarColors: readonly number[];
  stickyColors: readonly number[];
  /** Probability weight (higher = more likely to be selected). */
  weight: number;
}

// ---------------------------------------------------------------------------
// Theme data
// ---------------------------------------------------------------------------

/**
 * Classic Blue — default Windows-like blue desktop.
 * Familiar, neutral starting state.
 */
const THEME_CLASSIC_BLUE: Theme = {
  name: 'Classic Blue',
  wallpaper: { bg: 0x2b5797, overlay: 0x0a1628, name: 'Classic Blue' },
  iconColors: [
    0x4488ff, 0x66aaff, 0x2266cc, 0x88bbff, 0x3377dd, 0x99ccff,
    0x5599ee, 0x1155bb, 0x77aaee, 0x4499ff, 0x2288ee, 0xaaddff,
  ],
  titlebarColors: [
    0x1a4a9e, 0x2255aa, 0x336699, 0x1155cc, 0x2244bb, 0x0033aa, 0x3366dd, 0x224499,
  ],
  stickyColors: [
    0xddeeff, 0xbbddff, 0x99ccff, 0xaaccff, 0x88bbee, 0xcceeff,
  ],
  weight: 1,
};

/**
 * Forest Green — nature-inspired desktop with greens and earthy browns.
 */
const THEME_FOREST_GREEN: Theme = {
  name: 'Forest Green',
  wallpaper: { bg: 0x1a6b3c, overlay: 0x0a2818, name: 'Forest Green' },
  iconColors: [
    0x44cc44, 0x66dd44, 0x33aa22, 0x88ee44, 0x55bb33, 0x99dd66,
    0x22aa44, 0x44bb55, 0x77cc33, 0xaadd55, 0x33bb44, 0x66cc55,
  ],
  titlebarColors: [
    0x1a6b3c, 0x336644, 0x22883a, 0x445522, 0x338833, 0x227744, 0x445544, 0x339944,
  ],
  stickyColors: [
    0xddffcc, 0xcceeaa, 0xaaddbb, 0xbbeecc, 0x99ddbb, 0xccffdd,
  ],
  weight: 1,
};

/**
 * Sunset Orange — warm desktop with vivid oranges, reds, and amber tones.
 */
const THEME_SUNSET_ORANGE: Theme = {
  name: 'Sunset Orange',
  wallpaper: { bg: 0xcc5533, overlay: 0x401510, name: 'Sunset Orange' },
  iconColors: [
    0xff6644, 0xff8822, 0xee4422, 0xffaa44, 0xdd5533, 0xffcc66,
    0xee6633, 0xff5511, 0xffbb55, 0xdd4422, 0xff7733, 0xffdd88,
  ],
  titlebarColors: [
    0xcc4422, 0xdd5533, 0xbb3311, 0xee6644, 0xaa3322, 0xcc5544, 0xdd4433, 0xbb4422,
  ],
  stickyColors: [
    0xffeedd, 0xffddcc, 0xffccbb, 0xffeecc, 0xffd0aa, 0xffe8cc,
  ],
  weight: 1,
};

/**
 * Purple Dream — rich purples and pinks, slightly surreal aesthetic.
 */
const THEME_PURPLE_DREAM: Theme = {
  name: 'Purple Dream',
  wallpaper: { bg: 0x7b2d8e, overlay: 0x2a1030, name: 'Purple Dream' },
  iconColors: [
    0xcc44cc, 0xdd66ee, 0xaa22cc, 0xff88ff, 0xbb44dd, 0xee66cc,
    0x9933bb, 0xdd44ff, 0xcc66dd, 0xff44cc, 0xaa33cc, 0xff66dd,
  ],
  titlebarColors: [
    0x7b2d8e, 0x9944aa, 0x662288, 0xaa4499, 0x8833aa, 0x773399, 0x993388, 0x6622aa,
  ],
  stickyColors: [
    0xeeddff, 0xffccff, 0xddbbff, 0xffbbee, 0xeeccff, 0xffddee,
  ],
  weight: 1,
};

/**
 * Ocean Teal — cool teals and blue-greens, calm and aquatic.
 */
const THEME_OCEAN_TEAL: Theme = {
  name: 'Ocean Teal',
  wallpaper: { bg: 0x2288aa, overlay: 0x0a2830, name: 'Ocean Teal' },
  iconColors: [
    0x44cccc, 0x33bbbb, 0x55dddd, 0x22aacc, 0x44bbcc, 0x66ddee,
    0x33aabb, 0x55ccdd, 0x77eeff, 0x22bbcc, 0x44ccdd, 0x99eeff,
  ],
  titlebarColors: [
    0x1a7799, 0x228899, 0x1166aa, 0x339988, 0x2277aa, 0x226688, 0x338899, 0x117799,
  ],
  stickyColors: [
    0xccffff, 0xbbeeee, 0xaadddd, 0xcceeee, 0x99dddd, 0xddeeff,
  ],
  weight: 1,
};

// ---------------------------------------------------------------------------
// All themes in order — edit weights here to tune selection frequency
// ---------------------------------------------------------------------------

const THEMES: readonly Theme[] = [
  THEME_CLASSIC_BLUE,
  THEME_FOREST_GREEN,
  THEME_SUNSET_ORANGE,
  THEME_PURPLE_DREAM,
  THEME_OCEAN_TEAL,
];

// ---------------------------------------------------------------------------
// ThemeSystem
// ---------------------------------------------------------------------------

export class ThemeSystem {
  private _currentTheme: Theme;
  private _lastTheme: Theme | null = null;

  constructor() {
    // Start with Classic Blue as the deterministic initial theme
    this._currentTheme = THEME_CLASSIC_BLUE;
  }

  // ---------------------------------------------------------------------------
  // Public API
  // ---------------------------------------------------------------------------

  /**
   * Returns a randomly selected theme that is not the same as the last used
   * theme, then records it as the new current theme.
   *
   * Selection uses weighted random sampling so theme weights can be tuned
   * without changing the algorithm.
   */
  getNextTheme(): Theme {
    const candidates = THEMES.filter((t) => t !== this._currentTheme);

    // BUG-009 fix: use cumulative build-up with a strict `<` check so the last
    // candidate is never under-represented.
    //
    // Previous pattern (subtract-then-check <= 0) was functionally equivalent
    // for most inputs, but floating-point precision when roll ≈ totalWeight
    // could cause the loop to exit without a break, falling back to candidates[0]
    // and statistically under-representing the last entry.
    //
    // This form is the canonical correct weighted-random: accumulate weights
    // and pick the first bucket whose cumulative sum exceeds the roll.
    // roll is in [0, totalWeight) — the last bucket always catches a no-break.
    const totalWeight = candidates.reduce((sum, t) => sum + t.weight, 0);
    const roll = Math.random() * totalWeight;
    let cumulative = 0;
    let chosen = candidates[candidates.length - 1]; // safe fallback: last item
    for (const t of candidates) {
      cumulative += t.weight;
      if (roll < cumulative) {
        chosen = t;
        break;
      }
    }

    this._lastTheme = this._currentTheme;
    this._currentTheme = chosen;
    return chosen;
  }

  /** The theme currently applied to the desktop. */
  get currentTheme(): Theme {
    return this._currentTheme;
  }

  /** Total number of themes available. */
  get themeCount(): number {
    return THEMES.length;
  }
}
