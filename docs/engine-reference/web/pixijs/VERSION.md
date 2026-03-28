# PixiJS — Version Reference

| Field | Value |
|-------|-------|
| **Engine** | PixiJS |
| **Pinned Version** | 8.17.0 |
| **Initial v8 Release** | March 5, 2024 |
| **Last Docs Verified** | 2026-03-28 |
| **LLM Knowledge Cutoff** | May 2025 |

## Knowledge Gap Warning

The LLM's training data covers PixiJS up to approximately v7.x. **PixiJS v8 is a
ground-up rewrite** — the model's default suggestions will reflect v7 APIs and will
be WRONG for v8 projects. This is CRITICAL risk.

Key areas where the model WILL give incorrect advice:
- Application initialization (now async)
- Graphics API (completely rewritten)
- Asset loading (Loader class removed)
- Interaction system (InteractionManager removed)
- Filter constructors (positional args removed)
- Texture system (BaseTexture removed)
- Display hierarchy (DisplayObject removed)

Always cross-reference this directory before accepting any PixiJS API suggestion.

## Post-Cutoff Version Timeline

| Version | Release | Risk Level | Key Changes |
|---------|---------|------------|-------------|
| v8.0.0 | Mar 2024 | CRITICAL | Complete rewrite — async init, new Graphics, Assets replaces Loader, WebGPU renderer, DisplayObject removed |
| v8.1–8.6 | 2024 | HIGH | Stabilization, bug fixes, API refinements |
| v8.7.0 | Jan 2025 | HIGH | Incremental improvements |
| v8.10.0 | Jun 2025 | HIGH | Ongoing refinements |
| v8.11.0 | Jul 2025 | HIGH | Post-cutoff — unknown to model |
| v8.12.0 | Aug 2025 | HIGH | Post-cutoff — unknown to model |
| v8.13.0 | Sep 2025 | HIGH | Post-cutoff — unknown to model |
| v8.16.0 | Feb 2026 | HIGH | Experimental Canvas renderer, tagged text support |
| v8.17.0 | Mar 2026 | HIGH | Optimized BlurFilter (halving scheme), text alignment fixes, `visibleChanged` event, SplitText tagStyles |

## v8.17.0 Specific Changes

- **BlurFilter**: Now uses halving strength scheme by default (progressive reduction
  across passes). Set `legacy: true` to restore v8.16 behavior.
- **Text alignment**: Justify alignment now uses `wordWrapWidth`; full `whiteSpace`
  support in BitmapText; corrected `breakWords` in HTMLText.
- **SplitText**: `tagStyles` support — preserves inline styling during per-character splitting.
- **visibleChanged event**: Containers emit this event when visibility changes.
- **18+ bug fixes**: TexturePool mipmaps, filter offsets, Graphics bounds, BindGroup
  crashes, touch event modifier keys.

## Verified Sources

- Official docs: https://pixijs.com/8.x/
- API reference: https://pixijs.download/release/docs/index.html
- v8 migration guide: https://pixijs.com/8.x/guides/migrations/v8
- GitHub: https://github.com/pixijs/pixijs
- Blog: https://pixijs.com/blog
- LLM docs: https://pixijs.com/llms-full.txt
- npm: `npm install pixi.js@8.17.0`
