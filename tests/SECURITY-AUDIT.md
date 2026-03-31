# Security & Safety Audit — Desk Smasher

**Auditor**: Security Engineer
**Date**: 2026-03-28
**Codebase revision**: feat/desk-smasher (latest commit: 0edab32)
**Files reviewed**: `src/core/input/input-manager.ts`, `src/core/input/parent-lock.ts`,
`src/core/safety-limiter.ts`, `src/audio/audio-manager.ts`, `src/app.ts`,
`src/effects/damage-effects.ts`, `src/systems/rebuild-cycle.ts`,
`src/vfx/sprite-particles.ts`, `src/config.ts`

---

## Summary

**OVERALL: PASS with 5 medium findings and 3 low findings**

The codebase has a solid security foundation for a child-focused local toy. There
are no critical issues, no network data exfiltration, and no XSS vectors. The
primary risks are gaps in key-blocking coverage, two independent safety-limiter
bypass paths for visual flashes, and minor cleanup leaks. All findings are
fixable in a single focused session.

---

## Input Security

### IS-1 (MEDIUM) — Alt+F4 and Win/Super key combos not blocked

`BLOCKED_CODES` and modifier sets in `input-manager.ts` do not include:

- `Alt+F4` (closes window on Windows/Linux) — `altKey` modifier is never checked
- `Super`/`Meta` key alone (opens Start Menu / macOS Spotlight) — only `Meta`+`q/w/h`
  combos are blocked, not bare `Meta`
- `Alt+Tab` / `Alt+Escape` — switches window focus on all desktop OS platforms
- `Ctrl+Alt+Delete` — cannot be suppressed in browser but the other two can

A child pressing these will break out of fullscreen on desktop browsers. A
touch-only device (tablet/phone) is not affected, but the design doc targets
general web browsers.

**Evidence**: `isBlockedShortcut()` in `input-manager.ts` lines 342–363. No
`e.altKey` branch exists.

### IS-2 (LOW) — UNLOCK_KEYWORD "exit" is a real English word

The keyword `exit` (4 characters, common word) has a non-trivial probability of
being typed accidentally during keyboard mashing, particularly for older children
or parents watching who press keys intentionally. The buffer timeout is 3 seconds
(`KEYWORD_TIMEOUT_MS: 3000`) which is generous — 4 keys in 3 seconds is an easy
casual pace.

A less common, longer sequence would reduce false positives. This is a product
tradeoff between discoverability and accidental triggering, but it warrants
explicit review.

**Evidence**: `src/config.ts` line 19 (`UNLOCK_KEYWORD: 'exit'`),
`parent-lock.ts` line 112.

### IS-3 (LOW) — Combo tracking in app.ts uses separate window listeners not cleaned up

`setupComboTracking()` in `app.ts` (lines 405–417) attaches two `window` keydown/
keyup listeners without storing references for later removal. The `InputManager`
has a proper `destroy()` method that removes its own listeners, but `DeskSmasherApp`
has no `destroy()` method at all, so these combo listeners are permanently leaked.
This is a low risk in a single-page toy with no navigation, but it is a code
quality issue and would become a real bug if the app were ever embedded or reloaded.

**Evidence**: `app.ts` lines 405–417; no `destroy()` method on `DeskSmasherApp`.

### IS-4 (PASS) — Ctrl+Shift+Q is correctly allowed through

`isBlockedShortcut()` explicitly returns `false` for `Ctrl+Shift+Q` at line 357
before the general Ctrl-block check. The pattern is correct.

### IS-5 (PASS) — Combo hold requires 3 seconds continuous hold

`COMBO_HOLD_MS: 3000` is a reasonable duration. The hold is broken by any key
release (`endComboHold` on keyup). This is highly resistant to accidental child
triggering.

### IS-6 (PASS) — Anti-hold logic prevents key-repeat abuse

`e.repeat` check and `heldKeys` tracking in `handleKeyDown()` (lines 315–318)
ensure browser key-repeat and held-key spam both produce only a single event per
physical press. A child sitting on a key cannot flood the parent-lock buffer with
repeated characters.

### IS-7 (PASS) — Raw key events reach ParentLock even when InputManager is disabled

`emitKeyRaw(e.key)` is called before the `if (!this.enabled) return` guard (lines
321–323). This means `ParentLock` continues to accept keyword input after a parent
calls `input.disable()`, which is the correct behavior.

---

## Child Safety (WCAG / Photosensitivity)

### CS-1 (MEDIUM) — DamageFlash effect bypasses SafetyLimiter entirely

