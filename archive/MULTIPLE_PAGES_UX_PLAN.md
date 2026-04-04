# Plan: Multiple Pages Editor UX

## Context

The data model, API, and export infrastructure for multi-page sites is already implemented (`src/model/types/site.ts`, `src/api/pageApi.ts`, `src/site/siteExport.tsx`). This plan adds all editor-facing UX: navigation between pages, page management, per-page settings, link enhancements to support page-type links, and a preview mode. No new model primitives are needed — the work is entirely in editor chrome and panels.

---

## Architecture: Four Entry Points for Pages

The user resolved the panel question as a compound answer — four complementary surfaces:

1. **Layers panel "Pages" tab** — lightweight page list inside the existing floating layers panel. Quick switch + basic add/delete.
2. **Dedicated pages management panel** — full management modal opened from a new left-rail "pages" icon. Site settings, full hierarchy, per-page popups, routing options.
3. **Inspector "no selection" state** — when nothing is selected, the inspector shows the current page's key fields (name, slug, visibility, transition override). Clicking "Manage…" opens the dedicated panel.
4. **Top-bar page switcher dropdown** — a compact dropdown left of the existing topbar right-side buttons. Shows current page name. Opens a list for instant switching. No management.

### UI primitives and design system principle

All four entry points must use shared UI primitives and the existing design system tokens. Goals:

- Minimize new component types — reuse existing input, toggle, dropdown, chip, and panel primitives from `src/components/ui/` where possible.
- UI primitives used in the layers panel (rows, icons, indent, drag handle, visibility toggle) are extracted into reusable components in `src/components/ui/` (e.g. `tree-row.tsx`), shared between the layers panel and the pages panel. No duplication.
- New components (PagesPanel, PageSettingsPopup, FollowLinkPopup) must align with the style guide in `docs/EDITOR_STYLE_GUIDE.md` for colors, radii, shadows, and control sizing.
- The style guide (`docs/EDITOR_STYLE_GUIDE.md`) and the design showcase (if one exists) must be kept in sync when any new design tokens or component patterns are introduced.
- The inspector "no selection" page editor reuses the same input/label patterns already present in other inspector sections.

---

## 1. Data Model Extensions

### 1a. LinkKind — add 'page' type

`src/model/types/index.ts` — extend `LinkKind`:

```ts
export type LinkKind = 'anchor' | 'external' | 'page';
```

`LinkLeaf` gains two optional fields:

- `targetPageId?: PageId` — the destination page for `linkType: 'page'`
- `pageAnchorId?: NodeId` — optional within-page section anchor on the target page

### 1b. Slug tracking

Slugs are always explicitly stored in `DocumentPage.slug`. There is no derived or implicit slug state. The global `autoSyncSlugs` setting (see §5) controls whether the slug automatically follows display name changes — it is a behavior flag, not a state per slug. The UI may display a "slug differs from name" indicator (derived from `slug !== normalizeSlug(displayName)`) but this is visual only, never stored.

---

## 2. Layers Panel: "Pages" Tab

**File:** `src/panels/LayersPanel.tsx`

Add a tab bar at the top (Layers | Pages). The Pages tab renders a tree of `DocumentPage` entries using the same multi-level hierarchy UX already built for the layers tree:

- Page rows: icon + `displayName` + visibility dot + active-page highlight
- Full multi-level nesting via `parentPageId` — same expand/collapse and indentation as container layers, no depth limit in phase 1
- Click → dispatch `{ type: 'setActivePage', pageId }`
- Hover reveals action icons: **gear** (settings popup), **delete**, **drag handle**. No right-click menus.
- "＋ Add page" at the bottom
- Drag to reorder and drag-to-indent (reparent) — same behavior as layer tree nodes

The Layers tab content is unchanged.

---

## 3. Dedicated Pages Management Panel

**New file:** `src/panels/PagesPanel.tsx`

**Left-rail trigger:** Add a "pages" icon button to the left rail in `AppShell.tsx`. State: `pagesOpen: boolean` in component state (not editorState — panel-only concern).

**Panel style:** Wide modal (~480px), anchored below the left-rail button or centered.

**Layout:**

