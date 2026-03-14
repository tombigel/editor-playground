# Project Agent Rules

## Documentation And Test Plan Gate

For every important functional change or addition, update documentation in the same change set.

Required files:

- `PLAYGROUND_SPEC.md`: update behavior/model/UX descriptions.
- `MAINTENANCE_TEST_PLAN.md`: update or add regression tests for the new/changed behavior.

Important functional change includes (non-exhaustive):

- interaction behavior changes (drag, resize, snap, undo/redo, keyboard shortcuts)
- model/state semantics changes
- sticky computation or rendering behavior changes
- inspector/debug controls that affect workflow or state

When no doc change is needed, explicitly confirm why in the final summary.
