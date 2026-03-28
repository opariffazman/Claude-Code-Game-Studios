/**
 * Sound Library — maps game events to Kenney CC0 audio files.
 * Destruction effects use real OGG files (richer sound).
 * Per-key mapping keeps procedural oscillators (rhythm play).
 */

export interface SoundBank {
  /** Alias for audio buffer cache */
  alias: string;
  /** Path to the OGG file */
  src: string;
}

/** Destruction impact sounds — mapped to effect types */
export const DESTRUCTION_SOUNDS: Record<string, SoundBank[]> = {
  shatter: [
    { alias: 'glass-heavy-0', src: 'assets/audio/sfx/impact/Audio/impactGlass_heavy_000.ogg' },
    { alias: 'glass-heavy-1', src: 'assets/audio/sfx/impact/Audio/impactGlass_heavy_001.ogg' },
    { alias: 'glass-heavy-2', src: 'assets/audio/sfx/impact/Audio/impactGlass_heavy_002.ogg' },
  ],
  crack: [
    { alias: 'glass-light-0', src: 'assets/audio/sfx/impact/Audio/impactGlass_light_000.ogg' },
    { alias: 'glass-light-1', src: 'assets/audio/sfx/impact/Audio/impactGlass_light_001.ogg' },
  ],
  explode: [
    { alias: 'plate-heavy-0', src: 'assets/audio/sfx/impact/Audio/impactPlate_heavy_000.ogg' },
    { alias: 'plate-heavy-1', src: 'assets/audio/sfx/impact/Audio/impactPlate_heavy_001.ogg' },
  ],
  bounce: [
    { alias: 'soft-heavy-0', src: 'assets/audio/sfx/impact/Audio/impactSoft_heavy_000.ogg' },
    { alias: 'soft-heavy-1', src: 'assets/audio/sfx/impact/Audio/impactSoft_heavy_001.ogg' },
  ],
  hammer: [
    { alias: 'wood-heavy-0', src: 'assets/audio/sfx/impact/Audio/impactWood_heavy_000.ogg' },
    { alias: 'wood-heavy-1', src: 'assets/audio/sfx/impact/Audio/impactWood_heavy_001.ogg' },
    { alias: 'wood-heavy-2', src: 'assets/audio/sfx/impact/Audio/impactWood_heavy_002.ogg' },
  ],
  freeze: [
    { alias: 'bell-0', src: 'assets/audio/sfx/impact/Audio/impactBell_heavy_000.ogg' },
    { alias: 'bell-1', src: 'assets/audio/sfx/impact/Audio/impactBell_heavy_001.ogg' },
  ],
  // Tool switching
  toolSwitch: [
    { alias: 'click-0', src: 'assets/audio/sfx/interface/Audio/click_000.ogg' },
    { alias: 'click-1', src: 'assets/audio/sfx/interface/Audio/click_001.ogg' },
    { alias: 'click-2', src: 'assets/audio/sfx/interface/Audio/click_002.ogg' },
  ],
  // Damage (partial hit)
  damage: [
    { alias: 'scratch-0', src: 'assets/audio/sfx/interface/Audio/scratch_000.ogg' },
    { alias: 'scratch-1', src: 'assets/audio/sfx/interface/Audio/scratch_001.ogg' },
    { alias: 'glitch-0', src: 'assets/audio/sfx/interface/Audio/glitch_000.ogg' },
    { alias: 'glitch-1', src: 'assets/audio/sfx/interface/Audio/glitch_001.ogg' },
  ],
};

/**
 * Get all sound banks as a flat array for preloading.
 */
export function getAllSoundAssets(): SoundBank[] {
  return Object.values(DESTRUCTION_SOUNDS).flat();
}

/**
 * Pick a random sound from a bank.
 */
export function pickRandom(bank: SoundBank[]): SoundBank {
  return bank[Math.floor(Math.random() * bank.length)];
}
