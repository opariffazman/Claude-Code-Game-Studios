# Performance Audit — Desk Smasher

**Build:** feat/desk-smasher (Sprint 4)
**Date:** 2026-03-28
**Analyst:** performance-analyst agent

---

## Summary

**Status: CONCERNS**

The core update loop is lean and well-structured. Both particle systems use
proper object pools with O(1) push/pop and zero runtime allocations in the hot
path. The main concerns are: (1) six `setInterval`-driven effect animations
running outside the ticker, competing with the 16.6 ms frame budget and subject
to timer drift; (2) wallpaper damage marks accumulating without a cap, growing
the display list indefinitely; (3) two per-frame array allocations in
`destructionProgress` and `getRandomAlive`; and (4) the drag-trail `Graphics`
node accumulating geometry for the entire session until a rebuild clears it.
None of these are frame-rate killers at low element counts, but several combine
badly at chaos level 3 with high click throughput.

---

## Frame Time Budget Analysis

**Target:** 16.6 ms (60 fps)

| Category | Estimated Budget | Finding | Status |
|---|---|---|---|
| Gameplay logic (desktop update) | 2 ms | O(n) loop, 30 elements max — OK | OK |
| Particle systems (Graphics + Sprite) | 3 ms | 300 active max, back-to-front splice loop — OK | OK |
| Mouse trail | 0.5 ms | 100 pool, same splice pattern — OK | OK |
| setInterval effects (destruction + damage) | UNBOUNDED | Up to 6+ concurrent timers firing at ~16 ms intervals, outside the ticker | CONCERN |
| Drag trail geometry | 1–5 ms | Grows unbounded; laser tool draws 3 strokes per segment | CONCERN |
| Chaos meter | <0.1 ms | O(n) prune on events array, capped by input rate — OK | OK |
| Wallpaper damage marks | 0.5–2 ms | Unbounded Graphics nodes in display list | CONCERN |
| FPS text update | <0.1 ms | One `Text.text` write per frame — OK | OK |

### Hot Path Detail

**`DesktopManager.update()`** — clean O(n) loop, no allocations, early-exit when
velocity is below `MIN_VELOCITY`. No issues.

**`ParticleManager.update()` + `SpriteParticles.update()`** — both iterate
back-to-front and use `splice(i, 1)` at the tail. This is O(1) per removal.
No heap allocations per call. No issues.

**`MouseTrail.update()`** — same back-to-front splice pattern. Pool is 100
nodes, life is 0.3–0.5 s. No issues.

**`destructionProgress` getter** — called every frame by the FPS text line in
`app.ts`. Internally runs two `Array.reduce()` calls, each allocating a
closure. On 30 elements this is negligible now, but the getter is semantically
a computed property that scans every element. See P2 recommendation.

**`getRandomAlive()`** — called on every keyboard hit. Uses
`this._elements.filter(e => !e.destroyed)`, which allocates a new array every
call. On 30 elements this is a minor allocation, but at rapid keyboard spam
(chaos level 3) it fires frequently. See P1 recommendation.

**`getContainerForElement()`** — uses `findIndex` by `el.id` every time
`hitElement()` is called. Linear scan on every hit. See P1 recommendation.

---

## Memory Analysis

### Particle Pools

| Pool | Max Size | Allocation Strategy | Status |
|---|---|---|---|
| `ParticleManager` Graphics pool | 500 nodes | Pre-allocated, recycled | OK |
| `ParticleManager` active ceiling | 300 | Hard cap enforced in `emit()` | OK |
| `SpriteParticles` Sprite pool | 200 nodes | Pre-allocated, recycled | OK |
| `SpriteParticles` active ceiling | 300 (shared `PARTICLE_CONFIG.MAX_ACTIVE`) | Hard cap enforced | CONCERN |

**Shared ceiling concern:** `PARTICLE_CONFIG.MAX_ACTIVE = 300` is checked
independently by both `ParticleManager` and `SpriteParticles`. They do not
coordinate. Both systems can simultaneously hold up to 300 active particles each
for a combined maximum of 600, while the pool sizes are 500 and 200
respectively. The Graphics pool is large enough (500 >= 300), but the Sprite
pool has only 200 slots while the ceiling allows 300. If `SpriteParticles` ever
hits 200 pool-exhaustion, `emit()` silently drops particles — which is safe but
means the ceiling claim in the comments is misleading. The combined maximum of
600 particles should be validated against the memory budget.

