# Production Preparation: Desk Smasher

> **Status**: Ready for Sprint Planning
> **Created**: 2026-03-28
> **Source Prototype**: `prototypes/desk-smash/`
> **Source Concept**: `design/gdd/game-concept.md`
> **Source Systems Index**: `design/gdd/systems-index.md`

---

## 1. What the Prototype Proved

The prototype (`prototypes/desk-smash/`) was built as 12 TypeScript source files
(~1,500 lines) on PixiJS 8.17.0 + Vite. It ran at 60 FPS and was playtested
with kids aged 1-6 on a parent's lap. Core findings:

| Hypothesis | Verdict | Evidence |
|-----------|---------|----------|
| Keyboard mashing loop is engaging | **Validated** | Kids sustain 5+ minutes of play without losing interest; immediate cause-and-effect creates self-reinforcing engagement |
| Per-key sound mapping creates rhythm play | **Validated** | Same key always produces same pitch/timbre; kids develop proto-musical patterns by favoring certain keys |
| Mouse tools (5 cycling) add depth for older kids | **Validated** | Kids 4-6 begin targeting specific elements; tool cycling (hammer/laser/bomb/freeze/magnet) adds intentionality without adding complexity for younger kids who just click |
| Procedural desktop generation keeps it fresh | **Validated** | Randomized icon count (8-14), window count (4-7), stickies (3-6), notifications (2-4), widgets (1-3), and 8 wallpaper palettes mean each rebuild feels new |
| Impulse physics feels satisfying | **Validated** | Elements bouncing, spinning, and ricocheting off screen edges with friction decay creates slapstick comedy; bomb and magnet AoE amplify this |
| Parent lock works | **Validated** | Typed keyword ("exit") and Ctrl+Shift+Q hold (3s) both function; random mashing does not accidentally trigger either |
| Wallpaper damage adds empty-space feedback | **Validated** (new discovery) | 6 damage types (cracks, burns, dents, paint splats, pixel corruption, scratches) make clicking empty wallpaper satisfying rather than a dead zone |
| Chaos meter creates excitement peaks | **Validated** (new discovery) | Rolling-window input frequency tracker at 3 thresholds (4/8/13 events/sec) produces screen shake escalation and extra particles |

### Prototype Shortcuts (Must Not Carry Forward)

- `setInterval`-based animations instead of PixiJS `Ticker`
- No asset pipeline (everything drawn inline with `Graphics`)
- No doc comments, no dependency injection, no tests
- Global event listeners wired directly in constructors
- Hardcoded tuning values throughout
- No touch support
- No theme system (single hardcoded palette set)
- No desktop rebuild cycle (just `setTimeout` reset)

---

## 2. What Needs to Change for Production

### Architecture: Fresh Codebase

Production code goes in `src/`, written from scratch. The prototype in
`prototypes/desk-smash/` is reference material only -- no code is migrated
directly. This follows the project's prototype rules: "prototype code is NOT
migrated directly -- it is rewritten to production standards."

### Animation: Ticker-Driven

All animations must run on the PixiJS `app.ticker`, not `setInterval` or
`setTimeout`. This eliminates drift, respects tab-backgrounding, and
integrates with PixiJS's frame budget.

### Asset Pipeline: PixiJS Assets API

Use `Assets.load()` / `Assets.add()` for all loadable resources. Even
procedurally generated content should be authored as reusable `GraphicsContext`
objects or texture atlases, not inline `Graphics` chains.

### Code Quality

| Standard | Requirement |
|---------|------------|
| Doc comments | All public APIs documented with JSDoc |
| Dependency injection | Systems receive dependencies via constructor, not global imports |
| Testable units | Core logic (input capture, parent lock, safety limiter, chaos meter) must be unit-testable in isolation |
| Data-driven config | All tuning values in external config objects, never hardcoded |
| Architecture Decision Records | Each system gets an ADR in `docs/architecture/` |

### Testing: Vitest

