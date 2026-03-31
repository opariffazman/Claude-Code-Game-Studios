# Desk Smasher Prototype Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a playable prototype that answers: "Is keyboard-mashing a fake desktop with randomized destruction effects satisfying and engaging for kids?"

**Architecture:** Vite + PixiJS 8.17.0 + TypeScript prototype in `prototypes/desk-smash/`. Single-page app: fullscreen canvas, fake desktop rendered with PixiJS Graphics (no external art assets), Web Audio API for procedurally generated sounds, all input captured and routed to destruction effects. Everything in one isolated prototype directory.

**Tech Stack:** PixiJS 8.17.0, TypeScript (strict), Vite, Web Audio API

**CRITICAL — PixiJS v8 patterns (model default knowledge is v7 and WRONG):**
- `import { ... } from 'pixi.js'` — NOT `@pixi/*` sub-packages
- `const app = new Application(); await app.init({...})` — constructor takes NO args
- `app.canvas` — NOT `app.view`
- `Assets.load()` — NOT `new Loader()`
- `Assets.add({ alias, src })` — NOT `Assets.add(name, src)`
- Graphics: `.rect().fill()` chain — NOT `.beginFill().drawRect().endFill()`
- `eventMode = 'static'` — NOT `interactive = true`
- Wrap in `async function main()` for Vite compatibility (no top-level await)
- `new Text({ text, style })` — NOT `new Text(text, style)`
- See `docs/engine-reference/web/pixijs/BEST-PRACTICES.md` for full patterns

---

## File Structure

```
prototypes/desk-smash/
├── package.json          # Vite + PixiJS deps
├── tsconfig.json         # Strict TS config
├── vite.config.ts        # Dev server config
├── index.html            # Entry HTML (fullscreen, no margin)
└── src/
    ├── main.ts           # App init, game loop, orchestration
    ├── safety-limiter.ts # Flash budget + volume cap
    ├── input-capture.ts  # All input capture + system key blocking
    ├── audio-engine.ts   # Procedural cartoon sounds via Web Audio
    ├── desktop.ts        # Fake desktop rendering (icons, windows, taskbar)
    ├── effects.ts        # Destruction effect pool (5 effects)
    ├── particles.ts      # Simple particle system for debris/confetti
    └── parent-lock.ts    # Typed keyword + combo hold unlock
```

Each file has one responsibility. `main.ts` wires everything together.

---

### Task 1: Project Scaffold

**Files:**
- Create: `prototypes/desk-smash/package.json`
- Create: `prototypes/desk-smash/tsconfig.json`
- Create: `prototypes/desk-smash/vite.config.ts`
- Create: `prototypes/desk-smash/index.html`

- [ ] **Step 1: Create package.json**

```json
{
  "name": "desk-smash-prototype",
  "private": true,
  "version": "0.0.1",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc && vite build",
    "preview": "vite preview"
  },
  "dependencies": {
    "pixi.js": "^8.17.0"
  },
  "devDependencies": {
    "typescript": "^5.7.0",
    "vite": "^6.0.0"
  }
}
```

- [ ] **Step 2: Create tsconfig.json**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true,
    "lib": ["ES2022", "DOM", "DOM.Iterable"]
  },
  "include": ["src"]
}
```

- [ ] **Step 3: Create vite.config.ts**

```typescript
import { defineConfig } from 'vite';

export default defineConfig({
  root: '.',
  server: {
    open: true,
    port: 3000,
  },
  build: {
    outDir: 'dist',
    target: 'es2022',
  },
});
```

- [ ] **Step 4: Create index.html**

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Desk Smasher</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    html, body { width: 100%; height: 100%; overflow: hidden; background: #000; }
    canvas { display: block; }
  </style>
</head>
<body>
  <script type="module" src="/src/main.ts"></script>
</body>
</html>
```

- [ ] **Step 5: Install dependencies**

Run: `cd prototypes/desk-smash && npm install`
Expected: `node_modules/` created, `pixi.js@8.17.x` installed

- [ ] **Step 6: Commit**

```bash
git add prototypes/desk-smash/package.json prototypes/desk-smash/tsconfig.json prototypes/desk-smash/vite.config.ts prototypes/desk-smash/index.html prototypes/desk-smash/package-lock.json
git commit -m "proto: scaffold desk-smash prototype with Vite + PixiJS 8"
```

---

### Task 2: App Shell + Safety Limiter

**Files:**
- Create: `prototypes/desk-smash/src/main.ts`
- Create: `prototypes/desk-smash/src/safety-limiter.ts`

- [ ] **Step 1: Create safety-limiter.ts**

The safety limiter tracks visual flashes in a rolling 1-second window and caps audio volume. All visual/audio systems must check with it before emitting.

```typescript
// PROTOTYPE - NOT FOR PRODUCTION
// Question: Is keyboard-mashing a fake desktop with destruction effects fun?
// Date: 2026-03-28

const MAX_FLASHES_PER_SECOND = 3;
const MAX_VOLUME = 0.7;
const WINDOW_MS = 1000;

export class SafetyLimiter {
  private flashTimestamps: number[] = [];

  canFlash(): boolean {
    const now = performance.now();
    this.flashTimestamps = this.flashTimestamps.filter(t => now - t < WINDOW_MS);
    return this.flashTimestamps.length < MAX_FLASHES_PER_SECOND;
  }

  recordFlash(): void {
    this.flashTimestamps.push(performance.now());
  }

  get maxVolume(): number {
    return MAX_VOLUME;
  }
}
```

- [ ] **Step 2: Create main.ts with PixiJS 8 async init**