At average sizes (Graphics 3–5 px, Sprites 256 px scaled to 0.1–0.3):
- Graphics particles: ~1 KB each (conservatively) → 500 nodes ~= 0.5 MB
- Sprite objects: ~2 KB each (Sprite metadata, no texture duplication since
  textures are shared) → 200 nodes ~= 0.4 MB
- Total particle memory: ~1 MB, well within the 128 MB ceiling.

### setInterval / setTimeout Leaks

**Critical pattern — destruction-effects.ts:**
`bounce`, `inflatePop`, `pixelate`, `melt`, `gravityFlip`, and `vortex` all
create `setInterval` handles at 16 ms cadence. There is no external registry
of these handles. If a rebuild (`reset()`) occurs while an animation is
mid-flight, the interval continues firing against the now-replaced container.
Since `container.visible = false` is set inside each interval's completion
branch, a dangling interval running against a stale container will:
1. Continue to mutate `container.x/y/scale/rotation` on an orphaned node.
2. Accumulate intervals if elements are destroyed in rapid succession
   (e.g., bomb AoE at chaos 3 can destroy multiple elements simultaneously).
3. Never be cleared if the parent's `destroy({ children: true })` fires before
   the interval condition is met — PixiJS destroys the display object but
   `clearInterval` is never called.

**damage-effects.ts:** same pattern for `damageShake`, `damageWobble`, and
`damageSquish`. The durations are shorter (0.25–0.4 s) so leak window is
smaller, but the pattern is identical.

**`damageFlash`** uses a single `setTimeout(150 ms)` that resets tint.
Shorter exposure than the intervals but shares the same stale-container risk.

**app.ts `resizeTimer`:** debounced `setTimeout` is correctly cleared and
nulled. No issue.

**`ChaosMeter.events` array:** grows via `push` on every input event, pruned
every frame via `splice(0, i)`. The `splice(0, i)` call on a front-removal is
O(n) because it shifts all remaining elements. At high input rates (chaos 3,
~13+ EPS over 2 s = ~26 events in the window) the array is small enough that
this is not measurable. No significant concern.

### Wallpaper Damage Marks (Unbounded Growth)

`DesktopManager.crackWallpaper()` adds a new `Graphics` node to the display
list on every call. There is no cap and no maximum count enforced. Each mark
contributes one draw call to the renderer. The marks are cleared only on
`reset()` / rebuild.

The worst realistic session before a rebuild:
- All elements alive: ~30 elements with health 2–8 each
- Every empty-space click adds 1 mark
- A player who misses elements repeatedly could add hundreds of marks before
  all elements are destroyed

Each `Graphics` mark draws 3–8 primitives (circles, lines). At 100+ marks this
is 300–800 primitive draw calls on the wallpaper layer alone.

### Event Listener Cleanup

| Listener | Location | Removed on destroy? |
|---|---|---|
| `mousemove` for cursor position | `MouseToolManager` | Yes — `_onMouseMove` stored and removed |
| `mousemove` for trail | `MouseTrail` | Yes — `_onMouseMove` stored and removed |
| `resize` | `app.ts` | No — inline arrow, no removal | CONCERN |
| `keydown` combo tracking | `app.ts` | No — inline arrow, no removal | CONCERN |
| `keyup` combo tracking | `app.ts` | No — inline arrow, no removal | CONCERN |

The `resize`, `keydown`, and `keyup` listeners added in `app.ts` are anonymous
arrows with no removal mechanism. For a single-page toy app this is acceptable
(no re-instantiation of `DeskSmasherApp`), but it is worth noting.

---

## Rendering Analysis

### Draw Call Estimate (Clean Desktop, No Damage)

