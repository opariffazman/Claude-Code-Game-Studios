/**
 * Unit tests for InputManager.
 * Implements: design/gdd/input-capture.md — acceptance criteria
 *
 * Environment: jsdom (configured in vitest.config.ts)
 * All DOM events are dispatched on real HTMLCanvasElement / window instances.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { InputManager } from '../../../src/core/input/input-manager';
import type { InputEvent } from '../../../src/types';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Create a minimal HTMLCanvasElement with a usable getBoundingClientRect. */
function makeCanvas(): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = 800;
  canvas.height = 600;
  // jsdom's getBoundingClientRect returns all zeros by default; override so
  // canvas-relative coordinates are predictable (offset = 0,0).
  vi.spyOn(canvas, 'getBoundingClientRect').mockReturnValue({
    left: 0, top: 0, right: 800, bottom: 600,
    width: 800, height: 600, x: 0, y: 0,
    toJSON: () => ({}),
  });
  return canvas;
}

/** Fire a keydown event on window. */
function keydown(key: string, code: string, extra: Partial<KeyboardEventInit> = {}): void {
  window.dispatchEvent(new KeyboardEvent('keydown', { key, code, bubbles: true, ...extra }));
}

/** Fire a keyup event on window. */
function keyup(key: string, code: string): void {
  window.dispatchEvent(new KeyboardEvent('keyup', { key, code, bubbles: true }));
}

/** Fire mousedown, optional moves, then mouseup on the given canvas. */
function mouseClick(
  canvas: HTMLCanvasElement,
  downX: number, downY: number,
  upX: number = downX, upY: number = downY,
): void {
  canvas.dispatchEvent(new MouseEvent('mousedown', { clientX: downX, clientY: downY, bubbles: true }));
  window.dispatchEvent(new MouseEvent('mouseup', { clientX: upX, clientY: upY, bubbles: true }));
}

