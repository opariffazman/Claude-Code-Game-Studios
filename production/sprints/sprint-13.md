# Sprint 13 — 2026-03-31 to 2026-04-02 — Functional Windows + Meaningful Notifications

## Sprint Goal

Replace decorative windows with functional, data-driven panels that display live
game state. Add milestone-triggered notification banners. All functional windows
are destructible and respawn after 3 seconds with updated content.

## Architecture Decisions

### 1. Functional Windows are DesktopElements (type: 'window')

Functional windows live inside the DesktopManager element array as regular
`DesktopElement` entries with `type: 'window'`. This means they automatically
participate in:
- Hit detection (`getElementAt`)
- Destruction pipeline (`hitElement` / `hitElementToolAware`)
- Impulse physics (knockback on hit)
- Health dashboard tracking
- Rebuild cycle destruction progress

They are NOT a separate UI layer. They are smashable desktop content that happens
to show live data.

**Rationale**: Keeping them as DesktopElements means zero changes to the destruction
pipeline. The only new behavior is content rendering and respawn — both handled by
new classes that the windows delegate to.

### 2. Content Renderers — new classes in `src/ui/`

Each functional window type gets a dedicated content renderer class:

| Class | File | Responsibility |
|-------|------|----------------|
| `CombatLog` | `src/ui/combat-log.ts` | Renders last 8-10 hit entries as colored text rows |
| `ToolCard` | `src/ui/tool-card.ts` | Renders current tool icon + name + 3 stat bars |
| `ToolBag` | `src/ui/tool-bag.ts` | Renders 1x5 tool hotbar with highlight on active |

Each class exposes:
- `build(container, width, height)` — populate a PixiJS Container with content
- `update(...)` — refresh content (new log entry, tool switch, etc.)
- `destroy()` — clean up display objects

These renderers do NOT own the DesktopElement or its lifecycle. They are called
by DesktopManager (or a coordinator in app.ts) to populate the window container's
content area.

### 3. Respawn via WindowRespawnManager

New class: `src/systems/window-respawn.ts`

When a functional window is destroyed:
1. `WindowRespawnManager.onDestroyed(elementId, windowType)` is called
2. It starts a 3-second timer (`setTimeout`)
3. On expiry, it calls back to DesktopManager to rebuild that specific window
   at the same position with fresh content

The respawn manager lives in app.ts alongside other system managers. It does NOT
use a game-loop update — plain `setTimeout` is sufficient for a fixed 3s delay.

DesktopManager needs a new method: `respawnElement(id, type, x, y, w, h)` that
re-creates a single element + container without rebuilding the entire desktop.

### 4. Event-Driven Hit Logging (for Combat Log)

Instead of the Combat Log polling state, app.ts pushes hit events to it:

```typescript
// In hitElement / hitElementToolAware:
this.combatLog.addEntry({
  tool: toolName,      // 'hammer', 'laser', etc.
  target: element.label, // 'Pig', 'Window 3', etc.
  destroyed: element.health <= 0,
  isWallpaper: false,
});
```

This is direct function calls, not a pub/sub event system. The codebase has no
event bus and adding one for 3 call sites is over-engineering.

### 5. Achievement Notifications — Milestone Tracker

New class: `src/systems/milestone-tracker.ts`

Tracks cumulative stats and fires notifications at thresholds:
- Total elements destroyed (10, 25, 50, 100)
- First window destroyed
- Chaos level reached (1, 2, 3)
- All icons destroyed in one session
- Tool switches (10 switches = "Tool Master")

Notifications use the existing `ADV_BANNER_MODERN` sprite as background,
rendered as a temporary DesktopElement (type: 'notification') that auto-removes
after 5 seconds OR when smashed.

### 6. Tool Stat Definitions

Tools need stat metadata for the Tool Card display. Add to each tool file:

