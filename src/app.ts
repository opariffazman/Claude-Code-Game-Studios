/**
 * Main application class. Initializes PixiJS, creates all Sprint 1 systems
 * in dependency order, and runs the game loop.
 *
 * Sprint 1 deliverables wired here:
 *   - SafetyLimiter (foundation — must be first)
 *   - AudioManager (depends on SafetyLimiter)
 *   - InputManager (depends on canvas)
 *   - ParentLock (depends on InputManager)
 *   - Input -> Audio routing (keypress = sound)
 */
import { Application, Text, TextStyle, Container } from 'pixi.js';
import { SafetyLimiter } from './core/safety-limiter';
import { InputManager } from './core/input/input-manager';
import { ParentLock } from './core/input/parent-lock';
import { AudioManager } from './audio/audio-manager';

export class DeskSmasherApp {
  private app: Application | null = null;
  private safetyLimiter!: SafetyLimiter;
  private inputManager!: InputManager;
  private audioManager!: AudioManager;
  private parentLock!: ParentLock;
  private unlocked = false;

  /** Initialize PixiJS and all Sprint 1 game systems. */
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

    // 6. Wire input -> audio (Sprint 1 deliverable: keypress = sound).
    //    AudioContext must be created inside a user gesture; defer until first input.
    let audioStarted = false;
    this.inputManager.onInput((event) => {
      if (!audioStarted) {
        this.audioManager.ensureContext();
        audioStarted = true;
      }
      if (event.type === 'key' && event.keyCode) {
        this.audioManager.playForKey(event.keyCode);
      }
    });

    // 7. UI layer for debug / sprint info
    const uiLayer = new Container();
    uiLayer.label = 'ui';
    this.app.stage.addChild(uiLayer);

    const fpsStyle = new TextStyle({ fontSize: 10, fill: 0xffffff, fontFamily: 'monospace' });
    const fpsText = new Text({ text: 'FPS: 0', style: fpsStyle });
    fpsText.position.set(4, 4);
    fpsText.alpha = 0.4;
    uiLayer.addChild(fpsText);

    // 8. Game loop
    this.app.ticker.add((ticker) => {
      if (this.unlocked) return;
      this.parentLock.update();
      fpsText.text = `FPS: ${Math.round(ticker.FPS)} | Sprint 1 — Input + Audio`;
    });

    console.log('Desk Smasher production build — Sprint 1');
    console.log('Press any key to hear mapped sounds.');
    console.log('Type "exit" or hold Ctrl+Shift+Q for 3 s to end the session.');
  }

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
