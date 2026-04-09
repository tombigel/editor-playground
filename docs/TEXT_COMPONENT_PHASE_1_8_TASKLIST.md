# Text Component Phase 1.8 Tasklist

This file is the live director and memory model for the text-system phase 1.8 stabilization workstream.

Source documents:

- [`TEXT_COMPONENT_PHASE_1_8_BRIEF.md`](./TEXT_COMPONENT_PHASE_1_8_BRIEF.md)
- [`TEXT_COMPONENT_PHASE_1_7_BRIEF.md`](./TEXT_COMPONENT_PHASE_1_7_BRIEF.md)
- [`TEXT_COMPONENT_PHASE_1_7_TASKLIST.md`](./TEXT_COMPONENT_PHASE_1_7_TASKLIST.md)
- [`TEXT_COMPONENT_PHASE_2_0_BRIEF.md`](./TEXT_COMPONENT_PHASE_2_0_BRIEF.md)
- [`TEXT_COMPONENT_TASKLIST.md`](./TEXT_COMPONENT_TASKLIST.md)

Execution rules:

- Every fresh agent must read [`TEXT_COMPONENT_PHASE_1_8_BRIEF.md`](./TEXT_COMPONENT_PHASE_1_8_BRIEF.md) first.
- Each quantum updates only its own section and the shared progress summary.
- If scope changes, update the phase 1.8 brief first, then this tasklist, then code.
- If new bugs are discovered, add them to `Discovered issues` instead of solving them ad hoc.
- API-first is mandatory.
- Breaking changes are allowed when they remove incorrect post-1.7 behavior.
- Execute one quantum at a time, verify it, commit it, and stop for review before starting the next quantum.

## Shared Progress Summary

- Overall status: `in_progress`
- Current quantum: `P18-Q2`
- Last completed quantum: `P18-Q1`
- Next quantum after current: `P18-Q3`
- Locked assumptions:
  - Phase 1.7 remains complete for the canonical text-model refactor.
  - Phase 1.8 is stabilization only and does not absorb planned phase 2 feature scope.
  - Rich-stage editing is the only on-stage text surface in scope for this phase.
  - Shared DS primitives remain the correct base for toolbar/select/popover chrome.
  - The base rich-text toolbar remains open for the whole edit session.
  - Nested rich-edit layers unwind one step at a time before commit or discard can fire.
  - One quantum at a time, commit before the next starts, then pause for review.

## Discovered Issues

- Rich-stage dropdown and popover interactions still have selection/focus regressions that make the current “phase complete” status too optimistic for pre-phase-2 readiness.
- The toolbar is not yet modeled as a deterministic layered popover stack.
- Nested dismissal order is not yet locked for outside click and `Escape`.
- The first draggable-toolbar attempt shipped a visible but non-working drag handle and was rolled back; Q2 needs a fresh implementation based on the focused-panel host pattern.
- Retained selection highlighting is still missing when focus leaves the editable surface for toolbar chrome.
- Toolbar controls still use bespoke inputs where inspector controls should be reused later in phase 1.8.
- Structure-specific dropdowns are still always visible and need to become conditional later in phase 1.8.

## P18-Q0: Bootstrap the stabilization ledger

- Objective:
  - Create the new phase 1.8 brief/tasklist and wire them into the existing roadmap docs.
- Status: `done`
- Allowed files:
  - `docs/TEXT_COMPONENT_PHASE_1_8_BRIEF.md`
  - `docs/TEXT_COMPONENT_PHASE_1_8_TASKLIST.md`
  - `docs/TEXT_COMPONENT_TASKLIST.md`
  - `docs/TEXT_COMPONENT_PHASE_1_7_BRIEF.md`
  - `docs/TEXT_COMPONENT_PHASE_1_7_TASKLIST.md`
  - `docs/TEXT_COMPONENT_PHASE_2_0_BRIEF.md`
  - `docs/TEXT_COMPONENT_PHASE_2_0_TASKLIST.md`
- Read-first files and target lines:
  - `docs/TEXT_COMPONENT_PHASE_1_7_BRIEF.md:1-180`
  - `docs/TEXT_COMPONENT_PHASE_1_7_TASKLIST.md:1-220`
  - `docs/TEXT_COMPONENT_PHASE_2_0_BRIEF.md:1-160`
  - `docs/TEXT_COMPONENT_PHASE_2_0_TASKLIST.md:1-200`
  - `docs/TEXT_COMPONENT_TASKLIST.md:1-120`
