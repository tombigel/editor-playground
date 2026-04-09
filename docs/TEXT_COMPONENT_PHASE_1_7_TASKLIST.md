# Text Component Phase 1.7 Tasklist

This file is the live director and memory model for the text-system phase 1.7 workstream.

Source documents:

- [`TEXT_COMPONENT_PHASE_1_7_BRIEF.md`](./TEXT_COMPONENT_PHASE_1_7_BRIEF.md)
- [`TEXT_COMPONENT_PHASE_2_0_BRIEF.md`](./TEXT_COMPONENT_PHASE_2_0_BRIEF.md)
- [`TEXT_COMPONENT_MASTER_BRIEF.md`](./TEXT_COMPONENT_MASTER_BRIEF.md)
- [`TEXT_COMPONENT_TASKLIST.md`](./TEXT_COMPONENT_TASKLIST.md)

Execution rules:

- Every fresh agent must read [`TEXT_COMPONENT_PHASE_1_7_BRIEF.md`](./TEXT_COMPONENT_PHASE_1_7_BRIEF.md) first.
- Each quantum updates only its own section and the shared progress summary.
- If scope changes, update the phase 1.7 brief first, then this tasklist, then code.
- If new bugs are discovered, add them to `Discovered issues` instead of solving them ad hoc.
- API-first is mandatory.
- Breaking changes are allowed.
- Do not pause for user input between quanta. Continue the full plan unless blocked by a real contradiction, missing external dependency, or a decision that cannot be derived safely from the brief/codebase.

## Shared Progress Summary

- Overall status: `done`
- Current quantum: `none`
- Last completed quantum: `P17-Q9`
- Next quantum after current: `none`
- Locked assumptions:
  - All text storage converges on canonical `TextDocumentContent`.
  - Canonical text blocks remain Slate-compatible.
  - `block`, `code`, `list`, and `rich` remain persisted subtypes as constraints/editor modes only.
  - `blockGap` is rich-only document metadata.
  - Block-owned styling must survive merge and split.
  - No compatibility is kept for the old text storage shape.
  - Saved templates/defaults are migrated only after the core canonical refactor is stable.
  - One quantum at a time, commit before the next starts.
  - Execution should continue quantum-to-quantum without pausing unless a true blocker appears.
  - Post-refactor stabilization now continues in phase 1.8 rather than inside this completed ledger.

## Discovered Issues

- Post-refactor rich-stage interaction regressions are tracked in phase 1.8 rather than reopening this completed refactor ledger.

## P17-Q0: Bootstrap the 1.7 planning surface

- Objective:
  - Create the new phase 1.7 brief/tasklist and wire them into the existing roadmap docs.
- Status: `done`
- Allowed files:
  - `docs/TEXT_COMPONENT_PHASE_1_7_BRIEF.md`
  - `docs/TEXT_COMPONENT_PHASE_1_7_TASKLIST.md`
  - `docs/TEXT_COMPONENT_PHASE_2_0_BRIEF.md`
  - `docs/TEXT_COMPONENT_PHASE_2_0_TASKLIST.md`
  - `docs/TEXT_COMPONENT_TASKLIST.md`
- Read-first files and target lines:
  - `docs/TEXT_COMPONENT_PHASE_1_5_BRIEF.md:1-220`
  - `docs/TEXT_COMPONENT_PHASE_1_5_TASKLIST.md:1-260`
  - `docs/TEXT_COMPONENT_PHASE_2_0_BRIEF.md:1-220`
  - `docs/TEXT_COMPONENT_PHASE_2_0_TASKLIST.md:1-240`
  - `docs/TEXT_COMPONENT_TASKLIST.md:1-220`
- Implementation notes:
  - Make 1.7 the active text refactor workstream.
  - Preserve prior docs as history; only add forward references and dependency notes.
  - Record the no-pause-between-quanta execution rule in both the brief and tasklist.
- Verification commands:
  - document cross-link inspection
  - `npm run build`
- Verification result:
  - Cross-link readback: passed
  - `npm run build`: passed
- Commit SHA:
  - Not committed yet
- Open follow-ups carried forward:
  - `P17-Q1` should introduce the canonical text AST types.

## P17-Q1: Introduce canonical text AST types

- Objective:
  - Define the new canonical text document model and subtype guards.
- Status: `done`
- Allowed files:
  - `src/model/types/index.ts`
  - `src/model/richContent.ts`
  - `src/model/tests/richContent.test.ts`
  - `src/model/tests/validation.test.ts`
  - `docs/PLAYGROUND_SPEC.md`
  - `docs/API.md`
  - `docs/TEXT_COMPONENT_PHASE_1_7_TASKLIST.md`
