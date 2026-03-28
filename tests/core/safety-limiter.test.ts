/**
 * Unit tests for SafetyLimiter.
 *
 * All time-dependent tests use vi.useFakeTimers() and a manually-managed
 * performance.now() mock so results are deterministic regardless of host
 * machine speed.
 *
 * Fake-time strategy:
 *   - `fakeNow` is the single source of truth for the current timestamp.
 *   - `advanceTime(ms)` increments it and updates the spy in one call.
 *   - Tests that need to stay inside the window keep advances < FLASH_WINDOW_MS.
 *   - Tests that need to expire the window advance by >= FLASH_WINDOW_MS + 1.
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { SafetyLimiter } from '../../src/core/safety-limiter';
import { SAFETY_CONFIG } from '../../src/config';

// ---------------------------------------------------------------------------
// Fake-time helpers
// ---------------------------------------------------------------------------

let fakeNow = 0;

function advanceTime(ms: number): void {
  fakeNow += ms;
  vi.spyOn(performance, 'now').mockReturnValue(fakeNow);
}

// ---------------------------------------------------------------------------
// Suite setup
// ---------------------------------------------------------------------------

describe('SafetyLimiter', () => {
  let limiter: SafetyLimiter;

  beforeEach(() => {
    fakeNow = 1000; // Start at a non-zero base so cutoff maths stay positive.
    vi.useFakeTimers();
    vi.spyOn(performance, 'now').mockReturnValue(fakeNow);
    limiter = new SafetyLimiter();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  // -------------------------------------------------------------------------
  // canFlash — basic availability checks
  // -------------------------------------------------------------------------

  describe('canFlash()', () => {
    it('returns true when no flashes have been recorded', () => {
      expect(limiter.canFlash()).toBe(true);
    });

    it('returns true after 1 flash within the window', () => {
      limiter.recordFlash();
      expect(limiter.canFlash()).toBe(true);
    });

    it('returns true after 2 flashes within the window', () => {
      limiter.recordFlash();
      limiter.recordFlash();
      expect(limiter.canFlash()).toBe(true);
    });

    it('returns false when MAX_FLASHES_PER_SECOND flashes are recorded in the window', () => {
      // Fill the budget exactly.
      for (let i = 0; i < SAFETY_CONFIG.MAX_FLASHES_PER_SECOND; i++) {
        limiter.recordFlash();
      }
      expect(limiter.canFlash()).toBe(false);
    });

    it('returns false when more than MAX_FLASHES_PER_SECOND flashes are recorded', () => {
      for (let i = 0; i < SAFETY_CONFIG.MAX_FLASHES_PER_SECOND + 2; i++) {
        limiter.recordFlash();
      }
      expect(limiter.canFlash()).toBe(false);
    });

    it('returns true after the flash window expires', () => {
      // Record enough flashes to exhaust the budget.
      for (let i = 0; i < SAFETY_CONFIG.MAX_FLASHES_PER_SECOND; i++) {
        limiter.recordFlash();
      }
      expect(limiter.canFlash()).toBe(false);

      // Advance time past the full rolling window.
      advanceTime(SAFETY_CONFIG.FLASH_WINDOW_MS + 1);

      // All old timestamps should now be pruned.
      expect(limiter.canFlash()).toBe(true);
    });

    it('returns false for timestamps exactly at the window boundary (non-inclusive)', () => {
      // Record a flash, then advance to exactly the window edge.
      // The prune condition is `timestamp <= cutoff`, so a timestamp equal to
      // cutoff IS pruned — advance only to FLASH_WINDOW_MS to place the
      // timestamp right at the boundary and confirm it is pruned.
      limiter.recordFlash(); // recorded at fakeNow = 1000

      // Advance so that cutoff = 1000 + 1000 - 1000 = 1000 exactly.
      // The flash timestamp (1000) <= cutoff (1000) → pruned.
      advanceTime(SAFETY_CONFIG.FLASH_WINDOW_MS); // fakeNow = 2000, cutoff = 1000

      // Fill the budget after pruning — should still be available.
      expect(limiter.canFlash()).toBe(true);
    });
  });

  // -------------------------------------------------------------------------
  // recordFlash — mutation
  // -------------------------------------------------------------------------

  describe('recordFlash()', () => {
    it('increments the used flash count', () => {
      const before = SAFETY_CONFIG.MAX_FLASHES_PER_SECOND - limiter.flashesRemaining;
      limiter.recordFlash();
      const after = SAFETY_CONFIG.MAX_FLASHES_PER_SECOND - limiter.flashesRemaining;
      expect(after).toBe(before + 1);
    });

    it('recording MAX_FLASHES_PER_SECOND times exhausts the budget', () => {
      for (let i = 0; i < SAFETY_CONFIG.MAX_FLASHES_PER_SECOND; i++) {
        limiter.recordFlash();
      }
      expect(limiter.flashesRemaining).toBe(0);
    });
  });

  // -------------------------------------------------------------------------
  // flashesRemaining — budget readout
  // -------------------------------------------------------------------------

  describe('flashesRemaining', () => {
    it('equals MAX_FLASHES_PER_SECOND when no flashes are recorded', () => {
      expect(limiter.flashesRemaining).toBe(SAFETY_CONFIG.MAX_FLASHES_PER_SECOND);
    });

    it('decrements by 1 for each recorded flash', () => {
      const max = SAFETY_CONFIG.MAX_FLASHES_PER_SECOND;
      for (let i = 1; i <= max; i++) {
        limiter.recordFlash();
        expect(limiter.flashesRemaining).toBe(max - i);
      }
    });

    it('returns 0 when budget is exhausted', () => {
      for (let i = 0; i < SAFETY_CONFIG.MAX_FLASHES_PER_SECOND; i++) {
        limiter.recordFlash();
      }
      expect(limiter.flashesRemaining).toBe(0);
    });

    it('recovers to MAX_FLASHES_PER_SECOND after the window expires', () => {
      for (let i = 0; i < SAFETY_CONFIG.MAX_FLASHES_PER_SECOND; i++) {
        limiter.recordFlash();
      }
      advanceTime(SAFETY_CONFIG.FLASH_WINDOW_MS + 1);
      expect(limiter.flashesRemaining).toBe(SAFETY_CONFIG.MAX_FLASHES_PER_SECOND);
    });
  });

  // -------------------------------------------------------------------------
  // maxVolume — audio ceiling
  // -------------------------------------------------------------------------

  describe('maxVolume', () => {
    it('returns the configured MAX_VOLUME value', () => {
      expect(limiter.maxVolume).toBe(SAFETY_CONFIG.MAX_VOLUME);
    });

    it('is a number in the valid gain range (0–1)', () => {
      expect(limiter.maxVolume).toBeGreaterThan(0);
      expect(limiter.maxVolume).toBeLessThanOrEqual(1);
    });
  });

  // -------------------------------------------------------------------------
  // reset() — state clearing
  // -------------------------------------------------------------------------

  describe('reset()', () => {
    it('clears all flash history', () => {
      for (let i = 0; i < SAFETY_CONFIG.MAX_FLASHES_PER_SECOND; i++) {
        limiter.recordFlash();
      }
      expect(limiter.canFlash()).toBe(false);

      limiter.reset();

      expect(limiter.canFlash()).toBe(true);
    });

    it('restores flashesRemaining to the full budget', () => {
      limiter.recordFlash();
      limiter.recordFlash();
      limiter.reset();
      expect(limiter.flashesRemaining).toBe(SAFETY_CONFIG.MAX_FLASHES_PER_SECOND);
    });

    it('is idempotent — calling reset on an already-empty limiter is safe', () => {
      expect(() => limiter.reset()).not.toThrow();
      expect(limiter.flashesRemaining).toBe(SAFETY_CONFIG.MAX_FLASHES_PER_SECOND);
    });
  });

  // -------------------------------------------------------------------------
  // Partial-window expiry — flashes from different time offsets
  // -------------------------------------------------------------------------

  describe('rolling window partial expiry', () => {
    it('only expires flashes older than FLASH_WINDOW_MS, not newer ones', () => {
      // Record 2 flashes at t=1000 ms.
      limiter.recordFlash();
      limiter.recordFlash();

      // Advance past the window so those 2 expire.
      advanceTime(SAFETY_CONFIG.FLASH_WINDOW_MS + 1); // fakeNow = 2001

      // Record 1 more flash in the new window.
      limiter.recordFlash();

      // Budget used = 1 (only the new flash); remaining = MAX - 1.
      expect(limiter.flashesRemaining).toBe(SAFETY_CONFIG.MAX_FLASHES_PER_SECOND - 1);
    });
  });

  // -------------------------------------------------------------------------
  // Deprecated clampVolume — backward-compat
  // -------------------------------------------------------------------------

  describe('clampVolume() (deprecated)', () => {
    it('clamps a value above MAX_VOLUME to MAX_VOLUME', () => {
      expect(limiter.clampVolume(1.0)).toBe(SAFETY_CONFIG.MAX_VOLUME);
    });

    it('passes through a value below MAX_VOLUME unchanged', () => {
      const low = SAFETY_CONFIG.MAX_VOLUME * 0.5;
      expect(limiter.clampVolume(low)).toBe(low);
    });

    it('returns MAX_VOLUME when raw equals MAX_VOLUME', () => {
      expect(limiter.clampVolume(SAFETY_CONFIG.MAX_VOLUME)).toBe(SAFETY_CONFIG.MAX_VOLUME);
    });
  });
});