```text
┌─ Site ──────────────────────────────────────────┐
│  Title: ________________   Status: [Draft ▼]    │
│  Default transition: [Cross-fade ▼]              │
│  Site language: [en ▼]                           │
├─ Pages ──────────────────────────────────────────┤
│  ▶ Home          /         👁 [⚙]  [☰]          │
│    ▶ About       /about    👁 [⚙]  [☰]          │
│    Contact       /contact  👁 [⚙]  [☰]          │
│                                                  │
│  + Add page                                      │
├─────────────────────────────────────────────────┤
│  Export routing: [Directory ▼]                   │
│  [Validate links]   [Export site]                │
└─────────────────────────────────────────────────┘
```

**Site section:** Site title, draft/published status, default view transition, site-level lang. These map directly to `setSiteSettings()`.

**Page rows:** Display name, slug preview, visibility toggle, gear icon (opens page settings popup), drag handle. Drag-to-reorder and drag-to-reparent (indent on drop). Hover reveals the gear and delete icons.

**Export section:** Output structure dropdown (directory / flat), validate links button (deferred full implementation), export site ZIP.

---

## 4. Page Settings Popup

**New file:** `src/panels/PageSettingsPopup.tsx`

Triggered by the gear icon on any page row (in either the Layers/Pages tab or the dedicated panel). Presented as a small popover anchored to the row.

**Fields:**

| Field | Behavior |
| --- | --- |
| Display name | Text input. On blur or Enter, triggers slug sync check (see §5). |
| URL slug | Text input. Real-time format validation (`validatePageSlug`). Shows "auto" badge when synced with name; "custom" when detached. "Reset" link re-syncs. |
| Slug aliases | Chip list. Add/remove. Shown below slug. Auto-populated when slug changes on a published page (see §5). |
| Visibility | Toggle: visible / hidden. Hidden pages export but aren't linked in auto-generated nav. |
| View transition | Dropdown: Inherit from site / None / Cross-fade / Slide. |
| Parent page | Dropdown of other pages (excluding self and own descendants). Setting `null` = top-level. |

---

## 5. Rename + Slug Sync Logic

### Global "auto-sync slugs" setting

An `autoSyncSlugs: boolean` flag lives in `siteSettings`. Default:

- `true` when `siteSettings.status === 'draft'`
- `false` when `siteSettings.status === 'published'`

The user can toggle this in the Site section of the pages panel. When `status` changes the default flips, but any explicit user override persists until cleared.

### Rename flow — with `autoSyncSlugs === true`

1. User edits a page's display name.
2. Slug is **automatically updated** to `normalizeSlug(newName)` — no slug confirmation dialog.
3. An inline note immediately appears: _"Slug changed to `/new-slug`. Sync internal links? [Yes] [No] [Revert]"_ — Revert rolls back the slug to its previous value and dismisses the prompt without any data changes. No data is committed until the user resolves this prompt.
4. If `status === 'published'`: the old slug is also automatically added as an alias. A note reads _"Alias `/old-slug` preserved."_ with an undo button.

### Rename flow — with `autoSyncSlugs === false`

1. User edits a page's display name.
2. Slug does **not** change. If `slug !== normalizeSlug(displayName)`, the panel row shows a subtle "slug differs from name" indicator and a **Sync** button.
3. Clicking **Sync** updates the slug to `normalizeSlug(displayName)` AND shows the same _"Slug changed. Sync internal links? [Yes] [No]"_ prompt (plus the published alias note if applicable).

### After any slug change (both flows)

- "Sync internal links" = sweep all `LinkLeaf` nodes where `targetPageId === pageId` and update any stored hrefs or slug references.
- The inline prompt stays visible until the user responds or navigates away.
- No data is written to the document until the user picks Yes, No, or Revert.

### Conflict validation

Slug uniqueness is checked across all pages and their aliases in real time. The slug field does not commit its value until the validation passes. Shown as inline error below the slug input.

---

## 6. Inspector: No-Selection State → Page Editor

**File:** `src/panels/EditorSidebar.tsx` (and/or `InspectorPanel.tsx`)

When `selectedId === null` and `selectedIds.length === 0`:

- Show current page's display name (editable text input → dispatches `setPageDisplayName`)
- Show slug (editable → dispatches `setPageSlug`, with rename logic from §5)
- Show visibility toggle
- Show view transition dropdown
- Show "Manage page…" link that opens the page settings popup
- Show "All pages…" link that opens the dedicated pages panel

