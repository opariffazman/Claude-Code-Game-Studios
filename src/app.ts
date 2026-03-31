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
import { Application, Text, TextStyle, Container, Assets, NineSliceSprite, Texture } from 'pixi.js';
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
import { CelebrationEffect } from './vfx/celebration';
import { MouseTrail } from './vfx/mouse-trail';
import { ThemeSystem } from './systems/theme-system';
import { ThemeLoader } from './systems/theme-loader';
import { RebuildCycle } from './systems/rebuild-cycle';
import { ToolIndicator } from './ui/tool-indicator';
import { TilePanelBuilder, ADV_PANEL_DAMAGED } from './ui/tile-panel';
import { HealthDashboard } from './ui/health-dashboard';
import { ChaosStars } from './ui/chaos-stars';
import { RespawnManager } from './systems/respawn-manager';
import { CombatLog } from './ui/combat-log';
import { ToolCard } from './ui/tool-card';
import { ToolBag } from './ui/tool-bag';
import { TOOL_STATS } from './mouse/tool-stats';
import { MilestoneTracker } from './systems/milestone-tracker';
import { AchievementToast } from './ui/achievement-toast';
import { MilestoneBannerText } from './ui/milestone-banner-text';
import { LAYOUT_CONFIG } from './config';
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
  private celebration!: CelebrationEffect;
  private mouseTools!: MouseToolManager;
  private themeLoader!: ThemeLoader;
  private themeSystem!: ThemeSystem;
  private rebuildCycle!: RebuildCycle;
  private toolIndicator!: ToolIndicator;
  private tilePanelBuilder!: TilePanelBuilder;
  private healthDashboard!: HealthDashboard;
  private chaosStars!: ChaosStars;
  private respawnManager!: RespawnManager;
  private combatLog: CombatLog | null = null;
  private toolCard: ToolCard | null = null;
  private toolBag: ToolBag | null = null;
  /** Single-line centered text in the "Smash Goals" banner. Advances as hit milestones fire. */
  private _hitBanner: MilestoneBannerText | null = null;
  /** Single-line centered text in the "Animal Hunt" banner. Advances as animal milestones fire. */
  private _animalBanner: MilestoneBannerText | null = null;
  /** Single-line centered text in the "Chaos Mode" banner. Advances as chaos milestones fire. */
  private _chaosBanner: MilestoneBannerText | null = null;
  private milestoneTracker!: MilestoneTracker;
  private achievementToast!: AchievementToast;
  /** Cached content dimensions for the Tool Card window — needed by setTool() re-renders. */
  private _toolCardContentW = 0;
  private _toolCardContentH = 0;
  /** Cached content dimensions for the Tool Bag window — needed by setTool() re-renders. */
  private _toolBagContentW = 0;
  private _toolBagContentH = 0;
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

    // RespawnManager — hybrid individual + full-clear respawn system.
    // Instantiated after the first buildDesktop() so elements[] is populated.
    // Implements: desk-smasher-3xi — wire RespawnManager into destruction pipeline.
    this.respawnManager = new RespawnManager(
      // On individual element respawn: rebuild its visual and refresh the dashboard.
      (element) => {
        this.desktop.respawnElement(element);
        this.healthDashboard.onDamage(this.desktop.elements);
      },
      // On full clear: all damageable elements destroyed simultaneously → celebrate.
      // Implements: desk-smasher-y50 — show achievement toast + delay rebuild so
      // celebration particles are visible before the desktop transitions away.
      () => {
        this.celebration.fire(this.app!.screen.width, this.app!.screen.height);
        this.achievementToast?.show('TOTAL DESTRUCTION!');
        this.milestoneTracker.recordFullClear();
        // Delay rebuild 1.5 s so the celebration burst is visible before the
        // RebuildCycle fade-to-white transition overwrites the particles.
        setTimeout(() => {
          this.rebuildCycle.triggerCelebration();
        }, 1500);
      },
    );
    {
      const damageableCount = this.desktop.elements.filter(e => e.type !== 'taskbar').length;
      this.respawnManager.setTotalDamageable(damageableCount);
    }

    // Functional windows created after mouseTools is initialized (see below).

    // 10. Sync background colour to the desktop wallpaper palette
    this.syncBackground();

    // 11. UI layer — created before Sprint 3 systems so mouseTools can attach to it
    const uiLayer = new Container();
    uiLayer.label = 'ui';
    this.app.stage.addChild(uiLayer);

    // Achievement Toast + MilestoneTracker — fire-once callbacks for session milestones.
    // Implements: desk-smasher-3qy.11 / 3qy.12 — milestone tracking + toast rendering.
    // Implements: desk-smasher-517 — milestoneLog replaces MilestonePanel (banner is now
    // a destructible desktop element created in _createFunctionalWindows).
    this.achievementToast = new AchievementToast(uiLayer, this.app.screen.width);
    this.milestoneTracker = new MilestoneTracker((label) => {
      this.achievementToast.show(label);
      this.combatLog?.addEntry('\u2605', label, 'milestone');

      // Advance banner text to the next milestone goal when the current one fires.
      // Implements: desk-smasher-zh2 — dynamic single-line milestone banners.
      if (label.includes('10 Hits'))            this._hitBanner?.setText('50 Hit Combo!');
      if (label.includes('50 Hit'))             this._hitBanner?.setText('100 Hit Rampage!');
      if (label.includes('100 Hit'))            this._hitBanner?.setText('\u2605 100 Hit Rampage!');
      if (label.includes('First Animal'))       this._animalBanner?.setText('10 Animals Smashed!');
      if (label.includes('10 Animals'))         this._animalBanner?.setText('\u2605 All Animals Smashed!');
      if (label.includes('Getting Crazy'))      this._chaosBanner?.setText('MAX CHAOS!');
      if (label.includes('MAX CHAOS'))          this._chaosBanner?.setText('\u2605 TOTAL DESTRUCTION!');
      if (label.includes('Total Destruction'))  this._chaosBanner?.setText('\u2605 TOTAL DESTRUCTION!');
    });

    // Health dashboard — horizontal bars embedded in the taskbar.
    // The constructor parent arg is unused (bars live inside the taskbar container),
    // but the signature is kept for resize-path compatibility.
    // Implements: health-dashboard.md — centralized health display.
    // Implements: desk-smasher-v37 — horizontal bars in taskbar.
    this.healthDashboard = new HealthDashboard(uiLayer, this.app.screen.width, this.app.screen.height);
    await this.healthDashboard.preload();
    {
      const { w, h } = this.desktop.taskbarDimensions;
      this.healthDashboard.build(
        this.desktop.elements,
        this.desktop.taskbarContainer ?? uiLayer,
        w,
        h,
      );
    }

    // Chaos Stars — GTA-style wanted level in the taskbar tray area.
    // Implements: desk-smasher-rq8 — 5 stars, grey→yellow as chaos increases.
    this.chaosStars = new ChaosStars();
    await this.chaosStars.preload();
    {
      const { w: taskbarW, h: taskbarH } = this.desktop.taskbarDimensions;
      // 5 stars * (18 + 4) = 110px wide; leave 90px for clock on the right.
      const starX = taskbarW - 90 - 5 * (18 + 4);
      const starY = Math.round((taskbarH - 18) / 2);
      this.chaosStars.build(this.desktop.taskbarContainer ?? uiLayer, starX, starY);
    }

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

    // Celebration effect — full-clear particle payoff (depends on particles + screenShake)
    this.celebration = new CelebrationEffect(this.particles, this.spriteParticles, this.screenShake);

    // Mouse tools — lives in uiLayer so the cursor indicator is always on top
    this.mouseTools = new MouseToolManager(uiLayer, this.particles, this.audioManager);

    // Tool indicator — bottom-right corner, above taskbar
    this.toolIndicator = new ToolIndicator(uiLayer, this.app.screen.width, this.app.screen.height);

    // Create functional windows AFTER mouseTools so ToolCard/ToolBag can read currentTool.
    this._createFunctionalWindows();

    // Rebuild health dashboard AFTER functional windows so 'window' and
    // 'notification' elements created by _createFunctionalWindows() are
    // included in the pip group counts (red + blue pips).
    // Implements: desk-smasher-3eb — all three pip categories visible on start.
    {
      const { w, h } = this.desktop.taskbarDimensions;
      this.healthDashboard.build(
        this.desktop.elements,
        this.desktop.taskbarContainer ?? uiLayer,
        w,
        h,
      );
    }

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
        // Cancel any stale respawn timers from the previous desktop, then
        // re-count damageable elements for the freshly built desktop.
        // Implements: desk-smasher-3xi — respawn state reset on full rebuild.
        this.respawnManager.reset();
        {
          const newCount = this.desktop.elements.filter(e => e.type !== 'taskbar').length;
          this.respawnManager.setTotalDamageable(newCount);
        }
        // Re-wire chaos stars to the new taskbar container after rebuild.
        // Implements: desk-smasher-rq8 — stars survive desktop rebuilds.
        {
          const { w, h } = this.desktop.taskbarDimensions;
          const starX = w - 90 - 5 * (18 + 4);
          const starY = Math.round((h - 18) / 2);
          this.chaosStars.build(this.desktop.taskbarContainer ?? uiLayer, starX, starY);
        }
        // Re-create functional windows on the freshly built desktop.
        // Previous CombatLog/ToolCard/ToolBag instances are discarded;
        // createFunctionalWindow() registers new elements in the desktop's element list.
        this._createFunctionalWindows();
        // Reset dashboard AFTER functional windows so all element types
        // (window + notification) are counted in the pip groups.
        // Implements: desk-smasher-3eb — all three pip categories visible after rebuild.
        {
          const { w, h } = this.desktop.taskbarDimensions;
          this.healthDashboard.build(
            this.desktop.elements,
            this.desktop.taskbarContainer ?? uiLayer,
            w,
            h,
          );
        }
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
      // Sync Tool Card and Tool Bag windows to the newly selected tool.
      const tool = this.mouseTools.currentTool as import('./types').MouseToolType;
      this.toolCard?.setTool(tool, this._toolCardContentW, this._toolCardContentH);
      this.toolBag?.setTool(tool, this._toolBagContentW, this._toolBagContentH);
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
      this.chaosStars.update(this.chaosMeter.level);
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
      // Combat Log entry — wallpaper crack hit.
      this.combatLog?.addEntry(this.mouseTools.currentTool, 'wallpaper', 'wallpaper');
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
    if (element.type === 'taskbar') {
      // Shake the taskbar visually but don't damage it.
      // Implements: desk-smasher-6qe — taskbar shakes but is never destroyed.
      const tbContainer = this.desktop.getContainerForElement(element);
      if (tbContainer) {
        const origX = tbContainer.x;
        const origY = tbContainer.y;
        tbContainer.x += (Math.random() - 0.5) * 6;
        tbContainer.y += (Math.random() - 0.5) * 3;
        setTimeout(() => { tbContainer.x = origX; tbContainer.y = origY; }, 100);
        this.particles.emit(
          element.x + element.width / 2,
          element.y + element.height / 2,
          3,
          { speed: 80, gravity: 100, life: 0.3 },
        );
      }
      return;
    }
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

      // Update centralized health dashboard on destruction.
      // Implements: health-dashboard.md — aggregate health bars replace per-window bars.
      this.healthDashboard.onDamage(this.desktop.elements);
      // Notify respawn system — schedules individual timer or triggers full-clear.
      // Implements: desk-smasher-3xi — respawn wired into destruction pipeline.
      this.respawnManager.onDestroyed(element);
      // Combat Log entry — tool-aware mouse path.
      this.combatLog?.addEntry(toolName, element.label ?? element.type, 'destroyed');
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

      // Update centralized health dashboard.
      // Implements: health-dashboard.md — aggregate health bars replace per-window bars.
      this.healthDashboard.onDamage(this.desktop.elements);
      // Combat Log entry — tool-aware mouse path.
      this.combatLog?.addEntry(toolName, element.label ?? element.type, 'damage');

      // Damaged panel swap — when a window drops below 50% health, replace its
      // NineSliceSprite panel (child 0) with the cracked brown damaged variant.
      // Implements: desk-smasher-eqh — damaged panel variants for destruction progression.
      if (element.type === 'window' && element.health <= element.maxHealth * 0.5) {
        const damagedTex = Assets.get<Texture>(ADV_PANEL_DAMAGED);
        if (damagedTex && container.children[0] instanceof NineSliceSprite) {
          (container.children[0] as NineSliceSprite).texture = damagedTex;
        }
      }
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
    if (element.type === 'taskbar') {
      // Shake the taskbar visually but don't damage it.
      // Implements: desk-smasher-6qe — taskbar shakes but is never destroyed.
      const container = this.desktop.getContainerForElement(element);
      if (container) {
        const origX = container.x;
        const origY = container.y;
        container.x += (Math.random() - 0.5) * 6;
        container.y += (Math.random() - 0.5) * 3;
        setTimeout(() => { container.x = origX; container.y = origY; }, 100);
        this.particles.emit(
          element.x + element.width / 2,
          element.y + element.height / 2,
          3,
          { speed: 80, gravity: 100, life: 0.3 },
        );
      }
      return;
    }
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
      // Update centralized health dashboard on destruction.
      // Implements: health-dashboard.md — aggregate health bars replace per-window bars.
      this.healthDashboard.onDamage(this.desktop.elements);
      // Notify respawn system — schedules individual timer or triggers full-clear.
      // Implements: desk-smasher-3xi — respawn wired into destruction pipeline.
      this.respawnManager.onDestroyed(element);
      // Combat Log entry — keyboard path uses generic "key" tool label.
      this.combatLog?.addEntry('key', element.label ?? element.type, 'destroyed');
    } else {
      const dmgEffect = this.damageRegistry.getRandom();
      dmgEffect(element, container, this.particles, this.audioManager);
      applyProgressiveDamage(element, container);
      // Sprite-based damage hit: dirt chunks for tactile impact feel
      this.spriteParticles.emit(cx, cy, 3, 'dirt');
      // Update centralized health dashboard.
      // Implements: health-dashboard.md — aggregate health bars replace per-window bars.
      this.healthDashboard.onDamage(this.desktop.elements);
      // Combat Log entry — keyboard path uses generic "key" tool label.
      this.combatLog?.addEntry('key', element.label ?? element.type, 'damage');
    }

    this.desktop.applyImpulse(element);
  }

  /**
   * Creates the three functional overlay windows (Combat Log, Tool Card, Tool Bag)
   * using percentage-based positions relative to the current canvas dimensions.
   * Must be called after buildDesktop() and respawnManager are both ready.
   * Safe to call again on desktop rebuild — the previous instances are discarded
   * because createFunctionalWindow() registers new elements on the fresh desktop.
   */
  private _createFunctionalWindows(): void {
    if (!this.app) return;
    const sw = this.app.screen.width;
    const sh = this.app.screen.height;

    // Derive pixel bounds from the canonical WINDOW_ZONE so windows never
    // escape the playfield or overlap icons in the flanking zones.
    const zone = LAYOUT_CONFIG.WINDOW_ZONE;
    const zoneX = zone.x * sw;
    const zoneY = zone.y * sh;
    const zoneW = zone.w * sw;
    const zoneH = zone.h * sh;

    // Three windows arranged in a single row inside WINDOW_ZONE:
    //   [Combat Log]  [Tool Card]  [Tool Bag]
    //
    // desk-smasher-c3g: all windows are uniform squares.
    // Milestones moved to MilestonePanel (top-right banner stack on uiLayer).
    const gap = 15;
    const cellW = (zoneW - gap * 2) / 3;
    const squareSize = Math.round(Math.min(cellW, zoneH) * 0.9);

    const logW = squareSize;
    const logH = squareSize;
    const logX = Math.round(zoneX);
    const logY = Math.round(zoneY);

    const cardW = squareSize;
    const cardH = squareSize;
    const cardX = Math.round(zoneX + cellW + gap);
    const cardY = Math.round(zoneY);

    const bagW = squareSize;
    const bagH = squareSize;
    const bagX = Math.round(zoneX + (cellW + gap) * 2);
    const bagY = Math.round(zoneY);

    // -- Combat Log (left column)
    this.combatLog = new CombatLog();
    const clResult = this.desktop.createFunctionalWindow(
      'Combat Log', logX, logY, logW, logH,
      (newContainer) => {
        this.combatLog!.build(newContainer, 20, 40, logW - 40, logH - 55);
      },
    );
    if (clResult) {
      this.combatLog.build(clResult.container, 20, 40, logW - 40, logH - 55);
    }

    // -- Tool Card (center column, upper)
    const tcContentW = cardW - 40;
    const tcContentH = cardH - 55;
    this._toolCardContentW = tcContentW;
    this._toolCardContentH = tcContentH;
    this.toolCard = new ToolCard();
    const tcResult = this.desktop.createFunctionalWindow(
      'Tool Card', cardX, cardY, cardW, cardH,
      (newContainer) => {
        this.toolCard!.build(newContainer, 20, 40, tcContentW, tcContentH);
        this.toolCard!.setTool(
          this.mouseTools.currentTool as import('./types').MouseToolType,
          tcContentW,
          tcContentH,
        );
      },
    );
    if (tcResult) {
      this.toolCard.build(tcResult.container, 20, 40, tcContentW, tcContentH);
      this.toolCard.setTool(
        this.mouseTools.currentTool as import('./types').MouseToolType,
        tcContentW,
        tcContentH,
      );
    }

    // -- Tool Bag (center column, lower)
    const tbContentW = bagW - 40;
    const tbContentH = bagH - 55;
    this._toolBagContentW = tbContentW;
    this._toolBagContentH = tbContentH;
    this.toolBag = new ToolBag();
    const tbResult = this.desktop.createFunctionalWindow(
      'Tool Bag', bagX, bagY, bagW, bagH,
      (newContainer) => {
        this.toolBag!.build(newContainer, 20, 40, tbContentW, tbContentH);
        this.toolBag!.setTool(
          this.mouseTools.currentTool as import('./types').MouseToolType,
          tbContentW,
          tbContentH,
        );
      },
    );
    if (tbResult) {
      this.toolBag.build(tbResult.container, 20, 40, tbContentW, tbContentH);
      this.toolBag.setTool(
        this.mouseTools.currentTool as import('./types').MouseToolType,
        tbContentW,
        tbContentH,
      );
    }

    // -- 3 Milestone banners (top-right, stacked vertically, type='milestone' for blue pips)
    const mileW = Math.round(sw * 0.18);
    const mileH = Math.round(sh * 0.055);
    const mileX = Math.round(sw * 0.80);
    const mileGap = 8;
    const mlContentW = mileW - 30;
    const mlContentH = mileH - 12;

    // Banner 1: Hit milestones — shows current goal, advances as milestones fire.
    // Implements: desk-smasher-zh2 — single centered Text replacing CombatLog.
    const ml1Y = Math.round(sh * 0.02);
    const ml1 = this.desktop.createMilestoneBanner('Smash Goals', mileX, ml1Y, mileW, mileH);
    if (ml1) {
      this._hitBanner = new MilestoneBannerText(ml1.container, 5, 3, mlContentW, mlContentH, '10 Hits!');
    }

    // Banner 2: Animal milestones
    const ml2Y = ml1Y + mileH + mileGap;
    const ml2 = this.desktop.createMilestoneBanner('Animal Hunt', mileX, ml2Y, mileW, mileH);
    if (ml2) {
      this._animalBanner = new MilestoneBannerText(ml2.container, 5, 3, mlContentW, mlContentH, 'Smash an Animal!');
    }

    // Banner 3: Chaos milestones
    const ml3Y = ml2Y + mileH + mileGap;
    const ml3 = this.desktop.createMilestoneBanner('Chaos Mode', mileX, ml3Y, mileW, mileH);
    if (ml3) {
      this._chaosBanner = new MilestoneBannerText(ml3.container, 5, 3, mlContentW, mlContentH, 'Reach \u2605\u2605 Chaos!');
    }

  }

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
      // Re-wire to the new taskbar container (desktop.resize() recreates it).
      // Then snap fill widths to current health state.
      // Implements: desk-smasher-v37 — taskbar-embedded bars survive resize.
      {
        const { w, h } = this.desktop.taskbarDimensions;
        this.healthDashboard.build(
          this.desktop.elements,
          this.desktop.taskbarContainer ?? undefined,
          w,
          h,
        );
        this.healthDashboard.onDamage(this.desktop.elements);
        // Re-anchor chaos stars after resize rebuilds the taskbar container.
        // Implements: desk-smasher-rq8 — stars survive window resize.
        if (this.desktop.taskbarContainer) {
          const starX = w - 90 - 5 * (18 + 4);
          const starY = Math.round((h - 18) / 2);
          this.chaosStars.build(this.desktop.taskbarContainer, starX, starY);
        }
      }
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
