# Input Capture

> **Status**: Designed
> **Author**: game-designer + user
> **Last Updated**: 2026-03-28
> **Implements Pillar**: Instant Joy (every input produces a response), Safe Chaos (no accidental exits)

## Overview

Input Capture intercepts all keyboard, mouse, and touch events on the canvas, blocks browser default behaviors and system shortcuts, and routes normalized events to subscribing systems via a lightweight event bus. It also tracks input frequency for the Chaos Meter. This system is the single point of entry for all user interaction -- no other system binds DOM event listeners directly.

## Player Fantasy

Every key the child mashes, every frantic mouse click, every finger jab on the screen -- it all does something. Nothing is wasted. Nothing escapes.

## Detailed Design

### Core Rules

1. **Captured Events**: Bind listeners on `window` (for keyboard) and `app.canvas` (for pointer/touch) for:
   - `keydown`, `keyup`
   - `mousedown`, `mouseup`, `mousemove`
   - `touchstart`, `touchmove`, `touchend`
   - `contextmenu` (to block right-click menu)
   - `wheel` (to block scroll)
2. **preventDefault on Everything**: Every captured event calls `event.preventDefault()` and `event.stopPropagation()`. This blocks browser shortcuts, text selection, context menus, scroll, zoom, and navigation.
3. **Blocked Shortcuts**: The following are neutralized by capturing their key events:
   - `Alt+Tab`, `Alt+F4` (OS-level -- can only block the keydown, OS may still act)
   - `Ctrl+W`, `Ctrl+T`, `Ctrl+N`, `Ctrl+L`, `Ctrl+R`, `Ctrl+Shift+I`
   - `Cmd+Q`, `Cmd+W`, `Cmd+H` (macOS equivalents)
   - `Escape` (would exit fullscreen -- must intercept)
   - `F1`-`F12` (various browser functions)
   - `Backspace` (browser back navigation)
   - `Tab` (focus shifting)
   Note: Some OS-level shortcuts (Alt+Tab, Alt+F4) cannot be fully blocked from a browser. Fullscreen mode suppresses most of them. The `beforeunload` event is set as a last-resort guard.
4. **beforeunload Guard**: Set `window.onbeforeunload = (e) => { e.preventDefault(); return ''; }` to trigger a browser confirmation dialog if any navigation/close attempt gets through.
5. **Event Normalization**: Convert all events to a unified format:
   ```ts
   interface GameInput {
     type: 'key' | 'pointer' | 'touch';
     action: 'down' | 'up' | 'move';
     key?: string;            // For keyboard: event.key
     code?: string;           // For keyboard: event.code
     x?: number;              // Canvas-relative X (for pointer/touch)
     y?: number;              // Canvas-relative Y (for pointer/touch)
     pointerId?: number;      // For multi-touch tracking
     timestamp: number;       // performance.now()
   }
   ```
6. **Event Bus**: Systems subscribe via `InputCapture.on(type, callback)` and unsubscribe via `InputCapture.off(type, callback)`. Event types: `'key:down'`, `'key:up'`, `'pointer:down'`, `'pointer:up'`, `'pointer:move'`, `'touch:down'`, `'touch:up'`, `'touch:move'`, `'any'` (firehose).
7. **Input Frequency Tracking**: Maintain a rolling 1-second window of all input events. Expose `InputCapture.getEventsPerSecond(): number`. This feeds the Chaos Meter.
8. **Input Zones**: Divide the canvas into a configurable grid (default 3x3). Each `GameInput` with coordinates is tagged with its zone index (0-8). Systems can subscribe to specific zones: `InputCapture.onZone(zoneIndex, callback)`. Zone boundaries recalculate on resize.
9. **Multi-Touch Support**: Track up to 10 simultaneous touch points. Each touch gets a unique `pointerId` from the browser's `Touch.identifier`. All active touches are queryable via `InputCapture.getActiveTouches(): GameInput[]`.
10. **First Input Detection**: Emit a one-time `'first-input'` event on the very first user interaction. App Shell listens for this to trigger fullscreen request and audio context resume.

### States and Transitions

| State | Description | Transition To | Trigger |
|-------|-------------|---------------|---------|
| `WAITING` | Listeners bound, no input received yet | `CAPTURING` | First input event |
| `CAPTURING` | All events routed to subscribers | `SUSPENDED` | Parent unlock activated |
| `SUSPENDED` | Events no longer routed (parent is exiting) | -- | Terminal state |