This replaces the current "No selection" placeholder text.

---

## 7. Top-Bar Page Switcher Dropdown

**File:** `src/app/AppShell.tsx`

Add a compact button/dropdown left of the existing topbar right-side buttons (theme, settings, etc.). Shows the current page's `displayName` (or "— no page —" if single-page mode). On click, opens a dropdown list:

```text
┌─────────────────────┐
│ ● Home              │
│   About             │
│     Sub-page        │
│   Contact           │
├─────────────────────┤
│ + New page          │
└─────────────────────┘
```

Clicking a page dispatches `setActivePage`. "+" dispatches `addPage` and immediately focuses the new page's name in the inspector.

---

## 8. Link Enhancements

### 8a. NavigationFields — add "Page" link type

**File:** `src/panels/inspector/contentSections/shared/NavigationFields.tsx` (and `linkSections.tsx`)

Extend the link type picker to include "Page" alongside "Anchor" and "External URL":

- When "Page" is selected: show a page picker dropdown (all pages from `document.pages`, rendered with hierarchy indentation)
- Optional: show an anchor-within-page picker below the page picker (sections of the target page)
- Page link resolves to the target page's slug URL at export time

New resolve logic in `src/model/links.ts`:

```ts
// For linkType === 'page':
getLinkHref(node, document) → resolvePageUrl(page, document) + (pageAnchorId ? '#'+anchorId : '')
```

### 8b. Follow-link popup

**New file:** `src/panels/FollowLinkPopup.tsx`

When a `LinkLeaf` is selected in the stage, a small tooltip appears near it (below or above the node, 8px gap):

```text
┌────────────────────────────────────┐
│ → Go to "About"                    │
└────────────────────────────────────┘
```

- **Page link:** "→ Go to About" → dispatches `setActivePage(targetPageId)` + scrolls stage to top
- **Anchor link:** "↓ Jump to #hero-section" → scrolls the stage to that node
- **External link:** "↗ Open example.com" → `window.open(href, '_blank')`

Rendered as an overlay in `AppShell.tsx`, positioned relative to the selected node's stage rect.

**Visibility behavior:**

- Appears automatically on selection of a `LinkLeaf` (single selection only).
- Clicking the already-selected link node again **toggles** the popup: second click hides it, third click shows it again.
- Toggle does **not** trigger if the click was the start of a drag — suppress the toggle if `pointerdown` → `pointermove` occurred before `pointerup`.

---

## 9. Preview Mode

**Approach:** Editor runtime — same app, `?mode=preview` URL parameter removes editor chrome and renders `SiteRenderer`.

### Preview button

In the topbar, an **eye** icon button. Click → `window.open(previewUrl, 'sticky-preview')`. Using a named window target (`'sticky-preview'`) means subsequent clicks reuse the same tab rather than opening a new one each time. If the tab was closed, a new one opens.

**Icon change:** The existing "Preview Sticky" toggle in the left rail currently uses an eye icon. Replace it with a **scan-eye** icon (or equivalent) to free the plain eye icon for the preview button.

### Preview tab rendering in `AppShell.tsx`

Read `URLSearchParams` on mount: `const isPreview = params.get('mode') === 'preview'`

When `isPreview === true`:

- Render only `<SiteRenderer document={...} pageId={activePageId} includeAnimations />` — no editor chrome
- Content fills the viewport (no fullscreen API, just full-viewport CSS)
- Internal page links navigate by updating a local `activePageId` state — no full routing needed for phase 1
- View transitions simulated via CSS

### Preview tab ↔ editor communication

The preview tab and the editor share the same localStorage. The preview tab polls (or listens via `storage` event) for document changes and re-renders. This gives live-preview behavior without a build step.

### Floating "back to editor" button

A single floating button in the bottom-left of the preview tab (design deferred):

- If the opener tab is still alive: `window.opener?.focus()` to switch back
- If no opener (e.g. tab was closed): opens a new tab at the editor URL without `?mode=preview`

---

## 10. Settings Panel Export Section

**File:** `src/panels/settings/sections/TransferSettingsSection.tsx` (or a new sibling `SiteExportSection.tsx`)

Add:

- **Status toggle:** Draft / Published (maps to `siteSettings.status`)
- **Output structure:** Directory (`about/index.html`) / Flat (`about.html`) — stored in `siteSettings` or export options

