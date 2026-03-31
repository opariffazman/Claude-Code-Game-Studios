# Themed Desktops

> **Status**: Draft
> **Author**: game-designer
> **Last Updated**: 2026-03-30
> **Implements Pillar**: Instant Joy, Safe Chaos
> **Depends On**: Desktop Renderer, Desktop Rebuild Cycle, Theme System

---

## Overview

Themed Desktops replaces the procedural Graphics-based desktop rendering with five
sprite-driven visual themes, each powered by Kenney CC0 asset packs. Each theme
defines a pool of icon sprites, UI chrome sprites for windows and taskbars, and a
wallpaper color scheme. The Desktop Renderer consumes the active theme to build the
fake desktop layout; when the Desktop Rebuild Cycle triggers a rebuild, the next
theme is selected and its sprite sheets are loaded on demand. This system adds visual
variety that maintains the "satisfying destruction" core fantasy across repeated
sessions without requiring any original art.

---

## Player Fantasy

The child sits down and every new smash session looks different — a glowing sci-fi
terminal one round, a cozy pixel-art adventure screen the next. Each theme feels
cohesive: the windows, icons, and taskbar all share the same art style so the
desktop reads as a real (if silly) environment worth destroying. The variety is
discovery without friction — no menus, no choices for the child. It just changes
automatically when the screen rebuilds.

Primary MDA Aesthetics served: **Sensation** (each theme has a distinct visual
identity), **Discovery** (novelty surfaces automatically on rebuild),
**Submission** (zero cognitive overhead — the child smashes and the theme arrives).

---

## Detailed Rules

### 5.1 Theme Definitions

Each theme is a data record with the following structure:

```typescript
interface ThemeDefinition {
  id: ThemeId;
  displayName: string;
  spriteSheets: string[];          // Asset paths to preload (relative to assets/kenney/)
  wallpaper: WallpaperConfig;
  iconPool: IconEntry[];           // 12-20 entries
  windowChrome: WindowChromeConfig;
  taskbarChrome: TaskbarChromeConfig;
}

interface IconEntry {
  textureKey: string;              // Key within loaded sprite sheet
  label: string;                   // Fake icon label ("Battle.exe", "Potions")
}

interface WallpaperConfig {
  colorTop: number;                // PixiJS hex color for gradient top
  colorBottom: number;             // PixiJS hex color for gradient bottom
  overlayAlpha: number;            // 0.0-0.3 tint overlay on wallpaper
}

interface WindowChromeConfig {
  panelTexture: string;            // Nine-slice panel texture key for window body
  titlebarTexture: string;         // Texture key for titlebar strip
  closeBtnTexture: string;         // Texture key for close/X button
  panelSlices: NineSliceConfig;    // { left, right, top, bottom } margins in px
}

interface TaskbarChromeConfig {
  panelTexture: string;            // Nine-slice panel texture for taskbar body
  panelSlices: NineSliceConfig;
  trayIconTextures: string[];      // 2-4 textures used as fake tray icons
  startBtnTexture: string;         // Texture key for start/home button
}

interface NineSliceConfig {
  left: number;
  right: number;
  top: number;
  bottom: number;
}
```

The five canonical themes are defined below.

---

#### Theme 1: Pixel Adventure

**Visual Identity**: Retro 8-bit pixel art. Warm amber and tan colors. Chunky pixel
borders. Feels like a ROM from the early 1990s.

| Field | Value |
|-------|-------|
| `id` | `"pixel-adventure"` |
| `displayName` | `"Pixel Adventure"` |
| `spriteSheets` | `["kenney-pixel-adventure/sheet.json", "kenney-animal-pack/sheet.json", "kenney-generic-items/sheet.json"]` |
| `wallpaper.colorTop` | `0xF4A460` (sandy tan) |
| `wallpaper.colorBottom` | `0xCD853F` (warm brown) |
| `wallpaper.overlayAlpha` | `0.0` |

**Icon Pool (16 entries):**

