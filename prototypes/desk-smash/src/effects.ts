// PROTOTYPE - NOT FOR PRODUCTION
// Question: Is keyboard-mashing a fake desktop with destruction effects fun?
// Date: 2026-03-28

import { DesktopElement } from './desktop';
import { ParticleManager } from './particles';
import { AudioEngine } from './audio-engine';
import { SafetyLimiter } from './safety-limiter';

type EffectFn = (el: DesktopElement, particles: ParticleManager, audio: AudioEngine) => void;

function getCenterX(el: DesktopElement): number {
  return el.x + el.width / 2;
}

function getCenterY(el: DesktopElement): number {
  return el.y + el.height / 2;
}

/** Damage effect 1: Shake + crack particles */
function damageShake(el: DesktopElement, particles: ParticleManager, audio: AudioEngine): void {
  audio.play('crack');
  const cx = getCenterX(el);
  const cy = getCenterY(el);
  const dmgRatio = 1 - (el.health / el.maxHealth); // 0 = fresh, 1 = about to die
  particles.emit(cx, cy, 5 + Math.floor(dmgRatio * 10), { speed: 80 + dmgRatio * 120, gravity: 0, life: 0.4, spread: Math.PI * 2, scale: 0.4 + dmgRatio * 0.3 });

  const origX = el.container.x;
  const origY = el.container.y;
  const shakeStrength = 4 + dmgRatio * 12;
  let shakeTime = 0;
  const shakeInterval = setInterval(() => {
    shakeTime += 0.016;
    if (shakeTime >= 0.25) {
      el.container.x = origX;
      el.container.y = origY;
      clearInterval(shakeInterval);
      return;
    }
    el.container.x = origX + (Math.random() - 0.5) * shakeStrength;
    el.container.y = origY + (Math.random() - 0.5) * shakeStrength;
  }, 16);
}

/** Damage effect 2: Wobble — element tilts and wobbles back */
function damageWobble(el: DesktopElement, particles: ParticleManager, audio: AudioEngine): void {
  audio.play('boing');
  const cx = getCenterX(el);
  const cy = getCenterY(el);
  particles.emit(cx, cy, 4, { speed: 60, gravity: 100, life: 0.3, spread: Math.PI, scale: 0.4 });

  const origRot = el.container.rotation;
  const wobbleDir = Math.random() > 0.5 ? 1 : -1;
  let wobbleTime = 0;
  const wobbleInterval = setInterval(() => {
    wobbleTime += 0.016;
    if (wobbleTime >= 0.4) {
      el.container.rotation = origRot;
      clearInterval(wobbleInterval);
      return;
    }
    el.container.rotation = origRot + Math.sin(wobbleTime * 25) * 0.08 * wobbleDir * (1 - wobbleTime / 0.4);
  }, 16);
}

/** Damage effect 3: Squish — element compresses then springs back */
function damageSquish(el: DesktopElement, particles: ParticleManager, audio: AudioEngine): void {
  audio.play('pop');
  const cx = getCenterX(el);
  const cy = getCenterY(el);
  particles.emit(cx, cy, 3, { speed: 50, gravity: 80, life: 0.3, scale: 0.3 });

  const origSX = el.container.scale.x;
  const origSY = el.container.scale.y;
  let squishTime = 0;
  const squishInterval = setInterval(() => {
    squishTime += 0.016;
    if (squishTime >= 0.35) {
      el.container.scale.set(origSX, origSY);
      clearInterval(squishInterval);
      return;
    }
    const t = squishTime / 0.35;
    // Squish down then spring back with overshoot
    const bounce = Math.sin(t * Math.PI * 3) * (1 - t) * 0.25;
    el.container.scale.set(origSX * (1 + bounce), origSY * (1 - bounce));
  }, 16);
}

/** Damage effect 4: Color flash — element tints red briefly */
function damageFlash(el: DesktopElement, particles: ParticleManager, audio: AudioEngine): void {
  audio.play('splat');
  const cx = getCenterX(el);
  const cy = getCenterY(el);
  const dmgRatio = 1 - (el.health / el.maxHealth);
  particles.emit(cx, cy, 6 + Math.floor(dmgRatio * 8), { speed: 100, gravity: 150, life: 0.4, scale: 0.5 });

  el.gfx.tint = 0xff4444;
  setTimeout(() => { el.gfx.tint = 0xffffff; }, 150);
}

