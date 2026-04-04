# Plan: Multiple Pages — Authoring Foundation

## Context

The playground is single-page today: `DocumentModel` has one `SiteNode` root with a flat `nodes` map. Moving to MPA requires a multi-page model, per-page rendering, multi-file export, and editor page-navigation mechanics. The NEXT_STAGE_BRIEF specifies MPA with shared header/footer, slug management, draft/published state, and view transitions. Implementation is phased: model+renderer first (fully tested), then editor mechanics, then a hard pause before UX/UI.

---

## Resolved Design Decisions

| Decision | Choice | Rationale |
| --- | --- | --- |
| Model structure | Extend `DocumentModel`, not a new `SiteModel` | Zero import cascade; TypeScript catches all missing fields |
| Shared header/footer | Stay in `nodes` map; marked by `sharedRegionIds: NodeId[]` on `DocumentModel` | `getRootWrappers`/`splitRootWrappers` logic largely unchanged |
| Page nodes store | Single flat `nodes` map, pages reference sections by ID | No change to `getNode`, `getChildren`, validators |
| `EditorState` | Add `activePageId: PageId`; `document` stays as whole-site model | One new field, minimal reducer changes |
| Storage migration | New `editor-state.v2` key; auto-migrate v1 on load | Backward compatible, no silent data loss |
| Nested page slugs | Relative segment per page; full URL composed via `resolvePageUrl` | Keeps slug field simple; aliases handle any absolute path override |
| Page type discriminator | `type: 'page'` on `DocumentPage` | Future-proofs for popup pages, template pages, etc. |

---

## New Model Types (src/model/types/)

```typescript
// src/model/types/site.ts (new file)
type PageId = string;

// type discriminator future-proofs for popup pages, template pages, etc.
type DocumentPage = {
  type: 'page';
  id: PageId;
  slug: string;               // relative URL segment, e.g. "team"
                              // full URL composed from parent chain: /about/team/
  displayName: string;
  sectionIds: NodeId[];       // ordered sections for this page
  parentPageId?: PageId;      // for nested page navigation hierarchy
  slugAliases?: string[];     // absolute path overrides / redirect aliases
  lang?: string;              // overrides site-level lang
  visible: boolean;
  viewTransition?: 'none' | 'crossfade' | 'slide'; // overrides site-level setting
};

type SiteSettings = {
  lang: string;               // default "en"; emitted as <html lang="...">
  status: 'draft' | 'published';
  viewTransition: 'none' | 'crossfade' | 'slide';
  title?: string;
};

// Additions to DocumentModel (src/model/types/index.ts):
//   pages: DocumentPage[]
//   siteSettings: SiteSettings
//   sharedRegionIds: NodeId[]   ← header + footer IDs
```

---

## Phase 1: Model + Pure API + Tests

**Goal:** New types exist; `pageApi` is complete and tested; nothing else changes.

### Files to create

- `src/model/types/site.ts` — `DocumentPage`, `SiteSettings`, `PageId`
- `src/model/pageDefaults.ts` — `createPage()`, `createInitialSiteSettings()`, `generateSlug(displayName)`
- `src/api/pageApi.ts` — pure `DocumentModel → DocumentModel` functions
- `src/api/tests/pageApi.test.ts`
- `src/model/tests/pageDefaults.test.ts`

### Files to modify

- `src/model/types/index.ts` — re-export site types; add `pages`, `siteSettings`, `sharedRegionIds` to `DocumentModel`
- `src/model/initialDocument.ts` — `createInitialDocument()` returns model with single home page; header/footer go in `sharedRegionIds`
- `src/model/validation.ts` — validate: slug uniqueness, each sectionId is a `section`-role wrapper in `nodes`, no section in two pages, `sharedRegionIds` valid

### Key function signatures (src/api/pageApi.ts)

