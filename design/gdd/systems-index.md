# Systems Index: Desk Smasher

> **Status**: Approved
> **Created**: 2026-03-28
> **Last Updated**: 2026-03-28
> **Source Concept**: design/gdd/game-concept.md

---

## Overview

Desk Smasher is a sensory toy with a surprisingly focused mechanical scope: capture
all input, turn it into satisfying destruction on a fake desktop, and keep the
experience safe for kids and trustworthy for parents. There are no progression,
economy, or narrative systems — the core loop is entirely "input → visual/audio
feedback." The systems decompose into: an app shell that bootstraps PixiJS, an
input layer that captures everything, a destruction pipeline (particles + effects +
desktop renderer), audio feedback, and safety/parent-lock guardrails.

---

## Systems Enumeration

| # | System Name | Category | Priority | Status | Design Doc | Depends On |
|---|-------------|----------|----------|--------|------------|------------|
| 1 | App Shell | Core | MVP | Designed | [design/gdd/app-shell.md](app-shell.md) | (none) |
| 2 | Safety Limiter | Core | MVP | Designed | [design/gdd/safety-limiter.md](safety-limiter.md) | (none) |
| 3 | Input Capture | Core | MVP | Designed | [design/gdd/input-capture.md](input-capture.md) | App Shell |
| 4 | Particle System | Gameplay | MVP | Designed | [design/gdd/particle-system.md](particle-system.md) | App Shell, Safety Limiter |
| 5 | Audio Engine | Audio | MVP | Designed | [design/gdd/audio-engine.md](audio-engine.md) | App Shell, Safety Limiter |
| 6 | Desktop Renderer | Gameplay | MVP | Designed | [design/gdd/desktop-renderer.md](desktop-renderer.md) | App Shell, Theme System |
| 7 | Destruction Effects | Gameplay | MVP | Designed | [design/gdd/destruction-effects.md](destruction-effects.md) | Particle System, Audio Engine |
| 8 | Parent Lock | Meta | MVP | Designed | [design/gdd/parent-lock.md](parent-lock.md) | Input Capture |
| 9 | Theme System (inferred) | Core | Polished | Not Started | — | App Shell |
| 10 | Chaos Meter (inferred) | Gameplay | Polished | Not Started | — | Input Capture |
| 11 | Desktop Rebuild Cycle | Gameplay | Polished | Not Started | — | Desktop Renderer, Theme System, Destruction Effects |

---

## Categories

| Category | Description | Systems |
|----------|-------------|---------|
| **Core** | Foundation systems everything depends on | App Shell, Safety Limiter, Input Capture, Theme System |
| **Gameplay** | The systems that produce the fun | Particle System, Destruction Effects, Desktop Renderer, Chaos Meter, Desktop Rebuild Cycle |
| **Audio** | Sound and music systems | Audio Engine |
| **Meta** | Systems outside the core toy loop | Parent Lock |

---

## Priority Tiers

| Tier | Definition | Target Milestone | Systems |
|------|------------|------------------|---------|
| **MVP** | Required for core "smash → feedback" loop to function | Day 1 (weekend) | App Shell, Safety Limiter, Input Capture, Particle System, Audio Engine, Desktop Renderer, Destruction Effects, Parent Lock |
| **Polished** | Adds variety, rhythm, and replayability | Day 2 (weekend) | Theme System, Chaos Meter, Desktop Rebuild Cycle |
| **Alpha** | Full effect catalog, parent settings, multiple themes | Week 2 | (content expansion, not new systems) |
| **Full Vision** | Tauri desktop app, Wallpaper Engine, desktop overlay | Ongoing | (platform integration, not game systems) |

---

## Dependency Map

### Foundation Layer (no dependencies)

1. **App Shell** — PixiJS initialization, fullscreen canvas, game loop tick, responsive sizing. Everything mounts here.
2. **Safety Limiter** — enforces photosensitivity limits (max 3 flashes/sec), caps audio volume. Must exist before any visual/audio output.

### Core Layer (depends on foundation)

