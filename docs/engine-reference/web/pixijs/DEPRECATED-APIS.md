# PixiJS v8 — Deprecated and Removed APIs

Last verified: 2026-03-28 | Version: 8.17.0

If an agent suggests any API in the "Removed/Deprecated" column, it MUST be
replaced with the "Use Instead" column. No exceptions.

---

## Completely Removed APIs (Will Throw Errors)

These do not exist at all in v8. Using them will crash.

### Classes Removed

| Removed Class | Replacement | Notes |
|---------------|-------------|-------|
| `DisplayObject` | `Container` | Container is now the base class for all scene objects |
| `BaseTexture` | `TextureSource` subclasses | `ImageSource`, `CanvasSource`, `VideoSource`, `BufferImageSource`, `CompressedSource` |
| `Loader` | `Assets` (static API) | Entire loader system removed |
| `InteractionManager` | Built-in `eventMode` system | Events now integrated into scene graph |
| `SimpleMesh` | `MeshSimple` | Renamed |
| `SimplePlane` | `MeshPlane` | Renamed |
| `SimpleRope` | `MeshRope` | Renamed |
| `NineSlicePlane` | `NineSliceSprite` | Renamed |
| `GraphicsGeometry` | `GraphicsContext` | Rewritten |

### Properties Removed

| Removed Property | Replacement | Notes |
|------------------|-------------|-------|
| `sprite.interactive` | `sprite.eventMode = 'static'` or `'dynamic'` | Boolean replaced with string enum |
| `sprite.buttonMode` | `sprite.cursor = 'pointer'` | Use CSS cursor values |
| `container.name` | `container.label` | Property renamed |
| `container.cacheAsBitmap` | `container.cacheAsTexture(true)` | Method call instead of property |
| `app.view` | `app.canvas` | Property renamed |
| `baseTexture.mipmap` | `source.autoGenerateMipmaps` | System redesigned |
| `settings.RESOLUTION` | `AbstractRenderer.defaultOptions.resolution` | Settings object removed |
| `settings.ADAPTER` | `DOMAdapter.set(adapter)` | Adapter system changed |

### Methods Removed

| Removed Method | Replacement | Notes |
|----------------|-------------|-------|
| `graphics.beginFill()` | `.fill()` after shape | Pattern completely changed |
| `graphics.endFill()` | _(not needed)_ | No begin/end pattern |
| `graphics.beginHole()` | `.cut()` after shape | Hole system simplified |
| `graphics.endHole()` | _(not needed)_ | No begin/end pattern |
| `graphics.drawRect()` | `.rect()` | Method renamed |
| `graphics.drawCircle()` | `.circle()` | Method renamed |
| `graphics.drawEllipse()` | `.ellipse()` | Method renamed |
| `graphics.drawPolygon()` | `.poly()` | Method renamed |
| `graphics.drawRoundedRect()` | `.roundRect()` | Method renamed |
| `graphics.drawStar()` | `.star()` | Method renamed |
| `graphics.lineStyle()` | `.stroke({ ... })` | Options object |
| `graphics.lineTextureStyle()` | `.stroke({ texture, ... })` | Merged into stroke |
| `graphics.beginTextureFill()` | `.fill({ texture, ... })` | Merged into fill |
| `obj.updateTransform()` | `obj.onRender` callback | Override pattern changed |
| `utils.skipHello()` | Init config option | Utils module removed |

### Modules/Namespaces Removed

| Removed | Replacement | Notes |
|---------|-------------|-------|
| `PIXI.utils` | Named exports from `pixi.js` | e.g., `import { isMobile } from 'pixi.js'` |
| `PIXI.settings` | Class-specific static options | e.g., `AbstractRenderer.defaultOptions` |
| `PIXI.Loader.shared` | `Assets` static methods | Singleton removed |
| `@pixi/*` packages | `pixi.js` | All sub-packages merged into one |
| `@pixi/filter-*` | `pixi-filters/*` | Filter package paths changed |

