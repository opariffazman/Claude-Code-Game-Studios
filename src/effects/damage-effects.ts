/**
 * DamageEffects — 4 partial-hit animations applied when an element
 * takes damage but has not yet reached zero health.
 *
 * Also exports applyProgressiveDamage(), which adjusts the container's
 * alpha and scale continuously based on the current health fraction.
 *
 * All interval-based loops are marked for ticker migration.
 * Performance budget: each effect must complete in ≤ 0.5 seconds wall-clock.
 */
import type { Container } from 'pixi.js';
import type { DesktopElement } from '../types';
import type { ParticleManager } from '../vfx/particle-manager';
import type { AudioManager } from '../audio/audio-manager';
import type { EffectRegistry } from './effect-registry';

/** Helper: element center X in world space. */
function cx(el: DesktopElement): number {
  return el.x + el.width / 2;
}

/** Helper: element center Y in world space. */
function cy(el: DesktopElement): number {
  return el.y + el.height / 2;
}

/**
 * DamageShake — container rattles for 0.25 s with random offsets scaled
 * by the damage ratio; more severe as health approaches zero.
 * Emits crack particles proportional to damage taken.
 */
export function damageShake(
  element: DesktopElement,
  container: Container,
  particles: ParticleManager,
  audio: AudioManager,
): void {
  audio.play('crack');
  const dmgRatio = 1 - element.health / element.maxHealth; // 0 = fresh, 1 = critical
  particles.emit(cx(element), cy(element), 5 + Math.floor(dmgRatio * 10), {
    speed: 80 + dmgRatio * 120,
    gravity: 0,
    life: 0.4,
    spread: Math.PI * 2,
    scale: 0.4 + dmgRatio * 0.3,
  });

  const origX = container.x;
  const origY = container.y;
  const shakeStrength = 4 + dmgRatio * 12;
  let shakeTime = 0;

  // TODO: convert to ticker-driven
  const shakeInterval = setInterval(() => {
    shakeTime += 0.016;
    if (shakeTime >= 0.25) {
      container.x = origX;
      container.y = origY;
      clearInterval(shakeInterval);
      return;
    }
    container.x = origX + (Math.random() - 0.5) * shakeStrength;
    container.y = origY + (Math.random() - 0.5) * shakeStrength;
  }, 16);
}

/**
 * DamageWobble — container tilts in a random direction and oscillates
 * back to its original rotation over 0.4 s, like a wobbling object.
 * Emits a few arc particles.
 */
export function damageWobble(
  element: DesktopElement,
  container: Container,
  particles: ParticleManager,
  audio: AudioManager,
): void {
  audio.play('boing');
  particles.emit(cx(element), cy(element), 4, {
    speed: 60,
    gravity: 100,
    life: 0.3,
    spread: Math.PI,
    scale: 0.4,
  });

  const origRot = container.rotation;
  const wobbleDir = Math.random() > 0.5 ? 1 : -1;
  let wobbleTime = 0;

  // TODO: convert to ticker-driven
  const wobbleInterval = setInterval(() => {
    wobbleTime += 0.016;
    if (wobbleTime >= 0.4) {
      container.rotation = origRot;
      clearInterval(wobbleInterval);
      return;
    }
    container.rotation =
      origRot +
      Math.sin(wobbleTime * 25) * 0.08 * wobbleDir * (1 - wobbleTime / 0.4);
  }, 16);
}

/**
 * DamageSquish — container compresses vertically then springs back with
 * overshoot, giving the impression of a soft object being hit.
 * Emits a small puff of particles downward.
 */
export function damageSquish(
  element: DesktopElement,
  container: Container,
  particles: ParticleManager,
  audio: AudioManager,
): void {
  audio.play('pop');
  particles.emit(cx(element), cy(element), 3, {
    speed: 50,
    gravity: 80,
    life: 0.3,
    scale: 0.3,
  });

  const origSX = container.scale.x;
  const origSY = container.scale.y;
  let squishTime = 0;

  // TODO: convert to ticker-driven
  const squishInterval = setInterval(() => {
    squishTime += 0.016;
    if (squishTime >= 0.35) {
      container.scale.set(origSX, origSY);
      clearInterval(squishInterval);
      return;
    }
    const t = squishTime / 0.35;
    // Compress down then spring back with overshoot
    const bounce = Math.sin(t * Math.PI * 3) * (1 - t) * 0.25;
    container.scale.set(origSX * (1 + bounce), origSY * (1 - bounce));
  }, 16);
}

/**
 * DamageFlash — container tint snaps to red for 150 ms then resets,
 * giving clear hit feedback. Emits scattered splat particles scaled
 * by the current damage ratio.
 */
export function damageFlash(
  element: DesktopElement,
  container: Container,
  particles: ParticleManager,
  audio: AudioManager,
): void {
  audio.play('splat');
  const dmgRatio = 1 - element.health / element.maxHealth;
  particles.emit(cx(element), cy(element), 6 + Math.floor(dmgRatio * 8), {
    speed: 100,
    gravity: 150,
    life: 0.4,
    scale: 0.5,
  });

  container.tint = 0xff4444;
  setTimeout(() => {
    container.tint = 0xffffff;
  }, 150);
}

/**
 * Apply continuous visual degradation based on the current health fraction.
 * Should be called on every hit, after the per-hit damage effect.
 *
 * Alpha fades from 1.0 → 0.5 as health drops to 0.
 * Scale shrinks from 1.0 → 0.9 as health drops to 0.
 *
 * @param element - Element data providing the health fraction.
 * @param container - PixiJS Container to apply the visual state to.
 */
export function applyProgressiveDamage(
  element: DesktopElement,
  container: Container,
): void {
  const dmgRatio = 1 - element.health / element.maxHealth; // 0 = fresh, 1 = about to die
  container.alpha = 1 - dmgRatio * 0.5; // 1.0 → 0.5
  const shrink = 1 - dmgRatio * 0.1; // 1.0 → 0.9
  container.scale.set(shrink, shrink);
}

/**
 * Register all 4 damage effects into the provided registry.
 * Call once during app initialisation before any effects are dispatched.
 * @param registry - The EffectRegistry instance to populate.
 */
export function registerDamageEffects(registry: EffectRegistry): void {
  registry.register('damageShake', damageShake);
  registry.register('damageWobble', damageWobble);
  registry.register('damageSquish', damageSquish);
  registry.register('damageFlash', damageFlash);
}