- Implementation notes:
  - Keep 1.7 marked complete for the canonical refactor.
  - Make 1.8 the active pre-phase-2 stabilization workstream.
  - Keep 2.0 planned-only and explicitly blocked on 1.8 closure.
- Verification commands:
  - document cross-link inspection
  - `npm run build`
- Verification result:
  - `npx vitest run src/stage/tests/RichTextEditOverlay.test.tsx`
  - `npm run typecheck`
  - `npx vitest run --config vitest.e2e.config.ts src/stage/tests/Stage.e2e.test.ts -t "outside click|Escape|partial inline selection|ordered-list marker"`
  - `npm run build`
  - Result: passed before commit.
- Commit SHA:
  - Pending the Q1 commit
- Open follow-ups carried forward:
  - `P18-Q1` should land the first rich-stage dropdown stabilization fixes.

## P18-Q1: Stabilize rich-stage dropdown and selection retention

- Objective:
  - Introduce a stage-local rich-edit layer stack and make outside-click / `Escape` unwind nested rich-edit chrome one layer at a time.
- Status: `done`
- Allowed files:
  - `docs/TEXT_COMPONENT_PHASE_1_8_BRIEF.md`
  - `src/stage/stageRenderers/RichTextEditOverlay.tsx`
  - `src/stage/tests/RichTextEditOverlay.test.tsx`
  - `src/stage/tests/Stage.e2e.test.ts`
  - `docs/PLAYGROUND_SPEC.md`
  - `docs/TEXT_COMPONENT_PHASE_1_8_TASKLIST.md`
- Read-first files and target lines:
  - `src/stage/stageRenderers/RichTextEditOverlay.tsx:216-320`
  - `src/stage/stageRenderers/RichTextEditOverlay.tsx:620-910`
  - `src/stage/stageRenderers/RichTextEditOverlay.tsx:980-1085`
  - `src/stage/tests/RichTextEditOverlay.test.tsx:1-120`
  - `src/stage/tests/Stage.e2e.test.ts:409-620`
  - `docs/PLAYGROUND_SPEC.md:1753-1781`
- Implementation notes:
  - Keep the shared `Select` primitive.
  - Replace the overlay's ad hoc outside-click allowance list with a stage-local layer stack for the link panel and nested select layers.
  - Outside click closes only the topmost nested layer; once nested layers are closed, outside click still commits rich edit.
  - `Escape` closes only the topmost nested layer; once nested layers are closed, `Escape` still discards rich edit.
  - Swallow the triggering pointer event when an outer target only closes a nested layer so the same click does not also activate the underlying control.
  - Add e2e coverage for outside-click and `Escape` layer unwinding before moving on to drag or retained-selection work.
- Verification commands:
  - `npm run typecheck`
  - focused stage `vitest`
  - targeted stage e2e for nested outside-click and `Escape` unwinding
  - `npm run build`
- Verification result:
  - `npx vitest run src/stage/tests/RichTextEditOverlay.test.tsx`
  - `npm run typecheck`
  - `npx vitest run --config vitest.e2e.config.ts src/stage/tests/Stage.e2e.test.ts -t "outside click|Escape|partial inline selection|ordered-list marker"`
  - `npm run build`
  - Result: passed before commit.
- Commit SHA:
  - `651b788`
- Open follow-ups carried forward:
  - `P18-Q2` should convert the base toolbar itself to a popover-backed draggable surface.
  - `P18-Q3` should add retained visual selection while focus moves into the toolbar stack.

## P18-Q2: Base toolbar popover and drag behavior

- Objective:
  - Convert the base rich-text toolbar into a draggable popover-backed floating panel.
- Status: `pending`
- Allowed files:
  - `src/stage/stageRenderers/RichTextEditOverlay.tsx`
  - `src/stage/stageRenderers/richToolbarPosition.ts`
  - `src/stage/tests/RichTextEditOverlay.test.tsx`
  - `src/stage/tests/richToolbarPosition.test.ts`
  - `src/stage/tests/Stage.e2e.test.ts`
  - `docs/PLAYGROUND_SPEC.md`
  - `docs/TEXT_COMPONENT_PHASE_1_8_TASKLIST.md`
