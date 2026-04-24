# Text Component Phase 2.0 Tasklist

This file is the planned-only backlog for the text-system phase 2.0 workstream.

Source documents:

- [`TEXT_COMPONENT_PHASE_2_0_BRIEF.md`](./TEXT_COMPONENT_PHASE_2_0_BRIEF.md)
- [`TEXT_COMPONENT_MASTER_BRIEF.md`](./TEXT_COMPONENT_MASTER_BRIEF.md)
- Closed phase 1.5, 1.7, and 1.8 milestone status in [`PLAYGROUND_ROADMAP.md`](./PLAYGROUND_ROADMAP.md#completed-milestones)

Execution rules:

- Planned only.
- Phase 1.8 is closed; do not execute phase 2.0 until it is explicitly started.
- Phase 2.0 assumes the canonical text-model refactor tracked in phase 1.7 and the stabilization pass tracked in phase 1.8 are complete before execution starts.
- When phase 2.0 execution starts, each quantum should be converted into the same execution ledger format used by phase 1.0 and phase 1.5.

## Shared Progress Summary

- Overall status: `planned`
- Current quantum: `none`
- Last completed quantum: `none`
- Next quantum after current: `P2-A`
- Locked assumptions:
  - Phase 2 extends, rather than bypasses, the phase 1.5 API-first contract.
  - Phase 2 also extends the phase 1.7 canonical text-model contract rather than reviving legacy standalone text storage.
  - Phase 2 also inherits the phase 1.8 rich-stage interaction baseline rather than rebuilding known-buggy dropdown/focus behavior.
  - Phase 2 is where non-rich on-stage editing enters.
  - Phase 2 is where deferred list and description-list UX is resolved.

## Planned Backlog

## P2-A: On-stage editing for standalone block text

- Objective:
  - Add second-click edit entry for standalone block text.
  - Allow inline marks and multiple links during editing.
  - Persist back through pure APIs.
- Status: `implemented`
- Allowed files:
  - `src/api/documentApi/text.ts`
  - `src/model/richContent.ts`
  - `src/model/richContent/selectorsConverters.ts`
  - `src/render/nodePresentation.tsx`
  - `src/stage/Stage.tsx`
  - `src/stage/useRichTextEditMode.ts`
  - `src/stage/richEditContext.tsx`
  - `src/stage/stageRenderers/leafRenderer.tsx`
  - `src/stage/stageRenderers/RichTextEditOverlay.tsx`
  - `src/stage/stageRenderers/richTextEditOverlay/RichTextToolbar.tsx`
  - `src/stage/tests/Stage.e2e.test.ts`
  - `src/stage/tests/e2eServer.ts`
  - focused API/model/render/stage tests
- Read-first files and target lines:
  - Current implementation files above
- Implementation notes:
  - Reuse the phase 1.5 text-edit lifecycle where possible.
  - Use canonical `TextDocumentContent` for standalone block persistence and editing.
  - `Enter` and `Shift+Enter` insert newline text inside the single block; no `<br>` node is added to the model.
  - The floating toolbar is inline-only for block mode. Block type, alignment, direction/RTL, language, and default typography remain inspector-owned.
  - Legacy whole-node block links promote to inline links on stage-edit commit, except button-like linked blocks.
- Verification commands:
  - `npm run test:run -- src/api/tests/documentApi.test.ts src/model/tests/richContent.test.ts src/render/tests/nodePresentation.test.tsx src/stage/tests/RichTextEditOverlay.test.tsx src/panels/tests/helpDocs.test.ts`
  - `npm run typecheck`
  - `npm run test:e2e -- src/stage/tests/Stage.e2e.test.ts`
  - `npm run build`
- Verification result:
  - Passed. Focused API/model/render/overlay/help-doc tests passed (`107` tests). Full `Stage.e2e.test.ts` passed (`43` tests). `npm run build` passed, including lint, typecheck, coverage (`119` files / `1448` tests), API docs check, architecture check, and production bundle build.
- Commit SHA:
  - `5817ef9` API/render contract
  - `23516e4` stage edit shell
  - `3847594` stage E2E coverage and canonical test fixtures
- Open follow-ups carried forward:
  - P2-C owns standalone list on-stage editing, including `Enter` as new list item and `Shift+Enter` as same-item soft break.

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
  - Support direct item editing, inline styling, multiple links per item, nesting, and indent levels.
- Status: `completed`
- Allowed files:
  - `src/model/types/index.ts`
  - `src/model/richContent/*`
  - `src/model/listContent.ts`
  - `src/api/documentApi/text.ts`
  - `src/render/richTextEditor.ts`
  - `src/render/nodePresentation.tsx`
  - `src/stage/**`
  - `src/panels/inspector/contentSections/listContentSection.tsx`
  - focused tests and docs for those surfaces
- Read-first files and target lines:
  - `src/model/richContent/shared.ts`
  - `src/render/richTextEditor.ts`
  - `src/stage/stageRenderers/RichTextEditOverlay.tsx`
  - `src/render/nodePresentation.tsx`
  - `src/panels/inspector/contentSections/listContentSection.tsx`
- Implementation notes:
  - Use canonical `TextDocumentContent` for standalone list persistence and editing.
  - Item nesting uses `depth?: number` on `list-item`, not recursive nested list nodes.
  - Standalone and rich-text list blocks share the same Slate keyboard helpers.
  - List type, marker/bullet style, and ordered-list start remain inspector-owned.
- Verification commands:
  - `npm run test:run -- src/model/tests/richContent.test.ts src/model/tests/listContent.test.ts`
  - `npm run test:run -- src/api/tests/documentApi.test.ts`
  - `npm run test:run -- src/render/tests/richTextEditor.test.ts`
  - `npm run test:run -- src/stage/tests/RichTextEditOverlay.test.tsx`
  - `npm run test:run -- src/render/tests/nodePresentation.test.tsx src/site/tests/SiteRenderer.test.tsx`
  - `npm run test:run -- src/panels/tests/InspectorPanel.test.tsx`
  - `npm run test:e2e -- src/stage/tests/Stage.e2e.test.ts -t "standalone lists|standalone list Tab|inline standalone list|rich text list blocks"`
- Verification result:
  - Focused P2-C tests passed. Final full build verification is tracked by the follow-up verification commit.
- Commit SHA:
  - `f83e17d`, `36be703`, `678546e`, `49fc58d`, `dfced1e`, `64c0333`, `408f5ca`
- Open follow-ups carried forward:
  - Add explicit per-item direction UI.
  - Finish standalone list linking UI.
  - Resolve `dl` authoring in P2-E.

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
