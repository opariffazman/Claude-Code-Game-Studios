# PixiJS v8 — Key New Features

Last verified: 2026-03-28 | Version: 8.17.0

Features that did NOT exist in v7 and are unique to v8. The model has no knowledge
of these — agents must consult this document when building with PixiJS v8.

---

## 1. WebGPU Renderer

PixiJS v8 is one of the first 2D libraries to ship a production WebGPU renderer
alongside the existing WebGL renderer.

### Usage

```typescript
const app = new Application();

// Auto-detect (default: WebGL, falls back if WebGPU unavailable)
await app.init({ width: 800, height: 600 });

// Prefer WebGPU (auto-falls back to WebGL if unavailable)
await app.init({ preference: 'webgpu' });

// Force specific renderer
await app.init({ preference: 'webgl' });
```

### When WebGPU Helps

- Scenes with many batch breaks (filters, masks, blend modes)
- GPU-heavy workloads
- Future-proofing for next-gen browser capabilities

### When WebGL is Fine

- Simple sprite-heavy scenes
- Maximum browser compatibility needed
- No significant batch-breaking effects

### Browser Support (as of 2026)

| Browser | WebGPU Status |
|---------|--------------|
| Chrome / Edge | Stable — production ready |
| Firefox | Partial — behind flag or limited |
| Safari | Partial — macOS/iOS with caveats |

**Always use auto-detection** — never hard-code WebGPU without a fallback path.

### Dual-Renderer Shaders

Custom shaders can support both renderers:

```typescript
import { Filter, GlProgram, GpuProgram } from 'pixi.js';

const myFilter = new Filter({
    glProgram: new GlProgram({ vertex: glslVertex, fragment: glslFragment }),
    gpuProgram: new GpuProgram({ vertex: wgslVertex, fragment: wgslFragment }),
    resources: { ... },
});
```

---

## 2. RenderGroups

GPU-accelerated container transforms. Offloads position, scale, rotation, tint,
and alpha calculations to the GPU for entire subtrees.

```typescript
import { Container } from 'pixi.js';

const gameWorld = new Container({ isRenderGroup: true });
const hud = new Container({ isRenderGroup: true });

app.stage.addChild(gameWorld, hud);
```

### Performance Benchmarks

Bunnymark with 100,000 sprites:
- All moving: v7 ~50ms CPU → v8 ~15ms CPU (233% faster)
- Stationary: v7 ~21ms CPU → v8 ~0.12ms CPU (17,400% faster)

The stationary case demonstrates RenderGroup power — when transforms don't change,
the GPU handles everything with near-zero CPU cost.

### Best Practices

- Use for logical scene partitions (game world, HUD, background)
- Use for camera systems (move the RenderGroup container)
- Do NOT overuse — each RenderGroup has overhead
- Profile before adding — most apps need 0-3 RenderGroups

---

## 3. RenderLayers

Decouple visual draw order from scene graph hierarchy. Objects maintain parent
transforms but render at the layer's position in the tree.

```typescript
import { RenderLayer, Container, Sprite } from 'pixi.js';

const worldLayer = new RenderLayer();
const effectsLayer = new RenderLayer();
const uiLayer = new RenderLayer();

app.stage.addChild(worldLayer, effectsLayer, uiLayer);

// Health bar is a child of enemy (moves with it)
// but renders in UI layer (above everything)
enemy.addChild(healthBar);
uiLayer.attach(healthBar);
```

### Use Cases

- Health bars above all world objects
- Damage numbers in effects layer
- Tutorial highlights with dimmed backgrounds
- Tooltips that always render on top

### Important Gotchas

- Objects must be manually re-attached after being removed from scene graph
- Minimize layer count for performance
- `attach()` and `detach()` are the primary API

---

## 4. GraphicsContext (Shared Geometry)

Reusable geometry objects that multiple Graphics instances can share.

```typescript
import { Graphics, GraphicsContext } from 'pixi.js';

// Define geometry once
const bulletShape = new GraphicsContext()
    .circle(0, 0, 5)
    .fill(0xffff00);

// Reuse across many instances — no geometry duplication
for (let i = 0; i < 1000; i++) {
    const bullet = new Graphics(bulletShape);
    bullet.position.set(Math.random() * 800, Math.random() * 600);
    stage.addChild(bullet);
}
```

### Animation via Context Swapping

```typescript
// Pre-build animation frames as contexts
const walkFrames = [
    new GraphicsContext().rect(-10, -20, 20, 40).fill(0xff0000),
    new GraphicsContext().rect(-10, -20, 20, 40).fill(0x00ff00),
    new GraphicsContext().rect(-10, -20, 20, 40).fill(0x0000ff),
];

const character = new Graphics(walkFrames[0]);
let frame = 0;

app.ticker.add(() => {
    frame = (frame + 1) % walkFrames.length;
    character.context = walkFrames[frame]; // Swap — zero rebuild cost
});
```

---

## 5. SVG Path Support in Graphics

Draw SVG paths directly in the Graphics API.

```typescript
const shape = new Graphics().svg(`
    <svg>
        <path d="M 10 80 C 40 10, 65 10, 95 80 S 150 150, 180 80"
              stroke="blue" fill="none" stroke-width="2" />
    </svg>
`);
```

**Limitation**: Complex SVG hole geometries may render inaccurately due to
PixiJS's performance-optimized triangulation.

---

## 6. GraphicsPath and Geometry Building

