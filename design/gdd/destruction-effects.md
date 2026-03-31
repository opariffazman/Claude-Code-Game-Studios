# Destruction Effects

> **Status**: Designed
> **Author**: game-designer + user
> **Last Updated**: 2026-03-28
> **Implements Pillar**: Instant Joy, Safe Chaos, Surprise & Variety

## Overview

The star system of Desk Smasher. Destruction Effects is the orchestrator that receives input events, selects a random visual/audio destruction effect from a pool, and applies it to a desktop element. Each effect is a choreographed combination of element animation, particle emission, and sound playback that completes within 0.5-1.5 seconds. Multiple effects can overlap for maximum chaos when the kid is mashing.

## Player Fantasy

Every single keypress and click causes something dramatic, funny, and different to happen on screen -- the kid never knows what will happen next, and every result is satisfying.

## Detailed Design

### Core Rules

1. Destruction Effects listens for input events from the Input Capture system (keyboard and mouse/touch).
2. On each input event, the system:
   a. **Selects a target**: Mouse/touch -> `desktopRenderer.getElementAt(x, y)` (falls back to nearest alive element if clicking empty space). Keyboard -> `desktopRenderer.getRandomAliveElement()`.
   b. **Selects an effect**: Random from the effect pool (uniform random for MVP).
   c. **Executes the effect**: Runs the effect's animation, particles, and sound simultaneously.
   d. **Applies damage**: Calls `desktopRenderer.damage(element)` at the effect's impact frame.
3. If `getRandomAliveElement()` returns `null` (all destroyed), the input event is still acknowledged with a particle-only effect (confetti burst at input position) so the kid never feels ignored.
4. Effects must complete within their defined duration (0.5-1.5s). They do not block input -- new effects can start while previous effects are still animating.
5. Each effect is defined as an `EffectDefinition` object:
   ```typescript
   interface EffectDefinition {
     id: string;
     name: string;
     duration: number;              // seconds
     animate: (element: DesktopElement, onComplete: () => void) => void;
     particles: { type: EmitterType; delay: number; config?: Partial<EmitterConfig> }[];
     sound: SoundId;
     damageFrame: number;           // seconds into animation when damage is applied
   }
   ```
6. All animations use PixiJS tween-style property changes (scale, position, rotation, alpha) driven by the app ticker, not CSS or external tween libraries.

### Effect Pool (MVP)

#### 1. Crack

- **Duration**: 0.5s
- **Animation**: Spider-web fracture sprite overlaid on element at impact point. Element shakes (+-3px, 4 cycles over 0.3s).
- **Particles**: `debris` x8 fragments from impact point
- **Sound**: `crack`
- **Damage frame**: 0.0s (immediate)

#### 2. Shatter

- **Duration**: 1.0s
- **Animation**: Element is visually sliced into 8-12 triangular pieces (create temporary sprites from element texture). Pieces fly outward with simulated gravity (vx: random +-300, vy: -200 to -400, gravity: 600). Pieces fade out over last 0.3s.
- **Particles**: `sparkle` x15 at element center on impact
- **Sound**: `crash`
- **Damage frame**: 0.1s (just after shatter begins)
- **Note**: This effect always fully destroys the element regardless of remaining health.

#### 3. Bounce

- **Duration**: 1.2s
- **Animation**: Element detaches from desktop, scales to 1.2x, then follows a parabolic arc to the nearest screen edge. On hitting the edge, it bounces back at 60% velocity, then flies off-screen on second bounce. Rotation: 360 degrees per second during flight.
- **Particles**: `smoke` x5 at launch point; `explosion` x20 at first bounce point
- **Sound**: `boing`
- **Damage frame**: 0.0s (immediate -- element is "gone" from desktop)

#### 4. Explode

- **Duration**: 0.6s
- **Animation**: Element rapidly scales to 1.5x over 0.1s, then alpha fades to 0 over 0.1s (flash). Element removed.
- **Particles**: `explosion` x50 radial burst from element center
- **Sound**: `boom`
- **Damage frame**: 0.1s

#### 5. Inflate & Pop

- **Duration**: 0.8s
- **Animation**: Element smoothly scales from 1.0x to 2.0x over 0.5s (ease-in-out). At 2.0x, element snaps to alpha 0. Confetti burst replaces it.
- **Particles**: `confetti` x60 at element center at pop moment (0.5s mark)
- **Sound**: `pop`
- **Damage frame**: 0.5s (at pop)

#### 6. Pixelate