```typescript
// PROTOTYPE - NOT FOR PRODUCTION
// Question: Is keyboard-mashing a fake desktop with destruction effects fun?
// Date: 2026-03-28

import { Application } from 'pixi.js';
import { SafetyLimiter } from './safety-limiter';

async function main() {
  const app = new Application();
  await app.init({
    background: '#2b5797',
    resizeTo: window,
    antialias: true,
    autoDensity: true,
    resolution: window.devicePixelRatio || 1,
  });
  document.body.appendChild(app.canvas);

  const safety = new SafetyLimiter();

  // Game loop placeholder
  app.ticker.add((ticker) => {
    // Systems will update here
  });

  console.log('Desk Smasher prototype running');
}

main().catch(console.error);
```

- [ ] **Step 3: Verify it runs**

Run: `cd prototypes/desk-smash && npx vite --host`
Expected: Browser opens to blue fullscreen canvas, console shows "Desk Smasher prototype running"

- [ ] **Step 4: Commit**

```bash
git add prototypes/desk-smash/src/main.ts prototypes/desk-smash/src/safety-limiter.ts
git commit -m "proto: add app shell with PixiJS 8 init and safety limiter"
```

---

### Task 3: Audio Engine (Procedural Sounds)

**Files:**
- Create: `prototypes/desk-smash/src/audio-engine.ts`

No external audio files needed — we generate cartoon sounds procedurally using Web Audio oscillators and noise. This avoids asset management entirely for the prototype.

- [ ] **Step 1: Create audio-engine.ts**

```typescript
// PROTOTYPE - NOT FOR PRODUCTION
// Question: Is keyboard-mashing a fake desktop with destruction effects fun?
// Date: 2026-03-28

import { SafetyLimiter } from './safety-limiter';

type SoundType = 'pop' | 'crack' | 'boing' | 'whoosh' | 'splat';

export class AudioEngine {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private safety: SafetyLimiter;
  private muted = false;

  constructor(safety: SafetyLimiter) {
    this.safety = safety;
  }

  /** Must be called from a user gesture (click/keypress) to satisfy autoplay policy */
  ensureContext(): void {
    if (this.ctx) return;
    this.ctx = new AudioContext();
    this.masterGain = this.ctx.createGain();
    this.masterGain.gain.value = this.safety.maxVolume;
    this.masterGain.connect(this.ctx.destination);
  }

  toggleMute(): void {
    this.muted = !this.muted;
    if (this.masterGain) {
      this.masterGain.gain.value = this.muted ? 0 : this.safety.maxVolume;
    }
  }

  play(type: SoundType): void {
    if (!this.ctx || !this.masterGain || this.muted) return;

    const now = this.ctx.currentTime;
    // Random pitch variation ±20%
    const pitchMult = 0.8 + Math.random() * 0.4;

    switch (type) {
      case 'pop': this.playPop(now, pitchMult); break;
      case 'crack': this.playCrack(now, pitchMult); break;
      case 'boing': this.playBoing(now, pitchMult); break;
      case 'whoosh': this.playWhoosh(now, pitchMult); break;
      case 'splat': this.playSplat(now, pitchMult); break;
    }
  }

  playRandom(): void {
    const sounds: SoundType[] = ['pop', 'crack', 'boing', 'whoosh', 'splat'];
    this.play(sounds[Math.floor(Math.random() * sounds.length)]);
  }

  private playPop(now: number, pitch: number): void {
    const ctx = this.ctx!;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(600 * pitch, now);
    osc.frequency.exponentialRampToValueAtTime(200 * pitch, now + 0.1);
    gain.gain.setValueAtTime(0.3, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
    osc.connect(gain).connect(this.masterGain!);
    osc.start(now);
    osc.stop(now + 0.15);
  }

  private playCrack(now: number, pitch: number): void {
    const ctx = this.ctx!;
    const bufferSize = ctx.sampleRate * 0.1;
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bufferSize * 0.1));
    }
    const source = ctx.createBufferSource();
    source.buffer = buffer;
    source.playbackRate.value = pitch;
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.4, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);
    source.connect(gain).connect(this.masterGain!);
    source.start(now);
  }

  private playBoing(now: number, pitch: number): void {
    const ctx = this.ctx!;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(150 * pitch, now);
    osc.frequency.exponentialRampToValueAtTime(400 * pitch, now + 0.1);
    osc.frequency.exponentialRampToValueAtTime(100 * pitch, now + 0.3);
    gain.gain.setValueAtTime(0.3, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
    osc.connect(gain).connect(this.masterGain!);
    osc.start(now);
    osc.stop(now + 0.35);
  }

  private playWhoosh(now: number, pitch: number): void {
    const ctx = this.ctx!;
    const bufferSize = ctx.sampleRate * 0.2;
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      const t = i / bufferSize;
      data[i] = (Math.random() * 2 - 1) * Math.sin(t * Math.PI) * 0.5;
    }
    const source = ctx.createBufferSource();
    source.buffer = buffer;
    source.playbackRate.value = pitch;
    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(1000 * pitch, now);
    filter.Q.value = 2;
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.3, now);
    source.connect(filter).connect(gain).connect(this.masterGain!);
    source.start(now);
  }

  private playSplat(now: number, pitch: number): void {
    const ctx = this.ctx!;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(300 * pitch, now);
    osc.frequency.exponentialRampToValueAtTime(50 * pitch, now + 0.15);
    gain.gain.setValueAtTime(0.25, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);
    osc.connect(gain).connect(this.masterGain!);
    osc.start(now);
    osc.stop(now + 0.2);
  }
}
```

- [ ] **Step 2: Wire audio into main.ts**

Add to `main.ts` after safety limiter creation:

```typescript
import { AudioEngine } from './audio-engine';

// ... after safety creation:
const audio = new AudioEngine(safety);
```

