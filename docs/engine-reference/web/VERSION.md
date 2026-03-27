# Web Game Frameworks — Version Reference

| Field | Value |
|-------|-------|
| **Primary Framework** | [TO BE CONFIGURED] |
| **Phaser Version** | [TO BE CONFIGURED] |
| **PixiJS Version** | [TO BE CONFIGURED] |
| **Babylon.js Version** | [TO BE CONFIGURED] |
| **TypeScript Version** | [TO BE CONFIGURED] |
| **Bundler** | Vite (recommended) |
| **Project Pinned** | [TO BE CONFIGURED] |
| **Last Docs Verified** | 2026-03-27 |
| **LLM Knowledge Cutoff** | May 2025 |

## Knowledge Gap Warning

The LLM's training data covers web frameworks only up to approximately May 2025.
Key gaps that introduce HIGH RISK for incorrect suggestions:

- **Phaser**: Training data covers up to ~3.60. Versions 3.70+ are unknown — verify
  API calls against current docs before use.
- **PixiJS**: Training data covers up to ~7.x. **PixiJS v8 is a complete rewrite**
  (HIGH RISK) — the Application constructor, Loader, Graphics, Filter, and
  InteractionManager APIs all changed fundamentally. See `breaking-changes.md`.
- **Babylon.js**: Training data covers up to ~6.x. Versions 7.x+ are unknown —
  verify API calls against current docs before use.
- **TypeScript**: Training data covers up to ~5.4. Newer language features may not
  be suggested by the model.

Always cross-reference this directory before accepting any framework API call.

## Post-Cutoff Version Timeline

### Phaser

| Version | Release | Risk Level | Key Theme |
|---------|---------|------------|-----------|
| 3.61–3.69 | 2024–2025 | MEDIUM | Various renderer and input improvements |
| 3.70+ | 2025+ | HIGH | Unknown — verify all APIs against current docs |

### PixiJS

| Version | Release | Risk Level | Key Theme |
|---------|---------|------------|-----------|
| v8.0 | Early 2024 | CRITICAL | Complete rewrite — async init, new Graphics API, Assets system replaces Loader |
| v8.x patches | 2024–2025 | HIGH | Ongoing v8 stabilization — check changelog for API changes |

### Babylon.js

| Version | Release | Risk Level | Key Theme |
|---------|---------|------------|-----------|
| 7.x | 2024–2025 | HIGH | Node-based material system improvements, WebGPU hardening |
| 7.x+ patches | 2025+ | HIGH | Unknown — verify all APIs against current docs |

### TypeScript

| Version | Release | Risk Level | Key Theme |
|---------|---------|------------|-----------|
| 5.5 | Mid 2025 | LOW | Inferred type predicates, isolated declarations |
| 5.6+ | Late 2025+ | MEDIUM | Unknown — verify compiler options against current docs |

## Verified Sources

### Phaser
- Official docs: https://newdocs.phaser.io/
- API reference: https://newdocs.phaser.io/docs/latest
- GitHub: https://github.com/photonstorm/phaser
- Changelog: https://github.com/photonstorm/phaser/blob/master/CHANGELOG.md

### PixiJS
- Official docs: https://pixijs.com/
- API reference: https://pixijs.download/release/docs/index.html
- v8 migration guide: https://pixijs.com/guides/migrations/v8
- GitHub: https://github.com/pixijs/pixijs
- Changelog: https://github.com/pixijs/pixijs/blob/dev/CHANGELOG.md

### Babylon.js
- Official docs: https://doc.babylonjs.com/
- API reference: https://doc.babylonjs.com/typedoc/
- GitHub: https://github.com/BabylonJS/Babylon.js
- Changelog: https://github.com/BabylonJS/Babylon.js/blob/master/CHANGELOG.md

### TypeScript
- Official docs: https://www.typescriptlang.org/docs/
- Release notes: https://www.typescriptlang.org/docs/handbook/release-notes/overview.html

### Vite
- Official docs: https://vitejs.dev/
- Config reference: https://vitejs.dev/config/
