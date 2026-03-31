# Health Dashboard Implementation Plan

**Status**: Proposed
**Feature**: desk-smasher-kyx
**Date**: 2026-03-31

## Overview

Replace the per-window health bars with a single centralized health dashboard:
three stacked vertical progress bars on the right side of the screen showing
aggregate health per element group.

| Bar      | Color | Element Types Aggregated           |
|----------|-------|------------------------------------|
| Animals  | Green | `icon` (theme icons are animals)   |
| Windows  | Red   | `window`                           |
| Alerts   | Blue  | `notification`, `sticky`, `widget` |

Taskbar elements are excluded (they are structural, not smashable targets).

---

## Architecture Decision

### Data Flow: Event-Driven, Not Polling

The dashboard updates **on damage events only**, not every frame.

**Why**: The existing `hitElement` and `hitElementToolAware` methods in `app.ts`
are the only two code paths that decrement `element.health`. Polling every frame
would waste cycles iterating 20-40 elements to compute sums that change only on
user input (a few times per second at most). Event-driven updates cost zero per
frame and fire only when health actually changes.

**Mechanism**: After each health decrement in `hitElement` / `hitElementToolAware`,
call `this.healthDashboard.onDamage(element)`. The dashboard recomputes that
group's aggregate and updates one bar height. On rebuild (new desktop), call
`this.healthDashboard.rebuild(elements)` to reset all bars to full.

### Rendering: NineSliceSprite Bars (Same Assets)

Reuse the existing adventure progress bar SVGs already loaded by `TilePanelBuilder`:
- `progress_green_border.svg` / `progress_green.svg` -- animals
- `progress_red_border.svg` / `progress_red.svg` -- windows
- `progress_transparent.svg` -- background track for all three
- Blue bar: `progress_blue.svg` + `progress_blue_border.svg` (already in
  `WIDGET_PROGRESS_FILLS` pool -- verify these exist or add to preload)

Each bar is a NineSliceSprite with CAP=10 for rounded ends. Fill height shrinks
upward (bottom-aligned) as aggregate health drops -- same technique as the current
per-window bars.

### UI Layer Placement

The dashboard Container is added to the existing `uiLayer` in `app.ts` (step 11),
positioned at the right edge of the screen. This keeps it above the desktop and
particles, consistent with the tool indicator.

---

## File Changes

### 1. NEW: `src/ui/health-dashboard.ts`

~120 lines. Single class `HealthDashboard`.

```
class HealthDashboard {
  private container: Container;
  private groups: Map<string, { elements: DesktopElement[]; fill: NineSliceSprite; border: NineSliceSprite }>;

  constructor(parent: Container, screenW: number, screenH: number)
  rebuild(elements: DesktopElement[]): void       // Reset bars on new desktop
  onDamage(element: DesktopElement): void          // Recompute one group's bar
  resize(screenW: number, screenH: number): void   // Reposition on window resize
  destroy(): void                                  // Cleanup
}
```

**Groups mapping**:
- `'animals'` -- elements where `type === 'icon'`
- `'windows'` -- elements where `type === 'window'`
- `'alerts'`  -- elements where `type === 'notification' || type === 'sticky' || type === 'widget'`

**Bar layout** (right edge, stacked vertically):
- Bar width: 24px
- Bar max height: `(screenH - 80) / 3` (three bars with 10px gaps, 20px margins)
- X position: `screenW - 40`
- Alpha: 0.85 (slightly transparent to not occlude desktop)

**rebuild(elements)**: Partitions elements into groups, computes `maxHealth` sum
per group, sets all fill bars to full height.

**onDamage(element)**: Looks up which group the element belongs to, recomputes
`currentHealth = group.elements.filter(e => !e.destroyed).reduce((s,e) => s + e.health, 0)`,
sets fill height to `maxH * (currentHealth / maxHealth)`.

**Preload**: Uses textures already loaded by `TilePanelBuilder.preload()`. No
additional asset loading needed (verify blue border exists -- if not, fall back
to green border tinted blue via `fill.tint`).

### 2. MODIFY: `src/app.ts`

**Add** (estimated +20 lines, -40 lines net after removals):

