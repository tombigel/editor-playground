# Text Component Phase 1.8 Brief

This document is the active execution brief for the text-system phase 1.8 stabilization workstream.

Source documents:

- [`TEXT_COMPONENT_MASTER_BRIEF.md`](./TEXT_COMPONENT_MASTER_BRIEF.md)
- [`TEXT_COMPONENT_PHASE_1_7_BRIEF.md`](./TEXT_COMPONENT_PHASE_1_7_BRIEF.md)
- [`TEXT_COMPONENT_PHASE_1_7_TASKLIST.md`](./TEXT_COMPONENT_PHASE_1_7_TASKLIST.md)
- [`TEXT_COMPONENT_PHASE_2_0_BRIEF.md`](./TEXT_COMPONENT_PHASE_2_0_BRIEF.md)

Execution rules:

- API-first remains mandatory: no important text behavior may exist only in editor code.
- Breaking changes are allowed when they are required to remove incorrect interaction behavior or dead transitional branches.
- The canonical live execution ledger for this phase is [`TEXT_COMPONENT_PHASE_1_8_TASKLIST.md`](./TEXT_COMPONENT_PHASE_1_8_TASKLIST.md).
- Phase 1.8 continues quantum-to-quantum without pausing unless a blocker appears, the brief becomes contradictory, or a missing external dependency or product decision cannot be derived safely from the brief and codebase.
- Do not start phase 2.0 feature work while known phase 1.x text-editing regressions remain open.
- Execute one quantum at a time, verify it, commit it, and stop for review before starting the next quantum.

## Phase Boundary

Phase 1.8 exists to stabilize the post-1.7 text system before phase 2.0 starts.

Phase 1.7 is complete for the canonical text-model refactor.

Phase 2.0 remains planned-only and should not execute while rich-stage editing still has known interaction regressions such as incorrect dropdown, focus, selection-retention, or outside-click behavior.

## Locked Product Decisions

- The canonical 1.7 text model remains the storage contract:
  - all text nodes persist `TextDocumentContent`
  - `block`, `code`, `list`, and `rich` remain persisted subtypes as constraints/editor modes only
- Phase 1.8 is stabilization, not a stealth phase 2:
  - no standalone block/code/list on-stage editing
  - no nested list authoring
  - no `dl` authoring
  - no unified all-text stage shell
- Rich-stage editing must be reliable enough to serve as the baseline interaction model for phase 2.
- The base rich-text floating panel stays open for the entire rich-edit session.
- The base panel will become a popover-backed floating surface built on `FloatingPanelShell` / `PopoverSurface`.
- The base panel will be draggable by a dedicated header or drag zone and clamped to the viewport below the top bar.
- Toolbar position should start anchored near the edited node, then remember its dragged offset for the current browser session.
- Dropdowns, popovers, inline inputs, and outside-click commit behavior must preserve the authored Slate selection unless the user explicitly changes it.
- Nested rich-edit chrome unwinds one layer at a time on outside click and `Escape`.
- The base toolbar is not a closable intermediate layer; after nested layers are closed, the next outside click commits and the next `Escape` discards.
- If text was selected before focus moved into the panel, it should stay visually highlighted through a transient retained-selection decoration rather than persisted content markup.
- Retained-selection styling should read as native-like blue rather than a persisted `<mark>`-style content highlight.
- Font size should reuse the inspector font-size control contract.
- Block spacing should reuse an inspector-style `ValueWithUnit` control with `px` and `em` support plus an `UnfoldVertical` icon.
- Line height should use an inspector-style compact field with a `MoveVertical` icon.
- Structure-specific controls are conditional:
  - block type dropdown only in block mode
  - ordered marker dropdown only in `ol` mode
  - unordered marker dropdown only in `ul` mode
  - code language dropdown only in code-block mode
- No auto code-language detection is added in phase 1.8.
- Shared editor controls should keep using the design-system primitives rather than introducing bespoke stage-only control stacks.

## Stabilization Scope

- rich-stage toolbar select and popover interactions
- stage-local layered panel, click, and keyboard management for rich edit
- draggable base toolbar behavior
- focus and authored-selection retention across toolbar interactions
- retained visual selection highlight while panel chrome owns focus
- outside-click commit versus in-toolbar interaction boundaries
- inspector-control reuse for toolbar inputs
- block/list/code toolbar conversions after focus leaves the editable surface
- conditional structure-specific toolbar control visibility
- regression coverage for the above, with emphasis on realistic e2e interaction paths

## Phase 1.8 Quanta

### P18-Q0: Bootstrap the stabilization ledger

- Create:
  - [`TEXT_COMPONENT_PHASE_1_8_BRIEF.md`](./TEXT_COMPONENT_PHASE_1_8_BRIEF.md)
  - [`TEXT_COMPONENT_PHASE_1_8_TASKLIST.md`](./TEXT_COMPONENT_PHASE_1_8_TASKLIST.md)
- Update roadmap cross-links and active-workstream references.
- Mark phase 1.8 as the active pre-phase-2 text workstream.

### P18-Q1: Rich-stage panel stack architecture

- Define a stage-local layer model for the base toolbar, link panel, and nested dropdown layers.
- Replace ad hoc outside-click logic with stack-aware dismissal and `Escape` handling.
- Verify, commit, and pause.

### P18-Q2: Base toolbar popover and drag behavior

- Convert the base toolbar to a true popover-backed surface.
- Add a drag handle, viewport clamping, and session-memory position behavior.
- Verify, commit, and pause.

### P18-Q3: Selection retention and retained visual highlight

- Preserve the authored Slate selection through toolbar interactions.
- Render retained selection through a transient Slate decoration while panel chrome owns focus.
- Keep toolbar controls keyboard- and pointer-accessible.
- Verify, commit, and pause.

### P18-Q4: Inspector-control convergence and conditional controls

- Replace bespoke toolbar inputs with inspector control primitives where appropriate.
- Reuse the inspector font-size control contract.
- Add icon-led line-height and block-spacing controls.
- Hide structure-specific dropdowns unless their structure mode is active.
- Verify, commit, and pause.

### P18-Q5: Layered dismissal regressions and closeout

- Verify one-layer-at-a-time outside-click and `Escape` behavior across nested layers.
- Close remaining pre-phase-2 rich-stage interaction bugs without absorbing phase-2 scope.
- Verify, commit, and pause.

## Verification Rules

For every executable phase 1.8 quantum:

- update [`PLAYGROUND_SPEC.md`](./PLAYGROUND_SPEC.md) when user-visible behavior changes or when the existing wording is not sufficient
- update subsystem tests in the same change set
- run:
  - `npm run typecheck`
  - focused `vitest`
  - `npm run build`
