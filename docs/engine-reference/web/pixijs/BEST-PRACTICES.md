# PixiJS v8 — Current Best Practices

Last verified: 2026-03-28 | Version: 8.17.0

These are the correct patterns for PixiJS v8. The model's built-in knowledge reflects
v7 patterns — always prefer the patterns in this document.

---

## 1. Application Setup

### Standard Initialization

```typescript
import { Application } from 'pixi.js';

const app = new Application();
await app.init({
    background: '#1099bb',
    width: 800,
    height: 600,
    resizeTo: window,           // Optional: auto-resize to window
    // preference: 'webgpu',    // Optional: prefer WebGPU (falls back to WebGL)
});
document.body.appendChild(app.canvas);
```

**Important**: If using Vite, wrap in an async function. Top-level await has a
known issue with Vite production builds (as of Vite 6.0.6):

```typescript
async function main() {
    const app = new Application();
    await app.init({ background: '#1099bb', resizeTo: window });
    document.body.appendChild(app.canvas);
    // ... game setup
}
main();
```

### Project Scaffolding

```bash
npm create pixi.js@latest    # Interactive template selection
# Or add to existing project:
npm install pixi.js@8.17.0
```

---

## 2. Asset Loading

### Basic Pattern

```typescript
import { Assets, Sprite } from 'pixi.js';

// Load a single asset
const texture = await Assets.load('hero.png');
const sprite = new Sprite(texture);

// Load multiple assets
const textures = await Assets.load(['hero.png', 'enemy.png', 'background.png']);
```

### Aliased Assets

```typescript
Assets.add({ alias: 'hero', src: 'images/hero-spritesheet.json' });
Assets.add({ alias: 'bgMusic', src: 'audio/background.mp3' });

await Assets.load(['hero', 'bgMusic']);
const heroTexture = Assets.get('hero');
```

### Bundle Loading (Recommended for Games)

```typescript
await Assets.init({
    basePath: 'assets/',
    manifest: {
        bundles: [
            {
                name: 'loading-screen',
                assets: [
                    { alias: 'logo', src: 'ui/logo.png' },
                    { alias: 'spinner', src: 'ui/spinner.png' },
                ],
            },
            {
                name: 'game',
                assets: [
                    { alias: 'hero', src: 'sprites/hero.json' },
                    { alias: 'tileset', src: 'maps/tileset.png' },
                    { alias: 'level1', src: 'maps/level1.json' },
                ],
            },
        ],
    },
});

// Load bundles as needed
await Assets.loadBundle('loading-screen');
// Show loading screen...
await Assets.loadBundle('game');
```

### Background Loading

```typescript
// Start loading in background while showing loading screen
Assets.backgroundLoadBundle('game');

// Later, when ready to use (instant if already loaded):
await Assets.loadBundle('game');
```

### Cleanup

```typescript
await Assets.unload('hero.png');  // Frees cached asset and GPU memory
```

---

## 3. Scene Graph

### Container Hierarchy

```typescript
import { Container, Sprite } from 'pixi.js';

const stage = app.stage;

// Create layers as containers
const gameWorld = new Container();
const uiLayer = new Container();

stage.addChild(gameWorld);
stage.addChild(uiLayer);    // Renders on top of gameWorld

// Add game objects
const player = new Sprite(playerTexture);
gameWorld.addChild(player);
```

### Labels for Discovery

```typescript
container.label = 'player';
const found = stage.getChildByLabel('player', true); // true = deep search
const all = stage.getChildrenByLabel('enemy', true);
```

### Z-Index Sorting

```typescript
const container = new Container();
container.sortableChildren = true; // Required — not on by default

const spriteA = new Sprite(tex);
spriteA.zIndex = 10;
const spriteB = new Sprite(tex);
spriteB.zIndex = 5;

container.addChild(spriteA, spriteB);
// spriteB renders first (lower zIndex), spriteA on top
```

### Culling

```typescript
const container = new Container();
container.cullable = true;
container.cullArea = new Rectangle(0, 0, 800, 600);

// In game loop:
app.ticker.add((ticker) => {
    Culler.shared.cull(gameWorld, app.screen);
    // renderer.render happens automatically via Application
});
```