| Test Type | Target Systems | Purpose |
|----------|---------------|---------|
| Unit tests | Input capture, parent lock, safety limiter, chaos meter, mouse tools | Verify logic correctness without rendering |
| Integration tests | Destruction pipeline (effects + particles + audio) | Verify systems compose correctly |
| Performance tests | Particle system, desktop renderer | Verify frame budget on worst-case scenarios |
| Manual playtest | Full app | Verify "feel" and child engagement (cannot automate joy) |

Framework: **Vitest** (already in Vite ecosystem, fast, TypeScript-native).

---

## 3. Production Systems (from Systems Index)

All 11 systems from `design/gdd/systems-index.md`, assessed for production
readiness:

| # | System | Priority | Design Doc | Production Readiness | Notes |
|---|--------|----------|-----------|---------------------|-------|
| 1 | **App Shell** | MVP | [app-shell.md](../design/gdd/app-shell.md) | Designed, needs ADR | PixiJS init, fullscreen, game loop, responsive sizing. Production version must handle resize debounce and fullscreen transitions cleanly. |
| 2 | **Safety Limiter** | MVP | [safety-limiter.md](../design/gdd/safety-limiter.md) | Designed, needs unit tests | Flash rate limiter (3/sec WCAG), volume cap. Must be instantiated before any visual/audio output. Critical safety system -- tests are non-negotiable. |
| 3 | **Input Capture** | MVP | [input-capture.md](../design/gdd/input-capture.md) | Designed, needs ADR + tests | Keyboard, mouse, touch capture. System shortcut blocking. Production must use `addEventListener` with proper `capture: true` and cleanup. Prototype wires events in constructors -- production must use DI. |
| 4 | **Particle System** | MVP | [particle-system.md](../design/gdd/particle-system.md) | Designed, needs perf budget | Object pool with configurable emitters. Prototype uses per-frame `Graphics` ops. Production must use pre-built `GraphicsContext` and enforce a particle budget ceiling. |
| 5 | **Audio Engine** | MVP | [audio-engine.md](../design/gdd/audio-engine.md) | Designed, needs ADR | Web Audio API oscillator-based (no external audio files). Per-key pitch mapping. Must handle `AudioContext` autoplay policy. Production must pool `OscillatorNode` instances. |
| 6 | **Desktop Renderer** | MVP | [desktop-renderer.md](../design/gdd/desktop-renderer.md) | Designed, needs refactor plan | Procedural layout (icons, windows, stickies, notifications, widgets, taskbar). Prototype is 750+ lines. Production should decompose into sub-renderers per element type. |
| 7 | **Destruction Effects** | MVP | [destruction-effects.md](../design/gdd/destruction-effects.md) | Designed, needs effect registry | Pool of randomized visual effects applied to desktop elements. Production should use a registry pattern: each effect is a pluggable behavior class. |
| 8 | **Parent Lock** | MVP | [parent-lock.md](../design/gdd/parent-lock.md) | Designed, needs unit tests | Keyword sequence detection + key combo hold timer. Safety-critical -- must have thorough unit tests covering edge cases (partial matches, rapid input, combo timing). |
| 9 | **Theme System** | Polished | Not started | Needs design doc | Defines desktop themes (icon sets, window styles, wallpaper palettes, color schemes). Desktop Renderer consumes theme data. Prototype uses hardcoded palette array -- production needs a proper theme schema. |
| 10 | **Chaos Meter** | Polished | Not started | Prototype exists, needs design doc | Rolling-window input frequency tracker with 3 threshold levels. Prototype implementation is 29 lines and clean -- production version needs configurable thresholds and event bus integration. |
| 11 | **Desktop Rebuild Cycle** | Polished | Not started | Needs design doc | Monitors destruction progress, triggers rebuild animation, selects next theme. Prototype uses bare `setTimeout` -- production needs animated transition (whoosh/sweep). |

### Design Doc Status

