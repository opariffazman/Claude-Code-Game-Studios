# Animal Farm Theme -- Technical Implementation Notes

> **Status**: Proposed
> **Author**: technical-director
> **Created**: 2026-03-31
> **Design Source**: `design/gdd/animal-farm-theme.md`

---

## Architecture Decisions

### Q1: Expand TilePanelBuilder or create a new ThemeRenderer?

**Decision: Expand TilePanelBuilder with a theme-aware style map.**

Rationale: TilePanelBuilder already owns panel construction, NineSlice insets,
and close-button placement. Creating a parallel `AdventurePanelBuilder` would
duplicate 80% of the logic (nine-slice creation, close button positioning,
window layout). Instead, extend TilePanelBuilder with a second style registry
for adventure-pack panels. The `PanelStyle` type already serves as a selector
key -- we add a `PanelPack` discriminator (`'pixel' | 'adventure'`) so the
caller can say "adventure/brown" vs "pixel/brown."

Concretely:
- Add an `AdventureStyle` type (`'brownCorners' | 'brownDark' | 'gridPaper'`)
  alongside existing `PanelStyle`.
- Add `ADVENTURE_PANELS` lookup map parallel to `PANEL_TILES`.
- Add `ADVENTURE_INSETS` map (per-sprite insets, since they differ from the
  uniform 8px pixel-tile inset).
- Add `buildAdventureWindow()` and `buildAdventurePanel()` methods.
- Keep all existing pixel-adventure methods untouched -- no breaking changes.

### Q2: How to restyle the taskbar?

**Decision: Add a new `buildThemedTaskbar()` method to ElementFactory.**

Rationale: The existing `createTaskbar()` uses Graphics primitives. For animal-
farm we need NineSlice panel + Sprite start button + Sprite tray icons. These
are structurally different enough that injecting theme awareness into the
existing method would make it a mess of conditionals. A new method
`createThemedTaskbar()` that accepts a taskbar config object (panel texture,
start button texture, tray icon textures) keeps both paths clean. The
DesktopManager already dispatches window construction by checking
`_tilePanelBuilder?.isReady` -- we add a parallel check for themed taskbar.

### Q3: Default (1x) vs Double (2x) adventure PNGs?

**Decision: Use Double (2x) for web.**

Measured dimensions:
- Default `panel_brown_corners_b.png`: 64x64 px
- Double `panel_brown_corners_b.png`: 128x128 px
- Default `progress_green.png`: 16x32 px (too small for NineSlice at web scale)
- Default `checkbox_brown_checked.png`: 24x24 px
- Default `banner_hanging.png`: 256x64 px (already large enough)

At web resolution (typically 1280x720+), a 64x64 source texture NineSliced to
300x200 windows will show blurry interiors. The 128x128 Double variants give
4x the pixel data for negligible memory cost (these are small PNGs, ~1-2KB
each). The checkboxes at 24x24 Default are fine for tray icons since they
render at native size, but using 2x consistently avoids mixing resolutions.

**Exception**: `banner_hanging.png` (256x64 Default, 512x128 Double) and
`banner_modern.png` (256x48 Default) are already large -- Default is sufficient.
Use Double anyway for consistency so we load from one directory.

---

## Asset Inventory

### PNGs to copy to `public/assets/kenney/ui/adventure/`

Source: `assets/sprites/ui/adventure/PNG/Double/`

Currently in `public/`: `close_red.png`, `panel_brown.png`, `panel_brown_dark.png`,
`close_brown.png`, `close_grey.png`, `button_close.png`, `panel_border.png`.

**New files needed** (13 PNGs):

| Filename | Source Size (Double) | NineSlice? | Purpose |
|----------|---------------------|------------|---------|
| `panel_brown_corners_b.png` | 128x128 | Yes | Window body |
| `panel_grid_paper.png` | 128x128 | Yes | Sticky notes, window content inset |
| `banner_modern.png` | 512x96 | Yes | Notification bar |
| `banner_hanging.png` | 512x128 | No | Decorative barn banner |
| `round_brown.png` | 128x128 | No | Taskbar start button |
| `round_brown_dark.png` | 128x128 | No | Taskbar tray icon |
| `checkbox_brown_checked.png` | 48x48 | No | Taskbar tray icon |
| `checkbox_brown_empty.png` | 48x48 | No | Taskbar tray icon |
| `progress_green.png` | 32x64 | Yes (H) | Window content faux bar |
| `progress_blue.png` | 32x64 | Yes (H) | Window content faux bar |
| `button_red_close.png` | 96x48 | No | Close button (if not already aliased from close_red) |
| `button_brown_close.png` | ? | No | Alt close button (future) |