- Import `HealthDashboard`
- After `TilePanelBuilder` preload (line ~153), instantiate:
  ```
  this.healthDashboard = new HealthDashboard(uiLayer, screenW, screenH);
  ```
- After `desktop.rebuildWithTheme()` and in the rebuild callback (~line 196):
  ```
  this.healthDashboard.rebuild(this.desktop.elements);
  ```
- In `hitElement()` after `element.health--`:
  ```
  this.healthDashboard.onDamage(element);
  ```
- In `hitElementToolAware()` after `element.health--`:
  ```
  this.healthDashboard.onDamage(element);
  ```
- In `onWindowResize()`:
  ```
  this.healthDashboard.resize(screenW, screenH);
  ```

**Remove**:

- Delete `_updateHealthBar()` method (~35 lines, lines 528-562)
- Delete calls to `this._updateHealthBar(element, container)` in `hitElement()`
  (line 507) and `hitElementToolAware()` (line 461)
- Delete imports of `ADV_PROGRESS_BORDER_GREEN_PATH` and
  `ADV_PROGRESS_BORDER_RED_PATH` from `tile-panel` (line 51) -- these are only
  used by `_updateHealthBar`

### 3. MODIFY: `src/ui/tile-panel.ts` -- `buildWindow()`

**Remove** the health bar construction block (lines 211-274, ~63 lines). This is
the `if (isAdventure)` block that builds the per-window background track, fill,
and border NineSliceSprites labeled `'health-bar-fill'` and `'health-bar-border'`.

The exported constants `ADV_PROGRESS_BORDER_GREEN_PATH` and
`ADV_PROGRESS_BORDER_RED_PATH` can be removed from exports if no other consumer
remains. The preload entries for the progress SVGs must stay -- the dashboard
still uses them.

### 4. NO CHANGE: `src/desktop/desktop-manager.ts`

The dashboard reads `desktop.elements` (already public via the getter) and
receives individual elements via `onDamage()`. No changes to the manager.

**Note**: `recordDamage()` exists on DesktopManager but is never called from
`app.ts`. This is a pre-existing bug -- `destructionProgress` in the FPS debug
line relies on it. The dashboard does not use `recordDamage()` (it computes its
own aggregates). Fixing the `recordDamage` gap is out of scope but flagged.

---

## Effort Estimate

| File                      | Lines Changed | Effort   |
|---------------------------|---------------|----------|
| `src/ui/health-dashboard.ts` (new) | ~120 | 30 min |
| `src/app.ts` (wire + remove) | ~+20 / -40 | 15 min |
| `src/ui/tile-panel.ts` (remove) | -63 | 5 min |
| Manual test + screenshot verify | -- | 10 min |
| **Total** | | **~1 hour** |

---

## Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| Blue progress SVG missing from assets | Medium | Low | Fall back to green bar with `tint = 0x4488FF` |
| Bar overlaps desktop content on small screens | Low | Low | Clamp bar height, reduce width on narrow viewports |
| `onDamage` not called for keyboard path | Low | High | Both `hitElement` and `hitElementToolAware` get the call -- verified these are the only two damage paths |
| Rebuild callback fires before elements exist | Low | Medium | Guard: `if (elements.length === 0) return` |

---

## Pre-Existing Issue Found

`DesktopManager.recordDamage()` is defined (line 205) and used by
`destructionProgress` (line 193), but **never called** from `app.ts`. This means
the `destructionProgress` value shown in the FPS debug line is always 0%.
Consider adding `this.desktop.recordDamage(1)` alongside the dashboard calls in
both hit methods. Out of scope for this feature but should be fixed.

---

## Acceptance Criteria

- [ ] Three vertical progress bars visible on right edge of screen
- [ ] Green bar depletes as icons (animals) are destroyed
- [ ] Red bar depletes as windows are destroyed
- [ ] Blue bar depletes as notifications/stickies/widgets are destroyed
- [ ] Bars reset to full on desktop rebuild
- [ ] Per-window health bars no longer appear
- [ ] No per-frame iteration -- updates fire only on damage events
- [ ] Bars reposition correctly on window resize
- [ ] No new asset loading required (reuses existing SVGs)