- **Duration**: 1.0s
- **Animation**: Element is replaced by a grid of colored squares (8x8 grid matching element's dominant colors). Over 0.6s, squares scatter outward with random velocities and fade out. Each square rotates independently.
- **Particles**: `sparkle` x10 scattered across element bounds
- **Sound**: `tinkle`
- **Damage frame**: 0.2s (when pixelation begins)

### Position Targeting Detail

| Input Type | Target Selection | Fallback |
|------------|-----------------|----------|
| Mouse click / touch | Element directly under cursor (`getElementAt(x, y)`) | Nearest alive element within 200px; if none, confetti-only at click position |
| Keyboard (any key) | Random alive element (`getRandomAliveElement()`) | Confetti burst at random screen position |

### States and Transitions

Stateless system. Individual effect instances are fire-and-forget with their own internal timeline. The orchestrator has no persistent state beyond the effect pool definition.

### Interactions with Other Systems

| System | Direction | Data |
|--------|-----------|------|
| Input Capture | IN | Input events with type (key/mouse) and position |
| Desktop Renderer | IN/OUT | Queries elements (`getElementAt`, `getRandomAliveElement`); applies damage (`damage()`) |
| Particle System | OUT | Calls `emit(type, position, config)` per effect's particle definition |
| Audio Engine | OUT | Calls `play(soundId)` per effect's sound definition |
| Safety Limiter | IN | Effects with bright particles check flash budget before emitting |

## Formulas

- **Bounce parabolic arc**: `y(t) = y0 + vy0*t + 0.5*g*t^2` where `g = 600 px/s^2`, `vy0 = -400 px/s`
- **Shatter shard velocity**: `vx = cos(sliceAngle) * (200 + random(200))`, `vy = -sin(sliceAngle) * (200 + random(200)) + gravity*t`
- **Inflate scale curve**: `scale = 1.0 + (1.0 * easeInOutQuad(t / 0.5))` for `t` in `[0, 0.5]`
- **easeInOutQuad**: `t < 0.5 ? 2*t*t : 1 - pow(-2*t + 2, 2) / 2`

## Edge Cases

| Edge Case | Resolution |
|-----------|------------|
| No alive elements remain | Fire confetti-only effect at input position; do not skip the event |
| Rapid input (many effects overlapping) | Each effect is independent; they all run concurrently. No throttling -- chaos is the point |
| Effect targets an element that gets destroyed by another overlapping effect | Effect still plays visually but `damage()` is a no-op on destroyed elements |
| Shatter on a 1-health element already at 0 | Shatter's "always destroy" is fine; `damage()` on destroyed element is a no-op |
| Mouse click on empty area far from any element | If no element within 200px, play confetti at click position with `pop` sound |
| Element under animation from another effect | Second effect stacks on top; visual weirdness is acceptable (it reads as extra chaos) |
| Shatter needs element texture for slicing | For MVP, use solid-colored rectangles matching element's fill color; skip real texture slicing |

## Dependencies

| Dependency | Direction | Required For |
|------------|-----------|--------------|
| Input Capture | Upstream | Input events to trigger effects |
| Desktop Renderer | Upstream | Target elements and damage application |
| Particle System | Downstream (consumed) | Visual particle emissions per effect |
| Audio Engine | Downstream (consumed) | Sound playback per effect |
| Safety Limiter | Upstream | Flash budget check for bright effects |
| Desktop Rebuild Cycle | Downstream | Monitors destruction state via Desktop Renderer |

## Tuning Knobs

| Parameter | Default | Range | Notes |
|-----------|---------|-------|-------|
| `EFFECT_POOL` | All 6 effects | Any subset | Which effects are in the random pool |
| `CLICK_FALLBACK_RADIUS` | 200 | 50-500 | Max distance (px) to snap a click to the nearest element |
| `SHATTER_SHARD_COUNT` | 10 | 6-16 | Number of triangular pieces in shatter effect |
| `BOUNCE_GRAVITY` | 600 | 300-1000 | Gravity for bounce arc (px/s^2) |
| `INFLATE_DURATION` | 0.5 | 0.2-1.0 | Seconds for inflate phase before pop |
| `INFLATE_SCALE` | 2.0 | 1.5-3.0 | Max scale before pop |
| `PIXELATE_GRID` | 8 | 4-16 | Grid resolution for pixelate effect (NxN) |
| `EXPLODE_PARTICLE_COUNT` | 50 | 20-100 | Particles in explosion burst |
| `CONFETTI_PARTICLE_COUNT` | 60 | 30-100 | Particles in confetti burst (inflate & pop) |
| Per-effect `duration` | See effect table | 0.3-2.0s | Each effect's total duration |

## Acceptance Criteria

- [ ] Each of the 6 MVP effects (Crack, Shatter, Bounce, Explode, Inflate & Pop, Pixelate) plays correctly with its defined animation, particles, and sound
- [ ] Mouse click applies effect to the clicked element; keyboard applies effect to a random alive element
- [ ] Effects complete within their defined duration (no lingering sprites or sounds)
- [ ] Multiple effects can run simultaneously without errors or visual corruption
- [ ] When all elements are destroyed, input still produces visual+audio feedback (confetti burst)
- [ ] Effect selection is visibly random -- playing 20 inputs should produce at least 4 different effects
- [ ] Damage is applied at the correct frame (not at start or end, but at `damageFrame`)
- [ ] Shatter effect fully destroys its target regardless of remaining health
- [ ] Click on empty space snaps to nearest element or plays standalone confetti if none nearby
- [ ] No effect exceeds 1.5s total duration

## Open Questions

- Should effects have rarity weights for MVP, or is uniform random sufficient until polish phase?
- Should Shatter always fully destroy, or should it respect the normal health system? Current design: always destroy for maximum satisfaction.
- Do we need a brief input cooldown (50ms) to prevent a single long keypress from firing 30 effects, or is that actually desirable behavior?
