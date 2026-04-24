# Text Component Phase 2.0 Brief

This document is the planned-only brief for the text-system phase 2.0 workstream.

Source documents:

- [`TEXT_COMPONENT_MASTER_BRIEF.md`](./TEXT_COMPONENT_MASTER_BRIEF.md)
- Closed phase 1.5, 1.7, and 1.8 milestone status in [`PLAYGROUND_ROADMAP.md`](./PLAYGROUND_ROADMAP.md#completed-milestones)

Execution status:

- This file is planned-only.
- Phase 1.8 is closed; phase 2.0 remains planned-only until explicitly started.
- Phase 2.0 depends on the canonical all-text storage refactor tracked in phase 1.7 and the stabilization pass tracked in phase 1.8.

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

## Phase 1.x Dependency

Before phase 2.0 execution starts, phase 1.7 should complete the canonical text-model refactor:

- all text nodes persist one canonical `TextDocumentContent`
- canonical block/inline/leaf types remain Slate-compatible
- merge/split preserve per-block styling
- inspector/editor bindings stop depending on legacy standalone text storage
- defaults and saved templates emit canonical text content

Phase 1.8 closed the rich-stage editing stabilization baseline that phase 2 can safely reuse:

- dropdown and popover flows preserve the authored selection
- toolbar interactions do not accidentally commit, discard, or retarget edits
- the remaining pre-phase-2 rich-stage regressions are tracked and closed explicitly

Phase 2.0 should build on that canonical model and stabilized interaction baseline instead of extending legacy `block`/`code`/`list` storage branches.

## Planned 2.0 Work Items

### P2-A: On-stage editing for standalone block text

- Add second-click edit entry for block text.
- Allow inline marks and multiple links during editing.
- Persist back through pure APIs.
- Build on canonical `TextDocumentContent`, not legacy standalone block fields.

### P2-B: On-stage editing for standalone code blocks

- Add second-click edit entry for standalone code.
- Support direct code editing.
- Support language modes including `auto` and `markdown`.
- Expose theme controls from the stage toolbar.
- Keep code-theme/background semantics API-owned.
- Build on canonical `TextDocumentContent`, not legacy standalone code fields.

### P2-C: On-stage editing for standalone lists

- Add second-click edit entry for standalone lists.
- Support direct item editing on stage.
- Add inline styling and multiple links per item.
- Add per-item direction UI.
- Add nesting and indent levels.
- Finish standalone list linking UX here.
- Build on canonical `TextDocumentContent`, not legacy standalone list fields.

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