`damageFlash()` in `damage-effects.ts` (line 148) sets `container.tint = 0xff4444`
unconditionally on every hit, then resets to white via `setTimeout` at 150 ms.
This is a visual flash (abrupt color change) on a game element. It is not routed
through `SafetyLimiter.canFlash()` or `recordFlash()`.

Under rapid keyboard mashing at high chaos, `damageFlash` can fire on multiple
elements in the same frame, producing many simultaneous red-flashes with no rate
cap. The `damageFlash` effect is registered in the effect pool alongside three
non-flashing effects, so it fires roughly 25% of the time — still a meaningful
frequency at the smashing pace a 5-year-old achieves.

This is distinct from full-screen flashes. WCAG 2.3.1 covers all areas of the
screen, not just full-screen effects. Whether a 150 ms tint on an icon-sized
element trips the photosensitivity threshold is debatable, but it should be
gated for safety.

**Evidence**: `damage-effects.ts` lines 148–167; no SafetyLimiter reference in
that file.

### CS-2 (MEDIUM) — RebuildCycle fade-to-white is not gated by SafetyLimiter

`rebuild-cycle.ts` drives the overlay from alpha 0 → 1 (fade to full white) over
0.3 seconds at 60 fps. This is a full-screen rapid-onset luminance change and is
the most photosensitivity-relevant effect in the codebase. It fires on every
desktop rebuild cycle.

The effect is not checked against or recorded in `SafetyLimiter`. Because `RebuildCycle`
is constructed without a reference to the `SafetyLimiter` instance, it cannot
make the check even if the code were added.

**Evidence**: `rebuild-cycle.ts` constructor signature (line 61) takes no
`SafetyLimiter` parameter; `updateFadingOut` at line 140 drives alpha directly.

### CS-3 (PASS) — ParticleManager flash-gating is correctly implemented

`ParticleManager.emit()` at lines 220–222 gates the flash record behind
`canFlash()` using a synchronous check-then-record pair. The single-thread
contract documented in `safety-limiter.ts` is upheld. Bright bursts (count > 5)
are gated; small bursts are not recorded as flashes, which is appropriate.

### CS-4 (PASS) — SafetyLimiter flash logic is mathematically correct

`_pruneWindow()` removes timestamps where `timestamp <= cutoff` (strictly less
than or equal), meaning a flash recorded exactly at the window boundary is pruned
on the next call. The condition `length < MAX_FLASHES_PER_SECOND` (strict less-
than) enforces an upper bound of exactly 2 simultaneous flashes in the window
when `MAX_FLASHES_PER_SECOND = 3`. Wait — this needs closer inspection.

With `MAX_FLASHES_PER_SECOND = 3` and the guard `length < 3`, the array can hold
0, 1, or 2 items and still allow a new flash, capping at 3 total per window.
This is correct. WCAG 2.3.1 allows up to 3 flashes per second.

### CS-5 (PASS) — Audio volume is capped via SafetyLimiter in all playback paths

`AudioManager` constructor sets master gain via `safety.clampVolume(0.7)` (line
73). `toggleMute()` also routes through `safety.clampVolume(0.7)` on unmute (line
178). All individual sound playback routes through `this.masterGain`, which is
permanently set to the clamped value. No per-source gain override exists. The
`playFile()` path (OGG playback) at line 239 connects directly to `masterGain`
without adding a separate gain stage that could bypass the cap. Volume is safe.

---

## Data Privacy (COPPA)

### DP-1 (PASS) — Only one network request exists, and it is benign local asset loading

A single `fetch(asset.src)` call exists at `audio-manager.ts` line 210. This
call fetches local OGG audio files from the same origin (served by Vite from the
`assets/` directory). No external URLs, analytics endpoints, CDN-hosted tracking
scripts, or third-party services are contacted.

No COPPA, GDPR, or CCPA obligations are triggered by this fetch call because:
1. The destination is the same origin (game server, not a third party)
2. No user data or identifiers are transmitted
3. The game collects no personal information of any kind

### DP-2 (PASS) — No localStorage, sessionStorage, or cookie usage

A full-codebase grep for `localStorage`, `sessionStorage`, and `document.cookie`
returned zero matches. No persistent client-side storage of any kind is used.

### DP-3 (PASS) — No analytics, telemetry, or tracking of any kind

No analytics libraries, beacon calls, image pixels, or user-behavior tracking
are present. Player actions are entirely ephemeral in memory.

### DP-4 (PASS) — No user-provided string input is collected or stored

The game accepts only keypresses (routed to audio/destruction effects) and pointer
events. No text fields, usernames, or chat messages exist.

---

## Browser Security

### BS-1 (PASS) — No XSS vectors

