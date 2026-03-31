# Layout Generation Algorithm

**Status**: Proposed
**Author**: Technical Director
**Date**: 2026-03-31

## Context

The current `DesktopManager` placement logic scatters elements with random
coordinates and a naive retry loop (`attempts < 10`). This produces
unpredictable layouts — icons cluster, windows land on top of icons, and
notifications float in arbitrary positions. A real OS desktop has clear spatial
zones and consistent placement rules.

This document defines the generation algorithm that replaces the ad-hoc
placement with a zone-based layout system.

---

## 1. Zone System

The screen is partitioned into non-overlapping rectangular zones. Each zone owns
one category of elements and defines the bounds within which those elements are
placed.

```typescript
/** A rectangular region of the screen, defined in proportional coordinates. */
interface LayoutZone {
  /** Human-readable name for debugging ("icons", "windows", "notifications"). */
  name: string;
  /** Left edge as a fraction of screenW (0.0 - 1.0). */
  x: number;
  /** Top edge as a fraction of screenH (0.0 - 1.0). */
  y: number;
  /** Width as a fraction of screenW. */
  w: number;
  /** Height as a fraction of screenH. */
  h: number;
  /** Inset from zone edges in px — elements must not touch the zone border. */
  padding: number;
}
```

At runtime, proportional values are resolved to pixel coordinates:

```typescript
function resolveZone(zone: LayoutZone, screenW: number, screenH: number) {
  const px = zone.x * screenW;
  const py = zone.y * screenH;
  const pw = zone.w * screenW;
  const ph = zone.h * screenH;
  return {
    left:   px + zone.padding,
    top:    py + zone.padding,
    right:  px + pw - zone.padding,
    bottom: py + ph - zone.padding,
    width:  pw - zone.padding * 2,
    height: ph - zone.padding * 2,
  };
}
```

### Default Zone Map

```
+------------------+-----------------------------+----------+
|                  |                             |          |
|   ICON_ZONE      |       WINDOW_ZONE           |  NOTIF   |
|   (left strip)   |       (central area)        |  ZONE    |
|   0-18% width    |       20-75% width          |  78-98%  |
|   0-88% height   |       5-85% height          |  2-50%   |
|                  |                             |          |
+------------------+-----------------------------+----------+
|                     TASKBAR (full width, bottom)           |
+------------------------------------------------------------+
```

The taskbar occupies the bottom ~6% of the screen (DESKTOP_CONFIG.TASKBAR_HEIGHT
scaled by viewport). Zones are defined above the taskbar. There is a 2% gap
between the icon zone and window zone to prevent visual crowding.

---

## 2. Icon Grid Algorithm

**Goal**: Place icons in a loose grid that looks hand-arranged but guarantees no
overlap.

### Input

| Parameter | Source |
|-----------|--------|
| Zone bounds | `LAYOUT.ICON_ZONE` resolved to px |
| Icon count | `DESKTOP_CONFIG.ICONS.min` to `.max` (or all sprite frames) |
| Icon size | Sprite natural size * SPRITE_SCALE, or 64x64 fallback |

### Algorithm

1. Compute the usable zone dimensions after padding.
2. Determine cell size: `cellW = max(iconW + gapX, 80)`, `cellH = max(iconH + gapY, 90)`.
3. Compute grid capacity: `cols = floor(zoneW / cellW)`, `rows = floor(zoneH / cellH)`.
4. If `count > cols * rows`, increase count to `cols * rows` (cap to grid capacity).
5. Generate all grid positions `(col, row)` as an array, shuffle it, take `count` entries.
6. For each chosen cell, place the icon at the cell center:
   ```
   x = zoneLeft + col * cellW + cellW / 2 - iconW / 2
   y = zoneTop  + row * cellH + cellH / 2 - iconH / 2
   ```
7. Apply jitter: `x += randInt(-ICON_JITTER, +ICON_JITTER)`, same for y.
8. Apply slight random rotation: `rotation = (Math.random() - 0.5) * 0.3`.

### Overlap guarantee

The grid guarantees no overlap as long as `iconW + 2 * ICON_JITTER < cellW` and
`iconH + 2 * ICON_JITTER < cellH`. The default 5px jitter with 80px cells and
~48px icons satisfies this with wide margin.

### Overflow handling

When using sprite themes that provide 30+ icon frames, the icon zone may not
have enough grid cells. Strategy:

- Primary: fill the icon zone grid.
- Overflow: remaining icons spill into the window zone using the same grid
  algorithm, placed *behind* windows (lower z-order). This matches the real-
  desktop feel of "too many icons on my desktop."

---

## 3. Window Placement Algorithm

**Goal**: Place 2-3 windows in a cascade pattern that mimics a real OS with
several open windows.

### Input

