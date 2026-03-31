# Health Dashboard HUD

> **Status**: Draft
> **Author**: creative-director
> **Last Updated**: 2026-03-31
> **Implements Pillar**: Instant Joy, Safe Chaos
> **Depends On**: Desktop Renderer, Desktop Manager, Destruction Effects

---

## Overview

A vertical RPG-party-style health dashboard pinned to the right edge of the screen. Three colored progress bars show the aggregate health of all animals (green), windows (red), and notifications (blue). As the child smashes elements, the bars deplete top-to-bottom. Replaces per-window health bars with a single unified display.

## Player Fantasy

"I'm winning! The bars are going down!" -- even a 2-year-old understands a shrinking bar. The dashboard gives destruction a visible score without numbers, text, or fail states. It turns aimless smashing into a visual progress meter that rewards continued play.

For the parent: a quick glance at the dashboard tells them how close the desktop is to full destruction (and therefore a rebuild cycle).

---

## Detailed Design

### Layout

- **Position**: Right edge of screen, vertically centered
- **Anchor**: Top-right corner at `(screenWidth - 12, screenHeight * 0.15)`
- **Total footprint**: 78px wide x 60% of screen height
- **Z-order**: Above all desktop elements, below taskbar, below parent-lock overlay

### Bar Composition (per bar)

Each bar is a two-layer stack:

1. **Track** (background): `progress_transparent.png` stretched to full bar height -- the grey pill shape shows the "empty" state
2. **Fill** (foreground): Colored progress sprite (`progress_green.png`, `progress_red.png`, `progress_blue.png`) overlaid on the track, clipped from the bottom as health depletes

Both sprites are from `assets/sprites/ui/adventure/PNG/Default/`.

### Bar Dimensions

| Property | Value |
|----------|-------|
| Bar width | 20px |
| Bar height | `screenHeight * 0.55` (roughly 55% of viewport) |
| Spacing between bars | 8px |
| Padding (right edge to rightmost bar) | 12px |
| Total dashboard width | `(20 * 3) + (8 * 2) + 12 = 88px` |

### Bar Assignments

| Position (L to R) | Color | Fill Sprite | Track Sprite | Tracks |
|--------------------|-------|-------------|--------------|--------|
| Left | Green | `progress_green.png` | `progress_transparent.png` | All `icon` elements (animals) |
| Center | Red | `progress_red.png` | `progress_transparent.png` | All `window` + `sticky` + `widget` elements |
| Right | Blue | `progress_blue.png` | `progress_transparent.png` | All `notification` elements |

### Why These Groupings

- **Green = Animals (icons)**: The most numerous element type (10-12 per desktop). Green = nature = animals. Direct color association with the forest-green wallpaper world.
- **Red = Structures (windows + stickies + widgets)**: These are the "buildings" of the desktop -- the big smashable targets. Red = damage = satisfying to deplete. Grouping windows and stickies together avoids a 4th bar for a minor element type.
- **Blue = Alerts (notifications)**: The least numerous (1-2 per desktop). Blue = info = notification tone. Matches the existing `progress_blue` used decoratively inside windows.

### Depletion Behavior

- Bars start at 100% fill (full height) when a desktop is generated
- Each bar's fill percentage = `(sum of current health of tracked elements) / (sum of max health of tracked elements)`
- Fill depletes **top-to-bottom** (the colored sprite shrinks downward, revealing the grey track beneath)
- Implementation: set the fill sprite's height to `barHeight * fillPercent`, anchor the fill at the bottom of the track
- When fill reaches 0%, the bar shows only the grey track -- all elements of that type are destroyed
- On desktop rebuild, all bars animate back to 100% with a quick ease-out (200ms)

### Depletion Animation

