/**
 * All tuning values for Desk Smasher.
 * No gameplay values should be hardcoded anywhere else.
 */

export const SAFETY_CONFIG = {
  /** Maximum visual flashes per second (WCAG guideline) */
  MAX_FLASHES_PER_SECOND: 3,
  /** Rolling window for flash counting (ms) */
  FLASH_WINDOW_MS: 1000,
  /** Maximum audio volume (0-1) */
  MAX_VOLUME: 0.7,
} as const;

export const INPUT_CONFIG = {
  /** Minimum drag distance to distinguish from click (px) */
  DRAG_THRESHOLD_PX: 5,
  /** Parent lock keyword */
  UNLOCK_KEYWORD: 'exit',
  /** Parent lock combo hold duration (ms) */
  COMBO_HOLD_MS: 3000,
  /** Keyword typing timeout (ms) */
  KEYWORD_TIMEOUT_MS: 3000,
} as const;

export const AUDIO_CONFIG = {
  /** Maximum simultaneous sounds */
  MAX_POLYPHONY: 8,
  /** Pitch variation range (multiplier) */
  PITCH_MIN: 0.7,
  PITCH_MAX: 1.4,
  /** Number of pitch steps for per-key mapping */
  PITCH_STEPS: 8,
} as const;

export const CHAOS_CONFIG = {
  /** Rolling window for input frequency (ms) */
  WINDOW_MS: 2000,
  /** Events-per-second thresholds for each level */
  LEVEL_THRESHOLDS: [4, 8, 13] as readonly number[],
} as const;

export const PARTICLE_CONFIG = {
  /** Maximum particles in pool */
  POOL_SIZE: 500,
  /** Maximum active particles (performance ceiling) */
  MAX_ACTIVE: 300,
  /** Colors for particle tinting */
  COLORS: [0xff4444, 0x44aaff, 0xffcc00, 0xff69b4, 0x44ff44, 0xff8800, 0xaa44ff] as readonly number[],
} as const;

export const DESKTOP_CONFIG = {
  /** Element count ranges per type */
  ICONS: { min: 8, max: 14 },
  WINDOWS: { min: 4, max: 7 },
  STICKIES: { min: 3, max: 6 },
  NOTIFICATIONS: { min: 2, max: 4 },
  WIDGETS: { min: 1, max: 3 },
  /** Health values per element type */
  HEALTH: {
    icon: 3,
    window: 5,
    taskbar: 8,
    sticky: 2,
    notification: 2,
    widget: 3,
  },
  /** Impulse physics */
  IMPULSE_FORCE_MIN: 80,
  IMPULSE_FORCE_MAX: 200,
  FRICTION: 0.92,
  MIN_VELOCITY: 0.5,
  /** Rebuild delay after all destroyed (ms) */
  REBUILD_DELAY_MS: 800,
  /** Taskbar height (px) */
  TASKBAR_HEIGHT: 48,
} as const;

/**
 * Zone-based desktop layout configuration.
 * Implements: design/gdd/desktop-layout.md and docs/architecture/layout-generation-algorithm.md
 *
 * All zone x/y/w/h values are fractions of the viewport dimensions (0.0 - 1.0).
 * CASCADE/JITTER values are in pixels.
 */
export const LAYOUT_CONFIG = {
  /** Left-side icon column zone. */
  ICON_ZONE:   { x: 0,    y: 0,    w: 0.18, h: 0.88, padding: 10 },
  /** Central area for application windows. */
  WINDOW_ZONE: { x: 0.20, y: 0.05, w: 0.55, h: 0.80, padding: 10 },
  /** Top-right notification toast area. */
  NOTIF_ZONE:  { x: 0.78, y: 0.02, w: 0.20, h: 0.50, padding: 5  },

  /**
   * Icon columns: always 3 — all theme icons shown in a fixed 3-column grid.
   * Implements: desk-smasher-dbt — show all 30 animals, 3 cols × 10 rows.
   */
  ICON_COLS_SMALL: 3,   // viewport width < 1200
  ICON_COLS_LARGE: 3,   // viewport width >= 1200

  /** Grid cell dimensions as fractions of viewport. */
  ICON_CELL_W_PCT: 0.075,  // cell width  = screenW * this
  ICON_CELL_H_PCT: 0.12,   // cell height = screenH * this

  /** Max random offset applied to each icon from its grid cell center (px). */
  ICON_JITTER: 5,

  /**
   * Fixed target icon size in logical pixels (before viewport scale).
   * Fixes: desk-smasher-yy2 — icon size must be independent of icon count.
   * The viewport scale factor (Math.min(screenW,screenH)/1200) is applied at
   * runtime; this value is the base at 1200px reference height.
   */
  ICON_TARGET_SIZE: 64,

  /** Horizontal cascade offset per additional window (px). */
  WINDOW_CASCADE_X: 40,
  /** Vertical cascade offset per additional window (px). */
  WINDOW_CASCADE_Y: 30,
  /** Max random position jitter per window (px). */
  WINDOW_JITTER: 20,

  /** Window size range as fractions of viewport. */
  WINDOW_MIN_W_PCT: 0.18,
  WINDOW_MAX_W_PCT: 0.28,
  WINDOW_MIN_H_PCT: 0.22,
  WINDOW_MAX_H_PCT: 0.35,

  /** Vertical gap between stacked notification banners (px). */
  NOTIF_GAP: 10,

  /** Notification banner width as fraction of viewport width. */
  NOTIF_WIDTH_PCT: 0.15,
} as const;

export const SCREEN_SHAKE_CONFIG = {
  MAX_INTENSITY: 15,
  DECAY: 0.9,
} as const;

export const MOUSE_TRAIL_CONFIG = {
  POOL_SIZE: 100,
  SPAWN_DISTANCE_PX: 5,
  LIFE_MIN: 0.3,
  LIFE_MAX: 0.5,
} as const;