These appear above the existing export buttons. The draft/published flag is also mirrored in the dedicated pages panel's "Site" section — same dispatch, two entry points.

---

## 11. localStorage Size Warning (Pre-IndexedDB Guard)

Not a new panel — a transient toast/banner in `AppShell.tsx`.

On every `document` change (debounced), estimate storage usage:

```ts
const estimatedSize = JSON.stringify(document).length * 2; // UTF-16 bytes
const quota = 5 * 1024 * 1024; // 5MB approximation
if (estimatedSize / quota > 0.8) → show warning banner
```

IndexedDB migration (RI-31) remains deferred but this guard prevents silent data loss.

---

## Implementation Details

### Extracting shared layer row primitives

Before adding the Pages tab, extract reusable primitives from `src/panels/LayersPanel.tsx` into `src/components/ui/tree-row.tsx`:

- **`TreeRowItem`** — the generic row shell: indent via `paddingLeft: 8 + depth * 8` px, disclosure toggle (ChevronDown/ChevronRight), drag handle (`onPointerDown`), slot for icon, slot for label, slot for actions.
- **`VisibilityToggle`** — Eye/EyeOff button extracted from `LayersTreeRowItem` lines 730–750.
- **`DragHandle`** — the pointer-down area from `LayersTreeRowItem` lines 644–651.

`LayersPanel.tsx` refactors its `LayersTreeRowItem` to use these primitives. `PagesPanel.tsx` and the Pages tab in the layers panel also use them. No duplication. The extracted components are exported from `src/components/ui/tree-row.tsx` and barrel-re-exported if needed.

### §2 — Layers panel: adding the Pages tab

`src/panels/LayersPanel.tsx`:

- Add a `activeTab: 'layers' | 'pages'` local state (default `'layers'`).
- Render a two-button tab bar at the top of the panel using existing `Button` component with `variant="ghost"` / `variant="default"` for active/inactive.
- When `activeTab === 'pages'`: render `<PageTreeContent>` (new sub-component in the same file or in `src/panels/pageTree/PageTreeContent.tsx`).
- `PageTreeContent` receives `document.pages` and `activePageId`. It builds a recursive tree (same shape as `buildLayersTreeRows`) using `parentPageId` to compute `depth`. Uses the extracted `TreeRowItem` primitive. Click → `onSetActivePage(pageId)`. Hover reveals gear + delete icon using the existing `.editor-layers-row-actions` pattern.

### §3 — Dedicated pages panel

`src/panels/PagesPanel.tsx` — new file, ~300 lines target:

- Opened via `pagesOpen: boolean` in AppShell local state.
- Rendered as a `PopoverSurface` (same primitive used by SettingsPanel) anchored to the left-rail pages button.
- Internal layout: three sections with `<hr>` dividers — Site, Pages, Export — matching the wireframe.
- Site section calls `setSiteSettings()` on change.
- Pages section renders the same `PageTreeContent` (shared with layers panel tab).
- Export section calls `renderSiteExportBundles()` and `buildRouteManifest()`.
- `outputStructure: 'directory' | 'flat'` is stored in `siteSettings` (add to `SiteSettings` type in `src/model/types/site.ts`).

### §4 — Page settings popup

`src/panels/PageSettingsPopup.tsx` — new file, ~200 lines target:

- Props: `page: DocumentPage`, `document: DocumentModel`, `onClose`, dispatcher callbacks.
- All fields use existing inspector input primitives (`InspectorInlineRow`, `Select`, `Button`).
- Slug validation calls `validatePageSlug()` from `src/api/pageApi.ts:247`.
- The "slug differs from name" indicator: `page.slug !== normalizeSlug(page.displayName)` → show warning icon + "Sync" button.
- Alias chip list: map `page.slugAliases` to `<Chip>` with `×` remove button. "Add alias" text input.
- Parent page dropdown: filtered `document.pages.filter(p => p.id !== page.id && !isAncestorOf(p, page, document))`.

### §5 — Slug sync logic: where it lives

The rename + slug sync state machine lives inside `PageSettingsPopup.tsx` and the no-selection inspector section as local component state. It is NOT in the reducer. Flow:

