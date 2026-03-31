# Sprint 13 — 2026-03-31 to 2026-04-02 — Functional Windows + Meaningful Notifications + Hybrid Respawn

## Sprint Goal

Replace decorative windows with functional, data-driven panels that display live
game state. Add milestone-triggered notification banners. Implement a hybrid
respawn system: destroyed elements respawn individually after 3-5 seconds; if ALL
elements are destroyed simultaneously, trigger a celebration and full desktop rebuild.

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

### 3. Hybrid Respawn System (supersedes WindowRespawnManager)

New class: `src/systems/respawn-manager.ts` (`desk-smasher-z3t`)

**Replaces** the window-only `WindowRespawnManager` with a universal system that
handles ALL element types (icons, windows, notifications).

**Individual respawn** — when a single element is destroyed:
1. `RespawnManager.onDestroyed(element)` is called from the hit pipeline
2. Element is added to a respawn queue with a random 3-5 second delay (`setTimeout`)
3. On timer expiry: `DesktopManager.respawnElement(element)` rebuilds ONE element
   - Icons: new random animal, new random position in icon zone, full health
   - Windows: new random position in window zone, new widgets, full health
   - Notifications: new position in notif zone, full health

**Full clear celebration** — when ALL damageable elements are in the respawn queue:
1. Cancel all individual respawn timers
2. Trigger celebration: confetti burst (SpriteParticles) + strong screen shake
3. Short delay (1 second)
4. Full desktop rebuild via `RebuildCycle.triggerCelebration()` (same theme, new positions)
5. Clear the respawn queue

The RespawnManager lives in app.ts alongside other system managers. It does NOT
use a game-loop update — plain `setTimeout` is sufficient for respawn delays.

`RebuildCycle` gets a new public `triggerCelebration()` method (`desk-smasher-hpt`)
that enters the celebrating state on demand. The idle polling (allDestroyed check)
stays disabled — full clear is detected by RespawnManager instead.

`DesktopManager.respawnElement()` (`desk-smasher-hb7`) re-creates a single element
+ container without rebuilding the entire desktop.

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

| ID | Task | Est | Agent | bd |
|----|------|-----|-------|----|
| S13-01 | Tool stat definitions — add TOOL_STATS record to `src/mouse/tools/index.ts` | 15m | engine-programmer | — |
| S13-02 | `RespawnManager` — hybrid individual + full-clear respawn (`src/systems/respawn-manager.ts`) | 45m | engine-programmer | `desk-smasher-z3t` |
| S13-03 | `DesktopManager.respawnElement()` — re-create single element at position | 45m | engine-programmer | `desk-smasher-hb7` |
| S13-16 | `RebuildCycle.triggerCelebration()` — on-demand celebration entry point | 20m | engine-programmer | `desk-smasher-hpt` |

### Layer 1 — Content Renderers (depends on Layer 0)

| ID | Task | Est | Agent | bd |
|----|------|-----|-------|----|
| S13-04 | `CombatLog` class — scrolling colored text entries (last 8-10) | 45m | ui-programmer | — |
| S13-05 | `ToolCard` class — tool icon + name + 3 stat bars | 45m | ui-programmer | — |
| S13-06 | `ToolBag` class — 1x5 hotbar with active highlight | 45m | ui-programmer | — |

### Layer 2 — Integration (depends on Layer 0 + 1)

| ID | Task | Est | Agent | bd |
|----|------|-----|-------|----|
| S13-07 | Wire functional windows into DesktopManager.buildDesktop() | 60m | lead-programmer | — |
| S13-08 | Wire CombatLog updates into hitElement/hitElementToolAware in app.ts | 30m | lead-programmer | — |
| S13-09 | Wire ToolCard + ToolBag updates into RMB tool-switch handler | 20m | lead-programmer | — |
| S13-10 | Wire RespawnManager into destruction pipeline (app.ts) | 30m | lead-programmer | `desk-smasher-3xi` |
| S13-17 | Full clear celebration effect — confetti + screen shake | 30m | technical-artist | `desk-smasher-6sh` |

### Layer 3 — Notifications (independent of windows)

| ID | Task | Est | Agent | bd |
|----|------|-----|-------|----|
| S13-11 | `MilestoneTracker` class — stat tracking + threshold detection | 45m | engine-programmer | — |
| S13-12 | Achievement notification rendering (banner sprite + text + 5s auto-remove) | 30m | ui-programmer | — |
| S13-13 | Wire MilestoneTracker into destruction pipeline + chaos meter | 20m | lead-programmer | — |

### Layer 4 — Polish

| ID | Task | Est | Agent | bd |
|----|------|-----|-------|----|
| S13-14 | Functional windows survive resize (re-render content at new dimensions) | 30m | lead-programmer | — |
| S13-15 | Visual polish pass — colors, spacing, font sizes for all 3 windows | 20m | ui-programmer | — |

## Total Estimate

~10 hours of implementation work across 17 tasks.

## Risk Register

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Respawn creates duplicate elements | Medium | High | RespawnManager tracks pending respawns by element ID; respawnElement checks for existing before creating |
| Combat Log text performance at high chaos | Low | Medium | Cap at 8 entries; reuse Text objects instead of creating new ones |
| Full clear race condition — element respawns just before last element destroyed | Medium | Medium | RespawnManager checks queue size BEFORE scheduling individual respawn; if adding this element fills the queue, go straight to celebration |
| Rapid destroy-respawn-destroy cycles leak timers | Low | Medium | RespawnManager cancels pending timer if element is re-destroyed before respawn fires |
| Notification spam at high chaos | Low | Low | MilestoneTracker fires each achievement only once per session |
| Celebration confetti causes FPS spike | Low | Medium | Cap particle count; use SpriteParticles pooling; SafetyLimiter gates the flash |

## Success Criteria

- [ ] Combat Log shows last 8+ hits with correct color coding
- [ ] Tool Card updates immediately on RMB tool switch
- [ ] Tool Bag highlights current tool with gold border + scale
- [ ] Destroying ANY element (icon, window, notification) triggers individual respawn after 3-5 seconds
- [ ] Respawned element appears at new random position with full health
- [ ] Icons respawn with a new random animal sprite
- [ ] Destroying ALL elements simultaneously triggers celebration (confetti + screen shake)
- [ ] After celebration, full desktop rebuilds with same theme and new positions
- [ ] No duplicate elements after respawn (element ID tracking prevents double-spawn)
- [ ] Achievement notifications appear at milestones and disappear after 5s
- [ ] All elements are fully destructible (participate in destruction pipeline)
- [ ] No FPS regression (maintain 60fps with respawn system active)