- On each damage event, the affected bar's fill tweens to its new height over 150ms (ease-out)
- A brief **flash pulse** on the bar when damage occurs: scale the fill sprite to 1.15x width for 80ms, then back to 1.0x -- gives tactile "hit" feedback without being distracting
- No screen shake or particle effects on the dashboard itself -- it should feel like a calm readout, not another destruction target

### Background Panel

- A semi-transparent dark rectangle behind all three bars: `0x000000` at `0.25` alpha
- Rounded corners: 8px radius (use PixiJS Graphics rounded rect)
- Padding: 10px on all sides around the bar group
- This ensures bars are readable against any wallpaper color across all themes

### Icons Above Bars (Optional, Recommended)

Small 16x16 icon above each bar to identify the category:

| Bar | Icon Source | Fallback |
|-----|-----------|----------|
| Green (animals) | First animal sprite from current theme's icon pool, scaled to 16x16 | Green circle (Graphics) |
| Red (structures) | `panel_brown_corners_b.png` scaled to 16x16 | Red circle (Graphics) |
| Blue (alerts) | `banner_modern.png` scaled to 16x16 | Blue circle (Graphics) |

Icons sit 4px above their respective bar tops. They are static and do not animate.

If icons add too much implementation complexity for the first pass, skip them -- the color coding alone is sufficient for the target audience (kids 1-6 do not need labels).

---

## Formulas

### Fill Percentage

```
fillPercent = sumCurrentHealth / sumMaxHealth
```

Where:
- `sumCurrentHealth` = sum of `element.health` for all non-destroyed elements of the tracked types
- `sumMaxHealth` = sum of `element.maxHealth` for all elements of the tracked types (including destroyed ones)

**Example**: Desktop has 10 animal icons (maxHealth 1 each). Player destroys 3.
- `sumMaxHealth = 10`
- `sumCurrentHealth = 7`
- `fillPercent = 7/10 = 0.7` (bar shows 70% full)

### Fill Sprite Height

```
fillHeight = barMaxHeight * fillPercent
fillY = barTopY + barMaxHeight - fillHeight
```

The fill sprite is bottom-anchored: its bottom edge stays fixed at the bar bottom, and it shrinks upward.

### Dashboard Vertical Position

```
dashboardTopY = screenHeight * 0.15
dashboardBottomY = dashboardTopY + barMaxHeight
barMaxHeight = screenHeight * 0.55
```

This centers the dashboard roughly in the vertical middle of the screen, leaving room for notifications at the top and the taskbar at the bottom.

---

## Edge Cases

| Situation | Behavior |
|-----------|----------|
| No elements of a type exist (e.g., 0 notifications on a desktop) | Hide that bar entirely; remaining bars center in the dashboard space |
| All elements destroyed before rebuild triggers | All visible bars show 0%; bars pulse once (gentle glow) to signal "desktop cleared" |
| Desktop rebuild mid-animation | Cancel all bar tweens, snap to 100% fill, then play the refill ease-out |
| Screen resize | Recalculate bar height and position on resize; snap fill to current percentage (no tween) |
| Element spawned mid-session (e.g., new notification appears) | Recalculate maxHealth totals; fill percent adjusts smoothly (may increase slightly) |
| Taskbar elements | Taskbar is NOT tracked by any bar -- it is persistent chrome, not a smashable category |
| Wallpaper | Not tracked -- indestructible background |

---

## Dependencies

| System | Direction | Notes |
|--------|-----------|-------|
| Desktop Manager | Upstream | Dashboard queries element list and health values per type |
| Desktop Renderer | Upstream | Dashboard needs the current element array after each `generate()` |
| Destruction Effects | Upstream | Dashboard listens for damage events to trigger bar animations |
| Rebuild Cycle | Upstream | Dashboard resets to 100% on desktop rebuild |
| Theme Loader | Upstream | Dashboard loads progress bar sprites from adventure pack |
| Tile Panel Builder | Replaced (partially) | Per-window health bars in `tile-panel.ts` are removed; dashboard replaces them |
| App (main) | Integration | `app.ts` health-bar update logic (lines ~459-560) is removed |

