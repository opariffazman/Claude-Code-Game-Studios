# Sprint 12 — 2026-03-31 to 2026-04-02 — Animal Farm Polish + Particle Pack Integration

## Sprint Goal

Polish the Animal Farm theme to match the complete GDD vision (window content,
title bars, tray icons, tool indicator theming) and upgrade the particle system
to use the full Kenney particle pack (80 PNGs across 18 categories) instead of
the current 6-set subset.

## Current State Assessment

### Animal Farm — What's Working
- 30 animal icons in 3-col grid with sprite textures
- Adventure panel windows (panel_brown_corners_b + grid-paper interior + close button)
- Taskbar with panel_brown_dark NineSlice + round_brown start button + clock
- Notification banners using banner_modern sprite
- Decorative hanging barn banner at top-center
- Wallpaper: solid 0x5b8c3e (pasture green)

### Animal Farm — What's Missing (vs GDD)
1. **Windows lack title bar strip** — GDD specifies `panel_brown_dark.png` NineSlice
   strip across the top of each window. Currently windows have no title bar.
2. **Windows lack faux content** — GDD specifies grid-paper inset (60% width) +
   progress bars (progress_green, progress_blue). Currently just grid-paper fill.
3. **Windows lack farm-themed titles** — "Barn Plans", "Feed Schedule", etc. not
   rendered as text on the window. buildWindow() doesn't pass theme name.
4. **Taskbar missing tray icons** — GDD specifies checkbox_brown_checked,
   checkbox_brown_empty, round_brown_dark at right side. Not implemented.
5. **Tool indicator not themed** — Uses procedural Graphics pill. Should use
   adventure pack round button or panel sprite for Animal Farm.
6. **FPS counter always visible** — Raw white text at (4,4). Should be hidden
   by default or toggled with a debug key.
7. **buildWindow() not passing theme** — TilePanelBuilder.buildWindow() accepts
   optional `theme` param for adventure panels, but DesktopManager.buildWindows()
   never passes `this._activeThemeName`. This means windows always use
   pixel-adventure tiles instead of adventure panels.

### Particle System — Current State
- `ParticleManager`: procedural Graphics (circle, square, triangle) — 300-object pool
- `SpriteParticles`: loads 6 sets (spark, smoke, fire, star, magic, dirt) from
  `assets/sprites/particles/PNG (Transparent)/`
- 80 PNGs available but only ~26 loaded. Missing: circle(5), flame(04-06),
  flare(1), light(3), muzzle(5), scorch(3), scratch(1), slash(4), smoke(06-10),
  spark(06-07), star(06-09), symbol(2), trace(7), twirl(3), window(4)

### Particle System — What to Build
- Copy all particle PNGs to `public/assets/kenney/particles/` for runtime loading
- Expand PARTICLE_SETS to cover all 18 categories
- Map particle sets to destruction contexts (tool-specific effects)
- Replace procedural Graphics particles with sprite particles where visual quality improves

---

## Tasks

### P0 — Visible Polish (Animal Farm)

| ID | Task | Est. | Description |
|----|------|------|-------------|
| S12-01 | **Pass theme name to buildWindow()** | 0.1d | DesktopManager.buildWindows() must pass `this._activeThemeName` to TilePanelBuilder.buildWindow(). This unlocks adventure panels for windows. Currently the 4th param is never passed, so windows always use pixel-adventure tiles. |
| S12-02 | **Add title bar strip to adventure windows** | 0.2d | Extend TilePanelBuilder.buildWindow() to add a `panel_brown_dark.png` NineSlice strip (full width, ~32px tall) at the top of adventure-panel windows. Render farm-themed window title text ("Barn Plans", "Feed Schedule", etc.) on the strip. |
| S12-03 | **Add faux content to adventure windows** | 0.25d | Inside adventure-panel windows below the title bar: render a smaller grid-paper inset (60% interior width) + 2-3 progress bar sprites (progress_green.png, progress_blue.png) stretched horizontally. Preload progress bar textures in TilePanelBuilder. Purely decorative — makes windows look "lived in". |
| S12-04 | **Add taskbar tray icons** | 0.15d | Load and render checkbox_brown_checked, checkbox_brown_empty, round_brown_dark at the right side of the taskbar (left of clock). Scale proportionally to taskbar height. Decorative only. |
| S12-05 | **Hide FPS counter behind debug toggle** | 0.1d | FPS text in app.ts should be hidden by default. Toggle visibility with F3 or backtick key. When hidden, zero performance cost (skip text update). |

### P1 — Particle Pack Integration

