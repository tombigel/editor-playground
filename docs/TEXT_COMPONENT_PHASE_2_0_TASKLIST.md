# Text Component Phase 2.0 Tasklist

This file is the planned-only backlog for the text-system phase 2.0 workstream.

Source documents:

- [`TEXT_COMPONENT_PHASE_2_0_BRIEF.md`](./TEXT_COMPONENT_PHASE_2_0_BRIEF.md)
- [`TEXT_COMPONENT_PHASE_1_7_BRIEF.md`](./TEXT_COMPONENT_PHASE_1_7_BRIEF.md)
- [`TEXT_COMPONENT_PHASE_1_7_TASKLIST.md`](./TEXT_COMPONENT_PHASE_1_7_TASKLIST.md)
- [`TEXT_COMPONENT_PHASE_1_5_BRIEF.md`](./TEXT_COMPONENT_PHASE_1_5_BRIEF.md)
- [`TEXT_COMPONENT_MASTER_BRIEF.md`](./TEXT_COMPONENT_MASTER_BRIEF.md)

Execution rules:

- Planned only.
- Do not execute until phase 1.7 is explicitly closed or superseded.
- Phase 2.0 assumes the canonical text-model refactor tracked in phase 1.7 is complete before execution starts.
- When phase 2.0 execution starts, each quantum should be converted into the same execution ledger format used by phase 1.0 and phase 1.5.

## Shared Progress Summary

- Overall status: `planned`
- Current quantum: `none`
- Last completed quantum: `none`
- Next quantum after current: `P2-A`
- Locked assumptions:
  - Phase 2 extends, rather than bypasses, the phase 1.5 API-first contract.
  - Phase 2 also extends the phase 1.7 canonical text-model contract rather than reviving legacy standalone text storage.
  - Phase 2 is where non-rich on-stage editing enters.
  - Phase 2 is where deferred list and description-list UX is resolved.

## Planned Backlog

## P2-A: On-stage editing for standalone block text

- Objective:
  - Add second-click edit entry for standalone block text.
  - Allow inline marks and multiple links during editing.
  - Persist back through pure APIs.
- Status: `planned`
- Allowed files:
  - Planned during execution
- Read-first files and target lines:
  - Planned during execution
- Implementation notes:
  - Reuse the phase 1.5 text-edit lifecycle where possible.
  - Use canonical `TextDocumentContent` for standalone block persistence and editing.
- Verification commands:
  - Planned during execution
- Verification result:
  - Not started
- Commit SHA:
  - Not started
- Open follow-ups carried forward:
  - None yet.

## P2-B: On-stage editing for standalone code blocks

- Objective:
  - Add second-click edit entry for standalone code blocks.
  - Support direct editing, language mode including `auto` and `markdown`, and theme controls from the stage toolbar.
- Status: `planned`
- Allowed files:
  - Planned during execution
- Read-first files and target lines:
  - Planned during execution
- Implementation notes:
  - Keep code-theme/background behavior API-owned.
  - Keep code `markdown` mode as highlighted code, not parsed markdown content.
  - Use canonical `TextDocumentContent` for standalone code persistence and editing.
- Verification commands:
  - Planned during execution
- Verification result:
  - Not started
- Commit SHA:
  - Not started
- Open follow-ups carried forward:
  - None yet.

## P2-C: On-stage editing for standalone lists

- Objective:
  - Add second-click edit entry for standalone lists.
  - Support direct item editing, inline styling, multiple links per item, per-item direction UI, nesting, and indent levels.
- Status: `planned`
- Allowed files:
  - Planned during execution
- Read-first files and target lines:
  - Planned during execution
- Implementation notes:
  - Finish standalone list linking UX here.
  - Resolve `dl` authoring UX for standalone lists here if still needed.
  - Use canonical `TextDocumentContent` for standalone list persistence and editing.
- Verification commands:
  - Planned during execution
- Verification result:
  - Not started
- Commit SHA:
  - Not started
- Open follow-ups carried forward:
  - None yet.

## P2-D: Granular rich-to-simple split conversion

- Objective:
  - Refine multi-block `rich -> simple` split conversion so unsupported blocks remain one-block rich nodes.
- Status: `planned`
- Allowed files:
  - Planned during execution
- Read-first files and target lines:
  - Planned during execution
- Implementation notes:
  - For multi-block rich nodes converting to a simple subtype:
    - convert each block to the requested simple subtype only if supported by that subtype’s phase-2 contract
    - otherwise keep it as a one-block rich node
  - Keep single-block rich flattening behavior from phase 1.5.
- Verification commands:
  - Planned during execution
- Verification result:
  - Not started
- Commit SHA:
  - Not started
- Open follow-ups carried forward:
  - None yet.

## P2-E: Description lists in rich editing

- Objective:
  - Add `dl` support to rich authoring and define the rich `dl` editing model and conversion rules.
- Status: `planned`
- Allowed files:
  - Planned during execution
- Read-first files and target lines:
  - Planned during execution
- Implementation notes:
  - Resolve the deferred `dl` floating-toolbar and editing UX here.
- Verification commands:
  - Planned during execution
- Verification result:
  - Not started
- Commit SHA:
  - Not started
- Open follow-ups carried forward:
  - None yet.

## P2-F: Unified all-text stage editing shell

- Objective:
  - Generalize the rich-stage lifecycle into a shared shell for all standalone text subtypes.
- Status: `planned`
- Allowed files:
  - Planned during execution
- Read-first files and target lines:
  - Planned during execution
- Implementation notes:
  - Keep activation, commit, discard, and outside-click semantics unified.
  - Keep subtype-specific controls modular.
  - Build the shared shell on the phase 1.7 canonical text model.
- Verification commands:
  - Planned during execution
- Verification result:
  - Not started
- Commit SHA:
  - Not started
- Open follow-ups carried forward:
  - None yet.
