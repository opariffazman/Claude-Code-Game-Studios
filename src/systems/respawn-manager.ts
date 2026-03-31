/**
 * RespawnManager — hybrid individual + full-clear respawn system.
 *
 * When an element is destroyed:
 * - Adds it to the respawn queue with a 3-5 second random delay
 * - After the delay, calls the onRespawn callback to rebuild the element
 *
 * When ALL damageable elements are in the queue simultaneously:
 * - Cancels all individual timers
 * - Calls the onFullClear callback for celebration + full rebuild
 *
 * The RespawnManager does not own the game loop; it uses plain setTimeout
 * for respawn delays. Call reset() to cancel all pending respawns (e.g.,
 * before a full desktop rebuild so stale timers cannot fire after new
 * elements have been created).
 *
 * Taskbar elements must NOT be passed to onDestroyed — they are immune to
 * destruction and are excluded from the damageable count.
 *
 * Usage:
 * ```typescript
 * const respawn = new RespawnManager(
 *   (el) => desktop.respawnElement(el),
 *   ()   => rebuildCycle.triggerCelebration(),
 * );
 * respawn.setTotalDamageable(desktop.elements.filter(e => e.type !== 'taskbar').length);
 *
 * // In hit pipeline, after element.destroyed is set to true:
 * respawn.onDestroyed(element);
 * ```
 */
import type { DesktopElement } from '../types';

export class RespawnManager {
  private _queue = new Map<string, ReturnType<typeof setTimeout>>();
  private _totalDamageable = 0;
  private _onRespawn: (element: DesktopElement) => void;
  private _onFullClear: () => void;

  /**
   * @param onRespawn  - Called when an individual element's respawn timer fires.
   *                     Receives the original DesktopElement whose visual should be rebuilt.
   * @param onFullClear - Called when all damageable elements are simultaneously destroyed.
   *                      All pending timers are cancelled before this fires.
   */
  constructor(
    onRespawn: (element: DesktopElement) => void,
    onFullClear: () => void,
  ) {
    this._onRespawn = onRespawn;
    this._onFullClear = onFullClear;
  }

  /**
   * Set the total number of damageable elements on the current desktop.
   * Must be updated after every full rebuild. Excludes taskbar elements.
   *
   * @param count - Total count of damageable (non-taskbar) elements.
   */
  setTotalDamageable(count: number): void {
    this._totalDamageable = count;
  }

  /**
   * Notify the manager that an element has been destroyed.
   *
   * If this destruction causes ALL damageable elements to be simultaneously
   * queued, the individual respawn is NOT scheduled — instead all pending
   * timers are cancelled and onFullClear is called immediately.
   *
   * If the element was already in the queue (re-destroyed before its respawn
   * fired), the previous timer is cancelled and a fresh one is started.
   *
   * @param element - The destroyed DesktopElement. Must have type !== 'taskbar'.
   */
  onDestroyed(element: DesktopElement): void {
    // Cancel any existing timer for this element (handles re-destroy before respawn).
    if (this._queue.has(element.id)) {
      clearTimeout(this._queue.get(element.id)!);
      // Remove it now so the size check below reflects the correct pending count.
      this._queue.delete(element.id);
    }

    // Check for full clear BEFORE scheduling individual respawn.
    // Adding this element would bring pending count to _totalDamageable.
    const willBeFull = this._totalDamageable > 0
      && this._queue.size + 1 >= this._totalDamageable;

    if (willBeFull) {
      // All elements are now destroyed — cancel remaining individual timers
      // and trigger the celebration + full rebuild path.
      this._cancelAll();
      this._onFullClear();
      return;
    }

    // Schedule individual respawn (8–12 seconds).
    const delay = 8000 + Math.random() * 4000;
    const timer = setTimeout(() => {
      this._queue.delete(element.id);
      this._onRespawn(element);
    }, delay);

    this._queue.set(element.id, timer);
  }

  /**
   * Cancel all pending respawn timers.
   * Call this before a full desktop rebuild so stale timers cannot fire
   * against the newly created element set.
   */
  reset(): void {
    this._cancelAll();
  }

  /**
   * Number of elements currently awaiting respawn.
   * Useful for debug displays and test assertions.
   */
  get pendingCount(): number {
    return this._queue.size;
  }

  private _cancelAll(): void {
    for (const timer of this._queue.values()) {
      clearTimeout(timer);
    }
    this._queue.clear();
  }
}
