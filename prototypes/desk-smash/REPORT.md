## Prototype Report: Desk Smasher

### Hypothesis
Kids aged 1-6 will find keyboard-mashing a fake desktop with randomized destruction
effects satisfying and engaging for 5+ minutes, and parents will trust it as safe,
self-contained screen time.

### Approach
Built a complete prototype in `prototypes/desk-smash/` using:
- **PixiJS 8.17.0** + TypeScript + Vite
- **Zero external assets** — all visuals drawn with PixiJS Graphics, all sounds
  generated procedurally via Web Audio API oscillators
- **12 source files** (expanded from 8 during iteration): app shell, safety limiter,
  audio engine, particle system, desktop renderer, destruction effects, input capture,
  parent lock, mouse tools, mouse trail, screen shake, chaos meter

Shortcuts taken:
- setInterval-based animations instead of ticker-driven (works for prototype)
- Single hardcoded desktop theme (no theme system)
- No rebuild cycle animation
- No touch support
- No automated tests (manual testing only)

### Result

**Tested by**: Parent + young son (target demographic). Live playtesting session.

Observations:
- [x] Every keypress triggers destruction effect + sound — confirmed, 9 effect types
- [x] Every click targets the correct element — confirmed after impulse-only physics fix
- [x] Effects feel satisfying and varied — confirmed; kid stayed engaged throughout session
- [x] Sounds are fun and not annoying — confirmed; per-key pitch mapping allowed rhythmic play
- [ ] FPS stays at 60 — not formally measured; no reported drops during session
- [x] Parent lock (type "exit") works — confirmed functioning correctly
- [x] Ctrl+Shift+Q hold works — confirmed functioning correctly
- [ ] System keys (Ctrl+W, Escape) are blocked — NOT achievable in browser; documented as
  known web limitation (Tauri integration required for full key blocking)

### Metrics
- Frame time: Not formally instrumented; no visible drops reported during live session
- Particle count peak: Not measured; visual density felt appropriate (9 effect types)
- Time to destroy all elements: Variable — increased element count (28 total) extended
  engagement; progressive health scaling prevents instant clearing
- Effect variety perception: 9 effects validated as sufficient variety for prototype;
  production should expand

### Bugs Found and Resolved During Session

All issues below were found, diagnosed, and fixed during the prototype iteration cycle.
They are documented here as lessons for production architecture, not as open defects.

| # | Issue | Severity | Resolution |
|---|-------|----------|------------|
| 1 | Elements destroyed too fast — no sense of buildup | S2 | Increased health values + progressive damage scaling |
| 2 | Screen felt sparse — too few elements | S3 | Added stickies, notifications, widgets; 28 total elements |
| 3 | Holding one key destroyed everything instantly | S2 | Anti-hold mechanic: must release and re-press per trigger |
| 4 | All elements drifted constantly (continuous physics) | S3 | Changed to impulse-only: hit knocks element, friction stops it |
| 5 | Taskbar stretched incorrectly on fullscreen | S3 | Oversized rects + resize-triggered rebuild |
| 6 | Wallpaper gradient created visible seam at wrap point | S3 | Replaced gradient with solid color |
| 7 | Canvas background color did not match wallpaper | S3 | Synced renderer.background.color to wallpaper color |
| 8 | Mouse drag trails did not persist | S3 | Implemented permanent trail system (mouse-tools.ts) |
| 9 | Tool cycling triggered during drag operations | S3 | Separated click and drag event handling |
| 10 | Browser shortcuts (Ctrl+W, Escape) cannot be blocked | S2 | Documented as web platform limitation; Tauri required for fix |

**Open Issue (by design — web limitation):**
BUG-0001: Browser shortcuts Ctrl+W and Escape cannot be suppressed in a web context.
This is not a code defect — it is a platform constraint. The production path with Tauri
would resolve this by running in a native window with full keyboard capture.

### Recommendation: PROCEED

The core loop is validated. Both the target user (young child) and the proxy user
(parent) responded positively. The keyboard-mashing loop held attention, destruction
effects read as satisfying, and procedural variety (sounds, desktop layouts, wallpapers)
kept each session feeling different. Ten issues were identified and resolved during the
session — none required a design pivot. The concept is sound.

**Production should be written from scratch.** No prototype code should migrate.

### If Proceeding — Production Requirements

Architecture requirements validated by this prototype session:

**Engine / Rendering**
- Ticker-driven animations (replace setInterval — critical for smooth 60fps and drift prevention)
- Proper asset loading pipeline (even if assets remain procedural, pipeline needed for themes)
- Proper responsive layout system (taskbar fullscreen bug revealed fragility of ad-hoc sizing)

**Feature Requirements**
- Theme system for visual variety across sessions (wallpapers, color palettes, desktop styles)
- Desktop rebuild cycle with transition animations (session rhythm: destroy → rebuild → destroy)
- Touch support for tablets (untested demographic; significant opportunity)
- Chaos meter with escalation (module exists in prototype as chaos-meter.ts; needs production design)

**Platform**
- Tauri integration for desktop distribution (required to block Ctrl+W, Escape, and other OS shortcuts)
- Wallpaper Engine support (if targeting desktop enthusiast parent market)

**Quality**
- Accessibility considerations (sound feedback for low-vision users, adjustable effect intensity)
- Formal performance instrumentation (frame time budget, particle count ceiling)
- Automated tests for core loop invariants (keypress always triggers effect, health values in range)

### Lessons Learned

1. **Start with more content than you think you need.** The initial element count felt
   correct on paper but read as sparse on screen. For destruction games, density is part
   of the satisfaction.

2. **Input must be intentional, not continuous.** Auto-repeat on key hold breaks the
   mashing fantasy — players should feel each press as a discrete satisfying action.
   Anti-hold is not a workaround; it is the correct design.

3. **Physics feedback must be instant and then stop.** Continuous drift felt wrong
   immediately. Impulse-only physics (hit, knock, freeze) matched player expectation
   without any tuning iteration.

4. **Procedural audio is viable for this genre.** Per-key pitch mapping created emergent
   rhythmic play that was not designed — it was discovered during testing. Production
   should preserve and extend this.

5. **Web platform has hard limits on key capture.** Design around this early. If full
   keyboard control is a core safety feature (parent lock parity), Tauri is not optional.

6. **Prototype scope creep is informative.** The prototype grew from 8 to 12 modules
   (mouse-tools, mouse-trail, screen-shake, chaos-meter added during iteration). Each
   addition was validated by a real user need discovered during testing. Production scope
   should include all 12 functional areas.
