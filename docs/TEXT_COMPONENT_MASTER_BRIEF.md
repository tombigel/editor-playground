# Text Component Master Brief

This document is the immutable source brief for the text-system recovery workstream.

Execution rules:

- Every fresh agent must read this file first.
- The canonical live execution ledger is [`TEXT_COMPONENT_TASKLIST.md`](./TEXT_COMPONENT_TASKLIST.md).
- If scope changes, update this brief first, then the tasklist, then code.
- API-first is mandatory: no important text behavior may exist only in editor code.

## Locked Follow-Ups

- Logic should be API first. Most important things should work if the editor is replaced or headless.
- Use a tasklist as a director and a memory model.
- Before starting implementation, save the original spec prompt together with the plan in the `docs` folder.
- Q5 scope clarification: the rich-text model migration may update pure conversion helpers and compatibility tests when the new rich schema would otherwise break API-first conversions.
- Q5 scope clarification: the rich-text model migration may also update rich defaults and the stage edit overlay when they still encode the legacy flat inline rich shape.
- Q6 scope clarification: the standalone list subtype may update model validation so list invariants are enforced headlessly, not only by renderers or future editor UI.
- Q6 scope clarification: the standalone list subtype may update inspector plumbing types when widening `TextSubtype` would otherwise break compile, without exposing new list UI behavior ahead of the dedicated inspector/editor quantum.

## Original Spec Prompt

The following prompt is preserved verbatim from the original user request:

```text
we have implemented text components enhanecements, buth there are many bugs and the work is till wip.

help me plan and separate to tasks all bugs, unfinished impementations and feature requests related to the text component.

This is the required spec for each text type (might diverge from what is actually implemented):
1. text block - (pretty much done) 
  - has a single semantic parent wrapper, single font, single style and color. can be a link. 
  - single rtl/ltr direction
  - future extension: 
    - when we will have good on stage editing - could have internal markdown inline styling like bold italic etc. could have multiple internal links
2. code block - 
  - has a single pre code block wrapper, can have customizable monofont, can have dark or light color text, can have a single customizable background, text style (bold, italic etc.) and can have customizable border and radius, has a selectable laguage hightlight dropdown.
  - only ltr
  - future extensions: 
    - highlight defaults to auto - recognize language
    - when we will have good on stage editing - could have internal  inline styling like bold italic 
3. rich text - 
  - data structure is subset of slate
  - always has non sematic div wrapper
  - each internal text part must be wrapped in a block, semantic or div, no free inline text parts, no blocks nesting
  - on stage editing, free color, font, text style 
  - multiple free text links, internal link styling can be defered and have only single wrapping style for each link
  - futute extensions
    - ltr/rtl only per block
    - should support lists ordered and unordered (list spec to follow), code blocks, semantic blocks, non-sematic blocks.
    - should have customizable spacing between blocks
4. lists - (new not implemented)
  - should have a single block wrapper one of ul, ol, dl
  - second level must be il for ul ol and dt  dd pairs for dl
  - ol should have a selectable ordering start, selectable number style per level (can be predefined at stage 1)
  - ul has selectable bullet style (can be predefined at stage 1)
  - alignment per block, rtl/ltr per item
  - single styling per block, and link per item - phase 1
  - when we will have good on stage editing - could have internal  inline styling like bold italic and multile free text links

editor inspector:
  - text: like current, when we have on stage editing in the inspector global settings, while editing as a floting bar loclized allowed styling
  - code: like current, when we have on stage editing in the inspector global settings, while editing as a floting bar loclized allowed styling, i wish when switching dark/light to reapply dark/light background color
  - rich text: when not in edit mode have some global styling like font, color, when in edit mode, a floating rich text editing panel with styling, block level selection including list and block, link.
  - have copy as markdown/paste from markdown advanced feature
  - when switching content type follow this matrix:

| From / to | text | code | list | rich |
| :---- | :---- | :---- | :---- | :---- |
| **text** | NA | Remove semantic block, apply code styling | Convert each hard line break to unordered list item | Convert to a rich text semantic block |
| **code** | Remove highlight styling, change to default (or last selected) font \- use p | NA | Convert each hard line break to an unordered list item | Convert to a rich text code block |
| **list** | Convert each item to hard line break \- use p | Convert to plain code text without list markers | NA | Convert to a rich text list block |
| **rich** | Ask if to flatten or split:  
if split \- 
use api rules if exists else flatten per block type rules

If flatten \- 
remove everything not supported

If single block \- use it, if multiple blocks flatten to paragraph by per content type rule | Ask if to flatten or split:  
if split \- 
use api rules if exists else flatten per block type rules

If flatten \- 
remove everything not supported

If single code block \- use it, if multiple blocks flatten to code by per content type rule  | Ask if to flatten or split:  
if split \- 
use api rules if exists else flatten per block type rules

If flatten \- 
remove everything not supported

If single list block \- use it, if multiple blocks flatten to lists by per content type rule | NA |

* split means that a rich text block can be split to multiple components each has its block type, i believe the behavior is already defined in the api (unless the implementer did not add it eventually)
* i will want amultiselect behavior just for text nodes of merging them to a single rich text node. this might prove tricky understanding order and reparenting, but its doable and i want it

editor stage:
- first click selects the node 
- selection title has "Text: [type]"
- second click enters edit mode (phase 1 just for rich text, phase 2 for all types) with clear indication for the mode (edit box styling?), elevating z-index or even popover
- show a floating text editing bar with all the relevant styling and formating options
- can click freely in the box boundaries and select text
- cmd+enter commits, esc cancels (optional confirmatin dialog with "dont show afain"), click outside commits
- text overflowing box verticaly changes component height while keeping sizing units (but adding some kind of min-height)
- inline link editing should reuse the link types selection ui


thats it for now

- check current implementation
- compare to requirements
- advise on wrong or missing details in the spec or implementation
- create a detailed plan in stages and phases.
- take your time, itterate, dont haste into hacky solutions
- define safeguards 
  1. File allowlist — every quantum names exact files. Only edit those.
  2. Read-first — read each target before editing; report lines to change.
  3. Verify before commit — npm run typecheck + relevant vitest run must both pass.
  4. Sequential — one quantum at a time, commit before next starts.
  5. Fresh context — each quantum runs as a fresh agent given this plan as brief.

good luck
```

