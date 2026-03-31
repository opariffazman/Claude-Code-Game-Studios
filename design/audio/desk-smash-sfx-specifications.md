# Desk Smasher — Procedural Sound Effects Specifications

**Audio Designer**: Sound Designer Agent
**Date**: 2026-03-28
**Target Implementation**: Web Audio API (oscillators, filters, noise buffers)
**Engine**: PixiJS + Web Audio API (AudioContext)
**Reference Implementation**: `prototypes/desk-smash/src/audio-engine.ts`

---

## Overview

This document specifies 4 new procedural sound effects designed to extend the Desk Smasher audio palette. Each sound is implementable purely through Web Audio API nodes (oscillators, gain nodes, filters) and procedurally-generated noise buffers. All sounds inherit the existing pitch randomization system (±20% playback rate variation) and safety-limiter constraints from the audio engine.

**Goal**: Add sonic variety and impact satisfaction to 4 new visual destruction effects:
- **Pixelate Effect** → **Tinkle** sound
- **Gravity Flip Effect** → **Zap** sound
- **Melt Effect** → **Squish** sound
- **Vortex Effect** → **Vortex** sound

---

## 1. TINKLE — Delicate Glass/Crystal Breaking

### When It Plays
Triggered by the **Pixelate destruction effect**, where a desktop element breaks into a grid of small rectangular pieces that scatter outward. The sound should convey the shimmer and delicate nature of crystalline destruction.

### Sonic Identity
- **Character**: High-pitched, bell-like, crystalline shimmer with multiple harmonic "pings"
- **Frequency Range**: 2000–4000 Hz (treble-heavy, child-appropriate)
- **Brightness**: Clear and bright (minimal low-end presence)
- **Emotional Tone**: Delicate, satisfying, playful — not harsh or grating

### Technical Specification

#### Primary Component: Frequency Sweep + Harmonic Decay
- **Oscillator Type**: `sine`
- **Starting Frequency**: 3200 Hz
- **Frequency Ramp**: Exponential drop to 1800 Hz over 0.25 seconds
- **Gain Envelope**:
  - Start: 0.25
  - Attack: Immediate (0 ms)
  - Decay: Exponential to 0.001 over 0.25 seconds
- **Duration**: 0.25 seconds

#### Secondary Component: High Harmonic (Optional Richness)
To add crystalline shimmer, create a second oscillator at +1 octave (double the frequency):
- **Oscillator Type**: `sine`
- **Starting Frequency**: 6400 Hz (2× primary frequency)
- **Frequency Ramp**: Exponential drop to 3600 Hz over 0.15 seconds
- **Gain Envelope**:
  - Start: 0.15 (quieter than primary)
  - Attack: Immediate
  - Decay: Exponential to 0.001 over 0.15 seconds
- **Duration**: 0.15 seconds
- **Connection**: Mix with primary oscillator at master gain node

#### Filter (Optional Enhancement)
Apply a **high-pass filter** to emphasize brightness:
- **Filter Type**: `highpass`
- **Cutoff Frequency**: 2000 Hz (fixed, no ramping)
- **Q Value**: 1.0 (gentle, not resonant)
- **Connection**: Place between oscillator chain and gain

### Volume Considerations
- **Starting Gain**: 0.25 (medium-soft, to avoid harshness in treble)
- **Relative to Other Sounds**: Quieter than "pop" (0.3) — tinkle should feel delicate, not aggressive
- **Peak Level**: ~-12 dB FS (safety limiter will constrain)

### Variations & Randomization
The existing pitch randomization system (±20%) naturally creates pitch variation:
- At 80% pitch: Primary starts at 2560 Hz, secondary at 5120 Hz
- At 120% pitch: Primary starts at 3840 Hz, secondary at 7680 Hz

**Recommendation**: Optionally add **secondary frequency randomization** — vary the harmonic interval (octave ±100 cents) to avoid mechanical repetition across multiple tinkles.

### Why This Works
- **High frequencies** match visual pixelation (small, scattered fragments)
- **Short decay** (0.25s) feels quick and satisfying without resonance
- **Dual-oscillator shimmer** creates depth without requiring external audio files
- **No aggressive attack** keeps it "delicate" vs. "piercing"

### Edge Cases
- **Overlapping tinkles** (rapid pixelations): Existing audio engine polyphony will handle; Web Audio API naturally mixes multiple oscillators. No special cooldown needed.
- **Low-frequency device output**: High-pass filter at 2000 Hz ensures clarity even on small speakers.

