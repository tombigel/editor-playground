# Text Component Phase 1.5 Brief

This document is the active execution brief for the text-system phase 1.5 workstream.

Historical source documents:

- [`TEXT_COMPONENT_MASTER_BRIEF.md`](./TEXT_COMPONENT_MASTER_BRIEF.md)
- [`TEXT_COMPONENT_TASKLIST.md`](./TEXT_COMPONENT_TASKLIST.md)

Execution rules:

- API-first remains mandatory: no important text behavior may exist only in editor code.
- Breaking changes are allowed; obsolete APIs and schema shapes may be removed.
- The canonical live execution ledger for this phase is [`TEXT_COMPONENT_PHASE_1_5_TASKLIST.md`](./TEXT_COMPONENT_PHASE_1_5_TASKLIST.md).
- Phase 1.5 continues quantum-to-quantum without pausing unless a blocker appears, the brief becomes contradictory, or a missing decision would materially change the persisted product contract.
- Phase 1.5 does not add stage edit entry for standalone `block`, `code`, or `list` nodes.

## Phase Boundary

Phase 1.5 includes all remaining text-component work from the original brief except work that was explicitly phase 2 or was later locked to phase 2 during refinement.

Deferred to phase 2:

- on-stage editing entry for standalone block text
- on-stage editing entry for standalone code blocks
- on-stage editing entry for standalone lists
- description-list authoring UX in rich editing
- rich list nesting and indent levels
- standalone list linking UI
- standalone list per-item direction UI
- granular rich-to-simple split conversion that preserves one-block rich nodes when simple-node support is insufficient
- unified all-text stage editing shell

## Locked Product Decisions

- Canonical pure API naming uses `*Doc`.
- Rich content remains Slate-compatible data, but persisted content is a validated subset of Slate.
- Supported rich root blocks in phase 1.5 are:
  - `paragraph`, `div`, `blockquote`, `h1`-`h6`
  - rich code block
  - rich list block for `ul` and `ol`
- `dl` is deferred from rich authoring.
- Rich list nesting and indent levels are deferred.
- Markdown import/export baseline is GFM.
- Code language modes include `auto` and `markdown`.
- `markdown` code language means syntax-highlighted markdown source, not parsed markdown content.
- Rich block/list controls are block-scoped, not inline-scoped.
- Block/list controls never split a block around inline text selection.
- Multi-block block/list conversion unifies touched blocks into one result.
- When converting touched blocks to lists, original block boundaries are treated as hard line breaks.
- Standalone list inspector in phase 1.5 covers `ul` and `ol` only.
- Standalone list linking and per-item direction UI are deferred to phase 2 on-stage editing.

## Canonical API Surface

Phase 1.5 should end with this pure-document API surface as the canonical text contract:

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

Rich block-structure APIs added in phase 1.5:

- `setRichBlockTypeDoc`
- `setRichListKindDoc`
- `setRichListMarkerStyleDoc`
- `setRichBlockLineHeightDoc`
- `setRichBlockSpacingDoc`

## Rich Subset Contract

- Persist rich content as Slate-compatible JSON.
- Treat persisted rich content as the playground's supported subset of Slate, not as arbitrary Slate data.
- Root rich content must always be an array of supported block nodes.
- Free inline root nodes are not valid persisted content.
- Unsupported Slate elements must be rejected or normalized out before persistence.
- Validation and normalization belong in model/API code, not editor-only code.

## Phase 1.5 Quanta

### P15-Q0: Bootstrap the new 1.5 / 2.0 planning split

- Create:
  - [`TEXT_COMPONENT_PHASE_1_5_BRIEF.md`](./TEXT_COMPONENT_PHASE_1_5_BRIEF.md)
  - [`TEXT_COMPONENT_PHASE_1_5_TASKLIST.md`](./TEXT_COMPONENT_PHASE_1_5_TASKLIST.md)
  - [`TEXT_COMPONENT_PHASE_2_0_BRIEF.md`](./TEXT_COMPONENT_PHASE_2_0_BRIEF.md)
  - [`TEXT_COMPONENT_PHASE_2_0_TASKLIST.md`](./TEXT_COMPONENT_PHASE_2_0_TASKLIST.md)
