# Particle System

> **Status**: Designed
> **Author**: game-designer + user
> **Last Updated**: 2026-03-28
> **Implements Pillar**: Safe Chaos, Surprise & Variety

## Overview

A reusable VFX particle engine built on PixiJS 8's `ParticleContainer` that provides pooled, configurable emitters for all visual destruction effects in Desk Smasher. The system exposes a simple `emit(type, position, config?)` API that other systems call to spawn explosions, confetti, debris, sparkles, and smoke. Particles are object-pooled to avoid GC pressure, and all bright bursts are gated through the Safety Limiter's flash budget.

## Player Fantasy

Every keypress and click produces a satisfying eruption of color and motion -- the screen feels alive and reactive, like smashing a pinata.

## Detailed Design

### Core Rules

1. All particles are managed by a single `ParticleManager` instance that owns one `ParticleContainer` attached to the PixiJS stage.
2. Particles are pre-allocated in a pool of 2,000 objects at init. If the pool is exhausted, the oldest active particles are recycled (no `new` allocations at runtime).
3. Each particle has these properties: `x`, `y`, `vx`, `vy`, `ax`, `ay` (gravity), `scale`, `scaleDecay`, `alpha`, `alphaDecay`, `tint`, `lifetime`, `age`, `rotation`, `rotationSpeed`, `textureIndex`.
4. The update loop runs once per frame via PixiJS's `Ticker`. Each tick: `age += dt`, apply velocity and acceleration, apply decay, kill particles where `age >= lifetime` (return to pool).
5. Emitter configurations are static objects defining a particle "recipe." The `emit()` call spawns N particles using the recipe, with randomization within defined ranges.
6. Before emitting any effect tagged as `bright` (explosions, sparkles), call `safetyLimiter.requestFlashBudget(intensity)`. If denied, fall back to a muted color variant.
7. Color palette is limited to saturated primaries: `0x3B82F6` (blue), `0xEF4444` (red), `0xEC4899` (pink), `0xA855F7` (purple), `0x22C55E` (green), `0xF97316` (orange), `0xEAB308` (yellow), `0xFFFFFF` (white for sparkle only).

### Emitter Configurations

| Emitter | Sprite | Count | Size | Velocity | Gravity | Lifetime | Bright? |
|---------|--------|-------|------|----------|---------|----------|---------|
| `explosion` | circle (4x4) | 30-50 | 2-8px | 200-500 radial | 100 down | 0.4-0.8s | Yes |
| `confetti` | rect (6x3) | 40-80 | 4-8px | 100-300 radial | 150 down | 0.8-1.5s | No |
| `debris` | rect (8x4) | 8-16 | 6-12px | 150-400 radial | 300 down | 0.5-1.0s | No |
| `sparkle` | diamond (3x3) | 10-20 | 2-5px | 50-150 radial | -20 (float up) | 0.3-0.6s | Yes |
| `smoke` | circle (8x8) | 5-10 | 10-20px | 20-60 upward | -10 (rise) | 0.6-1.2s | No |

### API

```typescript
interface ParticleManager {
  init(stage: Container): void;
  emit(type: EmitterType, x: number, y: number, overrides?: Partial<EmitterConfig>): void;
  update(dt: number): void;
  clear(): void;
  readonly activeCount: number;
}

type EmitterType = 'explosion' | 'confetti' | 'debris' | 'sparkle' | 'smoke';
```

### States and Transitions

Stateless system. Individual particles have a lifecycle (spawned -> alive -> dead/recycled) but the manager itself has no state machine.

### Interactions with Other Systems

| System | Direction | Data |
|--------|-----------|------|
| App Shell | IN | PixiJS stage reference, ticker for update loop |
| Safety Limiter | IN | `requestFlashBudget(intensity): boolean` |
| Destruction Effects | IN | Calls `emit()` with type, position, and optional config overrides |

## Formulas

- **Particle position**: `x += vx * dt; y += vy * dt; vx += ax * dt; vy += ay * dt`
- **Alpha fade**: `alpha = max(0, 1 - (age / lifetime) * alphaDecay)` where `alphaDecay` defaults to 1.0 (linear fade)
- **Scale shrink**: `scale = initialScale * max(0, 1 - (age / lifetime) * scaleDecay)` where `scaleDecay` defaults to 0.8
- **Radial velocity**: For a given `speed` and random angle `theta`: `vx = cos(theta) * speed; vy = sin(theta) * speed`

## Edge Cases

| Edge Case | Resolution |
|-----------|------------|
| Pool exhausted (2,000 particles active) | Recycle oldest particles first; never allocate new objects |
| Safety Limiter denies flash budget | Emit with muted colors (reduce saturation by 50%) and skip sparkle sub-emitter |
| `emit()` called before `init()` | No-op with console warning in dev mode |
| Tab hidden / `requestAnimationFrame` paused | PixiJS Ticker handles this; particles resume where they left off (no delta-time explosion) |
| Extremely high emit rate (kid mashing) | Natural backpressure from pool size; max 2,000 particles at once regardless of input rate |
| Canvas resize during active particles | Particles use world coordinates; no adjustment needed |

## Dependencies

| Dependency | Direction | Required For |
|------------|-----------|--------------|
| App Shell (PixiJS stage) | Upstream | Rendering container and ticker |
| Safety Limiter | Upstream | Flash budget check before bright emissions |
| Destruction Effects | Downstream | Consumes particle emission API |

## Tuning Knobs

| Parameter | Default | Range | Notes |
|-----------|---------|-------|-------|
| `POOL_SIZE` | 2000 | 500-5000 | Pre-allocated particle count |
| `MAX_ACTIVE` | 2000 | 500-5000 | Hard cap on simultaneous particles |
| `GRAVITY_DEFAULT` | 100 | 0-500 | Default downward acceleration (px/s^2) |
| `ALPHA_DECAY_DEFAULT` | 1.0 | 0.5-2.0 | How fast particles fade (1.0 = linear over lifetime) |
| `SCALE_DECAY_DEFAULT` | 0.8 | 0.0-2.0 | How fast particles shrink |
| `COLOR_PALETTE` | [see Core Rules] | Any hex array | Available tint colors |
| Per-emitter: `count`, `size`, `velocity`, `gravity`, `lifetime` | See table | See table | Each emitter is independently tunable |

## Acceptance Criteria

- [ ] `ParticleManager.emit('explosion', x, y)` spawns 30-50 circle particles that radiate outward and fade over ~0.5s
- [ ] `ParticleManager.emit('confetti', x, y)` spawns colorful rectangles that drift downward
- [ ] All 5 emitter types (`explosion`, `confetti`, `debris`, `sparkle`, `smoke`) produce visually distinct effects
- [ ] Active particle count never exceeds `POOL_SIZE`; no runtime allocations after init
- [ ] Sustains 500+ simultaneous particles at 60fps on a mid-range laptop (test: Intel i5, integrated graphics)
- [ ] When Safety Limiter denies flash budget, bright emitters still fire but with desaturated colors
- [ ] `clear()` immediately removes all active particles and returns them to pool
- [ ] Colors are exclusively from the defined saturated primary palette

## Open Questions

- Should smoke particles use alpha blending or additive blending? Additive looks better but may cause brightness spikes that conflict with Safety Limiter.
- Do we need a z-ordering layer so particles always render above desktop elements? Current assumption: yes, ParticleContainer is added last to stage.