---

## 2. ZAP — Electric/Digital Glitch

### When It Plays
Triggered by the **Gravity Flip destruction effect**, where the desktop inverts and elements appear to float upward. The sound should convey digital malfunction, electrical discharge, and a momentary sense of "something is wrong."

### Sonic Identity
- **Character**: Glitchy, electric, retro-digital — like a failing circuit or power surge
- **Frequency Range**: 1500–8000 Hz (wide, includes low crackle and high pitch)
- **Brightness**: Metallic and harsh (intentionally unsettling)
- **Emotional Tone**: Disruptive, playful chaos — surprising but not scary

### Technical Specification

#### Primary Component: Square Wave Sweep (Digital Texture)
- **Oscillator Type**: `square` (instead of sine — more "digital" harmonics)
- **Starting Frequency**: 800 Hz
- **Frequency Ramp**: Linear (not exponential) jump to 6000 Hz over 0.08 seconds
  - Linear ramps create "glitch" texture vs. smooth pitch bending
  - Use `linearRampToValueAtTime()` instead of `exponentialRampToValueAtTime()`
- **Gain Envelope**:
  - Start: 0.3
  - Attack: Immediate (0 ms)
  - Decay: Linear drop to 0.001 over 0.12 seconds
    - Use `linearRampToValueAtTime()` for crisp on/off feel
- **Duration**: 0.12 seconds

#### Secondary Component: Noise Crackle (Static Texture)
To add electrical crackle underneath the pitch sweep:
- **Audio Type**: Procedural white noise buffer
- **Buffer Size**: AudioContext.sampleRate × 0.12 (0.12 seconds of noise)
- **Generation**: Standard white noise (random[-1, 1])
- **Gain Envelope**:
  - Start: 0.15
  - Decay: Exponential to 0.001 over 0.12 seconds
- **Filter**: Apply **high-pass filter** to emphasize crackle
  - **Filter Type**: `highpass`
  - **Cutoff Frequency**: 4000 Hz (cuts rumble, keeps hiss)
  - **Q Value**: 0.8
- **Duration**: 0.12 seconds (synchronized with primary sweep)
- **Connection**: Mix noise with square wave oscillator before master gain

#### Optional Enhancement: Pitch Jitter
For extra "glitch" texture, apply slight randomization to the frequency ramp midpoint:
- At 0.04s into the sweep, modulate frequency ±1000 Hz (stutter effect)
- Achievable by setting intermediate ramp points:
  ```
  osc.frequency.setValueAtTime(800, now);
  osc.frequency.linearRampToValueAtTime(4000, now + 0.04);  // up
  osc.frequency.linearRampToValueAtTime(5500, now + 0.08);  // jitter
  osc.frequency.linearRampToValueAtTime(6000, now + 0.12);  // final
  ```

### Volume Considerations
- **Starting Gain**: 0.3 (medium, intentionally present)
- **Relative to Other Sounds**: Equal to "pop" (0.3) — zap should feel impactful
- **Peak Level**: ~-10 dB FS (slightly hotter than tinkle, for urgency)

### Variations & Randomization
Pitch randomization (±20%) creates variation:
- At 80% pitch: Sweep 640–4800 Hz
- At 120% pitch: Sweep 960–7200 Hz

**Recommendation**: Optionally randomize the **noise filter cutoff** (±500 Hz) to create different "crackle textures" on each zap.

### Why This Works
- **Square wave + noise** creates iconic "electric fault" sound (common in arcade/retro games)
- **Linear ramps** (not exponential) give crisp, digital feel vs. smooth pitch bending
- **High-frequency crackle** emphasizes the "glitch" without being purely high-pitched
- **Short duration** (0.12s) is snappy and responsive

### Edge Cases
- **Square wave aliasing** on web playback: Web Audio API handles anti-aliasing internally. No mitigation needed.
- **Overlapping zaps** (rapid gravity flips): Polyphony handled naturally. Each zap is independent.

---

## 3. SQUISH — Wet/Gooey Sound

### When It Plays
Triggered by the **Melt destruction effect**, where a desktop element appears to liquify and ooze downward. The sound should convey viscosity, wetness, and slow deformation — almost like a balloon losing air or a sponge compressing.

### Sonic Identity
- **Character**: Wet, gooey, squelchy — like a sponge or bubble pop
- **Frequency Range**: 400–1200 Hz (low-mid, heavy bass presence)
- **Brightness**: Dull and soft (muffled, like compression)
- **Emotional Tone**: Satisfying, gooey, slightly disgusting (in a fun way)

