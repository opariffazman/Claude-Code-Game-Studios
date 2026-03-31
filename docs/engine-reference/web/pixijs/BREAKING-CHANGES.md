# PixiJS v7 → v8 — Complete Breaking Changes Reference

Last verified: 2026-03-28 | Version: 8.17.0

PixiJS v8 is a **complete rewrite**. Every v7 pattern must be verified against this
document. The model's default suggestions reflect v7 and will be WRONG.

---

## 1. Package Structure

**v7**: Multiple sub-packages (`@pixi/app`, `@pixi/sprite`, `@pixi/graphics`, etc.)
**v8**: Single unified package with tree-shaking support.

```typescript
// v7 (WRONG)
import { Application } from '@pixi/app';
import { Sprite } from '@pixi/sprite';
import { Graphics } from '@pixi/graphics';

// v8 (CORRECT)
import { Application, Sprite, Graphics } from 'pixi.js';
```

All `@pixi/*` packages are removed. Use `pixi.js` for everything.

---

## 2. Application Initialization (CRITICAL)

The Application constructor no longer accepts options. Initialization is async.

```typescript
// v7 (WRONG)
const app = new PIXI.Application({ width: 800, height: 600 });
document.body.appendChild(app.view);

// v8 (CORRECT)
const app = new Application();
await app.init({ width: 800, height: 600 });
document.body.appendChild(app.canvas);
```

Key differences:
- `new Application()` takes NO arguments — call `await app.init(options)` separately
- `app.view` → `app.canvas`
- Canvas element returned from `app.canvas`, not `app.view`
- Type generics changed: `Application<Renderer<HTMLCanvasElement>>` not `Application<HTMLCanvasElement>`

---

## 3. Renderer Creation

```typescript
// v7 (WRONG)
const renderer = new Renderer({ width: 800, height: 600 });

// v8 (CORRECT)
const renderer = await autoDetectRenderer({ width: 800, height: 600 });
```

Renderer creation is now async to support WebGPU initialization.

Type-specific renderers:
```typescript
const renderer = await autoDetectRenderer<WebGLRenderer>({ ... });
const renderer = await autoDetectRenderer<WebGPURenderer>({ ... });
```

---

## 4. Asset Loading (CRITICAL)

The entire `Loader` class is removed. Use the `Assets` API.

```typescript
// v7 (WRONG)
const loader = new PIXI.Loader();
loader.add('hero', 'hero.png');
loader.load((loader, resources) => {
    const sprite = new Sprite(resources.hero.texture);
});

// Also v7 (WRONG)
PIXI.Loader.shared.add('hero', 'hero.png').load(callback);

// v8 (CORRECT)
const texture = await Assets.load('hero.png');
const sprite = new Sprite(texture);
```

### Assets API Changes

```typescript
// v7 (WRONG)
Assets.add('bunny', 'bunny.png');

// v8 (CORRECT)
Assets.add({ alias: 'bunny', src: 'bunny.png' });
```

### Texture.from() Behavior Change

`Texture.from()` no longer loads URLs. The asset must be pre-loaded.

```typescript
// v7 — this would trigger a load (WRONG in v8)
const texture = Texture.from('https://example.com/image.png');

// v8 (CORRECT) — load first, then reference
await Assets.load('https://example.com/image.png');
const texture = Texture.from('https://example.com/image.png');
```

### Removed APIs
- `PIXI.Loader` — gone entirely
- `PIXI.Loader.shared` — gone
- `PIXI.loader` — gone
- `PIXI.utils.TextureCache` — use `Assets.cache`
- `resources.name.texture` pattern — `Assets.load()` returns textures directly

---

## 5. Texture System (CRITICAL)

`BaseTexture` is completely removed. Replaced by `TextureSource` subclasses.

```typescript
// v7 (WRONG)
const baseTexture = new BaseTexture(image);
const texture = new Texture(baseTexture);

// v8 (CORRECT)
const source = new ImageSource({ resource: image });
const texture = new Texture({ source });
```

### TextureSource Types

| v8 Class | Purpose |
|----------|---------|
| `ImageSource` | HTMLImageElement, ImageBitmap, SVGs, VideoFrame |
| `CanvasSource` | HTMLCanvasElement, OffscreenCanvas |
| `VideoSource` | HTMLVideoElement with auto-play/FPS options |
| `BufferImageSource` | TypedArray/ArrayBuffer with dimensions and format |
| `CompressedSource` | Compressed mipmap arrays (Uint8Array[]) |