- **8 of 11** systems have design docs (all MVP-tier)
- **0 of 11** design docs have been formally reviewed
- **3 systems** (Theme System, Chaos Meter, Desktop Rebuild Cycle) need design docs written
- **All 8 existing docs** need `/design-review` pass before implementation

---

## 4. New Systems Discovered During Prototyping

The prototype grew from the original 8 planned files to 12. Four new systems
emerged that were not in the original systems index:

### 4a. Mouse Tool System

**What it does**: 5 cycling tools (hammer, laser, bomb, freeze, magnet) that
give mouse clicks distinct behaviors. Each tool has unique click effects, drag
mechanics, and drag-end behaviors.

**Why it matters**: Transforms mouse input from "click = random effect" to
"click = intentional tool use." Older kids (4-6) begin strategizing which tool
to use on which target. Younger kids get variety without needing to understand
the tools.

**Prototype evidence**: `mouse-tools.ts` (357 lines) -- the largest new file.
Includes tool-specific custom cursors, click effects (hammer knockback, laser
precision, bomb AoE, freeze brittle, magnet pull), drag trails with per-tool
visual styles, and drag-end behaviors (bomb explodes at release, magnet flings
outward).

**Production needs**: Design doc, effect registry integration, data-driven tool
definitions, unit tests for damage/AoE calculations.

### 4b. Wallpaper Damage System

**What it does**: 6 damage types applied to empty wallpaper space when clicked:
cracks (spider-web fracture lines), burn marks (scorched circles with embers),
dents/craters (concentric depth rings), paint splats (colorful splashes),
pixel corruption (digital glitch grid), and scratch marks (diagonal claw lines).

**Why it matters**: Eliminates "dead zones" -- clicking empty wallpaper is just
as satisfying as clicking an element. The wallpaper becomes a canvas of
accumulated destruction, creating a visual history of the session.

**Prototype evidence**: `crackWallpaper()` method in `desktop.ts` (100 lines,
6 switch cases). Each damage type uses procedural `Graphics` drawing.

**Production needs**: Extract into standalone system, design doc, integrate
with destruction effects registry, support theme-aware damage colors.

### 4c. Chaos Meter

**What it does**: Tracks input frequency over a 2-second rolling window.
At thresholds (4, 8, 13 events/second), triggers escalating effects:
- Level 1: Screen shake on every hit
- Level 2: Extra particles on impacts
- Level 3: (Future) Screen-wide events

**Why it matters**: Creates excitement peaks during rapid mashing. The
escalation rewards sustained engagement without requiring the child to
understand the system.

**Prototype evidence**: `chaos-meter.ts` (29 lines) -- clean, minimal
implementation. Already integrated with screen shake and particle scaling
in `main.ts`.

**Production needs**: Design doc (was listed as "Polished" tier in systems
index but prototype proved it belongs in Sprint 1-2), configurable thresholds,
event bus for Level 3 screen-wide events.

### 4d. Screen Shake

**What it does**: Additive intensity with exponential decay. Triggered by
chaos meter levels and tool impacts. Offsets the stage container's x/y
position by a random amount proportional to intensity.

**Why it matters**: Makes destruction feel impactful. The escalation from
chaos meter creates a physical sense of the desktop "fighting back."

**Prototype evidence**: `screen-shake.ts` (27 lines) -- minimal, effective.
Decay rate 0.9, max intensity 15px.

**Production needs**: Design doc, configurable parameters, safety limiter
integration (ensure shake frequency stays within photosensitivity limits).

### 4e. Mouse Trail

**What it does**: Sparkle particles that follow mouse movement. Object-pooled
(100 particles), color-randomized from 7 bright colors, spawned every 5px of
mouse travel, lifetime 0.3-0.5s with fade-out and shrink.

**Why it matters**: Makes mouse movement itself fun, even before clicking.
Provides continuous visual feedback that reinforces "I am in control."

**Prototype evidence**: `mouse-trail.ts` (113 lines) -- proper object pooling
with `GraphicsContext` reuse.