### Technical Specification

#### Primary Component: Sawtooth Wave Sweep (Rich, Buzzy Texture)
- **Oscillator Type**: `sawtooth` (harmonically rich, good for squelchy effect)
- **Starting Frequency**: 600 Hz
- **Frequency Ramp**: Exponential drop to 150 Hz over 0.25 seconds
  - Slow decay reinforces "melting" feeling
  - Use `exponentialRampToValueAtTime()`
- **Gain Envelope**:
  - Start: 0.28
  - Attack: Immediate (0 ms)
  - Decay: Exponential to 0.001 over 0.25 seconds
- **Duration**: 0.25 seconds

#### Secondary Component: Amplitude Wobble (Compression Texture)
To add a "gooey compression" feel, modulate the gain with a slow sine LFO:
- **LFO Frequency**: 5 Hz (slow wobble, synchronized with melt animation speed)
- **LFO Depth**: ±0.08 (subtle modulation, not drastic)
- **Implementation**:
  ```
  // After creating gain node, layer in amplitude wobble
  const lfo = ctx.createOscillator();
  const lfoGain = ctx.createGain();
  lfo.type = 'sine';
  lfo.frequency.value = 5;  // 5 Hz wobble
  lfoGain.gain.value = 0.08;
  lfo.connect(gain.gain);  // LFO modulates gain envelope
  lfo.start(now);
  lfo.stop(now + 0.25);
  ```

#### Filter: Low-Pass to Muffle (Melt Effect)
Apply a **low-pass filter** to remove high-frequency harshness and create "underwater" compression:
- **Filter Type**: `lowpass`
- **Cutoff Frequency**: 800 Hz (static, no ramping)
- **Q Value**: 1.0 (gentle rolloff)
- **Connection**: Place between oscillator and gain

### Volume Considerations
- **Starting Gain**: 0.28 (medium-soft, to match sawtooth harmonics)
- **Relative to Other Sounds**: Slightly quieter than "splat" (0.25) — squish is more passive/oozy
- **Peak Level**: ~-14 dB FS (softer than zap, to reinforce "sinking" feeling)

### Variations & Randomization
Pitch randomization (±20%) creates variation:
- At 80% pitch: Sweep 480–120 Hz
- At 120% pitch: Sweep 720–180 Hz

**Recommendation**: Randomize **LFO frequency** (4–6 Hz) to create subtle variation in the "gurgling" feel across multiple squishes.

### Why This Works
- **Sawtooth oscillator** has rich harmonics that, when low-pass filtered, create a thick, buzzy sound
- **Slow frequency decay** mirrors visual melting motion
- **Amplitude wobble** adds organic, living quality (goo is never still)
- **Low-pass filter** removes harsh high end, making the sound feel "wet"
- **Longer duration** (0.25s) aligns with slower melt animation

### Edge Cases
- **LFO modulation on sawtooth**: Web Audio API supports this natively. Ensure LFO is started/stopped in sync with main oscillator to avoid hanging notes.
- **Low-frequency rumble on mobile**: Low-pass filter at 800 Hz may cause rumble on small speakers. Test and adjust cutoff upward if needed (900–1000 Hz).

---

## 4. VORTEX — Swirling Suction Sound

### When It Plays
Triggered by the **Vortex destruction effect**, where the desktop elements spin inward toward a central point and disappear in a swirling vortex. The sound should convey motion, suction, and a sense of being pulled into nothingness.

### Sonic Identity
- **Character**: Swirling, whooshing, suction-like — like wind being pulled into a vacuum
- **Frequency Range**: 500–3000 Hz (wide mid-range sweep)
- **Brightness**: Present but rounded (not sharp, not muffled)
- **Emotional Tone**: Dynamic, exciting, slightly eerie — like something is being pulled away

### Technical Specification

#### Primary Component: Frequency Sweep with Dynamic Modulation
- **Oscillator Type**: `sine`
- **Starting Frequency**: 800 Hz
- **Frequency Ramp**: Exponential rise to 300 Hz over 0.35 seconds
  - Counter-intuitive: frequency *falls* while pitch *sounds* like it's pulling inward
  - Psychoacoustic effect: falling pitch + gain reduction = "disappearing into distance"
- **Gain Envelope**:
  - Start: 0.32
  - Decay: Exponential to 0.001 over 0.35 seconds
