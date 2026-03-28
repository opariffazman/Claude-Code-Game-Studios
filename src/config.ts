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
