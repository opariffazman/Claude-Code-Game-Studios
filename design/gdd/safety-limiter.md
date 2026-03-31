# Safety Limiter

> **Status**: Designed
> **Author**: game-designer + user
> **Last Updated**: 2026-03-28
> **Implements Pillar**: Parent-Friendly (photosensitivity protection, volume safety)

## Overview

The Safety Limiter enforces photosensitivity limits and audio volume caps to protect children ages 1-6. It tracks visual flash frequency using a rolling 1-second window and suppresses or queues effects that exceed the budget. Audio output is hard-capped at a safe volume. This system runs at the highest ticker priority so it can set budgets before any visual or audio system executes in a given frame.

## Player Fantasy

Parents can hand their child the keyboard without worrying about seizure triggers or hearing damage. The chaos stays fun, never dangerous.

## Detailed Design

### Core Rules

1. **Flash Definition**: A "flash" is any display object that transitions between luminance extremes in a single frame. Specifically: any element whose relative luminance changes by more than 0.5 (on a 0-1 scale) between consecutive frames, OR any element that toggles between visible and invisible (`alpha` from 0 to >0.8 or vice versa).
2. **Flash Budget**: Maximum 3 flashes per rolling 1-second window. This is stricter than WCAG 2.1 SC 2.3.1 (which allows 3 per second) because the audience is young children.
3. **Rolling Window Tracking**: Maintain an array of flash timestamps. Each frame, remove entries older than 1000ms. The remaining count is `currentFlashCount`. Available budget = `MAX_FLASHES - currentFlashCount`.
4. **Budget Query API**: Visual systems call `SafetyLimiter.canFlash(): boolean` before triggering a flash effect. If budget is available, it returns `true` and records a flash timestamp. If budget is exhausted, returns `false`.
5. **Flash Queueing**: When `canFlash()` returns `false`, the calling system must not discard the effect. Instead, it queues the effect and retries next frame. The queue is FIFO with a max depth of 10. Entries older than 500ms are dropped (stale effects look wrong).
6. **Prohibited Color Patterns**: Never alternate between saturated red (`hue 0-30, saturation > 0.7`) and any other high-saturation color within consecutive frames. The Safety Limiter exposes `SafetyLimiter.isSafeColor(from: number, to: number): boolean` to validate color transitions.
7. **Smooth Transitions Only**: All visual effects must use eased transitions (minimum 3-frame ramp). No instant on/off for any element larger than 5% of screen area. Smaller elements (particles) are exempt but still count against flash budget.
8. **Audio Volume Cap**: Create a global `GainNode` in the Web Audio API chain. Hard-clamp its `gain.value` to `MAX_VOLUME` (default 0.7). No system may bypass this node.
9. **Volume Envelope**: All sound effects must use a minimum 20ms attack and 50ms release envelope to prevent audio pops/clicks that could startle.
10. **Per-Frame Execution**: The Safety Limiter ticker callback (priority 0) runs before all other systems. It prunes the flash window and resets per-frame state. It does NOT retroactively modify other systems -- it provides budget checks that other systems must call.

### States and Transitions

Stateless system. It maintains rolling counters but has no discrete states.

### Interactions with Other Systems

| System | Data Flow |
|--------|-----------|
| **App Shell** | Registers on ticker at priority 0; receives ticker delta |
| **Particle System** | Calls `canFlash()` before spawning bright particles; calls `isSafeColor()` for color validation |
| **Destruction Effects** | Calls `canFlash()` before screen shake, crack flashes, shatter effects |
| **Audio Engine** | Routes all audio through the global GainNode; uses volume envelope parameters |
| **Chaos Meter** | May query `getFlashBudgetRemaining()` to scale effect intensity |

## Formulas

**Relative Luminance** (simplified for real-time use):
```
L = 0.2126 * R + 0.7152 * G + 0.0722 * B
```
Where R, G, B are linearized (gamma-decoded) values in range [0, 1].

**Flash Detection**:
```
isFlash = |L_current - L_previous| > LUMINANCE_THRESHOLD
```

**Budget**:
```
flashBudgetRemaining = MAX_FLASHES - flashTimestamps.filter(t => now - t < 1000).length
```

## Edge Cases

| Edge Case | Resolution |
|-----------|------------|
| Many small particles all flash simultaneously | Each particle flash counts individually against budget. Systems should batch-check before spawning a burst: `if (budget >= burstCount)`. |
| Flash queue fills up during intense input | Queue capped at 10. Oldest entries beyond 500ms are silently dropped. This prevents a backlog of stale effects. |
| Two systems call `canFlash()` in the same frame | Budget is decremented atomically on each `canFlash()` call. First-come-first-served within a frame, determined by ticker priority. |
| Audio context not yet started (autoplay policy) | GainNode is created but audio context may be suspended. Resume on first user interaction (same gesture as fullscreen). Volume cap applies regardless. |
| User has system volume at max | We cannot control hardware volume. The 0.7 cap ensures our output signal has headroom. |
| Color transition check on transparent elements | Elements with `alpha < 0.1` are excluded from flash and color checks (invisible elements don't trigger seizures). |

## Dependencies

| System | Direction | Reason |
|--------|-----------|--------|
| None | -- | This is a foundation system |

**Depended on by**: Particle System, Audio Engine, Destruction Effects, Chaos Meter.

## Tuning Knobs

| Parameter | Default | Range | Purpose |
|-----------|---------|-------|---------|
| `MAX_FLASHES_PER_SECOND` | 3 | 1-3 | Flash budget per rolling second |
| `LUMINANCE_THRESHOLD` | 0.5 | 0.3-0.8 | Luminance delta that counts as a flash |
| `FLASH_QUEUE_MAX_DEPTH` | 10 | 5-20 | Max queued flash effects |
| `FLASH_QUEUE_MAX_AGE_MS` | 500 | 200-1000 | Max age before queued flash is dropped |
| `MAX_VOLUME` | 0.7 | 0.5-0.85 | Global audio gain cap |
| `AUDIO_ATTACK_MS` | 20 | 10-50 | Minimum sound attack envelope |
| `AUDIO_RELEASE_MS` | 50 | 20-100 | Minimum sound release envelope |
| `MIN_TRANSITION_FRAMES` | 3 | 2-5 | Minimum frames for visual transitions (large elements) |
| `SMALL_ELEMENT_THRESHOLD` | 0.05 | 0.01-0.1 | Screen fraction below which transition rule is relaxed |

## Acceptance Criteria

- [ ] No more than 3 visual flashes occur in any 1-second window, regardless of input intensity
- [ ] `canFlash()` returns false when budget is exhausted and true when budget is available
- [ ] Queued flash effects replay on subsequent frames, not dropped silently (unless stale)
- [ ] No instant on/off transitions for elements larger than 5% of screen area
- [ ] No red-to-contrasting-color alternation in consecutive frames
- [ ] Global audio gain never exceeds 0.7 regardless of how many sounds play
- [ ] All sound effects have audible attack/release envelopes (no pops or clicks)
- [ ] System runs at ticker priority 0 (before all other systems)
- [ ] Performance cost is under 0.5ms per frame (just array operations and comparisons)

## Open Questions

- None. WCAG guidelines and child safety research provide clear thresholds.
