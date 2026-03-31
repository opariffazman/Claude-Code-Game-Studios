# ADR-001: Themed Desktop Asset Integration Strategy

- **Status**: Accepted
- **Date**: 2026-03-30
- **Author**: technical-director
- **Implements**: `design/gdd/themed-desktops.md`

---

## Context

Desk Smasher currently renders all desktop elements (icons, windows, taskbar,
stickies, widgets) using procedural PixiJS `Graphics` calls. The game designer
has specified five sprite-driven visual themes, each drawing from Kenney CC0 PNG
packs. We have 2,547 individual PNGs already downloaded across 8 packs, totalling
approximately 38 MB on disk, organized under `assets/sprites/`.

The current production build is 584 KB uncompressed (dist/). The PixiJS runtime
already loads 193 particle PNGs at startup via `Assets.load()` in `SpriteParticles`.

Key constraints:
- **Target audience**: Children ages 1-7 on household devices (tablets, laptops).
- **128 MB memory ceiling** (browser tab budget).
- **60fps / 16.6ms frame budget**.
- **Weekend scope** -- implementation must be tractable for a solo developer in 1.5-2 days.
- **No original art** -- all visuals from Kenney CC0 packs.

This ADR covers six architectural decisions that must be resolved before
implementation begins.

---

## Decision 1: Sprite Sheets Per Theme (Not Individual PNGs)

### Decision

Create one sprite sheet atlas (JSON + PNG) per Kenney pack using TexturePacker
or a free alternative (e.g., `free-tex-packer-cli`). Each theme references 2-4
pack atlases. Load atlases via PixiJS 8 `Assets.load('sheet.json')` which
automatically parses the atlas and registers individual frame textures.

### Rationale

**Individual PNGs are not viable for production.**

- 2,547 individual PNGs = 2,547 HTTP requests on first load (or 2,547 Vite import
  statements bloating the JS bundle).
- PixiJS batches draw calls for Sprites sharing the same base texture. With
  individual PNGs, each icon is a different texture = a different draw call. With
  atlases, all icons from the same pack share one GPU texture = one draw call for
  the entire batch.
- Our draw call budget is <100 per frame. A single theme uses 8-20 icons + window
  chrome + taskbar chrome. Without atlasing, that alone could be 25+ draw calls
  just for static elements, before particles.
- With atlases: 2-4 textures per theme = 2-4 draw calls for all themed elements
  (PixiJS auto-batches Sprites from the same atlas).

**Atlas sizing**: Each Kenney pack has 50-400 PNGs at 128x128 or smaller. A
single 2048x2048 atlas comfortably holds 256 tiles at 128x128. Most packs will
fit in one 2048x2048 sheet, which is well within WebGL/WebGPU texture size limits
(minimum guaranteed: 4096x4096).

**Estimated atlas sizes** (PNG compressed):
- Animal pack (249 PNGs, 128x128): ~400 KB atlas PNG
- Generic items (~200 PNGs, 128x128): ~350 KB atlas PNG
- Vehicle pack (~200 PNGs, 128x128): ~350 KB atlas PNG
- UI packs (pixel-adventure, sci-fi, etc.): ~100-200 KB each (smaller tiles)
- **Total across all 8 packs: ~2-3 MB** (vs 38 MB as individual PNGs)

### Consequences

- **Positive**: Dramatically fewer draw calls (2-4 vs 20+), faster load times,
  GPU memory efficiency (fewer texture swaps), standard PixiJS pattern.
- **Positive**: PixiJS 8 `Assets.load('sheet.json')` handles atlas parsing
  natively -- no custom loader code needed.
- **Negative**: Requires a one-time atlas generation step (Task 1 in the GDD).
- **Negative**: Adding/removing sprites requires regenerating the atlas.

### Implementation Notes

Atlas JSON must use the standard TexturePacker/PixiJS format:
```json
{
  "frames": {
    "cat": { "frame": {"x":0,"y":0,"w":128,"h":128}, "sourceSize": {"w":128,"h":128} },
    ...
  },
  "meta": { "image": "sheet.png", "size": {"w":2048,"h":2048}, "scale": 1 }
}
```

