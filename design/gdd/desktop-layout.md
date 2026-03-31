# Desktop Layout Specification

> **Status**: Designed
> **Author**: creative-director
> **Last Updated**: 2026-03-31
> **Implements Pillar**: Instant Joy, Safe Chaos, Surprise & Variety
> **Depends On**: Desktop Renderer, Theme System, Element Factory

---

## Overview

Defines the spatial layout rules for all desktop elements: where icons, windows,
notifications, the taskbar, and decorative elements are placed on screen. Replaces
the current random scatter with a structured zone-based layout that mimics a real
operating system desktop -- icons in a left-side grid, windows stacked in the
center-right, notifications stacked top-right, taskbar pinned to the bottom. The
layout should feel instantly recognizable as "a computer screen" to both the child
(who sees mommy/daddy's screen every day) and the parent (who gets the joke). But
it is cuter, warmer, and more chaotic than any real OS.

---

## Player Fantasy

The child looks at the screen and sees something that looks like the computer they
are not supposed to touch. The icons are in neat rows on the side -- just like the
real thing. There are windows open -- just like when a grown-up is working. There
is a bar at the bottom with a little clock. It all looks REAL. And then they get
to SMASH it. The familiarity is what makes the destruction satisfying. You cannot
enjoy breaking something that does not look like the thing you are breaking.

For the parent: "That actually looks like a desktop. Cute."

---

## Detailed Rules

### 1. Zone Map

The screen is divided into four non-overlapping zones plus one overlay layer. All
values are percentages of the viewport width (W) and height (H).

```
+-------+---------------------------------+--------+
|       |                                 |        |
| ICON  |         MAIN AREA               | NOTIF  |
| GRID  |    (windows placed here)        | STACK  |
|       |                                 |        |
| 0-18% |       18-82% width             | 82-100%|
| width |                                 | width  |
|       |                                 |        |
|       |                                 |        |
| 0-88% |       0-88% height             | 5-50%  |
| height|                                 | height |
+-------+---------------------------------+--------+
|          TASKBAR (full width, bottom 12%)        |
|          0-100% width, 88-100% height            |
+--------------------------------------------------+
   [DECORATIVE BANNER: top center, behind all]
```

#### Zone Definitions (percentage of viewport)

| Zone | X Start | X End | Y Start | Y End | Purpose |
|------|---------|-------|---------|-------|---------|
| Icon Grid | 1.5% | 18% | 3% | 85% | Left-side icon grid, like desktop shortcuts |
| Main Area | 18% | 82% | 3% | 85% | Windows placed here with slight overlap |
| Notification Stack | 80% | 98% | 5% | 50% | Top-right notification banners |
| Taskbar | 0% | 100% | 88% | 100% | Full-width bottom bar |
| Banner (deco) | 25% | 75% | 0% | 8% | Top-center decorative, behind everything |

The 2% gap between Icon Grid bottom and Taskbar top prevents icons from visually
colliding with the taskbar. The 3% top margin prevents icons from touching the
screen edge (feels claustrophobic without it).

---

### 2. Icon Grid Rules

Icons are placed in a regular grid on the LEFT side of the screen, mimicking how
Windows and macOS arrange desktop shortcuts in columns from the top-left corner.

#### Grid Parameters

| Parameter | Formula | Example at 1920x1080 | Example at 800x600 |
|-----------|---------|---------------------|---------------------|
| Grid origin X | `W * 0.015 + CELL_W * 0.5` | 46px | 25px |
| Grid origin Y | `H * 0.03 + CELL_H * 0.5` | 67px | 40px |
| Cell width (CELL_W) | `W * 0.075` | 144px | 60px |
| Cell height (CELL_H) | `H * 0.12` | 130px | 72px |
| Columns | 2 (if W < 1200), else 3 | 3 | 2 |
| Max rows | `floor((H * 0.82) / CELL_H)` | 6 | 7 |
| Max icons | columns * max_rows, capped at 12 | 12 (3x4 used) | 12 (2x6 used) |
| Jitter X | uniform random in [-5, +5] px | -- | -- |
| Jitter Y | uniform random in [-5, +5] px | -- | -- |

#### Placement Algorithm

```
for each icon (i from 0 to iconCount - 1):
    col = i % columns
    row = floor(i / columns)
    centerX = gridOriginX + col * CELL_W + jitterX()
    centerY = gridOriginY + row * CELL_H + jitterY()
    place icon centered at (centerX, centerY)
```

Icons fill columns top-to-bottom, left-to-right. This matches the Windows desktop
icon flow direction (which children see on their parents' machines).

#### Icon Count

- **Per session**: 8-12 icons (randomized within this range).
- **From pool**: The active theme's full icon pool (e.g., 30 animals for Animal
  Farm). A random subset of 8-12 is selected each generation using Fisher-Yates
  shuffle. The variety comes from WHICH animals appear, not WHERE they are.
- **No duplicates**: If pool >= iconCount, no duplicates. If pool < iconCount
  (should not happen with current themes), allow duplicates.

#### Visual Treatment

- Icons are centered within their grid cell.
- NO rotation on initial placement. The grid should look tidy. Rotation happens
  only after a hit (damage wobble).
- Icon labels (if enabled for the theme) are centered below the sprite, within
  the cell bounds.

---

### 3. Window Placement Rules

Windows occupy the center-right area of the screen, placed from back to front with
cascading offsets -- exactly how a real OS stacks overlapping windows.

#### Window Count

- 2-3 windows per desktop generation (randomized).
- Capped at 3 maximum regardless of config to prevent visual clutter.

#### Window Size

| Dimension | Formula | Example at 1920x1080 |
|-----------|---------|---------------------|
| Width | `randInt(W * 0.18, W * 0.28)` | 346-538px |
| Height | `randInt(H * 0.22, H * 0.35)` | 238-378px |

Windows are large enough to feel like real application windows and to be
satisfying smash targets, but small enough that 2-3 fit without completely
covering each other.

#### Cascade Placement

Windows are placed using a cascade pattern (like the Windows "Cascade Windows"
arrangement):

```
Window 0 (back):
    x = W * 0.22 + jitter()
    y = H * 0.08 + jitter()

Window 1 (middle):
    x = W * 0.22 + CASCADE_OFFSET_X + jitter()
    y = H * 0.08 + CASCADE_OFFSET_Y + jitter()

Window 2 (front):
    x = W * 0.22 + CASCADE_OFFSET_X * 2 + jitter()
    y = H * 0.08 + CASCADE_OFFSET_Y * 2 + jitter()
```

| Parameter | Value | Notes |
|-----------|-------|-------|
| CASCADE_OFFSET_X | `W * 0.06` | ~115px at 1920. Enough to see previous window's left edge. |
| CASCADE_OFFSET_Y | `H * 0.06` | ~65px at 1080. Enough to see previous window's title bar. |
| Jitter X | uniform random in [-20, +20] px | Prevents robotic precision. |
| Jitter Y | uniform random in [-15, +15] px | Slightly less vertical jitter. |

#### Overlap Rules

- Windows MAY overlap -- this is intentional and looks like a real desktop.
- Each window's title bar must remain visible (the cascade offset guarantees this).
- The frontmost window (highest index) is rendered last and appears on top.
- No window may extend below `H * 0.85` (the taskbar exclusion zone).
- No window may extend past `W * 0.80` on the right (leave room for
  notification zone to breathe).

#### Z-Ordering

Windows are added to the container in order: window 0 first (back), window 2 last
(front). PixiJS renders children in add-order, so this naturally produces correct
depth stacking.

---

### 4. Notification Placement Rules

Notifications stack vertically in the top-right corner, exactly like macOS or
Windows 10/11 notification banners.

#### Notification Count

- 2-3 notifications per desktop generation.

#### Positioning

```
for each notification (i from 0 to count - 1):
    x = W - notifWidth - W * 0.02       // right-aligned with 2% margin
    y = H * 0.05 + i * (notifHeight + NOTIF_SPACING)
```

| Parameter | Value | Notes |
|-----------|-------|-------|
| NOTIF_SPACING | `H * 0.015` | ~16px at 1080. Tight stack like real OS notifications. |
| Right margin | `W * 0.02` | ~38px at 1920. Small breathing room from screen edge. |
| Top margin | `H * 0.05` | ~54px at 1080. Below the decorative banner zone. |

#### Size

| Dimension | Formula | Example at 1920x1080 |
|-----------|---------|---------------------|
| Width | `W * 0.15` | 288px |
| Height | aspect-ratio preserving from banner texture, or `H * 0.05` fallback | ~54px |

Notifications are small and subtle -- they are set dressing, not primary smash
targets. They exist to make the desktop look "busy" and real.

#### Stack Direction

Top-to-bottom. First notification is highest on screen. This matches real OS
notification behavior.

---

### 5. Taskbar Rules

The taskbar is a full-width bar pinned to the bottom of the screen. It is always
the frontmost element in z-order (rendered last).

#### Dimensions

| Parameter | Formula | Example at 1920x1080 | Example at 800x600 |
|-----------|---------|---------------------|---------------------|
| Width | `W` (full viewport width) | 1920px | 800px |
| Height | `BASE_H * clamp(H / 768, 0.5, 1.5)` | ~67px | ~37px |
| BASE_H | 48px (from DESKTOP_CONFIG) | -- | -- |
| Y position | `H - taskbarHeight` | 1013px | 563px |

The taskbar scales proportionally to viewport height so it does not dominate on
small screens or become invisible on large ones.

#### Internal Layout

```
+--[Start]---[         spacer         ]---[12:00]--[o][o][o]--+
   6px pad                                      tray icons
```

| Element | X Position | Size |
|---------|-----------|------|
| Start button | 6px from left | `taskbarH * 0.83` square |
| Clock text | `W - taskbarH * 1.25` from left | 14px font (scales with taskbarH) |
| Tray icons (3) | right-aligned, 4px spacing | native sprite size |

---

### 6. Decorative Banner Rules

A single decorative banner (e.g., `banner_hanging.png`) is placed at the top
center of the screen, behind all interactive elements. It is pure set dressing
that establishes the theme's atmosphere.

#### Positioning

| Parameter | Value |
|-----------|-------|
| X | `W * 0.5` (centered, anchor at 0.5) |
| Y | 0 (top of screen, anchor at top) |
| Scale | `(W / 1920) * 0.8` |
| Z-order | Behind windows, above wallpaper |

The banner is smashable (2 health) but is not a primary target. It exists to fill
the top-center dead space and make the desktop feel decorated.

---

### 7. Anti-Overlap Guarantee

Each zone type uses a different strategy to prevent unwanted overlap:

| Zone | Anti-Overlap Strategy |
|------|----------------------|
| Icons | Grid placement with fixed cell sizes. No two icons can share a cell. Jitter is small enough (5px) that icons never touch. |
| Windows | Cascade offset guarantees title bar visibility. Intentional body overlap is fine. |
| Notifications | Fixed Y spacing in a vertical stack. No overlap possible. |
| Taskbar | Single element, full width. Nothing else placed in its zone. |
| Banner | Single element. Positioned behind everything. Visual overlap with windows is acceptable (banner is background). |

#### Cross-Zone Overlap Prevention

- **Taskbar exclusion**: All element placement is bounded by `H * 0.85` on the
  bottom (or `H * 0.88` for the strict zone). No icon, window, or notification
  may start below this line.
- **Icon-Window separation**: Icons are in columns 0-18% width; windows start
  at 22% width. There is a 4% buffer between zones (~77px at 1920). Windows
  cannot encroach on the icon grid.
- **Notification-Window separation**: Windows are bounded to 80% width on the
  right; notifications start at 80% width. Slight visual overlap at the boundary
  is acceptable -- the notification is a small banner and reads as "floating
  above" the window.

---

### 8. Randomness Budget

What varies between desktop generations and what stays fixed:

| Aspect | Random or Fixed | Details |
|--------|----------------|---------|
| Zone boundaries | **Fixed** | Percentages defined above. Same every time. |
| Icon grid layout | **Fixed structure** | Grid cell positions are deterministic. |
| Icon grid jitter | **Random** | +/-5px per icon. Organic feel, no functional impact. |
| Which icons appear | **Random** | 8-12 chosen from theme pool of 16-30. |
| Icon order in grid | **Random** | Shuffled before grid placement. |
| Number of windows | **Random** | 2-3. |
| Window sizes | **Random** | Within the defined min/max range. |
| Window cascade jitter | **Random** | +/-20px X, +/-15px Y per window. |
| Window titles | **Random** | Shuffled from theme pool. |
| Notification count | **Random** | 2-3. |
| Notification content | **Random** | Shuffled from theme pool. |
| Notification stack direction | **Fixed** | Always top-to-bottom. |
| Taskbar position | **Fixed** | Always bottom, full width. |
| Banner position | **Fixed** | Always top center. |
| Z-ordering | **Fixed** | Wallpaper < Banner < Windows < Icons < Notifications < Taskbar. |

This gives each desktop generation a fresh feel (different animals, different
window count, slight positional variation) while maintaining the recognizable
"desktop" structure that sells the fantasy.

---

## Formulas

### Grid Cell Dimensions

```
CELL_W = viewportWidth * 0.075
CELL_H = viewportHeight * 0.12

Where:
  viewportWidth  = logical canvas width in px (e.g. 1920)
  viewportHeight = logical canvas height in px (e.g. 1080)

Example at 1920x1080:
  CELL_W = 1920 * 0.075 = 144px
  CELL_H = 1080 * 0.12  = 129.6px -> 130px
```

### Grid Capacity

```
columns   = viewportWidth < 1200 ? 2 : 3
maxRows   = floor((viewportHeight * 0.82) / CELL_H)
maxIcons  = min(columns * maxRows, 12)

Example at 1920x1080:
  columns  = 3
  maxRows  = floor((1080 * 0.82) / 130) = floor(885.6 / 130) = 6
  maxIcons = min(18, 12) = 12

Example at 800x600:
  columns  = 2
  maxRows  = floor((600 * 0.82) / 72) = floor(492 / 72) = 6
  maxIcons = min(12, 12) = 12
```

### Icon Grid Position

```
gridOriginX = viewportWidth * 0.015 + CELL_W * 0.5
gridOriginY = viewportHeight * 0.03 + CELL_H * 0.5

iconCenterX(i) = gridOriginX + (i % columns) * CELL_W + uniform(-5, +5)
iconCenterY(i) = gridOriginY + floor(i / columns) * CELL_H + uniform(-5, +5)

Example: icon 5 at 1920x1080 (3 columns):
  col = 5 % 3 = 2
  row = floor(5 / 3) = 1
  x = 46 + 2 * 144 + jitter = 334 +/- 5
  y = 67 + 1 * 130 + jitter = 197 +/- 5
```

### Window Cascade Position

```
baseX = viewportWidth * 0.22
baseY = viewportHeight * 0.08
cascadeX = viewportWidth * 0.06
cascadeY = viewportHeight * 0.06

windowX(i) = baseX + i * cascadeX + uniform(-20, +20)
windowY(i) = baseY + i * cascadeY + uniform(-15, +15)

Example: window 2 at 1920x1080:
  x = 422 + 2 * 115 + jitter = 652 +/- 20
  y = 86  + 2 * 65  + jitter = 216 +/- 15
```

### Notification Stack Position

```
notifX    = viewportWidth - notifWidth - viewportWidth * 0.02
notifY(i) = viewportHeight * 0.05 + i * (notifHeight + viewportHeight * 0.015)

Example: notification 1 at 1920x1080 (notifWidth=288, notifHeight=54):
  x = 1920 - 288 - 38 = 1594
  y = 54 + 1 * (54 + 16) = 124
```

---

## Edge Cases

| Edge Case | Resolution |
|-----------|------------|
| Very narrow viewport (W < 600) | Use 2 icon columns, reduce icon count to max 8, reduce window count to max 2, reduce notification width to `W * 0.22`. |
| Very short viewport (H < 500) | Reduce icon rows (maxRows formula handles this). Reduce window height max to `H * 0.30`. Stack at most 2 notifications. |
| Icon count exceeds grid capacity | Clamp to `maxIcons`. Surplus icons from the theme pool are simply not shown this generation. |
| Window extends beyond right boundary | Clamp window right edge to `W * 0.80`. Reduce window width if necessary. |
| Window extends below taskbar zone | Clamp window bottom edge to `H * 0.85`. Reduce window height if necessary. |
| Notification extends below midscreen | Stop placing notifications after `H * 0.50`. If 3 notifications do not fit, only place 2. |
| Canvas resize during active desktop | Recalculate zone boundaries. Reposition elements proportionally (x/W and y/H ratios preserved). Icons snap to new grid positions. |
| Taskbar taller than 12% of viewport | Clamp taskbar height to `H * 0.12`. The scaling formula with clamp(0.5, 1.5) already prevents this at reasonable viewport sizes. |
| Zero icons in theme pool | Fall back to Graphics-based colored rectangles (existing fallback path). Place up to 8 in the grid. |

---

## Dependencies

| System | Direction | Notes |
|--------|-----------|-------|
| Desktop Renderer (desktop-manager.ts) | Downstream consumer | Must implement zone-based placement instead of random scatter. |
| Theme System | Upstream data | Provides icon pool, window titles, notification texts per theme. |
| Element Factory | Downstream | Creates visual elements; layout spec does not change element construction. |
| Config (config.ts) | Upstream | DESKTOP_CONFIG values for health, taskbar height, icon counts. |
| Desktop Rebuild Cycle | Peer | Triggers new desktop generation; layout rules apply fresh each rebuild. |
| Animal Farm Theme | Peer | Theme-specific overrides (icon scale 1.25x) affect grid cell sizing. |

**Bidirectional note**: The Desktop Renderer GDD should reference this layout
spec as its positioning authority. The Animal Farm Theme GDD section 1.2 currently
says "scattered with mild randomization" -- this layout spec supersedes that with
grid-based placement.

---

## Tuning Knobs

| Parameter | Default | Range | Category | Effect |
|-----------|---------|-------|----------|--------|
| `ICON_GRID_COLUMNS_SMALL` | 2 | 1-3 | Layout | Columns when viewport < 1200px wide |
| `ICON_GRID_COLUMNS_LARGE` | 3 | 2-4 | Layout | Columns when viewport >= 1200px wide |
| `ICON_GRID_CELL_W_PCT` | 0.075 | 0.05-0.12 | Layout | Grid cell width as fraction of viewport width |
| `ICON_GRID_CELL_H_PCT` | 0.12 | 0.08-0.18 | Layout | Grid cell height as fraction of viewport height |
| `ICON_GRID_JITTER_PX` | 5 | 0-15 | Feel | Max random offset from grid center. 0 = pixel-perfect grid. 15 = noticeably wobbly. |
| `ICON_COUNT_MIN` | 8 | 4-12 | Content | Minimum icons per generation |
| `ICON_COUNT_MAX` | 12 | 8-18 | Content | Maximum icons per generation |
| `WINDOW_COUNT_MIN` | 2 | 1-3 | Content | Minimum windows |
| `WINDOW_COUNT_MAX` | 3 | 2-4 | Content | Maximum windows |
| `WINDOW_CASCADE_X_PCT` | 0.06 | 0.03-0.10 | Layout | Horizontal cascade offset as fraction of W |
| `WINDOW_CASCADE_Y_PCT` | 0.06 | 0.03-0.10 | Layout | Vertical cascade offset as fraction of H |
| `WINDOW_JITTER_X_PX` | 20 | 0-40 | Feel | Max random X offset from cascade position |
| `WINDOW_JITTER_Y_PX` | 15 | 0-30 | Feel | Max random Y offset from cascade position |
| `WINDOW_MIN_W_PCT` | 0.18 | 0.12-0.25 | Layout | Minimum window width as fraction of W |
| `WINDOW_MAX_W_PCT` | 0.28 | 0.20-0.35 | Layout | Maximum window width as fraction of W |
| `WINDOW_MIN_H_PCT` | 0.22 | 0.15-0.30 | Layout | Minimum window height as fraction of H |
| `WINDOW_MAX_H_PCT` | 0.35 | 0.25-0.45 | Layout | Maximum window height as fraction of H |
| `NOTIF_COUNT_MIN` | 2 | 1-3 | Content | Minimum notifications |
| `NOTIF_COUNT_MAX` | 3 | 2-4 | Content | Maximum notifications |
| `NOTIF_WIDTH_PCT` | 0.15 | 0.10-0.22 | Layout | Notification banner width as fraction of W |
| `NOTIF_SPACING_PCT` | 0.015 | 0.01-0.03 | Layout | Vertical gap between notifications as fraction of H |
| `TASKBAR_EXCLUSION_PCT` | 0.88 | 0.82-0.92 | Layout | Y threshold below which no elements are placed (fraction of H) |

All values as percentages of viewport ensure the layout scales correctly across
screen sizes without breakpoints (except the column count threshold at 1200px).

---

## Acceptance Criteria

- [ ] Icons are arranged in a visible grid pattern on the left 18% of the screen
- [ ] Grid has 2 columns on viewports narrower than 1200px, 3 columns on wider
- [ ] No two icons overlap on initial generation (before any smash physics)
- [ ] 8-12 icons appear per generation, randomly selected from theme pool
- [ ] Icon order within the grid is randomized each generation
- [ ] Each icon has +/-5px jitter from its grid center (not pixel-perfect)
- [ ] Windows appear in the center-right area (starting around 22% from left)
- [ ] 2-3 windows are visible, with cascading offsets so each title bar is visible
- [ ] Windows may partially overlap each other (intentional)
- [ ] No window extends below the taskbar exclusion zone (88% of viewport height)
- [ ] Notifications stack vertically in the top-right corner with uniform spacing
- [ ] 2-3 notifications visible, no overlap between notification banners
- [ ] Taskbar spans full viewport width at the bottom
- [ ] No interactive element overlaps the taskbar on initial generation
- [ ] Layout looks recognizably like "a desktop" to an adult observer at a glance
- [ ] Layout renders correctly at 800x600, 1280x720, 1920x1080, and 2560x1440
- [ ] Desktop rebuild produces a visually different arrangement (different icons,
      different window sizes) while maintaining the same structural layout
- [ ] Previous "random scatter" placement code is fully replaced, not partially active

---

## Design Test

> **If someone asks "should we scatter icons randomly across the whole screen for
> more visual energy?"** -- No. The grid layout serves Pillar 1 (Instant Joy)
> better because it makes the desktop RECOGNIZABLE, which makes the destruction
> MEANINGFUL. You can only enjoy breaking something that looks like the real thing.
> Random scatter looks like abstract art, not a desktop. The "neat grid into
> total chaos" contrast is where the joy lives.

---

## Migration Notes (Current State -> Target State)

The current `desktop-manager.ts` implementation uses:

1. **Icons**: Random scatter with 60px minimum spacing and retry loop (lines 682-694).
   This must be replaced with grid-based placement.
2. **Windows**: Random position in the range `x: 0.18-0.65 * W, y: 0.05-0.55 * H`
   (line 733-734). This must be replaced with cascade placement.
3. **Notifications**: Already stacked vertically in top-right (line 875-876).
   Needs minor adjustment to use percentage-based sizing but the structure is correct.
4. **Taskbar**: Already full-width at bottom (line 602). No change needed.
5. **Banner**: Already top-center (line 526). No change needed.
6. **Icon count**: Currently shows ALL theme icons (all 30 animals, line 631).
   Must be changed to show 8-12 randomly selected from the pool.
7. **Icon rotation**: Currently `(Math.random() - 0.5) * 0.3` on placement (line 701).
   Must be changed to 0 rotation on initial placement.
8. **Config**: `DESKTOP_CONFIG.WINDOWS` currently allows 4-7 windows. Must be
   reduced to 2-3 range.

---

*End of document.*