## Approved Implementation Plan

The following implementation plan is preserved verbatim from the approved user instruction:

```text
# API-First Text Recovery With Persistent Task Memory

## Summary

Execution will be driven by two repo docs created before any implementation work:

- `docs/TEXT_COMPONENT_MASTER_BRIEF.md`
  Contains your original spec prompt verbatim, the approved implementation plan, locked assumptions, and non-goals. This is the immutable source brief for every fresh agent.
- `docs/TEXT_COMPONENT_TASKLIST.md`
  The live director and memory model. It tracks every quantum, exact file allowlist, read-first notes, line ranges to change, status, verification commands/results, commit SHA, and carry-forward risks.

No implementation quantum starts before those two docs exist.

Core rule for the whole workstream: text logic is API-first. If a behavior matters semantically, structurally, or for conversion, it must work through pure `DocumentModel -> DocumentModel` APIs without the editor.

## Memory And Tasklist Contract

`docs/TEXT_COMPONENT_TASKLIST.md` should be the running execution ledger with one section per quantum:

- `Objective`
- `Status`: `pending | in_progress | blocked | done`
- `Allowed files`
- `Read-first files and target lines`
- `Implementation notes`
- `Verification commands`
- `Verification result`
- `Commit SHA`
- `Open follow-ups carried forward`

Rules:

- Each fresh agent reads `TEXT_COMPONENT_MASTER_BRIEF.md` and `TEXT_COMPONENT_TASKLIST.md` first.
- Each quantum updates only its own tasklist section plus the shared progress summary at the top.
- If scope changes, update the brief first, then the tasklist, then code.
- If new bugs are found, record them in a `Discovered issues` section instead of solving them ad hoc.

## Canonical API Surface

These pure APIs must exist before UI work is considered complete:

- `setTextNodeContentDoc`
- `setRichTextContentDoc`
- `setListContentDoc`
- `setCodeBlockLanguageDoc`
- `setCodeBlockThemeDoc`
- `setTextDirectionDoc`
- `normalizeTextNodeDoc`
- `convertTextNodeDoc`
- `switchTextSubtypeDoc`
- `splitRichTextNodeDoc`
- `mergeTextNodesToRichDoc`

Model decisions:

- `TextSubtype` becomes `block | code | list | rich`
- Rich content becomes a block-based Slate subset
- List content becomes a first-class model, not editor-only formatting
- Link/button remain capabilities or presets on text nodes, not separate subtype families

## Quanta

### Q0: Bootstrap the memory layer

Purpose:
- Save your original prompt verbatim together with the approved plan in `docs`
- Create the live tasklist that will direct all later work

Allowed files:
- `docs/TEXT_COMPONENT_MASTER_BRIEF.md`
- `docs/TEXT_COMPONENT_TASKLIST.md`

Read-first:
- Your original prompt from this conversation
- `docs/PLAYGROUND_SPEC.md`
- `AGENTS.md`

Deliverables:
- Master brief with verbatim prompt, approved plan, assumptions, and safeguards
- Tasklist with all quanta below pre-seeded as entries

Verification:
- `npm run typecheck`
- `npx vitest run src/api/tests/documentApi.test.ts`
- `npm run build`

### Q1: Remove editor-only text logic drift

Purpose:
- Make pure document APIs the canonical implementation for all existing text/code/page-link mutations
- Reduce `editorMutations.ts` to a consumer of those APIs

Allowed files:
- `src/api/documentApi.ts`
- `src/api/editorApi.ts`
- `src/editor/editorMutations.ts`
- `src/model/types/index.ts`
- `src/api/tests/documentApi.test.ts`
- `src/editor/tests/editorMutations.test.ts`
- `docs/PLAYGROUND_SPEC.md`
- `docs/API.md`
- `docs/TEXT_COMPONENT_TASKLIST.md`

Read-first:
- `src/api/documentApi.ts`
- `src/editor/editorMutations.ts`
- `src/model/types/index.ts`

Deliverables:
- API parity for text/code/page-link fields
- Unified normalization rules
- Tests proving document API is the source of truth

Verification:
- `npm run typecheck`
- `npx vitest run src/api/tests/documentApi.test.ts src/editor/tests/editorMutations.test.ts`
- `npm run build`

### Q2: Extract the text conversion engine

Purpose:
- Move subtype conversion policy into explicit pure APIs
- Make UI choose modes, not own logic

Allowed files:
- `src/api/documentApi.ts`
- `src/api/textConversion.ts`
- `src/app/types/index.ts`
- `src/app/editorState.ts`
- `src/api/tests/documentApi.test.ts`
- `docs/PLAYGROUND_SPEC.md`
- `docs/API.md`
- `docs/TEXT_COMPONENT_TASKLIST.md`

Read-first:
- `src/api/documentApi.ts`
- `src/app/editorState.ts`

Deliverables:
- `convertTextNodeDoc`
- `switchTextSubtypeDoc` as a wrapper over explicit conversion helpers
- Initial conversion coverage for `block | code | rich`

Verification:
- `npm run typecheck`
- `npx vitest run src/api/tests/documentApi.test.ts`
- `npm run build`

### Q3: Harden block text against the agreed spec

Purpose:
- Make simple text truly simple and stable

Allowed files:
- `src/model/defaultFactories.ts`
- `src/api/documentApi.ts`
- `src/render/nodePresentation.tsx`
- `src/render/leafPresentation.ts`
- `src/render/tests/nodePresentation.test.tsx`
- `src/render/tests/leafPresentation.test.ts`
- `docs/PLAYGROUND_SPEC.md`
- `docs/TEXT_COMPONENT_TASKLIST.md`

Deliverables:
- One wrapper, one font family, one styling set, one node-level link capability, one direction
- No accidental rich-like behavior in block text

Verification:
- `npm run typecheck`
- relevant render/API vitest suite
- `npm run build`

### Q4: Stabilize code block as a real subtype

Purpose:
- Make code behavior complete in model and API before UI polish

Allowed files:
- `src/model/textNodeDefaults.ts`
- `src/model/defaultFactories.ts`
- `src/api/documentApi.ts`
- `src/render/codeHighlight.ts`
- `src/render/nodePresentation.tsx`
- `src/render/leafPresentation.ts`
- code-related tests
- `docs/PLAYGROUND_SPEC.md`
- `docs/API.md`
- `docs/TEXT_COMPONENT_TASKLIST.md`

Deliverables:
- Mono font customization
- language dropdown support in pure API
- theme-aware background handling
- border/radius/background behavior in pure API
- strict LTR

Verification:
- `npm run typecheck`
- relevant vitest suite
- `npm run build`

### Q5: Rich text model v2

Purpose:
- Replace the current single-paragraph inline-only rich model with the intended block-based model

Allowed files:
- `src/model/types/index.ts`
- `src/model/richContent.ts`
- `src/model/migration.ts`
- `src/model/validation.ts`
- `src/api/documentApi.ts`
- `src/render/richTextEditor.ts`
- `src/render/nodePresentation.tsx`
- `src/site/SiteRenderer.tsx`
- rich/model/site tests
- `docs/PLAYGROUND_SPEC.md`
- `docs/API.md`
- `docs/TEXT_COMPONENT_TASKLIST.md`

Deliverables:
- Block-based Slate subset
- Nonsemantic outer wrapper for rich nodes
- No free root inline text
- No block nesting
- migration from old rich format

Verification:
- `npm run typecheck`
- relevant vitest suite
- `npm run build`

### Q6: Add standalone list subtype

Purpose:
- Implement lists as first-class text nodes in the model/API

Allowed files:
- `src/model/types/index.ts`
- `src/model/listContent.ts`
- `src/model/defaultFactories.ts`
- `src/api/documentApi.ts`
- `src/api/textConversion.ts`
- `src/render/nodePresentation.tsx`
- `src/render/leafPresentation.ts`
- `src/site/SiteRenderer.tsx`
- list tests
- `docs/PLAYGROUND_SPEC.md`
- `docs/API.md`
- `docs/TEXT_COMPONENT_TASKLIST.md`

Deliverables:
- `ul | ol | dl`
- proper second-level structure
- ordered start and predefined marker styles
- per-item direction
- per-item link
- phase-1 no nested lists

Verification:
- `npm run typecheck`
- relevant vitest suite
- `npm run build`

### Q7: Add headless split and merge

Purpose:
- Implement your most important structure-changing features as pure APIs

Allowed files:
- `src/api/documentApi.ts`
- `src/api/textConversion.ts`
- `src/api/textMerge.ts`
- merge/split tests
- `docs/PLAYGROUND_SPEC.md`
- `docs/API.md`
- `docs/TEXT_COMPONENT_TASKLIST.md`

Deliverables:
- `splitRichTextNodeDoc`
- `mergeTextNodesToRichDoc`
- same-parent sibling merge only
- tree-order based merge behavior
- deterministic flatten vs split behavior

Verification:
- `npm run typecheck`
- relevant vitest suite
- `npm run build`

### Q8: Update renderers and labels to consume canonical model

Purpose:
- Make stage/site reflect subtype-aware semantics from the API layer

Allowed files:
- `src/render/nodePresentation.tsx`
- `src/render/leafPresentation.ts`
- `src/site/SiteRenderer.tsx`
- render/site tests
- `docs/PLAYGROUND_SPEC.md`
- `docs/TEXT_COMPONENT_TASKLIST.md`

Deliverables:
- `Text: block`, `Text: code`, `Text: list`, `Text: rich` labeling
- shared renderer behavior across stage and site
- no renderer-only semantic rules

Verification:
- `npm run typecheck`
- relevant vitest suite
- `npm run build`

### Q9: Rebuild editor and inspector as API consumers

Purpose:
- Thin the UI down to orchestration over pure APIs

Allowed files:
- `src/app/types/index.ts`
- `src/app/editorState.ts`
- `src/panels/InspectorPanel.tsx`
- `src/panels/inspector/config.text.tsx`
- `src/panels/inspector/contentSections/textSections.tsx`
- `src/panels/MultiSelectInspector.tsx`
- panel tests
- `docs/PLAYGROUND_SPEC.md`
- `docs/TEXT_COMPONENT_TASKLIST.md`

Deliverables:
- subtype switching calls conversion APIs
- merge action calls merge API
- flatten/split prompt chooses API mode only

Verification:
- `npm run typecheck`
- relevant vitest suite
- `npm run build`

### Q10: Stage editing UX

Purpose:
- Add the richer stage interaction only after the API and model are stable

Allowed files:
- `src/stage/Stage.tsx`
- `src/stage/useRichTextEditMode.ts`
- `src/stage/richEditContext.tsx`
- `src/stage/stageRenderers/RichTextEditOverlay.tsx`
- `src/stage/stageRenderers/leafRenderer.tsx`
- shared DS files only if truly needed
- stage tests
- `docs/PLAYGROUND_SPEC.md`
- `docs/DESIGN_SYSTEM_CONVERGENCE_AUDIT.md`
- `docs/TEXT_COMPONENT_TASKLIST.md`

Deliverables:
- first click selects
- second click on selected text enters edit mode
- rich first, other types later
- visible edit-state chrome
- floating toolbar
- `Cmd+Enter` commit, `Esc` cancel, outside click commit
- auto-height growth with min-height

Verification:
- `npm run typecheck`
- relevant vitest suite
- `npm run build`

## Safeguards

- File allowlist: every quantum edits only its listed files.
- Read-first: each target file must be read and the line regions to change must be recorded in the tasklist before editing.
- Verify before commit: `npm run typecheck`, relevant `vitest`, and `npm run build` must pass.
- Sequential: one quantum only, then commit.
- Fresh context: each quantum is executed by a fresh agent that reads the master brief and tasklist first.

## Assumptions

- API-first is the primary architectural constraint and overrides UI convenience.
- Rich text remains Slate-backed, but Slate is an implementation detail behind the model/API contract.
- List is a first-class subtype, not an inspector formatting mode.
- Same-parent sibling merge is the only phase-1 merge scope.
- The docs bootstrap quantum happens first, before any code mutation.
```
