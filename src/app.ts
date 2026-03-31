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
 *
 * Sprint 3 deliverables:
 *   - MouseTrail (sparkle particles following cursor)
 *   - ChaosMeter (escalating intensity based on input frequency)
 *   - ScreenShake (additive camera shake on hits)
 *   - MouseToolManager (5-tool click/drag destruction system)
 *
 * Sprint 4 deliverables:
 *   - ThemeSystem (5 desktop visual themes with weighted selection)
 *   - RebuildCycle (animated fade-to-white transition between rebuilds)
 *   - Input blocked during transitions (no hits against half-built desktop)
 */
import { Application, Text, TextStyle, Container } from 'pixi.js';
import { SafetyLimiter } from './core/safety-limiter';
import { InputManager } from './core/input/input-manager';
import { ParentLock } from './core/input/parent-lock';
import { AudioManager } from './audio/audio-manager';
import { ParticleManager } from './vfx/particle-manager';
import { SpriteParticles } from './vfx/sprite-particles';
import { DesktopManager } from './desktop/desktop-manager';
import { EffectRegistry } from './effects/effect-registry';
import { registerDestructionEffects } from './effects/destruction-effects';
import { registerDamageEffects, applyProgressiveDamage } from './effects/damage-effects';
import { MouseToolManager } from './mouse/mouse-tool-manager';
import { ChaosMeter } from './systems/chaos-meter';
import { ScreenShake } from './vfx/screen-shake';
import { MouseTrail } from './vfx/mouse-trail';
import { ThemeSystem } from './systems/theme-system';
import { ThemeLoader } from './systems/theme-loader';
import { RebuildCycle } from './systems/rebuild-cycle';
import { ToolIndicator } from './ui/tool-indicator';
import { TilePanelBuilder } from './ui/tile-panel';
import type { SoundType } from './types';

/** Milliseconds to wait after the last resize event before rebuilding the desktop. */
const RESIZE_DEBOUNCE_MS = 200;

export class DeskSmasherApp {
  private app: Application | null = null;
  private safetyLimiter!: SafetyLimiter;
  private inputManager!: InputManager;
  private audioManager!: AudioManager;
  private parentLock!: ParentLock;
  private particles!: ParticleManager;
  private spriteParticles!: SpriteParticles;
  private desktop!: DesktopManager;
  private destructionRegistry!: EffectRegistry;
  private damageRegistry!: EffectRegistry;
  private mouseTrail!: MouseTrail;
  private chaosMeter!: ChaosMeter;
  private screenShake!: ScreenShake;
  private mouseTools!: MouseToolManager;
  private themeLoader!: ThemeLoader;
  private themeSystem!: ThemeSystem;
  private rebuildCycle!: RebuildCycle;
  private toolIndicator!: ToolIndicator;
  private tilePanelBuilder!: TilePanelBuilder;
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

    // 6. Desktop Manager (depends on stage + screen dimensions)
    //    Created BEFORE particles so desktop renders underneath.
    //    NOTE: constructor no longer calls buildDesktop() — we do the first build
    //    below after the ThemeLoader is ready, so sprites are available immediately.
    //    Implements: desk-smasher-8l3 — no flash of un-themed desktop on startup.
    this.desktop = new DesktopManager(
      this.app.stage,
      this.app.screen.width,
      this.app.screen.height,
    );

    // 7. Particle Manager — AFTER desktop so particles render ON TOP.
    this.particles = new ParticleManager(this.app.stage, this.safetyLimiter);

    // 7b. Sprite Particle System — Kenney PNG sprites alongside Graphics particles.
    //     preload() runs concurrently; emit() silently no-ops until textures are ready.
    this.spriteParticles = new SpriteParticles(this.app.stage);
    void this.spriteParticles.preload();

    // 8. Effect registries — populated once, reused for every hit
    this.destructionRegistry = new EffectRegistry();
    registerDestructionEffects(this.destructionRegistry);

