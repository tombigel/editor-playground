# Multiple Pages Audit Report

Date: 2026-04-04

## Scope

This audit compares the current multiple-pages implementation against:

- `archive/MULTIPLE_PAGES_AUTHORING_PLAN.md`
- `archive/MULTIPLE_PAGES_UX_PLAN.md`

It focuses on:

- page model and editor state
- page authoring UI surfaces
- stage and preview behavior
- page links and follow-link UX
- export and routing support

## Summary

The multiple-pages foundation is materially better than in the initial audit. Several core correctness blockers have been fixed:

- the stage now receives `activePageId`
- preview now renders with `pageId`
- page-link fields are wired into editor mutation plumbing
- page transition actions are wired through the reducer and UI
- export now passes `outputStructure`
- ZIP assembly no longer relies on nonexistent bundle fields
- `SiteRenderer` now resolves page links with document context
- route manifest now respects `outputStructure` (directory vs flat mode)
- export ZIP now includes Netlify, Vercel, and Nginx hosting configs under `hosting/`

The feature is still only partially complete. The remaining issues are now mostly in product completeness, UX quality, and routing/export scope rather than basic stage/render correctness.

The main open gaps are:

- pages panel and pages tree UX are still simpler than the plan
- top-bar and left-rail pages entry points are still not aligned with the intended design system and layout
- link validation workflow is still missing
- server-side routing support from the brief is still missing
- follow-link behavior is still partial
- validation and slug-sync behavior are still not as complete as planned
- roadmap/spec language still overstates current completion in some areas

## Addressed Since Initial Audit

The following blockers from the initial audit are now resolved in the current repo state.

### Stage and preview page wiring

- `activePageId` now flows from `AppShell` into `Stage`, and from `Stage` into `StageScene`
- preview mode now renders `SiteRenderer` with the active page context via `pageId`

Relevant subsystems:

- `src/app/AppShell.tsx`
- `src/stage/Stage.tsx`
- `src/stage/types/index.ts`

### Page-link mutation plumbing

- `NodeTextField` now includes `targetPageId` and `pageAnchorId`
- editor mutation handling now persists `targetPageId` and `pageAnchorId`
- switching `linkType` away from `page` clears page-specific fields
- page-link controls no longer need `as EditorTextField` casts

Relevant subsystems:

- `src/model/types/index.ts`
- `src/editor/editorMutations.ts`
- `src/panels/inspector/contentSections/shared.tsx`

### Page transition action plumbing

- `setPageViewTransition` now exists in `pageApi`
- `EditorAction` now includes `setPageViewTransition`
- reducer handling is in place
- inspector and pages panel now dispatch a real page-transition action instead of a no-op

Relevant subsystems:

- `src/api/pageApi.ts`
- `src/app/types/index.ts`
- `src/app/editorState.ts`
- `src/panels/PagesPanel.tsx`
- `src/app/AppShell.tsx`

### Export wiring and ZIP assembly

- export now passes `siteSettings.outputStructure`
- ZIP file assembly now uses the current export-bundle shape instead of nonexistent `htmlFileName` / `cssFileName` fields

Relevant subsystems:

- `src/app/AppShell.tsx`

### Renderer page-link resolution

- `SiteRenderer` now passes document context into `getLinkHref()`, so page links can resolve correctly during rendering

Relevant subsystems:

- `src/site/SiteRenderer.tsx`

### Hosting config generation

- `buildHostingConfigs()` generates Netlify `_redirects`, Vercel `vercel.json`, Nginx `nginx.conf`, and a README bundled under `hosting/` in the export ZIP
- configs adapt to `outputStructure`: flat mode includes per-page rewrite rules; directory mode produces minimal configs with comments
- `AppShell` merges hosting configs into the ZIP files map alongside page bundles and the route manifest

Relevant subsystems:

- `src/site/siteExport.tsx`
- `src/api/siteApi.ts`
- `src/app/AppShell.tsx`
- `src/site/tests/siteExport.mpa.test.ts`

### Route manifest output-structure consistency

- `buildRouteManifest()` now accepts `SiteExportOptions` and uses `outputStructure` to produce correct file paths in both directory and flat modes
- `AppShell` passes `outputStructure` from `siteSettings` when calling `buildRouteManifest`, so the manifest and the ZIP file layout are always consistent

Relevant subsystems:

- `src/site/siteExport.tsx`
- `src/app/AppShell.tsx`
- `src/site/tests/siteExport.mpa.test.ts`

### Direct test coverage added

- `setPageViewTransition` now has direct tests in `src/api/tests/pageApi.test.ts`
- `buildRouteManifest` flat-mode behavior is now directly tested
- `buildHostingConfigs` directory and flat mode behavior tested for all three hosting targets
- alias conflict and page-parent cycle validation tested in `src/model/tests/validation.test.ts`
- `syncPageHrefLinks` tested in `src/api/tests/pageApi.test.ts`