---

## Enums Replaced with Strings

These enums no longer exist. Using them will throw ReferenceError.

| Removed Enum | Replacement String |
|-------------|-------------------|
| `SCALE_MODES.NEAREST` | `'nearest'` |
| `SCALE_MODES.LINEAR` | `'linear'` |
| `WRAP_MODES.CLAMP` | `'clamp-to-edge'` |
| `WRAP_MODES.REPEAT` | `'repeat'` |
| `WRAP_MODES.MIRRORED_REPEAT` | `'mirror-repeat'` |
| `DRAW_MODES.POINTS` | `'point-list'` |
| `DRAW_MODES.LINES` | `'line-list'` |
| `DRAW_MODES.TRIANGLES` | `'triangle-list'` |
| `MIPMAP_MODES.*` | `autoGenerateMipmaps: true` |

---

## Behavioral Changes (Silent Breakage — No Error, Wrong Behavior)

These will not throw errors but will produce incorrect results.

| Old Behavior | New Behavior | Impact |
|-------------|-------------|--------|
| `Texture.from('url')` loaded URLs | Must `await Assets.load('url')` first | Sprites will show blank if not pre-loaded |
| `Ticker.add((dt) => ...)` — dt was delta | `Ticker.add((ticker) => ...)` — ticker object passed | Using `dt` directly will fail; use `ticker.deltaTime` |
| Default `eventMode` was `'auto'` | Default is `'passive'` | Objects non-interactive by default; must set `eventMode` |
| `getBounds()` returned `Rectangle` | Returns `Bounds` object | Access `.rectangle` property for Rectangle |
| Culling was automatic | Must opt in with `cullable = true` + `Culler.shared.cull()` | Off-screen objects will render unless culled manually |
| Children auto-sorted when dirty | Must set `sortableChildren = true` | zIndex sorting requires explicit opt-in |
| Sprite/Mesh could have children | Leaf nodes reject `addChild()` | Only Container can have children |
| Blend modes/tint were per-object only | Now inherit to children (like alpha) | May cause unintended visual changes |
| RenderTexture mipmaps auto-updated | Must call `source.updateMipmaps()` manually | Mipmaps stale until manually refreshed |

---

## v8 Deprecated (Still Work, Will Be Removed)

APIs that work in v8.17.0 but are marked deprecated and should not be used in new code.

| Deprecated Pattern | Preferred Pattern | Notes |
|-------------------|-------------------|-------|
| Passing raw strings to `fill()` without object | Use `fill({ color: 'red' })` for clarity | Simple `fill('red')` works but options form is preferred |
| `BlurFilter` without `legacy` flag | Explicitly set `legacy: true` or use new halving scheme | v8.17.0 changed default behavior |

---

## Import Path Quick Reference

```typescript
// ALL imports come from 'pixi.js'
import {
    Application,
    Assets,
    Container,
    Sprite,
    Graphics,
    GraphicsContext,
    Text,
    BitmapText,
    HTMLText,
    Texture,
    RenderTexture,
    ImageSource,
    CanvasSource,
    VideoSource,
    Filter,
    BlurFilter,
    ColorMatrixFilter,
    DisplacementFilter,
    NoiseFilter,
    AlphaFilter,
    GlProgram,
    GpuProgram,
    Ticker,
    RenderLayer,
    ParticleContainer,
    Particle,
    MeshSimple,
    MeshPlane,
    MeshRope,
    NineSliceSprite,
    TileSprite,
    DOMAdapter,
    AbstractRenderer,
    Culler,
    isMobile,
} from 'pixi.js';

// Advanced blend modes require explicit import
import 'pixi.js/advanced-blend-modes';

// Accessibility requires explicit import
import 'pixi.js/accessibility';

// Community filters
import { AdjustmentFilter } from 'pixi-filters/adjustment';
```
