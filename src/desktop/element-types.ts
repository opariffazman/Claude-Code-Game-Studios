/**
 * Element type definitions and static metadata for desktop elements.
 *
 * Separates data shape definitions from the factory and manager logic,
 * keeping this file importable by tests without pulling in PixiJS.
 */
import type { ElementType } from '../types';

/** Static metadata for an element type used by the factory. */
export interface ElementTypeConfig {
  readonly type: ElementType;
  /** Base width in logical pixels. */
  readonly width: number;
  /** Base height in logical pixels. */
  readonly height: number;
  /** Sample labels shown on the element. */
  readonly labels: readonly string[];
}

/** Registry of static configs for all element types. */
export const ELEMENT_TYPE_CONFIGS: Record<ElementType, ElementTypeConfig> = {
  icon: {
    type: 'icon',
    width: 64,
    height: 64,
    labels: ['My Computer', 'Recycle Bin', 'Documents', 'Music', 'Games', 'Trash'],
  },
  window: {
    type: 'window',
    width: 280,
    height: 180,
    labels: ['File Explorer', 'Notepad', 'Calculator', 'Paint', 'Task Manager'],
  },
  taskbar: {
    type: 'taskbar',
    width: 0, // Spans full screen width; set by DesktopManager at runtime.
    height: 48,
    labels: ['Taskbar'],
  },
  sticky: {
    type: 'sticky',
    width: 120,
    height: 100,
    labels: ['Buy milk!', 'TODO: fix bug', 'Call mom', 'Password: 1234'],
  },
  notification: {
    type: 'notification',
    width: 240,
    height: 60,
    labels: ['Update available', 'Low battery', 'You have mail', 'Virus detected!'],
  },
  widget: {
    type: 'widget',
    width: 160,
    height: 100,
    labels: ['Clock', 'Weather', 'Calendar'],
  },
};