- **Duration**: 0.35 seconds

#### Secondary Component: Noise Whoosh (Air Movement)
- **Audio Type**: Procedural white noise buffer
- **Buffer Size**: AudioContext.sampleRate × 0.35 (0.35 seconds)
- **Generation**: White noise with envelope (starts quiet, peaks mid-sweep, fades)
- **Gain Envelope**:
  - Start: 0.0
  - Attack/Rise: Linear to 0.18 over 0.15 seconds (suction building)
  - Sustain: Hold at 0.18 for 0.08 seconds (peak pull)
  - Decay: Exponential to 0.001 over 0.12 seconds (vortex disappears)
- **Filter**: Apply **band-pass filter** to shape whoosh character
  - **Filter Type**: `bandpass`
  - **Frequency**: 1500 Hz (center)
  - **Q Value**: 2.0 (moderate resonance, emphasizes wind texture)
- **Duration**: 0.35 seconds (synchronized with primary oscillator)

#### Tertiary Component: Frequency Modulation (Spinning Texture)
To create a "spinning vortex" impression, apply a subtle pitch vibrato:
- **LFO Oscillator**: Sine wave at 8 Hz
- **LFO Depth**: ±200 Hz (modulation amount)
- **Implementation**:
  ```
  const lfo = ctx.createOscillator();
  const lfoGain = ctx.createGain();
  lfo.type = 'sine';
  lfo.frequency.value = 8;      // 8 Hz vibrato
  lfoGain.gain.value = 200;     // ±200 Hz modulation

  // After setting base frequency, add LFO to frequency parameter
  lfo.connect(osc.frequency);
  lfo.start(now);
  lfo.stop(now + 0.35);
  ```

### Volume Considerations
- **Primary Gain**: 0.32 (medium, present but not dominating)
- **Noise Component**: 0.18 at peak (supporting, not overwhelming)
- **Relative to Other Sounds**: Similar to "whoosh" (0.3) — vortex is kinetic and dynamic
- **Peak Level**: ~-11 dB FS (slightly louder than tinkle, for motion impact)

### Variations & Randomization
Pitch randomization (±20%) creates variation:
- At 80% pitch: Start 640 Hz, end 240 Hz
- At 120% pitch: Start 960 Hz, end 360 Hz

**Recommendation**: Randomize **LFO frequency** (7–9 Hz) to vary the "spin rate" across multiple vortex effects.

### Why This Works
- **Falling pitch + noise combo** creates classic "suction/vortex" effect (well-established in sound design)
- **Frequency modulation** adds dynamic motion, preventing mechanical repetition
- **Longer duration** (0.35s) matches visual vortex animation
- **Band-pass filtered noise** emphasizes the "air movement" over pure tone
- **Dual-component architecture** (tone + noise) creates depth without external audio files

### Edge Cases
- **LFO hanging notes**: Ensure LFO oscillator is stopped in sync with main oscillator. Use the same `stop()` time.
- **Frequency modulation range on playback rate variation**: When pitch is randomized ±20%, the LFO modulation depth scales proportionally:
  - At 80% pitch: LFO depth = ±160 Hz
  - At 120% pitch: LFO depth = ±240 Hz
  - **Recommendation**: Apply pitch variation to `playbackRate` (if using buffer source), not base frequency, to keep LFO relative modulation constant.

---

## Integration Guide for Gameplay Programmer

### Adding Sounds to Audio Engine

1. **Update the SoundType union** in `audio-engine.ts`:
   ```typescript
   type SoundType = 'pop' | 'crack' | 'boing' 'whoosh' | 'splat' | 'tinkle' | 'zap' | 'squish' | 'vortex';
   ```

2. **Add a case for each new sound** in the `play()` switch statement:
   ```typescript
   case 'tinkle': this.playTinkle(now, pitchMult); break;
   case 'zap': this.playZap(now, pitchMult); break;
   case 'squish': this.playSquish(now, pitchMult); break;
   case 'vortex': this.playVortex(now, pitchMult); break;
   ```

3. **Implement each private playXxx() method** following the existing pattern (see examples below).

4. **Update `playRandom()`** to include new sounds in the pool (if desired for random destruction effects).

5. **Update `effects.ts`** to wire new sounds to new visual effects:
   - `pixelateEffect()` → `audio.play('tinkle')`
   - `gravityFlipEffect()` → `audio.play('zap')`
   - `meltEffect()` → `audio.play('squish')`
   - `vortexEffect()` → `audio.play('vortex')`

