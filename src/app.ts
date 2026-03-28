/**
 * Main application class. Initializes PixiJS, creates all game systems
 * in dependency order, and runs the game loop.
 *
 * Sprint 1 deliverables:
 *   - SafetyLimiter (foundation — must be first)
 *   - AudioManager (depends on SafetyLimiter)
 *   - InputManager (depends on canvas)
 *   - ParentLock (depends on InputManager)
 *   - Input -> Audio routing (keypress = sound)
 *
 * Sprint 2 deliverables:
 *   - ParticleManager (depends on stage + safetyLimiter)
 *   - DesktopManager (depends on stage + screen dimensions)
 *   - EffectRegistry x2 (destruction effects + damage effects)
 *   - Input -> destruction pipeline (keyboard = random hit, mouse = targeted hit or wallpaper crack)
 *   - Auto-rebuild when all elements are destroyed
 *   - Background colour synced to desktop wallpaper palette
 *   - Debounced resize handling
 */
import { Application, Text, TextStyle, Container } from 'pixi.js';
import { SafetyLimiter } from './core/safety-limiter';
import { InputManager } from './core/input/input-manager';
import { ParentLock } from './core/input/parent-lock';
import { AudioManager } from './audio/audio-manager';
import { ParticleManager } from './vfx/particle-manager';
import { DesktopManager } from './desktop/desktop-manager';
import { EffectRegistry } from './effects/effect-registry';
import { registerDestructionEffects } from './effects/destruction-effects';
import { registerDamageEffects, applyProgressiveDamage } from './effects/damage-effects';

/** Milliseconds to wait after the last resize event before rebuilding the desktop. */
const RESIZE_DEBOUNCE_MS = 200;

export class DeskSmasherApp {
  private app: Application | null = null;
  private safetyLimiter!: SafetyLimiter;
  private inputManager!: InputManager;
  private audioManager!: AudioManager;
  private parentLock!: ParentLock;
  private particles!: ParticleManager;
  private desktop!: DesktopManager;
  private destructionRegistry!: EffectRegistry;
  private damageRegistry!: EffectRegistry;
  private unlocked = false;
  private resizeTimer: ReturnType<typeof setTimeout> | null = null;

  /** Initialize PixiJS and all game systems. */
  async start(): Promise<void> {
    // 1. PixiJS init
    this.app = new Application();
    await this.app.init({
      resizeTo: window,
      antialias: true,
      autoDensity: true,
      resolution: window.devicePixelRatio || 1,
    });
    document.body.appendChild(this.app.canvas);

    // 2. Safety Limiter (foundation — must be first)
    this.safetyLimiter = new SafetyLimiter();

    // 3. Audio Manager (depends on SafetyLimiter)
    this.audioManager = new AudioManager(this.safetyLimiter);

    // 4. Input Manager (depends on canvas)
    this.inputManager = new InputManager(this.app.canvas as HTMLCanvasElement);

    // 5. Parent Lock (depends on InputManager).
    //    ParentLock self-registers via inputManager.onKeyRaw — no manual wiring needed.
    this.parentLock = new ParentLock(this.inputManager, () => this.handleUnlock());

    // Track Ctrl+Shift+Q combo hold for the second unlock method.
    this.setupComboTracking();

    // 6. Particle Manager (depends on stage + safetyLimiter)
    this.particles = new ParticleManager(this.app.stage, this.safetyLimiter);

    // 7. Desktop Manager (depends on stage + screen dimensions)
    this.desktop = new DesktopManager(
      this.app.stage,
      this.app.screen.width,
      this.app.screen.height,
    );

    // 8. Effect registries — populated once, reused for every hit
    this.destructionRegistry = new EffectRegistry();
    registerDestructionEffects(this.destructionRegistry);

    this.damageRegistry = new EffectRegistry();
    registerDamageEffects(this.damageRegistry);

    // 9. Sync background colour to the desktop wallpaper palette
    this.syncBackground();

    // 10. Wire input -> audio (Sprint 1: keypress = sound) and
    //     input -> destruction (Sprint 2: keypress/click = hit)
    let audioStarted = false;
    this.inputManager.onInput((event) => {
      if (!audioStarted) {
        this.audioManager.ensureContext();
        audioStarted = true;
      }

      if (event.type === 'key' && event.keyCode) {
        this.audioManager.playForKey(event.keyCode);
        this.handleKeyboardHit();
      }

      if (event.type === 'click' && event.x !== undefined && event.y !== undefined) {
        this.handleMouseHit(event.x, event.y);
      }
    });

    // 11. Debounced resize — rebuild desktop when window dimensions settle
    window.addEventListener('resize', () => this.onWindowResize());

    // 12. UI layer for debug / sprint info
    const uiLayer = new Container();
    uiLayer.label = 'ui';
    this.app.stage.addChild(uiLayer);

    const fpsStyle = new TextStyle({ fontSize: 10, fill: 0xffffff, fontFamily: 'monospace' });
    const fpsText = new Text({ text: 'FPS: 0', style: fpsStyle });
    fpsText.position.set(4, 4);
    fpsText.alpha = 0.4;
    uiLayer.addChild(fpsText);

    // 13. Game loop
    this.app.ticker.add((ticker) => {
      if (this.unlocked) return;
      const dt = ticker.deltaMS / 1000;

      this.parentLock.update();
      this.desktop.update(dt);
      this.particles.update(dt);

      // Auto-rebuild when all desktop elements have been destroyed
      if (this.desktop.allDestroyed) {
        this.rebuildDesktop();
      }

      fpsText.text = `FPS: ${Math.round(ticker.FPS)} | Sprint 2 — Destruction`;
    });

    console.log('Desk Smasher production build — Sprint 2');
    console.log('Press any key or click to smash the desktop.');
    console.log('Type "exit" or hold Ctrl+Shift+Q for 3 s to end the session.');
  }

