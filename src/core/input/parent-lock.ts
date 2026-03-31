/**
 * ParentLock — allows parents to exit the toy by typing a keyword or
 * holding a key combo for a configured duration.
 *
 * Implements: design/gdd/input-capture.md — Parent Lock section
 *
 * Two independent unlock methods:
 *   1. Keyword: type INPUT_CONFIG.UNLOCK_KEYWORD within KEYWORD_TIMEOUT_MS.
 *   2. Combo hold: call startComboHold() when the combo is detected; call
 *      endComboHold() when any key in the combo is released. If the combo
 *      is held for at least COMBO_HOLD_MS, the next update() tick fires exit.
 *
 * Listens to InputManager raw key events; calls the provided exit callback
 * when either unlock condition is met. Does not depend on any game state.
 *
 * @example
 * ```ts
 * const lock = new ParentLock(inputManager, () => endSession());
 *
 * // In keydown handler for Ctrl+Shift+Q:
 * lock.startComboHold();
 * // In keyup handler when any combo key releases:
 * lock.endComboHold();
 *
 * // In game loop:
 * lock.update();
 * ```
 */
import { INPUT_CONFIG } from '../../config';
import type { InputManager } from './input-manager';

export class ParentLock {
  private buffer = '';
  private bufferTimer: ReturnType<typeof setTimeout> | null = null;
  private readonly onExit: () => void;

  /** Timestamp (performance.now) when the combo hold began, or null if not held. */
  private comboHoldStart: number | null = null;
  /** Whether the exit has already been triggered (prevents double-firing). */
  private exited = false;

  /**
   * @param inputManager - Source of raw key events; onKeyRaw is registered here.
   * @param onExit - Called exactly once when either unlock condition is satisfied.
   */
  constructor(inputManager: InputManager, onExit: () => void) {
    this.onExit = onExit;
    inputManager.onKeyRaw(this.handleKey);
  }

  // --- Public: combo hold ---

  /**
   * Signal that the unlock combo (e.g. Ctrl+Shift+Q) is currently being held.
   * Call this from your keydown handler whenever all combo keys are pressed.
   * If a hold is already in progress this is a no-op.
   *
   * @example
   * ```ts
   * if (ctrlHeld && shiftHeld && qHeld) lock.startComboHold();
   * ```
   */
  startComboHold(): void {
    if (this.comboHoldStart === null) {
      this.comboHoldStart = performance.now();
    }
  }

  /**
   * Signal that the unlock combo has been broken (any key released).
   * Resets the hold timer so the countdown starts fresh on the next
   * complete combo press.
   *
   * @example
   * ```ts
   * lock.endComboHold();
   * ```
   */
  endComboHold(): void {
    this.comboHoldStart = null;
  }

  /**
   * Must be called each game-loop tick. Checks whether the combo has been
   * held for at least INPUT_CONFIG.COMBO_HOLD_MS and fires exit if so.
   *
   * @example
   * ```ts
   * this.app.ticker.add(() => { lock.update(); });
   * ```
   */
  update(): void {
    if (this.exited || this.comboHoldStart === null) return;
    const elapsed = performance.now() - this.comboHoldStart;
    if (elapsed >= INPUT_CONFIG.COMBO_HOLD_MS) {
      this.triggerExit();
    }
  }

  // --- Private ---

  private readonly handleKey = (key: string): void => {
    if (this.exited) return;

    // Non-printable / modifier keys (length > 1, e.g. 'Shift', 'Enter', 'F1')
    // do not contribute to the keyword buffer.
    if (key.length > 1) return;

    this.resetBufferTimer();
    this.buffer += key.toLowerCase();

    if (this.buffer.includes(INPUT_CONFIG.UNLOCK_KEYWORD)) {
      this.buffer = '';
      this.triggerExit();
    }
  };

  private resetBufferTimer(): void {
    if (this.bufferTimer !== null) {
      clearTimeout(this.bufferTimer);
    }
    this.bufferTimer = setTimeout(() => {
      this.buffer = '';
      this.bufferTimer = null;
    }, INPUT_CONFIG.KEYWORD_TIMEOUT_MS);
  }

  private triggerExit(): void {
    if (this.exited) return;
    this.exited = true;
    if (this.bufferTimer !== null) {
      clearTimeout(this.bufferTimer);
      this.bufferTimer = null;
    }
    this.onExit();
  }
}
