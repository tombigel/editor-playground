# Project Agent Rules

## Architecture Boundary

Maintain strict separation between the model, API, editor state, stage renderer, and site renderer so each layer can be replaced independently without requiring changes to the others.

## Export Style

Prefer named exports over default exports.

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