### Mipmap Changes

```typescript
// v7 (WRONG)
baseTexture.mipmap = MIPMAP_MODES.ON;

// v8 (CORRECT)
const texture = RenderTexture.create({
    width: 100,
    height: 100,
    autoGenerateMipmaps: true,
});
renderer.render({ target: texture, container: scene });
texture.source.updateMipmaps(); // Manual update required after render
```

### Texture UV Updates

Textures no longer auto-notify sprites when UV data changes.

```typescript
// v8 — manual notification required
texture.frame.width = texture.frame.width / 2;
texture.update();
sprite.onViewUpdate(); // Must call this manually
```

---

## 6. Graphics API (CRITICAL — Complete Rewrite)

The entire Graphics API changed from imperative begin/end to SVG-like chain-then-style.

### Pattern Change

```typescript
// v7 pattern: beginFill → draw → endFill (WRONG)
const g = new Graphics();
g.beginFill(0xff0000);
g.drawRect(50, 50, 100, 100);
g.endFill();

// v8 pattern: shape → fill/stroke (CORRECT)
const g = new Graphics();
g.rect(50, 50, 100, 100).fill(0xff0000);
```

### Method Renames

| v7 Method | v8 Method |
|-----------|-----------|
| `drawRect(x, y, w, h)` | `rect(x, y, w, h)` |
| `drawCircle(x, y, r)` | `circle(x, y, r)` |
| `drawEllipse(x, y, w, h)` | `ellipse(x, y, w, h)` |
| `drawPolygon(points)` | `poly(points)` |
| `drawRoundedRect(x, y, w, h, r)` | `roundRect(x, y, w, h, r)` |
| `drawStar(...)` | `star(...)` |
| `drawRegularPolygon(...)` | `regularPoly(...)` |
| `drawRoundedPolygon(...)` | `roundPoly(...)` |
| `drawChamferRect(...)` | `chamferRect(...)` |
| `drawFilletRect(...)` | `filletRect(...)` |
| `drawRoundedShape(...)` | `roundShape(...)` |

### Fill and Stroke Changes

```typescript
// v7 (WRONG)
g.beginFill(0xffff00, 0.5);
g.beginTextureFill({ texture: Texture.WHITE, alpha: 0.5 });
g.lineStyle(2, 0xfeeb77);
g.lineTextureStyle({ texture: Texture.WHITE, width: 10 });

// v8 (CORRECT)
g.rect(0, 0, 100, 100).fill({ color: 0xffff00, alpha: 0.5 });
g.rect(0, 0, 100, 100).fill({ texture: Texture.WHITE, alpha: 0.5 });
g.rect(0, 0, 100, 100).stroke({ color: 0xfeeb77, width: 2 });
g.rect(0, 0, 100, 100).stroke({ texture: Texture.WHITE, width: 10 });
```

### Holes API

```typescript
// v7 (WRONG)
g.beginFill(0x00ff00);
g.drawRect(0, 0, 100, 100);
g.beginHole();
g.drawCircle(50, 50, 20);
g.endHole();
g.endFill();

// v8 (CORRECT)
g.rect(0, 0, 100, 100)
 .fill(0x00ff00)
 .circle(50, 50, 20)
 .cut();
```

### GraphicsGeometry → GraphicsContext

```typescript
// v7 (WRONG)
const geometry = someGraphics.geometry;
const clone = new Graphics(geometry);

// v8 (CORRECT)
const context = new GraphicsContext()
    .rect(50, 50, 100, 100)
    .fill(0xff0000);
const shapeA = new Graphics(context);
const shapeB = new Graphics(context); // Shares geometry
```

### SVG Support (New in v8)

```typescript
const shape = new Graphics().svg(`
    <svg>
        <path d="M 100 350 q 150 -300 300 0" stroke="blue" />
    </svg>
`);
```

---

## 7. Display Hierarchy

### DisplayObject Removed

`DisplayObject` base class no longer exists. `Container` is now the base.

```typescript
// v7 (WRONG)
import { DisplayObject } from 'pixi.js';
if (obj instanceof DisplayObject) { ... }

// v8 (CORRECT)
import { Container } from 'pixi.js';
if (obj instanceof Container) { ... }
```

### Leaf Nodes Cannot Have Children

