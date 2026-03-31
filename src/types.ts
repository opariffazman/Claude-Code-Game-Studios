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

// ---------------------------------------------------------------------------
// Layout types (implements: layout-generation-algorithm.md)
// ---------------------------------------------------------------------------

/**
 * A rectangular screen zone defined in proportional (0-1) coordinates.
 * All x/y/w/h values are fractions of screenW / screenH.
 */
export interface LayoutZone {
  /** Left edge as a fraction of screenW. */
  x: number;
  /** Top edge as a fraction of screenH. */
  y: number;
  /** Width as a fraction of screenW. */
  w: number;
  /** Height as a fraction of screenH. */
  h: number;
  /** Inset from zone edges in px — elements must not touch the zone border. */
  padding: number;
}

/**
 * A LayoutZone resolved to absolute pixel coordinates.
 * Returned by resolveZone(); consumed by grid/cascade/stack generators.
 */
export interface ResolvedZone {
  left: number;
  top: number;
  right: number;
  bottom: number;
  width: number;
  height: number;
}

/**
 * An element placement rectangle in pixel coordinates.
 * x/y is the top-left corner; w/h is the element's visual size.
 */
export interface Placement {
  x: number;
  y: number;
  w: number;
  h: number;
}