- Read-first files and target lines:
  - `src/model/types/index.ts:1-180`
  - `src/model/types/index.ts:430-520`
  - `src/model/richContent.ts:1-280`
  - current model tests around rich normalization and validation
- Implementation notes:
  - Introduce:
    - `TextDocumentContent = { blocks: TextDocumentBlock[]; blockGap?: number }`
    - `TextDocumentBlock = TextBlockContent | CodeBlockContent | ListBlockContent`
  - Keep canonical block/inline/leaf types Slate-compatible.
  - Reframe existing rich block types as canonical text document types where possible.
  - Add subtype validators and guards:
    - `block` => one `TextBlockContent`
    - `code` => one `CodeBlockContent`
    - `list` => one `ListBlockContent`
    - `rich` => one or more `TextDocumentBlock`
  - Remove type ownership for legacy standalone content shapes:
    - `htmlTag`
    - `code`
    - separate standalone `ListContent` storage
- Verification commands:
  - `npm run typecheck`
  - focused model `vitest`
  - `npm run build`
- Verification result:
  - `npm run typecheck`: passed
  - `npx vitest run src/model/tests/richContent.test.ts src/model/tests/validation.test.ts`: passed
  - `npm run build`: passed
- Commit SHA:
  - Not committed yet
- Open follow-ups carried forward:
  - `P17-Q2` should move persistence and normalization onto the canonical content wrapper.

## P17-Q2: Normalize and persist all text nodes through the canonical model

- Objective:
  - Make all text-node persistence and normalization flow through `TextDocumentContent`.
- Status: `done`
- Allowed files:
  - `src/model/richContent.ts`
  - `src/model/validation.ts`
  - `src/model/types/index.ts`
  - `src/model/defaults.ts`
  - `src/model/defaultFactories.ts`
  - `src/model/migration.ts`
  - relevant model tests
  - `docs/PLAYGROUND_SPEC.md`
  - `docs/API.md`
  - `docs/TEXT_COMPONENT_PHASE_1_7_TASKLIST.md`
- Read-first files and target lines:
  - text-node normalization and migration paths
  - text-node defaults/factories
  - template/text defaults that still emit old shapes
- Implementation notes:
  - Change `TextNode.content` to always be `TextDocumentContent`.
  - Normalize `blocks` and `blockGap` through one model-layer path.
  - Keep `blockGap` rich-only; drop or ignore it for non-rich subtypes.
  - Keep block-owned styling on canonical blocks.
  - Keep `TextNode.style` for outer shell chrome only.
  - Do not preserve old storage compatibility.
- Verification commands:
  - `npm run typecheck`
  - focused model/defaults `vitest`
  - `npm run build`
- Verification result:
  - `npm run typecheck`: passed
  - `npx vitest run src/model/tests/richContent.test.ts src/model/tests/validation.test.ts src/model/tests/defaults.test.ts src/model/tests/migration.test.ts`: passed
  - `npm run build`: passed
- Commit SHA:
  - Not started
- Open follow-ups carried forward:
  - `P17-Q3` should replace the pure API content surface with canonical structured APIs.

## P17-Q3: Replace the pure API content surface

- Objective:
  - Replace subtype-specific content mutation with canonical structured document APIs.
- Status: `done`
- Allowed files:
  - `src/api/documentApi.ts`
  - `src/api/textConversion.ts`
  - `src/api/textMerge.ts`
  - `src/api/editorApi.ts`
  - `src/api/types/index.ts`
  - `src/api/tests/documentApi.test.ts`
  - `src/api/tests/textMerge.test.ts`
  - `src/api/tests/textMarkdown.test.ts`
  - `docs/PLAYGROUND_SPEC.md`
  - `docs/API.md`
  - `docs/TEXT_COMPONENT_PHASE_1_7_TASKLIST.md`
- Read-first files and target lines:
  - content setter APIs
  - conversion helpers
  - merge/split helpers
  - markdown helpers that still read legacy fields
- Implementation notes:
  - Introduce canonical structured content APIs.
  - Remove content-related `EditorTextField` responsibilities.
  - Retire fragmented setters once all callers move.
  - Lock merge/split behavior:
    - merge concatenates canonical blocks and preserves per-block styling
    - split emits standalone nodes whose single canonical block retains styling
    - conversion drops styling only when the target subtype cannot represent it
- Verification commands:
  - `npm run typecheck`
  - focused API `vitest`
  - `npm run build`
