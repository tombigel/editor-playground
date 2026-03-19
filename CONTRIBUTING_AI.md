# Project Rules

These rules apply to all AI assistants and human contributors working on this codebase.

## Architecture Boundary

Maintain strict separation between the model, API, editor state, stage renderer, and site renderer so each layer can be replaced independently without requiring changes to the others.

## API-First Principle

Every feature must be achievable through the `src/api/` layer without the editor UI. When adding new functionality:

1. Implement the core operation as a pure `DocumentModel → DocumentModel` function in `src/api/documentApi.ts`
2. Then wrap it in `src/api/editorApi.ts` with selection/history concerns
3. The editor UI calls the `editorApi` version; scripts and tests can use `documentApi` directly

Nothing should be only possible through the editor.

## Export Style

Prefer named exports over default exports.

## Component Size Limits

Keep source files focused:

- **Warning**: files exceeding 500 lines should be considered for splitting
- **Hard limit**: files must not exceed 800 lines

When a file grows beyond these limits, split it into focused submodules with a barrel re-export for backward compatibility.

## Editor Style Guide

Use [EDITOR_STYLE_GUIDE.md](./EDITOR_STYLE_GUIDE.md) as the source of truth for editor chrome visual language and token direction.

When changing editor-facing UI styling, align the change to the style guide first:

- colors and accent usage
- light/dark parity
- borders, radii, and shadows
- typography and control sizing
- interaction states and focus treatment

Do not introduce one-off editor styling that conflicts with the guide when an existing token or role can be reused.

## Visual Regression Before UI Changes

Before modifying shared UI components or layout primitives, ensure visual regression baselines exist. Run `npm run test:visual` to verify no unexpected CSS changes. If baselines don't exist for the component you're changing, create them first.

## Subsystem Structure

Keep subsystem structure explicit and consistent:

- tests belong in a `tests/` subfolder inside their subsystem
- shared subsystem types belong in a `types/` subfolder inside their subsystem
- prefer a unified `types/index.ts` per subsystem unless there is a real subdomain split

Do not scatter shared tests beside runtime files when they belong to one subsystem test surface.
Do not keep shared exported subsystem types inline in implementation files when they can live in the subsystem `types/` surface.

## Documentation And Test Gate

For every important functional change or addition, update documentation in the same change set.

Required files:

- `PLAYGROUND_SPEC.md`: update behavior/model/UX descriptions.
- automated tests: every testable behavior change must update existing tests or add new ones in the same change set.

Important functional change includes (non-exhaustive):

- interaction behavior changes (drag, resize, snap, undo/redo, keyboard shortcuts)
- model/state semantics changes
- sticky computation or rendering behavior changes
- inspector/debug controls that affect workflow or state

When no doc change is needed, explicitly confirm why in the final summary.
When a change is not reasonably testable, explicitly confirm why in the final summary.