- Read-first files and target lines:
  - `src/components/ui/floating-panel-shell.tsx:1-80`
  - `src/components/ui/popover.tsx:1-80`
  - `src/stage/stageRenderers/RichTextEditOverlay.tsx:280-420`
  - `src/stage/stageRenderers/RichTextEditOverlay.tsx:640-860`
  - `src/stage/tests/Stage.e2e.test.ts:374-470`
- Implementation notes:
  - Rebuild this quantum using the focused panel host pattern instead of bespoke in-toolbar drag wiring.
  - Keep the base toolbar on the shared `FloatingPanelShell` / `PopoverSurface` path instead of the previous static shell override.
  - The failed first pass was reverted; current runtime behavior is a non-draggable anchored popover while drag is redesigned.
  - When Q2 is retried, store only a session-local drag offset; do not persist toolbar position into document state.
  - When Q2 is retried, clamp toolbar movement inside the viewport with a protected top gap below the editor top bar.
  - When Q2 is retried, keep nested link-panel positioning tied to the moved toolbar so link editing chrome travels with the base panel.
- Verification commands:
  - `npx vitest run src/stage/tests/RichTextEditOverlay.test.tsx src/stage/tests/richToolbarPosition.test.ts`
  - `npm run typecheck`
  - `npx vitest run --config vitest.e2e.config.ts src/stage/tests/Stage.e2e.test.ts -t "without a drag handle|outside click|Escape|partial inline selection|ordered-list marker"`
  - `npm run build`
- Verification result:
  - Reopened after the first drag implementation shipped a visible but non-working handle.
- Commit SHA:
  - `564d8ff` attempted Q2 but was rolled back in follow-up work; replacement commit pending.
- Open follow-ups carried forward:
  - `P18-Q2` must be rebuilt against the focused-panel shell pattern before phase 1.8 can continue.
  - `P18-Q3` should preserve the authored selection visually while the toolbar owns focus.

## P18-Q3: Selection retention and retained visual highlight

- Objective:
  - Preserve authored selection through toolbar interactions and keep it visibly highlighted while toolbar chrome owns focus.
- Status: `pending`
- Allowed files:
  - Planned during execution.
- Read-first files and target lines:
  - Planned during execution.
- Implementation notes:
  - Logical selection retention and visual retained-selection decoration are separate concerns.
  - Retained visual highlight is transient editor UI state, not persisted content.
- Verification commands:
  - Planned during execution
- Verification result:
  - Not started
- Commit SHA:
  - Not started
- Open follow-ups carried forward:
  - None yet.

## P18-Q4: Inspector-control convergence and conditional controls

- Objective:
  - Replace bespoke toolbar inputs with inspector controls where appropriate and hide structure-specific controls unless their structure mode is active.
- Status: `pending`
- Allowed files:
  - Planned during execution.
- Read-first files and target lines:
  - Planned during execution.
- Implementation notes:
  - Font size should reuse the inspector font-size control contract.
  - Block spacing should reuse a `ValueWithUnit` control with `px` / `em` support plus an `UnfoldVertical` icon.
  - Line height should use an inspector-style compact field plus a `MoveVertical` icon.
  - Block, ordered-list, unordered-list, and code-language dropdowns should appear only in their active structure modes.
- Verification commands:
  - Planned during execution
- Verification result:
  - Not started
- Commit SHA:
  - Not started
- Open follow-ups carried forward:
  - None yet.

## P18-Q5: Layered dismissal regressions and closeout

- Objective:
  - Close the remaining pre-phase-2 rich-stage interaction bugs and verify the layered panel model end to end.
- Status: `pending`
- Allowed files:
  - Planned during execution.
- Read-first files and target lines:
  - Planned during execution.
- Implementation notes:
  - Focus on one-layer-at-a-time outside-click and `Escape` regressions, plus any remaining stack-order edge cases discovered during Q2-Q4.
  - Do not absorb phase 2 features into this phase.
- Verification commands:
  - Planned during execution
- Verification result:
  - Not started
- Commit SHA:
  - Not started
- Open follow-ups carried forward:
  - None yet.
