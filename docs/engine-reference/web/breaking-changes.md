# Web Game Frameworks — Breaking Changes

Last verified: 2026-03-27

Changes between framework versions, focused on post-LLM-cutoff changes (PixiJS v8,
Phaser 3.70+, Babylon.js 7.x+).

---

## PixiJS v7 → v8 (Early 2024 — POST-CUTOFF, CRITICAL RISK)

PixiJS v8 is a **complete rewrite**. Treat all v7 patterns as invalid until
verified against v8 documentation. The model's default suggestions will reflect
v7 and will be WRONG.

| Subsystem | Change | Details |
|-----------|--------|---------|
| Application | Constructor is now async | `new Application()` then `await app.init({})` required. Old `new Application({ view, width, height })` does not work. |
| Application | Canvas attachment changed | Use `document.body.appendChild(app.canvas)` instead of `app.view` |
| Assets | `Loader` class removed | `PIXI.Loader` and `PIXI.loader` are gone. Use `await Assets.load('url')` or `Assets.add()` + `Assets.loadBundle()`. |
| Graphics | API completely rewritten | SVG-like chained API replaces imperative calls. `beginFill()` / `endFill()` / `drawRect()` are gone. See deprecated-apis.md. |
| Graphics | Fill/stroke are options objects | `fill({ color, alpha })` and `stroke({ color, width, alpha })` replace positional args. |
| Interaction | `interactive` property removed | Replace `sprite.interactive = true` with `sprite.eventMode = 'static'` (for static objects) or `'dynamic'` (for moving objects). |
| Interaction | `InteractionManager` removed | Event handling is now built in to the scene graph via `eventMode`. No separate manager. |
| Interaction | `buttonMode` removed | Replace with `sprite.cursor = 'pointer'` |
| Filters | Constructor changed | Filters now accept a single options object: `new BlurFilter({ strength: 8 })`. Positional args removed. |
| Renderer | Creation is now async | `await autoDetectRenderer({ width, height })` — no longer synchronous. |
| Renderer | `PIXI.utils.skipHello()` removed | Suppress the banner with `PIXI.settings.RENDER_OPTIONS.hello = false` or similar config. |
| Sprites | `from()` still works, but async preferred | `Sprite.from('url')` works if asset is pre-loaded via `Assets`. Pre-load with `Assets.load()` first. |
| Text | `PIXI.Text` constructor signature changed | Use options object: `new Text({ text: 'hello', style: { ... } })` |
| TypeScript | Full TypeScript rewrite | Better types throughout — but type signatures differ from v7 |

### PixiJS v8 Application Lifecycle (New Pattern)

```typescript
// v7 (WRONG for v8)
const app = new PIXI.Application({ width: 800, height: 600 });
document.body.appendChild(app.view);

// v8 (CORRECT)
const app = new Application();
await app.init({ width: 800, height: 600 });
document.body.appendChild(app.canvas);
```

### PixiJS v8 Asset Loading (New Pattern)

```typescript
// v7 (WRONG for v8)
PIXI.Loader.shared.add('hero', 'hero.png').load((loader, resources) => {
    const sprite = new Sprite(resources.hero.texture);
});

// v8 (CORRECT)
const texture = await Assets.load('hero.png');
const sprite = new Sprite(texture);
```

### PixiJS v8 Graphics (New Pattern)

```typescript
// v7 (WRONG for v8)
const g = new Graphics();
g.beginFill(0xff0000, 1);
g.drawRect(0, 0, 100, 50);
g.endFill();

// v8 (CORRECT)
const g = new Graphics();
g.rect(0, 0, 100, 50).fill({ color: 0xff0000 });
```

---

## Phaser 3.60 → 3.70+ (2025 — POST-CUTOFF, HIGH RISK)

> **Note**: Populate this section via WebSearch when the project pins a Phaser
> version. Search for "Phaser [version] changelog breaking changes" at
> https://github.com/photonstorm/phaser/blob/master/CHANGELOG.md

| Subsystem | Change | Details |
|-----------|--------|---------|
| [TO BE POPULATED] | Verify via WebSearch | Pin version first, then search official changelog |

Known areas of change to verify (3.60–3.70+):
- FX pipeline (WebGL effects introduced in 3.60)
- Input plugin changes
- Scale manager updates
- Matter.js physics version bumps

---

## Babylon.js 6.x → 7.x (2024–2025 — POST-CUTOFF, HIGH RISK)

> **Note**: Populate this section via WebSearch when the project pins a Babylon.js
> version. Search for "Babylon.js 7 migration breaking changes" at
> https://doc.babylonjs.com/ and https://github.com/BabylonJS/Babylon.js/blob/master/CHANGELOG.md

| Subsystem | Change | Details |
|-----------|--------|---------|
| [TO BE POPULATED] | Verify via WebSearch | Pin version first, then search official changelog |

Known areas to verify for Babylon.js 7.x:
- Node Material system updates
- WebGPU renderer promotion (was experimental in 6.x)
- Physics v2 (Havok plugin) changes
- GUI library updates
