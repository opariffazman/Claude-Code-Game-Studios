/**
 * Shared type definitions for Desk Smasher.
 */

/** Desktop element types */
export type ElementType = 'icon' | 'window' | 'taskbar' | 'sticky' | 'notification' | 'widget';

/** Input event types */
export type InputType = 'key' | 'click' | 'touch';

/** Mouse tool types */
export type MouseToolType = 'hammer' | 'laser' | 'bomb' | 'freeze' | 'magnet';

/** Sound effect types */
export type SoundType = 'pop' | 'crack' | 'boing' | 'whoosh' | 'splat' | 'tinkle' | 'zap' | 'squish' | 'vortex';

/** Chaos meter levels */
export type ChaosLevel = 0 | 1 | 2 | 3;

/** Wallpaper damage types */
export type WallpaperDamageType = 'crack' | 'burn' | 'dent' | 'splat' | 'pixel' | 'scratch';

/** Desktop element interface */
export interface DesktopElement {
  readonly id: string;
  type: ElementType;
  label: string;
  health: number;
  maxHealth: number;
  destroyed: boolean;
  x: number;
  y: number;
  width: number;
  height: number;
  vx: number;
  vy: number;
  rotSpeed: number;
}

/** Wallpaper palette */
export interface WallpaperPalette {
  readonly bg: number;
  readonly overlay: number;
  readonly name: string;
}

/** Input event payload */
export interface InputEvent {
  type: InputType;
  x: number;
  y: number;
  keyCode?: string;
  key?: string;
}

/** Particle emission config */
export interface ParticleConfig {
  speed?: number;
  gravity?: number;
  life?: number;
  spread?: number;
  scale?: number;
}