## Remaining Findings

### P0

### ~~1. Server-side routing support from the brief is still missing~~ Fixed

- `buildHostingConfigs()` now generates Netlify `_redirects`, Vercel `vercel.json`, and Nginx `nginx.conf` bundled under `hosting/` in the export ZIP
- config content adapts to `outputStructure`: flat mode produces per-page rewrite rules; directory mode produces minimal/no-op configs with explanatory comments
- a `hosting/README.txt` explains what to do with each file
- GitHub Pages needs no config — directory structure (`about/index.html`) is served natively
- `AppShell` wires `buildHostingConfigs` into the ZIP assembly alongside bundles and the route manifest

Relevant subsystems:

- `src/site/siteExport.tsx`
- `src/api/siteApi.ts`
- `src/app/AppShell.tsx`
- `src/site/tests/siteExport.mpa.test.ts`

### ~~2. Route-manifest behavior is still incomplete relative to configurable output structure~~ Fixed

- `buildRouteManifest()` now accepts `SiteExportOptions` and respects `outputStructure` ('directory' or 'flat')
- `AppShell` now passes `outputStructure` from `siteSettings` when building the manifest
- flat-mode and directory-mode manifest tests both pass

Relevant subsystems:

- `src/site/siteExport.tsx`
- `src/app/AppShell.tsx`
- `src/site/tests/siteExport.mpa.test.ts`

### P1

### 3. Pages tree interactions are still much simpler than planned

Planned:

- hierarchy-aware tree
- expand/collapse
- drag reorder
- drag-to-indent / reparent
- drag handle

Current state:

- rows use shared row primitives
- hierarchy is represented by indentation only
- no expand/collapse state
- no drag handle
- no page reorder interaction
- no page reparent interaction
- related props exist but are still unused in `PageTreeContent`

Evidence:

- `src/panels/PageTreeContent.tsx`

Impact:

- page hierarchy authoring remains below the intended UX baseline

### 4. Dedicated Pages panel UX is still below the planned quality bar

Planned:

- a strong page-management surface using shared design-system primitives and layers-like page management behavior

Current state:

- panel exists and is functional for basic settings
- visual treatment and interaction depth are still simpler than the rest of the editor
- `Validate links` remains explicitly disabled

Evidence:

- `src/panels/PagesPanel.tsx`

Impact:

- the main pages-management surface still feels unfinished

### 5. Layers-panel Pages tab is still incomplete

Planned:

- quick switch plus basic page management from the layers panel

Current state:

- Pages tab exists
- basic switching is wired
- page-settings affordance from the layers entry point still does not appear to be completed end-to-end

Evidence:

- `src/panels/LayersPanel.tsx`
- `src/app/AppShell.tsx`

Impact:

- one of the four planned entry points still appears incomplete

### ~~6. Follow-link popup is still partial~~ Fixed

- anchor scrolling: `onScrollToAnchor` now scrolls the target node's DOM element into view using `data-node-id` lookup; popup is dismissed after scrolling
- toggle-on-repeat-click: `handleStageSelect` in `AppShell` detects re-click of an already-selected link node and toggles `linkPopupVisible`
- drag suppression: `onMove` handler now calls `setLinkPopupVisible(false)` before dispatching the move
- page navigation now also dismisses the popup after navigating
- removed stale forward-compat casts and local `PageId` re-declaration in `FollowLinkPopup.tsx`

Relevant subsystems:

- `src/panels/FollowLinkPopup.tsx`
- `src/app/AppShell.tsx`

### ~~7. Validation is still missing important page constraints~~ Fixed

- alias conflict validation added: `slugAliases` entries are checked against all page slugs and all other aliases; alias-equals-own-slug is also caught
- page-parent cycle validation added: `validatePageParentCycles` walks the `parentPageId` chain for every page and reports cycles, deduplicating reports per cycle entry point
- all new checks covered by tests in `src/model/tests/validation.test.ts`

Relevant subsystems:

- `src/model/validation.ts`
- `src/model/tests/validation.test.ts`

### ~~8. Slug-sync workflow is still partial~~ Fixed

- `syncPageHrefLinks(document, oldUrl, newUrl)` added to `pageApi.ts`: walks all link/button nodes and updates `href` fields matching the old page URL
- wired as `syncPageLinks` reducer action through `EditorAction`, `editorState.ts`, `PagesPanel`, and `AppShell`
- `handlePendingSlugYes` in `PageSettingsPopup` now computes old and new URLs and calls `onSyncPageLinks`; published alias behavior retained
- `handlePendingSlugNo` correctly skips link sync (just changes slug)
- 5 tests for `syncPageHrefLinks` in `src/api/tests/pageApi.test.ts`

Remaining: conflict handling on direct slug edits is not stricter than before; that is a UX improvement beyond the planned decision path.

Relevant subsystems:

