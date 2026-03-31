# Parent Lock

> **Status**: Designed
> **Author**: game-designer + user
> **Last Updated**: 2026-03-28
> **Implements Pillar**: Parent-Friendly (controlled exit), Safe Chaos (child stays contained)

## Overview

The Parent Lock prevents children from accidentally exiting the game. All exit paths (keyboard shortcuts, Escape, browser navigation) are blocked by Input Capture. The Parent Lock monitors key events for two unlock methods: typing a keyword sequence or holding a key combo. A subtle visual indicator shows unlock progress. On successful unlock, the system exits fullscreen and displays a brief "Session Over" screen.

## Player Fantasy

The parent hands the device to their toddler with zero anxiety. When it is time to stop, the parent calmly types a word or holds a key combo -- the child never figures it out.

## Detailed Design

### Core Rules

1. **Dual Unlock Methods** (active simultaneously):
   - **Method A -- Typed Keyword**: Parent types the unlock word (default: `"exit"`). Characters must be typed in order within `KEYWORD_TIMEOUT_MS` (default: 3000ms). Any non-matching keypress resets the buffer and timer. Case-insensitive.
   - **Method B -- Key Combo Hold**: Parent holds `Ctrl+Shift+Q` for `COMBO_HOLD_MS` (default: 3000ms) continuously. Releasing any of the three keys resets the hold timer. Timer only advances while all three keys are simultaneously held.
2. **Buffer Reset Logic (Method A)**:
   - Maintain a string buffer and a timestamp of the first matching keypress.
   - On each `key:down` event, check if `event.key.toLowerCase()` matches the next expected character.
   - If it matches: append to buffer. If buffer now equals the full keyword, unlock.
   - If it does not match: clear buffer, reset timer.
   - If `KEYWORD_TIMEOUT_MS` elapses since the first character, clear buffer (parent got distracted).
3. **Hold Timer Logic (Method B)**:
   - On each frame (ticker), if `Ctrl`, `Shift`, and `Q` are all currently held, increment `holdElapsed` by `deltaTime`.
   - If any of those keys fires `key:up`, reset `holdElapsed` to 0.
   - If `holdElapsed >= COMBO_HOLD_MS`, unlock.
4. **Progress Indicator**: A 6x6 pixel circle positioned at `(canvasWidth - 12, canvasHeight - 12)`. Default color: `0x333333` (nearly invisible on dark background). As unlock progresses (either method), its alpha ramps from 0.1 to 1.0 linearly. Progress = `max(keywordProgress, comboProgress)` where:
   - `keywordProgress = buffer.length / keyword.length`
   - `comboProgress = holdElapsed / COMBO_HOLD_MS`
   On reset, alpha snaps back to 0.1 (no animation needed -- the snap is too subtle to notice).
5. **Unlock Sequence**:
   1. Parent Lock emits `'unlock'` event on the Input Capture bus.
   2. Input Capture transitions to `SUSPENDED` state (stops routing events).
   3. Exit fullscreen: `document.exitFullscreen()`.
   4. Remove `beforeunload` handler.
   5. Display "Session Over" screen (centered text on dark background, maybe a star animation) for 2 seconds.
   6. After 2 seconds: either `window.close()` (works if we opened the window) or navigate to a blank page (`about:blank`).
6. **Child Cannot Accidentally Unlock**: The word "exit" requires 4 consecutive correct letters with no wrong keys in between. Random mashing has negligible probability of triggering this. The combo hold requires fine motor control and 3 seconds of patience -- neither of which a 1-6 year old possesses.
7. **No Visual Affordance**: There is no "exit button", no "X", no visible UI element suggesting exit is possible. The progress dot is deliberately below the threshold of child attention.

### States and Transitions

| State | Description | Transition To | Trigger |
|-------|-------------|---------------|---------|
| `LOCKED` | Monitoring input for unlock sequences | `UNLOCKING` | Either unlock method succeeds |
| `UNLOCKING` | Exit sequence in progress | `DONE` | Fullscreen exited, session-over screen shown |
| `DONE` | Session over screen displayed | (app closes) | 2-second timer expires |

### Interactions with Other Systems

