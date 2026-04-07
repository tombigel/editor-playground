# Text Component Tasklist

This file is the live director and memory model for the text-system recovery workstream.

Execution rules:

- Every fresh agent must read [`TEXT_COMPONENT_MASTER_BRIEF.md`](./TEXT_COMPONENT_MASTER_BRIEF.md) first.
- Each quantum updates only its own section and the shared progress summary.
- If scope changes, update the master brief first, then this tasklist, then code.
- If new bugs are discovered, add them to `Discovered issues` instead of solving them ad hoc.
- API-first is mandatory: if a behavior matters semantically, structurally, or for conversion, it must work headlessly through the pure API layer.

## Shared Progress Summary

- Overall status: `in_progress`
- Current quantum: `Q2`
- Last completed quantum: `Q1`
- Next quantum after current: `Q3`
- Locked assumptions:
  - API-first overrides UI convenience.
  - Rich text remains Slate-backed as an implementation detail.
  - List is a first-class subtype, not an inspector formatting mode.
  - Same-parent sibling merge is the only phase-1 merge scope.
  - One quantum at a time, commit before the next starts.

## Discovered Issues

- None recorded yet.

## Q0: Bootstrap the memory layer

- Objective:
  - Save the original spec prompt verbatim together with the approved implementation plan in `docs/`.
  - Create the persistent tasklist that directs the remaining work.
- Status: `done`
- Allowed files:
  - `docs/TEXT_COMPONENT_MASTER_BRIEF.md`
  - `docs/TEXT_COMPONENT_TASKLIST.md`
- Read-first files and target lines:
  - `AGENTS.md:1-77`
  - `docs/PLAYGROUND_SPEC.md:1-140`
  - Original spec prompt from conversation history
  - Approved implementation plan from conversation history
- Implementation notes:
  - Create a master brief with verbatim source prompt and verbatim approved plan.
  - Seed all remaining quanta with allowlists, read-first notes, verification slots, and carry-forward fields.
- Verification commands:
  - `npm run typecheck`
  - `npx vitest run src/api/tests/documentApi.test.ts`
  - `npm run build`
- Verification result:
  - `npm run typecheck`: passed
  - `npx vitest run src/api/tests/documentApi.test.ts`: passed, 1 file / 23 tests
  - `npm run build`: passed
- Commit SHA:
  - `b0302ef`
- Open follow-ups carried forward:
  - Start Q1 only after Q0 verification passes.

## Q1: Remove editor-only text logic drift

- Objective:
  - Make pure document APIs the canonical implementation for existing text/code/page-link mutations.
  - Reduce `editorMutations.ts` to an API consumer.
- Status: `done`
- Allowed files:
  - `src/api/documentApi.ts`
  - `src/api/editorApi.ts`
  - `src/editor/editorMutations.ts`
  - `src/model/types/index.ts`
  - `src/api/tests/documentApi.test.ts`
  - `src/editor/tests/editorMutations.test.ts`
  - `docs/PLAYGROUND_SPEC.md`
  - `docs/API.md`
  - `docs/TEXT_COMPONENT_TASKLIST.md`
- Read-first files and target lines:
  - `src/api/documentApi.ts:214-436`
  - `src/editor/editorMutations.ts:192-317`
  - `src/model/types/index.ts:11-90`
  - `src/api/editorApi.ts:14-47`
  - `src/api/tests/documentApi.test.ts:70-189`
  - `src/editor/tests/editorMutations.test.ts:249-691`
- Implementation notes:
  - Add API parity for text/code/page-link fields.
  - Add or unify normalization rules in the pure API layer.
  - Make editor mutations delegate to document-layer helpers.
- Verification commands:
  - `npm run typecheck`
  - `npx vitest run src/api/tests/documentApi.test.ts src/editor/tests/editorMutations.test.ts`
  - `npm run build`
- Verification result:
  - `npm run typecheck`: passed
  - `npx vitest run src/api/tests/documentApi.test.ts src/editor/tests/editorMutations.test.ts`: passed, 2 files / 174 tests
  - `npm run build`: passed
- Commit SHA:
  - Pending
- Open follow-ups carried forward:
  - Q2 should extract the richer subtype conversion matrix into pure APIs without reintroducing editor-owned branching.

## Q2: Extract the text conversion engine

- Objective:
  - Move subtype conversion policy into explicit pure APIs.
  - Make UI select a conversion mode instead of owning conversion logic.
- Status: `pending`
- Allowed files:
  - `src/api/documentApi.ts`
  - `src/api/textConversion.ts`
  - `src/app/types/index.ts`
  - `src/app/editorState.ts`
  - `src/api/tests/documentApi.test.ts`
  - `docs/PLAYGROUND_SPEC.md`
  - `docs/API.md`
  - `docs/TEXT_COMPONENT_TASKLIST.md`