| Label | Source Pack | Texture Key |
|-------|-------------|-------------|
| `"Cat.exe"` | animal-pack | `"cat"` |
| `"Dog.app"` | animal-pack | `"dog"` |
| `"Bunny"` | animal-pack | `"rabbit"` |
| `"Frog"` | animal-pack | `"frog"` |
| `"Bear.exe"` | animal-pack | `"bear"` |
| `"Chick"` | animal-pack | `"chick"` |
| `"Sword.exe"` | generic-items | `"sword_silver"` |
| `"Shield"` | generic-items | `"shield_round_large"` |
| `"Potion"` | generic-items | `"potion_red"` |
| `"Gem.app"` | generic-items | `"gem_blue"` |
| `"Coin Bag"` | generic-items | `"bag_gold"` |
| `"Scroll"` | generic-items | `"scroll"` |
| `"Key"` | generic-items | `"key_gold"` |
| `"Boot"` | generic-items | `"boot"` |
| `"Map"` | generic-items | `"map"` |
| `"Lantern"` | generic-items | `"lantern"` |

**Window Chrome**: Pixel Adventure UI panels. Nine-slice margins 8px all sides.
**Taskbar Chrome**: Pixel Adventure bottom panel. Start button uses pixel-adventure
`"button_square_border"` texture.

---

#### Theme 2: Space Station

**Visual Identity**: Sci-fi neon on dark backgrounds. Blues, purples, bright cyan
glows. Feels like a fictional computer interface from a space opera.

| Field | Value |
|-------|-------|
| `id` | `"space-station"` |
| `displayName` | `"Space Station"` |
| `spriteSheets` | `["kenney-sci-fi/sheet.json", "kenney-vehicle-pack/sheet.json", "kenney-generic-items/sheet.json"]` |
| `wallpaper.colorTop` | `0x0A0A2E` (deep space navy) |
| `wallpaper.colorBottom` | `0x1B1B4B` (dark purple-blue) |
| `wallpaper.overlayAlpha` | `0.05` |

**Icon Pool (16 entries):**

| Label | Source Pack | Texture Key |
|-------|-------------|-------------|
| `"Rocket.exe"` | vehicle-pack | `"rocket"` |
| `"UFO"` | vehicle-pack | `"ufo"` |
| `"Spaceship"` | vehicle-pack | `"spaceship_small"` |
| `"Jet.app"` | vehicle-pack | `"jet"` |
| `"Helicopter"` | vehicle-pack | `"helicopter"` |
| `"Satellite"` | vehicle-pack | `"satellite"` |
| `"Laser.exe"` | generic-items | `"sword_gold"` |
| `"Shield.sys"` | generic-items | `"shield_round_large"` |
| `"Energy Cell"` | generic-items | `"potion_blue"` |
| `"Crystal"` | generic-items | `"gem_green"` |
| `"Data Chip"` | generic-items | `"coin_gold"` |
| `"Coms"` | generic-items | `"scroll"` |
| `"Plasma Key"` | generic-items | `"key_silver"` |
| `"Helmet"` | generic-items | `"armor_helmet"` |
| `"Scanner"` | generic-items | `"magnifier"` |
| `"Flux Core"` | generic-items | `"gem_red"` |

**Window Chrome**: Sci-Fi UI panels (dark metallic). Nine-slice margins 10px all
sides. Titlebar uses sci-fi `"bar_blue"` texture.
**Taskbar Chrome**: Sci-fi bottom panel. Tray icons use vehicle-pack small sprites
at 50% scale.

---

#### Theme 3: Fantasy Kingdom

**Visual Identity**: Medieval fantasy. Earthy greens and browns with gold accents.
Ornate borders. Feels like a kingdom management screen from a classic RPG.

| Field | Value |
|-------|-------|
| `id` | `"fantasy-kingdom"` |
| `displayName` | `"Fantasy Kingdom"` |
| `spriteSheets` | `["kenney-adventure/sheet.json", "kenney-fantasy-borders/sheet.json", "kenney-animal-pack/sheet.json", "kenney-generic-items/sheet.json"]` |
| `wallpaper.colorTop` | `0x2D5016` (forest green) |
| `wallpaper.colorBottom` | `0x5C3A1E` (rich earth brown) |
| `wallpaper.overlayAlpha` | `0.1` |

**Icon Pool (18 entries):**

