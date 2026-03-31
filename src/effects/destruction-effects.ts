/**
 * DestructionEffects — 8 final-kill animations triggered when a desktop
 * element reaches zero health.
 *
 * Each effect receives the logical element data (for center calculation),
 * its PixiJS Container (for transform animation), the ParticleManager
 * (for burst emission), and the AudioManager (for sound feedback).
 *
 * All interval-based loops are marked for ticker migration.
 * Performance budget: each effect must complete in ≤ 1 second wall-clock.
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
 * Shatter — element instantly vanishes with a radial burst of sharp
 * crack particles in all directions, simulating breaking glass or plastic.
 */
export function shatter(
  element: DesktopElement,
  container: Container,
  particles: ParticleManager,
  audio: AudioManager,
): void {
  audio.play('crack');
  particles.emit(cx(element), cy(element), 20, {
    speed: 400,
    gravity: 600,
    life: 1.0,
    spread: Math.PI * 2,
    scale: 1.2,
  });
  container.visible = false;
}

/**
 * Bounce — element launches upward with spin, shrinking as it flies
 * off-screen, then disappears once past the bottom edge.
 */
export function bounce(
  element: DesktopElement,
  container: Container,
  particles: ParticleManager,
  audio: AudioManager,
): void {
  audio.play('boing');
  particles.emit(cx(element), cy(element), 6, {
    speed: 150,
    gravity: 200,
    life: 0.5,
    scale: 0.8,
  });

  // TODO: convert to ticker-driven
  let vy = -800;
  const animInterval = setInterval(() => {
    if (!container.parent) { clearInterval(animInterval); return; }
    vy += 30;
    container.y += vy * 0.016;
    container.rotation += 0.2;
    container.scale.x *= 0.98;
    container.scale.y *= 0.98;
    if (container.y > window.innerHeight + 200) {
      clearInterval(animInterval);
      container.visible = false;
    }
  }, 16);
}

/**
 * Explode — radial particle burst in all directions; element vanishes
 * immediately, leaving only the particle cloud behind.
 */
export function explode(
  element: DesktopElement,
  container: Container,
  particles: ParticleManager,
  audio: AudioManager,
): void {
  audio.play('pop');
  particles.emit(cx(element), cy(element), 30, {
    speed: 500,
    gravity: 200,
    life: 0.8,
    spread: Math.PI * 2,
    scale: 1.5,
  });
  container.visible = false;
}

/**
 * InflatePop — element scales up over 0.3 s (inflate phase), then
 * bursts into confetti with a pop sound. Feels like an over-pressured balloon.
 */
export function inflatePop(
  element: DesktopElement,
  container: Container,
  particles: ParticleManager,
  audio: AudioManager,
): void {
  const centerX = cx(element);
  const centerY = cy(element);
  const origScaleX = container.scale.x;
  const origScaleY = container.scale.y;
  let inflateTime = 0;
  const inflateDuration = 0.3;

  audio.play('boing'); // Inflate wind-up sound

  // TODO: convert to ticker-driven
  const inflateInterval = setInterval(() => {
    if (!container.parent) { clearInterval(inflateInterval); return; }
    inflateTime += 0.016;
    const t = inflateTime / inflateDuration;
    container.scale.set(origScaleX * (1 + t * 1.5), origScaleY * (1 + t * 1.5));

    if (inflateTime >= inflateDuration) {
      clearInterval(inflateInterval);
      audio.play('pop');
      particles.emit(centerX, centerY, 25, {
        speed: 350,
        gravity: 300,
        life: 1.0,
        spread: Math.PI * 2,
        scale: 1.0,
      });
      container.visible = false;
    }
  }, 16);
}

/**
 * Pixelate — wide particle burst simulates the element dissolving into
 * pixels, followed by a 0.4 s alpha fade-out.
 */
