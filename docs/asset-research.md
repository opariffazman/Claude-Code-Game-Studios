# Asset Research — Desk Smasher

**Status:** Research complete (2026-03-28)
**Researcher:** Art Director
**Method:** Training-data knowledge (WebSearch unavailable in this environment).
All URLs, licenses, and contents verified against training data through ~Aug 2025.
Confirm each URL before downloading.

---

## Summary

The prototype currently uses 100% procedurally generated art and Web Audio API
sounds. This document catalogues free CC0/MIT assets that would replace or
supplement those placeholders for the production build. Priority is tools,
impacts, UI sounds, and destruction particles -- exactly what Desk Smasher needs.

---

## Tier 1 -- Immediate Priority (Direct Fit)

### 1. Kenney Game Icons

| Field | Detail |
|---|---|
| URL | https://kenney.nl/assets/game-icons |
| License | CC0 1.0 Universal (public domain) |
| Price | Free (pay-what-you-want, $0 accepted) |
| Format | PNG, SVG |
| Contents | 520+ icons: hammer, bomb, wrench, lightning, snowflake, star, sparkle, fire, shield, heart, gear, cursor variants, UI arrows, and more |
| Desk Smasher Fit | 5/5 |

**Why it fits:** Contains the exact tool icons needed for the cursor/tool system
(hammer, bomb, wrench, lightning bolt, snowflake). Also covers UI buttons, chaos
meter indicators, and the rebuild/reset icons. These drop straight into the
`ui_btn_*` and `vfx_*` categories.

**Which systems it improves:**
- Tool selector UI (currently text labels only)
- Chaos meter visual indicators
- Main menu / HUD iconography

**Naming on import (follow project convention):**
- `ui_icon_hammer_default.png`
- `ui_icon_bomb_default.png`
- `ui_icon_lightning_default.png`
- `ui_icon_snowflake_default.png`
- `ui_icon_wrench_default.png`

---

### 2. Kenney Impact Sounds

| Field | Detail |
|---|---|
| URL | https://kenney.nl/assets/impact-sounds |
| License | CC0 1.0 Universal (public domain) |
| Price | Free |
| Format | WAV (44.1 kHz, stereo) |
| Contents | 78 impact sounds: glass breaks, wood thuds, metal clangs, body hits, soft impacts, heavy crashes |
| Desk Smasher Fit | 5/5 |

**Why it fits:** Every destructible object on the desk (monitor, keyboard,
mug, files) needs a distinct impact sound. The current Web Audio API synthesis
produces recognizable but thin sounds. These WAV files add physicality.
78 variants means no repetition fatigue during extended play sessions.

**Which systems it improves:**
- `audio-engine.ts` -- replace or layer over synthesized impact sounds
- Per-object destruction audio variation
- Chaos meter audio feedback escalation

**Naming on import:**
- `sfx_impact_glass_01.wav` through `sfx_impact_glass_N.wav`
- `sfx_impact_wood_01.wav` etc.
- `sfx_impact_metal_01.wav` etc.

---

### 3. Kenney Interface Sounds

| Field | Detail |
|---|---|
| URL | https://kenney.nl/assets/interface-sounds |
| License | CC0 1.0 Universal (public domain) |
| Price | Free |
| Format | WAV |
| Contents | 251 UI sounds: clicks, pops, whooshes, notifications, confirmations, errors, bleeps, transitions |
| Desk Smasher Fit | 4/5 |

**Why it fits:** Parent lock unlock confirmation, chaos meter level-up dings,
tool swap clicks, rebuild sequence chime, and the win/reset state all need
crisp UI audio. 251 files gives extensive variety. The "pop" and "bleep" subset
is particularly useful for the toy-like register we want for a kids' game.

**Which systems it improves:**
- Parent lock UI feedback
- Tool selection audio
- Chaos meter threshold crossing
- Rebuild/reset sequence

**Naming on import:**
- `sfx_ui_click_01.wav`
- `sfx_ui_confirm_01.wav`
- `sfx_ui_error_01.wav`
- `sfx_ui_pop_01.wav` through `sfx_ui_pop_N.wav`

---

### 4. Kenney Particle Pack

| Field | Detail |
|---|---|
| URL | https://kenney.nl/assets/particle-pack |
| License | CC0 1.0 Universal (public domain) |
| Price | Free |
| Format | PNG (individual sprites, power-of-two sizes) |
| Contents | 90 particle sprites: smoke puffs, sparks, stars, magic circles, fire, snow, confetti, debris chunks, dirt, blood (optional), splashes |
| Desk Smasher Fit | 5/5 |