| ID | Task | Est. | Description |
|----|------|------|-------------|
| S12-06 | **Copy particle PNGs to public/assets/kenney/particles/** | 0.1d | Copy all 80 PNGs from `assets/sprites/particles/PNG (Transparent)/` to `public/assets/kenney/particles/`. Flatten directory (skip Rotated/ subfolder). Vite serves from public/ at runtime. |
| S12-07 | **Expand PARTICLE_SETS to full Kenney catalog** | 0.25d | Add all 18 categories to SpriteParticles: circle, dirt, fire, flame, flare, light, magic, muzzle, scorch, scratch, slash, smoke, spark, star, symbol, trace, twirl, window. Update BASE_PATH to point to public/assets/kenney/particles/. Update preload() to handle the larger set. |
| S12-08 | **Map particle sets to destruction contexts** | 0.2d | Create a tool-to-particle mapping in config: hammer -> spark+slash+scorch, laser -> fire+flame+flare, bomb -> fire+muzzle+smoke+scorch, freeze -> magic+twirl+light+circle, magnet -> trace+symbol+spark. Emit context-appropriate sprites from the destruction pipeline instead of random sets. |
| S12-09 | **Replace procedural particles with sprites** | 0.25d | Where SpriteParticles has a matching set, prefer it over ParticleManager's Graphics particles. Keep Graphics pool as fallback for overflow/budget. Measure draw call impact — sprite particles batch better than individual Graphics objects. |
| S12-10 | **Mouse trail particle effect** | 0.2d | Emit a gentle trail of star/circle/magic sprites as the cursor moves across the desktop (not just on hits). Low count (1-2 per frame), short lifetime (0.3s), small scale. Feeds the "Instant Joy" pillar — movement itself is rewarding. Gated by PARTICLE_CONFIG flag. |

### P2 — Nice-to-Have Details

| ID | Task | Est. | Description |
|----|------|------|-------------|
| S12-11 | **Theme tool indicator styling** | 0.15d | When Animal Farm theme is active, replace the procedural pill background with an adventure pack sprite (round_brown or small panel). Keep the same pulse animation. Fall back to Graphics pill for other themes. |
| S12-12 | **Wallpaper damage tint per theme** | 0.1d | GDD specifies wallpaper damage cracks should be tinted darker green (0x4A7A30) for Animal Farm instead of the default dark color. Add theme-aware damage color to crackWallpaper(). |

---

## Task Summary

| Priority | Count | Total Est. |
|----------|-------|-----------|
| P0 — Visible Polish | 5 tasks | 0.8d |
| P1 — Particle Pack | 5 tasks | 1.0d |
| P2 — Nice-to-Have | 2 tasks | 0.25d |
| **Total** | **12 tasks** | **2.05d** |
| **With 20% buffer** | | **2.5d** |

## Critical Path

```
S12-01 → S12-02 → S12-03  (window polish chain — each builds on the previous)
S12-06 → S12-07 → S12-08 → S12-09  (particle integration chain)
```

S12-04, S12-05, S12-10, S12-11, S12-12 are independent and can run in parallel.

## Risks

| Risk | Probability | Impact | Mitigation |
|------|------------|--------|------------|
| progress_green/progress_blue PNGs not in the adventure pack | Medium | Low | Check asset directory. If missing, use colored NineSlice bars from existing panel textures. |
| Mouse trail particles exceed frame budget at high cursor speed | Medium | Medium | Cap trail emission rate (max 2/frame). Use PARTICLE_CONFIG.MAX_ACTIVE shared cap. Profile at 60fps. |
| Adventure panel NineSlice insets wrong for title bar strip | Low | Low | Already have working NineSlice infrastructure. Test with Double (2x/128px) adventure PNGs and adjust insets. |

## Definition of Done

- [ ] Adventure windows show title bar strip with farm-themed names
- [ ] Adventure windows contain grid-paper inset and progress bar sprites
- [ ] buildWindow() passes theme name so adventure panels are used
- [ ] Taskbar has decorative tray icons at right side
- [ ] FPS counter hidden by default, togglable with debug key
- [ ] All 80 particle PNGs available in public/assets/kenney/particles/
- [ ] SpriteParticles loads all 18 particle categories
- [ ] Tool-specific particle effects match destruction context
- [ ] Sprite particles preferred over procedural Graphics where available
- [ ] 60 FPS maintained with expanded particle catalog
- [ ] Draw calls remain < 100 per frame
- [ ] TypeScript compiles clean (strict mode)
- [ ] Existing tests pass