    this.damageRegistry = new EffectRegistry();
    registerDamageEffects(this.damageRegistry);

    // 9. Theme Loader — manages Kenney atlas loading for all 5 themes.
    //    Must be ready before ThemeSystem is created and before the first build.
    this.themeLoader = new ThemeLoader();
    await this.themeLoader.loadInitialTheme();
    console.log(
      `Theme loaded: ${this.themeLoader.currentTheme.name} | Icons: ${this.themeLoader.currentTheme.iconFrames.length}`,
    );

    // Theme System — delegates asset lifecycle to ThemeLoader, synthesises
    // the Theme interface consumed by DesktopManager and RebuildCycle.
    this.themeSystem = new ThemeSystem(this.themeLoader);

    // Wire ThemeLoader into DesktopManager so buildIcons() uses sprite textures,
    // then trigger the first build. This is the only build — no un-themed flash.
    // Implements: desk-smasher-8l3 — constructor deferred; first build is here.
    this.desktop.setThemeLoader(this.themeLoader);

    this.tilePanelBuilder = new TilePanelBuilder();
    await this.tilePanelBuilder.preload();
    this.desktop.setTilePanelBuilder(this.tilePanelBuilder);

    const initialTheme = this.themeSystem.currentTheme;
    this.desktop.rebuildWithTheme(initialTheme);

    // Start background preload of the next theme so the first rebuild is instant.
    void this.themeLoader.preloadNextTheme();

    // 10. Sync background colour to the desktop wallpaper palette
    this.syncBackground();

    // 11. UI layer — created before Sprint 3 systems so mouseTools can attach to it
    const uiLayer = new Container();
    uiLayer.label = 'ui';
    this.app.stage.addChild(uiLayer);

    // 12. Sprint 3 systems (in dependency order)

    // Mouse trail sits between desktop and particles in z-order; attaches to stage
    this.mouseTrail = new MouseTrail(this.app.stage);
    // Wire sprite particles so the trail emits star/circle/magic sprites every 3rd sparkle.
    // Implements: desk-smasher-d6e — sprite particle mouse trail.
    this.mouseTrail.setSpriteParticles(this.spriteParticles);

    // Chaos meter — stateless rolling window, no dependencies
    this.chaosMeter = new ChaosMeter();

    // Screen shake — applies offset to the stage container
    this.screenShake = new ScreenShake();

    // Mouse tools — lives in uiLayer so the cursor indicator is always on top
    this.mouseTools = new MouseToolManager(uiLayer, this.particles, this.audioManager);

    // Tool indicator — bottom-right corner, above taskbar
    this.toolIndicator = new ToolIndicator(uiLayer, this.app.screen.width, this.app.screen.height);

    // 13. Rebuild cycle — monitors destruction and drives animated theme transitions.
    //     Overlay is added to the stage so it renders above all desktop content.
    this.rebuildCycle = new RebuildCycle(
      this.desktop,
      this.themeSystem,
      this.app.stage,
      () => {
        // Called after the new desktop is built. RebuildCycle.updateRebuilding()
        // already advanced the theme via themeSystem.getNextTheme(). Preload the
        // next theme for the following rebuild, then re-sync background and clear
        // ephemeral state.
        void this.themeLoader.preloadNextTheme();
        console.log(
          `Theme rebuild: ${this.themeLoader.currentTheme.name} | Icons: ${this.themeLoader.currentTheme.iconFrames.length}`,
        );
        this.syncBackground();
        this.particles.clear();
        this.spriteParticles.clear();
        this.mouseTools.clearTrails();
      },
      this.safetyLimiter,
    );