- Verification result:
  - `npm run typecheck`: passed
  - `npx vitest run src/api/tests/documentApi.test.ts src/api/tests/pageApi.test.ts src/api/tests/textMarkdown.test.ts src/api/tests/textMerge.test.ts`: passed
  - `npm run build`: passed
- Commit SHA:
  - Not started
- Open follow-ups carried forward:
  - `P17-Q4` should switch rendering to canonical content.

## P17-Q4: Update rendering to canonical content

- Objective:
  - Render all text subtypes from the canonical content model.
- Status: `done`
- Allowed files:
  - `src/render/nodePresentation.tsx`
  - `src/render/leafPresentation.ts`
  - `src/site/SiteRenderer.tsx`
  - render/site tests
  - `docs/PLAYGROUND_SPEC.md`
  - `docs/TEXT_COMPONENT_PHASE_1_7_TASKLIST.md`
- Read-first files and target lines:
  - standalone block/code/list rendering paths
  - rich rendering paths
  - site rendering paths for text
- Implementation notes:
  - Standalone `block`, `code`, and `list` must render from canonical blocks.
  - Rich rendering must read `content.blockGap`.
  - Shared block styling semantics should apply consistently across standalone and rich rendering.
  - Remove rendering branches that depend on legacy standalone fields.
- Verification commands:
  - `npm run typecheck`
  - focused render/site `vitest`
  - `npm run build`
- Verification result:
  - `npm run typecheck`: passed
  - `npx vitest run src/render/tests/nodePresentation.test.tsx src/site/tests/SiteRenderer.test.tsx src/site/tests/siteShared.test.ts src/stage/tests/Stage.test.tsx`: passed
  - `npm run build`: passed
- Commit SHA:
  - Not started
- Open follow-ups carried forward:
  - `P17-Q5` should rebind app/editor state and inspector to canonical content.

## P17-Q5: Rebind editor state and inspector to canonical content

- Objective:
  - Replace field-based content bindings with structured canonical-content bindings.
- Status: `done`
- Allowed files:
  - `src/app/editorState.ts`
  - `src/app/types/index.ts`
  - `src/panels/InspectorPanel.tsx`
  - `src/panels/FocusedModePanel.tsx`
  - `src/panels/inspector/types/index.ts`
  - `src/panels/inspector/config.text.tsx`
  - `src/panels/inspector/contentSections/textSections.tsx`
  - related inspector/editor tests
  - `docs/PLAYGROUND_SPEC.md`
  - `docs/API.md`
  - `docs/TEXT_COMPONENT_PHASE_1_7_TASKLIST.md`
- Read-first files and target lines:
  - app action types and reducer cases for text/list/rich
  - inspector action handler types
  - content cards for block/code/list/rich
- Implementation notes:
  - Keep inspector UX mostly stable.
  - Replace field-based content semantics with structured canonical-content mutators and adapters.
  - Remove dedicated list-content plumbing.
  - Keep shell-style controls separate from content semantics.
  - Rich spacing controls write `content.blockGap`.
- Verification commands:
  - `npm run typecheck`
  - focused app/inspector `vitest`
  - `npm run build`
- Verification result:
  - `npm run typecheck`: passed
  - `npx vitest run src/app/tests/editorState.test.ts src/panels/tests/InspectorPanel.test.tsx src/stage/tests/RichTextEditOverlay.test.tsx`: passed
- Commit SHA:
  - Not started
- Open follow-ups carried forward:
  - `P17-Q6` should rebase the rich editor and stage editing surfaces on the canonical model.

## P17-Q6: Rebase rich editor and stage editing surfaces on the canonical model

- Objective:
  - Make the rich editor and stage edit surfaces operate on `TextDocumentContent`.
- Status: `done`
- Allowed files:
  - `src/render/richTextEditor.ts`
  - `src/stage/stageRenderers/RichTextEditOverlay.tsx`
  - `src/stage/richEditContext.tsx`
  - stage/rich editor tests
  - `docs/PLAYGROUND_SPEC.md`
  - `docs/TEXT_COMPONENT_PHASE_1_7_TASKLIST.md`
- Read-first files and target lines:
  - current rich editor document assumptions
  - stage overlay state flow
  - rich edit context contracts
- Implementation notes:
  - Preserve current rich-edit behavior.
  - Switch it to the wrapped canonical text document model.
  - Keep this aligned with the future phase 2 unified all-text stage editing shell.
- Verification commands:
  - `npm run typecheck`
  - focused stage/rich editor `vitest`
  - targeted e2e if interaction behavior changes materially
  - `npm run build`