| Layer | Nodes | Estimated Draw Calls |
|---|---|---|
| Wallpaper background | 1 Graphics | 1 |
| Icons (8–14) | Each has ~3 Graphics children (box, label background, text) | ~14–42 |
| Windows (4–7) | Each has ~4 Graphics children (frame, titlebar, content, buttons) | ~16–28 |
| Stickies (3–6) | Each ~2 Graphics | ~6–12 |
| Notifications (2–4) | Each ~3 Graphics | ~6–12 |
| Widgets (1–3) | Each ~4 Graphics | ~4–12 |
| Taskbar | ~5 Graphics | 5 |
| **Desktop subtotal** | | **~52–112 draw calls** |
| Particle containers (2) | 500 + 200 pooled (all invisible when idle) | 2 container nodes, 0 visible |
| Mouse trail | 1 persistent Graphics | 1 |
| Mouse cursor | 1 Graphics | 1 |
| UI layer / FPS text | 2 nodes | 2 |
| Rebuild overlay | 1 Graphics | 1 |
| **Total (idle)** | | **~59–119 draw calls** |

**The desktop at max element count (14 icons, 7 windows, 6 stickies, 4
notifications, 3 widgets) already approaches the 100 draw-call budget at
baseline.** PixiJS 8 batches same-texture Sprites well but each distinct
`Graphics` object is its own draw call unless they share a `GraphicsContext`.
The desktop elements do not share contexts — each element creates its own
`Graphics` chain.

### Wallpaper Damage Marks — Draw Call Growth

Each `crackWallpaper()` call adds 1 Graphics node = 1+ draw calls. After
50 wallpaper hits: +50 draw calls. After 100: +100. This is the most
significant draw-call growth vector in the game.

### Drag Trail — Geometry Growth

`MouseToolManager._trail` is a single persistent `Graphics` object. Every
`_drawTrailSegment()` call appends geometry to it without clearing. Over a long
drag, the `Graphics` internal geometry buffer grows continuously. PixiJS must
re-upload this buffer on every frame. For the laser tool (3 strokes per
segment) and magnet tool (multiple `moveTo/lineTo` per step), geometry growth
is fastest.

There is no frame-budget cost per draw call (it remains 1 draw call for the
trail), but the CPU-side geometry serialisation cost grows with path length.
After 10 seconds of continuous dragging at 60 fps, the trail geometry could
contain thousands of segments.

### cacheAsTexture Opportunities

Static elements (icons, windows, stickies) are built once and never redrawn
until destroyed. Each is a Container of Graphics children, which forces PixiJS
to traverse and draw each Graphics node separately every frame. Enabling
`cacheAsTexture` on these containers would collapse each multi-part element to
a single texture upload (1 draw call), reducing the per-element cost from
3–4 draw calls to 1 after the first frame.

This is a significant untapped optimisation.

---

## Worst-Case Scenario Analysis

### Chaos Level 3 with 30 Elements

**Inputs per second:** 13+ EPS
**Effects triggered per second:** 13+ `hitElement()` calls
**Concurrent `setInterval` animations:** up to 6–8 simultaneously active
(damage effects: 0.25–0.4 s duration × 13 EPS = 3–5 concurrent; destruction
effects: 0.3–0.7 s duration × 2–3 destructions/s = 1–3 concurrent)

**Particle burst per hit:** 5–15 Graphics particles + 3 Sprite particles
**At 13 EPS:** ~65–195 Graphics particles emitted/s + ~39 Sprite particles/s
**Combined with 0.8 s lifetime:** steady-state active count approaches 300
Graphics + 100 Sprite simultaneously, saturating the Graphics pool ceiling.

When the ceiling is hit, `emit()` silently drops additional particles. This is
safe but means the heaviest destruction moments produce fewer particles than
intended — the most exciting visual moment is also the most visually
downgraded.

### Maximum Particle Count

| System | Pool Size | Active Ceiling | Effective Max |
|---|---|---|---|
| `ParticleManager` (Graphics) | 500 | 300 | 300 |
| `SpriteParticles` | 200 | 300 (shared constant) | 200 (pool-limited) |
| `MouseTrail` | 100 | 100 (pool-limited) | 100 |
| **Combined maximum** | | | **600 active** |

