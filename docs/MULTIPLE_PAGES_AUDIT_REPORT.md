# Multiple Pages Audit Report

Date: 2026-04-05

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

The multiple-pages foundation is materially better than in the initial audit. Several core correctness blockers and most of the page-entry chrome issues have now been fixed:

- the stage now receives `activePageId`
- preview now renders with `pageId`
- page-link fields are wired into editor mutation plumbing
- page transition actions are wired through the reducer and UI
- export now passes `outputStructure`
- ZIP assembly no longer relies on nonexistent bundle fields
- `SiteRenderer` now resolves page links with document context
- route manifest now respects `outputStructure` (directory vs flat mode)
- export ZIP now includes Netlify, Vercel, and Nginx hosting configs under `hosting/`
- the left rail now exposes Pages beside Components with the intended iconography
- sticky preview now uses the corrected `ScanEye` icon
- the top bar now uses a traditional menubar with a centered in-row page switcher
- the no-selection inspector state now behaves like a stronger current-page editor
- page transition controls in the inspector now support `Inherit from site`
- Help is now split into detached `Shortcuts`, documentation browsing, and detached `About`
- new page creation now auto-increments duplicate page names and slugs, including alias-aware slug collisions

The feature is still not fully complete, but the remaining issues are now mostly about follow-up polish and documentation accuracy rather than missing core page-authoring behavior.

The main open gaps are:

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

### Page UI chrome alignment

- the left rail now exposes Pages immediately after Components using the same rail-entry pattern
- the Pages rail entry uses `BookOpenText`
- sticky preview uses `ScanEye`
- the no-selection inspector page editor now has dedicated `Page settings…` and `All pages…` actions, stronger spacing/grouping, and an inherited page-transition state
- the redundant page-settings icon in the inspector was removed

Relevant subsystems:

- `src/panels/InsertPanel.tsx`
- `src/panels/inspector/contentSections/PageInspectorSection.tsx`
- `src/panels/EditorSidebar.tsx`
- `src/app/AppShell.tsx`

### Menubar top bar and help split

- the old icon-heavy top bar has been replaced with a traditional menubar: `Settings`, `Edit`, `View`, and `Help`
- `Undo`, `Redo`, and `Preview` remain as standalone right-side actions
- the pages switcher now lives centered in the same top bar row and uses the shared page-switcher select component
- `Help` now routes to detached `Shortcuts`, documentation browsing, and detached `About`
- the menu system is implemented as reusable primitives and surfaced in the design-system showcase

Relevant subsystems:

- `src/components/ui/menubar.tsx`
- `src/components/ui/page-switcher-select.tsx`
- `src/app/EditorTopbar.tsx`
- `src/panels/ShortcutsDialog.tsx`
- `src/panels/AboutDialog.tsx`

### New page uniqueness checks

- `addPage()` now resolves a unique page display name before creation by appending ` 2`, ` 3`, and so on when needed
- new-page slug creation now resolves against both existing page slugs and `slugAliases`, appending `-2`, `-3`, and so on for collisions
- this closes a real authoring bug where `New page` could create a duplicate slug and defer the problem to later validation instead of preventing it at creation time

Relevant subsystems:

- `src/api/pageApi.ts`
- `src/api/tests/pageApi.test.ts`

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
- unique new-page name/slug generation tested in `src/api/tests/pageApi.test.ts`

## Remaining Findings

### P1

### ~~1. Pages tree interactions are still much simpler than planned~~ Fixed

- `PageTreeContent` now uses shared pure helpers for depth, descendants, visible rows, and drop-target resolution
- the tree now has real expand/collapse state, row-surface dragging, pointer-drag drop intent, and same-surface reorder/reparent behavior
- both the Components-panel Pages tab and the dedicated Pages panel now use the same upgraded tree surface

Relevant subsystems:

- `src/panels/pageTree.ts`
- `src/panels/PageTreeContent.tsx`
- `src/panels/tests/PageTreeContent.test.tsx`

### ~~2. Dedicated Pages panel UX is still below the planned quality bar~~ Fixed

- the Pages panel now uses the same draggable floating-panel pattern as the Components panel instead of a centered static modal
- page settings popup now uses `EditorPanelHeader`, grouped sections, and inspector-style inline rows
- the no-selection inspector page editor now has inline slug editing and direct parent-page selection, bringing it much closer to popup parity