  // ---------------------------------------------------------------------------
  // Destruction pipeline
  // ---------------------------------------------------------------------------

  /**
   * Handles a keyboard hit: targets a random alive element and applies
   * either a destruction effect (health reaches 0) or a damage effect.
   */
  private handleKeyboardHit(): void {
    const element = this.desktop.getRandomAlive();
    if (!element) return;
    this.hitElement(element);
  }

  /**
   * Handles a mouse click: targets the topmost element under the cursor.
   * If no element occupies that position, cracks the wallpaper instead.
   *
   * @param x - Canvas-space X coordinate of the click.
   * @param y - Canvas-space Y coordinate of the click.
   */
  private handleMouseHit(x: number, y: number): void {
    const element = this.desktop.getElementAt(x, y);
    if (element) {
      this.hitElement(element);
    } else {
      this.desktop.crackWallpaper(x, y);
    }
  }

  /**
   * Core destruction pipeline for a single element hit.
   * Decrements health, chooses the appropriate effect, applies impulse physics,
   * and fires the visual + audio effect.
   *
   * @param element - The element to damage.
   */
  private hitElement(element: import('./types').DesktopElement): void {
    const container = this.desktop.getContainerForElement(element);
    if (!container) return;

    element.health--;

    if (element.health <= 0) {
      element.health = 0;
      element.destroyed = true;
      const effect = this.destructionRegistry.getRandom();
      effect(element, container, this.particles, this.audioManager);
    } else {
      const dmgEffect = this.damageRegistry.getRandom();
      dmgEffect(element, container, this.particles, this.audioManager);
      applyProgressiveDamage(element, container);
    }

    this.desktop.applyImpulse(element);
  }

  // ---------------------------------------------------------------------------
  // Desktop lifecycle helpers
  // ---------------------------------------------------------------------------

  /**
   * Rebuilds the desktop and re-syncs the background colour to the new palette.
   * Clears any lingering particles from the previous session.
   */
  private rebuildDesktop(): void {
    this.particles.clear();
    this.desktop.reset();
    this.syncBackground();
  }

  /**
   * Syncs the PixiJS renderer background colour to the current desktop
   * wallpaper palette colour. Must be called after init and after every reset.
   */
  private syncBackground(): void {
    if (!this.app) return;
    this.app.renderer.background.color = this.desktop.wallpaperColor;
  }

  // ---------------------------------------------------------------------------
  // Window resize
  // ---------------------------------------------------------------------------

  /**
   * Debounced resize handler. Waits RESIZE_DEBOUNCE_MS after the last resize
   * event before rebuilding the desktop to the new dimensions.
   */
  private onWindowResize(): void {
    if (this.resizeTimer !== null) {
      clearTimeout(this.resizeTimer);
    }
    this.resizeTimer = setTimeout(() => {
      this.resizeTimer = null;
      if (!this.app) return;
      this.desktop.resize(this.app.screen.width, this.app.screen.height);
      this.syncBackground();
    }, RESIZE_DEBOUNCE_MS);
  }

  // ---------------------------------------------------------------------------
  // Sprint 1 carry-overs
  // ---------------------------------------------------------------------------

  private handleUnlock(): void {
    this.unlocked = true;
    this.inputManager.disable();
    document.exitFullscreen?.().catch(() => {});
    console.log('Parent lock triggered — session ended');
  }

  /**
   * Wires native keydown/keyup listeners (capture phase) to detect the
   * Ctrl+Shift+Q combo and notify ParentLock to start/stop the hold timer.
   * These listeners bypass InputManager's shortcut-blocking so the combo
   * always reaches ParentLock even during game input suppression.
   */
  private setupComboTracking(): void {
    let ctrlHeld = false;
    let shiftHeld = false;
    let qHeld = false;

    const isComboActive = (): boolean => ctrlHeld && shiftHeld && qHeld;

    window.addEventListener('keydown', (e) => {
      if (e.key === 'Control') ctrlHeld = true;
      if (e.key === 'Shift') shiftHeld = true;
      if (e.key === 'q' || e.key === 'Q') qHeld = true;
      if (isComboActive()) this.parentLock.startComboHold();
    }, { capture: true });

    window.addEventListener('keyup', (e) => {
      if (e.key === 'Control') ctrlHeld = false;
      if (e.key === 'Shift') shiftHeld = false;
      if (e.key === 'q' || e.key === 'Q') qHeld = false;
      if (!isComboActive()) this.parentLock.endComboHold();
    }, { capture: true });
  }
}