- [ ] **Step 3: Commit**

```bash
git add prototypes/desk-smash/src/audio-engine.ts prototypes/desk-smash/src/main.ts
git commit -m "proto: add procedural audio engine with 5 cartoon sounds"
```

---

### Task 4: Particle System

**Files:**
- Create: `prototypes/desk-smash/src/particles.ts`

Simple particle system using PixiJS Graphics objects (no texture assets needed). Particles are pooled and recycled.

- [ ] **Step 1: Create particles.ts**

```typescript
// PROTOTYPE - NOT FOR PRODUCTION
// Question: Is keyboard-mashing a fake desktop with destruction effects fun?
// Date: 2026-03-28

import { Container, Graphics, GraphicsContext } from 'pixi.js';
import { SafetyLimiter } from './safety-limiter';

interface ActiveParticle {
  gfx: Graphics;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  gravity: number;
  rotationSpeed: number;
  scaleDecay: number;
}

const POOL_SIZE = 500;
const COLORS = [0xff4444, 0x44aaff, 0xffcc00, 0xff69b4, 0x44ff44, 0xff8800, 0xaa44ff];

// Pre-built graphics contexts for different shapes
const circleCtx = new GraphicsContext().circle(0, 0, 4).fill(0xffffff);
const squareCtx = new GraphicsContext().rect(-3, -3, 6, 6).fill(0xffffff);
const triangleCtx = new GraphicsContext().poly([0, -5, 5, 4, -5, 4]).fill(0xffffff);
const SHAPES = [circleCtx, squareCtx, triangleCtx];

export class ParticleManager {
  private container: Container;
  private pool: Graphics[] = [];
  private active: ActiveParticle[] = [];
  private safety: SafetyLimiter;

  constructor(parent: Container, safety: SafetyLimiter) {
    this.container = new Container();
    this.container.label = 'particles';
    parent.addChild(this.container);
    this.safety = safety;

    // Pre-allocate pool
    for (let i = 0; i < POOL_SIZE; i++) {
      const g = new Graphics(circleCtx);
      g.visible = false;
      this.container.addChild(g);
      this.pool.push(g);
    }
  }

  emit(x: number, y: number, count: number, config?: {
    speed?: number;
    gravity?: number;
    life?: number;
    spread?: number;
    scale?: number;
  }): void {
    const speed = config?.speed ?? 300;
    const gravity = config?.gravity ?? 400;
    const life = config?.life ?? 0.8;
    const spread = config?.spread ?? Math.PI * 2;
    const scale = config?.scale ?? 1;

    for (let i = 0; i < count; i++) {
      const gfx = this.pool.pop();
      if (!gfx) break; // Pool exhausted

      const angle = -Math.PI / 2 + (Math.random() - 0.5) * spread;
      const spd = speed * (0.5 + Math.random() * 0.5);
      const color = COLORS[Math.floor(Math.random() * COLORS.length)];
      const shape = SHAPES[Math.floor(Math.random() * SHAPES.length)];

      gfx.context = shape;
      gfx.tint = color;
      gfx.position.set(x, y);
      gfx.scale.set(scale * (0.5 + Math.random()));
      gfx.rotation = Math.random() * Math.PI * 2;
      gfx.alpha = 1;
      gfx.visible = true;

      this.active.push({
        gfx,
        vx: Math.cos(angle) * spd,
        vy: Math.sin(angle) * spd,
        life,
        maxLife: life,
        gravity,
        rotationSpeed: (Math.random() - 0.5) * 10,
        scaleDecay: 0.95 + Math.random() * 0.04,
      });
    }

    // Record flash for safety if emitting bright particles
    if (count > 5 && this.safety.canFlash()) {
      this.safety.recordFlash();
    }
  }

  update(dt: number): void {
    for (let i = this.active.length - 1; i >= 0; i--) {
      const p = this.active[i];
      p.life -= dt;

      if (p.life <= 0) {
        p.gfx.visible = false;
        this.pool.push(p.gfx);
        this.active.splice(i, 1);
        continue;
      }

      p.vy += p.gravity * dt;
      p.gfx.x += p.vx * dt;
      p.gfx.y += p.vy * dt;
      p.gfx.rotation += p.rotationSpeed * dt;
      p.gfx.alpha = p.life / p.maxLife;
      p.gfx.scale.x *= p.scaleDecay;
      p.gfx.scale.y *= p.scaleDecay;
    }
  }

  get activeCount(): number {
    return this.active.length;
  }
}
```

- [ ] **Step 2: Wire particles into main.ts**

```typescript
import { ParticleManager } from './particles';

// ... after audio:
const particles = new ParticleManager(app.stage, safety);

// In game loop:
app.ticker.add((ticker) => {
  const dt = ticker.deltaTime / 60; // Convert to seconds
  particles.update(dt);
});
```

- [ ] **Step 3: Commit**

```bash
git add prototypes/desk-smash/src/particles.ts prototypes/desk-smash/src/main.ts
git commit -m "proto: add pooled particle system with multi-shape confetti"
```

---

### Task 5: Desktop Renderer

**Files:**
- Create: `prototypes/desk-smash/src/desktop.ts`

Fake desktop drawn entirely with PixiJS Graphics — no external art assets. Includes wallpaper, taskbar, icons, and windows. Each element tracks its own health/destruction state.

- [ ] **Step 1: Create desktop.ts**