---

## 4. RenderGroups (Performance Optimization)

Use RenderGroups to offload transform calculations to the GPU. Best for static
content or distinct scene sections.

```typescript
// Create optimized containers
const gameWorld = new Container({ isRenderGroup: true });
const hud = new Container({ isRenderGroup: true });

app.stage.addChild(gameWorld, hud);
```

**When to use:**
- Static background layers
- HUD/UI that transforms independently of the game world
- Camera system (move the RenderGroup instead of individual sprites)

**When NOT to use:**
- Do not overuse — too many RenderGroups degrades performance
- Profile first; most applications do not need them

---

## 5. RenderLayers (Draw Order Control)

Decouple visual draw order from logical hierarchy.

```typescript
import { RenderLayer } from 'pixi.js';

const worldLayer = new RenderLayer();
const uiLayer = new RenderLayer();

app.stage.addChild(worldLayer);
app.stage.addChild(uiLayer); // Renders on top

// Health bar logically parented to enemy (inherits transforms)
// but renders in UI layer (above everything)
enemy.addChild(healthBar);
uiLayer.attach(healthBar);

// To remove from layer:
uiLayer.detach(healthBar);
```

**Gotcha**: When an object is removed from the scene graph and re-added, it does
NOT automatically reassociate with its previous layer. You must call `attach()` again.

---

## 6. Graphics

### Drawing Shapes

```typescript
import { Graphics, GraphicsContext } from 'pixi.js';

const g = new Graphics()
    .rect(50, 50, 100, 100)
    .fill(0xff0000)
    .circle(200, 200, 50)
    .fill({ color: 0x00ff00, alpha: 0.5 })
    .moveTo(0, 0)
    .lineTo(300, 300)
    .stroke({ color: 0x0000ff, width: 3 });
```

### Reusable Geometry with GraphicsContext

```typescript
// Create once, use many times
const buttonContext = new GraphicsContext()
    .roundRect(0, 0, 200, 50, 10)
    .fill({ color: 0x336699 })
    .stroke({ color: 0xffffff, width: 2 });

const button1 = new Graphics(buttonContext);
const button2 = new Graphics(buttonContext); // Shares geometry — no duplication
button2.position.set(0, 60);
```

### Animated Graphics — Swap Contexts, Don't Rebuild

```typescript
// Pre-build frames
const frames = [
    new GraphicsContext().circle(0, 0, 20).fill(0xff0000),
    new GraphicsContext().circle(0, 0, 25).fill(0x00ff00),
    new GraphicsContext().circle(0, 0, 30).fill(0x0000ff),
];

const anim = new Graphics(frames[0]);
let frame = 0;

app.ticker.add(() => {
    frame = (frame + 1) % frames.length;
    anim.context = frames[frame]; // Swap — do NOT clear and rebuild
});
```

### SVG Paths

```typescript
const shape = new Graphics().svg(`
    <svg>
        <path d="M 100 350 q 150 -300 300 0" stroke="blue" fill="none" />
    </svg>
`);
```

**Caveat**: Complex SVG hole geometries may render inaccurately due to triangulation.

### Performance Tips
- Avoid clearing and rebuilding Graphics every frame
- Use multiple simple Graphics objects over one complex one (enables GPU batching)
- Always call `.destroy()` when done to prevent memory leaks

---

## 7. Text Rendering

### Canvas Text (High Quality)

```typescript
import { Text, TextStyle } from 'pixi.js';

const style = new TextStyle({
    fontFamily: 'Arial',
    fontSize: 36,
    fill: 0xffffff,
    stroke: { color: 0x000000, width: 4 },
    dropShadow: true,
});

const text = new Text({ text: 'Score: 0', style });
```

### BitmapText (High Performance)

```typescript
import { BitmapText } from 'pixi.js';

// Load bitmap font first
await Assets.load('fonts/myFont.fnt');

const score = new BitmapText({
    text: 'Score: 0',
    style: { fontFamily: 'MyFont', fontSize: 24 },
});
```

Best for: damage numbers, score displays, any rapidly changing text.

