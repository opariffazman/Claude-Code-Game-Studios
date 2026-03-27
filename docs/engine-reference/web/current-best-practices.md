# Web Game Frameworks — Current Best Practices

Last verified: 2026-03-27 | Frameworks: Phaser / PixiJS / Babylon.js

Practices that are **new or changed** since the model's training data (~May 2025).
This supplements (not replaces) the agent's built-in knowledge.

---

## TypeScript Configuration (2025+)

Use this `tsconfig.json` baseline for web game projects:

```jsonc
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "exactOptionalPropertyTypes": true,
    "lib": ["ES2022", "DOM", "DOM.Iterable"],
    "outDir": "dist",
    "rootDir": "src",
    "sourceMap": true,
    "paths": {
      "@game/*": ["src/game/*"],
      "@assets/*": ["src/assets/*"],
      "@ui/*": ["src/ui/*"]
    }
  },
  "include": ["src/**/*.ts"]
}
```

Key choices:
- `"moduleResolution": "bundler"` — correct for Vite; do NOT use `"node"` or `"node16"`
- `"noUncheckedIndexedAccess": true` — catches array/map access bugs at compile time
- `"target": "ES2022"` — supports modern browser features; safe for 2025+ targets
- Path aliases via `paths` — keep imports clean; configure matching aliases in `vite.config.ts`

---

## Build Tooling (Vite)

Vite is the recommended bundler. Standard `vite.config.ts` for game projects:

```typescript
import { defineConfig } from 'vite';
import { viteStaticCopy } from 'vite-plugin-static-copy';

export default defineConfig({
  plugins: [
    viteStaticCopy({
      targets: [{ src: 'assets/public/**/*', dest: 'assets' }]
    })
  ],
  build: {
    assetsInlineLimit: 0,           // Never inline assets as base64 — game assets are large
    rollupOptions: {
      output: {
        manualChunks: {
          phaser: ['phaser'],        // or 'pixi.js' / '@babylonjs/core'
          vendor: ['howler', 'gsap'] // other runtime deps
        }
      }
    }
  },
  resolve: {
    alias: {
      '@game': '/src/game',
      '@assets': '/src/assets',
      '@ui': '/src/ui'
    }
  }
});
```

Key choices:
- `assetsInlineLimit: 0` — prevents Vite from embedding textures as base64, which breaks
  GPU texture formats and inflates JS bundle size
- `manualChunks` — split the framework into its own chunk for better browser caching
- `vite-plugin-static-copy` — copies binary assets (audio, fonts, atlases) without processing

---

## Asset Pipeline

### Textures
- **GPU-compressed textures (KTX2)**: Use KTX2 container with Basis Universal transcoding
  for cross-platform GPU compression. Reduces VRAM 4–8x vs PNG.
  - Tool: `toktx` (KTX-Software) or `basisu`
  - Loader: `@loaders.gl/textures` or framework-native KTX2 support
  - Always provide a PNG fallback for platforms without compression support
- **Sprite atlases**: Use TexturePacker to pack sprites into atlases
  - Export as JSON Hash (PixiJS) or JSON Array (Phaser)
  - Use power-of-two dimensions for GPU compatibility

### Audio
- Provide both **OGG Vorbis** (Firefox/Chrome) and **MP3** (Safari) for all audio
- Use `AudioContext` or a library (Howler.js) — avoid `<audio>` tag for game audio
- Decode audio buffers at load time, not at play time

### 3D Models
- **glTF 2.0** is the standard interchange format for 3D assets
- Prefer `.glb` (binary glTF) over `.gltf` + separate files
- Use Draco compression for geometry-heavy meshes (supported by Babylon.js natively)
- KTX2 textures embedded in glTF reduce load times significantly

---

## WebGPU Support (2025 Status)

WebGPU is the successor to WebGL. Current browser support:

| Browser | Status |
|---------|--------|
| Chrome / Edge | Shipped — stable in production |
| Firefox | Partial — behind flag or limited |
| Safari | Partial — available on macOS/iOS with caveats |

Framework support:
- **Babylon.js**: First-class WebGPU support — most production-ready of the three
- **PixiJS v8**: Experimental WebGPU renderer — opt-in, not default
- **Phaser**: WebGPU renderer planned/experimental — verify current status via docs

**Always provide a WebGL fallback**. Use `autoDetectRenderer` or framework auto-detect
rather than hard-coding WebGPU. Pattern:

```typescript
// Babylon.js — auto-selects WebGPU if available, falls back to WebGL
const engine = await BABYLON.Engine.CreateAsync(canvas, true /* antialias */);

// PixiJS v8 — defaults to WebGL; opt into WebGPU explicitly if needed
await app.init({ preference: 'webgpu' }); // Will fall back to WebGL if unavailable
```

---

## Modern Browser APIs (2025+)

These APIs are now safe to use in modern browsers (Chrome, Firefox, Safari, Edge):

### `scheduler.postTask` — Priority-Based Task Scheduling
```typescript
// Instead of setTimeout(fn, 0) for deferring non-critical work
scheduler.postTask(() => updateLeaderboard(), { priority: 'background' });
scheduler.postTask(() => playSound(), { priority: 'user-blocking' });
```

### `navigator.locks` — Distributed Locking (useful for SharedWorker / multi-tab)
```typescript
await navigator.locks.request('save-game', async (lock) => {
  await persistSaveData(saveState);
});
```

### `structuredClone` — Deep Cloning Without Libraries
```typescript
// Replaces JSON.parse(JSON.stringify(obj)) for deep clones
const snapshot = structuredClone(gameState);
```

### `AbortController` — Cancellable Async Operations
```typescript
const controller = new AbortController();
const texture = await Assets.load('texture.png', { signal: controller.signal });
// Cancel mid-load: controller.abort();
```

### `OffscreenCanvas` — Canvas Operations Off the Main Thread
```typescript
// Render to OffscreenCanvas in a Worker to avoid main thread blocking
const offscreen = canvas.transferControlToOffscreen();
worker.postMessage({ canvas: offscreen }, [offscreen]);
```

---

## Performance Patterns

- **Object pooling**: Pre-allocate and recycle game objects — avoid GC pressure mid-frame
- **Dirty flagging**: Only update render data when game state changes
- **Texture atlases over individual sprites**: Reduces draw calls significantly
- **Avoid layout thrash**: Batch DOM reads before DOM writes; use `requestAnimationFrame`
- **Web Workers for heavy computation**: Pathfinding, physics, AI — keep main thread for rendering
- **SharedArrayBuffer for Worker communication**: Zero-copy data sharing (requires COOP/COEP headers)
