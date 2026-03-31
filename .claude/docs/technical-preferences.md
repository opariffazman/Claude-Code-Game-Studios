# Technical Preferences

<!-- Populated by /setup-engine. Updated as the user makes decisions throughout development. -->
<!-- All agents reference this file for project-specific standards and conventions. -->

## Engine & Language

- **Engine**: Web (PixiJS 8.17.0)
- **Language**: TypeScript (strict mode)
- **Rendering**: WebGPU (primary), WebGL2 (fallback) — via PixiJS 8 renderer
- **Physics**: None (simple custom collision / math only)

## Naming Conventions

- **Classes**: PascalCase (e.g., `DesktopRenderer`, `DestructionEffect`)
- **Properties**: camelCase (e.g., `moveSpeed`, `particleCount`)
- **Private fields**: `#camelCase` or `_camelCase` (e.g., `#health`, `_score`)
- **Methods**: camelCase (e.g., `spawnEffect()`, `resetDesktop()`)
- **Files**: kebab-case (e.g., `desktop-renderer.ts`, `destruction-effect.ts`)
- **Constants**: UPPER_SNAKE_CASE (e.g., `MAX_PARTICLES`, `CHAOS_THRESHOLD`)
- **Interfaces**: PascalCase, no `I` prefix (e.g., `DestructionConfig`, not `IDestructionConfig`)
- **Type aliases**: PascalCase (e.g., `EffectType`, `ThemeId`)
- **Events**: camelCase past tense (e.g., `desktopDestroyed`, `themeChanged`)

## Performance Budgets

- **Target Framerate**: 60fps
- **Frame Budget**: 16.6ms
- **Draw Calls**: < 100 per frame (PixiJS batches well, but keep particle systems lean)
- **Memory Ceiling**: 128MB (browser tab budget — keep asset loading lightweight)

## Testing

- **Framework**: Vitest
- **Minimum Coverage**: Core systems (input capture, effect spawning, parent lock)
- **Required Tests**: Input capture correctness, parent unlock logic, photosensitivity limits

## Forbidden Patterns

<!-- Add patterns that should never appear in this project's codebase -->
- [None configured yet — add as architectural decisions are made]

## Allowed Libraries / Addons

<!-- Add approved third-party dependencies here -->
- [None configured yet — add as dependencies are approved]

## Architecture Decisions Log

<!-- Quick reference linking to full ADRs in docs/architecture/ -->
- [No ADRs yet — use /architecture-decision to create one]