    // 14. Wire input -> audio (Sprint 1: keypress = sound) and
    //     input -> destruction (Sprint 2: keypress/click = hit)
    //     + Sprint 3: chaos meter, screen shake, mouse tools
    let audioStarted = false;
    this.inputManager.onInput((event) => {
      // Skip input during animated rebuild transitions to avoid hitting a half-built desktop.
      if (this.rebuildCycle.isTransitioning) return;

      if (!audioStarted) {
        this.audioManager.ensureContext();
        void this.audioManager.preloadSounds(); // Background preload, no await needed
        audioStarted = true;
      }

      if (event.type === 'key' && event.keyCode) {
        this.audioManager.playForKey(event.keyCode);
        this.chaosMeter.recordInput();
        this.handleKeyboardHit();
      }

      if (event.type === 'click' && event.x !== undefined && event.y !== undefined) {
        this.chaosMeter.recordInput();
        this.handleMouseHit(event.x, event.y);
      }
    });

    // 15. Wire drag events to mouse tools
    this.inputManager.onDrag((x, y) => {
      if (this.rebuildCycle.isTransitioning) return;
      const result = this.mouseTools.applyDrag(x, y, this.desktop.elements);
      for (const el of result.hitElements) {
        if (!el.destroyed) this.hitElementToolAware(el);
      }
      // Implements desk-smasher-7cc: periodic wallpaper stamp + sound during drag.
      if (result.stamp) {
        this.desktop.crackWallpaper(result.stamp.x, result.stamp.y, this.mouseTools.currentTool);
        const sound: SoundType =
          DeskSmasherApp.TOOL_DRAG_SOUNDS[this.mouseTools.currentTool] ?? 'crack';
        this.audioManager.play(sound);
      }
    });

    this.inputManager.onDragEnd((x, y) => {
      this.mouseTools.onDragEnd(x, y, this.desktop.elements);
      this.mouseTools.resetDrag();
      // Drag does NOT cycle the tool — RMB cycles instead.
    });

    // 16. RMB — cycle to next tool with audio feedback. No destruction.
    this.inputManager.onRightClick((_x, _y) => {
      if (this.rebuildCycle.isTransitioning) return;
      this.mouseTools.cycleTool();
      this.toolIndicator.setTool(this.mouseTools.currentTool);
      this.audioManager.playToolSwitch();
    });

    // 18. Debounced resize — rebuild desktop when window dimensions settle
    window.addEventListener('resize', () => this.onWindowResize());

    const fpsStyle = new TextStyle({ fontSize: 10, fill: 0xffffff, fontFamily: 'monospace' });
    const fpsText = new Text({ text: 'FPS: 0', style: fpsStyle });
    fpsText.position.set(4, 4);
    fpsText.alpha = 0.4;
    fpsText.visible = false; // Hidden by default — backtick toggles
    uiLayer.addChild(fpsText);

    // Toggle FPS counter with backtick key (debug aid — not exposed to players).
    window.addEventListener('keydown', (e) => {
      if (e.key === '`') fpsText.visible = !fpsText.visible;
    });

    // 19. Game loop
    this.app.ticker.add((ticker) => {
      if (this.unlocked) return;
      const dt = ticker.deltaMS / 1000;

      this.parentLock.update();
      this.desktop.update(dt);
      this.particles.update(dt);
      this.spriteParticles.update(dt);
      this.mouseTrail.update(dt);
      this.chaosMeter.update();
      this.screenShake.update(this.app!.stage);
      this.rebuildCycle.update(dt);
      this.toolIndicator.update(dt);

      fpsText.text = `FPS: ${Math.round(ticker.FPS)} | Particles: ${this.particles.activeCount + this.spriteParticles.activeCount} | Destroyed: ${Math.round(this.desktop.destructionProgress * 100)}% | Chaos: ${this.chaosMeter.level}`;
    });

