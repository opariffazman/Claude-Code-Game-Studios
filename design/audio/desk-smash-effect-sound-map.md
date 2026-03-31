# Desk Smasher — Effect-to-Sound Mapping

**Audio Design Document**: Maps visual destruction effects to procedural sound effects.

Date: 2026-03-28
For: Gameplay Programmer Integration

---

## Current Implementation (5 Effects, 5 Sounds)

| Visual Effect | Mechanism | Existing Sound | SoundType | Duration |
|---------------|-----------|----------------|-----------|----------|
| Crack | Element shakes, transparency fades, particles spread | Harsh noise burst with decay | `crack` | 0.12s |
| Shatter | Element breaks, pieces fly outward rapidly | Harsh noise burst | `crack` | 0.12s |
| Bounce | Element flies upward, rotates, bounces off screen | Elastic pitch sweep up-down | `boing` | 0.35s |
| Explode | Element vanishes in radial particle burst | Short pop tone | `pop` | 0.15s |
| Inflate & Pop | Element scales up (phase 1), then bursts | Elastic tone (inflate) + pop | `boing` + `pop` | 0.3s + 0.15s |

---

## Proposed Extension (4 New Effects, 4 New Sounds)

### Effect 1: PIXELATE

**Visual**: Element disintegrates into a grid of small rectangular pieces that scatter outward (like a pixelated effect in video).

**Audio**:
- **Sound**: `tinkle`
- **Trigger Timing**: Play at frame 0 of effect start
- **Duration**: 0.25s
- **Character**: High-pitched, delicate, crystalline shimmer
- **Emotional Impact**: Conveyssmall fragments breaking apart, like glass or crystal
- **Implementation**: `audio.play('tinkle')`
- **Notes**: High-frequency content should not overlap (in volume) with dialog or music if added later.

---

### Effect 2: GRAVITY FLIP

**Visual**: Desktop inverts (180° rotation); all elements appear to float upward against inverted gravity. Desktop slowly stops flipping. Elements may slide/float during the flip.

**Audio**:
- **Sound**: `zap`
- **Trigger Timing**: Play at start of flip animation
- **Duration**: 0.12s
- **Character**: Digital, glitchy, electric — like a power surge or malfunction
- **Emotional Impact**: Conveys that something is "wrong" (gravity failure) and exciting (chaos moment)
- **Implementation**: `audio.play('zap')`
- **Notes**: Intentionally harsh/unsettling. Square wave + crackle creates retro arcade feel. Pairs well with visual disorientation.

---

### Effect 3: MELT

**Visual**: Element appears to liquify and ooze downward as if melting. Particle system emits drips. Element gradually becomes transparent and disappears downward.

**Audio**:
- **Sound**: `squish`
- **Trigger Timing**: Play at start of melt animation
- **Duration**: 0.25s
- **Character**: Wet, gooey, slow, viscous — like a sponge being compressed or liquid oozing
- **Emotional Impact**: Conveys transformation (solid → liquid), satisfying compression sound
- **Implementation**: `audio.play('squish')`
- **Notes**: Sawtooth + low-pass filter + amplitude wobble creates organic, living quality. Matches slow melt timing.

---

### Effect 4: VORTEX

**Visual**: All elements on screen spiral inward toward a central point (vortex) and vanish into the center. Desktop may tilt/rotate around the vortex. Particles swirl inward as well.

**Audio**:
- **Sound**: `vortex`
- **Trigger Timing**: Play when first element enters vortex OR at vortex center formation (gameplay decision)
- **Duration**: 0.35s
- **Character**: Swirling, suction, whooshing — like wind being pulled into a vacuum
- **Emotional Impact**: Conveys motion and disappearance; exciting climax moment (all elements destroyed at once)
- **Implementation**: `audio.play('vortex')`
- **Notes**: Longest duration of new sounds. Frequency modulation creates spinning texture. Noise component adds air-movement feel.

---

## Polyphony & Cooldown Considerations

### Current Behavior
The audio engine plays sounds immediately when triggered, with no cooldown or polyphony limit. Multiple sounds overlap if triggered simultaneously.

### Recommendations for New Sounds

**Tinkle**:
- Expected polyphony: 1–2 overlaps (pixelate effect is typically fast)
- Recommendation: No cooldown needed. Web Audio API handles polyphony naturally.

**Zap**:
- Expected polyphony: 1 (gravity flip is a global effect, not per-element)
- Recommendation: Could add a 0.15s cooldown to prevent re-triggering during flip animation, but not critical.

**Squish**:
- Expected polyphony: 2–3 overlaps (multiple elements melting)
- Recommendation: No cooldown. Overlapping squishes should be pleasant (polyphonic wobble).