**Production needs**: Design doc, integration with safety limiter (flash rate),
configurable colors per theme.

### Updated Systems Count

| Source | Systems |
|--------|---------|
| Original systems index | 11 |
| Discovered in prototype | +5 (Mouse Tools, Wallpaper Damage, Chaos Meter*, Screen Shake, Mouse Trail) |
| **Total production systems** | **16** |

*Chaos Meter was listed in the systems index as "Polished/Not Started" but the
prototype implemented it early and proved it's core to the feel. It needs a
design doc but not a new system slot.

Corrected total: **15 systems** (11 original + 4 genuinely new: Mouse Tools,
Wallpaper Damage, Screen Shake, Mouse Trail). Chaos Meter was already tracked.

---

## 5. Platform Targets (in Order)

### Platform 1: Web (Primary)

| Attribute | Detail |
|----------|--------|
| **Technology** | PixiJS 8 + TypeScript + Vite |
| **Distribution** | Static HTML/JS hosted on any CDN (Netlify, Vercel, GitHub Pages) |
| **Effort** | Base build -- all development targets this |
| **Key Constraint** | Browser key blocking is imperfect; some system shortcuts will leak |
| **Minimum Browser Support** | Chrome 100+, Firefox 100+, Safari 16+, Edge 100+ |
| **Target Performance** | 60 FPS on 2020-era integrated graphics |

### Platform 2: Tauri Desktop App

| Attribute | Detail |
|----------|--------|
| **Technology** | Tauri (Rust) wrapping the web build's WebView |
| **Distribution** | Direct download, or bundled with Steam/itch.io |
| **Effort** | Medium -- requires Rust toolchain, global shortcut interception, window management |
| **Key Advantage** | OS-level key blocking (no leaked shortcuts), fullscreen control, always-on-top mode |
| **When** | After web version ships and stabilizes |

### Platform 3: Wallpaper Engine (Steam)

| Attribute | Detail |
|----------|--------|
| **Technology** | Web wallpaper type + `project.json` manifest |
| **Distribution** | Steam Workshop |
| **Effort** | Low -- mostly configuration and a WE-specific entry point |
| **Key Advantage** | Steam as distribution channel; interactive living wallpaper mode |
| **When** | After Tauri version, or in parallel if demand exists |

### Platform Scope Rule

Platforms 2 and 3 are **post-v1.0 scope**. No Tauri or Wallpaper Engine work
enters the sprint plan until the web version is feature-complete, tested, and
deployed.

---

## 6. Suggested Sprint Plan

### Capacity Assumptions

- Single developer (or single AI agent team) working full-time
- Each sprint = 1 week (5 working days)
- 20% buffer = 1 day reserved for unplanned work per sprint
- Effective capacity = 4 days per sprint

### Sprint 1 (Week 1): Foundation + Input + Safety + Audio

**Goal**: Standing app with input capture, parent lock, audio, and safety
systems. A kid can mash the keyboard and hear sounds, but no desktop or
destruction yet.

| ID | Task | Est. | Dependencies | Acceptance Criteria |
|----|------|------|-------------|-------------------|
| S1-01 | Project scaffolding (Vite + PixiJS 8 + TypeScript + Vitest) | 0.5d | None | `npm run dev` launches blank PixiJS canvas; `npm test` runs |
| S1-02 | App Shell (fullscreen, resize, ticker loop) | 0.5d | S1-01 | Canvas fills viewport, handles resize, ticker runs at 60fps |
| S1-03 | Safety Limiter (flash rate + volume cap) | 0.5d | S1-01 | Unit tests pass: blocks >3 flashes/sec, caps volume at threshold |
| S1-04 | Input Capture (keyboard + mouse + touch + shortcut blocking) | 1d | S1-02 | All keys fire events, system shortcuts blocked, touch events captured |
| S1-05 | Audio Engine (oscillator sounds + per-key mapping) | 1d | S1-02, S1-03 | Every keypress plays a sound; same key = same pitch; volume capped |
| S1-06 | Parent Lock (keyword + combo hold + indicator dot) | 0.5d | S1-04 | Typing "exit" unlocks; Ctrl+Shift+Q held 3s unlocks; unit tests pass |
| **Buffer** | Unplanned work | 1d | -- | -- |
| | **Total** | **5d** | | |

