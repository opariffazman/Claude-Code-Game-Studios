// PROTOTYPE - NOT FOR PRODUCTION
// Question: Is keyboard-mashing a fake desktop with destruction effects fun?
// Date: 2026-03-28

export type InputHandler = (type: 'key' | 'click', x: number, y: number, keyCode?: string) => void;
export type DragHandler = (x: number, y: number) => void;

// Keys to block from reaching the browser
const BLOCKED_KEYS = new Set([
  'Escape', 'F1', 'F2', 'F3', 'F4', 'F5', 'F6', 'F7', 'F8', 'F9', 'F10', 'F11', 'F12',
  'Tab', 'Meta', 'ContextMenu',
]);

export class InputCapture {
  private handlers: InputHandler[] = [];
  private keyListeners: ((key: string) => void)[] = [];
  private dragHandlers: DragHandler[] = [];
  private mouseDownHandlers: ((x: number, y: number) => void)[] = [];
  private mouseUpHandlers: (() => void)[] = [];
  private enabled = true;
  private heldKeys = new Set<string>();
  private isDragging = false;

  constructor(canvas: HTMLCanvasElement) {
    // Keyboard — only fire on fresh key press, not hold/repeat
    window.addEventListener('keydown', (e) => {
      e.preventDefault();
      e.stopPropagation();
      if (!this.enabled) return;

      // Anti-hold: skip if key is already held (e.repeat or tracked)
      if (e.repeat || this.heldKeys.has(e.code)) return;
      this.heldKeys.add(e.code);

      // Notify raw key listeners (for parent lock)
      for (const listener of this.keyListeners) {
        listener(e.key);
      }

      // Notify input handlers
      const cx = window.innerWidth / 2 + (Math.random() - 0.5) * window.innerWidth * 0.6;
      const cy = window.innerHeight / 2 + (Math.random() - 0.5) * window.innerHeight * 0.6;
      for (const handler of this.handlers) {
        handler('key', cx, cy, e.code);
      }
    }, { capture: true });

    // Release held key tracking
    window.addEventListener('keyup', (e) => {
      this.heldKeys.delete(e.code);
    }, { capture: true });

    // Block key combos
    window.addEventListener('keydown', (e) => {
      if (e.ctrlKey || e.metaKey) {
        if (e.shiftKey && e.key === 'Q') return;
        e.preventDefault();
      }
      if (BLOCKED_KEYS.has(e.key)) e.preventDefault();
    }, { capture: true });

    // Mouse click + drag start
    canvas.addEventListener('mousedown', (e) => {
      e.preventDefault();
      if (!this.enabled) return;
      this.isDragging = true;
      for (const handler of this.mouseDownHandlers) {
        handler(e.clientX, e.clientY);
      }
      for (const handler of this.handlers) {
        handler('click', e.clientX, e.clientY);
      }
    });

    canvas.addEventListener('mousemove', (e) => {
      e.preventDefault();
      if (!this.enabled || !this.isDragging) return;
      for (const handler of this.dragHandlers) {
        handler(e.clientX, e.clientY);
      }
    });

    // Mouse drag end — listen on window so releasing outside canvas is caught
    window.addEventListener('mouseup', () => {
      if (!this.isDragging) return;
      this.isDragging = false;
      for (const handler of this.mouseUpHandlers) {
        handler();
      }
    });

    // Block right-click context menu
    window.addEventListener('contextmenu', (e) => e.preventDefault());

    // Block beforeunload
    window.addEventListener('beforeunload', (e) => {
      if (this.enabled) {
        e.preventDefault();
        return '';
      }
    });
  }

  onInput(handler: InputHandler): void {
    this.handlers.push(handler);
  }

  onKeyRaw(listener: (key: string) => void): void {
    this.keyListeners.push(listener);
  }

  onDrag(handler: DragHandler): void { this.dragHandlers.push(handler); }
  onMouseDown(handler: (x: number, y: number) => void): void { this.mouseDownHandlers.push(handler); }
  onMouseUp(handler: () => void): void { this.mouseUpHandlers.push(handler); }

  disable(): void {
    this.enabled = false;
  }

  enable(): void {
    this.enabled = true;
  }
}
