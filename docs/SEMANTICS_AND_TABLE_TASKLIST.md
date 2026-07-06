# Semantic Wrappers, Link Types, and Slate Table Block: Agent Task List

Execution-ready plan for three roadmap items: **RI-12B** (semantic wrapper subtypes `nav`/`aside`/`article`), **RI-12A slice** (extended link types), and **RI-40 simple variant** (Slate-backed table block). Written to be executed by any competent coding agent with no access to prior conversations.

Status: `In progress`. Owner lane: `Shared`. Predecessor: RI-11 (video, inline SVG, gradients) is fully shipped.

---

## Ground Rules For Implementing Agents

Read [AGENTS.md](../AGENTS.md) / [CLAUDE.md](../CLAUDE.md) first. Non-negotiables, summarized:

1. **API-first.** Every operation lands as a pure `DocumentModel → DocumentModel` function under `src/api/documentApi/` first, then an editor-state wrapper (`src/editor/editorMutations/` exposed through `src/api/editorApi.ts`), and only then UI. Nothing may be possible only through the UI.
2. **Architecture boundaries** are CI-enforced (`pnpm run check:architecture`): `src/panels` must not import from `src/model` or `src/stage` directly — re-export needed model utilities through `src/api/documentViewApi.ts`. `src/model` imports nothing from editor/app/panels/api.
3. **Docs + tests ride in the same commit** as the functional change: update `docs/PLAYGROUND_SPEC.md` behavior text and add/extend Vitest tests (tests live in each subsystem's `tests/` folder). New public exports from `src/api/documentApi.ts` must be added to the Export Coverage Index in `docs/API.md` or `pnpm run build` fails (`check:api-docs`).
4. **Conventional commits**; the pre-commit hook auto-bumps versions and the changelog — expect it to touch `package.json`, `src/lib/version.ts`, `CHANGELOG.md` on every commit. Stage only task-owned files; never bundle unrelated cleanup.
5. **Editor UI reuses design-system primitives** from `src/components/ui` and `src/panels/InspectorControls.tsx` (`FormField`, `Select`, `Switch`, `OptionsSelector`, `HoverColorField`, `NumericUnitInlineField`, `InspectorSectionCard`). No bespoke CSS, no hardcoded colors; read `docs/EDITOR_STYLE_GUIDE.md` before panel work.
6. **Do not trust line numbers in this document.** The codebase moves. Anchors below are given as symbol names; locate them with `rg -n "<symbol>"` before editing.
7. **Commands:** `pnpm test` (Vitest, full), `pnpm exec vitest run <file>` (focused), `pnpm exec tsc -b` (typecheck), `pnpm run build` (full gate incl. api-docs + architecture checks). Dev server: launch config `dev` (vite, respects `$PORT`).
8. Other agents may work nearby. Never revert edits you did not make; if a file changed under you, re-read it and rebase your edit.

### Key anchors (verified 2026-07-05)

| Concern | Symbol | File |
| --- | --- | --- |
| Wrapper subtypes | `ContainerSubtype` | `src/model/types/index.ts` |
| Wrapper → HTML tag | `getWrapperTag()` (single source of truth) | `src/site/siteShared.ts` |
| Render tag typing | `RenderWrapperTag` | `src/render/types/index.ts` |
| Wrapper factory | `createContainerNode()` | `src/model/defaultFactories.ts` |
| Wrapper insertion | `insertContainerDoc()` / `insertWrapper()` | `src/api/documentApi/insertion.ts`, `src/editor/editorMutations/insertion.ts` |
| Promote/demote roles | `requestPromoteWrapperRole`/`demoteWrapperRole` | `src/editor/editorMutations/treeRole.ts` |
| Inspector routing | `resolveInspectorConfigKey()` | `src/panels/inspector/schema.tsx` |
| Wrapper inspector shared UI | `config.wrapperShared.tsx`, `WrapperDesignSection` | `src/panels/inspector/` |
| Structural validation | `validateDocument()` | `src/model/validation.ts` |
| Link model | `LinkKind`, `LinkExtension` | `src/model/types/index.ts` |
| Href resolution | `getLinkHref()`, `normalizeNavigationKind()` | `src/model/links.ts` |
| Link field mutations | `setTextNodeContentDoc()` (fields `linkType`, `href`, …) | `src/api/documentApi/text.ts` |
| Link inspector UI | `NavigationFields` | `src/panels/inspector/contentSections/shared.tsx` |
| Link validation | `validateLinks()` | `src/model/validation.ts` |
| Slate block unions | `RichBlock`, `TextDocumentBlock`, `RichTextBlockType` | `src/model/types/index.ts` |
| Text subtypes | `TextSubtype` (`'block' \| 'rich' \| 'code' \| 'list'`) | `src/model/types/index.ts` |
| Rich content factories/guards/normalization | `src/model/richContent/*` | — |
| Standalone-list precedent (copy this architecture for table) | `getSingleListBlockContent`, list branch of `renderLeafContent()` | `src/model/richContent/`, `src/render/nodePresentation.tsx` |
| Markdown round-trip | `parseMarkdownForTextSubtype`, `serializeTextNodeToMarkdown` | `src/api/textMarkdown.ts` |
| Text conversion between subtypes | `convertTextNodeDoc()` | `src/api/textConversion.ts` |
| Leaf insertion roles | `LeafInsertionRole` | `src/api/documentApi/types.ts` |
| Text-type picker (insert rail "Text" flyout) | search `onOpenTextTypes` | `src/panels/`, `src/app/AppShellEditorMain.tsx` |
| Site export tests | `src/site/tests/siteExport.test.tsx` | — |
| documentApi tests | `src/api/tests/documentApi*.test.ts` | — |

---

## Execution Strategy

- Three independent workstreams: **A. semantic wrappers**, **B. link types**, **C. table block**. A and B are parallelizable (disjoint files except `src/model/types/index.ts` — coordinate or run sequentially through that file). C is the largest and depends on nothing from A/B, but its export semantics benefit from A landing first (a table often lives inside `article`/`section`).
- One bounded change per task; sequential commits; stage only task-owned files.
- Commit at the boundary between workstreams: close and commit Workstream A before starting B, close and commit B before starting C, and keep the final closeout as its own commit if it changes files.
- Every functional task is **Tier 2** (docs + tests in the same commit, typecheck). The final task of each workstream and the overall closeout are **Tier 3** (`pnpm run build`).
- Use read-only exploration before each task to re-locate anchors; do not re-plan.

## Parallel Prep Wave (read-only, no commits)

**Explorer A (wrappers):** confirm `ContainerSubtype` usages beyond the anchor table: `rg -n "subtype === 'section'|subtype === 'container'|isStructuralWrapper|isSiteSectionRole" src/`. Catalog every switch/guard that enumerates wrapper subtypes (validation, normalization `forceOpaqueColorValue` guard, `getContentWrapperBaseStyle` height policy, snap guides, layers panel icons, drag/drop reparent rules). Deliverable: exhaustive list of files needing a `nav|aside|article` decision.

**Explorer B (links):** trace `LinkExtension` consumers: `rg -n "linkType|getLinkHref|LinkKind" src/ --glob '!**/tests/**'`. Include rich-text inline links (`RichTextLink` in the Slate model), `validateLinks`, page-link sync (`syncPageHrefLinks` in `src/api/pageApi.ts`), and the AI command layer (`src/api/ai/`) for any linkType vocabulary.

**Explorer C (table):** read the full standalone-list implementation as the architectural template: model types (`ListBlockContent`), factories, normalization + `validateTextSubtypeContentStructure`, `convertTextNodeDoc` list cases, `renderLeafContent` list branch, list markdown round-trip in `textMarkdown.ts`, list editing overlay in `src/stage/stageRenderers/`, and the text-type picker UI. Deliverable: file-by-file map of "where list does X" → "where table must do X".

---

## Workstream A — Semantic Wrappers (RI-12B)

### Task A1: `nav`/`aside`/`article` in the model and export

**Agent type:** worker.

**Scope:** `src/model/types/index.ts`, `src/site/siteShared.ts`, `src/render/types/index.ts`, `src/model/defaultFactories.ts`, `src/model/validation.ts` (+ tests, spec, API docs).

**Implementation**
- Extend `ContainerSubtype` with `'nav' | 'aside' | 'article'`.
- `getWrapperTag()`: map each new subtype to its own HTML tag; widen its return type and `RenderWrapperTag` accordingly. Semantic tags alone are the a11y contract — do **not** add redundant `role` attributes.
- `createContainerNode()`: new subtypes reuse the plain `container` defaults (rect, style) with capitalized default names (`Nav`, `Aside`, `Article`).
- Placement policy (this is the deliberate scope cut — record it in the spec): the new subtypes behave like `container` (nestable anywhere a container is allowed, **not** top-level site sections). `header`/`footer`/`section` remain the only top-level roles; `<main>` stays hardcoded in `renderPlan.ts`. Verify `validateDocument()` and any `isSiteSectionRole`-style guards treat the new subtypes as non-structural; extend the parent/child rules in `validateDocument` so nav/aside/article accept the same children as `container`.
- Sweep every enumeration found by Explorer A and make an explicit choice per site (usually: treat like `container`). Do not leave a default-case fall-through undocumented.
- `sp-role-nav` etc. CSS classes come free from `getNodeClassName`; no CSS work needed.
- Migration: additive union — confirm `migrateDocumentModel` idempotency tests still pass, no migration code needed.

**Verify (Tier 2):** new unit tests — export tag per subtype (extend `src/site/tests/siteExport.test.tsx`), insertion + validation acceptance (`src/api/tests/documentApi.test.ts` pattern); `pnpm exec tsc -b`. Spec: new "Semantic wrapper roles" bullet list in `docs/PLAYGROUND_SPEC.md`; `docs/API.md` `ContainerSubtype` mention updated.

**Commit:** `feat(model): add nav, aside, and article wrapper subtypes`

### Task A2: authoring surface for semantic roles

**Agent type:** worker.

**Scope:** `src/api/documentApi/` (new pure fn), `src/editor/editorMutations/`, `src/app/types` + `src/app/editorState.ts`, inspector (`src/panels/inspector/`), insert rail if chosen (+ tests, spec).

**Implementation**
- Pure API first: `setWrapperSemanticRoleDoc(document, nodeId, subtype)` converting between `container | group | nav | aside | article` in place (children, rect, styles untouched). Reject conversions from/to `section`/`header`/`footer` (those keep the existing promote/demote flow). Export from `src/api/documentApi.ts` + API docs index.
- Editor wrapper + reducer action (`wrapperSemanticRole`), history-tracked.
- Inspector: on the container inspector config, add a "Role" row using `OptionsSelector` (or compact `Select` if five options don't fit the panel width — test at the panel's ~280px width) offering Container / Group / Nav / Aside / Article. Reuse `config.wrapperShared.tsx` for the new subtypes' inspector routing in `resolveInspectorConfigKey()` — nav/aside/article route to the same config as `container`.
- Layers panel: give the new subtypes distinguishable icons (`getNodeIcon` — `rg -n "getNodeIcon" src/render/`); add any new lucide imports to the icon catalog in `src/design-system/sections/DesignTokensSection.tsx` (an inventory test enforces this).
- Insert rail: do **not** add three new buttons; the Container button plus the inspector Role selector is the authoring path. Note this in the spec.

**Verify (Tier 2):** documentApi tests for role conversion incl. rejection cases; inspector routing test if `schema.test` exists; typecheck. Spec: authoring flow description.

**Commit:** `feat(editor): semantic role selector for container wrappers`

### Task A3 (Tier 3 closeout): build + preview verification

Run `pnpm run build`. In the dev preview: insert a container, switch Role → Nav, confirm the stage renders and the exported HTML (Preview site) emits `<nav class="… sp-role-nav …">`. Commit only if fixes were needed.

---

## Workstream B — Extended Link Types (RI-12A slice)

### Task B1: `email`, `tel`, and download links in the model

**Agent type:** worker.

**Scope:** `src/model/types/index.ts`, `src/model/links.ts`, `src/api/documentApi/text.ts`, `src/model/validation.ts` (+ tests, spec, API docs).

**Implementation**
- Extend `LinkKind` and `LinkExtension.linkType` with `'email' | 'tel'`. Add optional fields: `email?: string`, `phone?: string`, and `download?: boolean` (download applies to `external` links only; render as a bare `download` attribute).
- `getLinkHref()`: `email` → `mailto:${email}` (append nothing when empty → return null/undefined per the existing empty-href convention — mirror how empty `external` href behaves today), `tel` → `tel:${phone}` with whitespace stripped. `normalizeNavigationKind()` accepts the new kinds.
- `setTextNodeContentDoc` field handlers: new `EditorTextField` entries `linkEmail`, `linkPhone`, `linkDownload` (follow the existing `href`/`openInNewTab` handler pattern and its media/text guards — note videos are never linkable). Switching `linkType` clears fields that belong to other kinds (mirror the existing `page` cleanup).
- `openInNewTab` is meaningless for `email`/`tel`: ignore/clear it on those kinds.
- Anchor/external navigation props in `src/render/nodePresentation.tsx` (`getExternalNavigationProps`): `email`/`tel` get no `target`/`rel`; `download` adds the `download` attribute.
- `validateLinks()`: empty email/phone produce the same class of "missing target" warnings existing kinds produce.

**Verify (Tier 2):** unit tests in `src/model/tests/` (or the existing links test file — locate with `rg -l "getLinkHref" src/**/tests`) for href resolution of all five kinds + download attr; documentApi field-handler tests; typecheck. Spec: link kinds table updated; `docs/API.md` `LinkExtension` + `EditorTextField` blocks updated.

**Commit:** `feat(model): email, tel, and download link types`

### Task B2: link inspector + rich-text link parity

**Agent type:** worker.

**Scope:** `src/panels/inspector/contentSections/shared.tsx` (`NavigationFields`), rich-text link popover/editor (locate via `rg -n "RichTextLink" src/stage src/render`), (+ spec).

**Implementation**
- `NavigationFields`: extend the kind selector with Email / Phone options; conditional `Input` fields (email placeholder `name@example.com`, phone placeholder `+1 555 0100`); a `Download` switch visible only for `external`. Reuse `FormField`/`Input`/`Switch` primitives; keep the existing layout rhythm.
- Rich-text inline links (`RichTextLink`) share the `linkType` vocabulary: extend the inline link editing UI with the same options, and `getRichLinkHref`/equivalent resolution (locate via `rg -n "renderRichInlineContent|getLinkHref" src/render/nodePresentation.tsx`). If inline parity turns out to be large, split it into its own commit — do not silently skip it; the model must not accept kinds the inline UI corrupts.
- `validateLinks` UI surfacing needs no work (existing plumbing).

**Verify (Tier 2):** render test: block link with `email` kind exports `<a href="mailto:…">` without `target`; download link exports the attribute. Manual preview pass: create one of each kind, check exported hrefs. Spec updated.

**Commit:** `feat(inspector): email, tel, and download link authoring`

### Task B3 (Tier 3 closeout): `pnpm run build` + preview verification of all link kinds. Commit only if fixes were needed.

---

## Workstream C — Simple Slate Table Block (RI-40, simple variant only)

**Recorded design decision (do not relitigate):** the simple table and the future designable table are **separate component families**. The simple table is *text content* — a typed Slate block inside `TextDocumentContent`, exported as semantic `<table>` markup. Markdown pipe syntax is an import/export format, **not** the storage format. Cells hold inline rich content only (no document nodes). The designable table (cells hosting arbitrary nodes) is a separate future roadmap item in the container model.

**Architecture rule:** copy the standalone **list** implementation pattern throughout (Explorer C's map). Table = a new `TextSubtype: 'table'` standalone node holding exactly one `TableBlockContent`, exactly as `'list'` holds one `ListBlockContent`.

### Task C1: table content model + normalization

**Agent type:** worker.

**Scope:** `src/model/types/index.ts`, `src/model/richContent/` (factories, guards, normalization, validation), `src/model/textNodeDefaults.ts` if list has defaults there (+ tests, API docs).

**Implementation**
- Types (mirror the list family naming):
  - `RichTableCell = { type: 'table-cell'; children: RichInlineNode[] }`
  - `RichTableRow = { type: 'table-row'; header?: boolean; children: RichTableCell[] }`
  - `RichTableBlock = { type: 'table'; columnAlignments?: ('left' | 'center' | 'right' | null)[]; children: RichTableRow[] }`
  - Add to the block unions the same way `RichListBlock`/`ListBlockContent` participate (`RichBlock`, `TextDocumentBlock`, plus a `TableBlockContent` wrapper if the list has one — match whatever shape `ListBlockContent` actually has).
  - `TextSubtype` += `'table'`.
- Factories: `createRichTableBlock(rows, cols)` seeding a 2×2 table with a header row; `createRichTableRow`, `createRichTableCell` (empty text leaf child).
- Normalization guards (`src/model/richContent/normalization.ts` + `validateTextSubtypeContentStructure`): every row has the same cell count (pad short rows with empty cells), cells contain only inline nodes, a `'table'` subtype node contains exactly one table block, tables never nest. First row `header: true` by default.
- Guards/selectors: `isRichTableBlock`, `getSingleTableBlockContent` (mirror `getSingleListBlockContent`).
- `columnAlignments` length is normalized to the column count.

**Verify (Tier 2):** unit tests for factories, normalization (row padding, nested-content stripping, alignment normalization), validation acceptance/rejection. Typecheck. `docs/API.md` types section.

**Commit:** `feat(model): slate table block content model`

### Task C2: documentApi table operations

**Agent type:** worker.

**Scope:** `src/api/documentApi/` (new `table.ts` module), `src/api/documentApi.ts` barrel, `src/api/documentApi/types.ts`, insertion dispatch, `src/api/textConversion.ts` (+ tests, API docs).

**Implementation (all pure `DocumentModel → DocumentModel`)**
- `LeafInsertionRole` += `'table'`; `createLeafNode()` dispatch creates a `'table'` text node with the 2×2 default (follow the `'list'` case).
- Structure ops keyed by node id + row/col index: `insertTableRowDoc`, `insertTableColumnDoc`, `removeTableRowDoc` (keep ≥1 row), `removeTableColumnDoc` (keep ≥1 col), `setTableHeaderRowDoc(nodeId, enabled)` (first row only), `setTableColumnAlignmentDoc(nodeId, colIndex, alignment)`.
- Cell text editing goes through the existing `setTextDocumentContentDoc` path (the Slate editor commits whole content) — structure ops exist so scripts/AI/tests can manipulate tables without a DOM.
- `convertTextNodeDoc`: `table → block/rich` flattens rows to lines (tab-separated cells, matching how list flattens); converting **into** `table` from other subtypes is out of scope — reject (return the input document) and note it in the spec.
- Export every new function from `src/api/documentApi.ts` and list them in the `docs/API.md` coverage index (build fails otherwise).

**Verify (Tier 2):** documentApi tests for every op incl. boundary cases (last row/col, header toggle off, alignment out of range). Typecheck.

**Commit:** `feat(api): document-level table structure operations`

### Task C3: rendering + export

**Agent type:** worker.

**Scope:** `src/render/nodePresentation.tsx` (table branch), `src/render/leafPresentation.ts` + `src/site/siteStylePlan.ts` (base rules), `src/styles/stage.css` (+ tests, spec).

**Implementation**
- `renderLeafContent()`: new branch for `isTextNode(node) && node.subtype === 'table'` (place beside the list branch). Emit semantic markup: `<table>` → `<thead><tr><th …>` for the header row (with `scope="col"`) and `<tbody><tr><td>` for the rest. Cell children render through the existing `renderRichInlineContent`. Column alignment renders as `text-align` on the cells (inline style or per-node CSS, matching how list styling is emitted).
- Base CSS (`getSiteLeafBaseRules` + mirrored `stage.css` rules): `border-collapse: collapse`, full-width table, modest default cell padding, a subtle default border using currentColor-derived values — **no hardcoded palette colors**; follow whatever the list/text defaults do (typography inherits).
- Both the stage (read mode) and site export share `renderLeafContent`, so one branch covers both; verify the stage wrapper (`leafRenderer.tsx`) needs no table-specific handling beyond what `subtype-table` class provides.

**Verify (Tier 2):** render tests (header th/scope, alignment, inline marks inside cells render); site export test asserting semantic table markup end-to-end. Typecheck.

**Commit:** `feat(render): semantic table rendering for stage and export`

### Task C4: markdown pipe-table round-trip

**Agent type:** worker.

**Scope:** `src/api/textMarkdown.ts` (+ helpers it delegates to), tests.

**Implementation**
- `serializeTextNodeToMarkdown` for `'table'` nodes → GFM pipe table (header row, `---`/`:---:`-style alignment row from `columnAlignments`, escaped pipes in cell text).
- `parseMarkdownForTextSubtype(markdown, 'table')` → single `RichTableBlock` (parse pipes at top level, alignment row → `columnAlignments`, inline marks via the existing inline markdown parsing used by list items).
- Round-trip is canonical-form idempotent: `parse(serialize(x))` equals `x` up to normalization. Cells keep plain text + supported inline marks; unsupported markdown inside cells degrades to text.

**Verify (Tier 2):** round-trip unit tests (alignments, escaped pipes, marks, ragged input normalizing). Typecheck.

**Commit:** `feat(text): markdown pipe-table import and export`

### Task C5: editing UX

**Agent type:** worker. This is the highest-uncertainty task; if normalization guards balloon, cut keyboard navigation, never export semantics.

**Scope:** `src/stage/stageRenderers/` (edit overlay), `src/render/richTextEditor.ts` (Slate element renderers + `withTables`-style plugin), text-type picker UI, inspector config for the table subtype (+ tests where the list edit mode has them, spec).

**Implementation**
- Text-type picker (insert rail → Text flyout, locate via `onOpenTextTypes`): add a "Table" entry that inserts the `'table'` leaf role.
- On-stage editing follows the list overlay pattern: double-click enters edit mode, Slate renders `table/table-row/table-cell` elements (`renderElement` cases emitting real `<table>/<tr>/<th|td>` in the editor), commit writes back through the existing commit path (which runs normalization).
- Slate editing guards (a `withTables` plugin on the editor instance, following the official Slate tables example): prevent deleting the table structure via backspace at cell start, keep selection inside cells, Tab/Shift-Tab moves between cells (append a row when tabbing past the last cell). Nothing fancier.
- Row/column structure controls live in the **inspector**, not floating UI: a table section on the text inspector config for `'table'` nodes with Add/Remove Row, Add/Remove Column, "Header row" switch, and per-column alignment (reuse `OptionsSelector` with the existing text-align icons). These dispatch the Task C2 documentApi ops through new editor actions.
- Update `formatNodeLabel`/`getNodeIcon` for the table subtype (icon catalog test applies).

**Verify (Tier 2):** whatever component-level tests the list edit mode has (mirror them); documentApi-level tests already cover structure ops. Manual: insert table, edit cells, tab across, add/remove rows/cols, toggle header, check stage + preview + export.

**Commit:** `feat(editor): on-stage table editing and inspector controls`

### Task C6 (Tier 3 closeout): `pnpm run build`; full manual pass (insert → edit → markdown export/import via the existing markdown UI if present → site export). Update `docs/PLAYGROUND_SPEC.md` with the complete table behavior section and `docs/PLAYGROUND_ROADMAP.md` (RI-40 split: simple table Done, designable table remains a follow-up item; use the `/roadmap-entry` conventions and run `node .agents/skills/roadmap-entry/scripts/sort-summary-table.mjs --check`).

**Commit:** `docs(roadmap): mark simple slate table shipped; split designable table follow-up`

---

## Parallel Verification Wave (read-only)

- **Explorer V1:** `pnpm run build` output review; `rg` for enum sweeps missed in Task A1 (any `switch` on `ContainerSubtype` without the new members).
- **Explorer V2:** export-surface audit — every new documentApi export present in `docs/API.md`; spec sections exist for all three workstreams.
- **Explorer V3:** a11y spot-check of exported HTML: `<nav>/<aside>/<article>` tags present, table `<th scope="col">`, `mailto:`/`tel:` hrefs, no `target="_blank"` on email/tel.

## Final Acceptance

- All workstream commits exist with conventional messages; version bumps rode along via hooks.
- `pnpm test` and `pnpm run build` green at HEAD.
- `docs/PLAYGROUND_SPEC.md`, `docs/API.md`, and `docs/PLAYGROUND_ROADMAP.md` (RI-12A progress note, RI-12B done, RI-40 split) all updated; summary table sorted (`--check` passes).
- Preview-verified: semantic role switch, all five link kinds, and table authoring end-to-end.