**Already present** (reuse existing):
- `panel_brown_dark.png` -- title bars and taskbar body (already in public/ from
  prior work, but verify it is the Double variant)

### Assets.load paths

All relative to Vite public root. Example:
```
Assets.load('assets/kenney/ui/adventure/panel_brown_corners_b.png')
```

Loaded via the ThemeLoader `ui` config block, which already supports keyed paths.

---

## Step-by-Step Implementation

### Step 1: Window Panels (swap to adventure pack)

**Complexity: M**

**Files to change:**
- `src/ui/tile-panel.ts` -- add adventure panel support
- `src/systems/theme-loader.ts` -- expand `ui` config for animal-farm
- `src/desktop/desktop-manager.ts` -- route window building through adventure path

**Asset work:**
- Copy `panel_brown_corners_b.png` (Double) to `public/assets/kenney/ui/adventure/`

**NineSlice insets** (Double/2x values -- doubled from design doc's 1x specs):
- `panel_brown_corners_b.png`: L:20 T:20 R:20 B:20

**Implementation detail:**
1. In `tile-panel.ts`, add `ADVENTURE_PANELS` map:
   ```ts
   const ADV_DIR = 'assets/kenney/ui/adventure';
   const ADVENTURE_PANELS = {
     brownCorners: `${ADV_DIR}/panel_brown_corners_b.png`,
   };
   const ADVENTURE_INSETS = {
     brownCorners: { left: 20, top: 20, right: 20, bottom: 20 },
   };
   ```
2. Add `buildAdventureWindow(style, w, h)` method.
3. In `theme-loader.ts`, add `panel_brown_corners_b.png` to animal-farm's `ui`
   config as `windowPanel`.
4. In `desktop-manager.ts` `buildWindows()`, when theme is animal-farm, call
   `_tilePanelBuilder.buildAdventureWindow()` instead of the pixel-tile path.

**Existing close button** (`close_red.png`) is already loaded and working --
reuse it in the adventure window builder.

---

### Step 2: Taskbar Restyle

**Complexity: M**

**Files to change:**
- `src/desktop/element-factory.ts` -- add `createThemedTaskbar()` method
- `src/systems/theme-loader.ts` -- add taskbar-related UI paths to animal-farm config
- `src/desktop/desktop-manager.ts` -- add themed taskbar dispatch in `buildTaskbar()`

**Asset work:**
- Copy to `public/assets/kenney/ui/adventure/`:
  - `panel_brown_dark.png` (already present -- verify it is Double)
  - `round_brown.png`
  - `round_brown_dark.png`
  - `checkbox_brown_checked.png`
  - `checkbox_brown_empty.png`

**NineSlice insets** (Double/2x):
- `panel_brown_dark.png`: L:12 T:12 R:12 B:12

**Implementation detail:**
1. `createThemedTaskbar(config)` accepts:
   ```ts
   interface TaskbarThemeConfig {
     panelTexture: Texture;       // panel_brown_dark NineSlice
     panelInsets: NineSliceInsets;
     startButtonTexture: Texture; // round_brown
     trayIcons: Texture[];        // checkbox_checked, checkbox_empty, round_dark
   }
   ```
2. Builds: NineSlice bar full width, Sprite start button at left (scale to 40px),
   3 Sprite tray icons at right (scale to 20px), Text clock at right.
3. In `desktop-manager.ts`, `buildTaskbar()` checks if theme has taskbar config;
   if so, calls `createThemedTaskbar()`.

---

### Step 3: Window Content (grid-paper inset + progress bars)

**Complexity: M**

**Files to change:**
- `src/ui/tile-panel.ts` -- add `buildWindowContent()` helper
- `src/desktop/desktop-manager.ts` -- call content builder after window panel

**Asset work:**
- Copy to `public/assets/kenney/ui/adventure/`:
  - `panel_grid_paper.png`
  - `progress_green.png`
  - `progress_blue.png`

**NineSlice insets** (Double/2x):
- `panel_grid_paper.png`: L:16 T:16 R:16 B:16
- `progress_green.png`: L:8 T:8 R:8 B:8 (horizontal stretch only -- set height fixed)
- `progress_blue.png`: L:8 T:8 R:8 B:8

**Implementation detail:**
1. Inside the adventure window, after the title bar, add:
   - A `panel_grid_paper.png` NineSlice at ~60% of inner width, positioned below
     title bar with 10px padding.
   - 2-3 progress bar NineSlices below the paper inset: random widths (40-80%
     of inner width), fixed height 16px (Double source is 32x64, stretched
     horizontally).
2. Progress bar selection: alternate `progress_green` and `progress_blue`.
3. All content is purely decorative -- no interactivity needed.

---

### Step 4: Sticky Notes (sprite background)

**Complexity: S**

**Files to change:**
- `src/desktop/element-factory.ts` -- add `createThemedSticky()` method
- `src/systems/theme-loader.ts` -- add `stickyPanel` to animal-farm UI config
- `src/desktop/desktop-manager.ts` -- dispatch themed sticky in `buildStickies()`

**Asset work:**
- `panel_grid_paper.png` already copied in Step 3.

**NineSlice insets:** same as Step 3: L:16 T:16 R:16 B:16.

**Implementation detail:**
1. `createThemedSticky(text, w, h, panelTexture, insets)`:
   - NineSliceSprite background instead of Graphics rect.
   - Text overlay with dark brown color (`0x3B2E1E`).
   - Keep existing random rotation.
   - No dog-ear fold (the grid-paper sprite has its own visual edges).
2. Farm-themed text pool: "Buy more hay", "Count the chickens", "Pig bath day!",
   "Fix the fence", "Egg delivery 3pm" -- add to `element-types.ts` as
   `FARM_STICKY_TEXTS`.

---

### Step 5: Notification Bars (banner_modern sprite)

**Complexity: S**

**Files to change:**
- `src/desktop/element-factory.ts` -- add `createThemedNotification()` method
- `src/systems/theme-loader.ts` -- add `notifBar` to animal-farm UI config
- `src/desktop/desktop-manager.ts` -- dispatch themed notification in `buildNotifications()`

**Asset work:**
- Copy `banner_modern.png` to `public/assets/kenney/ui/adventure/`.

**NineSlice insets** (Double/2x):
- `banner_modern.png`: L:24 T:16 R:24 B:16

**Implementation detail:**
1. `createThemedNotification(text, w, h, bannerTexture, insets)`:
   - NineSliceSprite background replacing the rounded-rect Graphics.
   - White text, positioned with left padding for the wider banner borders.
   - No emoji icon -- use text-only for farm notifications.
2. Farm notification texts: "New eggs collected!", "Feeding time!",
   "Barn door is open", "Cow says hi" -- add to `element-types.ts` as
   `FARM_NOTIF_TEXTS`.

---

### Step 6: Taskbar Tray Details (start button icon + tray polish)

**Complexity: S**

**Files to change:**
- `src/desktop/element-factory.ts` -- enhance `createThemedTaskbar()` from Step 2

**Asset work:** All assets already copied in Step 2.

**Implementation detail:**
1. Inside the start button (`round_brown.png` Sprite), overlay a small animal
   icon sprite (chick or pig) at 50% scale, centered. Pull from the theme's
   loaded `iconTextures[0]`.
2. Tray icons: 3 Sprites at right edge, each 20x20px display size:
   - `checkbox_brown_checked.png` (48x48 Double, scale to 20x20)
   - `checkbox_brown_empty.png` (48x48 Double, scale to 20x20)
   - `round_brown_dark.png` (128x128 Double, scale to 20x20)
3. 6px spacing between tray icons, 10px from right edge.

---

### Step 7: Barn Banner (decorative element)

**Complexity: S**

**Files to change:**
- `src/desktop/desktop-manager.ts` -- add `buildBarnBanner()` called from `buildDesktop()`
- `src/desktop/element-types.ts` -- (optional) add 'banner' as an ElementType

**Asset work:**
- Copy `banner_hanging.png` to `public/assets/kenney/ui/adventure/`.

**NineSlice:** No -- render as a plain Sprite, scaled to ~40% screen width.

**Implementation detail:**
1. `buildBarnBanner()`:
   - Load `banner_hanging.png` as a Sprite.
   - Scale width to `screenW * 0.4`, maintain aspect ratio.
   - Position: centered horizontally, top of screen (y = 10px).
   - Register as a `DesktopElement` with type `'notification'` (or new `'banner'`
     type) and health = 2.
   - Insert in container above wallpaper but below windows (z-order index 1 or 2).
2. Only spawn when theme is animal-farm. Check `_themeLoader.currentTheme.name`.

---

## ThemeLoader Config Changes

The `animal-farm` entry in `theme-loader.ts` needs its `ui` block expanded:

```ts
ui: {
  windowPanel:   'assets/kenney/ui/adventure/panel_brown_corners_b.png',
  titleBar:      'assets/kenney/ui/adventure/panel_brown_dark.png',
  closeButton:   'assets/kenney/ui/adventure/close_red.png',
  stickyPanel:   'assets/kenney/ui/adventure/panel_grid_paper.png',
  notifBar:      'assets/kenney/ui/adventure/banner_modern.png',
  // Taskbar-specific (new keys):
  taskbarPanel:  'assets/kenney/ui/adventure/panel_brown_dark.png',
  startButton:   'assets/kenney/ui/adventure/round_brown.png',
  trayChecked:   'assets/kenney/ui/adventure/checkbox_brown_checked.png',
  trayEmpty:     'assets/kenney/ui/adventure/checkbox_brown_empty.png',
  trayDot:       'assets/kenney/ui/adventure/round_brown_dark.png',
  barnBanner:    'assets/kenney/ui/adventure/banner_hanging.png',
  gridPaper:     'assets/kenney/ui/adventure/panel_grid_paper.png',
  progressGreen: 'assets/kenney/ui/adventure/progress_green.png',
  progressBlue:  'assets/kenney/ui/adventure/progress_blue.png',
},
```

The existing `_loadTheme()` already iterates `theme.ui` entries and loads them
all via `Assets.load(urls)`, storing results in `theme.uiTextures`. No loader
changes needed -- just expand the config.

---

## NineSlice Inset Reference (all Double/2x values)

| Sprite | Left | Top | Right | Bottom | Notes |
|--------|------|-----|-------|--------|-------|
| `panel_brown_corners_b.png` | 20 | 20 | 20 | 20 | Corner bolts need wide margin |
| `panel_brown_dark.png` | 12 | 12 | 12 | 12 | Simple dark border |
| `panel_grid_paper.png` | 16 | 16 | 16 | 16 | Grid-line border |
| `banner_modern.png` | 24 | 16 | 24 | 16 | Wider L/R for pill shape |
| `progress_green.png` | 8 | 8 | 8 | 8 | Horizontal stretch only |
| `progress_blue.png` | 8 | 8 | 8 | 8 | Horizontal stretch only |

Note: These are estimates based on 2x source dimensions. Actual values should
be verified visually after first render. The pixel-adventure tiles used a
uniform 8px inset on 32x32 sources -- these adventure panels are larger and
more varied, so per-sprite insets are necessary.

---

## Risk Assessment

| Risk | Severity | Mitigation |
|------|----------|------------|
| NineSlice insets wrong, causing stretched borders | Medium | Visual QA pass after each step; insets are easy to tweak |
| Too many texture loads slowing startup | Low | 13 small PNGs (~15KB total); existing loader handles bulk load |
| Fantasy-kingdom shares animal-farm icons but not UI | Low | UI config is per-theme; fantasy-kingdom keeps its own (currently empty) ui block |
| Double PNGs look blurry on very high-DPI displays | Low | 128px source is fine up to 2x DPI; for 3x+ we'd need a retina pass (out of scope) |
| Element type system doesn't support 'banner' | Low | Reuse 'notification' type for barn banner; add 'banner' type later if needed |

---

## Execution Order

Steps 1-2 (windows + taskbar) deliver the biggest visual change and should be
done first. Steps 3-5 (content, stickies, notifications) are independent of
each other and can be done in any order. Steps 6-7 are polish.

Total estimated effort: ~3-4 focused implementation sessions.