```typescript
// PROTOTYPE - NOT FOR PRODUCTION
// Question: Is keyboard-mashing a fake desktop with destruction effects fun?
// Date: 2026-03-28

import { Container, Graphics, Text, TextStyle } from 'pixi.js';

export interface DesktopElement {
  container: Container;
  gfx: Graphics;
  type: 'icon' | 'window' | 'taskbar';
  health: number;
  maxHealth: number;
  destroyed: boolean;
  x: number;
  y: number;
  width: number;
  height: number;
  label: string;
}

const ICON_SIZE = 64;
const ICON_COLORS = [0x4488ff, 0xff6644, 0x44cc44, 0xffaa00, 0xcc44cc, 0x44cccc, 0xff4488, 0x88ff44];
const ICON_LABELS = ['Docs', 'Music', 'Games', 'Photos', 'Mail', 'Chat', 'Code', 'Trash'];
const WINDOW_COLORS = [0xffffff, 0xf0f0f0, 0xe8f0ff];
const TITLEBAR_COLORS = [0x3366cc, 0xcc3333, 0x33aa33, 0x9944cc];

export class DesktopRenderer {
  private container: Container;
  elements: DesktopElement[] = [];
  private screenW: number;
  private screenH: number;

  constructor(parent: Container, screenW: number, screenH: number) {
    this.container = new Container();
    this.container.label = 'desktop';
    parent.addChild(this.container);
    this.screenW = screenW;
    this.screenH = screenH;
    this.buildDesktop();
  }

  resize(w: number, h: number): void {
    this.screenW = w;
    this.screenH = h;
  }

  private buildDesktop(): void {
    this.buildWallpaper();
    this.buildTaskbar();
    this.buildIcons();
    this.buildWindows();
  }

  private buildWallpaper(): void {
    const bg = new Graphics()
      .rect(0, 0, this.screenW, this.screenH)
      .fill(0x2b5797);
    this.container.addChild(bg);
  }

  private buildTaskbar(): void {
    const taskbarH = 48;
    const y = this.screenH - taskbarH;
    const c = new Container();
    c.label = 'taskbar';
    c.position.set(0, y);

    const bar = new Graphics()
      .rect(0, 0, this.screenW, taskbarH)
      .fill({ color: 0x1a1a2e, alpha: 0.9 });
    c.addChild(bar);

    // Start button
    const startBtn = new Graphics()
      .roundRect(4, 4, 40, 40, 6)
      .fill(0x3366cc);
    c.addChild(startBtn);

    // Clock
    const clockStyle = new TextStyle({ fontSize: 14, fill: 0xffffff, fontFamily: 'monospace' });
    const clock = new Text({ text: '12:00', style: clockStyle });
    clock.position.set(this.screenW - 60, 14);
    c.addChild(clock);

    this.container.addChild(c);
    this.elements.push({
      container: c, gfx: bar, type: 'taskbar',
      health: 3, maxHealth: 3, destroyed: false,
      x: 0, y, width: this.screenW, height: taskbarH, label: 'Taskbar',
    });
  }

  private buildIcons(): void {
    const cols = 2;
    const startX = 30;
    const startY = 30;
    const spacingX = 100;
    const spacingY = 100;
    const count = Math.min(8, ICON_LABELS.length);

    for (let i = 0; i < count; i++) {
      const col = i % cols;
      const row = Math.floor(i / cols);
      const x = startX + col * spacingX;
      const y = startY + row * spacingY;
      const color = ICON_COLORS[i % ICON_COLORS.length];

      const c = new Container();
      c.label = `icon-${ICON_LABELS[i]}`;
      c.position.set(x, y);

      const iconGfx = new Graphics()
        .roundRect(0, 0, ICON_SIZE, ICON_SIZE, 10)
        .fill(color)
        .roundRect(0, 0, ICON_SIZE, ICON_SIZE, 10)
        .stroke({ color: 0xffffff, width: 2, alpha: 0.5 });
      c.addChild(iconGfx);

      const labelStyle = new TextStyle({ fontSize: 11, fill: 0xffffff, fontFamily: 'sans-serif', align: 'center' });
      const label = new Text({ text: ICON_LABELS[i], style: labelStyle });
      label.anchor.set(0.5, 0);
      label.position.set(ICON_SIZE / 2, ICON_SIZE + 4);
      c.addChild(label);

      this.container.addChild(c);
      this.elements.push({
        container: c, gfx: iconGfx, type: 'icon',
        health: 1, maxHealth: 1, destroyed: false,
        x, y, width: ICON_SIZE, height: ICON_SIZE, label: ICON_LABELS[i],
      });
    }
  }

  private buildWindows(): void {
    const windows = [
      { x: 250, y: 60, w: 400, h: 280, title: 'My Document.txt' },
      { x: 350, y: 180, w: 350, h: 240, title: 'Budget.xlsx' },
      { x: 500, y: 40, w: 300, h: 200, title: 'Vacation Photos' },
    ];

    windows.forEach((win, i) => {
      const c = new Container();
      c.label = `window-${win.title}`;
      c.position.set(win.x, win.y);

      const titleBarH = 32;
      const titleColor = TITLEBAR_COLORS[i % TITLEBAR_COLORS.length];
      const bodyColor = WINDOW_COLORS[i % WINDOW_COLORS.length];

      // Window body
      const body = new Graphics()
        .roundRect(0, 0, win.w, win.h, 8)
        .fill(bodyColor)
        .roundRect(0, 0, win.w, win.h, 8)
        .stroke({ color: 0xcccccc, width: 1 });
      c.addChild(body);

      // Title bar
      const titleBar = new Graphics()
        .roundRect(0, 0, win.w, titleBarH, 8)
        .fill(titleColor);
      // Square off bottom corners
      titleBar.rect(0, titleBarH - 8, win.w, 8).fill(titleColor);
      c.addChild(titleBar);

      // Title text
      const titleStyle = new TextStyle({ fontSize: 13, fill: 0xffffff, fontFamily: 'sans-serif' });
      const titleText = new Text({ text: win.title, style: titleStyle });
      titleText.position.set(10, 7);
      c.addChild(titleText);

      // Close button (red circle)
      const closeBtn = new Graphics()
        .circle(win.w - 18, titleBarH / 2, 8)
        .fill(0xff4444);
      c.addChild(closeBtn);

      // Fake content lines
      const contentGfx = new Graphics();
      for (let line = 0; line < 6; line++) {
        const lineW = 60 + Math.random() * (win.w - 100);
        contentGfx.rect(15, titleBarH + 15 + line * 22, lineW, 10).fill({ color: 0x000000, alpha: 0.15 });
      }
      c.addChild(contentGfx);

      this.container.addChild(c);
      this.elements.push({
        container: c, gfx: body, type: 'window',
        health: 2, maxHealth: 2, destroyed: false,
        x: win.x, y: win.y, width: win.w, height: win.h, label: win.title,
      });
    });
  }

  /** Find the nearest alive element to a point */
  getElementAt(x: number, y: number): DesktopElement | null {
    // First: check if point is inside any element
    for (let i = this.elements.length - 1; i >= 0; i--) {
      const el = this.elements[i];
      if (el.destroyed) continue;
      if (x >= el.x && x <= el.x + el.width && y >= el.y && y <= el.y + el.height) {
        return el;
      }
    }
    return null;
  }

  /** Get a random alive element */
  getRandomAlive(): DesktopElement | null {
    const alive = this.elements.filter(e => !e.destroyed);
    if (alive.length === 0) return null;
    return alive[Math.floor(Math.random() * alive.length)];
  }

  /** Get destruction progress 0-1 */
  get destructionProgress(): number {
    const totalHealth = this.elements.reduce((sum, e) => sum + e.maxHealth, 0);
    const currentHealth = this.elements.reduce((sum, e) => sum + e.health, 0);
    return 1 - (currentHealth / totalHealth);
  }

  get allDestroyed(): boolean {
    return this.elements.every(e => e.destroyed);
  }
}
```

