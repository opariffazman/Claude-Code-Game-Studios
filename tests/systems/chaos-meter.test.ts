/**
 * Unit tests for ChaosMeter.
 *
 * Time-dependent behaviour is controlled via a deterministic
 * `performance.now()` mock. All tests follow Arrange / Act / Assert.
 *
 * Fake-time strategy:
 *   - `fakeNow` is the sole source of truth for the current timestamp.
 *   - `advanceTime(ms)` increments it and refreshes the spy in one call.
 *   - Tests that need events to stay in-window keep advances < WINDOW_MS.
 *   - Tests that need events to expire advance by >= WINDOW_MS + 1.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { ChaosMeter } from '../../src/systems/chaos-meter';
import { CHAOS_CONFIG } from '../../src/config';

// ---------------------------------------------------------------------------
// Fake-time helpers
// ---------------------------------------------------------------------------

let fakeNow = 0;

function advanceTime(ms: number): void {
  fakeNow += ms;
  vi.spyOn(performance, 'now').mockReturnValue(fakeNow);
}

/**
 * Record `count` inputs spaced 1 ms apart so they are distinct timestamps
 * but all within the current fake-time window.
 */
function recordInputs(meter: ChaosMeter, count: number): void {
  for (let i = 0; i < count; i++) {
    advanceTime(1);
    meter.recordInput();
  }
}

// ---------------------------------------------------------------------------
// Helpers derived from config so tests stay in sync with tuning changes
// ---------------------------------------------------------------------------

const WINDOW_S = CHAOS_CONFIG.WINDOW_MS / 1000;
const [T0, T1, T2] = CHAOS_CONFIG.LEVEL_THRESHOLDS;

/**
 * Minimum event count needed to reach the given EPS threshold inside the
 * rolling window (ceil so we always meet or exceed the threshold).
 */
function eventsForEPS(eps: number): number {
  return Math.ceil(eps * WINDOW_S);
}

// ---------------------------------------------------------------------------
// Suite setup
// ---------------------------------------------------------------------------

describe('ChaosMeter', () => {
  let meter: ChaosMeter;

  beforeEach(() => {
    fakeNow = 1000; // Non-zero base so cutoff arithmetic stays positive.
    vi.useFakeTimers();
    vi.spyOn(performance, 'now').mockReturnValue(fakeNow);
    meter = new ChaosMeter();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  // -------------------------------------------------------------------------
  // Level 0 — no inputs
  // -------------------------------------------------------------------------

  describe('level with no inputs', () => {
    it('returns 0 before any input is recorded', () => {
      // Arrange — fresh meter, no inputs.
      // Act
      meter.update();
      // Assert
      expect(meter.level).toBe(0);
    });

    it('eventsPerSecond is 0 with no inputs', () => {
      // Arrange / Act
      meter.update();
      // Assert
      expect(meter.eventsPerSecond).toBe(0);
    });
  });

  // -------------------------------------------------------------------------
  // Level transitions
  // -------------------------------------------------------------------------

  describe('level transitions', () => {
    it('transitions to level 1 when EPS reaches threshold 0', () => {
      // Arrange — enough events to just meet T0 EPS.
      recordInputs(meter, eventsForEPS(T0));
      // Act
      meter.update();
      // Assert
      expect(meter.level).toBeGreaterThanOrEqual(1);
    });

    it('transitions to level 2 when EPS reaches threshold 1', () => {
      // Arrange
      recordInputs(meter, eventsForEPS(T1));
      // Act
      meter.update();
      // Assert
      expect(meter.level).toBeGreaterThanOrEqual(2);
    });

    it('transitions to level 3 when EPS reaches threshold 2', () => {
      // Arrange
      recordInputs(meter, eventsForEPS(T2));
      // Act
      meter.update();
      // Assert
      expect(meter.level).toBe(3);
    });

    it('stays at level 0 when EPS is just below threshold 0', () => {
      // Arrange — one event fewer than needed for level 1.
      const needed = eventsForEPS(T0);
      recordInputs(meter, needed - 1);
      // Act
      meter.update();
      // Assert
      expect(meter.level).toBe(0);
    });
  });

  // -------------------------------------------------------------------------
  // Event expiry
  // -------------------------------------------------------------------------

  describe('event expiry after the rolling window', () => {
    it('drops to level 0 after events age out of the window', () => {
      // Arrange — record enough events to reach level 1.
      recordInputs(meter, eventsForEPS(T0));
      meter.update();
      expect(meter.level).toBeGreaterThanOrEqual(1); // Precondition.

      // Act — advance past the full rolling window so all events expire.
      advanceTime(CHAOS_CONFIG.WINDOW_MS + 1);
      meter.update();

      // Assert
      expect(meter.level).toBe(0);
    });

    it('only expires events older than WINDOW_MS, not newer ones', () => {
      // Arrange — record some events, let them expire, then record more.
      recordInputs(meter, eventsForEPS(T0));
      advanceTime(CHAOS_CONFIG.WINDOW_MS + 1); // First batch expires.
      recordInputs(meter, 1);                  // One fresh event.

      // Act
      meter.update();

      // Assert — EPS reflects only the single fresh event, not the old batch.
      expect(meter.eventsPerSecond).toBeLessThan(T0);
      expect(meter.level).toBe(0);
    });

    it('eventsPerSecond returns 0 after all events expire', () => {
      // Arrange
      recordInputs(meter, eventsForEPS(T0));
      advanceTime(CHAOS_CONFIG.WINDOW_MS + 1);

      // Act
      meter.update();

      // Assert
      expect(meter.eventsPerSecond).toBe(0);
    });
  });

  // -------------------------------------------------------------------------
  // reset()
  // -------------------------------------------------------------------------

  describe('reset()', () => {
    it('immediately clears all events and returns level 0', () => {
      // Arrange — reach a high level.
      recordInputs(meter, eventsForEPS(T2));
      meter.update();
      expect(meter.level).toBe(3); // Precondition.

      // Act
      meter.reset();
      meter.update();

      // Assert
      expect(meter.level).toBe(0);
    });

    it('sets eventsPerSecond to 0 after reset', () => {
      // Arrange
      recordInputs(meter, eventsForEPS(T1));
      meter.reset();

      // Act
      meter.update();

      // Assert
      expect(meter.eventsPerSecond).toBe(0);
    });

    it('is idempotent — resetting an already-empty meter does not throw', () => {
      // Arrange — meter with no events.
      // Act / Assert
      expect(() => {
        meter.reset();
        meter.reset();
      }).not.toThrow();
      expect(meter.level).toBe(0);
    });
  });
});
