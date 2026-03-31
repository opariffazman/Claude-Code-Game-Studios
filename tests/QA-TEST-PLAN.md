# QA Test Plan — Desk Smasher

**Date**: 2026-03-28
**Build**: Sprint 4 (commit 0edab32)
**Author**: QA Lead Agent
**Framework**: Vitest (unit), Playwright CLI (integration/E2E), Manual (human judgment)

---

## Test Strategy

| Layer | Tooling | Owner | Goal |
|-------|---------|-------|------|
| Unit tests | Vitest | `qa-tester` | Core logic: safety limiter, chaos meter, parent lock, impulse math |
| Integration / E2E | Playwright CLI | `qa-tester` | Rendering, input routing, desktop lifecycle, UI state |
| Manual | Human tester | QA Lead | Audio quality, visual feel, child safety perception, browser compat |

All automated tests must pass before a build is approved for playtesting.
Manual tests must be signed off by a human tester before milestone release.

---

## Automated Tests (Playwright CLI)

### Category 1: Startup and Rendering

- [ ] **ATEST-001** App loads without console errors
  - Navigate to `localhost:5173`; expect zero `console.error` / unhandled rejection events
- [ ] **ATEST-002** Canvas fills viewport
  - Query `canvas` element; assert `width === window.innerWidth` and `height === window.innerHeight`
- [ ] **ATEST-003** Desktop elements render on load
  - After 2 s, confirm stage contains at least 8 visible child nodes with non-zero alpha (icons visible)
- [ ] **ATEST-004** FPS counter displays in top-left
  - Assert a `Text` node exists near position `(4, 4)` whose content matches `FPS: \d+`
- [ ] **ATEST-005** Taskbar renders at bottom
  - Assert a container labelled `'taskbar'` is visible and positioned near `y === screenH - 48`
- [ ] **ATEST-006** No layout overflow — canvas has no scrollbars
  - Assert `document.documentElement.scrollHeight === window.innerHeight`

### Category 2: Keyboard Input

- [ ] **ATEST-007** Single keypress triggers a visual change (element health decrements)
  - Read `desktop.destructionProgress` before; fire `KeyboardEvent('keydown', { code: 'KeyA' })`; read after; assert progress increased
- [ ] **ATEST-008** Anti-hold: holding a key only fires once
  - Dispatch `keydown` with `repeat: false` then `keydown` with `repeat: true`; assert `chaosMeter.level` only incremented for the non-repeat event
- [ ] **ATEST-009** Chaos meter increments on rapid successive input
  - Fire 15 synthetic `keydown` events within 1 second; assert `chaosMeter.level >= 2`
- [ ] **ATEST-010** Chaos meter resets after 2 seconds of no input
  - Reach chaos level 2; wait 2.1 s; assert `chaosMeter.level === 0`
- [ ] **ATEST-011** System shortcuts are blocked (F5 does not reload page)
  - Intercept `beforeunload`; dispatch `keydown` for `F5`; assert no page reload occurred
- [ ] **ATEST-012** Ctrl+W is blocked (does not close tab)
  - Dispatch `keydown` with `ctrlKey: true, key: 'w'`; assert no close event or navigation

### Category 3: Mouse Click

- [ ] **ATEST-013** Left click on an element triggers destruction effect
  - Find an alive element's bounding box; dispatch `mousedown`/`mouseup` at its center; assert element `health` decreased
- [ ] **ATEST-014** Left click on wallpaper (empty space) does not crash
  - Dispatch click far from any element; assert no thrown errors and `desktop.elements` count unchanged
- [ ] **ATEST-015** Tool indicator shows in bottom-right corner
  - Assert a container labelled `'tool-indicator'` is visible near `(screenW - 80, screenH - 70)`
- [ ] **ATEST-016** Right click changes tool indicator text
  - Record current tool label; dispatch `contextmenu` event; assert tool indicator text changed and is one of `['HAMMER','LASER','BOMB','FREEZE','MAGNET']`