3. **Input Capture** — depends on: App Shell. Captures all keyboard, mouse, and touch input. Blocks system shortcuts. Routes events to other systems.
4. **Particle System** — depends on: App Shell, Safety Limiter. Underlying VFX engine for explosions, confetti, debris, sparkles. Destruction effects are authored on top of this.
5. **Audio Engine** — depends on: App Shell, Safety Limiter. Web Audio API wrapper. Maps input events to randomized cartoon sounds. Volume-capped.

### Feature Layer (depends on core)

6. **Theme System** — depends on: App Shell. Defines desktop themes (icons, windows, wallpaper, color palette). Desktop Renderer consumes theme data.
7. **Destruction Effects** — depends on: Particle System, Audio Engine. Pool of 15+ randomized visual/audio destruction effects. Each effect is a reusable behavior applied to desktop elements.
8. **Desktop Renderer** — depends on: App Shell, Theme System. Generates the fake desktop layout with windows, icons, taskbar. Provides the "targets" that get destroyed.
9. **Chaos Meter** — depends on: Input Capture. Tracks input frequency over a rolling window. At thresholds, triggers escalating screen-wide events.
10. **Parent Lock** — depends on: Input Capture. Monitors for typed keyword sequence and key combo hold. Controls unlock/exit flow.

### Presentation Layer (depends on features)

11. **Desktop Rebuild Cycle** — depends on: Desktop Renderer, Theme System, Destruction Effects. Monitors destruction state, triggers rebuild animation, picks next theme, resets the desktop.

---

## Recommended Design Order

| Order | System | Priority | Layer | Est. Effort |
|-------|--------|----------|-------|-------------|
| 1 | App Shell | MVP | Foundation | S |
| 2 | Safety Limiter | MVP | Foundation | S |
| 3 | Input Capture | MVP | Core | S |
| 4 | Particle System | MVP | Core | M |
| 5 | Audio Engine | MVP | Core | S |
| 6 | Desktop Renderer | MVP | Feature | M |
| 7 | Destruction Effects | MVP | Feature | M |
| 8 | Parent Lock | MVP | Feature | S |
| 9 | Theme System | Polished | Feature | S |
| 10 | Chaos Meter | Polished | Feature | S |
| 11 | Desktop Rebuild Cycle | Polished | Presentation | M |

*Effort: S = 1 session, M = 2-3 sessions*

**Note:** For MVP, Desktop Renderer can use a hardcoded single theme instead of
depending on Theme System. This removes Theme System from the MVP critical path.
Theme System becomes necessary only at the Polished tier when multiple themes are
introduced.

---

## Circular Dependencies

None found. The dependency graph is a clean DAG (directed acyclic graph).

---

## High-Risk Systems

| System | Risk Type | Risk Description | Mitigation |
|--------|-----------|-----------------|------------|
| Destruction Effects | Design | Effects must "feel" satisfying — wrong tuning makes it janky instead of joyful | Prototype 2-3 effects early, playtest with actual kid |
| Input Capture | Technical | Browser key blocking is imperfect — some system shortcuts may leak through | Document known limitations, Tauri version fixes this |
| Particle System | Technical | Many simultaneous particles on low-end devices may drop frames | Profile early, set particle budget per effect, test on worst-case hardware |
| Safety Limiter | Design | Too aggressive limiting may make effects feel muted; too permissive risks safety | Start strict, relax based on testing. Never compromise the 3-flash rule. |

---

## Progress Tracker

| Metric | Count |
|--------|-------|
| Total systems identified | 11 |
| Design docs started | 8 |
| Design docs reviewed | 0 |
| Design docs approved | 0 |
| MVP systems designed | 8/8 |
| Polished systems designed | 0/3 |

---

## Next Steps

- [ ] Design MVP-tier systems first (use `/design-system [system-name]`)
- [ ] Start with App Shell → Safety Limiter → Input Capture (foundation + core)
- [ ] Prototype Destruction Effects early — highest design risk
- [ ] Run `/design-review` on each completed GDD
- [ ] Run `/gate-check pre-production` when MVP systems are designed
- [ ] Prototype the core destruction loop (`/prototype desk-smash`)
