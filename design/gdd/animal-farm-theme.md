# Animal Farm Theme -- Complete Visual Design

> **Status**: Draft
> **Author**: creative-director
> **Last Updated**: 2026-03-31
> **Implements Pillar**: Instant Joy, Safe Chaos
> **Depends On**: Desktop Renderer, Theme System, Tile Panel Builder

---

## Feel / Mood

This desktop should feel like a toddler's picture book opened up and became a
computer screen. Everything is warm, round, and friendly. The colors say
"sunny afternoon on a farm" -- soft green grass, warm brown wood, bright animal
faces with big round eyes looking right at you. There is nothing sharp, nothing
dark, nothing that could read as scary or confusing to a one-year-old. The wood
panels look like a toy barn; the buttons look like things you want to press. When
a child sees this screen, the immediate instinct should be "touch the animals" --
and then the smashing begins. The visual warmth makes the destruction feel silly
and playful rather than violent. You are not breaking a computer. You are playing
in a barn.

---

## 1. Desktop Composition

### 1.1 Wallpaper

**Color**: Solid `0x5b8c3e` (soft forest green) -- KEEP the current color.

**Rationale**: This green reads as "grass" or "countryside" without needing a
texture. It provides excellent contrast against the warm brown wood panels AND
the bright multi-colored animal icons. A gradient or pattern would add visual
noise that competes with the 30 animal sprites for a toddler's attention. Flat
color = maximum icon readability.

No wallpaper pattern or overlay. Clean is better for the youngest audience.

### 1.2 Animal Icons

**Count**: 10-12 icons per desktop generation (from the pool of 30 animals).

**Size**: 80px display size (64px base * 1.25 scale override, already implemented).

**Layout**: Scattered with mild randomization, not a rigid grid. Icons should feel
"dropped" onto the desktop like toy animals dumped from a bucket. Allow slight
overlap at edges but keep centers at least 90px apart so small fingers can
distinguish targets.

**Labels**: Keep the single-word animal name labels below each icon. Font size 11px
in white with a subtle dark drop shadow (1px offset, 0.4 alpha) for legibility
on the green wallpaper. Labels help older kids (3-6) practice animal names.
No ".exe" or ".app" suffixes -- this theme is for the youngest users.

**Grouping**: No intentional grouping. The randomness IS the charm. Each desktop
rebuild produces a fresh scatter of different animals, which feeds the Discovery
aesthetic.

### 1.3 Windows (3-4 per desktop)

Windows are the primary smashable "buildings" on the desktop. For Animal Farm,
they should read as **barn-like wooden structures** -- warm brown wood with
chunky borders, inviting to hit.

**Panel style**: Use the adventure pack `panel_brown_corners_b.png` as the
primary window background. This panel has decorative corner bolts on a warm
brown wood surface with a lighter parchment-colored interior. It reads as
"wooden notice board" or "barn wall" -- perfect for the farm theme.

**Title bar**: Use `panel_brown_dark.png` as a NineSlice strip across the top
of each window. The darker brown creates clear visual separation from the
lighter panel body.

**Close button**: Keep `button_red_close.png` (already implemented). The red X
is universally readable and the rounded adventure-pack style is friendly rather
than aggressive.

**Window content**: Inside each window, render 2-3 faux content elements:
- A `panel_grid_paper.png` inset (reads as "a page in a notebook") at roughly
  60% of the window interior width
- 2-3 colored progress bars using `progress_green.png` and `progress_blue.png`
  stretched horizontally, placed below the paper inset
- These are purely decorative -- they just make windows look "real" and give
  visual variety to the smashable surface

**Window titles**: Use silly farm-themed names:
- "Barn Plans"
- "Feed Schedule"
- "Egg Counter"
- "Weather"
- "Mooo Player"
- "Oink Notes"

### 1.4 Sticky Notes (2-3 per desktop)

**Panel**: Use `panel_grid_paper.png` as the background sprite. The grid-paper
look naturally reads as a sticky note or to-do list pinned to the barn wall.

**Text content**: Short silly farm phrases:
- "Buy more hay"
- "Count the chickens"
- "Pig bath day!"
- "Fix the fence"
- "Egg delivery 3pm"

