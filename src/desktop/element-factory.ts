/**
 * ElementFactory — creates DesktopElement data records from element type configs.
 *
 * Pure data factory: no PixiJS dependency. Display-object creation is the
 * responsibility of DesktopManager. This keeps the factory unit-testable
 * without a browser environment.
 */
import { DESKTOP_CONFIG } from '../config';
import { ELEMENT_TYPE_CONFIGS } from './element-types';
import type { DesktopElement, ElementType } from '../types';

let nextId = 0;

export class ElementFactory {
  /**
   * Create a DesktopElement record with default physics state.
   * @param type - The element type to create.
   * @param x - Initial X position (logical px).
   * @param y - Initial Y position (logical px).
   * @returns A fully initialised DesktopElement ready for the manager.
   */
  create(type: ElementType, x: number, y: number): DesktopElement {
    const config = ELEMENT_TYPE_CONFIGS[type];
    const health = DESKTOP_CONFIG.HEALTH[type];
    const labels = config.labels as string[];
    const label = labels[Math.floor(Math.random() * labels.length)];

    return {
      id: `el-${nextId++}`,
      type,
      label,
      health,
      maxHealth: health,
      destroyed: false,
      x,
      y,
      width: config.width,
      height: config.height,
      vx: 0,
      vy: 0,
      rotSpeed: 0,
    };
  }

  /**
   * Reset the internal ID counter. Useful in tests to produce deterministic IDs.
   */
  resetIdCounter(): void {
    nextId = 0;
  }
}