**Vortex**:
- Expected polyphony: 1 (vortex consumes entire scene)
- Recommendation: No cooldown needed. Only triggers once per vortex event.

### Test Approach
Play each effect multiple times rapidly. If polyphony causes issues (clipping, hanging notes), add a simple cooldown gate:
```typescript
private lastZapTime = 0;
play(type: SoundType, minCooldown = 0): void {
  const now = this.ctx!.currentTime;
  if (type === 'zap' && now - this.lastZapTime < minCooldown) return;
  if (type === 'zap') this.lastZapTime = now;
  // ... rest of play logic
}
```

---

## Integration Steps

### 1. Audio Engine (audio-engine.ts)

Add to SoundType:
```typescript
type SoundType = 'pop' | 'crack' | 'boing' | 'whoosh' | 'splat'
               | 'tinkle' | 'zap' | 'squish' | 'vortex';
```

Add to play() switch:
```typescript
case 'tinkle': this.playTinkle(now, pitchMult); break;
case 'zap': this.playZap(now, pitchMult); break;
case 'squish': this.playSquish(now, pitchMult); break;
case 'vortex': this.playVortex(now, pitchMult); break;
```

Implement methods (see full spec for code).

### 2. Effects System (effects.ts)

Add new effect functions:
```typescript
function pixelateEffect(el: DesktopElement, particles: ParticleManager, audio: AudioEngine): void {
  audio.play('tinkle');
  // ... particles and animation
}

function gravityFlipEffect(el: DesktopElement, particles: ParticleManager, audio: AudioEngine): void {
  audio.play('zap');
  // ... gravity flip animation (global effect)
}

function meltEffect(el: DesktopElement, particles: ParticleManager, audio: AudioEngine): void {
  audio.play('squish');
  // ... melting animation and particle drips
}

function vortexEffect(el: DesktopElement, particles: ParticleManager, audio: AudioEngine): void {
  audio.play('vortex');
  // ... swirl animation, elements spiral inward
}
```

Add to EFFECTS pool (if randomized), or call from specific event handlers.

### 3. Testing Workflow

1. Implement one sound at a time (tinkle → zap → squish → vortex)
2. After each sound: run `npm run dev`, trigger the sound, verify no console errors
3. After all sounds: test polyphony (spam effect triggers), verify no hanging notes
4. Final: audition mix (all sounds playing in sequence) — do they complement existing sounds?

---

## Mixing Notes

### Relative Volume (at +0 dB pitch, all starting gains)

The four new sounds should sit between and around existing sounds:

```
pop       ▓▓▓░░░░░░░░░░  0.30
crack     ▓▓▓▓░░░░░░░░░░  0.40  ← Loudest
boing     ▓▓▓░░░░░░░░░░  0.30
whoosh    ▓▓▓░░░░░░░░░░  0.30
splat     ▓▓░░░░░░░░░░░  0.25

tinkle    ▓▓░░░░░░░░░░░  0.25  ← Softest (delicate)
zap       ▓▓▓░░░░░░░░░░  0.30
squish    ▓▓░░░░░░░░░░░  0.28
vortex    ▓▓▓░░░░░░░░░░  0.32
```

**Principle**: Tinkle is quietest (delicate), vortex is louder (climactic). Zap matches pop/boing (exciting). Squish matches splat (impact).

### Frequency Separation

| Sound | Freq Range | Purpose |
|-------|-----------|---------|
| tinkle | 2000–4000 Hz | High treble; doesn't mask dialog |
| zap | 1500–8000 Hz | Mid-high; electric texture |
| squish | 150–800 Hz | Low-mid; warm, rounded |
| vortex | 300–3000 Hz | Mid; balanced swirl |

**No conflicts**: Tinkle (high) doesn't mask squish (low). Good separation.

---

## Optional Future Enhancements

- **Reverb**: Add ConvolverNode for spatial echo (bathroom theme = more reverb)
- **Sidechain Ducking**: Reduce music/ambience when SFX play
- **Compression**: Prevent clipping during polyphonic bursts (all 9 sounds playing)
- **EQ Shaping**: Per-sound tone controls (is tinkle too bright? Lower high-pass cutoff)

---

## References

- Full Specification: `/design/audio/desk-smash-sfx-specifications.md`
- Quick Reference: `/design/audio/desk-smash-sfx-quick-reference.md`
- Current Audio Engine: `/prototypes/desk-smash/src/audio-engine.ts`
- Current Effects: `/prototypes/desk-smash/src/effects.ts`

---

**Document Owner**: Sound Designer Agent
**Last Updated**: 2026-03-28