Create reusable path objects and convert them to mesh geometry.

```typescript
import { GraphicsPath, buildGeometryFromPath } from 'pixi.js';

const path = new GraphicsPath()
    .moveTo(0, 0)
    .lineTo(100, 0)
    .lineTo(50, 80)
    .closePath();

// Convert path to renderable geometry
const geometry = buildGeometryFromPath(path);
```

---

## 7. Inherited Blend Modes and Tints

In v8, blend modes and tints propagate to children (like alpha and transforms
always did).

```typescript
const container = new Container();
container.tint = 0xff0000;  // All children tinted red
container.blendMode = 'multiply';  // All children use multiply blend

const child = new Sprite(texture);
container.addChild(child); // child inherits tint and blend mode
```

---

## 8. Advanced Blend Modes

Photoshop-style blend modes available as an opt-in import.

```typescript
import 'pixi.js/advanced-blend-modes';

sprite.blendMode = 'color-burn';
sprite.blendMode = 'color-dodge';
sprite.blendMode = 'darken';
sprite.blendMode = 'divide';
sprite.blendMode = 'hard-mix';
sprite.blendMode = 'linear-burn';
sprite.blendMode = 'linear-dodge';
sprite.blendMode = 'linear-light';
sprite.blendMode = 'overlay';
sprite.blendMode = 'pin-light';
sprite.blendMode = 'soft-light';
sprite.blendMode = 'subtract';
// ... and more
```

---

## 9. Antialiased RenderTextures

Simple antialiasing for render-to-texture operations.

```typescript
import { RenderTexture } from 'pixi.js';

const texture = RenderTexture.create({
    width: 256,
    height: 256,
    antialias: true,  // New in v8 — simple flag
});
```

---

## 10. DOMAdapter System

Abstract DOM operations for use in Web Workers and Node.js environments.

```typescript
import { DOMAdapter, WebWorkerAdapter } from 'pixi.js';

// For Web Worker rendering
DOMAdapter.set(WebWorkerAdapter);

// Access DOM-like operations
const canvas = DOMAdapter.get().createCanvas(800, 600);
```

---

## 11. Extension-Based Architecture

v8 uses an extension system for opt-in features, reducing bundle size when
features are unused. Tree-shaking removes unused code automatically.

```typescript
// Only import what you need — unused systems are tree-shaken
import { Application, Sprite, Graphics } from 'pixi.js';

// Explicitly opt into optional systems:
import 'pixi.js/advanced-blend-modes';  // ~5KB
import 'pixi.js/accessibility';          // ~8KB
```

---

## 12. Improved Text System

### Dynamic BitmapText

BitmapText now generates glyphs on demand instead of requiring all characters
to be pre-rendered. Memory-efficient and layout matches standard text rendering.

### Gradient and Texture Fills for Text

```typescript
const text = new Text({
    text: 'Fancy Text',
    style: {
        fontSize: 48,
        fill: { texture: goldTexture, color: 0xffcc00 },
        stroke: { width: 4, color: 0x000000 },
    },
});
```

### HTMLText Built-In

HTMLText is now a first-class citizen, not a separate package:

```typescript
import { HTMLText } from 'pixi.js';

const richText = new HTMLText({
    text: 'Press <b>SPACE</b> to <span style="color: gold">jump</span>',
    style: { fontSize: 24 },
});
```

---

## 13. cacheAsTexture

Replaces the old `cacheAsBitmap`. Renders a container to a texture for
performance with complex static content.

```typescript
// Cache a complex UI panel
const panel = new Container();
// ... add many children ...
panel.cacheAsTexture(true);

// Disable caching when content changes
panel.cacheAsTexture(false);
// ... make changes ...
panel.cacheAsTexture(true);  // Re-cache
```

---

## 14. visibleChanged Event (v8.17.0)

Containers emit events when visibility changes — no more manual polling.

```typescript
sprite.on('visibleChanged', (visible) => {
    if (visible) {
        // Start animations, enable logic
    } else {
        // Pause animations, disable logic
    }
});

sprite.visible = false; // Triggers visibleChanged event
```

---

## 15. SplitText with tagStyles (v8.17.0)

Per-character text animation while preserving inline styling.

```typescript
import { SplitText } from 'pixi.js';

// tagStyles preserves <b>, <i>, color spans during character splitting
const splitText = new SplitText({
    text: 'Hello <b>World</b>',
    style: { fontSize: 32 },
    tagStyles: true,  // New in v8.17.0
});
```

---

## 16. Texture Garbage Collection

Automatic cleanup of unused textures via `TextureGCSystem`.

- Textures unused for 3600 frames (default) are automatically unloaded from GPU
- Configurable via renderer options
- Prevents GPU memory leaks in long-running applications

---

## 17. Ecosystem Libraries (v8 Compatible)

| Library | Purpose | Status |
|---------|---------|--------|
| `@pixi/react` | React 19+ component bindings | v8 compatible |
| `pixi-layout` v3 | Flexbox-style layout (Yoga engine) | v8 compatible |
| `@pixi/spine` | Skeletal animation (Spine) | v8 compatible |
| `@pixi/ui` | Buttons, sliders, progress bars, lists | v8 compatible |
| `pixi-filters` | Community filter collection | v8 compatible (new import paths) |
| `assetpack` | Asset optimization and bundling | v8 compatible |
| PixiJS DevTools | Browser extension for debugging | v8 compatible |
