# Text Component Phase 1.7 Brief

This document records the completed phase 1.7 canonical-refactor workstream.

Historical source documents:

- [`TEXT_COMPONENT_MASTER_BRIEF.md`](./TEXT_COMPONENT_MASTER_BRIEF.md)
- [`TEXT_COMPONENT_TASKLIST.md`](./TEXT_COMPONENT_TASKLIST.md)
- [`TEXT_COMPONENT_PHASE_1_5_BRIEF.md`](./TEXT_COMPONENT_PHASE_1_5_BRIEF.md)
- [`TEXT_COMPONENT_PHASE_2_0_BRIEF.md`](./TEXT_COMPONENT_PHASE_2_0_BRIEF.md)

Execution rules:

- API-first remains mandatory: no important text behavior may exist only in editor code.
- Breaking changes are allowed; obsolete APIs and schema shapes may be removed.
- The canonical execution ledger for this completed phase is [`TEXT_COMPONENT_PHASE_1_7_TASKLIST.md`](./TEXT_COMPONENT_PHASE_1_7_TASKLIST.md).
- Phase 1.7 continues quantum-to-quantum without pausing unless a blocker appears, the brief becomes contradictory, or a missing external dependency or product decision cannot be derived safely from the brief and codebase.
- Do not pause for user input between quanta. Continue the full plan unless blocked by a real contradiction, missing external dependency, or a decision that cannot be derived safely from the brief/codebase.
- Phase 1.7 is a prerequisite for phase 1.8 stabilization and for phase 2.0 work that assumes canonical all-text storage.

## Phase Boundary

Phase 1.7 includes the canonical Slate-compatible text AST refactor needed before the phase 2 unified all-text editing shell.

Phase 1.5 remains historical/completed.

Phase 1.8 is the active stabilization phase that follows 1.7.

Phase 2.0 remains planned-only and should not execute work that assumes canonical all-text storage until phase 1.8 closes.

## Locked Product Decisions

- All text nodes move to one app-owned canonical `TextDocumentContent`.
- `TextDocumentContent` uses a wrapper:
  - `{ blocks: TextDocumentBlock[]; blockGap?: number }`
- All canonical block, inline, and leaf types remain Slate-compatible.
- `block`, `code`, `list`, and `rich` remain persisted subtypes, but only as constraints and editor modes.
- `blockGap` is rich-only document metadata, not node-shell styling.
- Block-owned styling lives on canonical blocks and must survive merge/split.
- `TextNode.style` keeps only outer shell chrome.
- No compatibility is kept for the old text storage shape.
- Saved templates/defaults are migrated later in this phase after the core canonical refactor is stable.
- Merge and split behavior must preserve per-block styling unless the target subtype cannot represent it.
- Execution continues quantum-to-quantum without pausing for input unless a true blocker appears.

## Canonical Model Contract

- Canonical text storage is:
  - `TextDocumentContent = { blocks: TextDocumentBlock[]; blockGap?: number }`
- `TextDocumentBlock` is the canonical union:
  - `TextBlockContent`
  - `CodeBlockContent`
  - `ListBlockContent`
- `TextBlockContent` covers semantic and non-semantic text blocks:
  - `paragraph`, `div`, `blockquote`, `h1`-`h6`
- `CodeBlockContent` covers canonical `code-block`.
- `ListBlockContent` covers canonical `ul` and `ol`.
- Standalone subtype constraints:
  - `block`: exactly one `TextBlockContent`, no `blockGap`
  - `code`: exactly one `CodeBlockContent`, no `blockGap`
  - `list`: exactly one `ListBlockContent`, no `blockGap`
  - `rich`: one or more `TextDocumentBlock`, optional `blockGap`
- All canonical block variants must remain assignable to the relevant Slate element types.

## Phase 1.7 Quanta

### P17-Q0: Bootstrap the 1.7 planning surface

- Create:
  - [`TEXT_COMPONENT_PHASE_1_7_BRIEF.md`](./TEXT_COMPONENT_PHASE_1_7_BRIEF.md)
  - [`TEXT_COMPONENT_PHASE_1_7_TASKLIST.md`](./TEXT_COMPONENT_PHASE_1_7_TASKLIST.md)
- Update roadmap cross-links and active-workstream references.
- Mark phase 1.7 as the active text refactor workstream.

### P17-Q1: Introduce canonical text AST types

- Define `TextDocumentContent`, `TextDocumentBlock`, and canonical block variants.
- Keep canonical block/inline/leaf types Slate-compatible.
- Add subtype validators and guards.
- Remove type ownership for legacy standalone content shapes such as `htmlTag`, standalone `code`, and separate standalone `ListContent` storage.

### P17-Q2: Normalize and persist all text nodes through the canonical model

- Change `TextNode.content` to always be `TextDocumentContent`.
- Normalize `blocks` and `blockGap` through one model-layer path.
- Keep `blockGap` rich-only.
- Keep block-owned styling on canonical blocks.
- Keep `TextNode.style` for outer shell chrome only.
- Do not preserve old storage compatibility.

### P17-Q3: Replace the pure API content surface

- Replace subtype-specific content mutation with canonical structured document APIs.
- Remove content-related `EditorTextField` responsibilities.
- Retire fragmented setters once all callers move.
- Lock merge/split behavior around canonical blocks and preserved per-block styling.

### P17-Q4: Update rendering to canonical content

- Render standalone `block`, `code`, and `list` from canonical blocks.
- Render rich `blockGap` from `TextDocumentContent`.
- Remove render branches that depend on legacy standalone storage.

### P17-Q5: Rebind editor state and inspector to canonical content

- Keep inspector UX mostly stable.
- Replace field-based content bindings with structured canonical-content mutators and adapters.
- Remove dedicated list-content plumbing.
- Keep shell-style controls separate from content semantics.

### P17-Q6: Rebase rich editor and stage editing surfaces on the canonical model

- Make the rich editor and stage edit surfaces operate on `TextDocumentContent`.
- Preserve current rich-edit behavior while switching to the wrapped canonical document model.
- Keep this aligned with the future phase 2 unified all-text stage editing shell.

### P17-Q7: Merge/split and styling preservation hardening

- Add focused regressions for merge/split round-trips.
- Prove styled block merges and splits retain per-block styling.
- Prove rich-only `blockGap` behavior survives where appropriate.

### P17-Q8: Migrate saved templates and defaults to canonical content

- Update defaults, section templates, template helpers, and template emitters to produce canonical text content.
- Run this only after the core canonical refactor is stable.

### P17-Q9: Final cleanup and phase handoff

- Remove leftover legacy branches and dead helpers.
- Ensure no editor surface writes legacy content fields.
- Rebase phase 2 planning on the canonical text model.

## Verification Rules

For every executable phase 1.7 quantum:

- update [`PLAYGROUND_SPEC.md`](./PLAYGROUND_SPEC.md)
- update subsystem tests in the same change set
- run:
  - `npm run typecheck`
  - focused `vitest`
  - `npm run build`
  - targeted stage e2e when interaction behavior changes materially

Phase-wide required coverage:

- TypeScript-level Slate compatibility for canonical block/inline/leaf types
- runtime normalization/invariant tests for subtype constraints
- API tests for canonical content mutation
- merge/split round-trip tests proving block styling is preserved
- inspector/editor tests for structured binding migration
- renderer/stage tests for canonical standalone and rich rendering
- template/default tests once template migration runs

Do not rely on an external Slate conformance suite. Use:

- TypeScript assignability to Slate types
- Slate runtime helper expectations
- project-owned normalization and invariant tests
