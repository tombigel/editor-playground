# Text Component Phase 2.0 Tasklist

This file is the execution backlog and progress ledger for the text-system phase 2.0 workstream.

Source documents:

- [`TEXT_COMPONENT_PHASE_2_0_BRIEF.md`](./TEXT_COMPONENT_PHASE_2_0_BRIEF.md)
- [`TEXT_COMPONENT_MASTER_BRIEF.md`](./TEXT_COMPONENT_MASTER_BRIEF.md)
- Closed phase 1.5, 1.7, and 1.8 milestone status in [`PLAYGROUND_ROADMAP.md`](./PLAYGROUND_ROADMAP.md#completed-milestones)

Execution rules:

- Phase 2.0 is active.
- Phase 1.8 is closed, and phase 2.0 execution has started.
- Phase 2.0 assumes the canonical text-model refactor tracked in phase 1.7 and the stabilization pass tracked in phase 1.8 are complete.
- Each active or completed quantum should use the same execution ledger format used by phase 1.0 and phase 1.5.

## Shared Progress Summary

- Overall status: `in progress`
- Current quantum: `rich-text E2E isolation + P2-C follow-ups`
- Last completed quantum: `P2-D`
- Next quantum after current: `P2-E`
- Locked assumptions:
  - Phase 2 extends, rather than bypasses, the phase 1.5 API-first contract.
  - Phase 2 also extends the phase 1.7 canonical text-model contract rather than reviving legacy standalone text storage.
  - Phase 2 also inherits the phase 1.8 rich-stage interaction baseline rather than rebuilding known-buggy dropdown/focus behavior.
  - Phase 2 is where non-rich on-stage editing enters.
  - Phase 2 is where deferred list and description-list UX is resolved.
  - Stable stage E2E and rich-text authoring E2E are now separate lanes: `pnpm run test:e2e` covers the clean release gate, while `pnpm run test:e2e:richtext` keeps the high-risk Slate/rich-toolbar flows isolated until deterministic selection hooks land.

## Current Testing Package Split

- Objective:
  - Keep the production build and stable E2E gate clean while preserving rich-text authoring regression coverage.
  - Isolate rich-text authoring cases that depend on browser selection, Slate focus retention, toolbar popovers, and standalone rich editing into their own E2E package.
- Status: `implemented, stabilization open`
- Implementation notes:
  - `src/stage/tests/Stage.e2e.test.ts` now runs stable stage interactions by default and skips rich-text authoring cases unless `RICHTEXT_E2E=1`.
  - `vitest.richtext.e2e.config.ts` runs the same stage file with `RICHTEXT_E2E=1`, so only rich-text authoring cases execute in that package.
  - `pnpm run test:e2e:richtext` is the explicit command for this package.
  - Known unstable cases are intentionally quarantined with `richTextTodo`: mouse selection, multi-block block-type conversion, toolbar font-size persistence, and rich-list Enter behavior.
- Open follow-ups:
  - Replace brittle browser-selection setup in rich-text E2E with deterministic test hooks or helper APIs that still exercise the real editing surface.
  - Unskip and harden the four `richTextTodo` cases once the selection/readiness helpers are deterministic.
  - Re-promote rich-text E2E cases to the release-blocking lane only after repeated clean runs on local and CI-like environments.
  - Keep P2-C standalone list direction and standalone list-linking UI follow-ups tracked before starting P2-E description-list authoring.

## Phase Backlog

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

## P2-B: Focused code editing for standalone code blocks

- Objective:
  - Add second-click edit entry for standalone code blocks.
  - Support direct editing, language mode including `auto` and `markdown`, and theme controls from the stage toolbar.
- Status: `implemented`
- Allowed files:
  - `src/model/types/index.ts`
  - `src/model/richContent/*`
  - `src/api/documentApi/text.ts`
  - `src/render/nodePresentation.tsx`
  - `src/stage/**`
  - `src/panels/inspector/contentSections/codeDesignSections.tsx`
  - `src/panels/fontManagement/ManageFontsPanel.tsx`
  - focused API/model/render/stage/panel/font tests and docs
- Read-first files and target lines:
  - Planned during execution
- Implementation notes:
  - Keep code-theme/background behavior API-owned.
  - Keep code `markdown` mode as highlighted code, not parsed markdown content.
  - Use canonical `TextDocumentContent` for standalone code persistence and editing.
  - Code edit mode is raw text, not Slate rich text.
  - `Enter` and `Shift+Enter` insert newline text; `Tab` / `Shift+Tab` indent with literal tabs.
  - Tab width is visual `tab-size` metadata and does not rewrite stored code.
  - Code style overrides are inspector-owned; no inspector reset button is shown because code editing has no inline styling layer.
  - Code font selection offers System Mono and available mono/code font families, with Manage Fonts prefiltered to `monospace`.
  - Code theme `auto` follows the viewer/system color scheme through `prefers-color-scheme`; it does not follow the editor chrome theme.
- Verification commands:
  - `npm run test:run -- src/api/tests/documentApi.test.ts src/model/tests/richContent.test.ts src/model/tests/defaults.test.ts`
  - `npm run test:run -- src/render/tests/nodePresentation.test.tsx src/site/tests/SiteRenderer.test.tsx src/site/tests/siteExport.test.tsx`
  - `npm run test:run -- src/stage/tests/CodeTextEditOverlay.test.tsx`
  - `npm run test:e2e -- src/stage/tests/Stage.e2e.test.ts -t "standalone code toolbar|drags the rich toolbar"`
  - `npm run test:run -- src/panels/inspector/tests/ContentSectionRows.test.tsx src/panels/tests/ManageFontsPanel.test.tsx`
  - `npm run typecheck`
  - `npm run build`
- Verification result:
  - Focused API/model/render/site/stage/panel/font tests passed. Code toolbar dropdown and drag-handle regressions are covered by e2e. `npm run typecheck` and `npm run build` passed after final cleanup.
- Commit SHA:
  - `d36a228` model/render auto theme and tab size
  - `a446741` API reset and tab size controls
  - `f8638bc` focused code stage activation
  - `39d681a` code indentation keys
  - `00f4a89` focused code toolbar
  - `b4f9d13` inspector tab width controls
  - `ec906a9` code inspector reset button removed after simplifying code styling scope
  - `a8ca31d` code toolbar dropdown and drag-handle alignment
  - `d331c54` auto code theme follows system preference
  - `f50c506` mono font workflow
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
- Status: `completed`
- Allowed files:
  - `src/api/textConversion.ts`
  - `src/api/textMerge.ts`
  - `src/api/tests/textMerge.test.ts`
  - `src/app/editorState.ts`
  - `src/panels/inspector/contentSections/richTextContentSection.tsx`
  - focused app/panel wiring and tests
  - `docs/PLAYGROUND_SPEC.md`
  - `docs/TEXT_COMPONENT_PHASE_2_0_TASKLIST.md`
- Read-first files and target lines:
  - `src/api/textConversion.ts`
  - `src/api/textMerge.ts`
  - `src/api/tests/textMerge.test.ts`
- Implementation notes:
  - For multi-block rich nodes converting to a simple subtype:
    - convert each block to the requested simple subtype only if supported by that subtype’s phase-2 contract
    - otherwise keep it as a one-block rich node
  - Keep single-block rich flattening behavior from phase 1.5.
  - No new public API, schema, or exported type was added; the existing split-mode conversion behavior changed.
  - Follow-up split fidelity pass preserves source rich node typography/design as split-child defaults, applies block-local overrides, and stacks split siblings using the rich document block gap.
  - The inspector exposes a direct `Split into text nodes` action for multi-block rich nodes; it performs natural split only and selects the produced sibling set.
- Verification commands:
  - `npm run test:run -- src/api/tests/textMerge.test.ts src/api/tests/documentApi.test.ts`
  - `npm run test:run -- src/app/tests/editorState.test.ts src/panels/tests/InspectorPanel.test.tsx`
  - `npm run test:run -- src/panels/tests/helpDocs.test.ts`
  - `npm run test:run -- src/api/tests/textMerge.test.ts src/api/tests/documentApi.test.ts src/app/tests/editorState.test.ts src/panels/tests/InspectorPanel.test.tsx src/panels/tests/helpDocs.test.ts`
  - `npm run build`
- Verification result:
  - Initial P2-D focused API tests passed (`73` tests). Help-doc test passed (`10` tests). Follow-up API split styling tests passed (`74` tests). Follow-up editor/panel tests passed (`63` tests). Final focused suite passed (`147` tests). `npm run build` passed, including lint, typecheck, coverage (`126` files / `1519` tests), API docs check, architecture check, and production bundle build.
- Commit SHA:
  - `fba898f`
  - `0a1d225`
  - `115118a`
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