    console.log('Desk Smasher production build — Sprint 4');
    console.log('Press any key or click to smash the desktop.');
    console.log('Type "exit" or hold Ctrl+Shift+Q for 3 s to end the session.');
  }

  // ---------------------------------------------------------------------------
  // Destruction pipeline
  // ---------------------------------------------------------------------------

  /**
   * Handles a keyboard hit: targets a random alive element, records chaos,
   * applies a destruction or damage effect, and triggers chaos-scaled screen shake.
   */
  private handleKeyboardHit(): void {
    const element = this.desktop.getRandomAlive();
    if (!element) return;
    this.hitElement(element);

    const chaosLevel = this.chaosMeter.level;
    if (chaosLevel >= 1) {
      this.screenShake.trigger(2 + chaosLevel * 2);
    }
    if (chaosLevel >= 2) {
      // Extra particles at high chaos
      this.particles.emit(
        element.x + element.width / 2,
        element.y + element.height / 2,
        chaosLevel * 5,
        { speed: 200, gravity: 300, life: 0.5, scale: 0.8 },
      );
    }
  }

  /**
   * Handles a mouse click: routes through the active tool for AoE/extra-damage
   * effects, then falls back to wallpaper cracking on empty space.
   *
   * @param x - Canvas-space X coordinate of the click.
   * @param y - Canvas-space Y coordinate of the click.
   */
  private handleMouseHit(x: number, y: number): void {
    const target = this.desktop.getElementAt(x, y);
    if (target) {
      // Tool handles ALL visual/audio effects for mouse clicks.
      // hitElementToolAware only does health/impulse — no random effects.
      const toolResult = this.mouseTools.applyTool(x, y, target, this.desktop.elements);
      this.hitElementToolAware(target);
      for (let i = 0; i < toolResult.extraDamage; i++) {
        if (!target.destroyed) this.hitElementToolAware(target);
      }
      for (const aoeTarget of toolResult.aoeTargets) {
        if (!aoeTarget.destroyed) this.hitElementToolAware(aoeTarget);
      }
    } else {
      // Empty space — crack wallpaper + tool AoE
      // Sprite scorch particles replace Graphics circles for mouse hits.
      // Implements: desk-smasher-kz8 — replace Graphics particles with sprites for mouse.
      this.desktop.crackWallpaper(x, y, this.mouseTools.currentTool);
      this.spriteParticles.emit(x, y, 5, 'scorch');
      this.audioManager.play('crack');
      const toolResult = this.mouseTools.applyTool(x, y, null, this.desktop.elements);
      for (const aoeTarget of toolResult.aoeTargets) {
        if (!aoeTarget.destroyed) this.hitElementToolAware(aoeTarget);
      }
    }
  }

  /**
   * Tool-aware hit — for mouse clicks. Only does health decrement, impulse,
   * and sprite particles. The active tool handles all visual/audio effects
   * via applyTool(), so we don't add random registry effects on top.
   */
  /**
   * Maps each mouse tool to the SpriteParticles set used on full destruction.
   * Implements: desk-smasher-auk — tool-specific destruction particle sets.
   */
  private static readonly TOOL_DESTROY_PARTICLES: Record<string, string> = {
    hammer: 'slash',   // slash marks on impact
    laser:  'fire',    // burning
    bomb:   'flame',   // explosion flames
    freeze: 'magic',   // ice crystals
    magnet: 'twirl',   // swirling vortex
  };

  /**
   * Maps each mouse tool to the SpriteParticles set used on partial damage.
   * Implements: desk-smasher-auk — tool-specific damage particle sets.
   */
  private static readonly TOOL_DAMAGE_PARTICLES: Record<string, string> = {
    hammer: 'dirt',    // debris
    laser:  'spark',   // sparks
    bomb:   'smoke',   // smoke puff
    freeze: 'light',   // frost shimmer
    magnet: 'circle',  // energy rings
  };

  /**
   * Maps each mouse tool to a SoundType for the periodic drag stamp sound.
   * Implements: desk-smasher-7cc — wallpaper damage marks + sound during drag.
   */
  private static readonly TOOL_DRAG_SOUNDS: Record<string, SoundType> = {
    hammer: 'crack',
    laser:  'zap',
    bomb:   'pop',
    freeze: 'tinkle',
    magnet: 'vortex',
  };

  /**
   * Maps each mouse tool to a specific destruction effect name for consistent
   * visual identity. Hammer always shatters, bomb always explodes, etc.
   */
  private static readonly TOOL_EFFECT_MAP: Record<string, string> = {
    hammer: 'shatter',
    laser: 'pixelate',
    bomb: 'explode',
    freeze: 'shatter',
    magnet: 'vortex',
  };

  private hitElementToolAware(element: import('./types').DesktopElement): void {
    const container = this.desktop.getContainerForElement(element);
    if (!container) return;

    element.health--;
    const cx = element.x + element.width / 2;
    const cy = element.y + element.height / 2;

    // Resolve tool name once — used for both effect selection and particle sets.
    const toolName = this.mouseTools.currentTool;

    if (element.health <= 0) {
      element.health = 0;
      element.destroyed = true;

      // Use tool-specific destruction effect for consistent visual per tool
      const effectName = DeskSmasherApp.TOOL_EFFECT_MAP[toolName] || 'shatter';
      const effect = this.destructionRegistry.get(effectName)
        ?? this.destructionRegistry.getRandom();
      effect(element, container, this.particles, this.audioManager);

      // Tool-specific destruction particles — each tool has a visual identity.
      // Implements: desk-smasher-auk — tool-aware particle sets.
      const destroySet = DeskSmasherApp.TOOL_DESTROY_PARTICLES[toolName] || 'spark';
      this.spriteParticles.emit(cx, cy, 8, destroySet as import('./vfx/sprite-particles').ParticleSet);
    } else {
      // Tool-consistent damage: always use the same damage effect (shake)
      // rather than random registry picks that look like cycling
      const dmgEffect = this.damageRegistry.get('damageShake')
        ?? this.damageRegistry.getRandom();
      dmgEffect(element, container, this.particles, this.audioManager);
      applyProgressiveDamage(element, container);

      // Tool-specific damage particles — partial hit visual identity.
      // Implements: desk-smasher-auk — tool-aware particle sets.
      const damageSet = DeskSmasherApp.TOOL_DAMAGE_PARTICLES[toolName] || 'dirt';
      this.spriteParticles.emit(cx, cy, 3, damageSet as import('./vfx/sprite-particles').ParticleSet);
    }

    this.desktop.applyImpulse(element);
  }

  /**
   * Core destruction pipeline for a single element hit (keyboard path).
   * Decrements health, chooses a random effect from the registry, applies
   * impulse physics, and fires the visual + audio effect.
   *
   * @param element - The element to damage.
   */
  private hitElement(element: import('./types').DesktopElement): void {
    const container = this.desktop.getContainerForElement(element);
    if (!container) return;

    element.health--;

    const cx = element.x + element.width / 2;
    const cy = element.y + element.height / 2;

    if (element.health <= 0) {
      element.health = 0;
      element.destroyed = true;
      const effect = this.destructionRegistry.getRandom();
      effect(element, container, this.particles, this.audioManager);
      // Sprite-based destruction burst: sparks for satisfying visual pop
      this.spriteParticles.emit(cx, cy, 8, 'spark');
    } else {
      const dmgEffect = this.damageRegistry.getRandom();
      dmgEffect(element, container, this.particles, this.audioManager);
      applyProgressiveDamage(element, container);
      // Sprite-based damage hit: dirt chunks for tactile impact feel
      this.spriteParticles.emit(cx, cy, 3, 'dirt');
    }

    this.desktop.applyImpulse(element);
  }

  // ---------------------------------------------------------------------------
  // Desktop lifecycle helpers
  // ---------------------------------------------------------------------------

  /**
   * Syncs the PixiJS renderer background colour to the current desktop
   * wallpaper palette colour. Must be called after init and after every reset.
   */
  private syncBackground(): void {
    if (!this.app) return;
    this.app.renderer.background.color = this.themeLoader.currentTheme.wallpaperColor;
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
      this.toolIndicator.resize(this.app.screen.width, this.app.screen.height);
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