- [ ] **Step 2: Wire desktop into main.ts**

```typescript
import { DesktopRenderer } from './desktop';

// ... after particles:
const desktop = new DesktopRenderer(app.stage, app.screen.width, app.screen.height);

// Handle resize
window.addEventListener('resize', () => {
  desktop.resize(app.screen.width, app.screen.height);
});
```

- [ ] **Step 3: Verify** — you should see a fake desktop with icons, windows, and taskbar

Run: dev server should hot-reload
Expected: Blue wallpaper, 8 desktop icons, 3 windows, taskbar at bottom

- [ ] **Step 4: Commit**

```bash
git add prototypes/desk-smash/src/desktop.ts prototypes/desk-smash/src/main.ts
git commit -m "proto: add fake desktop renderer with icons, windows, taskbar"
```

---

### Task 6: Destruction Effects

**Files:**
- Create: `prototypes/desk-smash/src/effects.ts`

5 destruction effects that combine visual animation + particles + sound. Each effect is a function that takes a desktop element and "destroys" it with flair.

- [ ] **Step 1: Create effects.ts**

```typescript
// PROTOTYPE - NOT FOR PRODUCTION
// Question: Is keyboard-mashing a fake desktop with destruction effects fun?
// Date: 2026-03-28

import { Container } from 'pixi.js';
import { DesktopElement } from './desktop';
import { ParticleManager } from './particles';
import { AudioEngine } from './audio-engine';
import { SafetyLimiter } from './safety-limiter';

type EffectFn = (el: DesktopElement, particles: ParticleManager, audio: AudioEngine) => void;

function getCenterX(el: DesktopElement): number {
  return el.x + el.width / 2;
}

function getCenterY(el: DesktopElement): number {
  return el.y + el.height / 2;
}

/** Effect 1: Crack — element shakes and gets semi-transparent, crack particles */
function crackEffect(el: DesktopElement, particles: ParticleManager, audio: AudioEngine): void {
  audio.play('crack');
  const cx = getCenterX(el);
  const cy = getCenterY(el);
  particles.emit(cx, cy, 8, { speed: 100, gravity: 0, life: 0.4, spread: Math.PI * 2, scale: 0.5 });

  // Shake animation
  const origX = el.container.x;
  const origY = el.container.y;
  let shakeTime = 0;
  const shakeDuration = 0.3;

  const shakeInterval = setInterval(() => {
    shakeTime += 0.016;
    if (shakeTime >= shakeDuration) {
      el.container.x = origX;
      el.container.y = origY;
      clearInterval(shakeInterval);
      return;
    }
    el.container.x = origX + (Math.random() - 0.5) * 10;
    el.container.y = origY + (Math.random() - 0.5) * 10;
  }, 16);

  el.container.alpha = Math.max(0.3, el.container.alpha - 0.3);
}

/** Effect 2: Shatter — element breaks apart, pieces fly off */
function shatterEffect(el: DesktopElement, particles: ParticleManager, audio: AudioEngine): void {
  audio.play('crack');
  const cx = getCenterX(el);
  const cy = getCenterY(el);
  particles.emit(cx, cy, 20, { speed: 400, gravity: 600, life: 1.0, spread: Math.PI, scale: 1.2 });
  el.container.visible = false;
}

/** Effect 3: Bounce — element flies up and off screen */
function bounceEffect(el: DesktopElement, particles: ParticleManager, audio: AudioEngine): void {
  audio.play('boing');
  const cx = getCenterX(el);
  const cy = getCenterY(el);
  particles.emit(cx, cy, 6, { speed: 150, gravity: 200, life: 0.5, scale: 0.8 });

  // Animate flying off
  let vy = -800;
  const animInterval = setInterval(() => {
    vy += 30;
    el.container.y += vy * 0.016;
    el.container.rotation += 0.2;
    el.container.scale.x *= 0.98;
    el.container.scale.y *= 0.98;
    if (el.container.y > window.innerHeight + 200) {
      clearInterval(animInterval);
      el.container.visible = false;
    }
  }, 16);
}

/** Effect 4: Explode — radial particle burst, element vanishes */
function explodeEffect(el: DesktopElement, particles: ParticleManager, audio: AudioEngine): void {
  audio.play('pop');
  const cx = getCenterX(el);
  const cy = getCenterY(el);
  particles.emit(cx, cy, 30, { speed: 500, gravity: 200, life: 0.8, spread: Math.PI * 2, scale: 1.5 });
  el.container.visible = false;
}

/** Effect 5: Inflate & Pop — element scales up then bursts into confetti */
function inflatePop(el: DesktopElement, particles: ParticleManager, audio: AudioEngine): void {
  const cx = getCenterX(el);
  const cy = getCenterY(el);

  // Inflate phase
  let inflateTime = 0;
  const inflateDuration = 0.3;
  const origScaleX = el.container.scale.x;
  const origScaleY = el.container.scale.y;

  const inflateInterval = setInterval(() => {
    inflateTime += 0.016;
    const t = inflateTime / inflateDuration;
    el.container.scale.set(origScaleX * (1 + t * 1.5), origScaleY * (1 + t * 1.5));

    if (inflateTime >= inflateDuration) {
      clearInterval(inflateInterval);
      // Pop!
      audio.play('pop');
      particles.emit(cx, cy, 25, { speed: 350, gravity: 300, life: 1.0, spread: Math.PI * 2, scale: 1.0 });
      el.container.visible = false;
    }
  }, 16);

  audio.play('boing'); // Inflate sound
}

const EFFECTS: EffectFn[] = [crackEffect, shatterEffect, bounceEffect, explodeEffect, inflatePop];

export class DestructionEffects {
  private particles: ParticleManager;
  private audio: AudioEngine;
  private safety: SafetyLimiter;

  constructor(particles: ParticleManager, audio: AudioEngine, safety: SafetyLimiter) {
    this.particles = particles;
    this.audio = audio;
    this.safety = safety;
  }

  /** Apply a random destruction effect to an element */
  applyRandom(el: DesktopElement): void {
    if (el.destroyed) return;

    el.health--;
    if (el.health <= 0) {
      el.destroyed = true;
      // Full destruction — dramatic effect
      const effect = EFFECTS[Math.floor(Math.random() * EFFECTS.length)];
      // Skip crack for final hit — it's too subtle
      const finalEffects = EFFECTS.filter(e => e !== crackEffect);
      const finalEffect = finalEffects[Math.floor(Math.random() * finalEffects.length)];
      finalEffect(el, this.particles, this.audio);
    } else {
      // Partial damage — always crack
      crackEffect(el, this.particles, this.audio);
    }
  }
}
```