1. `displayName` change → if `autoSyncSlugs` → compute new slug → set local `pendingSlugChange: { from, to }` state.
2. Render inline banner with Yes/No/Revert buttons.
3. Yes → dispatch `setPageSlug` + optionally `addPageSlugAlias` + optionally sweep links.
4. Revert → clear `pendingSlugChange`, slug stays as-is.
5. No → dispatch `setPageSlug` only (no link sweep, no alias).
6. Data is only dispatched at step 3/4/5 — nothing is written during the pending state.

### §6 — Inspector no-selection state

`src/panels/EditorSidebar.tsx` lines 104–133 currently renders `'No selection'` text when `singleEditableNode` is null and it's not multi-select. Replace this with `<PageInspectorSection>` (new component, ~80 lines, inline in the same file or in `src/panels/inspector/contentSections/PageInspectorSection.tsx`):

- Uses the same `InspectorInlineRow` + input primitives as other inspector sections.
- Fields: display name, slug (read-only with edit icon that opens PageSettingsPopup), visibility toggle, view transition dropdown.
- "Manage page…" button → sets `pagesOpen = true` in parent.
- Condition: `selectedId === null && selectedIds.length === 0 && activePageId !== null`.
- If `activePageId === null` (no pages in document): keep showing "No selection".

### §7 — Top-bar page switcher

`src/app/AppShell.tsx`:

- Add a `PageSwitcherDropdown` component (inline or extracted). Rendered before the undo/redo buttons in the topbar (before line 335).
- Uses a `Popover` (or the existing dropdown primitive) triggered by a `Button` showing `activePageName`.
- Page list: `document.pages` rendered with `paddingLeft: depth * 12px`, active page gets a filled dot icon.
- Click → `dispatch({ type: 'setActivePage', pageId })`.
- "＋ New page" → `dispatch({ type: 'addPage' })` + focus name in inspector via a `useEffect` on `activePageId` change.

### §8a — NavigationFields: 'page' link type

`src/panels/inspector/contentSections/shared.tsx` lines 399–420 (the two-button type picker):

- Add a third button: "Page" (renders when `document.pages` is non-empty).
- When selected: show `<PagePickerField>` — a `<Select>` populated from `document.pages` with depth-indented option labels.
- Below page picker: optional `<SectionAnchorField>` for `pageAnchorId` — reuses existing anchor dropdown logic from the anchor link mode, but filters by `targetPageId`'s sections.
- `normalizeNavigationKind()` in `src/model/links.ts` updated to recognize `'page'` as a valid kind.
- `getLinkHref()` updated: `linkType === 'page'` → call `resolvePageUrl(targetPage, document)` + `(pageAnchorId ? '#' + pageAnchorId : '')`.
- `isBrokenAnchorLink()` updated: `linkType === 'page'` → check that `targetPageId` exists in `document.pages`.

### §8b — Follow-link popup

`src/panels/FollowLinkPopup.tsx`:

