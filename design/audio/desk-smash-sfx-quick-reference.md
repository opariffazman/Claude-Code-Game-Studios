# Desk Smasher — SFX Quick Reference

**For gameplay programmer**: Minimal parameter sheet for implementing 4 new procedural sounds.

---

## 1. TINKLE (Pixelate Effect)

**Trigger**: Pixelate destruction — element breaks into grid pieces

| Parameter | Value |
|-----------|-------|
| Oscillator 1 | sine, 3200→1800 Hz (0.25s) |
| Oscillator 2 (opt) | sine, 6400→3600 Hz (0.15s) |
| Gain 1 | 0.25 → 0.001 (0.25s) |
| Gain 2 (opt) | 0.15 → 0.001 (0.15s) |
| Filter (opt) | highpass @2000 Hz, Q=1 |
| Duration | 0.25s |
| Randomization | ±20% pitch (existing system) |

---

## 2. ZAP (Gravity Flip Effect)

**Trigger**: Gravity flip destruction — desktop inverts, elements float upward

| Parameter | Value |
|-----------|-------|
| Oscillator | square, 800→6000 Hz (0.08s, LINEAR ramp) |
| Gain | 0.3 → 0.001 (0.12s, LINEAR ramp) |
| Noise (white) | 0.15 → 0.001 (0.12s) |
| Noise Filter | highpass @4000 Hz, Q=0.8 |
| Duration | 0.12s |
| Randomization | ±20% pitch (existing system) |
| Opt: Jitter | Frequency stutter midway (4000→5500 Hz @0.04s) |

---

## 3. SQUISH (Melt Effect)

**Trigger**: Melt destruction — element liquifies and oozes downward

| Parameter | Value |
|-----------|-------|
| Oscillator | sawtooth, 600→150 Hz (0.25s) |
| Gain | 0.28 → 0.001 (0.25s) |
| Filter | lowpass @800 Hz, Q=1.0 |
| LFO (amp wobble) | sine @5 Hz, depth ±0.08 |
| Duration | 0.25s |
| Randomization | ±20% pitch (existing system), LFO freq ±1 Hz |

---

## 4. VORTEX (Vortex Effect)

**Trigger**: Vortex destruction — elements spin inward and vanish

| Parameter | Value |
|-----------|-------|
| Oscillator | sine, 800→300 Hz (0.35s) |
| Gain | 0.32 → 0.001 (0.35s) |
| LFO (freq mod) | sine @8 Hz, depth ±200 Hz |
| Noise (white) | 0.0 → 0.18 (0.15s), → 0.001 (0.35s) |
| Noise Filter | bandpass @1500 Hz, Q=2.0 |
| Duration | 0.35s |
| Randomization | ±20% pitch, LFO freq ±1 Hz |

---

## Implementation Checklist

- [ ] Add 'tinkle' | 'zap' | 'squish' | 'vortex' to SoundType union
- [ ] Add case statements in play() switch
- [ ] Implement playTinkle() — see full spec for secondary oscillator code
- [ ] Implement playZap() — use linearRamp for crisp digital feel
- [ ] Implement playSquish() — add LFO modulation for wobble
- [ ] Implement playVortex() — add LFO for frequency modulation
- [ ] Test each sound with pitch randomization
- [ ] Verify no hanging notes (all oscillators stop at expected times)
- [ ] Wire sounds to effects in effects.ts
- [ ] Audition mix relative to existing sounds

---

## Key Differences from Existing Sounds

- **Tinkle**: Uses secondary oscillator (existing sounds single osc)
- **Zap**: Uses LINEAR ramps (existing sounds use exponential)
- **Squish**: Uses LFO gain modulation (new node type)
- **Vortex**: Uses LFO frequency modulation + multi-component mix

All deviations remain within Web Audio API. No new dependencies.

---

**Full specification**: See `desk-smash-sfx-specifications.md`