---

## Tuning Knobs

| Knob | Default | Range | Affects |
|------|---------|-------|---------|
| `DASHBOARD_WIDTH_PX` | 20 | 14-28 | Bar width in pixels |
| `DASHBOARD_SPACING_PX` | 8 | 4-14 | Gap between bars |
| `DASHBOARD_RIGHT_MARGIN_PX` | 12 | 6-20 | Distance from screen right edge |
| `DASHBOARD_HEIGHT_RATIO` | 0.55 | 0.3-0.7 | Bar height as fraction of screen height |
| `DASHBOARD_TOP_RATIO` | 0.15 | 0.1-0.3 | Top edge as fraction of screen height |
| `DASHBOARD_BG_ALPHA` | 0.25 | 0.0-0.5 | Background panel transparency |
| `DAMAGE_TWEEN_MS` | 150 | 50-300 | Fill depletion animation duration |
| `DAMAGE_PULSE_SCALE` | 1.15 | 1.0-1.3 | Width scale during hit flash |
| `DAMAGE_PULSE_MS` | 80 | 40-150 | Hit flash duration |
| `REFILL_TWEEN_MS` | 200 | 100-400 | Bar refill animation on desktop rebuild |

---

## Removal of Per-Window Health Bars

The centralized dashboard replaces per-window health bars. The following code is removed:

- **`src/ui/tile-panel.ts`**: Remove health-bar-fill and health-bar-border sprite creation (~lines 215-271)
- **`src/app.ts`**: Remove `updateWindowHealthBar()` method and all call sites (~lines 459-560)
- **Window containers**: No longer contain children labeled `health-bar-fill` or `health-bar-border`

**Rationale**: Per-window bars create visual clutter (3-4 tiny bars scattered across the screen). A centralized dashboard is:
1. Easier to read at a glance (one location, consistent layout)
2. More satisfying (seeing the aggregate bar drop gives a stronger sense of progress than individual bars)
3. Cleaner visually (windows look better without a bar stuck on them)
4. Simpler to maintain (one system instead of per-element bar logic)

---

## Acceptance Criteria

- [ ] Three vertical progress bars render on the right edge of the screen
- [ ] Green bar depletes as animal icons are destroyed
- [ ] Red bar depletes as windows, stickies, and widgets are destroyed
- [ ] Blue bar depletes as notifications are destroyed
- [ ] Bars use `progress_green.png`, `progress_red.png`, `progress_blue.png` sprites from adventure pack
- [ ] Grey track (`progress_transparent.png`) is visible behind depleted portions
- [ ] Semi-transparent dark background panel renders behind all three bars
- [ ] Bars animate smoothly on damage (no instant jumps)
- [ ] Bars reset to 100% on desktop rebuild with visible refill animation
- [ ] Per-window health bars are fully removed from tile-panel.ts and app.ts
- [ ] Dashboard is hidden when parent-lock overlay is active
- [ ] Dashboard repositions correctly on screen resize
- [ ] If a bar's element type has 0 elements, that bar is hidden (not shown empty)
- [ ] A 2-year-old can visually associate "smashing things" with "bars going down" within 30 seconds of play (playtest validation)

---

## Pillar Alignment

| Pillar | How This Serves It |
|--------|--------------------|
| **Instant Joy** | Bars give immediate visual feedback for every smash -- the child sees a direct result of their action beyond the local destruction effect |
| **Safe Chaos** | The dashboard is a calm anchor in the chaos -- a steady visual element that does not flash, shake, or overwhelm. It provides structure without pressure |
| **Sensation** (MDA #1) | Colored bars depleting with smooth animation and pulse feedback adds another layer of sensory satisfaction |
| **Discovery** (MDA #4) | Kids discover the bar-to-element relationship organically: "when I hit the animals, the green one goes down!" |

---

*End of document.*
