# App Shell

> **Status**: Designed
> **Author**: game-designer + user
> **Last Updated**: 2026-03-28
> **Implements Pillar**: Instant Joy (zero-delay startup), Parent-Friendly (fullscreen containment)

## Overview

The App Shell initializes PixiJS 8 with WebGPU/WebGL2 rendering, manages a fullscreen responsive canvas, runs the core game loop via Ticker, and preloads all assets before gameplay begins. This is the foundation system that every other system depends on. It must boot fast (under 2 seconds on mid-range hardware) and maintain a locked 60 FPS game loop.

## Player Fantasy

The screen fills up instantly and the fun starts immediately -- no loading bars, no menus, just a desktop ready to be smashed.

## Detailed Design

### Core Rules

1. **Async Initialization**: Use PixiJS v8 async pattern:
   ```ts
   const app = new Application();
   await app.init({
     preference: 'webgpu',       // WebGPU first, WebGL2 fallback
     resizeTo: window,
     backgroundColor: 0x1a1a2e,  // Dark desktop blue
     antialias: true,
     resolution: window.devicePixelRatio || 1,
     autoDensity: true,
   });
   document.body.appendChild(app.canvas);
   ```
2. **Renderer Fallback**: Request `preference: 'webgpu'`. PixiJS 8 automatically falls back to WebGL2 if WebGPU is unavailable. No manual detection needed.
3. **Fullscreen on First Interaction**: After the first user input event (any key or click), request `document.documentElement.requestFullscreen()`. Browsers require a user gesture for this API. If fullscreen request fails (denied or unsupported), continue in windowed mode silently.
4. **Responsive Canvas**: Set `resizeTo: window` in init config. Additionally listen for `window.resize` events to update any layout-dependent systems (input zones, UI positioning). Debounce resize handler to 100ms.
5. **Game Loop**: Use `app.ticker` at default 60 FPS. Expose `app.ticker.deltaTime` (frame-normalized delta) to all subscribing systems. Systems register via `app.ticker.add(callback, context, priority)`.
6. **Ticker Priorities**: Boot order matters. Assign priorities (lower = earlier):
   - `SAFETY_LIMITER = 0` (must run first to set flash budget)
   - `INPUT = 10` (process events before gameplay)
   - `GAME_SYSTEMS = 25` (chaos meter, destruction, etc.)
   - `PARTICLES = 40` (visual effects after game logic)
   - `RENDER = 50` (default PixiJS render, automatic)
7. **Asset Preloading**: Use PixiJS Assets API:
   ```ts
   await Assets.load([
     { alias: 'desktop-bg', src: 'assets/desktop-bg.png' },
     { alias: 'crack-spritesheet', src: 'assets/cracks.json' },
     // ...manifest entries
   ]);
   ```
   Show a minimal loading indicator (progress bar or spinning icon) during load. Transition to gameplay immediately on completion.
8. **Boot Sequence**: `init PixiJS` -> `preload assets` -> `instantiate systems` -> `show desktop scene` -> `wait for first input` -> `request fullscreen` -> `start gameplay ticker`.
9. **Canvas Configuration**: Set `canvas.style.touchAction = 'none'` to prevent mobile browser touch behaviors. Set `canvas.style.cursor = 'none'` to hide the system cursor (game will render its own smash cursor).

### States and Transitions

| State | Description | Transition To | Trigger |
|-------|-------------|---------------|---------|
| `BOOTING` | PixiJS initializing | `LOADING` | `app.init()` resolves |
| `LOADING` | Assets preloading | `READY` | All assets loaded |
| `READY` | Desktop displayed, awaiting first input | `PLAYING` | Any user input event |
| `PLAYING` | Game loop active, fullscreen requested | `PAUSED` | Parent unlock triggered |
| `PAUSED` | Session ended by parent | (app closes) | Navigate away or close |

### Interactions with Other Systems

| System | Data Flow |
|--------|-----------|
| **Safety Limiter** | Receives ticker updates at priority 0 |
| **Input Capture** | Receives `app.canvas` reference for event binding; receives ticker updates at priority 10 |
| **Parent Lock** | Can trigger transition to `PAUSED` state |
| **All visual systems** | Receive `app.stage` as the root container for adding display objects |
| **All systems** | Receive `app.ticker` for frame callbacks |

## Formulas

No formulas -- this is a structural/behavioral system.

## Edge Cases

| Edge Case | Resolution |
|-----------|------------|
| WebGPU and WebGL2 both unavailable | Display a static HTML fallback message: "Your browser doesn't support this game. Try Chrome or Edge." |
| Fullscreen request denied | Continue in windowed mode. Game is fully playable without fullscreen. |
| Browser tab loses focus | Pause ticker via `app.ticker.speed = 0`. Resume on focus. Prevents background resource usage. |
| Very slow device (< 30 FPS) | PixiJS ticker uses deltaTime normalization automatically. No special handling needed. |
| Mobile device with on-screen keyboard | `touchAction: none` and `preventDefault` on inputs prevent keyboard popup. |
| User refreshes page | Full reboot. No state persistence needed for a sensory toy. |
| `devicePixelRatio` > 2 (high-DPI) | Cap resolution at `Math.min(window.devicePixelRatio, 2)` to prevent GPU memory issues on 3x+ displays. |

## Dependencies

| System | Direction | Reason |
|--------|-----------|--------|
| None | -- | This is the foundation system |

**Depended on by**: Input Capture, Safety Limiter, Particle System, Destruction Effects, Chaos Meter, Desktop Scene, Audio Engine, Parent Lock -- everything.

## Tuning Knobs

| Parameter | Default | Range | Purpose |
|-----------|---------|-------|---------|
| `TARGET_FPS` | 60 | 30-60 | Target frame rate |
| `BACKGROUND_COLOR` | `0x1a1a2e` | any hex | Desktop background color |
| `MAX_RESOLUTION` | 2 | 1-3 | Cap for `devicePixelRatio` |
| `RESIZE_DEBOUNCE_MS` | 100 | 50-500 | Debounce delay for resize handler |
| `LOADING_TIMEOUT_MS` | 10000 | 5000-30000 | Max time for asset loading before showing error |

## Acceptance Criteria

- [ ] PixiJS 8 initializes with WebGPU preference and falls back to WebGL2 on unsupported browsers
- [ ] Canvas fills the entire viewport with no scrollbars or overflow
- [ ] Canvas resizes correctly when window is resized
- [ ] Fullscreen is requested on first user input; game works if request is denied
- [ ] All assets are preloaded before gameplay begins
- [ ] Game loop runs at 60 FPS on a mid-range laptop (2020 MacBook Air equivalent)
- [ ] Ticker pauses when tab loses focus, resumes on regain
- [ ] System cursor is hidden over the canvas
- [ ] No touch-action browser behaviors (pinch zoom, pull-to-refresh) fire on the canvas
- [ ] Boot-to-interactive takes under 2 seconds on broadband connection

## Open Questions

- None. This system is straightforward PixiJS 8 boilerplate.