Place generated atlases at:
```
assets/kenney/{pack-name}/sheet.json
assets/kenney/{pack-name}/sheet.png
```

---

## Decision 2: On-Demand Bundle Loading with Lookahead Preload

### Decision

- Register all five theme bundles at startup using `Assets.addBundle()`.
- Eagerly load only the starting theme's bundle (`Assets.loadBundle()`).
- Immediately background-preload the next theme using `Assets.backgroundLoad()`.
- On theme switch, check cache; if ready, switch instantly; if not, hold the
  previous desktop frozen until the load completes.

### Rationale

Loading all 8 pack atlases upfront (~2-3 MB) would work given the total size,
but it is wasteful:

- Only 2-4 atlases are needed for the active theme.
- Some packs (e.g., `kenney-generic-items`) are shared across multiple themes,
  so the PixiJS `Assets` cache deduplicates automatically.
- The lookahead preload pattern means the next theme is almost always cached by
  the time the child finishes destroying the current desktop (typical session
  length: 30-90 seconds per desktop).
- Worst case (very fast destruction): the child sees a 0.5-1s freeze frame while
  the next theme loads. This is acceptable for a casual children's toy.

**Why not eager-load everything?** Memory. Each 2048x2048 atlas consumes ~16 MB
of GPU memory (RGBA uncompressed). Loading all 8 packs simultaneously would use
~128 MB of GPU memory, hitting our memory ceiling before any game objects exist.
On-demand loading with 2-4 active atlases uses ~32-64 MB GPU, well within budget.

### Consequences