```typescript
export const TOOL_STATS = {
  hammer: { damage: 2, aoe: 0, type: 'Impact' },
  laser:  { damage: 3, aoe: 0, type: 'Beam' },
  bomb:   { damage: 1, aoe: 3, type: 'Explosive' },
  freeze: { damage: 1, aoe: 0, type: 'Frost' },
  magnet: { damage: 1, aoe: 2, type: 'Force' },
};
```

Damage = base 1 + EXTRA_DAMAGE. AoE = qualitative 0-3 scale. Type = flavor text.

## Task Breakdown

### Layer 0 — Foundation (no dependencies)

| ID | Task | Est | Agent |
|----|------|-----|-------|
| S13-01 | Tool stat definitions — add TOOL_STATS record to `src/mouse/tools/index.ts` | 15m | engine-programmer |
| S13-02 | `WindowRespawnManager` — timer-based respawn with position memory | 30m | engine-programmer |
| S13-03 | `DesktopManager.respawnElement()` — re-create single element at position | 45m | engine-programmer |

### Layer 1 — Content Renderers (depends on Layer 0)

| ID | Task | Est | Agent |
|----|------|-----|-------|
| S13-04 | `CombatLog` class — scrolling colored text entries (last 8-10) | 45m | ui-programmer |
| S13-05 | `ToolCard` class — tool icon + name + 3 stat bars | 45m | ui-programmer |
| S13-06 | `ToolBag` class — 1x5 hotbar with active highlight | 45m | ui-programmer |

### Layer 2 — Integration (depends on Layer 0 + 1)

| ID | Task | Est | Agent |
|----|------|-----|-------|
| S13-07 | Wire functional windows into DesktopManager.buildDesktop() | 60m | lead-programmer |
| S13-08 | Wire CombatLog updates into hitElement/hitElementToolAware in app.ts | 30m | lead-programmer |
| S13-09 | Wire ToolCard + ToolBag updates into RMB tool-switch handler | 20m | lead-programmer |
| S13-10 | Wire WindowRespawnManager into destruction pipeline | 30m | lead-programmer |

### Layer 3 — Notifications (independent of windows)

| ID | Task | Est | Agent |
|----|------|-----|-------|
| S13-11 | `MilestoneTracker` class — stat tracking + threshold detection | 45m | engine-programmer |
| S13-12 | Achievement notification rendering (banner sprite + text + 5s auto-remove) | 30m | ui-programmer |
| S13-13 | Wire MilestoneTracker into destruction pipeline + chaos meter | 20m | lead-programmer |

### Layer 4 — Polish

| ID | Task | Est | Agent |
|----|------|-----|-------|
| S13-14 | Functional windows survive resize (re-render content at new dimensions) | 30m | lead-programmer |
| S13-15 | Visual polish pass — colors, spacing, font sizes for all 3 windows | 20m | ui-programmer |

## Total Estimate

~8.5 hours of implementation work across 15 tasks.

## Risk Register

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Respawn creates duplicate elements | Medium | High | Use element ID tracking; respawnElement checks for existing before creating |
| Combat Log text performance at high chaos | Low | Medium | Cap at 8 entries; reuse Text objects instead of creating new ones |
| Functional windows block destruction progress | Medium | Medium | Exclude respawnable windows from allDestroyed check (or count destroyed-once) |
| Notification spam at high chaos | Low | Low | MilestoneTracker fires each achievement only once per session |

## Success Criteria

- [ ] Combat Log shows last 8+ hits with correct color coding
- [ ] Tool Card updates immediately on RMB tool switch
- [ ] Tool Bag highlights current tool with gold border + scale
- [ ] Destroying a functional window triggers respawn after ~3 seconds
- [ ] Respawned window appears at same position with updated content
- [ ] Achievement notifications appear at milestones and disappear after 5s
- [ ] All functional windows are fully destructible (participate in destruction pipeline)
- [ ] No FPS regression (maintain 60fps with all 3 windows active)