**Rotation**: Keep the existing slight random rotation (-0.1 to 0.1 radians).
Sticky notes should look casually pinned up, not grid-aligned.

### 1.5 Notification Toasts (1-2 per desktop)

**Bar**: Use `banner_modern.png` (the red/grey rectangular banner) as the
notification background. It has a nice bordered pill shape that reads as an
alert bar.

**Content**: Farm-themed notifications:
- "New eggs collected!"
- "Feeding time!"
- "Barn door is open"
- "Cow says hi"

### 1.6 Taskbar

**Background**: Use `panel_brown_dark.png` as a NineSlice bar spanning the full
width of the screen at the bottom. The darker brown differentiates it from
window title bars (which use the same texture at smaller size) through sheer
scale -- the taskbar is a single thick strip.

**Start button**: Use `round_brown.png` (the round brown circle element).
Position at the left edge of the taskbar with 6px inset. This reads as a
friendly "home" button. Place a small animal icon sprite inside (the chick or
pig -- whichever loads first) at 50% scale as the "start menu" icon.

**Tray icons**: Place 3 small round elements at the right side of the taskbar:
- `checkbox_brown_checked.png` -- reads as a "done" indicator
- `checkbox_brown_empty.png` -- reads as a pending task
- `round_brown_dark.png` -- a plain circle dot

These are tiny and decorative. They exist to make the taskbar look "real" to
an adult (or older sibling) at a glance. A toddler will just smash through them.

**Clock**: Keep the static "12:00" text in white, positioned left of the tray
icons. Use monospace font at 14px.

### 1.7 Decorative Elements (New)

**Barn banner**: Place one `banner_hanging.png` at the top-center of the desktop,
scaled to roughly 40% of screen width. This hanging banner reads as a farm
sign or barn entrance marquee. No text needed -- it is purely decorative set
dressing that establishes the "barn" fantasy. It should be smashable (treat as
a notification-tier element, 2 health).

---

## 2. Asset Mapping

### Complete sprite-to-element assignment table

All paths relative to `assets/sprites/ui/adventure/PNG/Default/`.

| Element | Sprite File | Usage | NineSlice? | Inset (px) |
|---------|-------------|-------|------------|------------|
| **Window background** | `panel_brown_corners_b.png` | Window body panel | Yes | L:10 T:10 R:10 B:10 |
| **Window title bar** | `panel_brown_dark.png` | Horizontal strip at window top | Yes | L:6 T:6 R:6 B:6 |
| **Window close button** | `button_red_close.png` | Top-right of title bar | No (native size) | -- |
| **Window content inset** | `panel_grid_paper.png` | "Notebook page" inside window | Yes | L:8 T:8 R:8 B:8 |
| **Progress bar (green)** | `progress_green.png` | Faux loading bar in window | Yes (horizontal only) | L:4 T:4 R:4 B:4 |
| **Progress bar (blue)** | `progress_blue.png` | Faux loading bar in window | Yes (horizontal only) | L:4 T:4 R:4 B:4 |
| **Sticky note** | `panel_grid_paper.png` | Standalone sticky element | Yes | L:8 T:8 R:8 B:8 |
| **Notification bar** | `banner_modern.png` | Toast notification background | Yes | L:12 T:8 R:12 B:8 |
| **Taskbar body** | `panel_brown_dark.png` | Full-width bottom bar | Yes | L:6 T:6 R:6 B:6 |
| **Taskbar start button** | `round_brown.png` | Circle at taskbar left | No (native size) | -- |
| **Taskbar tray icon 1** | `checkbox_brown_checked.png` | Small dot, right side | No (native size) | -- |
| **Taskbar tray icon 2** | `checkbox_brown_empty.png` | Small dot, right side | No (native size) | -- |
| **Taskbar tray icon 3** | `round_brown_dark.png` | Small dot, right side | No (native size) | -- |
| **Barn banner (deco)** | `banner_hanging.png` | Top-center decorative banner | No (scale to width) | -- |
| **Alt close button** | `button_brown_close.png` | Subtler variant (future use) | No | -- |
| **Alt window body** | `panel_brown.png` | Simpler wood panel (fallback) | Yes | L:8 T:8 R:8 B:8 |