- [ ] **Step 2: Wire effects into main.ts**

```typescript
import { DestructionEffects } from './effects';

// ... after desktop:
const effects = new DestructionEffects(particles, audio, safety);
```

- [ ] **Step 3: Commit**

```bash
git add prototypes/desk-smash/src/effects.ts prototypes/desk-smash/src/main.ts
git commit -m "proto: add 5 destruction effects (crack, shatter, bounce, explode, inflate-pop)"
```

---

### Task 7: Input Capture + Parent Lock

**Files:**
- Create: `prototypes/desk-smash/src/input-capture.ts`
- Create: `prototypes/desk-smash/src/parent-lock.ts`

- [ ] **Step 1: Create input-capture.ts**

```typescript
// PROTOTYPE - NOT FOR PRODUCTION
// Question: Is keyboard-mashing a fake desktop with destruction effects fun?
// Date: 2026-03-28

export type InputHandler = (type: 'key' | 'click', x: number, y: number) => void;

// Keys to block from reaching the browser
const BLOCKED_KEYS = new Set([
  'Escape', 'F1', 'F2', 'F3', 'F4', 'F5', 'F6', 'F7', 'F8', 'F9', 'F10', 'F11', 'F12',
  'Tab', 'Meta', 'ContextMenu',
]);

export class InputCapture {
  private handlers: InputHandler[] = [];
  private keyListeners: ((key: string) => void)[] = [];
  private enabled = true;

  constructor(canvas: HTMLCanvasElement) {
    // Keyboard
    window.addEventListener('keydown', (e) => {
      e.preventDefault();
      e.stopPropagation();
      if (!this.enabled) return;

      // Notify raw key listeners (for parent lock)
      for (const listener of this.keyListeners) {
        listener(e.key);
      }

      // Notify input handlers
      // Use center of screen for keyboard hits (no mouse position)
      const cx = window.innerWidth / 2 + (Math.random() - 0.5) * window.innerWidth * 0.6;
      const cy = window.innerHeight / 2 + (Math.random() - 0.5) * window.innerHeight * 0.6;
      for (const handler of this.handlers) {
        handler('key', cx, cy);
      }
    }, { capture: true });

    // Block key combos
    window.addEventListener('keydown', (e) => {
      // Block Ctrl/Cmd combos
      if (e.ctrlKey || e.metaKey) {
        // Allow Ctrl+Shift+Q for parent unlock (handled by parent-lock)
        if (e.shiftKey && e.key === 'Q') return;
        e.preventDefault();
      }
      if (BLOCKED_KEYS.has(e.key)) e.preventDefault();
    }, { capture: true });

    // Mouse click
    canvas.addEventListener('mousedown', (e) => {
      e.preventDefault();
      if (!this.enabled) return;
      for (const handler of this.handlers) {
        handler('click', e.clientX, e.clientY);
      }
    });

    canvas.addEventListener('mousemove', (e) => {
      e.preventDefault();
    });

    // Block right-click context menu
    window.addEventListener('contextmenu', (e) => e.preventDefault());

    // Block beforeunload (warn on accidental close)
    window.addEventListener('beforeunload', (e) => {
      if (this.enabled) {
        e.preventDefault();
        return '';
      }
    });
  }

  onInput(handler: InputHandler): void {
    this.handlers.push(handler);
  }

  onKeyRaw(listener: (key: string) => void): void {
    this.keyListeners.push(listener);
  }

  disable(): void {
    this.enabled = false;
  }

  enable(): void {
    this.enabled = true;
  }
}
```