### Sprint 2 (Week 2): Desktop + Destruction + Particles

**Goal**: Full destruction loop. Kid mashes keyboard and elements get destroyed
with particle effects and physics. Clicking works with basic tool rotation.

| ID | Task | Est. | Dependencies | Acceptance Criteria |
|----|------|------|-------------|-------------------|
| S2-01 | Particle System (object pool + configurable emitters) | 1d | S1-02, S1-03 | Particles render, pool recycles, respects safety limiter, perf test passes |
| S2-02 | Desktop Renderer (procedural layout: icons, windows, stickies, notifications, widgets, taskbar) | 1d | S1-02 | Desktop generates with randomized element counts; elements are targetable |
| S2-03 | Destruction Effects (effect registry + 5-6 base effects) | 1d | S2-01, S1-05 | Each effect applies damage + visual + sound; effects are pluggable classes |
| S2-04 | Wallpaper Damage System (6 damage types) | 0.5d | S2-02 | Clicking empty wallpaper renders a random damage mark |
| S2-05 | Wire input -> destruction pipeline | 0.5d | S1-04, S2-02, S2-03 | Keypress destroys random element; click destroys targeted element; physics impulse applied |
| **Buffer** | Unplanned work | 1d | -- | -- |
| | **Total** | **5d** | | |

### Sprint 3 (Week 3): Mouse Tools + Chaos + Polish

**Goal**: Full mouse tool system, chaos meter escalation, screen shake, mouse
trail. The experience is feature-complete for a single theme.

| ID | Task | Est. | Dependencies | Acceptance Criteria |
|----|------|------|-------------|-------------------|
| S3-01 | Mouse Tool System (5 tools: hammer/laser/bomb/freeze/magnet) | 1.5d | S2-01, S2-03, S1-05 | Tools cycle on click; each has unique click/drag/release behavior; cursors display |
| S3-02 | Chaos Meter (rolling window + 3 thresholds) | 0.5d | S1-04 | Unit tests verify threshold transitions; level exposed for other systems |
| S3-03 | Screen Shake (additive intensity + decay) | 0.5d | S3-02 | Shake triggers at chaos level 1+; respects safety limiter; configurable |
| S3-04 | Mouse Trail (sparkle particles on movement) | 0.5d | S2-01 | Trail follows mouse; object-pooled; fades/shrinks; theme-aware colors |
| S3-05 | Integration polish + playtest fixes | 1d | S3-01 through S3-04 | Full loop plays smoothly; no jarring transitions; FPS stays at 60 |
| **Buffer** | Unplanned work | 1d | -- | -- |
| | **Total** | **5d** | | |

### Sprint 4 (Week 4): Themes + Rebuild + Deploy

**Goal**: Multiple themes, desktop rebuild cycle with animated transitions,
production deployment to web.

| ID | Task | Est. | Dependencies | Acceptance Criteria |
|----|------|------|-------------|-------------------|
| S4-01 | Theme System (theme schema + 3 themes) | 1d | S2-02 | Themes define palette, icon set, window styles; desktop renderer consumes theme data |
| S4-02 | Desktop Rebuild Cycle (destruction detection + transition animation + theme rotation) | 1d | S4-01, S2-02, S2-03 | Detects all-destroyed; plays sweep animation; loads new theme; resets elements |
| S4-03 | Final parent lock polish + settings | 0.5d | S1-06 | Configurable keyword; visual indicator refined; exit flow is clean |
| S4-04 | Build + deploy pipeline (Vite build, static hosting) | 0.5d | All | Production build < 500KB; deploys to hosting; loads in < 2s on 4G |
| S4-05 | Full playtest + bug fixes | 1d | All | 5-minute session with child; no crashes, no escaped shortcuts, no safety violations |
| **Buffer** | Unplanned work | 1d | -- | -- |
| | **Total** | **5d** | | |

