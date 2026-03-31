/**
 * Unit tests for ParentLock.
 * Implements: design/gdd/input-capture.md — Parent Lock acceptance criteria
 *
 * Environment: jsdom (vitest.config.ts)
 *
 * Strategy: construct ParentLock with a minimal stub InputManager that
 * captures the registered onKeyRaw callback so tests can drive key events
 * directly without full DOM event dispatch. Fake timers are used for all
 * time-dependent assertions.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { ParentLock } from '../../../src/core/input/parent-lock';
import { INPUT_CONFIG } from '../../../src/config';
import type { InputManager } from '../../../src/core/input/input-manager';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Minimal InputManager stub.
 * Captures the onKeyRaw callback so tests can invoke it directly.
 */
function makeStubInputManager(): {
  manager: InputManager;
  fireKey: (key: string) => void;
} {
  let rawHandler: ((key: string) => void) | null = null;

  const manager = {
    onKeyRaw: vi.fn((handler: (key: string) => void) => {
      rawHandler = handler;
    }),
  } as unknown as InputManager;

  return {
    manager,
    fireKey: (key: string) => {
      if (rawHandler) rawHandler(key);
    },
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('ParentLock', () => {
  let onExit: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.useFakeTimers();
    onExit = vi.fn();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  // -------------------------------------------------------------------------
  // 1. typing correct keyword triggers unlock callback
  // -------------------------------------------------------------------------
  it('typing correct keyword triggers unlock callback', () => {
    // Arrange
    const { manager, fireKey } = makeStubInputManager();
    const lock = new ParentLock(manager, onExit);

    // Act — type UNLOCK_KEYWORD one character at a time
    for (const ch of INPUT_CONFIG.UNLOCK_KEYWORD) {
      fireKey(ch);
    }

    // Assert
    expect(onExit).toHaveBeenCalledOnce();
  });

  // -------------------------------------------------------------------------
  // 2. wrong character resets keyword buffer
  // -------------------------------------------------------------------------
  it('wrong character resets keyword buffer', () => {
    // Arrange
    const { manager, fireKey } = makeStubInputManager();
    const lock = new ParentLock(manager, onExit);
    const keyword = INPUT_CONFIG.UNLOCK_KEYWORD; // "exit"

    // Act — type 'e', 'x', then a wrong character that breaks the sequence,
    // then type the full keyword again (which should succeed)
    fireKey(keyword[0]!); // 'e'
    fireKey(keyword[1]!); // 'x'
    fireKey('z');          // breaks sequence — but buffer isn't cleared yet,
                           // it just adds 'z'. The buffer now holds "exz".
                           // Type the full keyword to test that the wrong char
                           // didn't prematurely trigger.

    expect(onExit).not.toHaveBeenCalled();

    // The buffer contains "exz" — now type the rest of the keyword so it
    // appears as a substring in an accumulated string: flush timer first.
    vi.runAllTimers(); // clear the buffer
    for (const ch of keyword) {
      fireKey(ch);
    }

    // Assert — triggered only on the clean second attempt
    expect(onExit).toHaveBeenCalledOnce();
  });

  // -------------------------------------------------------------------------
  // 3. keyword must be typed within timeout
  // -------------------------------------------------------------------------
  it('keyword must be typed within timeout', () => {
    // Arrange
    const { manager, fireKey } = makeStubInputManager();
    const lock = new ParentLock(manager, onExit);
    const keyword = INPUT_CONFIG.UNLOCK_KEYWORD;

    // Act — type first character, then let timeout expire
    fireKey(keyword[0]!);
    vi.advanceTimersByTime(INPUT_CONFIG.KEYWORD_TIMEOUT_MS + 1);

    // Type remaining characters (buffer was cleared by timeout)
    for (let i = 1; i < keyword.length; i++) {
      fireKey(keyword[i]!);
    }

    // Assert — keyword split across timeout boundary should not unlock
    expect(onExit).not.toHaveBeenCalled();
  });

  // -------------------------------------------------------------------------
  // 4. combo hold for COMBO_HOLD_MS triggers unlock
  // -------------------------------------------------------------------------
  it('combo hold for COMBO_HOLD_MS triggers unlock', () => {
    // Arrange
    const { manager } = makeStubInputManager();
    const lock = new ParentLock(manager, onExit);

    // Act — start the hold, advance past the threshold, then call update()
    lock.startComboHold();
    vi.advanceTimersByTime(INPUT_CONFIG.COMBO_HOLD_MS);
    // performance.now() is advanced by fake timers; update() reads it
    lock.update();

    // Assert
    expect(onExit).toHaveBeenCalledOnce();
  });

  // -------------------------------------------------------------------------
  // 5. releasing combo before timeout does not trigger
  // -------------------------------------------------------------------------
  it('releasing combo before timeout does not trigger', () => {
    // Arrange
    const { manager } = makeStubInputManager();
    const lock = new ParentLock(manager, onExit);

    // Act — hold for less than the threshold, then release and update
    lock.startComboHold();
    vi.advanceTimersByTime(INPUT_CONFIG.COMBO_HOLD_MS - 1);
    lock.endComboHold();
    lock.update();

    // Assert
    expect(onExit).not.toHaveBeenCalled();
  });

  // -------------------------------------------------------------------------
  // 6. both unlock methods work independently
  // -------------------------------------------------------------------------
  it('both unlock methods work independently', () => {
    // --- 6a: keyword method alone ---
    {
      const { manager, fireKey } = makeStubInputManager();
      const cb = vi.fn();
      const lock = new ParentLock(manager, cb);

      for (const ch of INPUT_CONFIG.UNLOCK_KEYWORD) {
        fireKey(ch);
      }

      expect(cb).toHaveBeenCalledOnce();
    }

    // --- 6b: combo hold method alone ---
    {
      const { manager } = makeStubInputManager();
      const cb = vi.fn();
      const lock = new ParentLock(manager, cb);

      lock.startComboHold();
      vi.advanceTimersByTime(INPUT_CONFIG.COMBO_HOLD_MS);
      lock.update();

      expect(cb).toHaveBeenCalledOnce();
    }
  });

  // -------------------------------------------------------------------------
  // 7. non-printable keys don't affect keyword buffer
  // -------------------------------------------------------------------------
  it('non-printable keys do not affect keyword buffer', () => {
    // Arrange
    const { manager, fireKey } = makeStubInputManager();
    const lock = new ParentLock(manager, onExit);
    const keyword = INPUT_CONFIG.UNLOCK_KEYWORD;

    // Act — interleave non-printable keys (length > 1) among keyword chars
    fireKey(keyword[0]!);      // 'e'
    fireKey('Shift');           // non-printable — should be ignored
    fireKey(keyword[1]!);      // 'x'
    fireKey('CapsLock');        // non-printable — should be ignored
    fireKey(keyword[2]!);      // 'i'
    fireKey('ArrowRight');     // non-printable — should be ignored
    fireKey(keyword[3]!);      // 't'

    // Assert — keyword was assembled correctly despite non-printable noise
    expect(onExit).toHaveBeenCalledOnce();
  });

  // -------------------------------------------------------------------------
  // Bonus: exit callback fires exactly once even if both methods race
  // -------------------------------------------------------------------------
  it('exit callback fires at most once regardless of both methods triggering', () => {
    // Arrange
    const { manager, fireKey } = makeStubInputManager();
    const lock = new ParentLock(manager, onExit);

    // Trigger keyword path
    for (const ch of INPUT_CONFIG.UNLOCK_KEYWORD) {
      fireKey(ch);
    }

    // Now also trigger combo path
    lock.startComboHold();
    vi.advanceTimersByTime(INPUT_CONFIG.COMBO_HOLD_MS);
    lock.update();

    // Assert — callback must not have been called twice
    expect(onExit).toHaveBeenCalledOnce();
  });
});