- Read-first files and target lines:
  - To be filled before implementation.
- Implementation notes:
  - Introduce `convertTextNodeDoc`.
  - Rework `switchTextSubtypeDoc` into a thin wrapper over explicit conversion helpers.
  - Cover `block | code | rich` initially.
- Verification commands:
  - `npm run typecheck`
  - `npx vitest run src/api/tests/documentApi.test.ts`
  - `npm run build`
- Verification result:
  - Pending
- Commit SHA:
  - Pending
- Open follow-ups carried forward:
  - Pending

## Q3: Harden block text against the agreed spec

- Objective:
  - Make simple text truly simple and stable.
- Status: `pending`
- Allowed files:
  - `src/model/defaultFactories.ts`
  - `src/api/documentApi.ts`
  - `src/render/nodePresentation.tsx`
  - `src/render/leafPresentation.ts`
  - `src/render/tests/nodePresentation.test.tsx`
  - `src/render/tests/leafPresentation.test.ts`
  - `docs/PLAYGROUND_SPEC.md`
  - `docs/TEXT_COMPONENT_TASKLIST.md`
- Read-first files and target lines:
  - To be filled before implementation.
- Implementation notes:
  - Ensure one wrapper, one font family, one styling set, one node-level link capability, one direction.
  - Remove accidental rich-like behavior from block text.
- Verification commands:
  - `npm run typecheck`
  - Relevant render/API `vitest` commands
  - `npm run build`
- Verification result:
  - Pending
- Commit SHA:
  - Pending
- Open follow-ups carried forward:
  - Pending

## Q4: Stabilize code block as a real subtype

- Objective:
  - Make code behavior complete in model and API before UI polish.
- Status: `pending`
- Allowed files:
  - `src/model/textNodeDefaults.ts`
  - `src/model/defaultFactories.ts`
  - `src/api/documentApi.ts`
  - `src/render/codeHighlight.ts`
  - `src/render/nodePresentation.tsx`
  - `src/render/leafPresentation.ts`
  - Code-related tests
  - `docs/PLAYGROUND_SPEC.md`
  - `docs/API.md`
  - `docs/TEXT_COMPONENT_TASKLIST.md`
- Read-first files and target lines:
  - To be filled before implementation.
- Implementation notes:
  - Add mono font customization, language support, theme-aware background handling, border/radius/background API support, and strict LTR.
- Verification commands:
  - `npm run typecheck`
  - Relevant `vitest` commands
  - `npm run build`
- Verification result:
  - Pending
- Commit SHA:
  - Pending
- Open follow-ups carried forward:
  - Pending

## Q5: Rich text model v2

- Objective:
  - Replace the single-paragraph inline-only rich model with the intended block-based model.
- Status: `pending`
- Allowed files:
  - `src/model/types/index.ts`
  - `src/model/richContent.ts`
  - `src/model/migration.ts`
  - `src/model/validation.ts`
  - `src/api/documentApi.ts`
  - `src/render/richTextEditor.ts`
  - `src/render/nodePresentation.tsx`
  - `src/site/SiteRenderer.tsx`
  - Rich/model/site tests
  - `docs/PLAYGROUND_SPEC.md`
  - `docs/API.md`
  - `docs/TEXT_COMPONENT_TASKLIST.md`
- Read-first files and target lines:
  - To be filled before implementation.
- Implementation notes:
  - Introduce block-based Slate subset.
  - Keep outer wrapper nonsemantic.
  - Remove free root inline text and block nesting.
  - Add migration from old format.
- Verification commands:
  - `npm run typecheck`
  - Relevant `vitest` commands
  - `npm run build`
- Verification result:
  - Pending
- Commit SHA:
  - Pending
- Open follow-ups carried forward:
  - Pending

## Q6: Add standalone list subtype

- Objective:
  - Implement lists as first-class text nodes in the model/API.
- Status: `pending`
- Allowed files:
  - `src/model/types/index.ts`
  - `src/model/listContent.ts`
  - `src/model/defaultFactories.ts`
  - `src/api/documentApi.ts`
  - `src/api/textConversion.ts`
  - `src/render/nodePresentation.tsx`
  - `src/render/leafPresentation.ts`
  - `src/site/SiteRenderer.tsx`
  - List tests
  - `docs/PLAYGROUND_SPEC.md`
  - `docs/API.md`
  - `docs/TEXT_COMPONENT_TASKLIST.md`