const DAMAGE_EFFECTS: EffectFn[] = [damageShake, damageWobble, damageSquish, damageFlash];

/** Progressive visual degradation — applied every hit */
function applyProgressiveDamage(el: DesktopElement): void {
  const dmgRatio = 1 - (el.health / el.maxHealth); // 0 = fresh, 1 = about to die
  // Fade alpha as damage increases
  el.container.alpha = 1 - dmgRatio * 0.5; // 1.0 → 0.5
  // Slight scale shrink
  const shrink = 1 - dmgRatio * 0.1; // 1.0 → 0.9
  el.container.scale.set(shrink, shrink);
}

/** Effect 2: Shatter — element breaks apart, pieces fly off */
function shatterEffect(el: DesktopElement, particles: ParticleManager, audio: AudioEngine): void {
  audio.play('crack');
  const cx = getCenterX(el);
  const cy = getCenterY(el);
  particles.emit(cx, cy, 20, { speed: 400, gravity: 600, life: 1.0, spread: Math.PI, scale: 1.2 });
  el.container.visible = false;
}

/** Effect 3: Bounce — element flies up and off screen */
function bounceEffect(el: DesktopElement, particles: ParticleManager, audio: AudioEngine): void {
  audio.play('boing');
  const cx = getCenterX(el);
  const cy = getCenterY(el);
  particles.emit(cx, cy, 6, { speed: 150, gravity: 200, life: 0.5, scale: 0.8 });

  // Animate flying off
  let vy = -800;
  const animInterval = setInterval(() => {
    vy += 30;
    el.container.y += vy * 0.016;
    el.container.rotation += 0.2;
    el.container.scale.x *= 0.98;
    el.container.scale.y *= 0.98;
    if (el.container.y > window.innerHeight + 200) {
      clearInterval(animInterval);
      el.container.visible = false;
    }
  }, 16);
}

/** Effect 4: Explode — radial particle burst, element vanishes */
function explodeEffect(el: DesktopElement, particles: ParticleManager, audio: AudioEngine): void {
  audio.play('pop');
  const cx = getCenterX(el);
  const cy = getCenterY(el);
  particles.emit(cx, cy, 30, { speed: 500, gravity: 200, life: 0.8, spread: Math.PI * 2, scale: 1.5 });
  el.container.visible = false;
}

/** Effect 5: Inflate & Pop — element scales up then bursts into confetti */
function inflatePop(el: DesktopElement, particles: ParticleManager, audio: AudioEngine): void {
  const cx = getCenterX(el);
  const cy = getCenterY(el);

  // Inflate phase
  let inflateTime = 0;
  const inflateDuration = 0.3;
  const origScaleX = el.container.scale.x;
  const origScaleY = el.container.scale.y;

  const inflateInterval = setInterval(() => {
    inflateTime += 0.016;
    const t = inflateTime / inflateDuration;
    el.container.scale.set(origScaleX * (1 + t * 1.5), origScaleY * (1 + t * 1.5));

    if (inflateTime >= inflateDuration) {
      clearInterval(inflateInterval);
      // Pop!
      audio.play('pop');
      particles.emit(cx, cy, 25, { speed: 350, gravity: 300, life: 1.0, spread: Math.PI * 2, scale: 1.0 });
      el.container.visible = false;
    }
  }, 16);

  audio.play('boing'); // Inflate sound
}

/** Effect 6: Pixelate & Fade — wide particle burst then element fades out */
function pixelateEffect(el: DesktopElement, particles: ParticleManager, audio: AudioEngine): void {
  audio.play('crack');
  const cx = getCenterX(el);
  const cy = getCenterY(el);
  particles.emit(cx, cy, 40, { speed: 250, gravity: 100, life: 0.6, spread: Math.PI * 2, scale: 0.8 });

  // Fade out via alpha decay
  let fadeTime = 0;
  const fadeDuration = 0.4;
  const fadeInterval = setInterval(() => {
    fadeTime += 0.016;
    el.container.alpha = Math.max(0, 1 - fadeTime / fadeDuration);
    if (fadeTime >= fadeDuration) {
      clearInterval(fadeInterval);
      el.container.visible = false;
      el.container.alpha = 1;
    }
  }, 16);
}