### HTMLText (Rich Formatting)

```typescript
import { HTMLText } from 'pixi.js';

const richText = new HTMLText({
    text: '<b>Bold</b> and <i>italic</i> with <span style="color: red">color</span>',
    style: { fontSize: 24 },
});
```

Best for: dialogue boxes, tutorials, any text needing HTML markup.

---

## 8. Events and Interaction

### Making Objects Interactive

```typescript
const button = new Sprite(buttonTexture);
button.eventMode = 'static';   // Interactive, non-moving
button.cursor = 'pointer';     // CSS cursor on hover

button.on('pointerdown', (event) => {
    console.log('Clicked at', event.global.x, event.global.y);
});

button.on('pointerover', () => { button.tint = 0xcccccc; });
button.on('pointerout', () => { button.tint = 0xffffff; });
```

### Event Modes

| Mode | Use For |
|------|---------|
| `'none'` | Non-interactive, skip hit testing (performance optimization) |
| `'passive'` | Default — children can be interactive but self is not |
| `'auto'` | Interactive only if parent is interactive |
| `'static'` | Interactive — use for buttons, UI elements, non-moving objects |
| `'dynamic'` | Interactive + receives idle events — use for moving/animated targets |

### Custom Hit Areas

```typescript
import { Rectangle, Circle, Polygon } from 'pixi.js';

sprite.hitArea = new Rectangle(0, 0, 100, 100);
// or
sprite.hitArea = new Circle(50, 50, 40);
// or
sprite.hitArea = new Polygon([0, 0, 100, 0, 50, 80]);
```

### Global Events

```typescript
// Fires for ALL pointer movement on canvas, not just over this object
app.stage.eventMode = 'static';
app.stage.on('globalpointermove', (event) => {
    cursor.position.set(event.global.x, event.global.y);
});
```

---

## 9. Textures

### Loading and Using

```typescript
// Standard loading
const texture = await Assets.load('sprite.png');
const sprite = new Sprite(texture);

// Spritesheet
const sheet = await Assets.load('spritesheet.json');
const frame = Texture.from('hero_idle_01'); // Access by frame name after loading
```

### Creating from Canvas

```typescript
import { CanvasSource, Texture } from 'pixi.js';

const canvas = document.createElement('canvas');
const ctx = canvas.getContext('2d');
// Draw on canvas...

const source = new CanvasSource({ resource: canvas });
const texture = new Texture({ source });
```

### RenderTexture

```typescript
import { RenderTexture } from 'pixi.js';

const renderTexture = RenderTexture.create({ width: 256, height: 256 });
app.renderer.render({ container: someContainer, target: renderTexture });
const snapshot = new Sprite(renderTexture);
```

### Texture Configuration

```typescript
// Scale mode and wrap mode are on the source
texture.source.scaleMode = 'nearest';  // For pixel art
texture.source.wrapMode = 'repeat';    // For tiling
```

### Memory Management

```typescript
// Unload via Assets (preferred)
await Assets.unload('sprite.png');

// Manual destruction
texture.destroy();

// GPU-only unload (keep source data in RAM)
texture.source.unload();
```

### GPU Pre-loading

```typescript
// Pre-upload textures to GPU to avoid frame drops
import { Assets } from 'pixi.js';

const textures = await Assets.load(['a.png', 'b.png', 'c.png']);
// Assets automatically prepares textures for GPU
```

---

## 10. Filters

### Built-in Filters

```typescript
import { BlurFilter, ColorMatrixFilter, AlphaFilter, NoiseFilter } from 'pixi.js';

sprite.filters = [
    new BlurFilter({ strength: 8 }),
    new AlphaFilter({ alpha: 0.5 }),
];

// Color matrix effects
const colorMatrix = new ColorMatrixFilter();
colorMatrix.brightness(1.5);
colorMatrix.contrast(1.2);
sprite.filters = [colorMatrix];
```

### Advanced Blend Modes

```typescript
// Must import explicitly
import 'pixi.js/advanced-blend-modes';

// Then use Photoshop-style blend modes
sprite.blendMode = 'color-burn';
sprite.blendMode = 'overlay';
sprite.blendMode = 'soft-light';
```

