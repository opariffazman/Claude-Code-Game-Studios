/**
 * DestructionEffects — 9 named destruction animations triggered when
 * a desktop element reaches zero health.
 *
 * Each effect is a function that receives a PixiJS Container (the element's
 * display object) and impact coordinates. Implementations are stubs for Sprint 1;
 * full animations are wired in Sprint 2.
 */
import type { Container } from 'pixi.js';
import type { DesktopElement } from '../types';

/** A single destruction effect implementation. */
export type DestructionEffect = (container: Container, element: DesktopElement, x: number, y: number) => void;

/** All nine destruction effect identifiers. */
export type DestructionEffectName =
  | 'shatter'
  | 'explode'
  | 'dissolve'
  | 'implode'
  | 'crumble'
  | 'burn'
  | 'glitch'
  | 'bounce'
  | 'vacuum';

// TODO Sprint 2: implement each effect using ParticleManager and PixiJS tweens.

export const destructionEffects: Record<DestructionEffectName, DestructionEffect> = {
  shatter:  (_c, _el, _x, _y) => { /* TODO */ },
  explode:  (_c, _el, _x, _y) => { /* TODO */ },
  dissolve: (_c, _el, _x, _y) => { /* TODO */ },
  implode:  (_c, _el, _x, _y) => { /* TODO */ },
  crumble:  (_c, _el, _x, _y) => { /* TODO */ },
  burn:     (_c, _el, _x, _y) => { /* TODO */ },
  glitch:   (_c, _el, _x, _y) => { /* TODO */ },
  bounce:   (_c, _el, _x, _y) => { /* TODO */ },
  vacuum:   (_c, _el, _x, _y) => { /* TODO */ },
};
