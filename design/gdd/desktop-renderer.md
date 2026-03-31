# Desktop Renderer

> **Status**: Designed
> **Author**: game-designer + user
> **Last Updated**: 2026-03-28
> **Implements Pillar**: Safe Chaos, Instant Joy

## Overview

Generates and renders a fake computer desktop scene using PixiJS Containers and Sprites. The desktop includes a wallpaper background, a taskbar, scattered desktop icons, and fake open windows -- all serving as destruction targets. Each element tracks its own health and destruction state, and the renderer reports overall destruction progress so the Desktop Rebuild Cycle knows when to regenerate a fresh desktop.

## Player Fantasy

The screen looks like a real (but cartoonish) computer desktop -- familiar enough to feel satisfying to destroy, silly enough that it is clearly pretend.

## Detailed Design

### Core Rules

1. The Desktop Renderer creates a single `desktopContainer` (PixiJS `Container`) that holds all desktop elements, added to the main stage.
2. On `generate()`, the renderer builds a fresh desktop with the following elements (all PixiJS `Container` or `Sprite` objects):
   - 1 Wallpaper (full-canvas gradient background)
   - 1 Taskbar (bottom strip, 48px tall, containing 3-4 fake tray items and a clock)
   - 6-10 Desktop Icons (large, 64x64px hit area, randomly positioned on a grid to avoid overlap)
   - 2-3 Windows (fake app windows with title bar, content, and buttons, randomly sized and positioned)
3. Each element is wrapped in a `DesktopElement` data structure:
   ```typescript
   interface DesktopElement {
     container: Container;      // PixiJS display object
     type: 'wallpaper' | 'taskbar' | 'icon' | 'window';
     health: number;            // Current health (starts at maxHealth)
     maxHealth: number;         // 1 for icons, 2 for windows, 3 for taskbar
     destroyed: boolean;        // True when health <= 0
     bounds: Rectangle;         // Hit area for click targeting
   }
   ```
4. Health values by type: icons = 1 hit, windows = 2 hits, taskbar = 3 hits. Wallpaper is indestructible (it is the background).
5. When `damage(element)` is called, decrement `health` by 1. At each health level, apply a visual damage state (cracks, dents). When health reaches 0, mark `destroyed = true` and play the destruction animation (handled by Destruction Effects).
6. `getDestructionProgress()` returns a float 0.0-1.0: count of destroyed elements / total destructible elements.
7. `getElementAt(x, y)` returns the topmost non-destroyed `DesktopElement` at the given coordinates, or `null`.
8. `getRandomAliveElement()` returns a random non-destroyed element (for keyboard input targeting).
9. All elements use flat cartoon art style: solid fills, 2-3px bold outlines, saturated colors from the project palette.

### Desktop Layout

```
+--------------------------------------------------+
|                                                    |
|  [Folder]  [Trash]  [Browser]                     |
|                                                    |
|  [Settings]  [Game]  +--[My Document]----------+  |
|                       | Title Bar         [X]   |  |
|  [Music]   [Photos]  | Lorem ipsum dolor sit   |  |
|                       | amet, consectetur...    |  |
|  [Mail]    [Clock]   +-------------------------+  |
|                                                    |
|            +--[Cool App]------------------+        |
|            | Title Bar              [X]   |        |
|            | [Button]  [Slider]           |        |
|            +------------------------------+        |
|                                                    |
+--[Start]---[icon][icon][icon]-----[12:34 PM]------+
```

Icons are placed on a loose grid (columns of ~120px, rows of ~100px) with +-15px random offset to look casual. Windows are placed in the center-right area with slight random offset, stacked with z-order.

### Visual Damage States

| Health % | Visual Treatment |
|----------|-----------------|
| 100% | Clean, no damage |
| 50% (1 hit on 2-health) | Hairline crack overlay, slight tilt (2-5 degrees) |
| 33% (1-2 hits on 3-health) | Multiple cracks, slight scale wobble |
| 0% (destroyed) | Element handed to Destruction Effects for removal animation |

### States and Transitions