Relevant subsystems:

- `src/panels/PagesPanel.tsx`
- `src/panels/PageSettingsPopup.tsx`
- `src/panels/inspector/contentSections/PageInspectorSection.tsx`

### ~~3. Follow-link popup is still partial~~ Fixed

- anchor scrolling: `onScrollToAnchor` now scrolls the target node's DOM element into view using `data-node-id` lookup; popup is dismissed after scrolling
- toggle-on-repeat-click: `handleStageSelect` in `AppShell` detects re-click of an already-selected link node and toggles `linkPopupVisible`
- drag suppression: `onMove` handler now calls `setLinkPopupVisible(false)` before dispatching the move
- page navigation now also dismisses the popup after navigating
- removed stale forward-compat casts and local `PageId` re-declaration in `FollowLinkPopup.tsx`

Relevant subsystems:

- `src/panels/FollowLinkPopup.tsx`
- `src/app/AppShell.tsx`

### ~~4. Validation is still missing important page constraints~~ Fixed

- alias conflict validation added: `slugAliases` entries are checked against all page slugs and all other aliases; alias-equals-own-slug is also caught
- page-parent cycle validation added: `validatePageParentCycles` walks the `parentPageId` chain for every page and reports cycles, deduplicating reports per cycle entry point
- all new checks covered by tests in `src/model/tests/validation.test.ts`

Relevant subsystems:

- `src/model/validation.ts`
- `src/model/tests/validation.test.ts`

### ~~5. Slug-sync workflow is still partial~~ Fixed

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

### ~~3. Link validation workflow is still missing~~ Fixed

- `validateLinks(document)` added to `src/model/validation.ts`: checks all link/button nodes for broken page references (no `targetPageId`, nonexistent page), broken `pageAnchorId`, and broken `anchorTargetId`; external links and unconfigured anchors are not flagged
- `PagesPanel` now exposes a live "Validate links" button with a copyable per-error results list (node name, role, description)
- `AppShell` wires `onValidateLinks` as a read-only callback calling `validateLinks(state.document)` directly (no reducer action needed)
- 11 tests added in `src/model/tests/validation.test.ts` covering all error and non-error cases

Relevant subsystems:

- `src/model/validation.ts`
- `src/model/tests/validation.test.ts`
- `src/panels/PagesPanel.tsx`
- `src/app/AppShell.tsx`

### 4. Documentation still overstates completion

Current state:

- roadmap/spec text still describe parts of the feature set as more complete than the repo currently demonstrates, especially around export/routing and preview/navigation quality

Evidence:

- `docs/PLAYGROUND_ROADMAP.md`
- `docs/PLAYGROUND_SPEC.md`

Impact:

- product and implementation status are not communicated accurately

### P2

### 5. General visual polish of the dedicated Pages surface is still below the rest of the editor

Current state:

- the top bar, left rail, and inspector current-page surface now feel materially more integrated
- the dedicated Pages panel and page tree still look simpler and less considered than adjacent editor UI

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
| Components Pages tab | Implemented |
| Dedicated Pages panel | Implemented |
| Inspector no-selection page editor | Implemented |
| Top-bar page switcher | Implemented |
| Menubar top bar | Implemented |
| Left-rail Pages entry placement | Implemented |
| Page settings popup | Implemented |
| Slug sync flow | Implemented |
| Follow-link popup | Implemented |
| Link validation workflow | Implemented |
| Server-side routing export support | Implemented |

## Recommended Fix Plan

### Phase 1: Keep documentation aligned with shipped behavior

1. Continue correcting spec/roadmap language when implementation status changes
2. Keep the audit report, spec, style guide, and showcase aligned in the same change set when page chrome changes land

### Recommended test additions

- end-to-end stage page switching
- preview page rendering and navigation behavior
- export manifest behavior for output structure
- page hierarchy validation including cycles
- slug alias conflict behavior
- follow-link popup behavior

## Conclusion

The current state is meaningfully better than the initial audit suggested. The core stage/render/page-link correctness blockers are addressed, and the top-level page chrome now matches the intended product direction much more closely.

The remaining work is now concentrated in two areas:

- page-management UX depth (page tree interactions, dedicated panel visual polish)
- documentation accuracy

This should now be treated as a partially completed product feature with solid core plumbing and much stronger editor integration, rather than a fundamentally broken implementation.
