# Web Game Frameworks — Deprecated APIs

Last verified: 2026-03-27

If an agent suggests any API in the "Deprecated" column, it MUST be replaced
with the "Use Instead" column.

---

## PixiJS: v7 → v8 Migration

### Application & Renderer

| Deprecated (v7) | Use Instead (v8) | Notes |
|-----------------|------------------|-------|
| `new Application({ width, height, view })` | `const app = new Application(); await app.init({ width, height })` | Constructor is now async |
| `app.view` | `app.canvas` | Property renamed |
| `new Renderer({ ... })` | `await autoDetectRenderer({ ... })` | Renderer creation is now async |
| `PIXI.utils.skipHello()` | Config option on init | Check v8 docs for current suppression method |

### Asset Loading

| Deprecated (v7) | Use Instead (v8) | Notes |
|-----------------|------------------|-------|
| `new PIXI.Loader()` | `Assets.load('url')` | Loader class removed entirely |
| `PIXI.Loader.shared` | `Assets` (static API) | No shared loader instance |
| `PIXI.loader.add().load()` | `Assets.add(); await Assets.loadBundle()` | Bundle-based loading |
| `PIXI.utils.TextureCache` | `Assets.cache` | Cache access moved to Assets |
| `resources.name.texture` | Returned value from `Assets.load()` | Load returns texture directly |

### Interaction

| Deprecated (v7) | Use Instead (v8) | Notes |
|-----------------|------------------|-------|
| `sprite.interactive = true` | `sprite.eventMode = 'static'` | For non-moving objects |
| `sprite.interactive = true` | `sprite.eventMode = 'dynamic'` | For moving/animated objects |
| `sprite.buttonMode = true` | `sprite.cursor = 'pointer'` | CSS cursor string |
| `sprite.buttonMode = false` | `sprite.cursor = 'default'` | Or remove cursor property |
| `InteractionManager` | Built-in event system via `eventMode` | No separate manager in v8 |
| `PIXI.InteractionManager` | Event listeners on display objects | Register directly on objects |

### Graphics

| Deprecated (v7) | Use Instead (v8) | Notes |
|-----------------|------------------|-------|
| `g.beginFill(color, alpha)` | `g.rect(x, y, w, h).fill({ color, alpha })` | SVG-like chained API |
| `g.endFill()` | _(not needed)_ | No longer required |
| `g.drawRect(x, y, w, h)` | `g.rect(x, y, w, h)` | Method renamed |
| `g.drawCircle(x, y, r)` | `g.circle(x, y, r)` | Method renamed |
| `g.drawEllipse(x, y, w, h)` | `g.ellipse(x, y, w, h)` | Method renamed |
| `g.drawPolygon(points)` | `g.poly(points)` | Method renamed |
| `g.drawRoundedRect(x, y, w, h, r)` | `g.roundRect(x, y, w, h, r)` | Method renamed |
| `g.lineStyle(width, color, alpha)` | `g.rect(...).stroke({ width, color, alpha })` | Stroke is now options object |
| `g.moveTo(x, y); g.lineTo(x, y)` | `g.moveTo(x, y).lineTo(x, y).stroke({ ... })` | Stroke applied at end of chain |

### Filters

| Deprecated (v7) | Use Instead (v8) | Notes |
|-----------------|------------------|-------|
| `new BlurFilter(strength, quality, resolution)` | `new BlurFilter({ strength, quality })` | Options object replaces positional args |
| `new ColorMatrixFilter()` (positional) | Options object form | Verify each filter in v8 docs |

### Container / Display Object

| Deprecated (v7) | Use Instead (v8) | Notes |
|-----------------|------------------|-------|
| `Container.sortDirty` | `Container.sortableChildren = true` | Set once; auto-sorts by zIndex |
| `PIXI.DisplayObject` | `PIXI.Container` | `DisplayObject` no longer exists as public base |

### Text

| Deprecated (v7) | Use Instead (v8) | Notes |
|-----------------|------------------|-------|
| `new Text('hello', style)` | `new Text({ text: 'hello', style })` | Options object required |

---

## Phaser: Patterns to Verify

> When a Phaser version is pinned, populate this table from the official changelog.

| Deprecated | Use Instead | Since | Notes |
|------------|-------------|-------|-------|
| [TO BE POPULATED] | Verify via WebSearch | — | Pin version, then audit changelog |

Known Phaser deprecations (check current docs):
- `scene.sys.game.renderer` approach for WebGL effects (replaced by FX pipeline in 3.60+)
- Matter.js direct API access may differ across Matter version bumps

---

## Babylon.js: Patterns to Verify

> When a Babylon.js version is pinned, populate this table from the official changelog.

| Deprecated | Use Instead | Since | Notes |
|------------|-------------|-------|-------|
| [TO BE POPULATED] | Verify via WebSearch | — | Pin version, then audit changelog |

Known Babylon.js deprecations (check current docs):
- `BABYLON.PhysicsImpostor` → Physics v2 (Havok plugin) aggregate/body API
- Legacy `SceneLoader.ImportMesh` string-based callbacks → Promise-based forms
- `BABYLON.GUI.AdvancedDynamicTexture` constructor options may have changed in 7.x
