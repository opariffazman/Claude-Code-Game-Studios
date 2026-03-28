# Audio Engine

> **Status**: Designed
> **Author**: game-designer + user
> **Last Updated**: 2026-03-28
> **Implements Pillar**: Instant Joy, Surprise & Variety, Parent-Friendly

## Overview

A lightweight Web Audio API wrapper that plays randomized cartoon sound effects on every input event. The engine preloads a bank of 5-10 short sounds, picks one at random per event, applies pitch variation to keep things fresh, and enforces a volume cap via the Safety Limiter. It handles browser autoplay restrictions, supports polyphony up to 8 simultaneous sounds, and provides a parent-accessible mute toggle.

## Player Fantasy

Every smash produces a funny, surprising sound -- pops, boings, crashes -- making the kid giggle and want to hit the keyboard again.

## Detailed Design

### Core Rules

1. Create a single `AudioContext` at module load time. It will start in `suspended` state due to browser autoplay policy.
2. On the first user interaction (any `keydown`, `mousedown`, or `pointerdown`), call `audioContext.resume()`. Register this handler once and remove it after success.
3. During app init, preload all sound files as `AudioBuffer` objects using `fetch` + `decodeAudioData`. Store in a `Map<SoundId, AudioBuffer>`.
4. To play a sound: create `AudioBufferSourceNode` -> connect to `pitchGainNode` -> connect to `masterGainNode` -> connect to `audioContext.destination`.
5. Apply random pitch shift: set `source.playbackRate.value` to a random value in `[0.8, 1.2]`.
6. Track active sources in an array. If `activeCount >= MAX_POLYPHONY` (8), stop the oldest source before playing the new one.
7. `masterGainNode.gain.value` is clamped to `VOLUME_CAP` (0.7) at all times. The Safety Limiter sets this value and the Audio Engine must not override it.
8. Each input event triggers one random sound from the full bank. No weighting for MVP.
9. Mute toggle sets `masterGainNode.gain.value` to 0 (muted) or restores to previous value (unmuted). Toggle is accessible via a parent-facing UI control (small icon, not prominent).

### Sound Bank (MVP)

| ID | Sound | File | Duration | Notes |
|----|-------|------|----------|-------|
| `pop` | Balloon pop | `pop.mp3` | ~0.2s | Light, quick |
| `boing` | Spring bounce | `boing.mp3` | ~0.4s | Cartoony |
| `crash` | Glass crash | `crash.mp3` | ~0.5s | Satisfying shatter |
| `crack` | Wood crack | `crack.mp3` | ~0.3s | Snappy |
| `whoosh` | Air whoosh | `whoosh.mp3` | ~0.3s | Fast movement |
| `squeak` | Rubber squeak | `squeak.mp3` | ~0.2s | Silly |
| `splat` | Wet splat | `splat.mp3` | ~0.3s | Messy |
| `tinkle` | Bell tinkle | `tinkle.mp3` | ~0.4s | Sparkly |
| `boom` | Deep boom | `boom.mp3` | ~0.5s | Big impact |
| `giggle` | Kid giggle | `giggle.mp3` | ~0.6s | Rare delight |

### API

```typescript
interface AudioEngine {
  init(): Promise<void>;           // Preload all sounds
  play(id?: SoundId): void;        // Play specific or random sound
  playRandom(): void;              // Pick random sound from bank
  setVolume(v: number): void;      // 0.0-0.7, clamped by Safety Limiter
  mute(): void;
  unmute(): void;
  isMuted(): boolean;
  readonly isReady: boolean;       // True after init + AudioContext resumed
}

type SoundId = 'pop' | 'boing' | 'crash' | 'crack' | 'whoosh' | 'squeak' | 'splat' | 'tinkle' | 'boom' | 'giggle';
```

### States and Transitions

