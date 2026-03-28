/**
 * DesktopManager — orchestrates the desktop lifecycle: population, hit
 * detection, physics step, destruction, and rebuild scheduling.
 *
 * Owns the collection of active DesktopElements and coordinates with
 * ElementFactory for creation. PixiJS display-object management is
 * handled here as the rendering layer. Systems that need to react to
 * element events (effects, audio) receive callbacks via the constructor.
 */
import type { Container } from 'pixi.js';
import { DESKTOP_CONFIG } from '../config';
import { ElementFactory } from './element-factory';
import type { DesktopElement, ElementType, InputEvent } from '../types';

/** Callbacks for element lifecycle events. */
export interface DesktopCallbacks {
  onElementHit: (element: DesktopElement, x: number, y: number) => void;
  onElementDestroyed: (element: DesktopElement) => void;
  onAllDestroyed: () => void;
}

export class DesktopManager {
  private elements: DesktopElement[] = [];
  private readonly stage: Container;
  private readonly factory: ElementFactory;
  private readonly callbacks: DesktopCallbacks;

  /**
   * @param stage - PixiJS container to add/remove display objects.
   * @param factory - Element data factory.
   * @param callbacks - Lifecycle event hooks consumed by effect/audio systems.
   */
  constructor(stage: Container, factory: ElementFactory, callbacks: DesktopCallbacks) {
    this.stage = stage;
    this.factory = factory;
    this.callbacks = callbacks;
  }

  /**
   * Populate the desktop with a randomised set of elements.
   * Clears any existing elements first.
   * @param screenWidth - Canvas width in logical pixels.
   * @param screenHeight - Canvas height in logical pixels.
   */
  populate(screenWidth: number, screenHeight: number): void {
    this.clear();
    this.spawnRange('icon', DESKTOP_CONFIG.ICONS, screenWidth, screenHeight);
    this.spawnRange('window', DESKTOP_CONFIG.WINDOWS, screenWidth, screenHeight);
    this.spawnRange('sticky', DESKTOP_CONFIG.STICKIES, screenWidth, screenHeight);
    this.spawnRange('notification', DESKTOP_CONFIG.NOTIFICATIONS, screenWidth, screenHeight);
    this.spawnRange('widget', DESKTOP_CONFIG.WIDGETS, screenWidth, screenHeight);
  }

  /**
   * Process an input event: apply hit detection and damage to overlapping elements.
   * @param event - Normalised input event from InputManager.
   */
  handleInput(event: InputEvent): void {
    if (event.type === 'key') return; // Key hits are broadcast elsewhere
    for (const el of this.elements) {
      if (el.destroyed) continue;
      if (this.pointInElement(event.x, event.y, el)) {
        this.damageElement(el, event.x, event.y);
      }
    }
  }

  /**
   * Update physics (velocity + friction) for all live elements.
   * @param dt - Delta time in seconds (frame-rate independent).
   * @param screenWidth - Used to constrain elements to screen bounds.
   * @param screenHeight - Used to constrain elements to screen bounds.
   */
  update(dt: number, screenWidth: number, screenHeight: number): void {
    for (const el of this.elements) {
      if (el.destroyed) continue;
      el.x += el.vx * dt * 60;
      el.y += el.vy * dt * 60;
      el.vx *= DESKTOP_CONFIG.FRICTION;
      el.vy *= DESKTOP_CONFIG.FRICTION;

      if (Math.abs(el.vx) < DESKTOP_CONFIG.MIN_VELOCITY) el.vx = 0;
      if (Math.abs(el.vy) < DESKTOP_CONFIG.MIN_VELOCITY) el.vy = 0;

      el.x = Math.max(0, Math.min(screenWidth - el.width, el.x));
      el.y = Math.max(0, Math.min(screenHeight - el.height, el.y));
    }
  }

  /** Return a read-only snapshot of active elements for rendering. */
  getElements(): readonly DesktopElement[] {
    return this.elements;
  }

  // --- Private ---

  private spawnRange(
    type: ElementType,
    range: { min: number; max: number },
    screenWidth: number,
    screenHeight: number,
  ): void {
    const count = range.min + Math.floor(Math.random() * (range.max - range.min + 1));
    for (let i = 0; i < count; i++) {
      const x = Math.random() * (screenWidth - 100);
      const y = Math.random() * (screenHeight - DESKTOP_CONFIG.TASKBAR_HEIGHT - 100);
      this.elements.push(this.factory.create(type, x, y));
    }
  }

  private pointInElement(x: number, y: number, el: DesktopElement): boolean {
    return x >= el.x && x <= el.x + el.width && y >= el.y && y <= el.y + el.height;
  }

  private damageElement(el: DesktopElement, x: number, y: number): void {
    el.health -= 1;
    this.callbacks.onElementHit(el, x, y);

    if (el.health <= 0) {
      el.destroyed = true;
      this.callbacks.onElementDestroyed(el);
      this.checkAllDestroyed();
    }
  }

  private checkAllDestroyed(): void {
    const allGone = this.elements.every((el) => el.destroyed);
    if (allGone) {
      this.callbacks.onAllDestroyed();
    }
  }

  private clear(): void {
    this.elements = [];
    // TODO: remove PixiJS display objects from stage
  }
}
