# Text Component Phase 2.0 Brief

This document is the planned-only brief for the text-system phase 2.0 workstream.

Source documents:

- [`TEXT_COMPONENT_MASTER_BRIEF.md`](./TEXT_COMPONENT_MASTER_BRIEF.md)
- [`TEXT_COMPONENT_PHASE_1_5_BRIEF.md`](./TEXT_COMPONENT_PHASE_1_5_BRIEF.md)
- [`TEXT_COMPONENT_PHASE_1_5_TASKLIST.md`](./TEXT_COMPONENT_PHASE_1_5_TASKLIST.md)

Execution status:

- This file is planned-only.
- Do not execute phase 2.0 quanta until phase 1.5 is explicitly closed or superseded.

## Locked Phase 2 Scope

Phase 2.0 contains the explicitly deferred work:

- on-stage editing for standalone block text
- on-stage editing for standalone code blocks
- on-stage editing for standalone lists
- granular rich-to-simple split conversion that preserves one-block rich nodes when simple-node support is insufficient
- description-list authoring in rich editing
- list nesting and indent levels
- standalone list per-item linking UI
- standalone list per-item direction UI
- unified all-text stage editing shell

## Planned 2.0 Work Items

### P2-A: On-stage editing for standalone block text

- Add second-click edit entry for block text.
- Allow inline marks and multiple links during editing.
- Persist back through pure APIs.

### P2-B: On-stage editing for standalone code blocks

- Add second-click edit entry for standalone code.
- Support direct code editing.
- Support language modes including `auto` and `markdown`.
- Expose theme controls from the stage toolbar.
- Keep code-theme/background semantics API-owned.

### P2-C: On-stage editing for standalone lists

- Add second-click edit entry for standalone lists.
- Support direct item editing on stage.
- Add inline styling and multiple links per item.
- Add per-item direction UI.
- Add nesting and indent levels.
- Finish standalone list linking UX here.

### P2-D: Granular rich-to-simple split conversion

- For multi-block rich nodes converting to a simple subtype:
  - convert each block to the requested simple subtype only if supported by that subtype’s phase-2 contract
  - otherwise keep it as a one-block rich node
- Keep single-block rich flattening behavior from phase 1.5.

### P2-E: Description lists in rich editing

- Add `dl` support to rich authoring.
- Define the rich `dl` editing model and conversion rules.

### P2-F: Unified all-text stage editing shell

- Generalize the rich-stage lifecycle to all standalone text subtypes.
- Keep common activation/commit/discard/outside-click semantics.
- Plug subtype-specific controls into the shared shell.