### Sprint Summary

| Sprint | Theme | Key Deliverable |
|--------|-------|----------------|
| 1 | Foundation | Keyboard makes sounds, parent lock works |
| 2 | Destruction | Full destroy-the-desktop loop |
| 3 | Depth | Mouse tools, chaos escalation, juice |
| 4 | Completeness | Themes, rebuild cycle, ship it |

### Critical Path

```
S1-01 -> S1-02 -> S1-04 -> S2-02 -> S2-05 -> S3-01 -> S4-01 -> S4-02
              \-> S1-03 -> S2-01 -> S2-03 -/
              \-> S1-05 --------/
```

The longest chain runs through: scaffolding -> app shell -> input capture ->
desktop renderer -> wiring -> mouse tools -> theme system -> rebuild cycle.
Any delay on this chain delays the ship date.

---

## 7. Risk Assessment

| # | Risk | Probability | Impact | Mitigation |
|---|------|------------|--------|------------|
| R1 | **Browser key blocking limitations** -- system shortcuts (Ctrl+Alt+Del, OS-level keys) cannot be blocked in web browsers | High | Medium | Accept as known limitation for web platform. Document which keys leak. Tauri (Platform 2) fully resolves this. Parent lock still works regardless. |
| R2 | **Performance with many particles** -- rapid mashing at chaos level 3 could spawn hundreds of particles simultaneously on low-end devices | Medium | High | Set hard particle budget ceiling (300 active max). Profile early in Sprint 2. Use `GraphicsContext` sharing. Degrade gracefully: skip new emissions when budget is hit. |
| R3 | **Touch support needs separate testing** -- prototype has no touch support; mobile/tablet behavior is untested | Medium | Medium | Sprint 1 includes touch in Input Capture design. Test on real iPad/Android tablet by Sprint 2. May need gesture disambiguation (tap vs. drag vs. multi-touch). |
| R4 | **"Just one more effect" scope creep** -- destruction effects catalog can grow endlessly; each new effect feels small but adds testing and integration burden | High | Medium | Hard cap: 6 destruction effects + 6 wallpaper damage types + 5 mouse tools for v1.0. New effects go in a post-launch backlog. Enforce via design doc scope section. |
| R5 | **Destruction effects don't "feel right" in production** -- the prototype's feel came from quick iteration; rewriting to production standards may lose the magic | Medium | High | Keep the prototype running as reference during all of Sprint 2-3. A/B compare constantly. If production feels worse, identify the specific parameter difference rather than reverting to prototype code. |
| R6 | **PixiJS 8 API gaps in LLM knowledge** -- model training cutoff is May 2025; PixiJS 8 may have undocumented breaking changes | Low | Medium | Reference `pixijs.com/llms-full.txt` for current API. Prototype already validates PixiJS 8.17.0 works for our use cases. Pin the version. |
| R7 | **Audio autoplay policy** -- browsers block `AudioContext` until user gesture; first keypress must be the trigger | Low | Low | Already solved in prototype (lazy init on first input). Carry pattern forward. Test on Safari specifically (strictest autoplay policy). |
| R8 | **Photosensitivity safety violation** -- chaos level 3 effects or rapid screen shake could violate WCAG 3-flash rule | Low | Critical | Safety Limiter is the first system built (Sprint 1). All visual systems must pass through it. Automated test: simulate 60 rapid inputs and verify flash count stays under threshold. |
| R9 | **Sprint 4 overloaded** -- theme system + rebuild cycle + deploy + final playtest is ambitious for one week | Medium | Medium | Theme System can be simplified: 3 palette swaps instead of full theme schemas. Rebuild cycle MVP is a simple fade-to-black transition, not a fancy animation. Deploy is a `vite build` + upload. |