- [ ] **Step 2: Create parent-lock.ts**

```typescript
// PROTOTYPE - NOT FOR PRODUCTION
// Question: Is keyboard-mashing a fake desktop with destruction effects fun?
// Date: 2026-03-28

import { Graphics } from 'pixi.js';
import type { Container } from 'pixi.js';

const UNLOCK_KEYWORD = 'exit';
const COMBO_HOLD_MS = 3000;
const KEYWORD_TIMEOUT_MS = 3000;

export class ParentLock {
  private keywordBuffer = '';
  private keywordTimer: ReturnType<typeof setTimeout> | null = null;
  private comboHeldSince: number | null = null;
  private dot: Graphics;
  private onUnlock: () => void;
  private progress = 0;

  constructor(parent: Container, screenW: number, screenH: number, onUnlock: () => void) {
    this.onUnlock = onUnlock;

    // Subtle indicator dot
    this.dot = new Graphics()
      .circle(0, 0, 4)
      .fill(0xffffff);
    this.dot.position.set(screenW - 12, screenH - 12);
    this.dot.alpha = 0.08;
    parent.addChild(this.dot);
  }

  handleKey(key: string): void {
    // Check keyword sequence
    this.checkKeyword(key);

    // Check combo hold (Ctrl+Shift+Q)
    // This is tracked separately via keydown/keyup in the wiring
  }

  private checkKeyword(key: string): void {
    // Only single printable characters
    if (key.length !== 1) return;

    const lowerKey = key.toLowerCase();
    const expectedChar = UNLOCK_KEYWORD[this.keywordBuffer.length];

    if (lowerKey === expectedChar) {
      this.keywordBuffer += lowerKey;

      // Reset timeout
      if (this.keywordTimer) clearTimeout(this.keywordTimer);
      this.keywordTimer = setTimeout(() => {
        this.keywordBuffer = '';
        this.updateDot();
      }, KEYWORD_TIMEOUT_MS);

      if (this.keywordBuffer === UNLOCK_KEYWORD) {
        this.triggerUnlock();
        return;
      }
    } else {
      // Wrong key — reset
      this.keywordBuffer = '';
      if (this.keywordTimer) {
        clearTimeout(this.keywordTimer);
        this.keywordTimer = null;
      }
    }

    this.updateDot();
  }

  startComboHold(): void {
    if (this.comboHeldSince === null) {
      this.comboHeldSince = performance.now();
    }
  }

  endComboHold(): void {
    this.comboHeldSince = null;
    this.updateDot();
  }

  /** Call every frame to check combo hold progress */
  update(): void {
    if (this.comboHeldSince !== null) {
      const held = performance.now() - this.comboHeldSince;
      this.progress = Math.min(1, held / COMBO_HOLD_MS);
      this.updateDot();

      if (held >= COMBO_HOLD_MS) {
        this.triggerUnlock();
      }
    } else {
      // Keyword progress
      this.progress = this.keywordBuffer.length / UNLOCK_KEYWORD.length;
    }
  }

  private updateDot(): void {
    const keywordProgress = this.keywordBuffer.length / UNLOCK_KEYWORD.length;
    const comboProgress = this.comboHeldSince
      ? Math.min(1, (performance.now() - this.comboHeldSince) / COMBO_HOLD_MS)
      : 0;
    const p = Math.max(keywordProgress, comboProgress);
    this.dot.alpha = 0.08 + p * 0.92; // 0.08 → 1.0
  }

  private triggerUnlock(): void {
    this.onUnlock();
  }
}
```

- [ ] **Step 3: Commit**

```bash
git add prototypes/desk-smash/src/input-capture.ts prototypes/desk-smash/src/parent-lock.ts
git commit -m "proto: add input capture with key blocking and parent lock with dual unlock"
```

---

### Task 8: Wire Everything Together

**Files:**
- Modify: `prototypes/desk-smash/src/main.ts`

This is the final assembly — connecting all systems into the game loop.

- [ ] **Step 1: Rewrite main.ts with full orchestration**