| State | Description | Transitions To |
|-------|-------------|----------------|
| `empty` | No desktop generated | `active` (on `generate()`) |
| `active` | Desktop rendered, elements taking damage | `cleared` (when destruction progress = 1.0) |
| `cleared` | All elements destroyed | `empty` (on `clear()`), then `active` (on new `generate()`) |

### Interactions with Other Systems

| System | Direction | Data |
|--------|-----------|------|
| App Shell | IN | PixiJS stage reference, canvas dimensions |
| Destruction Effects | OUT | Provides target elements via `getElementAt()` and `getRandomAliveElement()` |
| Destruction Effects | IN | Calls `damage(element)` to reduce health |
| Desktop Rebuild Cycle | OUT | Reports `getDestructionProgress()` to trigger rebuild |

## Formulas

No formulas -- this is a structural/behavioral system.

## Edge Cases

| Edge Case | Resolution |
|-----------|------------|
| Click on empty space (no element) | `getElementAt()` returns `null`; Destruction Effects falls back to nearest element via distance check |
| All elements destroyed | `getRandomAliveElement()` returns `null`; signal `cleared` state; Desktop Rebuild Cycle takes over |
| Canvas resize | Recalculate element positions proportionally; wallpaper scales to fill |
| `damage()` called on already-destroyed element | No-op; health cannot go below 0 |
| `generate()` called while desktop is active | Clear existing desktop first, then generate fresh |
| Very small screen (mobile) | Reduce icon count to 4; reduce windows to 1; scale elements up for fat-finger targeting |

## Dependencies

| Dependency | Direction | Required For |
|------------|-----------|--------------|
| App Shell (PixiJS stage) | Upstream | Rendering container and canvas dimensions |
| Destruction Effects | Downstream | Queries elements, applies damage |
| Desktop Rebuild Cycle | Downstream | Monitors destruction progress |

## Tuning Knobs

| Parameter | Default | Range | Notes |
|-----------|---------|-------|-------|
| `ICON_COUNT` | 8 | 4-12 | Number of desktop icons |
| `WINDOW_COUNT` | 2 | 1-4 | Number of fake open windows |
| `ICON_HEALTH` | 1 | 1-3 | Hits to destroy an icon |
| `WINDOW_HEALTH` | 2 | 1-5 | Hits to destroy a window |
| `TASKBAR_HEALTH` | 3 | 1-5 | Hits to destroy the taskbar |
| `ICON_SIZE` | 64 | 48-96 | Icon hit area in pixels |
| `GRID_CELL_WIDTH` | 120 | 80-160 | Horizontal spacing for icon grid |
| `GRID_CELL_HEIGHT` | 100 | 80-140 | Vertical spacing for icon grid |
| `POSITION_JITTER` | 15 | 0-30 | Random offset from grid positions (px) |
| `TASKBAR_HEIGHT` | 48 | 36-64 | Taskbar strip height in pixels |
| `OUTLINE_WIDTH` | 2.5 | 1-4 | Bold outline thickness for cartoon style |

## Acceptance Criteria

- [ ] `generate()` produces a desktop with wallpaper, taskbar, 6-10 icons, and 2-3 windows
- [ ] All elements are visible and correctly positioned within canvas bounds
- [ ] `getElementAt(x, y)` returns the correct topmost element (verified with click coordinates)
- [ ] `getRandomAliveElement()` never returns a destroyed element
- [ ] Icons are destroyed in 1 hit, windows in 2, taskbar in 3
- [ ] Damage states are visually distinct (crack overlays visible at each stage)
- [ ] `getDestructionProgress()` returns 0.0 on fresh desktop and 1.0 when all destructible elements are destroyed
- [ ] Desktop renders correctly at 1280x720 and 1920x1080 resolutions
- [ ] `generate()` on an active desktop clears the old one cleanly (no orphaned sprites)
- [ ] Elements use cartoon art style: solid fills, bold outlines, saturated colors

## Open Questions

- Should the wallpaper be damageable (visual cracks but never destroyed) for extra feedback, or fully inert?
- For MVP, are we drawing elements with PixiJS Graphics (vector) or pre-rendered sprite sheets? Graphics is faster to prototype; sprites look better.