- [ ] **ATEST-017** Context menu is suppressed on right click
  - Dispatch `contextmenu` event; assert `event.defaultPrevented === true`
- [ ] **ATEST-018** Tool cycles through all 5 tools and wraps
  - Right-click 5 times; assert tool returns to original value on the 5th cycle

### Category 4: Mouse Drag

- [ ] **ATEST-019** Drag over an element applies damage
  - Dispatch `mousedown`, then 10x `mousemove` across an element's bounding box, then `mouseup`; assert element health decreased
- [ ] **ATEST-020** Drag leaves a persistent trail (Graphics node visible after drag)
  - Perform a drag; assert the `'drag-trail'` Graphics container has visible draw calls (`_trail` is non-empty)
- [ ] **ATEST-021** Drag does not fire as click (no double-damage)
  - Perform a 50px drag; assert only drag damage occurred, not an additional click damage on `mouseup`
- [ ] **ATEST-022** Drag threshold: movement under 5px fires click not drag
  - Move 4px; assert `dragListeners` not called, `inputListeners` called on `mouseup`

### Category 5: Desktop Lifecycle

- [ ] **ATEST-023** Desktop rebuilds after all elements are destroyed
  - Programmatically set all element `health` to 0 and `destroyed` to true; tick `rebuildCycle.update()` for 2 seconds; assert `desktop.elements` contains new elements with full health
- [ ] **ATEST-024** New desktop has a different wallpaper color after rebuild
  - Record `desktop.wallpaperColor`; trigger rebuild cycle to completion; assert new `wallpaperColor !== old`
- [ ] **ATEST-025** Elements reset to full health after rebuild
  - Trigger rebuild; assert every element in `desktop.elements` has `health === maxHealth`
- [ ] **ATEST-026** Input is blocked during rebuild transition
  - While `rebuildCycle.isTransitioning === true`, dispatch keyboard/click input; assert `desktop.elements[0].health` unchanged
- [ ] **ATEST-027** Rebuild overlay fades in and out (alpha change over time)
  - During `fading_out` state, tick `update(0.15)`; assert overlay alpha > 0; tick through to `fading_in`; assert alpha returns to 0

### Category 6: Parent Lock — Keyword

- [ ] **ATEST-028** Typing "exit" triggers unlock callback
  - Wire a test callback; dispatch keys `e`, `x`, `i`, `t` via `onKeyRaw`; assert callback fired
- [ ] **ATEST-029** Partial keyword followed by timeout resets buffer
  - Type `e`, `x`; wait 3.1 s; type `i`, `t`; assert callback NOT fired (buffer was reset)
- [ ] **ATEST-030** Keyword does not trigger if typed in wrong case alone
  - Type `E`, `X`, `I`, `T` (uppercase); assert callback fires (design spec: `buffer += key.toLowerCase()` normalises)
- [ ] **ATEST-031** Unlock fires exactly once even if exit typed twice
  - Type "exit" twice in quick succession; assert callback fired exactly once

### Category 7: Parent Lock — Combo Hold

- [ ] **ATEST-032** Combo hold for >= 3 seconds triggers unlock
  - Call `parentLock.startComboHold()`; advance `performance.now()` by 3000 ms; call `parentLock.update()`; assert callback fired
- [ ] **ATEST-033** Releasing combo before 3 seconds resets timer
  - Hold for 2.9 s; call `endComboHold()`; wait 0.2 s more; call `update()`; assert callback NOT fired
- [ ] **ATEST-034** Combo does not fire a second time after unlock
  - Trigger combo unlock; hold again for 3 s; assert callback still only called once

### Category 8: Safety Limiter

- [ ] **ATEST-035** Flash budget allows 3 flashes per second
  - Call `canFlash()` + `recordFlash()` 3 times within 1 second window; assert all 3 return `true`
- [ ] **ATEST-036** Flash budget denies 4th flash within same window
  - Record 3 flashes; immediately call `canFlash()` again; assert returns `false`
