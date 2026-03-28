/**
 * EffectRegistry — pluggable registration of destruction, damage, and
 * wallpaper effects. Consumers register handlers for each effect category;
 * the registry dispatches to all registered handlers.
 *
 * Decouples the caller (DesktopManager, systems) from specific effect
 * implementations, satisfying Open/Closed for new effect types.
 */
import type { DesktopElement } from '../types';

/** Handler called when an element is destroyed. */
export type DestructionHandler = (element: DesktopElement, x: number, y: number) => void;

/** Handler called when an element takes damage (but is not yet destroyed). */
export type DamageHandler = (element: DesktopElement, x: number, y: number) => void;

export class EffectRegistry {
  private destructionHandlers: DestructionHandler[] = [];
  private damageHandlers: DamageHandler[] = [];

  /**
   * Register a handler to be called on element destruction.
   * @param handler - Called with the destroyed element and impact position.
   */
  onDestruction(handler: DestructionHandler): void {
    this.destructionHandlers.push(handler);
  }

  /**
   * Register a handler to be called on element damage.
   * @param handler - Called with the damaged element and impact position.
   */
  onDamage(handler: DamageHandler): void {
    this.damageHandlers.push(handler);
  }

  /**
   * Dispatch a destruction event to all registered handlers.
   * @param element - The element that was destroyed.
   * @param x - Impact X in logical pixels.
   * @param y - Impact Y in logical pixels.
   */
  dispatchDestruction(element: DesktopElement, x: number, y: number): void {
    for (const handler of this.destructionHandlers) {
      handler(element, x, y);
    }
  }

  /**
   * Dispatch a damage event to all registered handlers.
   * @param element - The element that was damaged.
   * @param x - Impact X in logical pixels.
   * @param y - Impact Y in logical pixels.
   */
  dispatchDamage(element: DesktopElement, x: number, y: number): void {
    for (const handler of this.damageHandlers) {
      handler(element, x, y);
    }
  }
}