In v8, `Sprite`, `Mesh`, `Graphics`, and other leaf nodes no longer accept children.
Only `Container` (and subclasses specifically designed for it) can have children.

### name → label

```typescript
// v7 (WRONG)
container.name = 'myContainer';

// v8 (CORRECT)
container.label = 'myContainer';
```

### cacheAsBitmap → cacheAsTexture

```typescript
// v7 (WRONG)
container.cacheAsBitmap = true;

// v8 (CORRECT)
container.cacheAsTexture(true);
```

### getBounds Return Type

```typescript
// v7 — returns Rectangle directly (WRONG assumption in v8)
const rect = container.getBounds(); // Was Rectangle

// v8 — returns Bounds object, access .rectangle for Rectangle
const bounds = container.getBounds();
const rect = bounds.rectangle;
```

### updateTransform Removed

```typescript
// v7 (WRONG)
class MySprite extends Sprite {
    updateTransform() {
        super.updateTransform();
        this.rotation += 0.01;
    }
}

// v8 (CORRECT)
class MySprite extends Sprite {
    constructor() {
        super();
        this.onRender = this._onRender.bind(this);
    }
    _onRender() {
        this.rotation += 0.01;
    }
}
```

---

## 8. Interaction System (CRITICAL)

### InteractionManager Removed

The entire `InteractionManager` plugin is gone. Events are built into the scene graph.

```typescript
// v7 (WRONG)
import { InteractionManager } from 'pixi.js';
const im = renderer.plugins.interaction;

// v8 — no import needed, events are built in
sprite.eventMode = 'static';
sprite.on('pointerdown', handler);
```

### interactive → eventMode

```typescript
// v7 (WRONG)
sprite.interactive = true;

// v8 (CORRECT)
sprite.eventMode = 'static';  // For non-moving interactive objects
sprite.eventMode = 'dynamic'; // For moving/animated interactive objects
```

### buttonMode Removed

```typescript
// v7 (WRONG)
sprite.buttonMode = true;

// v8 (CORRECT)
sprite.cursor = 'pointer';
```

### Default Event Mode Changed

v7 default: `'auto'`
v8 default: `'passive'`

This means objects are non-interactive by default in v8. You must explicitly set
`eventMode` to make them interactive.

---

## 9. Ticker Callback Signature

```typescript
// v7 (WRONG) — delta passed directly
Ticker.shared.add((dt) => {
    bunny.rotation += dt;
});

// v8 (CORRECT) — ticker object passed, access deltaTime
Ticker.shared.add((ticker) => {
    bunny.rotation += ticker.deltaTime;
});
```

---

## 10. Filter Constructors

All filter constructors now use options objects instead of positional arguments.

```typescript
// v7 (WRONG)
new BlurFilter(8, 4, 1, 5);
new DisplacementFilter(sprite, 5);

// v8 (CORRECT)
new BlurFilter({ blur: 8, quality: 4, resolution: 1, kernelSize: 5 });
new DisplacementFilter({ sprite, scale: 5 });
```

### Custom Filters

```typescript
// v7 (WRONG)
new Filter(vertex, fragment, { uTime: 0.0 });

// v8 (CORRECT)
new Filter({
    glProgram: GlProgram.from({ fragment, vertex }),
    resources: {
        timeUniforms: { uTime: { value: 0.0, type: 'f32' } },
    },
});
```

### Filter Package Imports

```typescript
// v7 (WRONG)
import { AdjustmentFilter } from '@pixi/filter-adjustment';

// v8 (CORRECT)
import { AdjustmentFilter } from 'pixi-filters/adjustment';
```

---

## 11. Shader System

Textures are no longer treated as uniforms. They are "resources". Uniforms require
explicit type declarations.

```typescript
// v7 (WRONG)
const shader = Shader.from(vertex, fragment, uniforms);
const uniformGroup = new UniformGroup({ uTime: 1 });

// v8 (CORRECT)
const shader = Shader.from({
    gl: { vertex, fragment },
    resources: { /* resource definitions */ },
});
const uniformGroup = new UniformGroup({
    uTime: { value: 1, type: 'f32' },
});
```

---

## 12. Text Constructors

```typescript
// v7 (WRONG)
new Text('Hello World', style);
new BitmapText('Hello', { fontName: 'MyFont' });

// v8 (CORRECT)
new Text({ text: 'Hello World', style });
```