| Label | Source Pack | Texture Key |
|-------|-------------|-------------|
| `"Dragon.exe"` | animal-pack | `"dragon"` |
| `"Wolf"` | animal-pack | `"wolf"` |
| `"Owl"` | animal-pack | `"owl"` |
| `"Horse"` | animal-pack | `"horse"` |
| `"Deer"` | animal-pack | `"deer"` |
| `"Sword.exe"` | generic-items | `"sword_silver"` |
| `"Battle Axe"` | generic-items | `"axe"` |
| `"Bow"` | generic-items | `"bow"` |
| `"Shield"` | generic-items | `"shield_round_large"` |
| `"Health Potion"` | generic-items | `"potion_red"` |
| `"Mana Potion"` | generic-items | `"potion_blue"` |
| `"Crown"` | generic-items | `"crown"` |
| `"Chest"` | generic-items | `"chest_full"` |
| `"Gem"` | generic-items | `"gem_red"` |
| `"Scroll"` | generic-items | `"scroll"` |
| `"Torch"` | generic-items | `"torch"` |
| `"Map"` | generic-items | `"map"` |
| `"Key"` | generic-items | `"key_gold"` |

**Window Chrome**: Adventure UI panels with Fantasy Borders frame overlaid. The
nine-slice window body uses adventure `"panel_brown"` texture; window borders use
fantasy-borders `"border_ornate"` as a non-nine-sliced overlay at exact frame size.
Nine-slice margins: 12px all sides.
**Taskbar Chrome**: Adventure bottom panel. Start button uses adventure
`"button_square_depth_flat"` texture.

---

#### Theme 4: RPG Quest

**Visual Identity**: Classic tabletop RPG aesthetics. Warm golds, deep reds,
parchment textures. Feels like opening a character sheet or an inventory screen.

| Field | Value |
|-------|-------|
| `id` | `"rpg-quest"` |
| `displayName` | `"RPG Quest"` |
| `spriteSheets` | `["kenney-rpg-expansion/sheet.json", "kenney-generic-items/sheet.json"]` |
| `wallpaper.colorTop` | `0xB8860B` (dark goldenrod) |
| `wallpaper.colorBottom` | `0x8B1A1A` (dark crimson) |
| `wallpaper.overlayAlpha` | `0.15` |

**Icon Pool (20 entries):**

| Label | Source Pack | Texture Key |
|-------|-------------|-------------|
| `"Sword.exe"` | generic-items | `"sword_gold"` |
| `"Axe"` | generic-items | `"axe"` |
| `"Staff"` | generic-items | `"staff"` |
| `"Dagger"` | generic-items | `"dagger"` |
| `"Bow"` | generic-items | `"bow"` |
| `"Shield"` | generic-items | `"shield_round_large"` |
| `"Armor"` | generic-items | `"armor_chest"` |
| `"Helmet"` | generic-items | `"armor_helmet"` |
| `"Boots"` | generic-items | `"boot"` |
| `"Ring"` | generic-items | `"ring_gold"` |
| `"Health Potion"` | generic-items | `"potion_red"` |
| `"Mana Potion"` | generic-items | `"potion_blue"` |
| `"Poison Vial"` | generic-items | `"potion_green"` |
| `"Scroll"` | generic-items | `"scroll"` |
| `"Tome"` | generic-items | `"book_red"` |
| `"Chest"` | generic-items | `"chest_full"` |
| `"Gem"` | generic-items | `"gem_blue"` |
| `"Crown"` | generic-items | `"crown"` |
| `"Key"` | generic-items | `"key_gold"` |
| `"Coin Bag"` | generic-items | `"bag_gold"` |

**Window Chrome**: RPG Expansion panels (parchment/wood style). Nine-slice margins
14px all sides to accommodate ornate panel borders.
**Taskbar Chrome**: RPG Expansion bottom panel. Start button uses rpg-expansion
character/crest button sprite.

---

#### Theme 5: Animal Farm

**Visual Identity**: Bright primary colors, cute animals everywhere, maximum child
appeal. Feels like a colorful picture book come to life. This is the "youngest kid"
theme — maximum icon size, maximum readability, zero intimidation.

| Field | Value |
|-------|-------|
| `id` | `"animal-farm"` |
| `displayName` | `"Animal Farm"` |
| `spriteSheets` | `["kenney-pixel-adventure/sheet.json", "kenney-animal-pack/sheet.json"]` |
| `wallpaper.colorTop` | `0xFFD700` (bright yellow) |
| `wallpaper.colorBottom` | `0x98FB98` (pale green) |
| `wallpaper.overlayAlpha` | `0.0` |

**Icon Pool (all available animals, minimum 12):**