export function pixelate(
  element: DesktopElement,
  container: Container,
  particles: ParticleManager,
  audio: AudioManager,
): void {
  audio.play('crack');
  particles.emit(cx(element), cy(element), 40, {
    speed: 250,
    gravity: 100,
    life: 0.6,
    spread: Math.PI * 2,
    scale: 0.8,
  });

  let fadeTime = 0;
  const fadeDuration = 0.4;

  // TODO: convert to ticker-driven
  const fadeInterval = setInterval(() => {
    if (!container.parent) { clearInterval(fadeInterval); return; }
    fadeTime += 0.016;
    container.alpha = Math.max(0, 1 - fadeTime / fadeDuration);
    if (fadeTime >= fadeDuration) {
      clearInterval(fadeInterval);
      container.visible = false;
      container.alpha = 1;
    }
  }, 16);
}

/**
 * Melt — element stretches downward to 2× height while fading out,
 * paired with downward drip particles. Duration 0.5 s.
 */
export function melt(
  element: DesktopElement,
  container: Container,
  particles: ParticleManager,
  audio: AudioManager,
): void {
  audio.play('splat');
  particles.emit(cx(element), cy(element), 15, {
    speed: 120,
    gravity: 50,
    life: 0.8,
    spread: Math.PI / 6,
    scale: 0.7,
  });

  const origScaleY = container.scale.y;
  let meltTime = 0;
  const meltDuration = 0.5;

  // TODO: convert to ticker-driven
  const meltInterval = setInterval(() => {
    if (!container.parent) { clearInterval(meltInterval); return; }
    meltTime += 0.016;
    const t = meltTime / meltDuration;
    container.scale.y = origScaleY * (1 + t); // stretch to 2×
    container.alpha = Math.max(0, 1 - t);
    if (meltTime >= meltDuration) {
      clearInterval(meltInterval);
      container.visible = false;
      container.scale.y = origScaleY;
      container.alpha = 1;
    }
  }, 16);
}

/**
 * GravityFlip — element instantly flips upside-down and flies off the
 * top of the screen with inverse gravity. Paired with upward arc particles.
 */
export function gravityFlip(
  element: DesktopElement,
  container: Container,
  particles: ParticleManager,
  audio: AudioManager,
): void {
  audio.play('whoosh');
  particles.emit(cx(element), cy(element), 15, {
    speed: 200,
    gravity: -200,
    life: 0.7,
    spread: Math.PI,
    scale: 0.9,
  });

  container.scale.y *= -1; // Flip upside-down immediately

  let vy = -600;

  // TODO: convert to ticker-driven
  const flipInterval = setInterval(() => {
    if (!container.parent) { clearInterval(flipInterval); return; }
    container.y += vy * 0.016;
    if (container.y < -element.height - 200) {
      clearInterval(flipInterval);
      container.visible = false;
    }
  }, 16);
}

/**
 * Vortex — element spins with accelerating rotation while shrinking to
 * nothing, as if sucked into a black hole. Spiral particles radiate outward.
 */
export function vortex(
  element: DesktopElement,
  container: Container,
  particles: ParticleManager,
  audio: AudioManager,
): void {
  audio.play('vortex');
  particles.emit(cx(element), cy(element), 20, {
    speed: 180,
    gravity: 0,
    life: 0.5,
    spread: Math.PI * 2,
    scale: 0.5,
  });

  let rotationSpeed = 0.1;
  const origScaleX = container.scale.x;
  const origScaleY = container.scale.y;

  // TODO: convert to ticker-driven
  const vortexInterval = setInterval(() => {
    if (!container.parent) { clearInterval(vortexInterval); return; }
    rotationSpeed *= 1.08; // accelerate spin each frame
    container.rotation += rotationSpeed;
    container.scale.x *= 0.93;
    container.scale.y *= 0.93;
    if (container.scale.x < 0.05) {
      clearInterval(vortexInterval);
      container.visible = false;
      container.scale.set(origScaleX, origScaleY);
      container.rotation = 0;
    }
  }, 16);
}

/**
 * Register all 8 destruction effects into the provided registry.
 * Call once during app initialisation before any effects are dispatched.
 * @param registry - The EffectRegistry instance to populate.
 */
export function registerDestructionEffects(registry: EffectRegistry): void {
  registry.register('shatter', shatter);
  registry.register('bounce', bounce);
  registry.register('explode', explode);
  registry.register('inflatePop', inflatePop);
  registry.register('pixelate', pixelate);
  registry.register('melt', melt);
  registry.register('gravityFlip', gravityFlip);
  registry.register('vortex', vortex);
}
