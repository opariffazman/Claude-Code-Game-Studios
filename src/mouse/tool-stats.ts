/**
 * Tool statistics for display in the Tool Card window.
 *
 * Values are derived from each tool's CONFIG constants:
 *   - damage = 1 (base dealt by MouseToolManager) + EXTRA_DAMAGE
 *   - aoe    = descriptive tier based on the tool's effective AoE radius
 *   - color  = primary fill / stroke color used in drawCursor()
 *
 * Keep this file in sync with the individual tool CONFIG blocks.
 * Do NOT hardcode balance numbers here — change the source CONFIG and update damage.
 *
 * @example
 * import { TOOL_STATS } from './tool-stats';
 * const stats = TOOL_STATS['hammer'];
 * console.log(stats.displayName, stats.damage); // "Hammer" 2
 */

// ---------------------------------------------------------------------------
// Interface
// ---------------------------------------------------------------------------

/**
 * Display-facing statistics for a single tool.
 * Consumed by the Tool Card window to render stat rows.
 */
export interface ToolStats {
  /** Internal tool identifier — matches MouseToolType. */
  name: string;
  /** Human-readable label shown in the Tool Card header. */
  displayName: string;
  /**
   * Base damage per click (1 normal + EXTRA_DAMAGE from the tool's CONFIG).
   * AoE tools (bomb, freeze, magnet) return extraDamage: 0 on direct click;
   * their primary value is in the aoe field.
   */
  damage: number;
  /**
   * Area-of-effect tier.
   *   "None"  — single-target only
   *   "Small" — reserved for future tools (<100px radius)
   *   "Wide"  — moderate AoE (~200px radius, e.g. bomb CLICK_RADIUS = 200)
   *   "Huge"  — large AoE (~300px radius, e.g. magnet CLICK_RADIUS = 300)
   */
  aoe: 'None' | 'Small' | 'Wide' | 'Huge';
  /** Damage archetype label, one word, shown as a stat badge. */
  type: 'Impact' | 'Precision' | 'Explosive' | 'Frost' | 'Force';
  /** Short description pitched at a child audience. */
  description: string;
  /**
   * Primary theme color for the tool card accent.
   * Matches the main fill / stroke color used in the tool's drawCursor() method.
   */
  color: number;
}

// ---------------------------------------------------------------------------
// TOOL_STATS record
// ---------------------------------------------------------------------------

/**
 * Centralized statistics for all five tools, keyed by MouseToolType name.
 *
 * Damage derivation:
 *   hammer  : 1 base + HAMMER_CONFIG.EXTRA_DAMAGE (1)  = 2
 *   laser   : 1 base + LASER_CONFIG.EXTRA_DAMAGE  (2)  = 3
 *   bomb    : 1 base + 0 (AoE to bystanders, not direct) — effective = 1
 *   freeze  : 1 base + 0 (halves health instead)        — effective = 1
 *   magnet  : 1 base + 0 (no damage, pure force)        — effective = 1
 *
 * AoE derivation:
 *   hammer  : no radius                              → None
 *   laser   : no radius                              → None
 *   bomb    : BOMB_CONFIG.CLICK_RADIUS   = 200px     → Wide
 *   freeze  : no radius (single target only)         → None
 *   magnet  : MAGNET_CONFIG.CLICK_RADIUS = 300px     → Huge
 *
 * Colors sourced from each tool's drawCursor() primary fill/stroke:
 *   hammer  : 0xff5500  (head fill)
 *   laser   : 0x00ff44  (outer circle stroke)
 *   bomb    : 0xff8800  (spark dot fill)
 *   freeze  : 0x88ddff  (main arm stroke)
 *   magnet  : 0xcc44ff  (design-doc accent; body uses 0xaaaacc/red/blue poles)
 */
export const TOOL_STATS: Record<string, ToolStats> = {
  hammer: {
    name: 'hammer',
    displayName: 'Hammer',
    damage: 2,
    aoe: 'None',
    type: 'Impact',
    description: 'Smash things!',
    color: 0xff5500,
  },
  laser: {
    name: 'laser',
    displayName: 'Laser',
    damage: 3,
    aoe: 'None',
    type: 'Precision',
    description: 'Zap with precision!',
    color: 0x00ff44,
  },
  bomb: {
    name: 'bomb',
    displayName: 'Bomb',
    damage: 1,
    aoe: 'Wide',
    type: 'Explosive',
    description: 'Boom! Hits everything nearby!',
    color: 0xff8800,
  },
  freeze: {
    name: 'freeze',
    displayName: 'Freeze',
    damage: 1,
    aoe: 'None',
    type: 'Frost',
    description: 'Freeze and shatter!',
    color: 0x88ddff,
  },
  magnet: {
    name: 'magnet',
    displayName: 'Magnet',
    damage: 1,
    aoe: 'Huge',
    type: 'Force',
    description: 'Pull everything in!',
    color: 0xcc44ff,
  },
} as const;
