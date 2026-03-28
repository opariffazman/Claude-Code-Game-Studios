/**
 * Input Manager — captures keyboard, mouse, and touch input.
 *
 * Implements: design/gdd/input-capture.md
 *
 * Blocks browser system shortcuts (best-effort).
 * Routes normalized InputEvents to subscribers.
 * Separates click (< DRAG_THRESHOLD_PX movement) from drag (>= threshold).
 * Anti-hold: key repeat events are ignored — must release and re-press.
 *
 * @example
 * ```ts
 * const input = new InputManager(app.canvas);
 * input.onInput((e) => console.log('input', e.type, e.key));
 * input.onDrag((x, y) => console.log('dragging to', x, y));
 * input.onDragEnd((x, y) => console.log('drag ended at', x, y));
 * input.onKeyRaw((key) => console.log('raw key', key));
 * // On teardown:
 * input.destroy();
 * ```
 */
import type { InputEvent } from '../../types';
import { INPUT_CONFIG } from '../../config';

/** Callback type for click/key input events. */
export type InputListener = (event: InputEvent) => void;

/** Callback type for drag position updates and drag-end. */
export type DragListener = (x: number, y: number) => void;

/** Callback type for raw key name events (e.g. parent lock). */
export type KeyRawListener = (key: string) => void;

/** Callback type for right-click events (tool cycling, no destruction). */
export type RightClickListener = (x: number, y: number) => void;

/** F-key codes that should be blocked */
const FKEY_CODES: ReadonlySet<string> = new Set([
  'F1','F2','F3','F4','F5','F6','F7','F8','F9','F10','F11','F12',
]);

/** Key codes blocked unconditionally */
const BLOCKED_CODES: ReadonlySet<string> = new Set([
  'Escape', 'Tab', 'Backspace', 'ContextMenu',
]);

/** Key codes blocked when Meta is held (Cmd on macOS) */
const META_BLOCKED_KEYS: ReadonlySet<string> = new Set(['q','w','h']);

/** Key codes blocked when Ctrl is held */
const CTRL_BLOCKED_KEYS: ReadonlySet<string> = new Set([
  'w','t','n','l','r',
]);

/** Ctrl+Shift combos that are blocked */
const CTRL_SHIFT_BLOCKED_KEYS: ReadonlySet<string> = new Set(['i']);

export class InputManager {
  private readonly canvas: HTMLCanvasElement;

  private readonly inputListeners: InputListener[] = [];
  private readonly dragListeners: DragListener[] = [];
  private readonly dragEndListeners: DragListener[] = [];
  private readonly keyRawListeners: KeyRawListener[] = [];
  private readonly rightClickListeners: RightClickListener[] = [];

  /** Keys currently held down — keyed by e.code */
  private readonly heldKeys: Set<string> = new Set();

  /** Whether input events are currently routed to subscribers */
  private enabled: boolean = true;

  // Drag/click state
  private pointerDown: boolean = false;
  private dragActive: boolean = false;
  private pointerStartX: number = 0;
  private pointerStartY: number = 0;

  // Bound listener references stored for destroy()
  private readonly _onKeyDown: (e: KeyboardEvent) => void;
  private readonly _onKeyUp: (e: KeyboardEvent) => void;
  private readonly _onMouseDown: (e: MouseEvent) => void;
  private readonly _onMouseMove: (e: MouseEvent) => void;
  private readonly _onMouseUp: (e: MouseEvent) => void;
  private readonly _onTouchStart: (e: TouchEvent) => void;
  private readonly _onTouchMove: (e: TouchEvent) => void;
  private readonly _onTouchEnd: (e: TouchEvent) => void;
  private readonly _onContextMenu: (e: MouseEvent) => void;
  private readonly _onWheel: (e: Event) => void;

  /**
   * Attaches all DOM event listeners to window (keyboard) and canvas
   * (pointer/touch). Call `destroy()` to remove them.
   *
   * @param canvas - The game canvas element to attach pointer listeners to.
   *
   * @example
   * ```ts
   * const input = new InputManager(app.canvas);
   * ```
   */
  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;

