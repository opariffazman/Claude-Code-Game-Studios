// PROTOTYPE - NOT FOR PRODUCTION
// Question: Is keyboard-mashing a fake desktop with destruction effects fun?
// Date: 2026-03-28

import { Application, Text, TextStyle, Container } from 'pixi.js';
import { SafetyLimiter } from './safety-limiter';
import { AudioEngine } from './audio-engine';
import { ParticleManager } from './particles';
import { DesktopRenderer } from './desktop';
import { DestructionEffects } from './effects';
import { MouseTools } from './mouse-tools';
import { InputCapture } from './input-capture';
import { ParentLock } from './parent-lock';
import { ScreenShake } from './screen-shake';
import { ChaosMeter } from './chaos-meter';
import { MouseTrail } from './mouse-trail';

async function main() {
  // === App Shell ===
  const app = new Application();
  await app.init({
    background: '#2b5797',
    resizeTo: window,
    antialias: true,
    autoDensity: true,
    resolution: window.devicePixelRatio || 1,
  });
  document.body.appendChild(app.canvas);

  // === Foundation Systems ===
  const safety = new SafetyLimiter();
  const audio = new AudioEngine(safety);

  // === Desktop Layer ===
  const desktop = new DesktopRenderer(app.stage, app.screen.width, app.screen.height);
  app.renderer.background.color = desktop.wallpaperColor;

  // Rebuild desktop on resize (fullscreen entry/exit) to fix taskbar positioning
  let resizeTimer: ReturnType<typeof setTimeout>;
  const handleResize = () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => {
      const w = window.innerWidth;
      const h = window.innerHeight;
      desktop.resize(w, h);
      app.renderer.background.color = desktop.wallpaperColor;
    }, 100); // Debounce — let fullscreen transition settle
  };
  window.addEventListener('resize', handleResize);
  document.addEventListener('fullscreenchange', handleResize);

  // === Mouse Trail Layer (above desktop, below particles) ===
  const mouseTrail = new MouseTrail(app.stage);

  // === Particle Layer (above everything else) ===
  const particles = new ParticleManager(app.stage, safety);

  // === UI Layer (above everything) ===
  const uiLayer = new Container();
  uiLayer.label = 'ui';
  app.stage.addChild(uiLayer);

  // === Destruction Effects ===
  const effects = new DestructionEffects(particles, audio, safety);

  // === Mouse Tools (above particles for cursor visibility) ===
  const mouseTools = new MouseTools(uiLayer, particles, audio);

  // === Screen Shake ===
  const screenShake = new ScreenShake();

  // === Chaos Meter ===
  const chaosMeter = new ChaosMeter();

  // === Input Capture ===
  const input = new InputCapture(app.canvas as HTMLCanvasElement);

  // Ensure AudioContext on first input (browser autoplay policy)
  let audioStarted = false;

  // === Handle destruction on input ===
  input.onInput((type, x, y, keyCode) => {
    // Start audio context on first input
    if (!audioStarted) {
      audio.ensureContext();
      audioStarted = true;
      // Enter fullscreen on first input
      app.canvas.requestFullscreen?.().catch(() => {});
    }

    // Key-mapped sound: same key always plays same sound+pitch (additional feedback)
    if (type === 'key' && keyCode) {
      audio.playForKey(keyCode);
    }

    chaosMeter.recordInput();

    if (type === 'click') {
      const target = desktop.getElementAt(x, y);

      if (target) {
        // Mouse uses special tools instead of random effects
        const toolResult = mouseTools.applyTool(x, y, target, desktop.elements);

        // Apply base damage + extra from tool
        effects.applyRandom(target);
        for (let i = 0; i < toolResult.extraDamage; i++) {
          if (!target.destroyed) effects.applyRandom(target);
        }

        // AoE: damage nearby targets (bomb tool)
        for (const aoeTarget of toolResult.aoeTargets) {
          if (!aoeTarget.destroyed) effects.applyRandom(aoeTarget);
        }

        // Auto-rebuild when everything is destroyed
        if (desktop.allDestroyed) {
          setTimeout(() => {
            desktop.reset();
            app.renderer.background.color = desktop.wallpaperColor;
          }, 800);
        }
      } else {
        // Clicked empty desktop space — crack wallpaper + still cycle tool + AoE effects
        desktop.crackWallpaper(x, y);
        particles.emit(x, y, 12, { speed: 150, gravity: 200, life: 0.5, spread: Math.PI * 2, scale: 0.7 });
        audio.play('crack');

        // Apply tool even on empty space (cycles cursor + bomb/magnet AoE still work)
        const toolResult = mouseTools.applyTool(x, y, null, desktop.elements);
        for (const aoeTarget of toolResult.aoeTargets) {
          if (!aoeTarget.destroyed) effects.applyRandom(aoeTarget);
        }
      }
    } else {
      // Key: target random element
      const target = desktop.getRandomAlive();

      if (target) {
        effects.applyRandom(target);

        // Screen shake based on chaos level
        const chaosLevel = chaosMeter.level;
        if (chaosLevel >= 1) {
          screenShake.trigger(2 + chaosLevel * 2); // Level 1: 4, Level 2: 6, Level 3: 8
        }

        // Bigger particles at higher chaos
        if (chaosLevel >= 2) {
          const cx = target.x + target.width / 2;
          const cy = target.y + target.height / 2;
          particles.emit(cx, cy, chaosLevel * 5, { speed: 200, gravity: 300, life: 0.5, scale: 0.8 });
        }

        // Auto-rebuild when everything is destroyed
        if (desktop.allDestroyed) {
          setTimeout(() => {
            desktop.reset();
            app.renderer.background.color = desktop.wallpaperColor;
          }, 800);
        }
      } else {
        // All destroyed but rebuild pending — just emit particles for fun
        particles.emit(x, y, 15, { speed: 300, gravity: 400, life: 0.6 });
        audio.playRandom();
      }
    }
  });

  // === Mouse drag handling ===
  input.onDrag((x, y) => {
    const hitElements = mouseTools.applyDrag(x, y, desktop.elements);
    for (const el of hitElements) {
      if (!el.destroyed) effects.applyRandom(el);
    }
    // ~10% of drag frames leave a wallpaper crack mark
    if (Math.random() < 0.1) {
      desktop.crackWallpaper(x, y);
    }
  });

  input.onMouseUp(() => {
    const pos = mouseTools.lastPosition;
    mouseTools.onDragEnd(pos.x, pos.y, desktop.elements);
  });

  // === Parent Lock ===
  let unlocked = false;

  const parentLock = new ParentLock(
    uiLayer,
    app.screen.width,
    app.screen.height,
    () => {
      unlocked = true;
      input.disable();
      // Exit fullscreen
      document.exitFullscreen?.().catch(() => {});
      // Show goodbye message
      const style = new TextStyle({
        fontSize: 48,
        fill: 0xffffff,
        fontFamily: 'sans-serif',
        align: 'center',
        dropShadow: { color: 0x000000, distance: 3, blur: 5 },
      });
      const bye = new Text({ text: 'Bye bye! 👋', style });
      bye.anchor.set(0.5);
      bye.position.set(app.screen.width / 2, app.screen.height / 2);
      uiLayer.addChild(bye);
    }
  );

  // Wire parent lock to raw key events
  input.onKeyRaw((key) => {
    parentLock.handleKey(key);
  });

  // Track Ctrl+Shift+Q combo hold
  let ctrlHeld = false;
  let shiftHeld = false;
  let qHeld = false;
  window.addEventListener('keydown', (e) => {
    if (e.key === 'Control') ctrlHeld = true;
    if (e.key === 'Shift') shiftHeld = true;
    if (e.key === 'q' || e.key === 'Q') qHeld = true;
    if (ctrlHeld && shiftHeld && qHeld) parentLock.startComboHold();
  }, { capture: true });
  window.addEventListener('keyup', (e) => {
    if (e.key === 'Control') ctrlHeld = false;
    if (e.key === 'Shift') shiftHeld = false;
    if (e.key === 'q' || e.key === 'Q') qHeld = false;
    if (!(ctrlHeld && shiftHeld && qHeld)) parentLock.endComboHold();
  }, { capture: true });

  // === FPS counter (debug, top-left, tiny) ===
  const fpsStyle = new TextStyle({ fontSize: 10, fill: 0xffffff, fontFamily: 'monospace' });
  const fpsText = new Text({ text: 'FPS: 0', style: fpsStyle });
  fpsText.position.set(4, 4);
  fpsText.alpha = 0.4;
  uiLayer.addChild(fpsText);

  // === Game Loop ===
  app.ticker.add((ticker) => {
    if (unlocked) return;

    const dt = ticker.deltaTime / 60; // seconds
    desktop.update(dt, 1 + chaosMeter.level * 0.5);
    particles.update(dt);
    mouseTrail.update(dt);
    chaosMeter.update();
    screenShake.update(app.stage);
    parentLock.update();

    // FPS display
    fpsText.text = `FPS: ${Math.round(ticker.FPS)} | Particles: ${particles.activeCount} | Destroyed: ${Math.round(desktop.destructionProgress * 100)}% | Chaos: ${chaosMeter.level}`;
  });

  console.log('Desk Smasher prototype running!');
  console.log('Smash the keyboard! Click the desktop!');
  console.log('Type "exit" or hold Ctrl+Shift+Q to quit.');
}

main().catch(console.error);