```typescript
addPage(document, options?: Partial<DocumentPage>): DocumentModel
deletePage(document, pageId): DocumentModel         // removes page + its owned section nodes
reorderPage(document, pageId, direction: 'back'|'forward'): DocumentModel
setPageDisplayName(document, pageId, name): DocumentModel
setPageSlug(document, pageId, slug): DocumentModel
addPageSlugAlias(document, pageId, alias): DocumentModel
removePageSlugAlias(document, pageId, alias): DocumentModel
setPageVisibility(document, pageId, visible): DocumentModel
// Reparent a page in the hierarchy (like reparentNode for components)
// null = make top-level; does not change slug, just parentPageId
setPageParent(document, pageId, newParentId: PageId | null): DocumentModel
setSiteSettings(document, patch: Partial<SiteSettings>): DocumentModel
// Move a section wrapper from one page's sectionIds to another's
// (e.g. split a section off to its own page, or consolidate pages)
moveSectionToPage(document, sectionId, fromPageId, toPageId): DocumentModel
getPageForSection(document, sectionId): DocumentPage | null
getActiveSections(document, pageId): WrapperNode[]
// Compose full URL from parent chain: {slug:"team", parent:{slug:"about"}} → "/about/team/"
resolvePageUrl(document, pageId): string
validatePageSlug(slug): string[]    // returns error messages
normalizeSlug(raw): string
```

### Test coverage

- `addPage`: unique ID, auto-slug from displayName
- `deletePage`: removes page entry AND its section nodes from `nodes`; shared regions untouched
- Slug validation: empty, duplicate, invalid chars, alias conflicts
- `moveSectionToPage`: removes from source, appends to target
- `validateDocument` catches: duplicate slug, section in two pages, wrong role, missing node

### Risk: `pages` is required but existing test fixtures lack it

Mitigation: Make `pages?: DocumentPage[]` optional in Phase 1 type; `loadPersistedState` backfills from `SiteNode.children` on load. Promote to required in Phase 3.

---

## Phase 2: Renderer

**Goal:** `buildRenderRootPlan` and export pipeline work per-page. MPA HTML/CSS generation produces correct per-page output. Stage is unchanged.

### Files to modify

- `src/site/siteShared.ts` — add `getRootWrappersForPage(document, pageId)`:
  - sections from `document.pages.find(p => p.id === pageId).sectionIds`
  - header/footer from `document.sharedRegionIds`
  - existing `getRootWrappers` delegates to this for backward compat
- `src/render/renderPlan.ts` — `buildRenderRootPlan` gains optional 5th param `pageId?: PageId`; when provided, uses `getRootWrappersForPage` instead of `getRootWrappers`
- `src/site/SiteRenderer.tsx` — add optional `pageId?: PageId` prop; passes to `buildRenderRootPlan`
- `src/site/types/index.ts` — add `pageId?`, `outputStructure?: 'directory' | 'flat'` to `SiteExportOptions`
- `src/site/siteExport.tsx` — add:
  - `renderPageHtmlDocument(document, pageId, options?)` — one page
  - `renderSiteExportBundles(document, options?)` — array of `{path, html, css}` per page
  - `buildRouteManifest(document)` — maps slugs to output paths
  - Keep existing functions unchanged
- `src/api/siteApi.ts` — re-export new functions
- `src/site/siteStylePlan.ts` — add `@view-transition { navigation: auto }` CSS gated on `siteSettings.viewTransition !== 'none'` + `prefers-reduced-motion: no-preference`; per-page `page.viewTransition` override injected as inline `<style>` in `renderPageHtmlDocument` when it differs from site-level

### Active link state (render-time, no model change)

Export emits small inline script: sets `--sp-active-route` CSS variable on `DOMContentLoaded`. Nav links get `aria-current` via CSS style query.

### Lang attribute

`renderPageHtmlDocument` reads `page.lang ?? siteSettings.lang` → `<html lang="...">`.

### Tests

- `buildRenderRootPlan(..., pageId)` returns only that page's sections + shared header/footer
- `renderSiteExportBundles` produces `[{path:'index.html',...}, {path:'about/index.html',...}]` for directory mode
- `buildRouteManifest` maps slugs correctly; home page → `index.html`
- `resolvePageUrl` composes full path from parent chain: `about → /about/`, `team (parent: about) → /about/team/`
- Per-page `viewTransition` override emits inline `<style>` in that page's HTML only