### Example Implementation: Tinkle

```typescript
private playTinkle(now: number, pitch: number): void {
  const ctx = this.ctx!;

  // Primary oscillator
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = 'sine';
  osc.frequency.setValueAtTime(3200 * pitch, now);
  osc.frequency.exponentialRampToValueAtTime(1800 * pitch, now + 0.25);
  gain.gain.setValueAtTime(0.25, now);
  gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);

  // Optional: High-pass filter for brightness
  const filter = ctx.createBiquadFilter();
  filter.type = 'highpass';
  filter.frequency.value = 2000;
  filter.Q.value = 1.0;

  // Optional: Secondary oscillator for shimmer
  const osc2 = ctx.createOscillator();
  const gain2 = ctx.createGain();
  osc2.type = 'sine';
  osc2.frequency.setValueAtTime(6400 * pitch, now);
  osc2.frequency.exponentialRampToValueAtTime(3600 * pitch, now + 0.15);
  gain2.gain.setValueAtTime(0.15, now);
  gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.15);

  osc.connect(filter).connect(gain).connect(this.masterGain!);
  osc2.connect(filter).connect(gain).connect(this.masterGain!);

  osc.start(now);
  osc.stop(now + 0.25);
  osc2.start(now);
  osc2.stop(now + 0.15);
}
```

### Example Implementation: Zap

```typescript
private playZap(now: number, pitch: number): void {
  const ctx = this.ctx!;

  // Square wave for digital texture
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = 'square';
  osc.frequency.setValueAtTime(800 * pitch, now);
  osc.frequency.linearRampToValueAtTime(6000 * pitch, now + 0.08);
  gain.gain.setValueAtTime(0.3, now);
  gain.gain.linearRampToValueAtTime(0.001, now + 0.12);

  // Noise crackle
  const bufferSize = ctx.sampleRate * 0.12;
  const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i++) {
    data[i] = Math.random() * 2 - 1;  // White noise
  }
  const source = ctx.createBufferSource();
  source.buffer = buffer;
  const noiseGain = ctx.createGain();
  noiseGain.gain.setValueAtTime(0.15, now);
  noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);

  // High-pass filter on noise
  const filter = ctx.createBiquadFilter();
  filter.type = 'highpass';
  filter.frequency.value = 4000;
  filter.Q.value = 0.8;

  osc.connect(gain).connect(this.masterGain!);
  source.connect(filter).connect(noiseGain).connect(this.masterGain!);

  osc.start(now);
  osc.stop(now + 0.12);
  source.start(now);
}
```

### Example Implementation: Squish

```typescript
private playSquish(now: number, pitch: number): void {
  const ctx = this.ctx!;

  // Sawtooth oscillator
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = 'sawtooth';
  osc.frequency.setValueAtTime(600 * pitch, now);
  osc.frequency.exponentialRampToValueAtTime(150 * pitch, now + 0.25);
  gain.gain.setValueAtTime(0.28, now);
  gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);

  // Low-pass filter for muffling
  const filter = ctx.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.value = 800;
  filter.Q.value = 1.0;

  // Amplitude wobble LFO
  const lfo = ctx.createOscillator();
  const lfoGain = ctx.createGain();
  lfo.type = 'sine';
  lfo.frequency.value = 5;
  lfoGain.gain.value = 0.08;
  lfo.connect(gain.gain);

  osc.connect(filter).connect(gain).connect(this.masterGain!);
  lfo.start(now);
  lfo.stop(now + 0.25);

  osc.start(now);
  osc.stop(now + 0.25);
}
```

### Example Implementation: Vortex