### Risk Severity Matrix

```
              Low Impact    Medium Impact    High Impact    Critical Impact
High Prob     --            R1, R4           --             --
Medium Prob   --            R3, R9           R2, R5         --
Low Prob      R7            R6               --             R8
```

**Top 3 risks to watch**: R2 (particle performance), R5 (feel regression),
R8 (photosensitivity safety).

---

## 8. Definition of Done (v1.0 Web Release)

A release candidate must satisfy all of the following:

### Functional

- [ ] Every keyboard key triggers a destruction effect + sound
- [ ] Every mouse click triggers a tool-specific effect on the targeted element
- [ ] Mouse drag applies tool-specific drag behavior
- [ ] 5 mouse tools cycle correctly (hammer, laser, bomb, freeze, magnet)
- [ ] Desktop generates procedurally with randomized element counts
- [ ] 6 wallpaper damage types render on empty-space clicks
- [ ] Chaos meter tracks input frequency and triggers escalation at 3 thresholds
- [ ] Screen shake triggers at chaos level 1+
- [ ] Mouse trail follows cursor with sparkle particles
- [ ] Parent lock: typed keyword ("exit") unlocks
- [ ] Parent lock: Ctrl+Shift+Q held 3s unlocks
- [ ] Desktop rebuild cycle triggers when all elements destroyed
- [ ] At least 3 desktop themes rotate on rebuild
- [ ] System shortcuts blocked (best-effort in browser)

### Safety

- [ ] Flash rate never exceeds 3/second (WCAG)
- [ ] Audio volume capped programmatically
- [ ] No sharp, startling, or scary sounds
- [ ] No rapid high-contrast color alternation
- [ ] All animations use smooth transitions

### Quality

- [ ] 60 FPS sustained on 2020-era hardware during chaos level 3
- [ ] Unit tests for: safety limiter, input capture, parent lock, chaos meter
- [ ] Doc comments on all public APIs
- [ ] All tuning values externalized to config
- [ ] Production build < 500KB (no external assets)
- [ ] Load time < 2 seconds on 4G connection

### Deployment

- [ ] Production build runs with `vite build`
- [ ] Deployed to static hosting
- [ ] Works in Chrome, Firefox, Safari, Edge (latest 2 versions)
- [ ] No console errors in production build

---

## 9. Open Decisions (Need Resolution Before Sprint 1)

| # | Decision | Options | Owner | Deadline |
|---|---------|---------|-------|----------|
| D1 | Chaos meter visibility | Hidden (current prototype) vs. visible bar for older kids | Creative Director | Before Sprint 3 |
| D2 | Rebuild transition style | Fade-to-black (simple) vs. whoosh/sweep animation (polished) | Creative Director | Before Sprint 4 |
| D3 | Touch gesture mapping | Tap=click+tool / drag=tool-drag / multi-touch=keyboard-mash | Game Designer | Before Sprint 1 |
| D4 | Sound generation approach | Keep oscillator-only (zero assets) vs. add a small sample library | Audio Lead | Before Sprint 1 |
| D5 | Theme scope for v1.0 | 3 palette swaps vs. 3 fully distinct themes (different icons, window styles) | Creative Director + Producer | Before Sprint 4 |

---

## 10. Next Steps

1. **Run `/design-review`** on all 8 existing design docs -- none have been
   formally reviewed yet
2. **Write design docs** for the 5 undocumented systems: Theme System, Chaos
   Meter, Desktop Rebuild Cycle, Mouse Tool System, Screen Shake
   (Wallpaper Damage and Mouse Trail can be subsections of existing docs)
3. **Resolve open decisions** D3 and D4 (they block Sprint 1 task definitions)
4. **Create Sprint 1 plan** at `production/sprints/sprint-01.md` using the
   sprint plan template
5. **Set up the production `src/` directory** with project scaffolding
6. **Create the risk register** at `production/risk-register/risks.md` from
   the assessment in section 7