600 visible particles simultaneously plus the desktop elements is still
well within GPU budget for a 2D scene at this resolution.

### Wallpaper Damage Marks Before Rebuild

No maximum is enforced. Theoretical maximum before rebuild:
- Worst case: player clicks empty space for the entire session (~800 ms
  rebuild delay, 13 EPS) = ~10 marks per rebuild cycle
- Pathological case: player never hits elements, only misses = hundreds of
  marks before the session ends manually (parent unlock)

At 200+ marks, each with 5–8 Graphics primitives, the wallpaper layer would
contribute 1,000–1,600 draw-call-equivalent operations to the scene graph
traversal, well exceeding the 100 draw-call budget on its own.

---

## Optimization Recommendations

### P0 — Must Fix (correctness / safety risk)

**P0-1: Replace setInterval animations with ticker-driven animations**

Files: `/home/debian/repo/Claude-Code-Game-Studios/src/effects/destruction-effects.ts`,
`/home/debian/repo/Claude-Code-Game-Studios/src/effects/damage-effects.ts`

All 9 `setInterval` / `setTimeout` uses in effect functions (marked with
`// TODO: convert to ticker-driven` in the source) must be migrated to a
ticker-registered callback or a simple animation queue. The current
implementation:
- Fires at `~16 ms` intervals independently of the PixiJS ticker, causing
  double-update jitter on some frames and skipped updates on others.
- Leaks intervals if `reset()` is called while effects are mid-flight, leaving
  stale closures mutating destroyed containers.
- Cannot be paused or cancelled during the rebuild transition (input is blocked
  but the intervals keep running).

Recommended approach: maintain an array of `ActiveAnimation` objects in a
shared `AnimationQueue` updated from the ticker. Each animation is a function
`(dt: number) => boolean` (return `true` to keep, `false` to remove). The
`destroy()` method clears the queue.

**Estimated impact:** eliminates timer drift, stale-container mutations, and
potential memory leak under heavy destruction.

---

### P1 — Should Fix (performance / correctness)

**P1-1: Cap wallpaper damage marks**

File: `/home/debian/repo/Claude-Code-Game-Studios/src/desktop/desktop-manager.ts`

Add a constant `MAX_WALLPAPER_MARKS` (recommended: 40) and track the count of
active marks. When the cap is reached, remove the oldest mark
(`this.container.removeChildAt(1)` since marks are inserted at index 1) before
adding the new one. This keeps the display list bounded across arbitrarily
long sessions.

**Estimated impact:** caps draw-call growth at +40 beyond the desktop baseline,
keeping total draw calls within the 100 target under sustained empty-space clicking.

**P1-2: Eliminate per-frame array allocations in `getRandomAlive` and
`destructionProgress`**

File: `/home/debian/repo/Claude-Code-Game-Studios/src/desktop/desktop-manager.ts`

`getRandomAlive()` calls `this._elements.filter(...)` on every keyboard hit
(up to 13/s at chaos 3). Replace with a direct random walk over the elements
array:

```typescript
getRandomAlive(): DesktopElement | null {
  // Reservoir sample: one pass, no allocation.
  let chosen: DesktopElement | null = null;
  let count = 0;
  for (const el of this._elements) {
    if (!el.destroyed) {
      count++;
      if (Math.random() < 1 / count) chosen = el;
    }
  }
  return chosen;
}
```

`destructionProgress` uses two `reduce()` calls. Cache the running `totalHealth`
and `currentHealth` as class fields, updated on element creation and on each
`hitElement()` call. The getter then becomes O(1).

**Estimated impact:** eliminates 13–26 small heap allocations per second at
max chaos, reducing GC micro-pauses.

**P1-3: Replace `getContainerForElement` linear scan with a Map**

File: `/home/debian/repo/Claude-Code-Game-Studios/src/desktop/desktop-manager.ts`

`getContainerForElement()` does `findIndex` by `el.id` on every call.
`hitElement()` in `app.ts` calls it on every hit. Replace the parallel arrays
(`_elements[]`, `containers[]`) with a single `Map<string, { el: DesktopElement, container: Container }>`:

```typescript
private readonly _elementMap = new Map<string, { el: DesktopElement; container: Container }>();
```

