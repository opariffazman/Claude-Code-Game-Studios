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
- **8 source files** (~600 lines total): app shell, safety limiter, audio engine,
  particle system, desktop renderer, destruction effects, input capture, parent lock

Shortcuts taken:
- setInterval-based animations instead of ticker-driven (works for prototype)
- Single hardcoded desktop theme (no theme system)
- No chaos meter or rebuild cycle
- No touch support
- No automated tests (manual testing only)

### Result

**To test**: Run `cd prototypes/desk-smash && npm run dev` to launch the dev server.

Observations (fill in after live testing):
- [ ] Every keypress triggers destruction effect + sound?
- [ ] Every click targets the correct element?
- [ ] Effects feel satisfying and varied?
- [ ] Sounds are fun and not annoying?
- [ ] FPS stays at 60?
- [ ] Parent lock (type "exit") works?
- [ ] Ctrl+Shift+Q hold works?
- [ ] System keys are blocked?

### Metrics
- Frame time: [measure during test]
- Particle count peak: [measure during test]
- Time to destroy all elements: [measure during test]
- Effect variety perception: [subjective — do 5 effects feel like enough?]

### Recommendation: [PROCEED / PIVOT / KILL]

[Fill in after testing — based on whether the core loop feels fun]

### If Proceeding
- Move from setInterval animations to ticker-driven (smoother, no drift)
- Add Theme System for variety across sessions
- Add Chaos Meter for escalation excitement
- Add Desktop Rebuild Cycle for session rhythm
- Add touch support for tablet use
- Consider adding 2-3 more destruction effects
- Production implementation should be written from scratch, not refactored from prototype

### Lessons Learned
[Fill in after testing]
