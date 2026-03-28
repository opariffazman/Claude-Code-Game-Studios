/**
 * WallpaperDamage — 6 background damage types that accumulate on the
 * wallpaper as chaos increases. Each type draws directly to a PixiJS
 * Graphics layer behind the desktop elements.
 *
 * Stubs for Sprint 1; full rendering wired in Sprint 2.
 */
import type { Graphics } from 'pixi.js';
import type { WallpaperDamageType } from '../types';

/** A single wallpaper damage draw function. */
export type WallpaperDamageEffect = (graphics: Graphics, x: number, y: number) => void;

// TODO Sprint 2: replace stubs with actual Graphics draw calls.

export const wallpaperDamageEffects: Record<WallpaperDamageType, WallpaperDamageEffect> = {
  crack:   (_g, _x, _y) => { /* TODO */ },
  burn:    (_g, _x, _y) => { /* TODO */ },
  dent:    (_g, _x, _y) => { /* TODO */ },
  splat:   (_g, _x, _y) => { /* TODO */ },
  pixel:   (_g, _x, _y) => { /* TODO */ },
  scratch: (_g, _x, _y) => { /* TODO */ },
};
