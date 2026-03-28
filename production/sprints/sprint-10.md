# Sprint 10 — 2026-03-29 — Critical Bug Fix

## Sprint Goal
Fix the 3 P0/P1 bugs breaking the core click + particle pipeline so the game is playable again.

## Capacity
- Total days: 1 (hotfix sprint)
- Buffer: 0 (all bugs are blocking)
- Available: 1 day

## Tasks

### Must Have (Critical Path)

| ID | Task | Agent/Owner | Est. | Dependencies | Acceptance Criteria |
|----|------|-------------|------|-------------|-------------------|
| S10-01 | Fix LMB click tool cycling (`desk-smasher-by3`) | Gameplay Programmer | 0.25d | None | LMB click uses current tool without cycling. RMB is the only way to cycle. |
| S10-02 | Fix LMB click effects dying (`desk-smasher-w8u`) | Gameplay Programmer | 0.25d | S10-01 | LMB clicks produce destruction effects consistently, no matter how many clicks. |
| S10-03 | Fix missing particle effects (`desk-smasher-9av`) | Engine Programmer | 0.25d | None | Keyboard hits + mouse clicks produce visible colored particle bursts on every hit. |
| S10-04 | Integration verification | QA Tester (Playwright) | 0.25d | S10-01,02,03 | Automated Playwright test confirms: click→effect, drag→trail, keys→particles, all sustained over 30+ interactions. |

### Root Cause Analysis

All 3 bugs likely share a root cause in `src/app.ts`:
- Sprint 9 removed `cycleTool()` from the click path but may have also broken the click→hitElement pipeline
- The `hitElement()` method calls `destructionRegistry.getRandom()` which may be empty or failing
- Particle emission in `hitElement()` depends on `getContainerForElement()` which was flagged as O(n) and may have been refactored incorrectly

**Approach**: Read `src/app.ts` end-to-end, trace the click pipeline from `onInput` → `handleMouseHit` → `hitElement` → effects + particles. Identify where the chain breaks.

## Definition of Done
- [ ] LMB click applies current tool effect without cycling
- [ ] LMB clicks work indefinitely (no exhaustion)
- [ ] Every keyboard hit produces visible particles + sound
- [ ] Every mouse click produces visible destruction + particles + sound
- [ ] All 3 beads issues closed
- [ ] 53 unit tests still passing
- [ ] TypeScript clean