| Parameter | Source |
|-----------|--------|
| Zone bounds | `LAYOUT.WINDOW_ZONE` resolved to px |
| Window count | 2-3 (capped from DESKTOP_CONFIG.WINDOWS) |
| Size range | 12-20% of screenW wide, 15-25% of screenH tall |

### Algorithm

1. Resolve the window zone to pixel bounds.
2. Pick a random base position near the top-left quadrant of the zone:
   ```
   baseX = zoneLeft + zoneW * rand(0.05, 0.25)
   baseY = zoneTop  + zoneH * rand(0.05, 0.20)
   ```
3. For each window `i` (0-indexed):
   ```
   x = baseX + i * WINDOW_CASCADE_X + randInt(-WINDOW_JITTER, +WINDOW_JITTER)
   y = baseY + i * WINDOW_CASCADE_Y + randInt(-WINDOW_JITTER, +WINDOW_JITTER)
   ```
4. Randomize each window's width and height within the configured range.
5. Clamp position so the window stays within the zone bounds:
   ```
   x = clamp(x, zoneLeft, zoneRight - windowW)
   y = clamp(y, zoneTop,  zoneBottom - windowH)
   ```

### Overlap policy

**Partial overlap is intentional** — cascaded windows naturally overlap. This is
a feature, not a bug. The only constraint is:

- **Title bar visibility**: Every window's title bar (top 32px) must not be
  fully occluded by another window. Since cascade offsets each window +30px
  down, the previous window's title bar is always exposed by at least
  `CASCADE_Y - JITTER = 30 - 20 = 10px`. This is sufficient.

### Z-order

Windows are added to the container in cascade order. Later windows draw on top
of earlier windows, matching the visual expectation.

---

## 4. Notification Stack Algorithm

**Goal**: Stack 2-3 notification banners in the top-right corner, like OS toast
notifications.

### Input

| Parameter | Source |
|-----------|--------|
| Zone bounds | `LAYOUT.NOTIF_ZONE` resolved to px |
| Notification count | 2-3 |
| Banner dimensions | Scaled from sprite or 220x50 fallback |

### Algorithm

1. Resolve the notification zone to pixel bounds.
2. Right-align banners: `x = zoneRight - bannerW`.
3. Stack vertically from the zone top:
   ```
   y = zoneTop + i * (bannerH + NOTIF_GAP)
   ```
4. No randomness — deterministic stacking produces the cleanest, most
   recognizable "notification area" feel.

### Overlap

Impossible by construction. Vertical stacking with a fixed gap is fully
deterministic.

---

## 5. Anti-Overlap Validation

After all elements are placed, run a single validation pass. This is a safety
net, not the primary placement strategy — the zone system and grid algorithm
should prevent most issues.

### Rules

| Element A | Element B | Policy |
|-----------|-----------|--------|
| Icon | Icon | REJECT if distance between centers < `min(iconW, iconH) * 0.6` |
| Window | Window | ALLOW overlap (cascade is intentional) |
| Window | Icon | ALLOW (windows are "on top" — this is normal) |
| Notification | Anything | SKIP (deterministic, no validation needed) |
| Taskbar | Anything | REJECT if element overlaps taskbar bounds |

### Repair strategy

If the validation pass finds a rejected overlap (icon-icon or element-taskbar):

1. Nudge the offending element in a random direction by `overlap_distance + 10px`.
2. Clamp to zone bounds.
3. Re-validate once. If still overlapping, accept it — this is a kids' game, a
   minor overlap is not a visible defect.

Maximum repair iterations: 1 per element. No recursive repair — the grid
algorithm should have prevented this in the first place.

---

## 6. Config Values

All layout tuning values live in `DESKTOP_CONFIG.LAYOUT` within `src/config.ts`:

```typescript
LAYOUT: {
  /** Left-side icon column zone. */
  ICON_ZONE:   { x: 0,    y: 0,    w: 0.18, h: 0.88, padding: 10 },
  /** Central area for application windows. */
  WINDOW_ZONE: { x: 0.20, y: 0.05, w: 0.55, h: 0.80, padding: 10 },
  /** Top-right notification toast area. */
  NOTIF_ZONE:  { x: 0.78, y: 0.02, w: 0.20, h: 0.50, padding: 5  },

  /** Number of icon columns in the icon grid. */
  ICON_COLS: 2,
  /** Random position jitter per icon (px). */
  ICON_JITTER: 5,

  /** Horizontal cascade offset between windows (px). */
  WINDOW_CASCADE_X: 40,
  /** Vertical cascade offset between windows (px). */
  WINDOW_CASCADE_Y: 30,
  /** Random position jitter per window (px). */
  WINDOW_JITTER: 20,

  /** Vertical gap between stacked notifications (px). */
  NOTIF_GAP: 10,
}
```

These values are designed for a 1920x1080 baseline and scale proportionally via
the zone system's percentage-based coordinates.

---

## 7. Implementation Plan

### Files to change (in order)