    // Bind all handlers once so we hold stable references for removeEventListener
    this._onKeyDown = this.handleKeyDown.bind(this);
    this._onKeyUp = this.handleKeyUp.bind(this);
    this._onMouseDown = this.handleMouseDown.bind(this);
    this._onMouseMove = this.handleMouseMove.bind(this);
    this._onMouseUp = this.handleMouseUp.bind(this);
    this._onTouchStart = this.handleTouchStart.bind(this);
    this._onTouchMove = this.handleTouchMove.bind(this);
    this._onTouchEnd = this.handleTouchEnd.bind(this);
    this._onContextMenu = (e: MouseEvent) => {
      // Always block the browser context menu (design doc §Core Rules).
      e.preventDefault();
      // Right click — cycle tool, no destruction.
      if (!this.enabled) return;
      for (const handler of this.rightClickListeners) {
        handler(e.clientX, e.clientY);
      }
    };
    this._onWheel = (e: Event) => e.preventDefault();

    // Keyboard on window with capture:true so we intercept before any element
    window.addEventListener('keydown', this._onKeyDown, { capture: true });
    window.addEventListener('keyup', this._onKeyUp, { capture: true });

    // Pointer events on canvas
    canvas.addEventListener('mousedown', this._onMouseDown);
    window.addEventListener('mousemove', this._onMouseMove);
    window.addEventListener('mouseup', this._onMouseUp);

    // Touch events on canvas
    canvas.addEventListener('touchstart', this._onTouchStart, { passive: false });
    canvas.addEventListener('touchmove', this._onTouchMove, { passive: false });
    canvas.addEventListener('touchend', this._onTouchEnd, { passive: false });

    // Block context menu and scroll
    canvas.addEventListener('contextmenu', this._onContextMenu);
    window.addEventListener('contextmenu', this._onContextMenu);
    canvas.addEventListener('wheel', this._onWheel, { passive: false });