A full-codebase grep for `innerHTML`, `outerHTML`, `document.write`, and
`insertAdjacentHTML` returned zero matches. All UI is rendered through PixiJS
`Text` and `Graphics` objects (canvas-based), not HTML DOM injection.

### BS-2 (PASS) — No eval() or Function() constructor usage

A full-codebase grep for `eval(` and `new Function(` returned zero matches.

### BS-3 (LOW) — window.onbeforeunload assigned via property, not addEventListener

`input-manager.ts` line 145 sets `window.onbeforeunload` as a direct property
assignment. This overwrites any pre-existing `onbeforeunload` handler set by the
page or another library. It is also not removed in `InputManager.destroy()`.
The correct pattern is `window.addEventListener('beforeunload', handler)` with a
stored reference for cleanup.

In a standalone toy this has no security impact, but the practice is wrong and
would conflict with any future wrapper application (e.g., an Electron shell) that
sets its own beforeunload guard.

**Evidence**: `input-manager.ts` line 145; `destroy()` at lines 277–292 (no
`onbeforeunload` cleanup).

### BS-4 (PASS) — Event listeners are properly stored and cleaned up in InputManager

`InputManager` stores all bound handler references as private fields (lines 80–89)
and removes each one in `destroy()` (lines 277–292), including the `capture: true`
option on keyboard listeners. This is correct practice.

### BS-5 (LOW) — resumeOnInteraction listener in AudioManager is never removed on destroy

`ensureContext()` in `audio-manager.ts` (lines 84–94) attaches `click` and
`keydown` listeners to `document` for the Firefox autoplay workaround. These
listeners remove themselves when the context reaches `running` state, but if the
context is destroyed before it ever transitions to `running`, the listeners remain
attached to `document` indefinitely.

`AudioManager.destroy()` (line 283) closes the context and nulls references but
does not call `removeEventListener` for these two document-level listeners.

**Evidence**: `audio-manager.ts` lines 84–94, 283–290.

---

## Recommendations

Listed by priority (high to low).

### P1 — Gate RebuildCycle fade-to-white through SafetyLimiter (CS-2)

This is the highest-priority safety fix. A full-screen luminance flash is the
textbook photosensitivity trigger. Pass `SafetyLimiter` to `RebuildCycle`'s
constructor. Before entering `fading_out` state, call `canFlash()`. If the budget
is exhausted, either skip the flash (instant cut) or delay until budget recovers.
Record the flash via `recordFlash()` when the fade begins.

### P2 — Block Alt+F4 and Alt+Tab in isBlockedShortcut (IS-1)

Add an `e.altKey` guard to `isBlockedShortcut()`. At minimum:
```typescript
if (e.altKey && (key === 'f4' || key === 'tab' || key === 'escape')) return true;
if (e.altKey && e.metaKey) return true; // macOS Cmd+Alt combos
```
Note: Alt+F4 can only be blocked if the browser window has focus and the OS has
not already consumed the event. It is best-effort, but the attempt is worthwhile.

### P3 — Gate damageFlash tint through SafetyLimiter (CS-1)

Pass the `SafetyLimiter` instance to `damageFlash()` (it already receives
`ParticleManager` and `AudioManager`, so the pattern is established). Wrap the
`container.tint = 0xff4444` in a `canFlash()` / `recordFlash()` guard. If the
flash is suppressed, fall back to the particle-only feedback which already fires
unconditionally.

### P4 — Add destroy() to DeskSmasherApp and clean up combo listeners (IS-3)

Store the keydown/keyup combo tracking handlers as class fields and implement
`DeskSmasherApp.destroy()` that removes them from `window`. Also remove the
`window.onbeforeunload` assignment in `InputManager.destroy()`.

### P5 — Clean up resumeOnInteraction listeners in AudioManager.destroy() (BS-5)

Store the `resumeOnInteraction` function reference as a class field on
`AudioManager`. In `destroy()`, call:
```typescript
document.removeEventListener('click', this._resumeOnInteraction);
document.removeEventListener('keydown', this._resumeOnInteraction);
```

### P6 — Replace window.onbeforeunload property with addEventListener (BS-3)

Replace the direct property assignment in `InputManager` with
`window.addEventListener('beforeunload', handler)` and store the handler
reference. Remove it in `destroy()`.

### P7 — Review UNLOCK_KEYWORD for accidental-trigger risk (IS-2)

Consider replacing `'exit'` with a less common sequence such as `'unlock'` (6
characters, lower frequency in random key mashing) or allow it to be configured
per deployment. Document the deliberate tradeoff in `config.ts` if `'exit'` is
retained.