This makes `getContainerForElement` O(1) and eliminates the fragile
parallel-array synchronisation requirement.

**Estimated impact:** O(n) to O(1) lookup on the hottest path in the game loop.

**P1-4: Clear the drag trail periodically or limit its geometry size**

File: `/home/debian/repo/Claude-Code-Game-Studios/src/mouse/mouse-tool-manager.ts`

`clearTrails()` is only called on desktop rebuild. During a single play session
a sustained drag accumulates unbounded geometry in `_trail`. Add a segment
count limit (e.g. `MAX_TRAIL_SEGMENTS = 200`) and call `this._trail.clear()`
+ redraw the most recent N segments when the limit is exceeded, or fade and
clear old segments on a rolling basis.

**Estimated impact:** bounds the per-frame GPU geometry upload cost for the
trail buffer, which grows proportionally to drag distance during a session.

---

### P2 — Nice to Have (quality of life)

**P2-1: Apply `cacheAsTexture` to static desktop element containers**

File: `/home/debian/repo/Claude-Code-Game-Studios/src/desktop/element-factory.ts`

Desktop elements (icons, windows, stickies, widgets) are assembled from multiple
`Graphics` children and never redrawn until destroyed. Setting
`container.cacheAsTexture = true` on each element container after creation
would collapse the multi-Graphics render cost to a single texture sample per
element per frame. The cache is automatically invalidated if any child changes.

Mark caches as dirty explicitly on `applyProgressiveDamage()` (alpha/scale
changes) — PixiJS 8 may handle this automatically via `visibleChanged`, but
verify against the v8.17.0 changelog.

**Estimated impact:** reduces desktop draw calls from ~52–112 to ~25–35 at
max element count.

**P2-2: Add a combined particle count guard between both particle systems**

File: `/home/debian/repo/Claude-Code-Game-Studios/src/app.ts`

`PARTICLE_CONFIG.MAX_ACTIVE = 300` is checked independently per system. Pass a
shared `activeCount` function or reference to both systems so the combined cap
is enforced, preventing the theoretical 600-particle worst case. Alternatively,
lower `MAX_ACTIVE` to 150 per system to keep the total at 300.

**P2-3: Convert `destructionProgress` reads in the game loop to a dirty flag**

File: `/home/debian/repo/Claude-Code-Game-Studios/src/app.ts`

`fpsText.text` is rebuilt every tick, which includes calling
`this.desktop.destructionProgress`. The FPS HUD does not need sub-frame
accuracy. Update it at 10 Hz (every 6 ticks at 60 fps) using a frame counter.
This halves the number of `Text` object writes and reduces the
`destructionProgress` computation frequency from 60/s to 10/s.

**P2-4: Pre-compute `GraphicsContext` for cursor shapes in `MouseToolManager`**

File: `/home/debian/repo/Claude-Code-Game-Studios/src/mouse/mouse-tool-manager.ts`

`_drawCursor()` calls `this._cursor.clear()` and the active tool's
`drawCursor()` method on every `cycleTool()` and on construction. If
`drawCursor` rebuilds complex geometry this is fine at low frequency (only on
RMB). No issue in the hot path — flagging for completeness.

---

## Metrics to Watch

The following values should be logged to the session and checked on every
merge to main:

| Metric | Current Budget | Current Actual | Threshold |
|---|---|---|---|
| Total draw calls (idle desktop) | < 100 | ~59–119 | Exceeds at max elements |
| Active particles (peak) | < 300 combined | Up to 600 (both systems) | Misaligned |
| Wallpaper marks (peak per session) | No cap defined | Unbounded | Must add cap |
| Concurrent `setInterval` effect timers | 0 | Up to 8 | Must fix (P0) |
| `getContainerForElement` calls per second | O(1) target | O(n) × hits/s | Must fix (P1) |

---

*Report generated by performance-analyst agent. Escalate budget changes to
technical-director. Assign P0-1 to engine-programmer for ticker migration.
Assign P1-1 through P1-3 to engine-programmer. Assign P2-1 to
technical-artist for cacheAsTexture validation.*