### Custom Filters

```typescript
import { Filter, GlProgram } from 'pixi.js';

const fragment = `
    precision mediump float;
    varying vec2 vTextureCoord;
    uniform sampler2D uTexture;
    uniform float uTime;

    void main() {
        vec4 color = texture2D(uTexture, vTextureCoord);
        color.r += sin(uTime) * 0.5;
        gl_FragColor = color;
    }
`;

const myFilter = new Filter({
    glProgram: GlProgram.from({ fragment, vertex: Filter.defaultOptions.glProgram.vertex }),
    resources: {
        timeUniforms: {
            uTime: { value: 0.0, type: 'f32' },
        },
    },
});

sprite.filters = [myFilter];

app.ticker.add((ticker) => {
    myFilter.resources.timeUniforms.uniforms.uTime += ticker.deltaTime * 0.01;
});
```

---

## 11. ParticleContainer (High-Volume Rendering)

For rendering 100k+ similar sprites at 60fps.

```typescript
import { ParticleContainer, Particle, Texture } from 'pixi.js';

const container = new ParticleContainer({
    dynamicProperties: {
        position: true,    // Updated every frame
        scale: false,      // Set once, static
        rotation: false,
        color: false,
    },
});

const texture = await Assets.load('particle.png');

for (let i = 0; i < 100000; i++) {
    const p = new Particle({
        texture,
        x: Math.random() * 800,
        y: Math.random() * 600,
    });
    container.addParticle(p);
}

app.stage.addChild(container);
```

**Key rule**: Only mark properties as `dynamic: true` if they change every frame.
Static properties are uploaded to GPU once — much faster.

---

## 12. Game Loop Pattern

```typescript
const app = new Application();
await app.init({ background: '#1099bb', resizeTo: window });
document.body.appendChild(app.canvas);

// Load assets
const [heroTex, enemyTex] = await Promise.all([
    Assets.load('hero.png'),
    Assets.load('enemy.png'),
]);

// Create scene
const hero = new Sprite(heroTex);
hero.anchor.set(0.5);
hero.position.set(400, 300);
app.stage.addChild(hero);

// Game loop via ticker
app.ticker.add((ticker) => {
    const dt = ticker.deltaTime;

    // Update game logic
    hero.rotation += 0.01 * dt;

    // Culling (if needed)
    // Culler.shared.cull(app.stage, app.screen);
});
```

---

## 13. Accessibility

```typescript
// Must import explicitly
import 'pixi.js/accessibility';

const button = new Sprite(buttonTexture);
button.accessible = true;
button.accessibleTitle = 'Play Game';
button.accessibleHint = 'Click to start the game';
button.eventMode = 'static';
```

---

## 14. Responsive / Resize Handling

```typescript
const app = new Application();
await app.init({
    resizeTo: window,
    autoDensity: true,
    resolution: window.devicePixelRatio || 1,
});

// Or manual resize handling:
window.addEventListener('resize', () => {
    app.renderer.resize(window.innerWidth, window.innerHeight);
});
```

---

## 15. Performance Checklist

- [ ] Use sprite sheets / texture atlases (reduces draw calls)
- [ ] Batch up to 16 textures per sprite batch
- [ ] Use `ParticleContainer` for 10k+ similar objects
- [ ] Use `RenderGroup` for static backgrounds / separate scene sections
- [ ] Set `eventMode = 'none'` on non-interactive objects
- [ ] Enable culling for large worlds (`cullable = true` + `Culler.shared.cull()`)
- [ ] Use `cacheAsTexture()` for complex static containers
- [ ] Avoid rebuilding Graphics every frame — swap `GraphicsContext` instead
- [ ] Call `.destroy()` on removed objects to prevent memory leaks
- [ ] Use `Assets.unload()` when assets are no longer needed
- [ ] Minimize filters and masks (expensive — break batches)
- [ ] Use `'nearest'` scale mode for pixel art
- [ ] Pre-load textures to GPU before displaying scenes
- [ ] Mark ParticleContainer properties as static when they don't change per frame