| System | Data Flow |
|--------|-----------|
| **Input Capture** | Parent Lock subscribes to `key:down` and `key:up` events. Emits `'unlock'` back to trigger suspension. |
| **App Shell** | Calls `document.exitFullscreen()` during unlock sequence. Accesses `app.stage` to display session-over screen. |

## Formulas

**Accidental Unlock Probability (Method A)**:
```
P(random mashing types "exit" in sequence without wrong key) = (1/26)^4 per 4-key window
= ~0.00022% per attempt
At 10 keys/sec over 30 min = 18,000 keys = ~4,500 windows of 4
Expected false unlocks = 4500 * 0.0000022 = ~0.01 (negligible)
```

**Combo Progress**:
```
comboProgress = clamp(holdElapsed / COMBO_HOLD_MS, 0, 1)
```

**Keyword Progress**:
```
keywordProgress = buffer.length / keyword.length
```

**Indicator Alpha**:
```
alpha = 0.1 + 0.9 * max(keywordProgress, comboProgress)
```

## Edge Cases

| Edge Case | Resolution |
|-----------|------------|
| Child randomly types "e", "x", "i", "t" in sequence | Extremely unlikely without wrong keys between them (see probability formula). If it happens, it is fine -- parent can restart the app. |
| Parent types "exi" then child hits a key | Buffer resets. Parent must start over. Mild inconvenience, acceptable. |
| Parent holds Ctrl+Shift+Q but child hits another key simultaneously | Extra key events do not affect the combo hold check. Only releasing Ctrl, Shift, or Q resets the timer. |
| Fullscreen exit fails | Call `document.exitFullscreen()` in a try-catch. If it fails, still proceed with session-over screen. The page is still usable without fullscreen. |
| `window.close()` blocked by browser | Fallback: navigate to `about:blank`. If that also fails, display persistent "You can close this tab now" message. |
| Canvas resized (indicator position) | Recalculate indicator position on resize: always 12px from bottom-right corner. |
| Unlock keyword contains characters not on keyboard | Config validation: keyword must be lowercase a-z only, 3-8 characters. |
| Browser focus lost during combo hold | `key:up` fires for all keys on blur (or we detect blur and reset). Hold timer resets. |

## Dependencies

| System | Direction | Reason |
|--------|-----------|--------|
| **Input Capture** | Depends on | Receives key events, emits unlock signal |

**Depended on by**: Nothing. This is a leaf system.

## Tuning Knobs

| Parameter | Default | Range | Purpose |
|-----------|---------|-------|---------|
| `UNLOCK_KEYWORD` | `"exit"` | 3-8 chars, a-z | Typed sequence to unlock |
| `KEYWORD_TIMEOUT_MS` | 3000 | 2000-5000 | Max time to complete keyword sequence |
| `COMBO_HOLD_MS` | 3000 | 2000-5000 | How long combo must be held |
| `COMBO_KEYS` | `['Control', 'Shift', 'q']` | any 2-4 keys | Keys for hold-to-unlock combo |
| `INDICATOR_SIZE` | 6 | 4-10 | Diameter of progress dot in pixels |
| `INDICATOR_MARGIN` | 12 | 8-20 | Distance from canvas edge in pixels |
| `INDICATOR_COLOR` | `0x333333` | any hex | Base color of progress dot |
| `SESSION_OVER_DURATION_MS` | 2000 | 1000-5000 | How long the session-over screen displays |

## Acceptance Criteria

- [ ] Typing the unlock keyword in sequence within timeout triggers unlock
- [ ] Any wrong keypress during keyword entry resets the buffer
- [ ] Keyword buffer resets if timeout elapses between first and last character
- [ ] Holding Ctrl+Shift+Q for 3 seconds triggers unlock
- [ ] Releasing any combo key before 3 seconds resets the hold timer
- [ ] Both unlock methods work simultaneously (whichever completes first wins)
- [ ] Progress indicator dot is visible in bottom-right corner at low alpha
- [ ] Progress indicator alpha increases as either unlock method progresses
- [ ] On unlock: fullscreen exits, session-over screen appears, then app closes/navigates away
- [ ] `beforeunload` handler is removed during unlock sequence
- [ ] 30 minutes of random key mashing does not trigger accidental unlock
- [ ] Progress dot repositions correctly on canvas resize

## Open Questions

- None. Both unlock mechanisms are simple and well-specified.