/** Fire mousedown + mousemove + mouseup to simulate a drag. */
function mouseDrag(
  canvas: HTMLCanvasElement,
  startX: number, startY: number,
  endX: number, endY: number,
): void {
  canvas.dispatchEvent(new MouseEvent('mousedown', { clientX: startX, clientY: startY, bubbles: true }));
  window.dispatchEvent(new MouseEvent('mousemove', { clientX: endX, clientY: endY, bubbles: true }));
  window.dispatchEvent(new MouseEvent('mouseup', { clientX: endX, clientY: endY, bubbles: true }));
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('InputManager', () => {
  let canvas: HTMLCanvasElement;
  let manager: InputManager;

  beforeEach(() => {
    canvas = makeCanvas();
    manager = new InputManager(canvas);
  });

  afterEach(() => {
    manager.destroy();
  });

  // -------------------------------------------------------------------------
  // 1. fires input event on keydown
  // -------------------------------------------------------------------------
  it('fires input event on keydown', () => {
    const events: InputEvent[] = [];
    manager.onInput((e) => events.push(e));

    keydown('a', 'KeyA');

    expect(events).toHaveLength(1);
    expect(events[0].type).toBe('key');
    expect(events[0].key).toBe('a');
    expect(events[0].keyCode).toBe('KeyA');
  });

  // -------------------------------------------------------------------------
  // 2. ignores key repeat events (anti-hold)
  // -------------------------------------------------------------------------
  it('ignores key repeat events (anti-hold)', () => {
    const events: InputEvent[] = [];
    manager.onInput((e) => events.push(e));

    // First press — should fire
    keydown('a', 'KeyA');
    // Browser-generated repeat (key still held)
    keydown('a', 'KeyA', { repeat: true });
    // Another repeat
    keydown('a', 'KeyA', { repeat: true });

    expect(events).toHaveLength(1);
  });

  // -------------------------------------------------------------------------
  // 3. fires input event after key release and re-press
  // -------------------------------------------------------------------------
  it('fires input event after key release and re-press', () => {
    const events: InputEvent[] = [];
    manager.onInput((e) => events.push(e));

    keydown('a', 'KeyA');   // press 1 → fires
    keyup('a', 'KeyA');     // release
    keydown('a', 'KeyA');   // press 2 → fires again

    expect(events).toHaveLength(2);
  });

  // -------------------------------------------------------------------------
  // 4. fires click event on short mousedown+mouseup (no movement)
  // -------------------------------------------------------------------------
  it('fires click event on short mousedown+mouseup', () => {
    const events: InputEvent[] = [];
    manager.onInput((e) => events.push(e));

    mouseClick(canvas, 100, 150);

    expect(events).toHaveLength(1);
    expect(events[0].type).toBe('click');
    expect(events[0].x).toBe(100);
    expect(events[0].y).toBe(150);
  });

  // -------------------------------------------------------------------------
  // 5. fires drag events on mousedown+mousemove+mouseup
  // -------------------------------------------------------------------------
  it('fires drag events on mousedown+mousemove+mouseup', () => {
    const inputEvents: InputEvent[] = [];
    const dragPositions: Array<{ x: number; y: number }> = [];
    const dragEndPositions: Array<{ x: number; y: number }> = [];

    manager.onInput((e) => inputEvents.push(e));
    manager.onDrag((x, y) => dragPositions.push({ x, y }));
    manager.onDragEnd((x, y) => dragEndPositions.push({ x, y }));

    // Move 20px horizontally — well past the 5px threshold
    mouseDrag(canvas, 100, 100, 120, 100);

    // No click event should fire — it was a drag
    const clickEvents = inputEvents.filter((e) => e.type === 'click');
    expect(clickEvents).toHaveLength(0);

    // onDrag should have fired during mousemove
    expect(dragPositions).toHaveLength(1);
    expect(dragPositions[0]).toEqual({ x: 120, y: 100 });

    // onDragEnd should fire on mouseup
    expect(dragEndPositions).toHaveLength(1);
    expect(dragEndPositions[0]).toEqual({ x: 120, y: 100 });
  });

  // -------------------------------------------------------------------------
  // 6. does not fire events when disabled
  // -------------------------------------------------------------------------
  it('does not fire events when disabled', () => {
    const inputEvents: InputEvent[] = [];
    const dragPositions: Array<{ x: number; y: number }> = [];
    const dragEndPositions: Array<{ x: number; y: number }> = [];

    manager.onInput((e) => inputEvents.push(e));
    manager.onDrag((x, y) => dragPositions.push({ x, y }));
    manager.onDragEnd((x, y) => dragEndPositions.push({ x, y }));

    manager.disable();

    keydown('a', 'KeyA');
    mouseClick(canvas, 50, 50);
    mouseDrag(canvas, 0, 0, 100, 100);

    expect(inputEvents).toHaveLength(0);
    expect(dragPositions).toHaveLength(0);
    expect(dragEndPositions).toHaveLength(0);
  });

  // -------------------------------------------------------------------------
  // 7. onKeyRaw receives raw key names
  // -------------------------------------------------------------------------
  it('onKeyRaw receives raw key names', () => {
    const rawKeys: string[] = [];
    manager.onKeyRaw((key) => rawKeys.push(key));

    keydown('a', 'KeyA');
    keyup('a', 'KeyA');
    keydown('Enter', 'Enter');

    expect(rawKeys).toEqual(['a', 'Enter']);
  });

  it('onKeyRaw still fires when manager is disabled', () => {
    const rawKeys: string[] = [];
    manager.onKeyRaw((key) => rawKeys.push(key));

    manager.disable();
    keydown('e', 'KeyE');

    // Parent lock must receive keys even while game is suspended
    expect(rawKeys).toEqual(['e']);
  });

  // -------------------------------------------------------------------------
  // 8. destroy removes all listeners
  // -------------------------------------------------------------------------
  it('destroy removes all listeners', () => {
    const inputEvents: InputEvent[] = [];
    const rawKeys: string[] = [];

    manager.onInput((e) => inputEvents.push(e));
    manager.onKeyRaw((k) => rawKeys.push(k));

    manager.destroy();

    keydown('a', 'KeyA');
    mouseClick(canvas, 50, 50);

    expect(inputEvents).toHaveLength(0);
    expect(rawKeys).toHaveLength(0);
  });

  // -------------------------------------------------------------------------
  // Bonus: movement below threshold does not trigger drag (fires click instead)
  // -------------------------------------------------------------------------
  it('movement below threshold fires click, not drag', () => {
    const inputEvents: InputEvent[] = [];
    const dragPositions: Array<{ x: number; y: number }> = [];

    manager.onInput((e) => inputEvents.push(e));
    manager.onDrag((x, y) => dragPositions.push({ x, y }));

    // Move only 3px — below the 5px DRAG_THRESHOLD_PX
    mouseDrag(canvas, 100, 100, 103, 100);

    expect(dragPositions).toHaveLength(0);
    expect(inputEvents.filter((e) => e.type === 'click')).toHaveLength(1);
  });

  // -------------------------------------------------------------------------
  // Bonus: enable/disable can be toggled
  // -------------------------------------------------------------------------
  it('re-enable after disable resumes event routing', () => {
    const events: InputEvent[] = [];
    manager.onInput((e) => events.push(e));

    manager.disable();
    keydown('a', 'KeyA');
    keyup('a', 'KeyA');
    expect(events).toHaveLength(0);

    manager.enable();
    keydown('a', 'KeyA');
    expect(events).toHaveLength(1);
  });
});