| Step | File | Change |
|------|------|--------|
| 1 | `src/types.ts` | Add `LayoutZone` interface |
| 2 | `src/config.ts` | Add `LAYOUT` block to `DESKTOP_CONFIG` |
| 3 | `src/desktop/layout-resolver.ts` | **New file.** Pure functions: `resolveZone()`, `generateIconGrid()`, `generateWindowCascade()`, `generateNotifStack()`, `validatePlacements()`. No PixiJS imports — geometry only. |
| 4 | `src/desktop/desktop-manager.ts` | Refactor `buildIcons()`, `buildWindows()`, `buildNotifications()` to call layout-resolver for positions, then create visuals at those positions. Remove inline random-scatter logic. |
| 5 | `tests/unit/layout-resolver.test.ts` | Unit tests for grid generation, cascade, stacking, validation, and zone clamping. |

### Step 3 detail: `layout-resolver.ts`

This is the core new module. It is a pure-function geometry library with zero
side effects and zero PixiJS dependencies. It takes zone definitions and counts
as input and returns arrays of `{ x, y, w, h }` placement rectangles.

```typescript
// --- Public API sketch ---

interface Placement {
  x: number;
  y: number;
  w: number;
  h: number;
}

/** Resolve a proportional zone to pixel coordinates. */
function resolveZone(zone: LayoutZone, screenW: number, screenH: number): ResolvedZone;

/** Generate icon grid positions within a resolved zone. */
function generateIconGrid(
  zone: ResolvedZone,
  count: number,
  iconW: number,
  iconH: number,
  jitter: number,
): Placement[];

/** Generate cascaded window positions within a resolved zone. */
function generateWindowCascade(
  zone: ResolvedZone,
  count: number,
  minW: number, maxW: number,
  minH: number, maxH: number,
  cascadeX: number, cascadeY: number,
  jitter: number,
): Placement[];

/** Generate stacked notification positions within a resolved zone. */
function generateNotifStack(
  zone: ResolvedZone,
  count: number,
  bannerW: number,
  bannerH: number,
  gap: number,
): Placement[];

/** Validate and repair overlaps. Returns corrected placements. */
function validatePlacements(
  icons: Placement[],
  windows: Placement[],
  notifications: Placement[],
  taskbarY: number,
): { icons: Placement[]; windows: Placement[]; notifications: Placement[] };
```

### Step 4 detail: `desktop-manager.ts` refactor

The build methods become two-phase:

1. **Geometry phase**: call layout-resolver to get `Placement[]`.
2. **Visual phase**: iterate placements, create PixiJS containers at the
   returned coordinates.

This separates "where things go" from "what things look like," making the layout
testable without a PixiJS renderer.

Before:
```typescript
// buildIcons — current: random scatter with retry loop
let posX = margin + Math.random() * (screenW - margin * 2 - width);
let posY = margin + Math.random() * (screenH - taskbarH - margin * 2 - height);
```

After:
```typescript
// buildIcons — new: layout-resolver provides positions
const zone = resolveZone(DESKTOP_CONFIG.LAYOUT.ICON_ZONE, this.screenW, this.screenH);
const placements = generateIconGrid(zone, iconCount, iconW, iconH, DESKTOP_CONFIG.LAYOUT.ICON_JITTER);
placements.forEach((p, i) => {
  // ... create visual at (p.x, p.y) ...
});
```

---

## Performance Implications

- **Zero per-frame cost.** Layout generation runs once per `buildDesktop()` call
  (on reset/rebuild). There is no per-frame layout computation.
- **Validation pass**: O(n^2) icon-pair distance checks. With n <= 30 icons this
  is 435 comparisons — negligible.
- **Memory**: One `Placement` object per element (~7 fields, ~56 bytes). Total
  for ~40 elements: ~2.2 KB. Negligible.

## Alternatives Considered

| Alternative | Why rejected |
|-------------|-------------|
| Physics-based packing (force-directed) | Overkill for static layout. Adds frame-budget cost and non-deterministic settling time. |
| Fully random with aggressive retry | Current approach. Produces inconsistent results, no spatial coherence, O(n * retries) which degrades with high element counts. |
| Fixed predefined layouts | Too rigid. Every desktop would look identical. The zone + grid + jitter approach provides controlled variety. |
| CSS Grid / HTML layout | Wrong layer. Elements are PixiJS display objects, not DOM nodes. |

## Consequences

**Positive:**
- Desktops look like real desktops with recognizable spatial structure.
- Layout logic is pure functions — fully unit-testable without PixiJS.
- Zone definitions are data-driven config — theme authors can override zones.
- Overflow handling (icons spilling into window zone) supports 30+ icon themes.

**Negative:**
- Slightly less "chaotic" feel than full random scatter. Mitigated by jitter and
  rotation, which preserve the playful scattered look within the structured grid.
- One new file (`layout-resolver.ts`) to maintain. Justified by testability gain.