- [ ] **ATEST-037** Flash window rolls: flashes expire after 1 second
  - Record 3 flashes; advance time 1.01 s; assert `flashesRemaining === 3`
- [ ] **ATEST-038** `maxVolume` does not exceed `SAFETY_CONFIG.MAX_VOLUME` (0.7)
  - Assert `safetyLimiter.maxVolume <= 0.7`
- [ ] **ATEST-039** `clampVolume(1.0)` returns exactly `MAX_VOLUME`
  - Assert `safetyLimiter.clampVolume(1.0) === 0.7`

### Category 9: Chaos Meter

- [ ] **ATEST-040** `level` returns 0 with no recent input
  - Fresh `ChaosMeter`; call `update()`; assert `level === 0`
- [ ] **ATEST-041** Level 1 at >= 4 events/second
  - Record 5 events within 1 s window; `update()`; assert `level >= 1`
- [ ] **ATEST-042** Level 3 at >= 13 events/second
  - Record 27 events within 2 s window; `update()`; assert `level === 3`
- [ ] **ATEST-043** `reset()` immediately returns `level` to 0
  - Reach level 2; call `reset()`; assert `level === 0` and `eventsPerSecond === 0`

### Category 10: Screen Shake

- [ ] **ATEST-044** `trigger(0)` has no effect on intensity
  - Call `shake.trigger(0)`; assert `shake.intensity === 0`
- [ ] **ATEST-045** Intensity caps at `MAX_INTENSITY` (15) with stacked triggers
  - Call `shake.trigger(10)` then `shake.trigger(10)`; assert `intensity === 15`
- [ ] **ATEST-046** Intensity decays toward zero over multiple `update()` calls
  - Trigger with 15; call `update(container)` 30 times; assert `intensity < 0.5`
- [ ] **ATEST-047** Container snaps back to (0,0) once intensity drops below 0.5
  - Run update loop until intensity < 0.5; assert `container.x === 0 && container.y === 0`

---

## Manual Tests (Human Required)

The following tests require subjective judgment, physical audio playback, or real browser environments that Playwright cannot fully simulate.

### Audio Quality

- [ ] **MTEST-001** Keyboard sounds play on every keypress (no silent presses)
- [ ] **MTEST-002** Same key always produces the same sound type and approximate pitch across multiple presses
- [ ] **MTEST-003** Different keys produce noticeably different sounds (pitch variety is audible)
- [ ] **MTEST-004** Destruction sounds (OGG files) play on element destruction — distinct from procedural keyboard sounds
- [ ] **MTEST-005** Tool-switch click sound plays on right-click
- [ ] **MTEST-006** Sound volume is comfortable — not painfully loud even with headphones at max system volume
- [ ] **MTEST-007** No audio glitches, pops, or crackles during rapid mashing at chaos level 3
- [ ] **MTEST-008** Audio starts correctly in Firefox after first keypress (no silent session)
- [ ] **MTEST-009** Polyphony limit is not audible as a sudden silence cutoff during chaos; feels natural

### Visual Feel

- [ ] **MTEST-010** Destruction effects feel satisfying — not janky or abrupt (all 8 effects: shatter, bounce, explode, inflatePop, pixelate, melt, gravityFlip, vortex)
- [ ] **MTEST-011** Particle effects are clearly visible and colorful (Graphics particles: circles, squares, triangles)
- [ ] **MTEST-012** Sprite particles (Kenney PNGs) render alongside Graphics particles during destruction (verify sparks and dirt chunks appear distinct from Graphics particles)
- [ ] **MTEST-013** Screen shake feels impactful at chaos level 3 but not disorienting
- [ ] **MTEST-014** Mouse trail sparkles are clearly visible during cursor movement
- [ ] **MTEST-015** Tool cursors are recognizable as their named tool:
  - Hammer: rectangular head + handle shape
  - Laser: circular crosshair reticle
  - Bomb: round body with fuse
  - Freeze: 6-arm snowflake
  - Magnet: horseshoe U-shape with red/blue poles