| Label | Source Pack | Texture Key |
|-------|-------------|-------------|
| `"Cat"` | animal-pack | `"cat"` |
| `"Dog"` | animal-pack | `"dog"` |
| `"Bunny"` | animal-pack | `"rabbit"` |
| `"Frog"` | animal-pack | `"frog"` |
| `"Bear"` | animal-pack | `"bear"` |
| `"Chick"` | animal-pack | `"chick"` |
| `"Duck"` | animal-pack | `"duck"` |
| `"Pig"` | animal-pack | `"pig"` |
| `"Cow"` | animal-pack | `"cow"` |
| `"Sheep"` | animal-pack | `"sheep"` |
| `"Elephant"` | animal-pack | `"elephant"` |
| `"Giraffe"` | animal-pack | `"giraffe"` |
| `"Monkey"` | animal-pack | `"monkey"` |
| `"Panda"` | animal-pack | `"panda"` |
| `"Parrot"` | animal-pack | `"parrot"` |
| `"Turtle"` | animal-pack | `"turtle"` |

**Note**: Animal Farm icons render at 1.25x scale compared to other themes
(`ICON_SCALE_OVERRIDE = 1.25`) to compensate for the typically smaller silhouette
size of animal sprites versus item/vehicle sprites.

**Window Chrome**: Pixel Adventure panels (friendly, bright). Titlebar uses pixel-
adventure `"button_square_border"` in a bright color tint. Nine-slice margins 8px.
**Taskbar Chrome**: Pixel Adventure bottom panel in pastel tint. Start button uses
pixel-adventure `"button_round_border"` texture.

---

### 5.2 Theme Selection and Sequencing

1. Themes cycle in a defined order: `pixel-adventure` → `space-station` →
   `fantasy-kingdom` → `rpg-quest` → `animal-farm` → (repeat).
2. On first load, the starting theme is `animal-farm`. Rationale: most child-
   friendly theme first; maximizes immediate appeal.
3. The Desktop Rebuild Cycle owns theme advancement. After each full desktop
   rebuild, it increments the theme index (modulo 5) and passes the new
   `ThemeId` to the Theme System.
4. No UI is exposed to the child for theme selection. The parent cannot manually
   select themes in v1 (this is a planned v2 feature in Parent Settings).

---

### 5.3 Asset Loading Strategy

#### On-Demand Loading with Preload Lookahead

1. At application startup, only the starting theme's sprite sheets are loaded
   (using PixiJS `Assets.load()`).
2. After the starting theme finishes loading, the system immediately begins
   background preloading the next theme's sprite sheets using
   `Assets.backgroundLoad()`.
3. When the Desktop Rebuild Cycle triggers a theme switch:
   a. Check `Assets.cache` — if the next theme's sheets are cached, switch is
      instant (no visible load delay).
   b. If not yet cached (unlikely after background preload), display the previous
      desktop frozen in place until load completes, then reveal the new desktop
      with a theme transition animation.
4. Each sprite sheet JSON must include texture atlas metadata (`frames` + `meta`)
   in PixiJS 8 atlas format. The `Assets.addBundle()` API groups each theme's
   sheets under a bundle key (e.g., `"theme-space-station"`).

#### Asset Bundle Registration

```
Assets.addBundle("theme-pixel-adventure", {
  "kenney-pixel-adventure": "assets/kenney/pixel-adventure/sheet.json",
  "kenney-animal-pack":     "assets/kenney/animal-pack/sheet.json",
  "kenney-generic-items":   "assets/kenney/generic-items/sheet.json",
})
```

All five bundles are registered at startup. Only the active theme's bundle is
loaded eagerly; the next theme's bundle is background-loaded.

#### Fallback to Procedural Graphics

If a texture key is not found in the loaded cache (e.g., the asset file is
missing or the key name is wrong), the Desktop Renderer falls back to drawing
a colored rectangle with a label using PixiJS `Graphics`. This fallback is
visually distinct (solid color only, no sprite) and should generate a console
warning in development mode. The fallback must never crash the game.

---

### 5.4 Icon Rendering with Sprites

1. Each desktop icon is a PixiJS `Sprite` (not `Graphics`) using a texture drawn
   from the active theme's `iconPool`.
2. Icons are randomly sampled without replacement from the pool for each desktop
   generation. If the pool size is smaller than `ICON_COUNT`, sampling wraps
   with replacement (no duplicates preferred but allowed over empty slots).