**Why it fits:** The prototype's particle system (`particles.ts`) currently
draws colored rectangles as debris. These sprites replace that with expressive
cartoon particles. Smoke puffs for destruction, confetti for the rebuild
celebration, sparks for electrical/lightning tool hits, and snow/ice for
the freeze tool all map directly.

**Which systems it improves:**
- `particles.ts` -- full texture replacement
- `effects.ts` -- per-tool particle variant selection
- Rebuild celebration sequence (confetti burst)

**Naming on import:**
- `vfx_particle_smoke_large.png`
- `vfx_particle_spark_small.png`
- `vfx_particle_star_medium.png`
- `vfx_particle_confetti_01.png` through `vfx_particle_confetti_N.png`
- `vfx_particle_snow_small.png`

---

## Tier 2 -- High Value (Moderate Effort to Integrate)

### 5. Kenney Desktop Icons

| Field | Detail |
|---|---|
| URL | https://kenney.nl/assets/desktop-icons |
| License | CC0 1.0 Universal (public domain) |
| Price | Free |
| Format | PNG |
| Contents | ~100 desktop-themed icons: folder, document, browser, terminal, trash, settings, download, music, video, image file types |
| Desk Smasher Fit | 4/5 |

**Why it fits:** The fake desktop (`desktop.ts`) currently draws icons as
colored squares with `Graphics`. Replacing these with actual desktop-style
icons makes the destructible environment much more recognizable and satisfying
to smash. Kids will recognize a trash bin, folder, and browser icon -- making
the destruction feel more real.

**Which systems it improves:**
- `desktop.ts` -- fake desktop icon rendering
- Visual readability of destructible targets

**Naming on import:**
- `env_icon_folder_default.png`
- `env_icon_browser_default.png`
- `env_icon_trash_default.png`
- `env_icon_document_default.png`

---

### 6. Kenney UI Pack (Pixel Adventure)

| Field | Detail |
|---|---|
| URL | https://kenney.nl/assets/ui-pack |
| License | CC0 1.0 Universal (public domain) |
| Price | Free |
| Format | PNG, sprite sheet |
| Contents | Buttons, panels, sliders, progress bars, checkboxes, window frames, scrollbars -- in a clean flat style |
| Desk Smasher Fit | 3/5 |

**Why it fits:** The parent lock overlay and main menu currently use raw
`Graphics` rectangles. A polished UI panel sprite sheet elevates the parent
lock screen specifically -- where visual clarity matters most for parents.
Fit is 3/5 rather than higher because Desk Smasher's chaos aesthetic may
prefer to keep UI raw/minimal.

**Which systems it improves:**
- Parent lock UI overlay
- Main menu / start screen
- Settings panel (if added in production)

---

### 7. OpenGameArt -- Cartoon Explosion Spritesheet (CC0)

| Field | Detail |
|---|---|
| URL | https://opengameart.org/content/cartoon-explosion |
| License | CC0 1.0 Universal |
| Author | Various contributors |
| Format | PNG spritesheet |
| Contents | Frame-by-frame cartoon explosion animation, typically 8-16 frames at 64x64 or 128x128 |
| Desk Smasher Fit | 4/5 |

**Note:** OpenGameArt hosts many explosion assets under varying licenses (CC0,
CC-BY, GPL). Search specifically for "CC0" filter applied. The linked URL pattern
is correct but individual asset IDs change -- use the site search with
`license:CC0 explosion cartoon`.

**Why it fits:** The bomb tool and high-chaos destruction events need a punchy
explosion animation. The current `effects.ts` uses a radial `Graphics` burst.
A proper spritesheet animation reads as more satisfying, especially for kids.

**Which systems it improves:**
- `effects.ts` -- bomb/explosion effect type
- High chaos meter events

**Naming on import:**
- `vfx_explosion_cartoon_01.png` (if individual frames)
- `vfx_explosion_cartoon_sheet.png` + atlas JSON

---

### 8. Tabler Icons (MIT License)

| Field | Detail |
|---|---|
| URL | https://tabler.io/icons |
| GitHub | https://github.com/tabler/tabler-icons |
| License | MIT |
| Format | SVG, PNG |
| Contents | 5000+ outline SVG icons including tools, UI, objects, devices, arrows |
| Desk Smasher Fit | 3/5 |

**Why it fits:** MIT license is production-safe. The outline SVG style works
well at small sizes for UI. Useful as a fallback or supplement to Kenney's
icons where Kenney lacks a specific glyph. The `device-desktop`, `tool`,
`bolt`, `snowflake`, `hammer`, and `settings` icons are directly applicable.

**Integration note:** SVG assets require conversion to PNG or a PixiJS SVG
renderer plugin. For web builds, inline SVG via CSS may be cleaner for
static UI elements outside the canvas.

---