```typescript
// PROTOTYPE - NOT FOR PRODUCTION
// Question: Is keyboard-mashing a fake desktop with destruction effects fun?
// Date: 2026-03-28

import { Application, Text, TextStyle, Container } from 'pixi.js';
import { SafetyLimiter } from './safety-limiter';
import { AudioEngine } from './audio-engine';
import { ParticleManager } from './particles';
import { DesktopRenderer } from './desktop';
import { DestructionEffects } from './effects';
import { InputCapture } from './input-capture';
import { ParentLock } from './parent-lock';

async function main() {
  // === App Shell ===
  const app = new Application();
  await app.init({
    background: '#2b5797',
    resizeTo: window,
    antialias: true,
    autoDensity: true,
    resolution: window.devicePixelRatio || 1,
  });
  document.body.appendChild(app.canvas);

  // === Foundation Systems ===
  const safety = new SafetyLimiter();
  const audio = new AudioEngine(safety);

  // === Desktop Layer (below particles) ===
  const desktop = new DesktopRenderer(app.stage, app.screen.width, app.screen.height);

  // === Particle Layer (above desktop) ===
  const particles = new ParticleManager(app.stage, safety);

  // === UI Layer (above everything) ===
  const uiLayer = new Container();
  uiLayer.label = 'ui';
  app.stage.addChild(uiLayer);

  // === Destruction Effects ===
  const effects = new DestructionEffects(particles, audio, safety);

  // === Input Capture ===
  const input = new InputCapture(app.canvas as HTMLCanvasElement);

  // Ensure AudioContext on first input (browser autoplay policy)
  let audioStarted = false;

  // === Handle destruction on input ===
  input.onInput((type, x, y) => {
    // Start audio context on first input
    if (!audioStarted) {
      audio.ensureContext();
      audioStarted = true;
      // Enter fullscreen on first input
      app.canvas.requestFullscreen?.().catch(() => {});
    }

    let target;
    if (type === 'click') {
      // Click: target element under cursor, or random if empty space
      target = desktop.getElementAt(x, y) ?? desktop.getRandomAlive();
    } else {
      // Key: target random element
      target = desktop.getRandomAlive();
    }

    if (target) {
      effects.applyRandom(target);
    } else {
      // All destroyed — just emit particles for fun
      particles.emit(x, y, 15, { speed: 300, gravity: 400, life: 0.6 });
      audio.playRandom();
    }
  });

  // === Parent Lock ===
  let unlocked = false;

  const parentLock = new ParentLock(
    uiLayer,
    app.screen.width,
    app.screen.height,
    () => {
      unlocked = true;
      input.disable();
      // Exit fullscreen
      document.exitFullscreen?.().catch(() => {});
      // Show goodbye message
      const style = new TextStyle({
        fontSize: 48,
        fill: 0xffffff,
        fontFamily: 'sans-serif',
        align: 'center',
        dropShadow: { color: 0x000000, distance: 3, blur: 5 },
      });
      const bye = new Text({ text: 'Bye bye! 👋', style });
      bye.anchor.set(0.5);
      bye.position.set(app.screen.width / 2, app.screen.height / 2);
      uiLayer.addChild(bye);
    }
  );

  // Wire parent lock to raw key events
  input.onKeyRaw((key) => {
    parentLock.handleKey(key);
  });

  // Track Ctrl+Shift+Q combo hold
  let ctrlHeld = false;
  let shiftHeld = false;
  let qHeld = false;
  window.addEventListener('keydown', (e) => {
    if (e.key === 'Control') ctrlHeld = true;
    if (e.key === 'Shift') shiftHeld = true;
    if (e.key === 'q' || e.key === 'Q') qHeld = true;
    if (ctrlHeld && shiftHeld && qHeld) parentLock.startComboHold();
  }, { capture: true });
  window.addEventListener('keyup', (e) => {
    if (e.key === 'Control') ctrlHeld = false;
    if (e.key === 'Shift') shiftHeld = false;
    if (e.key === 'q' || e.key === 'Q') qHeld = false;
    if (!(ctrlHeld && shiftHeld && qHeld)) parentLock.endComboHold();
  }, { capture: true });

  // === FPS counter (debug, top-left, tiny) ===
  const fpsStyle = new TextStyle({ fontSize: 10, fill: 0xffffff, fontFamily: 'monospace' });
  const fpsText = new Text({ text: 'FPS: 0', style: fpsStyle });
  fpsText.position.set(4, 4);
  fpsText.alpha = 0.4;
  uiLayer.addChild(fpsText);

  // === Game Loop ===
  app.ticker.add((ticker) => {
    if (unlocked) return;

    const dt = ticker.deltaTime / 60; // seconds
    particles.update(dt);
    parentLock.update();

    // FPS display
    fpsText.text = `FPS: ${Math.round(ticker.FPS)} | Particles: ${particles.activeCount} | Destroyed: ${Math.round(desktop.destructionProgress * 100)}%`;
  });

  console.log('Desk Smasher prototype running!');
  console.log('Smash the keyboard! Click the desktop!');
  console.log('Type "exit" or hold Ctrl+Shift+Q to quit.');
}

main().catch(console.error);
```

- [ ] **Step 2: Verify the full prototype runs**

Run: `cd prototypes/desk-smash && npx vite --host`
Expected:
- Fake desktop with icons, windows, and taskbar
- Every keypress destroys a random element with particles + sound
- Every click destroys the element under cursor
- FPS counter in top-left
- Typing "exit" shows goodbye screen
- Ctrl+Shift+Q held for 3 seconds also exits

- [ ] **Step 3: Commit**

```bash
git add prototypes/desk-smash/src/main.ts
git commit -m "proto: wire all systems together — playable desk-smash prototype"
```

---

### Task 9: Prototype Report

**Files:**
- Create: `prototypes/desk-smash/REPORT.md`

- [ ] **Step 1: Test the prototype thoroughly**

Play the prototype for 5+ minutes. Note:
- Does every key produce satisfying feedback?
- Are the destruction effects varied enough?
- Do the procedural sounds feel fun?
- Is the FPS stable at 60?
- Does the parent lock work reliably?
- Any crashes or visual glitches?

- [ ] **Step 2: Write REPORT.md with observations**

Fill in the template from the `/prototype` skill with actual test results.

- [ ] **Step 3: Commit**

```bash
git add prototypes/desk-smash/REPORT.md
git commit -m "proto: add desk-smash prototype report with test results"
```
