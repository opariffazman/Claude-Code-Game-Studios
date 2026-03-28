/**
 * Desktop Rebuild Cycle — monitors destruction progress and triggers
 * animated transitions between desktop states.
 *
 * When all elements are destroyed:
 * 1. Brief pause (celebration moment)         — 0.5 s  (state: celebrating)
 * 2. Fade-to-white flash transition           — 0.3 s  (state: fading_out)
 * 3. New desktop builds with next theme       — instant (state: rebuilding)
 * 4. Fade overlay back to transparent         — 0.3 s  (state: fading_in)
 * 5. Return to normal gameplay monitoring              (state: idle)
 *
 * Implements: Desktop Rebuild Cycle — animated transition (Desk Smasher design doc)
 *
 * PixiJS v8: uses Graphics method-chain API (.rect().fill()), container.alpha for fade.
 */
import { Container, Graphics } from 'pixi.js';
import type { DesktopManager } from '../desktop/desktop-manager';
import type { ThemeSystem } from './theme-system';
import type { SafetyLimiter } from '../core/safety-limiter';

// ---------------------------------------------------------------------------
// Configuration — tunable without touching logic
// ---------------------------------------------------------------------------

/** Duration of the celebration pause before fading out (seconds). */
const CELEBRATE_DURATION = 0.5;
/** Duration of the fade-out to white (seconds). */
const FADE_OUT_DURATION = 0.3;
/** Duration of the fade-in from white (seconds). */
const FADE_IN_DURATION = 0.3;

// ---------------------------------------------------------------------------
// State machine types
// ---------------------------------------------------------------------------

type RebuildState = 'idle' | 'celebrating' | 'fading_out' | 'rebuilding' | 'fading_in';

// ---------------------------------------------------------------------------
// RebuildCycle
// ---------------------------------------------------------------------------

export class RebuildCycle {
  private readonly desktopManager: DesktopManager;
  private readonly themeSystem: ThemeSystem;
  private readonly onRebuild: () => void;
  private readonly safety: SafetyLimiter;

  /** Fullscreen white overlay. Alpha is driven by the state machine. */
  private readonly overlay: Graphics;

  private _state: RebuildState = 'idle';
  /** Elapsed time within the current state (seconds). */
  private stateTimer = 0;

  /**
   * @param desktopManager - The active DesktopManager (queried for allDestroyed).
   * @param themeSystem    - The ThemeSystem used to select the next theme.
   * @param overlayParent  - PixiJS Container the overlay is added to (should be
   *                         the stage so it renders above all desktop content).
   * @param onRebuild      - Callback fired after the new desktop is built
   *                         (use to re-sync background color, clear particles, etc.).
   * @param safety         - SafetyLimiter used to gate the fade-to-white flash
   *                         against the WCAG photosensitivity budget.
   */
  constructor(
    desktopManager: DesktopManager,
    themeSystem: ThemeSystem,
    overlayParent: Container,
    onRebuild: () => void,
    safety: SafetyLimiter,
  ) {
    this.desktopManager = desktopManager;
    this.themeSystem = themeSystem;
    this.onRebuild = onRebuild;
    this.safety = safety;

    // Build the fullscreen white overlay at alpha 0 (invisible during normal play).
    // 10000x10000 with a -200 offset covers any screen size plus screen-shake camera offset.
    this.overlay = new Graphics()
      .rect(-200, -200, 10000, 10000)
      .fill({ color: 0xffffff, alpha: 1 });
    this.overlay.alpha = 0;
    this.overlay.label = 'rebuild-overlay';
    overlayParent.addChild(this.overlay);
  }

  // ---------------------------------------------------------------------------
  // Public API
  // ---------------------------------------------------------------------------

  /**
   * Must be called every frame from the game loop.
   * Advances the state machine and drives the fade overlay.
   *
   * @param dt - Delta time in seconds.
   */
  update(dt: number): void {
    switch (this._state) {
      case 'idle':
        this.updateIdle();
        break;
      case 'celebrating':
        this.updateCelebrating(dt);
        break;
      case 'fading_out':
        this.updateFadingOut(dt);
        break;
      case 'rebuilding':
        this.updateRebuilding();
        break;
      case 'fading_in':
        this.updateFadingIn(dt);
        break;
    }
  }

  /** True while any transition state is active (not idle). */
  get isTransitioning(): boolean {
    return this._state !== 'idle';
  }

  /** Aborts any in-progress transition and returns to idle. */
  reset(): void {
    this._state = 'idle';
    this.stateTimer = 0;
    this.overlay.alpha = 0;
  }

  // ---------------------------------------------------------------------------
  // State handlers
  // ---------------------------------------------------------------------------

  private updateIdle(): void {
    if (this.desktopManager.allDestroyed) {
      this.enterState('celebrating');
    }
  }

  private updateCelebrating(dt: number): void {
    this.stateTimer += dt;
    if (this.stateTimer >= CELEBRATE_DURATION) {
      if (!this.safety.canFlash()) {
        // Flash budget exhausted — skip the white flash and rebuild immediately.
        this.enterState('rebuilding');
        return;
      }
      this.safety.recordFlash();
      this.enterState('fading_out');
    }
  }

  private updateFadingOut(dt: number): void {
    this.stateTimer += dt;
    const progress = Math.min(this.stateTimer / FADE_OUT_DURATION, 1);
    this.overlay.alpha = progress;

    if (progress >= 1) {
      this.enterState('rebuilding');
    }
  }

  private updateRebuilding(): void {
    // Select the next theme and rebuild the desktop instantly
    const nextTheme = this.themeSystem.getNextTheme();
    this.desktopManager.rebuildWithTheme(nextTheme);
    this.onRebuild();
    this.enterState('fading_in');
  }

  private updateFadingIn(dt: number): void {
    this.stateTimer += dt;
    const progress = Math.min(this.stateTimer / FADE_IN_DURATION, 1);
    this.overlay.alpha = 1 - progress;

    if (progress >= 1) {
      this.overlay.alpha = 0;
      this.enterState('idle');
    }
  }

  // ---------------------------------------------------------------------------
  // Helpers
  // ---------------------------------------------------------------------------

  private enterState(next: RebuildState): void {
    this._state = next;
    this.stateTimer = 0;
  }
}