### Icon sprites (already working)

All 30 files from `public/assets/kenney/animals/`:

bear, buffalo, chick, chicken, cow, crocodile, dog, duck, elephant, frog,
giraffe, goat, gorilla, hippo, horse, monkey, moose, narwhal, owl, panda,
parrot, penguin, pig, rabbit, rhino, sloth, snake, walrus, whale, zebra

### Pixel-adventure tiles (currently used for windows)

The current `tile-panel.ts` uses `tile_0000.png` through `tile_0003.png` with
NineSlice. **For Animal Farm, we should transition windows from pixel-adventure
tiles to adventure pack panels.** The pixel-adventure tiles (chunky retro pixel
borders) better serve the "Pixel Adventure" theme. The adventure pack panels
(warm wood with rounded corners) better serve "Animal Farm."

**Migration path**: The `TilePanelBuilder` currently handles all themes. For
Animal Farm, create a parallel `AdventurePanelBuilder` (or extend TilePanelBuilder
with a theme-aware style map) that uses the adventure pack panels listed above
instead of the pixel-adventure tiles.

---

## 3. Color Palette

### Primary palette

| Role | Hex | Swatch | Name | Usage |
|------|-----|--------|------|-------|
| Wallpaper | `#5b8c3e` | (soft forest green) | Pasture Green | Full-screen background |
| Panel wood | `#9E7E56` | (warm tan-brown) | Barn Wood | Drawn from panel_brown texture; windows, sticky backs |
| Panel dark | `#7B6243` | (darker brown) | Dark Timber | Title bars, taskbar body |
| Close red | `#C25050` | (muted brick red) | Barn Red | Close buttons, alert accents |
| Paper cream | `#F0E6D2` | (warm off-white) | Parchment | Grid paper inset, sticky text background |
| Text white | `#FFFFFF` | (pure white) | -- | Icon labels, clock, window titles |
| Text dark | `#3B2E1E` | (deep brown) | -- | Sticky note body text, window content text |

### Accent colors (for progress bars and notifications)

| Role | Hex | Name |
|------|-----|------|
| Progress green | `#6AAE3A` | Leafy Green |
| Progress blue | `#4A8CC2` | Sky Blue |
| Notification red | `#C25050` | Barn Red (shared with close button) |

### Color rules

- **No black outlines** on any element. The adventure pack sprites have their
  own built-in brown/tan outlines that feel warmer than black.
- **No neon or saturated colors**. Everything should feel "sunlit" -- warm
  whites, warm browns, soft greens. The animals themselves provide the pops of
  bright color (pink pig, green frog, orange giraffe).
- **Drop shadows**: 0x000000 at 0.15-0.20 alpha, 2-3px offset. Soft and
  subtle, just enough to lift elements off the green wallpaper.

---

## 4. Visual Hierarchy (Front to Back)

Rendering order from back to front:

1. **Wallpaper** -- solid green fill, lowest layer
2. **Barn banner** -- decorative top-center (behind windows, above wallpaper)
3. **Windows** -- the main smashable structures
4. **Sticky notes** -- slightly above windows in z-order (they are "pinned on top")
5. **Animal icons** -- scattered across the desktop, above windows (icons sit on
   the desktop surface, in front of open windows, matching real desktop behavior)
6. **Notification toasts** -- floating above everything except taskbar
7. **Taskbar** -- always on top, bottom of screen

---

## 5. Destruction Notes

When elements are smashed, the warm brown wood panels should produce:
- **Wood-colored debris particles** (sample from panel_brown texture edges for
  color: tan, brown, cream)
- **Paper confetti** from grid-paper elements (off-white, light grey)
- **Red button fragments** from close buttons
- **Animal icon "bounce"** -- when an animal icon is hit, it should squish
  (scale.y compress, scale.x expand) before flying off with physics, not just
  disappear. The round animal faces are inherently funny when squished.

The green wallpaper should show through as elements are destroyed, reinforcing
the "grass underneath" metaphor. Wallpaper damage cracks could be tinted
slightly darker green (0x4A7A30) rather than the default dark color, so the
damage reads as "worn grass" rather than "broken screen."