---

## Phase 3: Editor Mechanics

**Goal:** `EditorState` gains `activePageId`; reducer handles page actions; persistence migrates v1→v2; history covers page-level changes. Start only after Phase 1+2 tests are green.

### Files to modify

- `src/editor/types/index.ts` — add `activePageId: PageId` to `EditorState`
- `src/editor/editorPersistence.ts`
  - New key: `'sticky-playground.editor-state.v2'`
  - `loadPersistedState()` tries v2 first; falls back to v1 + `migrateV1ToV2()`
  - `migrateV1ToV2`: derives `pages` from `SiteNode.children` sections, `sharedRegionIds` from header/footer, sets default `siteSettings`, assigns `activePageId`
  - `createInitialState()` / `createFactoryResetState()` supply `activePageId`
- `src/editor/editorStore.ts` — add `setActivePage(state, pageId)` (clears selection)
- `src/app/types/index.ts` — new `EditorAction` variants: `setActivePage`, `addPage`, `deletePage`, `reorderPage`, `setPageDisplayName`, `setPageSlug`, `setPageParent`, `setSiteSettings`
- `src/app/editorState.ts` — `editorReducer` handles new actions via `pageApi` functions
- `src/app/history.ts` — `HistoryEntry` gains `pagesBefore`/`pagesAfter` and `siteSettingsBefore`/`siteSettingsAfter`; `buildHistoryEntry` diffs pages; `applyHistoryEntry` restores `activePageId`
- `src/api/documentApi.ts` — `insertWrapperDoc`/`insertSectionTemplateBeforeFooter` gain optional `pageId` param; append new section to `document.pages[pageId].sectionIds`
- `src/api/editorApi.ts` — re-export new page-level editor actions

### Selection on page switch

`setActivePage` calls `clearSelection` internally — selected IDs may not exist on new page.

### Section reorder

`reorderNodeDoc` for `section`-role nodes reorders within `DocumentPage.sectionIds`, not `SiteNode.children`.

### Tests

- `migrateV1ToV2` produces valid v2 state from a real v1 fixture
- `editorReducer/setActivePage` clears selection and updates `activePageId`
- `editorReducer/addPage` sets `activePageId` to new page ID
- `editorReducer/deletePage` falls back `activePageId` to first remaining page
- History undo/redo restores `activePageId` alongside node state
- `insertWrapper(section)` appends to active page's `sectionIds`

---

## Phase 4: UX/UI — Deferred (Design First)

Do not implement until designs are ready. Items needing design decisions:

- **Pages panel** — location, interaction model, reordering, hidden pages
- **"No selection" = page inspector** — slug editing UX, error states, coexistence with settings panel
- **In-stage link navigation** — tooltip component, "Navigate" button, deleted-page warning
- **Preview mode** — `?mode=preview`, in-preview routing behavior
- **Link validation UX** — warning icon on broken links, export dialog step
- **Export dialog** — directory vs flat, server config download option

---

## Execution Strategy (Subagents + Cost)

### Model selection rules

- **haiku**: mechanical tasks — new files written entirely from spec, boilerplate type additions, test fixtures, import updates, field additions with no logic
- **sonnet**: logic-bearing tasks — complex function implementations, migration code, history patching, render pipeline changes, anything that must reason about existing code

### Phase 1 execution — 3 parallel haiku agents + 1 sonnet agent

**Parallel batch (haiku × 3):**

| Agent | Task | Files |
| --- | --- | --- |
| A | Create `site.ts` types + `pageDefaults.ts` factories from spec | `src/model/types/site.ts`, `src/model/pageDefaults.ts` |
| B | Add 3 fields to `DocumentModel`; re-export site types from `types/index.ts` | `src/model/types/index.ts` |
| C | Write `pageDefaults.test.ts` from spec | `src/model/tests/pageDefaults.test.ts` |

**After batch completes — sonnet × 1 (reads A+B output, writes logic):**