    // Last-resort unload guard (design doc §Core Rules #4)
    window.onbeforeunload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      return '';
    };
  }

  /**
   * Register a callback to receive click and key input events.
   * Click events fire on mouseup/touchend when total pointer movement
   * was less than INPUT_CONFIG.DRAG_THRESHOLD_PX.
   * Key events fire on keydown (ignoring repeat and held keys).
   *
   * @param handler - Called with a normalized InputEvent on each qualifying input.
   *
   * @example
   * ```ts
   * input.onInput((e) => {
   *   if (e.type === 'key') triggerKeySmash(e.key!);
   *   if (e.type === 'click') triggerSmashAt(e.x, e.y);
   * });
   * ```
   */
  onInput(handler: (event: InputEvent) => void): void {
    this.inputListeners.push(handler);
  }

  /**
   * Register a callback to receive drag movement coordinates.
   * Fires on mousemove/touchmove once pointer movement has exceeded
   * INPUT_CONFIG.DRAG_THRESHOLD_PX from the initial down position.
   * Coordinates are canvas-relative pixels.
   *
   * @param handler - Called with (x, y) on each drag movement update.
   *
   * @example
   * ```ts
   * input.onDrag((x, y) => updateMouseTrailAt(x, y));
   * ```
   */
  onDrag(handler: (x: number, y: number) => void): void {
    this.dragListeners.push(handler);
  }

  /**
   * Register a callback that fires when a drag gesture ends (mouseup/touchend
   * after movement >= INPUT_CONFIG.DRAG_THRESHOLD_PX).
   * Coordinates are canvas-relative pixels of the release point.
   *
   * @param handler - Called with (x, y) at the drag release position.
   *
   * @example
   * ```ts
   * input.onDragEnd((x, y) => finalizeSmashAt(x, y));
   * ```
   */
  onDragEnd(handler: (x: number, y: number) => void): void {
    this.dragEndListeners.push(handler);
  }

  /**
   * Register a callback for raw key names on every valid keydown.
   * Fires before click/key routing, even on keys that are blocked from
   * browser defaults. Intended for the Parent Lock system.
   * Repeat events and already-held keys are still excluded.
   *
   * @param handler - Called with e.key (e.g. 'a', 'Enter', 'Escape').
   *
   * @example
   * ```ts
   * input.onKeyRaw((key) => parentLock.handleKey(key));
   * ```
   */
  onKeyRaw(handler: (key: string) => void): void {
    this.keyRawListeners.push(handler);
  }

  /**
   * Register a callback that fires on right-click (contextmenu event).
   * The browser context menu is always suppressed regardless of whether
   * any handlers are registered.
   * Coordinates are window-relative clientX/Y (not canvas-relative) so
   * the caller can use them for cursor feedback without needing to convert.
   * Does NOT fire during disabled state.
   *
   * @param handler - Called with (x, y) of the right-click position.
   *
   * @example
   * ```ts
   * input.onRightClick((x, y) => mouseTools.cycleTool());
   * ```
   */
  onRightClick(handler: RightClickListener): void {
    this.rightClickListeners.push(handler);
  }

  /**
   * Resume routing input events to subscribers.
   * Has no effect if already enabled.
   *
   * @example
   * ```ts
   * input.enable();
   * ```
   */
  enable(): void {
    this.enabled = true;
  }

  /**
   * Pause routing input events to subscribers.
   * DOM listeners remain attached; events are silently dropped.
   * Has no effect if already disabled.
   *
   * @example
   * ```ts
   * input.disable(); // pause during cutscene
   * ```
   */
  disable(): void {
    this.enabled = false;
  }

  /**
   * Remove all DOM event listeners attached by this instance.
   * Must be called when tearing down the app to avoid memory leaks.
   * After calling destroy(), no further events will be dispatched.
   *
   * @example
   * ```ts
   * input.destroy();
   * ```
   */
  destroy(): void {
    window.removeEventListener('keydown', this._onKeyDown, { capture: true });
    window.removeEventListener('keyup', this._onKeyUp, { capture: true });

    this.canvas.removeEventListener('mousedown', this._onMouseDown);
    window.removeEventListener('mousemove', this._onMouseMove);
    window.removeEventListener('mouseup', this._onMouseUp);

    this.canvas.removeEventListener('touchstart', this._onTouchStart);
    this.canvas.removeEventListener('touchmove', this._onTouchMove);
    this.canvas.removeEventListener('touchend', this._onTouchEnd);

    this.canvas.removeEventListener('contextmenu', this._onContextMenu);
    window.removeEventListener('contextmenu', this._onContextMenu);
    this.canvas.removeEventListener('wheel', this._onWheel);
  }

  /**
   * Backward-compatible alias used by ParentLock and any callers
   * that subscribed via the old addListener API.
   * Routes to onInput internally.
   *
   * @deprecated Use onInput() instead.
   */
  addListener(listener: InputListener): void {
    this.onInput(listener);
  }

  // ---------------------------------------------------------------------------
  // Private: keyboard
  // ---------------------------------------------------------------------------

  private handleKeyDown(e: KeyboardEvent): void {
    // Always prevent default browser behavior on key events (§Core Rules #2)
    e.preventDefault();
    e.stopPropagation();

    // Anti-hold: skip browser-generated repeat events and keys we already track
    if (e.repeat || this.heldKeys.has(e.code)) return;

    // Mark key as held so we can suppress future repeats even across browsers
    this.heldKeys.add(e.code);

    // Route raw key name BEFORE the enabled check so parent lock always works
    this.emitKeyRaw(e.key);

    if (!this.enabled) return;

    // Block system shortcuts — still prevent default above, just don't emit
    if (this.isBlockedShortcut(e)) return;

    this.emitInput({ type: 'key', x: 0, y: 0, keyCode: e.code, key: e.key });
  }

  private handleKeyUp(e: KeyboardEvent): void {
    e.preventDefault();
    e.stopPropagation();
    this.heldKeys.delete(e.code);
  }

  /**
   * Returns true if this keyboard event represents a shortcut that should be
   * consumed without producing a game input event.
   * Ctrl+Shift+Q is explicitly allowed through as the parent-lock combo.
   */
  private isBlockedShortcut(e: KeyboardEvent): boolean {
    const key = e.key.toLowerCase();
    const code = e.code;

    // F-keys
    if (FKEY_CODES.has(code)) return true;

    // Unconditionally blocked codes (Escape, Tab, Backspace, ContextMenu)
    if (BLOCKED_CODES.has(code)) return true;

    // Alt combos (Alt+F4 close window, Alt+Tab switch focus)
    if (e.altKey) return true;

    // Meta (Cmd) combos on macOS
    if (e.metaKey && META_BLOCKED_KEYS.has(key)) return true;

    // Ctrl combos — allow Ctrl+Shift+Q through for parent lock
    if (e.ctrlKey) {
      if (e.shiftKey && key === 'q') return false; // Explicitly allowed
      if (e.shiftKey && CTRL_SHIFT_BLOCKED_KEYS.has(key)) return true;
      if (CTRL_BLOCKED_KEYS.has(key)) return true;
    }

    return false;
  }

  // ---------------------------------------------------------------------------
  // Private: mouse
  // ---------------------------------------------------------------------------

  private handleMouseDown(e: MouseEvent): void {
    e.preventDefault();
    this.pointerDown = true;
    this.dragActive = false;
    const pos = this.canvasPos(e.clientX, e.clientY);
    this.pointerStartX = pos.x;
    this.pointerStartY = pos.y;
  }

  private handleMouseMove(e: MouseEvent): void {
    if (!this.pointerDown || !this.enabled) return;

    const pos = this.canvasPos(e.clientX, e.clientY);
    const dx = pos.x - this.pointerStartX;
    const dy = pos.y - this.pointerStartY;
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (dist >= INPUT_CONFIG.DRAG_THRESHOLD_PX) {
      this.dragActive = true;
      this.emitDrag(pos.x, pos.y);
    }
  }

  private handleMouseUp(e: MouseEvent): void {
    if (!this.pointerDown) return;
    this.pointerDown = false;

    if (!this.enabled) {
      this.dragActive = false;
      return;
    }

    const pos = this.canvasPos(e.clientX, e.clientY);

    if (this.dragActive) {
      this.emitDragEnd(pos.x, pos.y);
    } else {
      this.emitInput({ type: 'click', x: pos.x, y: pos.y });
    }

    this.dragActive = false;
  }

  // ---------------------------------------------------------------------------
  // Private: touch
  // ---------------------------------------------------------------------------

  private handleTouchStart(e: TouchEvent): void {
    e.preventDefault();
    const touch = e.changedTouches[0];
    if (!touch) return;

    this.pointerDown = true;
    this.dragActive = false;
    const pos = this.canvasPos(touch.clientX, touch.clientY);
    this.pointerStartX = pos.x;
    this.pointerStartY = pos.y;
  }

  private handleTouchMove(e: TouchEvent): void {
    e.preventDefault();
    if (!this.pointerDown || !this.enabled) return;

    const touch = e.changedTouches[0];
    if (!touch) return;

    const pos = this.canvasPos(touch.clientX, touch.clientY);
    const dx = pos.x - this.pointerStartX;
    const dy = pos.y - this.pointerStartY;
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (dist >= INPUT_CONFIG.DRAG_THRESHOLD_PX) {
      this.dragActive = true;
      this.emitDrag(pos.x, pos.y);
    }
  }

  private handleTouchEnd(e: TouchEvent): void {
    e.preventDefault();
    if (!this.pointerDown) return;
    this.pointerDown = false;

    if (!this.enabled) {
      this.dragActive = false;
      return;
    }

    const touch = e.changedTouches[0];
    if (!touch) {
      this.dragActive = false;
      return;
    }

    const pos = this.canvasPos(touch.clientX, touch.clientY);

    if (this.dragActive) {
      this.emitDragEnd(pos.x, pos.y);
    } else {
      this.emitInput({ type: 'touch', x: pos.x, y: pos.y });
    }

    this.dragActive = false;
  }

  // ---------------------------------------------------------------------------
  // Private: emission helpers
  // ---------------------------------------------------------------------------

  private emitInput(event: InputEvent): void {
    for (const handler of this.inputListeners) {
      handler(event);
    }
  }

  private emitDrag(x: number, y: number): void {
    for (const handler of this.dragListeners) {
      handler(x, y);
    }
  }

  private emitDragEnd(x: number, y: number): void {
    for (const handler of this.dragEndListeners) {
      handler(x, y);
    }
  }

  private emitKeyRaw(key: string): void {
    for (const handler of this.keyRawListeners) {
      handler(key);
    }
  }

  // ---------------------------------------------------------------------------
  // Private: coordinate helpers
  // ---------------------------------------------------------------------------

  /** Convert window-relative clientX/Y to canvas-relative coordinates. */
  private canvasPos(clientX: number, clientY: number): { x: number; y: number } {
    const rect = this.canvas.getBoundingClientRect();
    return { x: clientX - rect.left, y: clientY - rect.top };
  }
}