---

## 6. Pillar Alignment

| Pillar | How This Design Serves It |
|--------|--------------------------|
| **Instant Joy** | Bright animal faces are immediately appealing. No loading, no menus -- animals are right there. Round shapes and warm colors trigger "cute" response in children. |
| **Safe Chaos** | Nothing on screen looks real enough to worry a parent. The wooden "barn" aesthetic signals "play" not "damage." No realistic computer UI that might confuse a child into thinking they broke something real. |
| **Sensation** (MDA #1) | High-contrast animal sprites on green background. Tactile-looking wood textures. Satisfying visual density without clutter. |
| **Discovery** (MDA #4) | 30 animals means each desktop rebuild shows a different set. Kids will notice new animals ("look, a narwhal!"). The variety is built into the icon pool. |

---

## 7. Competitive Positioning

The Animal Farm theme differentiates Desk Smasher from Baby Smash (abstract
colored shapes on black) and Desktop Destroyer (realistic Windows XP mockup).
Our "picture book computer" aesthetic sits in a unique space: recognizable
enough as a "desktop" to be funny, cute enough that it reads as a toy.

The Kenney adventure pack wood panels sell "video game UI" to the parent (who
recognizes the RPG-inventory aesthetic) while reading as "wooden toy" to the
child. This dual reading is the visual hook of the theme.

---

## 8. Implementation Priority

Ordered by visual impact per implementation effort:

1. **Window panels** -- swap from pixel-adventure tiles to adventure pack
   `panel_brown_corners_b.png`. Highest visual upgrade. (Already have NineSlice
   infrastructure in tile-panel.ts.)
2. **Taskbar restyle** -- swap from dark programmatic Graphics bar to
   `panel_brown_dark.png` NineSlice. Adds warmth to the bottom of screen.
3. **Window content** -- add `panel_grid_paper.png` inset + progress bars inside
   windows. Makes windows look "lived in."
4. **Sticky notes** -- swap from solid-color Graphics to `panel_grid_paper.png`
   sprite background.
5. **Notification bars** -- swap from pill Graphics to `banner_modern.png`.
6. **Taskbar tray details** -- add round_brown start button and checkbox tray
   icons. Polish pass.
7. **Barn banner** -- add `banner_hanging.png` decorative element. Pure set
   dressing, lowest priority.

---

## 9. Acceptance Criteria

- [ ] All windows use adventure pack `panel_brown_corners_b.png` as NineSlice
      background (not pixel-adventure tiles) when animal-farm theme is active
- [ ] Window title bars use `panel_brown_dark.png` as a NineSlice strip
- [ ] Close buttons render `button_red_close.png` at native size (no stretching)
- [ ] Taskbar uses `panel_brown_dark.png` NineSlice spanning full screen width
- [ ] Taskbar start button uses `round_brown.png` at native size
- [ ] Sticky notes use `panel_grid_paper.png` as NineSlice background
- [ ] At least one window contains a `panel_grid_paper.png` inset and progress
      bar sprites as faux content
- [ ] All panel NineSlice insets are configured correctly (no stretched borders)
- [ ] The overall color temperature reads as "warm" -- no cold greys or blues
      in the UI chrome (progress_blue is acceptable as a small accent)
- [ ] A child age 1-3 can identify at least 3 animal icons without labels at
      60cm viewing distance (playtest validation)
- [ ] Desktop is visually distinct from pixel-adventure theme at a glance
      (wood+parchment vs. chunky retro pixels)

---

## Dependencies

| System | Direction | Notes |
|--------|-----------|-------|
| Theme Loader | Upstream | Must load all adventure pack PNGs listed in asset mapping |
| Tile Panel Builder | Parallel | Needs theme-aware panel selection (adventure panels for animal-farm, pixel tiles for pixel-adventure) |
| Element Factory | Downstream | Must support sprite-based sticky notes and notification bars |
| Desktop Manager | Downstream | Must pass theme-specific panel textures to window/taskbar builders |
| Destruction Effects | Downstream | Debris particle colors should sample from panel textures |

---

*End of document.*