- **Positive**: Fast startup (only 1 theme's assets, ~400-800 KB network).
- **Positive**: Stays within 128 MB memory ceiling.
- **Positive**: Background preload makes transitions seamless 95%+ of the time.
- **Negative**: First theme switch on very slow connections may show a brief pause.

### Performance Implications

| Metric | Budget | Expected |
|--------|--------|----------|
| Startup load | <2s on 3G | ~800 KB = ~1.5s on 3G |
| Theme switch (cached) | <1 frame | 0ms (textures in GPU cache) |
| Theme switch (uncached) | <2s | ~500ms on broadband |
| GPU memory (active) | <128 MB | ~32-64 MB (2-4 atlases) |

---

## Decision 3: Assets in `public/` Directory (Runtime Loading, Not Vite-Processed)

### Decision

Place all Kenney sprite atlases under a new `public/assets/kenney/` directory.
Vite copies `public/` contents verbatim to the build output without processing.
Load at runtime via `Assets.load('assets/kenney/{pack}/sheet.json')`.

**Do NOT use Vite `import` statements for sprite assets.**

### Rationale

- **Vite `import`** (e.g., `import catUrl from '../assets/cat.png'`) is designed
  for assets referenced directly in code. It hashes filenames, inlines small files
  as base64, and includes them in the JS bundle. This is wrong for our use case:
  - 2,547 import statements would bloat the JS bundle from 324 KB to several MB.
  - Atlas PNGs should be loaded on-demand, not bundled into the initial payload.
  - PixiJS `Assets` API expects URL strings, not Vite-transformed module imports.

- **`public/` directory** is Vite's escape hatch for static assets loaded at
  runtime. Files are copied as-is to `dist/`. URLs are stable and predictable.
  This is exactly the pattern the existing `SpriteParticles` system uses
  (loading from `assets/sprites/particles/`).

- **Current `assets/` directory** is already in the project root and Vite serves
  it as static files. However, placing theme atlases in `public/assets/kenney/`
  makes the intent explicit and ensures they survive build pipeline changes.

### Migration Path

The existing particle sprites under `assets/sprites/` work because Vite serves
the project root in dev mode. For consistency, we should eventually move them to
`public/` too, but that is out of scope for this sprint. The new Kenney atlases
go to `public/assets/kenney/` from the start.

### Consequences

- **Positive**: Clean separation of build artifacts and runtime assets.
- **Positive**: No JS bundle size impact.
- **Positive**: Predictable URLs for `Assets.load()`.
- **Negative**: `public/` assets are not fingerprinted (no cache-busting hash).
  Acceptable for a children's toy, not for a production SaaS.

---

## Decision 4: Git LFS for Sprite Atlases (Not Raw PNGs in Git)

### Decision

1. **Do NOT commit the raw 2,547 individual Kenney PNGs to git.** They are source
   material, not build artifacts. Keep them locally or in a shared drive.
2. **Commit only the generated atlas files** (sheet.json + sheet.png per pack) to
   `public/assets/kenney/`.
3. Track atlas PNGs with **Git LFS** if they exceed 5 MB total (likely ~2-3 MB,
   so this may not be needed immediately, but set up the `.gitattributes` now).
4. Add the raw Kenney source directories to `.gitignore`:
   ```
   # Raw Kenney source PNGs (generate atlases from these, don't commit)
   assets/sprites/icons/
   assets/sprites/ui/
   ```

### Rationale

- The repo is already 390 MB with 37 MB in `.git/`. Adding 38 MB of individual
  PNGs would nearly double the git history size. Binary files in git are
  expensive to clone, diff, and store.
- Atlas PNGs are the build output (~2-3 MB total). They are small enough to
  commit directly, but if they grow, LFS provides a clean escape.
- The raw Kenney packs are freely downloadable (CC0) and can be re-acquired.
  No need to version-control them.

### Consequences

- **Positive**: Keeps repo clone size manageable.
- **Positive**: Only the files the runtime actually loads are in version control.
- **Negative**: New developers must run the atlas generation script or download
  pre-built atlases. Document this in a `public/assets/kenney/README.md`.

**Note on existing raw PNGs**: The 38 MB of individual PNGs under `assets/sprites/`
are already committed. We should gitignore them going forward and remove them from
tracking in a cleanup commit after the atlas pipeline is established. This is a
separate task from the theme integration sprint.

---

## Decision 5: Graphics Fallback (Hybrid Rendering)

### Decision

Keep the existing `Graphics`-based rendering as a fallback path. The
`ElementFactory` gains new methods for sprite-based elements, but the old
`Graphics` methods remain and are used when:

1. A texture key is not found in the loaded atlas (missing/typo).
2. An entire theme's bundle fails to load (network error, corrupt file).
3. The first frame before any textures have loaded (impossible with eager first-
   theme load, but defensive).

### Rationale

- **Correctness**: The game must never crash or show a blank screen. A colored
  rectangle with a label is better than nothing.
- **Simplicity**: The Graphics code already works and is tested. Deleting it saves
  nothing (it is ~400 lines that cost zero at runtime when not executed).
- **Reversibility**: If sprite atlases cause unforeseen problems (GPU memory on
  low-end tablets, corrupt atlases), we can revert to Graphics-only instantly.

### Architecture

```
ElementFactory
  ├── createIcon(label, color, size)           // existing Graphics path
  ├── createSpriteIcon(texture, label, size)   // NEW: Sprite path
  ├── createWindow(title, w, h, ...)           // existing Graphics path
  ├── createSpriteWindow(chrome, w, h, ...)    // NEW: NineSliceSprite path
  ├── createTaskbar(w, h)                      // existing Graphics path
  └── createSpriteTaskbar(chrome, w, h, ...)   // NEW: NineSliceSprite path
```

`DesktopManager.buildDesktop()` checks whether the active theme's textures are
loaded. If yes, calls `createSprite*` methods. If no, falls back to `create*`
with theme colors.

### Consequences

- **Positive**: Zero-risk migration. Ship with fallback visible in dev, invisible
  to users once atlases are correct.
- **Positive**: Easy to test: delete a sheet.json and verify fallback activates.
- **Negative**: Two code paths to maintain. Acceptable given the small codebase.

### Performance: Sprite vs Graphics

For our use case, **Sprites are significantly better than Graphics**:

| Factor | Graphics | Sprite |
|--------|----------|--------|
| Draw calls | 1 per Graphics object (not batchable) | Batched by atlas texture (2-4 calls for entire theme) |
| GPU upload | Geometry regenerated on change | Static quad, texture already on GPU |
| Memory | Low (no texture) | Higher (atlas texture in VRAM) |
| Visual quality | Flat colors, procedural only | Full sprite art, much richer |

Graphics objects in PixiJS 8 are NOT batched -- each one generates its own draw
call. With 20-30 desktop elements all using Graphics, that is 20-30 draw calls
just for the static desktop. Switching to Sprites from shared atlases reduces
this to 2-4 draw calls. This is the single biggest performance win of the
entire migration.

---

## Decision 6: ThemeSystem Owns Asset Lifecycle

### Decision

Expand the existing `ThemeSystem` class to own the full asset bundle lifecycle.
Do NOT create a separate `AssetManager` class.

### Rationale

- The `ThemeSystem` already knows which theme is active and which is next.
- Asset bundles map 1:1 to themes. There is no use case for loading assets
  outside of a theme context.
- Adding a separate `AssetManager` would split theme state across two objects and
  require coordination logic. YAGNI.
- The existing `SpriteParticles` system manages its own asset loading
  independently -- that pattern works and does not need centralization.

### New ThemeSystem API

```typescript
export class ThemeSystem {
  // Existing
  getNextTheme(): Theme;
  get currentTheme(): Theme;

  // New
  async initialize(): Promise<void>;          // Register bundles + load starting theme
  async loadThemeAssets(id: ThemeId): Promise<void>;  // Load a specific theme's bundle
  preloadNextTheme(): void;                   // Background-load the next theme
  isThemeLoaded(id: ThemeId): boolean;        // Cache check
  getTexture(key: string): Texture | null;    // Resolve texture from active theme
}
```

### Theme Data Migration

The current `ThemeSystem` stores 5 color-only themes as TypeScript constants.
The new system must:

1. Replace these with the 5 sprite-based `ThemeDefinition` records from the GDD.
2. Load theme definitions from `assets/data/theme-config.json` (per GDD spec:
   "All knobs must be defined in `assets/data/theme-config.json`").
3. Register `Assets.addBundle()` for each theme at startup.
4. The old color themes can be removed once the new system is validated.

### Transition Period Handling

When a theme switch is triggered but textures are not yet cached:

1. Keep the current (destroyed) desktop visible but frozen.
2. Show no loading indicator (the child does not need one -- the previous
   desktop's destruction debris is still on screen and entertaining).
3. Once `Assets.loadBundle()` resolves, trigger the rebuild instantly.
4. The `RebuildCycle` already has a fade-to-white transition that masks the
   switch. This transition starts AFTER assets are confirmed loaded.

### Consequences

- **Positive**: Single source of truth for theme state + assets.
- **Positive**: No new classes or coordination overhead.
- **Negative**: `ThemeSystem` grows from ~200 lines to ~400 lines. Still manageable.

---

## Build Pipeline Changes

### Vite Config

No changes needed to `vite.config.ts`. The existing config serves static files
from the project root in dev mode, and the `public/` directory is automatically
copied to `dist/` on build. The atlas files in `public/assets/kenney/` will be
available at runtime without any Vite plugin.

### Atlas Generation Script

Create `tools/pack-atlases.sh` (or `.ts`) that:

1. Takes the raw Kenney PNGs from `assets/sprites/icons/` and `assets/sprites/ui/`.
2. Runs a texture packer to generate `sheet.json` + `sheet.png` per pack.
3. Outputs to `public/assets/kenney/{pack-name}/`.
4. Verifies all texture keys referenced in `theme-config.json` exist in the
   generated atlases.

Recommended tool: `free-tex-packer-cli` (MIT license, npm installable, no GUI
needed). If unavailable, a simple Node.js script using `sharp` (already a common
transitive dependency) can composite PNGs onto a 2048x2048 canvas and generate
the JSON manifest.

### .gitattributes

```
public/assets/kenney/**/*.png filter=lfs diff=lfs merge=lfs -text
```

---

## Alternatives Considered

### A1: Load All 2,547 PNGs Individually at Runtime

**Rejected.** 2,547 HTTP requests, no batching benefit, maximum draw calls. This
is the worst possible approach for a WebGL/WebGPU app.

### A2: Vite `import` for All Sprites

**Rejected.** Would embed all PNGs in the JS bundle via base64 or add 2,547
hashed filenames to the module graph. Bundle size would balloon from 324 KB to
10+ MB. Vite is not designed for this scale of static asset management.

### A3: Separate AssetManager Class

**Rejected (YAGNI).** Theme assets map 1:1 to themes. A separate manager adds
indirection without benefit. If we later need non-theme assets (e.g., a tutorial
overlay), we can extract a base class then.

### A4: Preload All Themes at Startup

**Rejected.** 8 atlas textures at 2048x2048 = ~128 MB GPU memory. This fills our
entire memory budget before the game starts. On-demand loading with lookahead
keeps active memory at 32-64 MB.

### A5: Completely Remove Graphics Rendering

**Rejected.** Graphics rendering is our safety net. If an atlas is corrupt or a
texture key is typo'd, the game must still render something. The fallback costs
nothing when not triggered and prevents crashes when it is.

### A6: WebP/AVIF Instead of PNG Atlases

**Deferred.** PixiJS 8 supports WebP textures, and WebP atlases would be 30-50%
smaller than PNG. However, this adds a format conversion step and potential
browser compatibility concerns (older iOS Safari). Given our total atlas size is
only ~2-3 MB in PNG, the optimization is not worth the complexity for v1.
Reconsider if we add more themes or larger sprites.

---

## Summary of Decisions for Sprint Team

| # | Decision | Key Directive |
|---|----------|---------------|
| 1 | Sprite sheets, not individual PNGs | Generate one atlas per Kenney pack. Place in `public/assets/kenney/{pack}/`. |
| 2 | On-demand bundle loading | `Assets.addBundle()` at startup, `Assets.loadBundle()` for active theme, `Assets.backgroundLoad()` for next. |
| 3 | `public/` directory for assets | Runtime loading via URL strings. No Vite `import` for sprites. |
| 4 | Git LFS for atlas PNGs | Commit atlases only (not raw PNGs). Set up `.gitattributes`. |
| 5 | Graphics fallback preserved | Keep existing `create*` methods. Add `createSprite*` alongside. |
| 6 | ThemeSystem owns assets | Expand ThemeSystem. No separate AssetManager. |

### Implementation Order

1. **Atlas generation** (tooling, Task 1) -- must be done first, everything depends on it.
2. **ThemeSystem expansion** (Task 2) -- theme definitions + bundle registration.
3. **Asset loading lifecycle** (Task 3) -- loadBundle, backgroundLoad, cache checks.
4. **Sprite ElementFactory methods** (Tasks 4-5) -- createSpriteIcon, NineSliceSprite windows.
5. **DesktopManager integration** (Task 4-5) -- wire new factory methods to build pipeline.
6. **RebuildCycle theme advance** (Task 6) -- advance theme on rebuild, preload next.
7. **Integration test** (Task 7) -- cycle through all 5 themes, verify no fallbacks fire.

### Risk Register

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| Atlas generation tool not available in environment | Low | High (blocks everything) | Fallback: write a custom Node.js script using Canvas API |
| Texture key mismatches between GDD and actual pack filenames | Medium | Medium | Task 1 includes a verification step; atlas script checks keys |
| NineSliceSprite behaves differently in PixiJS 8 vs docs | Medium | Medium | Verify against PixiJS 8 migration guide; prototype one window first |
| GPU memory exceeds budget on low-end devices | Low | High | Monitor with `renderer.texture.managedTextures`; reduce atlas size if needed |
| Background preload not finishing before theme switch | Low | Low | Freeze-frame fallback is acceptable UX for a children's toy |

---

*Approved by: technical-director, 2026-03-30*