- Verification result:
  - `npm run typecheck`: passed
  - `npx vitest run src/stage/tests/RichTextEditOverlay.test.tsx src/stage/tests/Stage.test.tsx`: passed
- Commit SHA:
  - Not started
- Open follow-ups carried forward:
  - `P17-Q7` should harden merge/split styling preservation with focused regressions.

## P17-Q7: Merge/split and styling preservation hardening

- Objective:
  - Prove and harden style-preserving merge/split behavior under the new model.
- Status: `done`
- Allowed files:
  - `src/api/textMerge.ts`
  - related API/render helpers as needed
  - merge/render tests
  - `docs/PLAYGROUND_SPEC.md`
  - `docs/API.md`
  - `docs/TEXT_COMPONENT_PHASE_1_7_TASKLIST.md`
- Read-first files and target lines:
  - merge/split logic
  - round-trip conversion tests
  - render tests that assert style output
- Implementation notes:
  - Add explicit regressions for:
    - styled standalone block -> merged rich -> split standalone
    - supported mixed block sequences
    - per-block style preservation
    - rich-only `blockGap` preservation
  - Fix any remaining round-trip drift found by those tests.
- Verification commands:
  - `npm run typecheck`
  - focused merge/render `vitest`
  - `npm run build`
- Verification result:
  - `npm run typecheck`: passed
  - `npx vitest run src/api/tests/textMerge.test.ts src/render/tests/nodePresentation.test.tsx src/stage/tests/Stage.test.tsx`: passed
- Commit SHA:
  - Not started
- Open follow-ups carried forward:
  - `P17-Q8` should migrate saved templates/defaults to canonical content after the core refactor is stable.

## P17-Q8: Migrate saved templates and defaults to canonical content

- Objective:
  - Make all newly created and saved template/default text content emit the canonical model.
- Status: `done`
- Allowed files:
  - `src/model/defaultFactories.ts`
  - `src/model/defaultChrome.ts`
  - `src/model/sectionTemplates.ts`
  - `src/model/templateHelpers.ts`
  - any template payload emitters still producing old shapes
  - relevant tests
  - `docs/PLAYGROUND_SPEC.md`
  - `docs/API.md`
  - `docs/TEXT_COMPONENT_PHASE_1_7_TASKLIST.md`
- Read-first files and target lines:
  - default text node factories
  - section template text emitters
  - helper functions still assigning `htmlTag` or other legacy text fields
- Implementation notes:
  - This quantum happens only after Q1-Q7 are stable.
  - Defaults and template emitters already build canonical `TextDocumentContent` directly after the Q2 migration.
  - Transitional `htmlTag` mirroring remains compatibility metadata, but canonical emitted text payloads are wrapper-based.
- Verification commands:
  - `npm run typecheck`
  - focused defaults/template `vitest`
  - `npm run build`
- Verification result:
  - `npm run typecheck`: passed
  - `npx vitest run src/model/tests/defaults.test.ts src/editor/tests/editorPersistence.test.ts src/api/tests/documentApi.test.ts`: passed
- Commit SHA:
  - Not started
- Open follow-ups carried forward:
  - `P17-Q9` should remove dead legacy branches and hand phase 2 off to the canonical model.

## P17-Q9: Final cleanup and phase handoff

- Objective:
  - Remove leftover legacy branches and align phase 2 planning to the post-1.7 model.
- Status: `done`
- Allowed files:
  - cleanup across touched model/api/editor/render docs/tests
  - `docs/TEXT_COMPONENT_PHASE_2_0_BRIEF.md`
  - `docs/TEXT_COMPONENT_PHASE_2_0_TASKLIST.md`
  - `docs/TEXT_COMPONENT_PHASE_1_7_TASKLIST.md`
- Read-first files and target lines:
  - all remaining references to old text storage/API concepts
  - phase 2 assumptions that still mention legacy storage
- Implementation notes:
  - Remove dead helpers, types, and branches.
  - Ensure no editor surface writes legacy content fields.
  - Rebase phase 2 docs on the canonical text model.
- Verification commands:
  - `npm run typecheck`
  - broad focused `vitest`
  - `npm run build`
- Verification result:
  - `npm run typecheck`: passed
  - focused `vitest`: passed across app, inspector, stage, merge/render, and defaults/template suites
  - `npm run build`: passed
- Commit SHA:
  - Not started
- Open follow-ups carried forward:
  - Transitional compatibility metadata (`htmlTag`, `code`) still exists in the model/api for import/export and migration surfaces, but editor/stage bindings no longer write those fields directly.