### Interactions with Other Systems

| System | Data Flow |
|--------|-----------|
| **App Shell** | Receives `app.canvas` for event binding. Listens for `'first-input'` to trigger fullscreen. |
| **Parent Lock** | Receives all `key:down` events to monitor unlock sequences. Can trigger `SUSPENDED` state. |
| **Chaos Meter** | Reads `getEventsPerSecond()` each frame to drive chaos level. |
| **Destruction Effects** | Subscribes to `pointer:down`, `key:down`, zone events to trigger smash effects at input locations. |
| **Audio Engine** | Subscribes to `'any'` to trigger impact sounds on every input. |

## Formulas

**Events Per Second**:
```
eps = inputTimestamps.filter(t => now - t < 1000).length
```

**Zone Index from Coordinates**:
```
col = Math.floor(x / (canvasWidth / ZONE_COLS))
row = Math.floor(y / (canvasHeight / ZONE_ROWS))
zoneIndex = row * ZONE_COLS + col
```

## Edge Cases

| Edge Case | Resolution |
|-----------|------------|
| Key held down generates repeat `keydown` events | Check `event.repeat`. Repeated keydowns still count for chaos meter but are tagged `repeat: true` so effects systems can choose to ignore or dampen. |
| Escape key pressed in fullscreen | `preventDefault()` on `keydown` for Escape. Note: Fullscreen API spec says holding Escape for ~2s will exit fullscreen regardless. This is acceptable -- Parent Lock handles intentional exit. |
| Touch and mouse events fire simultaneously on hybrid devices | Use `pointer` events where possible. If falling back to separate mouse/touch, set a 100ms debounce flag after touch events to suppress duplicate mouse events. |
| Right-click context menu | Capture `contextmenu` event on canvas and window, `preventDefault()` on both. |
| Browser extension injects keyboard shortcuts | Cannot block extension shortcuts. Acceptable risk -- recommend parents use a clean browser profile. |
| Child unplugs keyboard mid-session | No crash. Event listeners simply receive no events. Chaos Meter naturally decays. |
| Input flood (child sits on keyboard) | No throttling -- every event is real input and should produce feedback. The Safety Limiter will cap visual effects. Frequency tracking just counts them. |
| Canvas resized while input zones active | Recalculate zone boundaries in the resize handler. In-flight events use old boundaries (acceptable, sub-frame timing). |

## Dependencies

| System | Direction | Reason |
|--------|-----------|--------|
| **App Shell** | Depends on | Needs `app.canvas` element and ticker registration |

**Depended on by**: Parent Lock, Chaos Meter, Destruction Effects, Audio Engine, Desktop Scene.

## Tuning Knobs

| Parameter | Default | Range | Purpose |
|-----------|---------|-------|---------|
| `ZONE_COLS` | 3 | 1-5 | Number of horizontal input zones |
| `ZONE_ROWS` | 3 | 1-5 | Number of vertical input zones |
| `FREQUENCY_WINDOW_MS` | 1000 | 500-2000 | Rolling window for events-per-second calculation |
| `KEY_REPEAT_DAMPENING` | true | bool | Whether repeated keydowns are tagged for dampening |
| `MAX_TOUCH_POINTS` | 10 | 1-20 | Maximum simultaneous touches tracked |
| `POINTER_DEBOUNCE_MS` | 100 | 50-200 | Debounce window to suppress duplicate mouse events from touch |

## Acceptance Criteria

- [ ] All keyboard events are captured and preventDefault'd (no browser shortcuts fire)
- [ ] Right-click context menu never appears on the canvas
- [ ] Scroll, pinch-zoom, and pull-to-refresh are all blocked
- [ ] Escape key does not immediately exit fullscreen (captured and suppressed)
- [ ] `beforeunload` dialog appears if navigation is somehow triggered
- [ ] Every input event is normalized to `GameInput` format and dispatched to subscribers
- [ ] `getEventsPerSecond()` returns accurate count within a 1-second rolling window
- [ ] Input zones correctly map pointer/touch coordinates to grid cells
- [ ] Zone boundaries update when canvas is resized
- [ ] Multi-touch works: 5+ simultaneous touches each produce independent events
- [ ] First input event triggers `'first-input'` exactly once
- [ ] System transitions to `SUSPENDED` when Parent Lock triggers unlock

## Open Questions

- None. Browser event capture is well-understood territory.