- `src/api/pageApi.ts`
- `src/app/types/index.ts`
- `src/app/editorState.ts`
- `src/panels/PageSettingsPopup.tsx`
- `src/panels/PagesPanel.tsx`
- `src/app/AppShell.tsx`
- `src/api/tests/pageApi.test.ts`

### 9. Link validation workflow is still missing

Planned:

- validate-on-export option
- manual validate-links workflow
- copyable results and inline correction path

Current state:

- `Validate links` is still disabled in the pages panel
- no broader validation workflow was found

Evidence:

- `src/panels/PagesPanel.tsx`
- `docs/NEXT_STAGE_BRIEF.md`

Impact:

- authors do not yet have the planned safety net for internal routing and link integrity

### 10. Documentation still overstates completion

Current state:

- roadmap/spec text still describe parts of the feature set as more complete than the repo currently demonstrates, especially around export/routing and preview/navigation quality

Evidence:

- `docs/PLAYGROUND_ROADMAP.md`
- `docs/PLAYGROUND_SPEC.md`

Impact:

- product and implementation status are not communicated accurately

### P2

### 11. Top-bar page switcher is still custom and not design-system aligned

Planned:

- compact switcher using shared design-system primitives

Current state:

- switcher exists in the intended area
- implementation is still custom rather than built from shared dropdown/select/popover patterns
- visual language still feels less integrated than the rest of the chrome

Evidence:

- `src/app/AppShell.tsx`

Impact:

- consistency and reuse are weaker than planned

### 12. Left-rail Pages trigger is still in the wrong place

Planned:

- pages trigger should sit next to the layers entry in the left rail

Current state:

- layers trigger lives in `InsertPanel`
- pages trigger remains grouped with the lower utility toggles instead of next to layers

Evidence:

- `src/panels/InsertPanel.tsx`
- `src/app/AppShell.tsx`

Impact:

- rail structure does not match the intended information architecture

### 13. General visual polish of pages surfaces is still below the rest of the editor

Current state:

- pages surfaces are functional in parts, but still look simpler and less considered than adjacent editor UI

Impact:

- this directly affects perceived completeness and trust in the feature

## Implemented Vs Remaining Matrix

| Area | Status |
| --- | --- |
| Page model | Implemented |
| Persistence migration | Implemented |
| Page history in undo/redo | Implemented |
| Stage active-page wiring | Implemented |
| Preview active-page wiring | Implemented |
| Page-link field plumbing | Implemented |
| Page transition action plumbing | Implemented |
| Export outputStructure wiring | Implemented |
| ZIP assembly fix | Implemented |
| Site renderer page-link resolution | Implemented |
| Route manifest | Implemented |
| Layers Pages tab | Partial |
| Dedicated Pages panel | Partial |
| Inspector no-selection page editor | Partial |
| Top-bar page switcher | Partial |
| Page settings popup | Partial |
| Slug sync flow | Implemented |
| Follow-link popup | Implemented |
| Link validation workflow | Missing |
| Server-side routing export support | Implemented |

## Recommended Fix Plan

### Phase 1: Close routing/export scope gaps

1. Make route-manifest output consistent with `outputStructure`
2. Add the missing server-side routing artifact:
   - generated config files, or
   - generated host-specific setup docs bundled in export
3. Document supported export/routing environments explicitly

### Phase 2: Finish page authoring behavior

1. Implement real page-tree interactions:
   - reorder
   - reparent
   - drag handle
   - expand/collapse if hierarchy visualization depends on it
2. Complete any remaining incomplete layers-panel page-management behavior
3. Add a real link-validation workflow instead of the disabled placeholder

### Phase 3: Harden validation and slug flows

1. Add alias conflict validation
2. Add page-parent cycle validation
3. Implement the planned internal-link sync behavior after slug changes
4. Reconcile rename flow behavior with the UX plan

### Phase 4: Finish navigation UX

1. Implement anchor scrolling from follow-link popup
2. Add repeated-click toggle behavior
3. Add drag suppression behavior
4. Recheck preview navigation behavior against the UX plan

### Phase 5: Bring pages UI to product quality

1. Rebuild the top-bar switcher with shared design-system primitives
2. Move the Pages trigger next to Layers in the left rail
3. Raise the visual quality of pages surfaces to match the rest of the editor chrome

### Recommended test additions

- end-to-end stage page switching
- preview page rendering and navigation behavior
- export manifest behavior for output structure
- page hierarchy validation including cycles
- slug alias conflict behavior
- follow-link popup behavior

## Conclusion

The current state is meaningfully better than the initial audit suggested. The most important stage/render/page-link correctness blockers have been addressed.

The remaining work is now concentrated in four areas:

- export/routing scope
- page-management UX depth
- validation and slug workflow hardening
- final product polish and documentation accuracy

This should now be treated as a partially completed product feature with solid core plumbing, rather than a fundamentally broken implementation.