| Agent | Task | Files |
| --- | --- | --- |
| D | Implement `pageApi.ts` + `pageApi.test.ts` + update `initialDocument.ts` + extend `validation.ts` | 4 files |

Agent D gets the output of A+B as context. Runs `npm run test:run` at end.

### Phase 2 execution — 2 parallel agents

**Parallel (haiku + sonnet):**

| Agent | Model | Task | Files |
| --- | --- | --- | --- |
| E | haiku | Add `pageId?` param to `buildRenderRootPlan`; add `getRootWrappersForPage` to `siteShared.ts`; add optional `pageId` to `SiteRenderer` props and `SiteExportOptions` | `renderPlan.ts`, `siteShared.ts`, `SiteRenderer.tsx`, `src/site/types/index.ts` |
| F | sonnet | Implement `renderPageHtmlDocument`, `renderSiteExportBundles`, `buildRouteManifest`; view-transition CSS; active link script; lang attribute; write tests | `siteExport.tsx`, `siteStylePlan.ts`, `siteApi.ts`, test file |

Agents E and F have no code dependency (F needs the type additions from Phase 1, not from E). Can be launched in parallel. Runs `npm run test:run` at end.

### Phase 3 execution — sequential (blast-radius is high)

Run as a **single sonnet agent** — too many interdependencies to split safely. Provide it the full plan for Phase 3 and the list of files modified in Phases 1+2. It must run `npm run test:run` before finishing.

Files in order of dependency:

1. `src/editor/types/index.ts` — add `activePageId`
2. `src/app/types/index.ts` — new action types + HistoryEntry fields
3. `src/app/history.ts` — diffs for pages/siteSettings
4. `src/editor/editorStore.ts` — `setActivePage`
5. `src/editor/editorPersistence.ts` — v2 key + migration
6. `src/app/editorState.ts` — new reducer cases
7. `src/api/documentApi.ts` / `src/api/editorApi.ts` — re-exports
8. `src/stage/StageScene.tsx` — filter to active page sections
9. Tests

### Context discipline (cost control)

- Give each agent only the files it will edit + the type definitions it depends on — not the full exploration dump
- Never pass raw file contents that aren't needed; summarize what the agent needs to know about unchanged files
- Each phase agent gets: (1) the relevant section of this plan, (2) exact file contents of files to modify, (3) type signatures of files it depends on but won't edit
- After each phase, run `tsc --noEmit` before launching the next phase's agents — catches type errors early, before a sonnet agent wastes tokens on a broken foundation

---

## Critical Files

| File | Change |
| --- | --- |
| `src/model/types/index.ts` | Add `pages`, `siteSettings`, `sharedRegionIds` to `DocumentModel` |
| `src/model/types/site.ts` | New: `DocumentPage`, `SiteSettings`, `PageId` |
| `src/model/initialDocument.ts` | Produce single-page model with sharedRegionIds |
| `src/model/validation.ts` | Slug uniqueness, section ownership, sharedRegionIds checks |
| `src/api/pageApi.ts` | New: all pure page-level mutations |
| `src/site/siteShared.ts` | `getRootWrappersForPage` |
| `src/render/renderPlan.ts` | Optional `pageId` param on `buildRenderRootPlan` |
| `src/site/siteExport.tsx` | `renderPageHtmlDocument`, `renderSiteExportBundles`, `buildRouteManifest` |
| `src/editor/types/index.ts` | `activePageId: PageId` in `EditorState` |
| `src/editor/editorPersistence.ts` | v2 key, `migrateV1ToV2` |
| `src/app/editorState.ts` | New page action handlers |
| `src/app/history.ts` | Page diffs in `HistoryEntry` |

## Verification

- `npm run test:run` green after each phase before proceeding
- After Phase 1: `validateDocument(createInitialDocument())` passes; all `pageApi` functions have test coverage
- After Phase 2: `renderSiteExportBundles` produces correct file tree for a 2-page fixture; `buildRenderRootPlan` with `pageId` returns only that page's sections
- After Phase 3: v1 fixture migrates cleanly; undo/redo round-trip with page switches works; all existing tests pass