| State | Description | Transitions To |
|-------|-------------|----------------|
| `uninitialized` | AudioContext created but sounds not loaded | `loading` (on `init()`) |
| `loading` | Fetching and decoding audio files | `suspended` (on success), `error` (on failure) |
| `suspended` | Sounds loaded, AudioContext suspended (autoplay policy) | `ready` (on first user interaction) |
| `ready` | Fully operational, can play sounds | `muted` (on mute toggle) |
| `muted` | Sounds loaded and context active but gain is 0 | `ready` (on unmute toggle) |
| `error` | Failed to load one or more sounds | `ready` (partial -- play only loaded sounds) |

### Interactions with Other Systems

| System | Direction | Data |
|--------|-----------|------|
| App Shell | IN | Init timing, first-interaction event for AudioContext resume |
| Safety Limiter | IN | Volume cap value (max 0.7); updated if limiter changes threshold |
| Destruction Effects | IN | Calls `play(soundId)` or `playRandom()` per effect |

## Formulas

- **Pitch variation**: `playbackRate = 1.0 + (Math.random() * 0.4 - 0.2)` producing range `[0.8, 1.2]`
- **Effective volume**: `min(requestedVolume, VOLUME_CAP)` where `VOLUME_CAP = 0.7`

## Edge Cases

| Edge Case | Resolution |
|-----------|------------|
| Browser blocks AudioContext (autoplay) | Context starts suspended; resume on first user gesture; queue no sounds until resumed |
| Sound file fails to load | Log warning, exclude from bank. Play proceeds with remaining sounds. If all fail, audio engine is silent but does not crash |
| Rapid input (10+ events/second) | Polyphony cap of 8 handles this; oldest sounds cut cleanly via `source.stop()` |
| `play()` called before `init()` completes | No-op; `isReady` returns false |
| Mobile Safari restrictions | Use `webkitAudioContext` fallback; resume on `touchstart` |
| Tab becomes hidden | Browser throttles audio naturally; no special handling needed |
| User toggles mute rapidly | Gain value snaps immediately; no debounce needed since there is no animation |

## Dependencies

| Dependency | Direction | Required For |
|------------|-----------|--------------|
| App Shell | Upstream | Init timing, user-interaction event for autoplay resume |
| Safety Limiter | Upstream | Enforces volume cap on master gain |
| Destruction Effects | Downstream | Consumes sound playback API |

## Tuning Knobs

| Parameter | Default | Range | Notes |
|-----------|---------|-------|-------|
| `VOLUME_CAP` | 0.7 | 0.0-1.0 | Max master gain, enforced by Safety Limiter |
| `MAX_POLYPHONY` | 8 | 4-16 | Simultaneous sounds before oldest is cut |
| `PITCH_VARIANCE` | 0.2 | 0.0-0.5 | +/- range for random pitch shift |
| `DEFAULT_VOLUME` | 0.5 | 0.0-0.7 | Starting volume before user adjusts |
| Sound bank contents | 10 sounds | 5-20 | Add/remove sounds by editing the bank array |

## Acceptance Criteria

- [ ] All 10 sound files preload successfully during `init()` and report `isReady` when complete
- [ ] `playRandom()` plays a different sound at least 80% of the time across 10 consecutive calls (randomness check)
- [ ] Pitch varies audibly between consecutive plays of the same sound
- [ ] No more than 8 sounds play simultaneously; 9th call cuts the oldest
- [ ] Master volume never exceeds 0.7 regardless of `setVolume()` input
- [ ] Mute toggle silences all audio; unmute restores previous volume
- [ ] AudioContext resumes on first user interaction (test: no sound on page load, sound on first click)
- [ ] Partial load failure (1-2 missing files) does not crash the engine; remaining sounds still play
- [ ] No audible clicks or pops when sounds are cut for polyphony

## Open Questions

- Should `giggle` sound be weighted lower (rarer) to make it a surprise moment, or save weighting for post-MVP?
- Do we need a short fade-out (5ms) when cutting sounds for polyphony, or is an abrupt stop acceptable for cartoon sounds?