- Props: `node: LinkLeaf`, `stageRect: DOMRect`, `document: DocumentModel`, `onNavigate`, `onClose`.
- Position: anchored below the node's stage bounding box (8px gap). If it overflows viewport bottom, flip to above.
- Content: single action button with icon (→ / ↓ / ↗) and label text derived from link type.
- Toggle state: tracked in AppShell via `linkPopupVisible: boolean`. Resets to `true` on new selection. Toggles on repeated click of the same node (detected by comparing `selectedId` with `lastClickedId`). Does not toggle if a drag occurred (track `hasDragged` in the stage's pointer event handler).

### §9 — Preview mode

`src/app/AppShell.tsx`:

- On mount: `const isPreview = new URLSearchParams(window.location.search).get('mode') === 'preview'`.
- If `isPreview`: render `<div style={{position:'fixed',inset:0,overflow:'auto'}}><SiteRenderer ... /></div>` and nothing else. Include the floating "back to editor" `<BackToEditorButton>` overlay (small component, ~30 lines).
- Preview button in topbar: `<TopbarIconAction icon={Eye} title="Preview" onClick={() => window.open(previewUrl, 'sticky-preview')} />` inserted after the Settings button (after line 367 in AppShell).
- Change sticky preview toggle icon: find `RailToggleButton` with Eye icon at line ~392, change icon import to `ScanEye` (from lucide-react, or map to the closest available icon).

### §10 — Settings panel additions

`src/panels/settings/sections/TransferSettingsSection.tsx`:

- Add a `<SettingRow>` before the existing export buttons for **Status** (Draft / Published segmented control) and **Output structure** (Directory / Flat select).
- Both dispatch via `setSiteSettings()` (already available through props — check existing prop threading in `SettingsPanel.tsx`).
- If `siteSettings` props are not yet threaded into `TransferSettingsSection`, add them via `SettingsPanel.tsx` `renderSectionContent` at lines 316–378.

### §11 — Storage warning

`src/app/AppShell.tsx`:

- Add a `useEffect` that fires on every `editorState.document` change (debounced 2s).
- Estimate: `JSON.stringify(editorState.document).length * 2`.
- If > 4MB (80% of ~5MB): set `showStorageWarning: boolean` state to true.
- Render a dismissible banner at the top of the stage area (not a modal — should not block work).

---

## Subagent Implementation Breakdown

Implementation should be split across agents in two waves to manage dependencies.

### Wave 1 — Model and primitives (must complete before Wave 2)

**Agent 1 — Model changes** (isolated, no UI deps) — model: `haiku`, subagent type: `general-purpose`:

- `src/model/types/index.ts`: add `'page'` to `LinkKind`, add `targetPageId` + `pageAnchorId` to `LinkLeaf`
- `src/model/types/site.ts`: add `autoSyncSlugs?: boolean` and `outputStructure?: 'directory' | 'flat'` to `SiteSettings`
- `src/model/links.ts`: update `getLinkHref`, `isBrokenAnchorLink`, `normalizeNavigationKind` for `'page'` link type
- `src/model/pageDefaults.ts`: update `createInitialSiteSettings` defaults (`autoSyncSlugs: true`, `outputStructure: 'directory'`)
- Update existing tests in `src/api/tests/pageApi.test.ts` and `src/model/` tests

**Agent 2 — Shared layer/tree row primitives** (isolated refactor) — model: `haiku`:

- Extract `TreeRowItem`, `VisibilityToggle`, `DragHandle` from `LayersPanel.tsx` into `src/components/ui/tree-row.tsx`
- Refactor `LayersPanel.tsx` to use these new primitives (zero behavior change, just extraction)
- Verify no visual regression by running tests

### Wave 2 — UI components (run in parallel after Wave 1)

**Agent 3 — Layers panel Pages tab + PageTreeContent** — model: `sonnet`, subagent type: `general-purpose`:

- `src/panels/LayersPanel.tsx`: add `activeTab` state, tab bar, `PageTreeContent` sub-component
- Uses `TreeRowItem` from Wave 1 Agent 2
- Dispatches: `setActivePage`, `addPage`, `deletePage`, `reorderPage`, `setPageParent`

**Agent 4 — AppShell: topbar + preview mode + left rail** — model: `sonnet`, subagent type: `general-purpose`:

- `src/app/AppShell.tsx`: page switcher dropdown, preview button (Eye icon), sticky preview icon → ScanEye, preview mode detection, storage warning banner
- `src/panels/FollowLinkPopup.tsx`: new component, integrated into AppShell overlay layer

**Agent 5 — Dedicated pages panel + page settings popup** — model: `sonnet`, subagent type: `general-purpose`:

- `src/panels/PagesPanel.tsx`: new component with Site/Pages/Export sections
- `src/panels/PageSettingsPopup.tsx`: new component with full slug sync state machine
- Uses `TreeRowItem` and `PageTreeContent` from Wave 1/Wave 2 Agent 3

**Agent 6 — Inspector + settings panel + NavigationFields** — model: `sonnet`, subagent type: `general-purpose`:

- `src/panels/EditorSidebar.tsx`: replace no-selection state with `PageInspectorSection`
- `src/panels/inspector/contentSections/shared.tsx`: add 'page' link type to `NavigationFields`
- `src/panels/settings/sections/TransferSettingsSection.tsx`: draft/published + output structure
- `src/app/types/index.ts` + `src/app/editorState.ts`: any new action types needed

**Agent 7 — Docs + Tests** (after all Wave 2 agents complete) — model: `haiku`, subagent type: `general-purpose`:

- New tests for slug sync logic
- New tests for `getLinkHref` with `linkType: 'page'`
- Integration tests for page switching in `editorStore.integration.test.ts`
- Update `siteExport.mpa.test.ts` for `outputStructure` field
- Update `docs/PLAYGROUND_SPEC.md`: document all new page UX behaviors (page switching, slug sync, preview mode, link types)
- Update `docs/PLAYGROUND_ROADMAP.md`: mark RI-07 items as implemented, update status
- Update help entries if any new UI affordances need documentation (per the help system additions from recent commits)
- Update `docs/NEXT_STAGE_BRIEF.md` or promote resolved items to the spec/roadmap as appropriate

---

- **'page' LinkKind** — not explicitly in the brief's link section but required to make internal page links work (§8)
- **Inspector no-selection = page editor** — confirmed in brief and by user (§6)
- **Top-bar page switcher** — user added this explicitly (§7)
- **Follow-link popup** — user requested; extends to all three link types (§8b)

---

## Critical Files

| File | Change |
| --- | --- |
| `src/model/types/index.ts` | Add `'page'` to `LinkKind`, add `targetPageId` + `pageAnchorId` to `LinkLeaf` |
| `src/model/types/site.ts` | Add `autoSyncSlugs?: boolean` to `SiteSettings` |
| `src/model/links.ts` | Handle `linkType: 'page'` in `getLinkHref`, `isBrokenAnchorLink`, `normalizeNavigationKind` |
| `src/app/AppShell.tsx` | Add pages panel state + toggle, top-bar page switcher dropdown, preview mode detection, named-tab preview button |
| `src/panels/LayersPanel.tsx` | Add Pages tab with multi-level page tree, hover actions, click-to-switch |
| `src/panels/EditorSidebar.tsx` | Replace "No selection" state with current page editor fields |
| `src/panels/settings/sections/TransferSettingsSection.tsx` | Add draft/published toggle + output structure dropdown |
| `src/panels/inspector/contentSections/shared/NavigationFields.tsx` | Add 'page' link type option with page picker |
| **`src/panels/PagesPanel.tsx`** | New — dedicated pages management panel |
| **`src/panels/PageSettingsPopup.tsx`** | New — per-page settings popup |
| **`src/panels/FollowLinkPopup.tsx`** | New — follow-link tooltip for selected link nodes |
| `src/app/types/index.ts` | Any new action types if needed (likely not — all page actions already exist) |
| `src/app/editorState.ts` | Handle any new action types |

---

## Verification

1. **Pages tab in layers panel:** Toggle to Pages tab, add a page, rename it, drag to reorder, drag-to-indent to reparent. Verify `document.pages` updates correctly with multi-level hierarchy.
2. **Active page switching:** Switch pages via dropdown, layers tab, and inspector. Confirm stage renders only the active page's sections.
3. **Page settings popup:** Edit display name with `autoSyncSlugs` on → confirmation dialog appears. Accept → slug updates. Change slug on published page → alias is added. Change slug on draft page → auto-fix offer appears.
4. **Global slug sync toggle:** Set to off → renaming pages no longer prompts slug update. Set to on → prompts resume.
5. **Link 'page' type:** Create a link, set type to "Page", select a target page. Verify `getLinkHref` returns the target page's slug URL. Verify export HTML contains the correct href.
6. **Follow-link popup:** Select a page link → popup shows "Go to [page]" → click → stage switches to that page. Select external link → popup shows "Open [url]" → new tab opens.
7. **Preview mode:** Click preview button → named tab opens (or existing preview tab is reused/focused). Confirm no editor chrome. Confirm internal page links navigate within preview. Change document in editor → preview updates via storage event.
8. **Inspector no-selection:** Deselect all. Confirm current page name/slug/visibility appear. Edit them and confirm dispatches update `document.pages`.
9. **Top-bar dropdown:** Click dropdown, switch pages, confirm stage updates. "+" adds new page and focuses name in inspector.
10. **Settings panel:** Toggle draft/published, change output structure. Confirm `siteSettings` updates. Export ZIP and verify file paths match output structure selection.
11. **Storage warning:** Manually inflate document to near 5MB in test. Confirm banner appears.
12. **Run full test suite:** `npm test` — especially `src/api/tests/pageApi.test.ts`, `src/editor/tests/editorStore.integration.test.ts`, and `src/site/tests/siteExport.mpa.test.ts`.
13. **Archive plan:** Move this plan file to the `archive/` folder once implementation is complete.