- [ ] **MTEST-016** Drag trails are visually distinctive per tool (hammer = jagged orange, laser = green glow, bomb = dotted orange, freeze = wide blue frost, magnet = wavy purple)
- [ ] **MTEST-017** Tool indicator pill pulses visibly when tool changes
- [ ] **MTEST-018** Rebuild fade-to-white transition is smooth and covers the entire screen (no viewport edges exposed)
- [ ] **MTEST-019** New theme after rebuild is visually noticeably different from previous theme
- [ ] **MTEST-020** Wallpaper damage marks (cracks, burns, dents, splats, pixels, scratches) accumulate and are visible on empty wallpaper clicks

### Child Safety

- [ ] **MTEST-021** No visual flashing exceeds 3 per second — use a stopwatch to count flash events during chaos level 3 rapid mashing over a 10-second window
- [ ] **MTEST-022** Volume is hard-capped — setting OS volume to maximum and playing destruction sounds is not painful; confirm no sound exceeds the SAFETY_CONFIG.MAX_VOLUME (0.7) ceiling
- [ ] **MTEST-023** No imagery that could be construed as violent toward people or animals — all destruction targets are UI elements (windows, icons, widgets)
- [ ] **MTEST-024** Parent lock cannot be triggered by accidental key mashing — test with random key spam for 30 seconds; confirm "exit" is not accidentally typed
- [ ] **MTEST-025** Parent lock "exit" keyword works reliably — type slowly and deliberately; confirm app exits within 1 second of the final letter
- [ ] **MTEST-026** Ctrl+Shift+Q hold for 3 seconds triggers exit — time the hold with a stopwatch
- [ ] **MTEST-027** App cannot be easily closed by a child — verify F4 (Alt+F4), Ctrl+W, Ctrl+Q, Escape are all suppressed

### Browser Compatibility

For each browser, perform a 2-minute play session and verify:

- [ ] **MTEST-028** Chrome (latest): all features work, audio plays, no console errors
- [ ] **MTEST-029** Firefox (latest): audio starts on first keypress, no audio gaps, tool cursors render
- [ ] **MTEST-030** Safari (latest): audio context initialises, touch events work if on Mac with trackpad
- [ ] **MTEST-031** Edge (latest): no regressions vs Chrome baseline
- [ ] **MTEST-032** Mobile Chrome (Android): touch input triggers destruction; drag creates trail; audio plays after tap

### Performance

- [ ] **MTEST-033** Maintains 60 FPS during normal play (single key or click every 1–2 seconds) — verify FPS counter stays >= 58
- [ ] **MTEST-034** Maintains >= 50 FPS during chaos level 3 (rapid mashing) with multiple particles on screen
- [ ] **MTEST-035** No visible frame drops during rebuild cycle transition (fade-in/fade-out)
- [ ] **MTEST-036** No memory growth over a 5-minute session — open Chrome DevTools Memory tab, record heap at start and end; heap size should not grow by more than 10 MB
- [ ] **MTEST-037** After 10 consecutive rebuild cycles, performance has not degraded vs first 2 cycles (particle pools are being recycled, not leaking)

---

## Known Gaps / Out of Scope

The following are deferred to a future sprint and are NOT part of this test plan:

- Network / multiplayer (not implemented)
- Save / load state (not implemented)
- Accessibility: screen reader support (not in scope for a toy)
- Automated visual regression screenshots (requires Playwright screenshot comparison baseline, not yet set up)
- Load testing with >500 particle emissions per frame (beyond current PARTICLE_CONFIG.MAX_ACTIVE = 300 ceiling)

---

## Sign-Off Criteria

A build is considered **QA PASS** when:

1. All 47 automated tests pass with zero failures
2. All 37 manual tests are checked off by a human tester
3. Zero S1 bugs open
4. Zero S2 bugs open (or each has explicit producer approval to defer with documented workaround)
5. Performance targets met: 60 FPS normal play, 50+ FPS chaos level 3
6. All five browsers tested and signed off