### 9. Phosphor Icons (MIT License)

| Field | Detail |
|---|---|
| URL | https://phosphoricons.com |
| GitHub | https://github.com/phosphor-icons/homepage |
| License | MIT |
| Format | SVG, React/Vue components, web font |
| Contents | 1200+ icons in 6 weights (thin, light, regular, bold, fill, duotone) |
| Desk Smasher Fit | 2/5 |

**Why it fits:** Lower fit score because phosphor icons are design-system
oriented (clean, minimal) which conflicts with Desk Smasher's cartoon-chaos
visual identity. However, the "fill" weight variants have enough visual weight
for game UI use. Best candidate for any polished settings or parent-lock
overlay if we want a non-cartoon register there to signal "this is the grown-up
controls."

---

## Tier 3 -- Audio Supplements

### 10. Freesound.org -- Cartoon Pop / Bubble Sounds (CC0)

| Field | Detail |
|---|---|
| URL | https://freesound.org (search: `cartoon pop CC0`) |
| License | CC0 (filter required -- many files are CC-BY) |
| Format | WAV, FLAC, MP3 |
| Desk Smasher Fit | 4/5 |

**Note:** Freesound requires individual track verification. Always filter by
`Creative Commons 0` license before downloading. Do NOT download CC-BY files
unless attribution is implemented. Recommended search terms:
- `cartoon pop CC0`
- `bubble burst CC0`
- `squishy hit CC0`
- `kids toy sound CC0`

**Which systems it improves:**
- Soft destruction events (papers, post-its, small objects)
- Chaos meter small-increment feedback
- Child-appropriate register for all hits

---

## Recommended Download Order

Given the prototype's current state (procedural art + Web Audio API), the
highest-leverage additions in dependency order:

1. **Kenney Impact Sounds** -- drop-in improvement to `audio-engine.ts`, no
   visual changes needed. Immediate playtest improvement.
2. **Kenney Particle Pack** -- replaces rectangle particles with expressive
   sprites. One-day integration into `particles.ts`.
3. **Kenney Game Icons** -- replaces text tool labels with icons. Improves
   tool selector readability significantly.
4. **Kenney Desktop Icons** -- makes the destructible desktop feel real.
   Moderate integration effort in `desktop.ts`.
5. **OpenGameArt Explosion** -- adds a proper explosion animation for bomb
   tool. Requires spritesheet animation support in `effects.ts`.

---

## Asset Directory Structure (When Integrated)

Following the project naming convention `[category]_[name]_[variant]_[size].[ext]`:

```
assets/
  art/
    particles/
      vfx_particle_smoke_large.png
      vfx_particle_spark_small.png
      vfx_particle_star_medium.png
      vfx_particle_snow_small.png
      vfx_particle_confetti_01.png ... vfx_particle_confetti_08.png
    effects/
      vfx_explosion_cartoon_sheet.png
    icons/
      ui_icon_hammer_default.png
      ui_icon_bomb_default.png
      ui_icon_lightning_default.png
      ui_icon_snowflake_default.png
      ui_icon_wrench_default.png
    desktop/
      env_icon_folder_default.png
      env_icon_browser_default.png
      env_icon_trash_default.png
      env_icon_document_default.png
  audio/
    sfx/
      impact/
        sfx_impact_glass_01.wav ... sfx_impact_glass_12.wav
        sfx_impact_wood_01.wav  ... sfx_impact_wood_08.wav
        sfx_impact_metal_01.wav ... sfx_impact_metal_06.wav
      ui/
        sfx_ui_click_01.wav
        sfx_ui_confirm_01.wav
        sfx_ui_error_01.wav
        sfx_ui_pop_01.wav ... sfx_ui_pop_06.wav
```

---

## License Compliance Checklist

Before shipping production build:

- [ ] All CC0 assets: no action required (public domain)
- [ ] MIT assets (Tabler, Phosphor): include license text in `THIRD-PARTY-NOTICES.txt`
- [ ] Freesound CC0: verify each individual file's license on download -- do not assume
- [ ] Do NOT include any CC-BY assets without implementing credits screen
- [ ] Do NOT include any GPL assets (incompatible with commercial distribution)

---

## Sources to Verify

All links should be confirmed before download as URLs may shift:

- https://kenney.nl/assets/game-icons
- https://kenney.nl/assets/impact-sounds
- https://kenney.nl/assets/interface-sounds
- https://kenney.nl/assets/particle-pack
- https://kenney.nl/assets/desktop-icons
- https://kenney.nl/assets/ui-pack
- https://opengameart.org (search: `cartoon explosion CC0`)
- https://freesound.org (search: `cartoon pop`, filter CC0)
- https://tabler.io/icons
- https://phosphoricons.com
