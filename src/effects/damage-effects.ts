/**
 * DamageEffects — 4 progressive damage state visuals applied to elements
 * as their health decreases (healthy -> scratched -> cracked -> critical).
 *
 * Stubs for Sprint 1; full visual updates wired in Sprint 2.
 */
import type { Container } from 'pixi.js';
import type { DesktopElement } from '../types';

/** Damage progression stages. */
export type DamageStage = 'healthy' | 'scratched' | 'cracked' | 'critical';

/** A single damage-state effect implementation. */
export type DamageEffect = (container: Container, element: DesktopElement) => void;

/**
 * Map an element's current health fraction to a damage stage.
 * @param health - Current health value.
 * @param maxHealth - Maximum health value.
 */
export function getDamageStage(health: number, maxHealth: number): DamageStage {
  const fraction = health / maxHealth;
  if (fraction > 0.66) return 'healthy';
  if (fraction > 0.33) return 'scratched';
  if (fraction > 0) return 'cracked';
  return 'critical';
}

// TODO Sprint 2: apply tint/overlay graphics to communicate damage state.

export const damageEffects: Record<DamageStage, DamageEffect> = {
  healthy:   (_c, _el) => { /* TODO */ },
  scratched: (_c, _el) => { /* TODO */ },
  cracked:   (_c, _el) => { /* TODO */ },
  critical:  (_c, _el) => { /* TODO */ },
};