3. Icon sprites are rendered at the theme's effective icon size:
   - Default: `ICON_SIZE = 64px` (from Desktop Renderer tuning knobs)
   - Animal Farm override: `ICON_SIZE * 1.25 = 80px`
4. Each icon `Sprite` is anchored at `(0.5, 0.5)` for correct rotation-on-damage
   behavior (the existing damage state applies tilt via `sprite.rotation`).
5. Icon labels below sprites are `PIXI.Text` objects using `BitmapText` if
   available for the theme's font, otherwise `Text` with a small sans-serif font.
   Label font size: 11px. Label max width: 80px with word wrap.

---

### 5.5 Window Chrome Rendering

1. Window bodies use PixiJS `NineSlicePlane` (PixiJS 8: `NineSliceSprite`) with
   the theme's `windowChrome.panelTexture`.
2. The titlebar is a separate `NineSliceSprite` using `windowChrome.titlebarTexture`,
   positioned at the top edge of the window body.
3. The close button is a plain `Sprite` using `windowChrome.closeBtnTexture`,
   positioned at the right edge of the titlebar. It has a hit area but
   functionally behaves like any other destructible element (it does not actually
   close the window — destroying it deals 1 damage to the window).
4. Window content area (below titlebar) may contain 1-3 fake UI elements drawn
   with procedural `Graphics` (buttons, sliders, text blocks) tinted to match the
   theme's color palette. These are visual only and do not affect destruction
   behavior.
5. Nine-slice margin values are defined per theme (see `WindowChromeConfig`). They
   must not be scaled — only the interior region scales when a window is resized.

---

### 5.6 Taskbar Chrome Rendering

1. The taskbar body is a full-width `NineSliceSprite` using the theme's
   `taskbarChrome.panelTexture`, positioned at the bottom of the canvas.
2. The start button is a `Sprite` using `taskbarChrome.startBtnTexture`,
   positioned at the left edge of the taskbar with 4px inset.
3. Tray icons are 2-4 small `Sprite` objects sampled from
   `taskbarChrome.trayIconTextures`, positioned at the right of the taskbar with
   4px spacing between them.
4. A fake clock `Text` object (`"12:34 PM"` static string) is positioned to the
   left of the tray icons.
5. All taskbar elements share the taskbar's health (3 hits) and are removed
   together when the taskbar is destroyed.

---

## Formulas

### Icon Pool Sampling

```
Given:
  P = pool size (12-20 for most themes)
  N = ICON_COUNT (default 8)

If N <= P:
  Sample N unique entries from P (Fisher-Yates shuffle, take first N)
If N > P:
  Sample P unique entries, then fill remaining N - P slots by sampling
  with replacement from P (duplicates allowed)
```

Example: Animal Farm pool has 16 animals, ICON_COUNT = 8. Shuffle 16,
take first 8. Result: 8 unique animals per desktop. No duplicates.

### Wallpaper Gradient

```
wallpaperColor(y) = lerp(colorTop, colorBottom, y / canvasHeight)

Where:
  y           = pixel y-coordinate (0 = top, canvasHeight = bottom)
  colorTop    = theme WallpaperConfig.colorTop (hex int)
  colorBottom = theme WallpaperConfig.colorBottom (hex int)
  lerp        = linear interpolation per RGB channel
```

Rendered as a single `Graphics.fill` with a gradient fill. PixiJS 8
`FillGradient` API is used (not the v7 approach).

### Icon Scale Override

```
effectiveIconSize = ICON_SIZE * (theme.iconScaleOverride ?? 1.0)

Where:
  ICON_SIZE             = tuning knob (default 64)
  theme.iconScaleOverride = optional float (Animal Farm: 1.25, all others: 1.0)
```

---

## Edge Cases