```typescript
private playVortex(now: number, pitch: number): void {
  const ctx = this.ctx!;

  // Primary sine oscillator
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = 'sine';
  osc.frequency.setValueAtTime(800 * pitch, now);
  osc.frequency.exponentialRampToValueAtTime(300 * pitch, now + 0.35);
  gain.gain.setValueAtTime(0.32, now);
  gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);

  // Frequency modulation LFO (spinning effect)
  const lfo = ctx.createOscillator();
  const lfoGain = ctx.createGain();
  lfo.type = 'sine';
  lfo.frequency.value = 8;
  lfoGain.gain.value = 200 * pitch;  // ±200 Hz modulation
  lfo.connect(osc.frequency);

  // Noise whoosh component
  const bufferSize = ctx.sampleRate * 0.35;
  const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i++) {
    data[i] = Math.random() * 2 - 1;  // White noise
  }
  const source = ctx.createBufferSource();
  source.buffer = buffer;
  const noiseGain = ctx.createGain();
  noiseGain.gain.setValueAtTime(0.0, now);
  noiseGain.gain.linearRampToValueAtTime(0.18, now + 0.15);   // Attack
  noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);  // Decay

  // Band-pass filter on noise
  const filter = ctx.createBiquadFilter();
  filter.type = 'bandpass';
  filter.frequency.value = 1500;
  filter.Q.value = 2.0;

  osc.connect(gain).connect(this.masterGain!);
  source.connect(filter).connect(noiseGain).connect(this.masterGain!);

  lfo.start(now);
  osc.start(now);
  source.start(now);

  lfo.stop(now + 0.35);
  osc.stop(now + 0.35);
}
```

---

## Testing & Verification Checklist

- [ ] Each sound plays without errors when triggered
- [ ] Pitch randomization (±20%) applies correctly to all new sounds
- [ ] Audio envelope completes without hanging notes (no stuck oscillators)
- [ ] Master gain/safety limiter prevents clipping
- [ ] Sounds mix well with existing pop/crack/boing/whoosh/splat
- [ ] No feedback or resonance in filter cutoff frequencies
- [ ] LFO oscillators start and stop in sync with primary oscillators
- [ ] Sounds play on first keypress (AudioContext autoplay policy respected)
- [ ] Mute toggle silences all new sounds
- [ ] Web Audio API inspector shows correct node graph topology

---

## Audio Mixing Reference

### Relative Volume Targets (at +0 dB pitch)

| Sound | Start Gain | Duration | Character | Use Case |
|-------|-----------|----------|-----------|----------|
| pop | 0.3 | 0.15s | Bright, snappy | Explode |
| crack | 0.4 | 0.12s | Harsh, breaking | Damage |
| boing | 0.3 | 0.35s | Elastic, bouncy | Bounce |
| whoosh | 0.3 | 0.2s | Air movement | Swipe |
| splat | 0.25 | 0.2s | Heavy, dull | Impact |
| **tinkle** | **0.25** | **0.25s** | **Delicate, bright** | **Pixelate** |
| **zap** | **0.3** | **0.12s** | **Electric, harsh** | **Gravity Flip** |
| **squish** | **0.28** | **0.25s** | **Wet, gooey** | **Melt** |
| **vortex** | **0.32** | **0.35s** | **Swirling, suction** | **Vortex** |

### Bus Assignment

All sounds route through a single master gain node (`this.masterGain`). No sub-buses required for prototype. Future production implementation may want:
- SFX bus (current state)
- Music bus (for background loop, if added)
- Ambience bus (for wind/background, if added)

---

## Deviation Notes

This specification deviates from the original prototype audio engine in the following ways:

1. **Complexity**: New sounds use more complex node graphs (secondary oscillators, LFOs, multiple filters). Prototype engine was simpler. **Rationale**: Adds sonic richness and variety without external audio files.

2. **Linear Ramps**: Zap uses `linearRampToValueAtTime()` instead of `exponentialRampToValueAtTime()`. **Rationale**: Linear ramps feel more "digital" and crisp; exponential feels more organic.

3. **LFO Modulation**: Squish and Vortex use LFO oscillators to modulate gain and frequency. **Rationale**: Creates organic, living quality (wobble, spin) that would be tedious to hand-code with multiple ramp points.

4. **Filter Routing**: Filters are inserted between oscillators and gains in some cases. Prototype routed all to master gain directly. **Rationale**: Filters color individual sounds before mixing, providing more control.

All deviations remain within the Web Audio API feature set available in the prototype engine. No new dependencies required.

---

## Future Enhancements

If the prototype validates and Desk Smasher moves to production:

1. **Procedural Melody**: Extend Tinkle to play a random ascending glissando (musical notes) instead of single frequency sweep.
2. **Reverb Convolver**: Add ConvolverNode with impulse response for environmental space (echo in "bathroom" theme, etc.).
3. **Compression**: Add DynamicsCompressor to prevent sudden volume spikes during polyphonic destruction.
4. **Sidechain Ducking**: Reduce ambience volume when SFX play (if ambience layer is added).
5. **Procedural Music**: Background loop generated from same oscillator palette for cohesive sonic identity.

None of these are required for the core prototype validation.

---

**End of Specification Document**