Text fills and strokes now support gradients and textures:
```typescript
new Text({
    text: 'hello',
    style: {
        fontFamily: 'Outfit',
        fontSize: 12,
        fill: { texture, color: 'red' },
        stroke: { width: 3, color: 'blue' },
    },
});
```

### Text Parser Renames

| v7 | v8 |
|----|-----|
| `TextFormat` | `bitmapFontTextParser` |
| `XMLStringFormat` | `bitmapFontXMLStringParser` |
| `XMLFormat` | `bitmapFontXMLParser` |

---

## 13. Mesh Class Renames

| v7 | v8 |
|----|-----|
| `SimpleMesh` | `MeshSimple` |
| `SimplePlane` | `MeshPlane` |
| `SimpleRope` | `MeshRope` |
| `NineSlicePlane` | `NineSliceSprite` |

---

## 14. Constructor Pattern Changes (All Classes)

All major constructors switched from positional arguments to options objects:

```typescript
// v7 (WRONG)
new TileSprite(texture, width, height);
new Sprite(texture);

// v8 (CORRECT)
new TileSprite({ texture, width, height });
new Sprite(texture);  // Sprite still accepts texture directly OR options
```

---

## 15. Enum Replacements

Numeric enums replaced with string literals:

| v7 Enum | v8 String |
|---------|-----------|
| `SCALE_MODES.NEAREST` | `'nearest'` |
| `SCALE_MODES.LINEAR` | `'linear'` |
| `WRAP_MODES.CLAMP` | `'clamp-to-edge'` |
| `WRAP_MODES.REPEAT` | `'repeat'` |
| `WRAP_MODES.MIRRORED_REPEAT` | `'mirror-repeat'` |
| `DRAW_MODES.POINTS` | `'point-list'` |
| `DRAW_MODES.LINES` | `'line-list'` |
| `DRAW_MODES.TRIANGLES` | `'triangle-list'` |

---

## 16. ParticleContainer (Complete Redesign)

No longer accepts `Sprite` children. Uses lightweight `Particle` objects.

```typescript
// v7 (WRONG)
const container = new ParticleContainer();
for (let i = 0; i < 100000; i++) {
    const particle = new Sprite(texture);
    container.addChild(particle);
}

// v8 (CORRECT)
const container = new ParticleContainer({
    dynamicProperties: {
        position: true,
        scale: false,
        rotation: false,
        color: false,
    },
});
for (let i = 0; i < 100000; i++) {
    const particle = new Particle({ texture, x: Math.random() * 800, y: Math.random() * 600 });
    container.addParticle(particle);
}
```

Key differences:
- Children stored in `particleChildren` array, not scene graph
- Must use `addParticle()` not `addChild()`
- Must provide `boundsArea` for culling
- Static vs dynamic properties for performance optimization

---

## 17. Culling Changes

Automatic culling removed. Must opt in manually.

```typescript
// v7 — automatic culling in some cases (WRONG assumption in v8)

// v8 (CORRECT) — manual culling
const container = new Container();
container.cullable = true;
container.cullArea = new Rectangle(0, 0, 400, 400);

// In render loop:
Culler.shared.cull(myContainer, viewportRect);
renderer.render(myContainer);
```

---

## 18. Settings Object Removed

```typescript
// v7 (WRONG)
import { settings, BrowserAdapter } from 'pixi.js';
settings.RESOLUTION = 1;
settings.ADAPTER = BrowserAdapter;

// v8 (CORRECT)
import { AbstractRenderer, DOMAdapter, BrowserAdapter } from 'pixi.js';
AbstractRenderer.defaultOptions.resolution = 1;
DOMAdapter.set(BrowserAdapter);
```

### DOMAdapter System

```typescript
// v7 (WRONG)
settings.ADAPTER = WebWorkerAdapter;

// v8 (CORRECT)
DOMAdapter.set(WebWorkerAdapter);
DOMAdapter.get().createCanvas();
```

---

## 19. Utils Module Removed

```typescript
// v7 (WRONG)
import { utils } from 'pixi.js';
utils.isMobile.any();
utils.hex2rgb(0xff0000);

// v8 (CORRECT)
import { isMobile } from 'pixi.js';
isMobile.any();
// Utility functions are now direct named exports
```

---

## 20. Render Method Changes

```typescript
// v7 (WRONG)
renderer.render(stage);

// v8 (CORRECT)
renderer.render({ container: stage });
// Or with a render target:
renderer.render({ container: scene, target: renderTexture });
```