- Read-first files and target lines:
  - To be filled before implementation.
- Implementation notes:
  - Add `ul | ol | dl`, proper second-level structure, ordered start, predefined marker styles, per-item direction, per-item links, and no nesting in phase 1.
- Verification commands:
  - `npm run typecheck`
  - Relevant `vitest` commands
  - `npm run build`
- Verification result:
  - Pending
- Commit SHA:
  - Pending
- Open follow-ups carried forward:
  - Pending

## Q7: Add headless split and merge

- Objective:
  - Implement split and merge as pure document APIs.
- Status: `pending`
- Allowed files:
  - `src/api/documentApi.ts`
  - `src/api/textConversion.ts`
  - `src/api/textMerge.ts`
  - Merge/split tests
  - `docs/PLAYGROUND_SPEC.md`
  - `docs/API.md`
  - `docs/TEXT_COMPONENT_TASKLIST.md`
- Read-first files and target lines:
  - To be filled before implementation.
- Implementation notes:
  - Add `splitRichTextNodeDoc` and `mergeTextNodesToRichDoc`.
  - Same-parent sibling merge only.
  - Tree-order based merge behavior.
  - Deterministic flatten vs split behavior.
- Verification commands:
  - `npm run typecheck`
  - Relevant `vitest` commands
  - `npm run build`
- Verification result:
  - Pending
- Commit SHA:
  - Pending
- Open follow-ups carried forward:
  - Pending

## Q8: Update renderers and labels to consume canonical model

- Objective:
  - Make stage/site reflect subtype-aware semantics from the API layer.
- Status: `pending`
- Allowed files:
  - `src/render/nodePresentation.tsx`
  - `src/render/leafPresentation.ts`
  - `src/site/SiteRenderer.tsx`
  - Render/site tests
  - `docs/PLAYGROUND_SPEC.md`
  - `docs/TEXT_COMPONENT_TASKLIST.md`
- Read-first files and target lines:
  - To be filled before implementation.
- Implementation notes:
  - Add subtype-aware labels.
  - Keep renderer behavior shared across stage and site.
  - Avoid renderer-only semantic rules.
- Verification commands:
  - `npm run typecheck`
  - Relevant `vitest` commands
  - `npm run build`
- Verification result:
  - Pending
- Commit SHA:
  - Pending
- Open follow-ups carried forward:
  - Pending

## Q9: Rebuild editor and inspector as API consumers

- Objective:
  - Thin the UI down to orchestration over pure APIs.
- Status: `pending`
- Allowed files:
  - `src/app/types/index.ts`
  - `src/app/editorState.ts`
  - `src/panels/InspectorPanel.tsx`
  - `src/panels/inspector/config.text.tsx`
  - `src/panels/inspector/contentSections/textSections.tsx`
  - `src/panels/MultiSelectInspector.tsx`
  - Panel tests
  - `docs/PLAYGROUND_SPEC.md`
  - `docs/TEXT_COMPONENT_TASKLIST.md`
- Read-first files and target lines:
  - To be filled before implementation.
- Implementation notes:
  - Make subtype switching call conversion APIs.
  - Make merge action call merge API.
  - Keep flatten/split prompts as API mode selectors only.
- Verification commands:
  - `npm run typecheck`
  - Relevant `vitest` commands
  - `npm run build`
- Verification result:
  - Pending
- Commit SHA:
  - Pending
- Open follow-ups carried forward:
  - Pending

## Q10: Stage editing UX

- Objective:
  - Add richer stage interaction only after the API and model are stable.
- Status: `pending`
- Allowed files:
  - `src/stage/Stage.tsx`
  - `src/stage/useRichTextEditMode.ts`
  - `src/stage/richEditContext.tsx`
  - `src/stage/stageRenderers/RichTextEditOverlay.tsx`
  - `src/stage/stageRenderers/leafRenderer.tsx`
  - Shared DS files only if needed
  - Stage tests
  - `docs/PLAYGROUND_SPEC.md`
  - `docs/DESIGN_SYSTEM_CONVERGENCE_AUDIT.md`
  - `docs/TEXT_COMPONENT_TASKLIST.md`
- Read-first files and target lines:
  - To be filled before implementation.
- Implementation notes:
  - First click selects.
  - Second click enters edit mode.
  - Rich first, then other types later.
  - Visible edit-state chrome, floating toolbar, commit/cancel/outside-click handling, and auto-height growth.
- Verification commands:
  - `npm run typecheck`
  - Relevant `vitest` commands
  - `npm run build`
- Verification result:
  - Pending
- Commit SHA:
  - Pending
- Open follow-ups carried forward:
  - Pending