/** Effect 7: Melt — element stretches downward and fades, drip particles */
function meltEffect(el: DesktopElement, particles: ParticleManager, audio: AudioEngine): void {
  audio.play('splat');
  const cx = getCenterX(el);
  const cy = getCenterY(el);
  // Drip particles pointing downward (spread around PI/2 = down)
  particles.emit(cx, cy, 15, { speed: 120, gravity: 50, life: 0.8, spread: Math.PI / 6, scale: 0.7 });

  const origScaleY = el.container.scale.y;
  let meltTime = 0;
  const meltDuration = 0.5;

  const meltInterval = setInterval(() => {
    meltTime += 0.016;
    const t = meltTime / meltDuration;
    el.container.scale.y = origScaleY * (1 + t);   // stretch to 2x
    el.container.alpha = Math.max(0, 1 - t);
    if (meltTime >= meltDuration) {
      clearInterval(meltInterval);
      el.container.visible = false;
      el.container.scale.y = origScaleY;
      el.container.alpha = 1;
    }
  }, 16);
}

/** Effect 8: Gravity Flip — element flips upside down and flies off the top of the screen */
function gravityFlipEffect(el: DesktopElement, particles: ParticleManager, audio: AudioEngine): void {
  audio.play('whoosh');
  const cx = getCenterX(el);
  const cy = getCenterY(el);
  particles.emit(cx, cy, 15, { speed: 200, gravity: -200, life: 0.7, spread: Math.PI, scale: 0.9 });

  // Flip upside down immediately
  el.container.scale.y *= -1;

  let vy = -600;
  const flipInterval = setInterval(() => {
    el.container.y += vy * 0.016;
    // No gravity — element keeps flying upward
    if (el.container.y < -el.height - 200) {
      clearInterval(flipInterval);
      el.container.visible = false;
    }
  }, 16);
}

/** Effect 9: Vortex — element spins and shrinks to nothing (sucked into black hole) */
function vortexEffect(el: DesktopElement, particles: ParticleManager, audio: AudioEngine): void {
  audio.play('pop');
  const cx = getCenterX(el);
  const cy = getCenterY(el);
  particles.emit(cx, cy, 20, { speed: 180, gravity: 0, life: 0.5, spread: Math.PI * 2, scale: 0.5 });

  let rotationSpeed = 0.1;
  const origScaleX = el.container.scale.x;
  const origScaleY = el.container.scale.y;

  const vortexInterval = setInterval(() => {
    rotationSpeed *= 1.08; // accelerate spin
    el.container.rotation += rotationSpeed;
    el.container.scale.x *= 0.93;
    el.container.scale.y *= 0.93;
    if (el.container.scale.x < 0.05) {
      clearInterval(vortexInterval);
      el.container.visible = false;
      el.container.scale.set(origScaleX, origScaleY);
      el.container.rotation = 0;
    }
  }, 16);
}

const EFFECTS: EffectFn[] = [
  shatterEffect,
  bounceEffect,
  explodeEffect,
  inflatePop,
  pixelateEffect,
  meltEffect,
  gravityFlipEffect,
  vortexEffect,
];

export class DestructionEffects {
  private particles: ParticleManager;
  private audio: AudioEngine;
  private safety: SafetyLimiter;

  constructor(particles: ParticleManager, audio: AudioEngine, safety: SafetyLimiter) {
    this.particles = particles;
    this.audio = audio;
    this.safety = safety;
  }

  /** Apply a random destruction effect to an element */
  applyRandom(el: DesktopElement): void {
    if (el.destroyed) return;

    el.health--;
    // Impulse: knock the element in a random direction
    const angle = Math.random() * Math.PI * 2;
    const force = 80 + Math.random() * 120;
    el.vx += Math.cos(angle) * force;
    el.vy += Math.sin(angle) * force;
    el.rotSpeed += (Math.random() - 0.5) * 2;
    if (el.health <= 0) {
      el.destroyed = true;
      // Full destruction — dramatic finale effect
      const finalEffect = EFFECTS[Math.floor(Math.random() * EFFECTS.length)];
      finalEffect(el, this.particles, this.audio);
    } else {
      // Partial damage — varied damage effects with progressive degradation
      const dmgEffect = DAMAGE_EFFECTS[Math.floor(Math.random() * DAMAGE_EFFECTS.length)];
      dmgEffect(el, this.particles, this.audio);
      applyProgressiveDamage(el);
    }
  }
}