| Edge Case | Resolution |
|-----------|------------|
| Texture key in `iconPool` does not exist in loaded sheet | Log warning; render fallback Graphics rectangle in theme accent color with icon label. Never throw. |
| Sprite sheet fails to load (network error / missing file) | Entire theme falls back to procedural Graphics for all elements. Log error. Game continues. |
| `iconPool` has fewer entries than `ICON_COUNT` | Sampling wraps with replacement. Up to 50% duplicates are acceptable. Under 8 unique icons: log warning and increase pool in patch. |
| Background preload not complete when rebuild triggers | Block theme transition (show freeze frame) until bundle load resolves. Maximum expected wait: 1-2 seconds on typical connection. |
| `NineSliceSprite` texture is smaller than slice margins | Clamp effective content area to 1x1 px. Log warning. This indicates a wrongly configured `panelSlices` value — fix data, not code. |
| Theme index wraps past index 4 | Modulo 5. Next theme after `animal-farm` is `pixel-adventure`. |
| Animal Farm `iconScaleOverride` pushes icon outside canvas bounds | Icon placement grid calculation uses `effectiveIconSize`, not `ICON_SIZE`, so positions are already adjusted. If canvas is very small, reduce `ICON_COUNT` (see Desktop Renderer edge cases). |
| Two themes share a sprite sheet (e.g., generic-items used by multiple themes) | `Assets` cache deduplicates by URL. The shared sheet is loaded once and reused. Bundle definitions may reference the same URL across bundles without conflict. |
| Close button on window is destroyed before window body | Close button destruction deals 1 damage to its parent window. Window continues to exist until its own health reaches 0. |

---

## Dependencies

| System | Direction | Data Flow |
|--------|-----------|-----------|
| Desktop Renderer | Downstream consumer | Receives active `ThemeDefinition`; uses `iconPool`, `windowChrome`, `taskbarChrome`, `wallpaper` to build the desktop layout |
| Desktop Rebuild Cycle | Upstream trigger | Calls `ThemeSystem.advanceTheme()` after each full rebuild; passes new `ThemeId` to Desktop Renderer |
| Theme System | Owner | Holds the `ThemeDefinition` registry, tracks active theme index, manages asset bundle lifecycle |
| App Shell | Upstream | Provides PixiJS `Assets` API and canvas dimensions |
| Safety Limiter | Upstream constraint | Wallpaper gradient must not flash (rate of change across frames must stay below flash threshold). Static wallpaper per theme — this constraint is trivially satisfied. |

**Bidirectional note**: The Desktop Renderer GDD (`design/gdd/desktop-renderer.md`)
references the Theme System as an upstream dependency. The systems index
(`design/gdd/systems-index.md`) lists Theme System as #9 with status "Not Started"
— this document constitutes the design for that system's data layer (how themes are
structured and which assets each theme uses).

---

## Tuning Knobs

| Parameter | Default | Range | Category | Notes |
|-----------|---------|-------|----------|-------|
| `THEME_CYCLE_ORDER` | `["animal-farm", "pixel-adventure", "space-station", "fantasy-kingdom", "rpg-quest"]` | any permutation | Gate | Order themes cycle on rebuild. Animal Farm first for youngest-child onboarding. |
| `STARTING_THEME` | `"animal-farm"` | any ThemeId | Gate | Theme shown on first load. |
| `ICON_SCALE_OVERRIDE` (Animal Farm) | `1.25` | `1.0–2.0` | Feel | Scale multiplier for animal icons; animals tend to have smaller visual mass than item sprites. |
| `WINDOW_NINE_SLICE_MARGINS` (per theme) | see per-theme table | `4–20px` | Feel | Controls how much of the panel texture is reserved for borders. Too small = stretched borders. Too large = no interior room. |
| `BACKGROUND_PRELOAD_ENABLED` | `true` | `true/false` | Gate | Disable to save memory on very low-end devices; disabling causes a visible load pause on theme transition. |
| `FALLBACK_ICON_COLOR` | `0x888888` | any hex color | Feel | Color of the procedural fallback rectangle when a texture is missing. |
| `ICON_LABEL_FONT_SIZE` | `11` | `8–14` | Feel | Font size in px for icon labels. Below 8 is unreadable at typical distances. |
| `ICON_LABEL_MAX_WIDTH` | `80` | `48–120` | Feel | Max label width in px before word wrap. Should not exceed grid cell width. |

All knobs must be defined in `assets/data/theme-config.json` and read at runtime.
No tuning values may be hardcoded in TypeScript source files.

---

## Acceptance Criteria

### Functional Criteria

- [ ] All five themes have correctly structured `ThemeDefinition` objects loadable
      from `assets/data/theme-config.json`.
- [ ] `Assets.loadBundle("theme-animal-farm")` completes successfully on startup
      and all texture keys defined in the Animal Farm `iconPool` resolve correctly.
- [ ] Desktop generation with any theme produces icons that are `Sprite` objects
      (not `Graphics`), each with a valid texture.