- Annotate the original tasklist with additive deferred-destination notes.
- Keep the original master brief unchanged.

### P15-Q1: Replace the text API surface with the canonical contract

- Rename and consolidate pure document APIs to canonical `*Doc` names.
- Remove obsolete `setNode*` naming rather than preserving compatibility aliases.
- Update editor, stage, site, tests, and docs in the same quantum.
- Keep one normalization path in `documentApi.ts`.

### P15-Q2: Tighten rich content into our validated Slate subset

- Keep `RichContent` Slate-compatible, but persist only the supported subset.
- Expand the rich schema to support semantic text blocks, non-semantic `div`, rich code blocks, and rich `ul`/`ol` list blocks.
- Add per-block direction.
- Add rich-node `blockGap`.
- Add per-block line height for non-list text blocks.
- Keep rich lists flat in phase 1.5.

### P15-Q3: Complete the conversion matrix exactly

- Finish pure conversions now that rich can represent code and lists.
- Phase 1.5 `rich -> simple` rules:
  - single-block rich: flatten to one simple node
  - multi-block rich with `split`: split by block boundary, then flatten each block to the requested simple subtype
  - never preserve one-block rich wrappers during this path in phase 1.5
- Block/list conversion rules:
  - `block -> ul/ol`: hard line breaks become one `li`
  - `ul -> ol` and `ol -> ul`: preserve existing `li`
  - `ul/ol -> block`: flatten list items to hard line breaks
  - block, `ul`, and `ol` are mutually exclusive block modes
  - multi-block conversion unifies touched blocks into one result
  - original block boundaries are treated as hard line breaks

### P15-Q4: GFM import/export and code language completion

- Add pure markdown serialize/parse for block/code/list/rich.
- Support copy-as-markdown and paste-from-markdown via API first.
- Add code language `auto`.
- Add code language `markdown` as highlighted code, not parsed document markdown.
- Unsupported markdown constructs degrade deterministically.

### P15-Q5: Complete rich authoring UX on the existing rich stage editor

- Keep stage edit entry rich-only.
- Floating text bar control order:
  - font picker
  - font size
  - bold
  - italic
  - underline
  - strikethrough
  - text color
  - highlight color
  - link
  - non-list block enable/dropdown
  - ordered-list enable/select plus marker-type dropdown
  - unordered-list enable/select plus bullet-type dropdown
  - line height
  - block spacing
- `block`, `ol`, and `ul` are mutually exclusive.
- Block/list controls act on the containing block or blocks touched by the selection and never split around inline selections.
- Multi-block selection unifies touched blocks into one converted block/list result.
- Original block boundaries count as hard line breaks for list conversion.
- `dl`, nesting, and indent controls do not appear in phase 1.5.
- Replace the localized URL-only popover with the shared link-type picker.

### P15-Q6: Simplify standalone list inspector for phase 1.5

- Inspector authoring scope is `ul` and `ol` only.
- `dl` authoring UI is deferred until phase 2.
- Replace line-editor-first list editing as the main flow.
- Add structured item editing for `ul` and `ol`.
- Defer per-item linking UI and per-item direction UI.
- Keep bulk text/markdown editing only as an advanced helper.
- Preserve headless API/model support for deferred list fields.

### P15-Q7: Stable rich-stage e2e completion

- Add stable targeted e2e coverage for:
  - select then second-click enter
  - toolbar interactions
  - shared link picker interactions
  - block/ul/ol mutual exclusivity
  - containing-block conversion without block splitting
  - multi-block selection unifying to one block/list result
  - code/list block authoring
  - outside-click commit
  - escape discard
  - auto-height growth
  - markdown paste/import where implemented

## Verification Rules

For every executable phase 1.5 quantum:

- update [`PLAYGROUND_SPEC.md`](./PLAYGROUND_SPEC.md)
- update subsystem tests in the same change set
- run:
  - `npm run typecheck`
  - focused `vitest`
  - `npm run build`
  - targeted stage e2e when interaction behavior changes