- [ ] Window bodies render as `NineSliceSprite` using the active theme's
      `panelTexture`. Resizing the window does not distort the border region.
- [ ] Taskbar renders using the active theme's panel texture with correct start
      button and tray icons.
- [ ] After a full desktop rebuild, the next theme in `THEME_CYCLE_ORDER` is
      applied. After five rebuilds, the cycle returns to the starting theme.
- [ ] Removing a sprite sheet JSON from `assets/kenney/` causes the system to
      fall back to procedural Graphics for that theme without crashing.
- [ ] Icon sampling from Animal Farm's 16-entry pool with `ICON_COUNT = 8`
      produces 8 unique animal sprites per desktop (no duplicates on a fresh
      generation).

### Experiential Criteria (Playtest Validation)

- [ ] Each theme is visually distinct enough that a child notices the change after
      a rebuild without any prompting. Validated by playtesting with a child age
      2-6: they should react to the new theme (pointing, verbal reaction, or
      immediate continued engagement).
- [ ] Animal Farm theme is immediately readable and appealing to the youngest
      target users (1-2 year olds). Icons should be identifiable without labels
      at typical screen distance (50-80cm).
- [ ] No theme produces a visually jarring or "broken" look from mismatched art
      styles. Each theme should feel internally coherent across wallpaper, windows,
      icons, and taskbar.
- [ ] Theme transitions (desktop rebuild) do not produce a visible flash or
      flicker that could trigger photosensitivity concerns (validate against
      Safety Limiter spec: max 3 flashes per second, change in luminance < 10%
      per frame during transition animation).
- [ ] The Pixel Adventure and Animal Farm themes feel welcoming to young children;
      Space Station and RPG Quest themes produce an "ooh, cool" reaction from
      slightly older children (ages 4-7) based on playtest feedback.

---

## Integration Tasks (Implementation Sprint)

| # | Task | Est. Effort | Dependencies |
|---|------|-------------|--------------|
| 1 | **Acquire and pack Kenney assets**: Download all 8 Kenney packs, run through TexturePacker to produce `sheet.json` + `sheet.png` per pack, place under `assets/kenney/[pack-name]/`. Verify all texture keys match the keys defined in this document's icon pools. | M (2-3 hours) | None |
| 2 | **Implement ThemeDefinition registry**: Create `assets/data/theme-config.json` with all 5 theme records. Create `src/gameplay/theme-system.ts` with `ThemeSystem` class: `registerThemes()`, `advanceTheme()`, `getActiveTheme()`, `getThemeById()`. | S (1-2 hours) | Task 1 |
| 3 | **Asset bundle lifecycle**: Implement `loadActiveTheme()` and `preloadNextTheme()` using PixiJS 8 `Assets.loadBundle()` and `Assets.backgroundLoad()`. Wire into App Shell startup and Desktop Rebuild Cycle hook. Include fallback path for missing textures. | M (2-3 hours) | Task 2, App Shell |
| 4 | **Sprite-based icon rendering**: Update `DesktopRenderer.generate()` to sample from `theme.iconPool`, create `Sprite` objects instead of `Graphics`, and apply `effectiveIconSize` from theme config. Preserve existing `DesktopElement` interface and damage/health behavior. | M (2-4 hours) | Task 3, Desktop Renderer |
| 5 | **Nine-slice window and taskbar chrome**: Update window and taskbar rendering in `DesktopRenderer` to use `NineSliceSprite` with theme-specified textures and slice margins. Maintain existing health and destruction state behavior. | M (2-4 hours) | Task 3, Desktop Renderer |
| 6 | **Theme transition in Desktop Rebuild Cycle**: Update `DesktopRebuildCycle` to call `ThemeSystem.advanceTheme()` after each rebuild, pass the new `ThemeDefinition` to `DesktopRenderer.generate()`, and handle the background-preload-not-ready case with a freeze-frame wait. | S (1-2 hours) | Tasks 2, 3, Desktop Rebuild Cycle |
| 7 | **Integration test and playtest**: Load all 5 themes in sequence in a dev session. Verify visual coherence, correct sprite rendering, no fallback warnings in console, no frame drops during theme load, and destruction behavior unchanged from pre-sprite version. | S (1 session) | Tasks 1-6 |

**Total estimated effort**: 1.5-2 developer days.

---

*End of document.*
