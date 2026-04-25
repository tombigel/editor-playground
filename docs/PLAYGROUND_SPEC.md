# Playground Spec

This document captures the editor and implementation model used by the sticky playground.

Related documentation:

- [Editor Style Guide](./EDITOR_STYLE_GUIDE.md): visual rules and token guidance for editor chrome
- [Sticky Render Model](./STICKY_RENDER_MODEL.md): rendered-site sticky data and DOM structure
- [Animation API – Console Testing Guide](./CONSOLE_TEST_GUIDE.md): dev-console testing flow for `window.playgroundAnimationApi`

## Reading Guide

This spec is implementation-oriented. For the quickest path through it:

1. Read `Goal`, `Node Model`, `Document Model`, and `Wrapper Model` for the shared vocabulary.
2. Read `Layout Model`, `Units`, `Sticky Model`, and `Spacer Model` for geometry and sticky behavior.
3. Read `Site Rendering`, `Preview Model`, and `Animation Model` for runtime/export semantics.
4. Read `Editor UX`, `Architecture Boundaries`, and `Section Templates` for product behavior and system boundaries.

## Table of Contents

- [Goal](#goal)
- [Node Model](#node-model)
- [Document Model](#document-model)
- [Multiple Pages & Navigation](#multiple-pages--navigation)
- [Wrapper Model](#wrapper-model)
- [Nesting Rules](#nesting-rules)
- [Layout Model](#layout-model)
- [Ordering Model](#ordering-model)
- [History Model](#history-model)
- [Import / Export](#import--export)
- [Units](#units)
- [Font Management](#font-management)
- [Inspector Field Model](#inspector-field-model)
- [Sticky Model](#sticky-model)
- [Spacer Model](#spacer-model)
- [Site Rendering](#site-rendering)
- [Preview Model](#preview-model)
- [Animation Model](#animation-model)
- [Editor UX](#editor-ux)
- [Architecture Boundaries](#architecture-boundaries)
- [Section Templates](#section-templates)
- [Default Seed Content](#default-seed-content)
- [Validation Policy](#validation-policy)
- [Debugging Aids](#debugging-aids)
- [Running the Playground](#running-the-playground)

## Goal

The playground exists to validate a small set of core sticky-layout questions across the model, the editor, and the rendered output.

| Area | What the playground validates |
|---|---|
| Data model | the minimal representation needed for sticky layout behavior |
| DOM structure | how sticky duration and spacer structure should be expressed in the DOM |
| Editor UX | how sticky controls should be exposed predictably |
| Interaction model | how multiple sticky elements inside one section interact |

The playground exists to test:

1. the minimal data model for sticky layout behavior
2. how sticky duration should be represented structurally in the DOM
3. how an editor should expose sticky controls predictably
4. how multiple sticky elements inside one section interact

## Node Model

### Node families

| `contentType` | `subtype` values | Notes |
|---|---|---|
| `site` | — | Document root; exactly one per document. |
| `container` | `section`, `header`, `footer`, `container`, `group` | Structural layout nodes. |
| `text` | `block`, `rich`, `code`, `list` | Text content nodes. |
| `media` | `image`, `video`, `svg`, `embed` | Media content nodes. |

### Node identity

Node ids are monotonic per session and are synchronized against the loaded document before insertions, so newly inserted templates or components cannot overwrite existing nodes.

## Document Model

### Top-level document shape

| Field | Purpose |
|---|---|
| `rootId` | Site root node id |
| `nodes` | Full document node graph |
| `fontLibrary` | Document-scoped font manifest |
| `pages` | Array of page definitions (each with `id`, `displayName`, `slug`, `sectionIds`, `slugAliases`, `parentPageId`) |
| `sharedRegionIds` | Root-level wrapper ids shared across all pages |
| `siteSettings` | Site-level settings including `outputStructure` ('directory' or 'flat') |

### Font library fields

| Field | Purpose |
|---|---|
| `defaults` | Baseline families included with the document |
| `usedFamilies` | Document font entries available to nodes |
| `favorites` | Pinned families for quick access |

### Default seeded families

- `Inter`
- `Assistant`
- `Playfair Display`
- `Cormorant Garamond`
- `Proza Libre`
- `Poppins`
- `Open Sans`
- `Fraunces`
- `Montserrat`
- `Crimson Text`

### Font library rules

- Font management is document-level, not app-level.
- Text, link, and button leaves can author `fontFamily` and numeric `fontWeight`.
- Favorites are persisted per document.
- Removing a font family is blocked while any text-capable node still uses it.
- `purge-unused` removes only unused families that are neither defaults nor favorites.
- Imported legacy text weights such as `'bold'` and `'normal'` are normalized to numeric weights.
- Document normalization resolves missing or stubbed Google-backed family names against the bundled catalog before falling back to a minimal placeholder entry.

## Multiple Pages & Navigation

The playground supports multi-page sites with nested page hierarchies, slug management, and internal page linking.

### Page model

Each page has:

- `id`: unique page identifier
- `displayName`: human-readable page title
- `slug`: URL-safe identifier (auto-generated from displayName, manually editable)
- `pageRole`: `default` or `home`
- `sectionIds`: ordered list of section node IDs belonging to this page
- `slugAliases`: array of alternative slugs for redirect/alias support
- `parentPageId`: optional ID of parent page for nested URL hierarchies

### Page hierarchy and URL resolution

- Exactly one page is marked `pageRole: 'home'` when pages exist
- Home page canonical URL always resolves to `/`
- Home page keeps its normal hierarchy-derived URL as a system alias while it is Home
- Home pages cannot be hidden
- A single-page site always keeps that lone page as Home and it cannot be deleted until another page exists
- Deleting the current Home page is only allowed implicitly by promoting another page to Home first
- Non-root pages resolve to `/slug/` (single level) or `/parent-slug/child-slug/` (nested)
- Parent-child relationships prevent cycles and allow multiple child pages per parent
- `resolvePageUrl(document, pageId)` returns the canonical page URL
- `resolvePageHierarchyUrl(document, pageId)` returns the hierarchy-derived path from slug and parent chain
- New page creation auto-increments duplicate page names and slugs, and it avoids collisions with existing slug aliases as well as primary slugs

### Page linking

Links support `linkType: 'page'` in addition to `'anchor'` and `'external'`:

- `linkType: 'page'` links carry `targetPageId` and optional `pageAnchorId` (target section on that page)
- `getLinkHref(link, document)` resolves page links to absolute URLs
- Page links with `pageAnchorId` append the anchor to the URL: `/about/#section-1`
- Editor follow-link popups allow clicking links to navigate between pages
- Broken page links (missing target page) are flagged by validation

Hidden-stage semantics:

- Only authored hidden visibility participates in hidden ghosts:
  - regular nodes use their `visible` / `hidden` flag
  - top-level `section`, `header`, and `footer` wrappers use the authored top-level wrapper visibility mode, including `Hidden`
- Top-level wrappers that are merely absent from the active page because of `Current page` or `Custom pages` targeting are not treated as hidden ghosts on that page

### Top-level wrapper visibility

Eligible top-level wrappers are the site-root children with role `section`, `header`, or `footer`.

Their authored visibility modes are:

- `Hidden`: do not render the wrapper on any page
- `Current page`: keep the wrapper attached to the active page
- `All pages`: render the wrapper on every page through the shared-region path
- `Custom pages`: render the wrapper only on the selected page IDs

The Components panel and Inspector both expose this control for eligible top-level wrappers, including custom page selection. The Pages panel no longer owns this control.
The control uses a compact dropdown trigger. Opening it shows page-targeting modes (`Current page`, `All pages`, `Custom pages`, `Hidden`), and choosing `Custom pages` swaps the dropdown into a searchable multi-select checklist with immediate updates and a guard against clearing the last selected page.

### Editor page switching

- `activePageId` in editor state determines which page's sections render on stage
- Stage displays the active page's current-page top-level wrappers plus shared top-level wrappers
- Page switching is immediate; undo/redo preserves page selection
- No-selection state shows page inspector allowing creation and settings
- The floating Pages panel is always available, including for single-page sites; it is the inline surface for page aliases, home assignment, transition, and parent settings
- The Components panel and Inspector expose per-component visibility for eligible top-level wrappers, including `Hidden`, `Current page`, `All pages`, and `Custom pages`
- Regular node visibility remains a separate `visible` / `hidden` concern in the Inspector and does not support page targeting

### Preview mode and export

- Pages are rendered as static HTML files during export
- `outputStructure` in `siteSettings` determines file layout: `'directory'` (index.html per directory) or `'flat'` (one .html per page)
- `renderSiteExportBundles` returns bundles with paths and content for all pages
- Each page gets its own full HTML document with shared top-level wrappers plus its own current-page wrappers

## Wrapper Model

### Shared wrapper structure

| Wrapper concern | Rule |
|---|---|
| Outer shell | Every wrapper has one outer wrapper element. |
| `contentWrapper` | Every wrapper has one internal `contentWrapper`. |
| Child positioning | Children are positioned relative to the `contentWrapper`. |
| Sticky target | Sticky can apply to either the wrapper or the `contentWrapper`. |

### Shared wrapper styling rules

| Wrapper role | Background | Border | Radius | Shadow | Divider |
|---|---|---|---|---|---|
| `section` | yes | no | no | no | bottom divider only |
| `header` | yes | no | no | no | no |
| `footer` | yes | no | no | no | no |
| `container` | yes | yes | yes | yes | no |

Shared rules:

- Wrappers do not get an implicit visible border by default.
- Wrapper visual styling is applied on the inner `contentWrapper` surface rather than on the outer layout shell.

### Section type

#### Role transitions

A wrapper can be promoted or demoted between:

- `section`
- `header`
- `footer`
The inspector labels this control as `Section type`, and the wrapper keeps the same id.

#### Existing header/footer replacement flow

If a header or footer already exists, promotion asks whether to demote the current one and replace it.

#### Section, header, and footer design controls

Section/header/footer design controls stay minimal:

- `section`, `header`, and `footer` expose background color, but structural wrapper backgrounds are always opaque
- `section` also exposes a section-only bottom divider editor
- header/footer do not expose generic border, radius, or shadow controls

#### Section divider controls

The section design controls expose a dedicated bottom divider editor:

- `Divider`: one row containing:
  - bottom border width
  - bottom border color
- divider width uses the inline number-with-unit control in `px` only, with a minimum of `0`
- single-unit inline controls do not show dropdown hover chrome or selection interactions
- inspector color fields render inline in the row:
  - structural wrapper background color and section divider color use the shared advanced color picker with alpha controls hidden
  - container and leaf color fields that support transparency keep alpha controls enabled
  - the picker preserves authored CSS color strings, including extended spaces such as `oklch(...)`, `lab(...)`, and `color(display-p3 ...)`
  - reopening the picker re-initializes its active colorspace from the currently authored color string instead of carrying over the previous open session

## Nesting Rules

| Parent | Allowed children | Disallowed children |
|---|---|---|
| `section`, `header`, `footer` | containers, leaves | other `section`, `header`, `footer` |
| `container` | containers, leaves | none beyond validation rules |

This keeps site sections top-level while still allowing deep nested layout composition through containers.

## Layout Model

The editor uses a freeform placement model, not a predefined fixed grid.

### Editable geometry

| Field | Meaning |
|---|---|
| `x` | horizontal position |
| `y` | vertical position |
| `width` | authored width |
| `height` | authored height |

Children can be dragged, resized, and reparented between sections and containers.

### Drag behavior

Snapping and guides:

- Snap targets include page bounds, page centers, and element top/center/bottom alignment.
- A global snap toggle lives in the left rail.
- Snap guide colors are:
  - component guides: teal
  - page guides: magenta

Drag modifiers:

- `Alt` inverts the current snap mode during drag.
- `Shift` locks drag movement to a single axis.

Drag preview and drop targeting:

- The dragged source node fades and suppresses local box/filter shadows so the drag silhouette stays clean.
- The drag source ghost is pointer-transparent (`pointer-events: none`) so drop target detection sees through it.
- Pointer-up commits preserve the last visible drag preview position; releasing without moving the pointer does not introduce a new snap target.
- Hovering a valid drop target (`section` or `container`) highlights that wrapper with an accent-colored outline and tinted background.
- Highlighted drop targets with non-zero wrapper padding also render the padding boundary line so the drop inset is visible.
- While dragging a child inside its current parent, that source parent and its ancestors are not highlighted as drop targets.
- When dragging a `container` wrapper, its structural source parent (`section`, `header`, `footer`) may still highlight.
- On reparent, the element position is clamped so it stays at least partially visible within the target container.

### Drag implementation details

- Drag preview placement resolves from the pointer grab offset captured at drag start, with an additional visual-shift correction path for sticky-shifted nodes.
- Snap targets are cached when drag commits so pointer-move work avoids recollecting DOM targets every frame.
- Grouped drag commits as a single bulk move action, but only for the subset of the selection that shares the clicked node's parent wrapper.
- Grouped reparent is not supported; only single-node drags can reparent into a new wrapper.
- Marquee selection started from a top-level structural wrapper (`section`, `header`, `footer`) filters hits to direct children of that wrapper.
- Drop target detection resolves from `elementFromPoint(...)` and walks ancestor `data-drop-wrapper-id` markers until it finds a valid wrapper parent.
- Drop target highlighting prefers the deepest valid hovered target and suppresses ancestor promotion while the pointer remains inside the current source parent during child drags.
- Reparent commit position derives from the hovered wrapper's live DOM rect together with the captured drag grab offset, then clamps to keep the dropped node at least partially visible in the target wrapper.
- Valid drop targets receive a transient `drop-target` class on hover, and that class clears on drag end or pointer leave.

### Resize behavior

- `Shift` on corner handles preserves the current aspect ratio.
- Resize start normalizes to rendered box size when stored values are non-numeric (`auto`, `fit-content`, `min-content`, `max-content`, `%`, `aspect-ratio(...)`) so the first frame does not jump.
- Drag and resize coordinate commits stay anchored to model-space origin so sticky-preview viewport pinning does not leak into persisted `x` / `y`.

### Structural wrapper resize rules

- Top-level `section`, `header`, and `footer` wrappers expose a single bottom-center stage resize knob.
- Structural wrapper resize is height-only and keeps root wrappers in normal DOM flow, so growing a header or section pushes later root wrappers down and shrinking pulls them up.
- Structural wrapper resize preserves authored height units for `px`, `vw`, `vh`, `vmin`, and `vmax`.
- Resizing a structural wrapper with `height: auto` or `%` converts the authored height to `px`.
- Structural wrappers with `height: aspect-ratio(...)` do not show the stage resize knob.
- Structural wrapper resize clamps to rendered content fit, including wrapper padding and child layout extents, so the knob cannot be dragged below the content minimum.

## Ordering Model

Layer/order operations are implemented via DOM order (parent `children` array), not `z-index`.

### Reorderable node types

| Node type | Reorderable | Notes |
|---|---|---|
| leaves | yes | All leaves participate. |
| `container` wrappers | yes | Reordered among siblings. |
| root-level `section` wrappers | yes | Moved only among sibling sections. |
| `header` | no | Fixed structural role. |
| `footer` | no | Fixed structural role. |

### Section ordering behavior

Section ordering uses dedicated up/down controls in the inspector role row and only moves a section among sibling sections.

### Keyboard shortcuts

`Mod` maps to `Cmd` on macOS and `Ctrl` on Windows/Linux.

Ordering:

- `Mod + [`: position backward
- `Mod + ]`: position forward
- macOS: `Cmd + Alt + [` / `Cmd + Alt + ]`: send to back / bring to front
- Windows/Linux: `Ctrl + Shift + [` / `Ctrl + Shift + ]`: send to back / bring to front

Text styling:

- `Mod + B`: toggle bold on selected text-capable nodes when no input field is focused
  - bold is active at effective weight `>= 700`
  - toggle targets `400` and `800`
  - static families resolve the target to the nearest supported weight
- `Mod + I`: toggle italic on selected text-capable nodes when no input field is focused
- `Mod + U`: toggle underline on selected text-capable nodes when no input field is focused
- `Mod + Shift + X`: toggle strikethrough on selected text-capable nodes when no input field is focused

Alignment and distribution:

- `Mod + Alt + Left` / `Mod + Alt + H` / `Mod + Alt + Right`: align the current multi-selection left / center horizontally / right
- `Mod + Alt + Up` / `Mod + Alt + V` / `Mod + Alt + Down`: align the current multi-selection top / center vertically / bottom
- `Mod + Shift + Alt + H` / `Mod + Shift + Alt + V`: distribute the current multi-selection by horizontal / vertical gaps
- `Mod + Shift + Alt + Left` / `Right` / `Up` / `Down`: distribute the current multi-selection by left / right / top / bottom edges

Preview and stage controls:

- `Cmd/Ctrl + Alt + P`: open Preview site when no input field is focused
- `Shift + P`: toggle sticky preview from the left rail when no input field is focused
- `Shift + F`: toggle the Fonts panel from the View menu when no input field is focused
- `Shift + L`: toggle the Components panel when no input field is focused
- `Shift + O`: toggle the Pages panel when no input field is focused
- `Shift + V`: toggle hidden-node visibility ghosts when no input field is focused
- `Shift + S`: toggle spacer visuals from the left rail between selected-only and all when no input field is focused
- `Shift + R`: toggle grid visibility when no input field is focused
- `Shift + G`: toggle snap to guides when no input field is focused
- `Shift + D`: toggle debug info visibility when no input field is focused
- `Left` / `Right` / `Up` / `Down`: move the focused stage selection by `1px`
- `Shift + Left` / `Shift + Right` / `Shift + Up` / `Shift + Down`: move the focused stage selection by `10px`

Global controls:

- `Mod + ,`: open settings
- `?`: open the detached Shortcuts dialog when no input field is focused
- `Shift + H`: open Documentation when no input field is focused
- `Esc`: close open panels and dialogs

### Shortcut maintenance

Shortcut behavior lives in a shared shortcut registry, not in the editor chrome.

| Concern | Source of truth |
|---|---|
| Definitions, labels, and shortcut policy | `src/lib/shortcuts.ts` |
| Shortcut ID and policy types | `src/lib/types/index.ts` |
| Focus classification | `src/app/useEditorEnvironment.ts` |
| Execution dispatch | `src/app/shortcutController.ts` |

When adding a new shortcut:

1. Add the definition to `SHORTCUT_DEFINITIONS`.
2. Decide the context policy:
   - `allowInInteractive` for chrome shortcuts that should work from buttons/menus
   - `allowInTextInput: false` for browser-native text editing commands that should fall through in inputs
   - `requiresSelection` for edit/arrange actions that need selected nodes
   - `requiresStageFocus` for stage-only movement shortcuts
   - `requiresDismissiblePanels` for panel-dismiss actions
3. Add the execution action mapping if the shortcut performs an editor command.
4. Update the shortcut tests that cover matching and labels.
5. Update the controller test if the shortcut executes through the app action registry.
6. Update render tests if the shortcut label is shown in a menu or top bar surface.

Text-entry behavior:

- The shortcut matcher distinguishes text-entry focus from generic interactive chrome.
- `Cmd + Z` / `Cmd + Shift + Z` fall through to the browser in text fields and other editable content.
- Rich-text edit mode owns text-editor-standard shortcuts before the global shortcut registry can act.
- Settings stays available from non-text interactive chrome, while panel shortcuts stay blocked in text-entry contexts.
- Stage-only nudges still require a stage-focused selection.
- `Mod + A`, `Mod + C`, `Mod + X`, `Mod + V`, and `Mod + D` remain reserved for future API-backed edit commands and are not assigned to unrelated app actions.

### Shared interaction hooks

Reusable interaction hooks live in `src/lib/` and should be used instead of ad-hoc implementations when adding new interactive UI.

| Hook | Source | Purpose |
| --- | --- | --- |
| `useEscapeKey(callback, enabled?)` | `src/lib/useEscapeKey.ts` | Document-level Escape key listener. Use for dismiss-on-escape in panels, popovers, pickers. |
| `useClickOutside(refs, callback, enabled?)` | `src/lib/useClickOutside.ts` | Fires when a pointer event occurs outside all provided refs. Supports single ref or array. |

When adding a new panel, popover, or dismissable overlay:

1. Use `useEscapeKey` for escape-to-dismiss instead of inline `document.addEventListener('keydown', ...)`.
2. Use `useClickOutside` for click-outside-to-close instead of inline pointer event listeners.
3. Both hooks accept an `enabled` flag so they can be activated conditionally (e.g. only when the panel is open).

Shared UI constants:

| Constant | Source | Purpose |
| --- | --- | --- |
| `DARK_TOOLTIP_CLASS` | `src/lib/utils.ts` | Tailwind class string for dark inverted tooltips. Use instead of inline class duplication. |

Popover positioning and pointer drag tracking remain per-component because the positioning strategies differ fundamentally between tooltip, menu, select, and overlay use cases.

## History Model

Undo/redo uses an in-memory history stack.

### Storage and scope

- History is not persisted to `localStorage`.
- Entries are stored incrementally as per-node before/after patches.
- History stores incremental patches rather than full document snapshots.

### Transaction semantics

| Change type | History behavior |
|---|---|
| Resize | One transaction on release, not per mousemove frame |
| Move / non-text update | One transaction per action |
| Text edits | Debounced into grouped entries after a short idle |
| Document import | One undoable replacement transaction |

### User controls

| Surface | Control |
|---|---|
| Top bar | menubar (`Settings`, `Edit`, `View`, `Help`) plus standalone `undo`, `redo`, and `preview` actions |
| Keyboard | `Mod + Z`, `Mod + Shift + Z`, and `Ctrl + Y` on non-mac platforms |
| Settings | clear undo history, configurable max retained undo steps |

### Browser undo behavior

- `Cmd + Z` / `Cmd + Shift + Z` are handled by the app outside text-entry contexts.
- In text fields and other editable content, native browser undo/redo is preserved.

## Import / Export

The playground imports and exports document JSON and exports a rendered site bundle. It does not export full editor session state.

### Scope

- Import and export live in the settings panel under `Import / Export`.
- Export UI is grouped into `Document JSON` and `Rendered Site`.
- `Import / Export` is also the canonical surface for output-structure selection and full link-validation results.

### Document JSON import

- Choose a `.json` file.
- Paste JSON from the clipboard into the settings import box.
- Import pasted JSON from the textarea.
- Imported documents are normalized, validated, upgraded for legacy font state, replace the current document, clear selection, and can be undone with `Cmd + Z`.

### Document JSON export

- The settings panel exposes an editable base filename field.
- When browser APIs allow it, export suggests that filename in a native save flow.
- When native save is unavailable, export falls back to a named download using the same filename.
- JSON can also be copied to the clipboard.

### Rendered site export

| Output | Notes |
|---|---|
| HTML body | structural site markup |
| CSS | generated site stylesheet |

Additional export controls:

- `Output structure` switches between directory and flat export layouts.
- `Validate links` runs global page/anchor validation and renders copyable results inline in `Import / Export`.
| Full HTML document | links the generated CSS file |
| ZIP bundle | HTML + CSS export bundle |

### Validation and normalization

Validation during import and persistence restore checks document graph integrity in addition to role nesting:

| Rule | Requirement |
|---|---|
| Root node | `rootId` resolves to a `site` node |
| Parent ownership | non-root nodes have a parent |
| Parent references | parent `children` ids resolve to existing nodes |
| Child back-reference | child `parentId` points back to the owning parent |
| Duplicate children | duplicate child ids inside one parent are rejected |
| Orphaned subtrees | unreachable/orphaned subtrees are rejected |

### Runtime / SSR guarantees

- `src/site/SiteRenderer.tsx` renders structural site markup without editor concerns.
- `src/site/siteExport.tsx` renders body HTML, generated CSS, and a full HTML document that links the generated CSS file.
- Rendered HTML adds Google Fonts preconnect and stylesheet links when the document authors Google-backed families.
- Rendered site export does not depend on browser measurement APIs.
- Hidden nodes are omitted from site output entirely; export does not serialize them with `hidden`, `visibility:hidden`, or `display:none`.

## Units

The model is breakpoint-ready even though the editor exposes only a base breakpoint. The key rule is that the document stores authored values, while the editor selectively uses measured geometry for interaction, preview, and conversion.

### Supported authored value kinds

| Field | Allowed authored forms | Notes |
|---|---|---|
| `x`, `y` | `px` | Position values are currently pixel-only. |
| `width` | unit value, `fit-content`, `min-content`, `max-content` | Width keywords are preserved in both the stage and the site renderer. |
| `height` | unit value, `auto`, `aspect-ratio(...)` | `aspect-ratio(...)` remains a width-derived height mode. |

### Resolution principles

- Authored values remain the source of truth for persisted document geometry.
- Runtime measurement is used where the editor needs live layout: selection boxes, sticky tracks, snapping, drag geometry, and intrinsic sizing.
- The stage and site renderer share the same presentation semantics; the stage should not invent component visuals that are not present in node state.
- Insert-time defaults are written into the model when the node is created rather than being added later by the renderer.

### Wrapper sizing behavior

| Wrapper role | Authored explicit height renders as | Resize behavior | Notes |
|---|---|---|---|
| `section`, `header`, `footer` | `contentWrapper` minimum height | bottom-only structural resize | Wrappers can still grow beyond the authored minimum from child geometry and sticky extents. |
| `container` | actual `contentWrapper` height | regular wrapper resize behavior | Visual surfaces and edit geometry stay aligned to the authored box. |

Additional rules:

- Auto-height wrapper mesh layout is recalculated from current children and sticky extents instead of preserving stale measured wrapper height.
- Wrapper resize start measurement uses the inner `contentWrapper` surface so border and padding styling do not feed back into authored geometry.
- Visible resize handles remain anchored to the outer wrapper shell so they align with bordered container surfaces.
- Top-level structural wrapper resizing computes its minimum height from child layout bottoms plus wrapper padding, allowing an explicit section height to shrink back down to content fit.

### Sticky guide coordinate space

- Stage overlay layers mirror `contentWrapper` padding so guide coordinates stay aligned with padded wrapper content.
- Sticky preview adds the editor shell inset when positioning sticky elements, while the guides themselves remain expressed in authored units.
- If a sticky node lives inside a padded wrapper, the visible offset guide becomes `offset + padding`:
  - the node-side segment represents the authored offset
  - the owner-side segment represents padding
- The padding segment uses a muted dotted treatment, and the `Padding` badge sits on the boundary between the padding and offset segments.
- The same additive padding treatment applies to top, bottom, and dual-edge sticky offset guides.

### Leaf authoring model

| Leaf kind | Content section | Style section(s) | Special semantics |
|---|---|---|---|
| `text` | body copy + HTML tag + optional link | `Text style`, `Design` | Editable HTML tag, optional destination |
| `link` | label + destination | `Text style`, `Design` | Add-rail shortcut for link-enabled block text |
| `image` | `src`, `alt` + optional link | `Design` | Unified border/radius/shadow surface |
| `button` | label + destination | `Text style`, `Design` | Can export as native button or styled anchor |

### Text leaf semantics

Text leaves store an editable HTML tag. Supported tags are `h1`-`h6`, `p`, `blockquote`, and `div`, and both the editor stage and site renderer use that tag when rendering the node.

Rules:

- Changing the tag updates semantics only.
- Renderer and stage styling normalize native tag defaults so browser heading and blockquote styles do not override authored styles.
- Standalone block text can be edited directly on the stage. The first plain click selects the block; a second plain click on the already selected block enters edit mode.
- Stage block editing keeps the node as `subtype: 'block'` and persists exactly one text block in `TextDocumentContent.blocks`.
- The floating stage toolbar for standalone blocks is inline-only: bold, italic, underline, strikethrough, link, font family, font weight, font size, text color, and highlight color.
- Block-level controls remain in the inspector for this phase: HTML tag, alignment, direction/RTL, language, and whole-block/default typography.
- Inspector typography controls show a mixed state when the text content contains inline overrides for that style type. Choosing an inspector value resets matching inline overrides while preserving unrelated inline styles and links.
- `Enter` and `Shift+Enter` both insert newline text inside the current block. The model does not add a `<br>` element; rendering preserves the soft break through `white-space: pre-wrap`.
- Outside click or `Cmd/Ctrl+Enter` commits the Slate state through `setTextDocumentContentDoc()`. `Escape` discards local Slate edits without mutating the document.
- Standalone lists can be edited directly on stage with the same first-click select, second-click edit lifecycle.
- Stage list editing keeps the node as `subtype: 'list'` and persists exactly one `ul` or `ol` block in `TextDocumentContent.blocks`.
- Standalone and rich-text list blocks share keyboard behavior: `Enter` creates a same-depth `li`, `Shift+Enter` inserts newline text in the current `li`, `Backspace` at item offset `0` merges into the previous item with a newline separator, and `Tab` / `Shift+Tab` change item `depth` only at item offset `0`.
- List item `depth` is item-level visual indentation, not recursive nested list schema. The direct children below `ul` / `ol` remain `li` items, and inline styling that spans item boundaries is split per item.
- Newline text inside a list item preserves indentation because it remains inside the same `li`.
- The floating stage toolbar for standalone lists is inline-only. List type, bullet/marker style, and ordered-list start remain inspector-owned block-level controls.
- Standalone code blocks can be edited directly on the stage with the same first-click select, second-click edit lifecycle. Code edit mode is a raw textarea-like editor, not Slate rich text.
- Stage code editing keeps the node as `subtype: 'code'` and persists exactly one `code-block` in `TextDocumentContent.blocks`.
- `Enter` and `Shift+Enter` insert newline text. `Tab` and `Shift+Tab` indent or unindent the current line or selected lines with literal tab characters; tab width is visual CSS `tab-size`, not text rewriting.
- Code wrap is inspector-owned presentation metadata. Wrapped code soft-wraps long lines; unwrapped code keeps literal text unchanged and exposes horizontal overflow with `overflow-x: auto`.
- The floating stage toolbar for code uses the common draggable toolbar chrome and is code-only: language plus `Auto` / `Light` / `Dark` theme. Bold, italic, color, link, and other rich inline controls are intentionally absent.
- `Auto` code theme follows the viewer's system color scheme through `prefers-color-scheme`; it does not follow the editor chrome theme. The on-stage code editor mirrors this user-facing behavior so editing and preview agree.
- Code style overrides sit above Prism highlighting and remain inspector-owned. The inspector exposes theme, tab width, typography/design overrides, and a code-focused mono font picker with a `More monospace fonts` entry into Manage Fonts.
- Seeded templates use semantic heading tags for primary titles:
  - the default post title is `h1`
  - the primary titles in the sticky demo sections are seeded as `h2`

### Link leaf behavior

Content and styling:

- Standalone block text exposes a `Link` toggle in `Content`; enabling it reveals the shared destination controls inline.
- The Add-rail `Link` entry inserts a block text node with `htmlTag: 'div'` and link authoring enabled by default.
- Newly enabled links default to the internal or anchor destination type.
- Link-enabled block text renders as block-level leaf content with `width: 100%`, so text alignment applies across the authored leaf frame.
- Link wrap defaults to `single-line`; enabling `Wrap` switches the link to multi-line wrapping.
- Standalone linked text renders and exports as semantic wrapper markup: `<Tag><a href="...">text</a></Tag>`.
- The Add-rail `Link` default therefore exports as `<div><a href="...">Read more</a></div>`.
- When a whole-node linked standalone block enters on-stage edit mode, the editor promotes the whole-node link to an inline rich-text link that wraps the current block text. On commit, the legacy node-level `link` is cleared so the edited block can hold multiple inline links without nested anchors. Button-like linked blocks keep their whole-node link behavior.

Destination behavior:

- `Anchor` destinations use an internal target picker populated from top-level `Top`, section, and `Bottom` targets.
- Exported anchor links resolve to same-page `#sectionId` hrefs against section wrapper DOM ids.
- `External link` destinations expose `href` and `Open in a new tab`.
- External links with `Open in a new tab` enabled render and export with `target="_blank"` plus `rel="noopener noreferrer"`.
- Anchor links ignore the new-tab toggle.

Broken anchor behavior:

- If an authored anchor target no longer exists, the selected link shows a compact dark-yellow `Broken anchor` annotation with a triangle-alert icon inline beside the `Section` picker label.
- Broken anchors are surfaced to the editor but are not auto-repaired.

### Image link behavior

- Images expose the same `Link` toggle and destination controls in `Content`.
- Linked images render and export as `<a href="..."><img ... /></a>`.
- Linked image placeholders use the same anchor wrapper pattern.

### Button leaf behavior

Content and styling:

- Buttons use the same destination model as links, with label plus an internal or external destination selector.
- Newly inserted buttons default to the external destination type.
- Buttons use the same typography controls as text, except HTML tag editing is omitted.
- Button `Design` exposes text color, background, unified border controls, box shadow, and block/inline padding.
- Button padding is edited as `Y` and `X` fields that serialize to `paddingBlock` and `paddingInline`.
- Button padding units support `px`, `em`, and `rem`.
- Button wrap defaults to `single-line`; enabling `Wrap` switches the button to multi-line wrapping.

Export behavior:

- Buttons without an `href` render and export as native `button` elements.
- Buttons with an external or anchor destination render and export as styled anchors so navigation behavior matches links.
- External buttons with `Open in a new tab` enabled render and export with `target="_blank"` plus `rel="noopener noreferrer"`.
- Anchor buttons ignore the new-tab toggle and resolve against section wrapper DOM ids in site/export output.
- Broken anchor buttons show the same compact selected `Broken anchor` annotation used by links.

### Typography picker behavior

Ordering and browsing:

- The family picker shows `Sans Serif` first, mapped to the browser or system sans-serif stack.
- Recent font selections appear next.
- A divider separates recent fonts from the full document-font list.
- Remaining document font families are sorted by:
  1. language or subset
  2. family name
- Each family renders in its own font for preview, using a single larger text line without subset or category helper text.
- Selecting a family keeps the family menu open with the current family still focused so keyboard traversal can continue.

Multi-select behavior:

- The same combined family-and-weight picker is used for both single-node and multi-select editing.
- While open, the picker keeps the family list order stable.
- The trigger previews the current weight directly on the family name instead of showing a separate weight label.
- When multi-select values differ, the trigger shows `Mixed` until a new family or weight is chosen.

Weight behavior and preview loading:

- The open picker marks the currently selected family and weight with a left-aligned check icon.
- Weight options show readable labels such as `Light`, `Normal`, and `Bold` while still authoring numeric values.
- Weight options preview in the currently selected family at their own weight.
- The weight picker authors numeric values from `100` to `900`.
- Variable families expose stepped weight options across their supported range.
- The bold button uses the same `400` / `800` toggle behavior as `Mod + B`.
- While the combined picker is open, it injects a lightweight preview stylesheet for visible families and all visible weights of the active family so weight previews do not wait for selection.
- The family picker exposes a manage-fonts icon button next to the family and weight controls.
- The size and line-height row uses the same total control width as the four style buttons below it.

## Font Management

Google Fonts support is split between a headless data layer and editor-facing document surfaces.

### Data layer responsibilities

- `src/fonts/` owns Google Fonts fetch and refresh tooling, bundled catalog loading, normalization, search, filtering, sorting, weight resolution, document font-library helpers, and Google CSS2 URL generation.
- Catalog filtering and sorting run locally against the bundled repository snapshot.
- Runtime and editor clients do not require a Google Fonts Developer API key; the key is only needed when refreshing the bundled catalog snapshot.
- Language filters map to Google `subsets`, but the UI groups them into human-readable buckets.
- Variable-font metadata is preserved even though variable-axis authoring UI is still deferred.

### Editor surfaces

| Surface | Behavior |
|---|---|
| `ManageFontsPanel` | Available both as a standalone dialog and inside Settings. |
| Browsing | Supports Google catalog pagination, search, language/category/favorite/used filters, and bundled-catalog timestamps. |
| Library management | Supports add, remove unused, favorite/unfavorite, and purge-unused operations. |
| Preview | Shows document-library previews inline and uses language-appropriate samples when possible. |
| Persistence | Keeps browse search and filter state in browser storage so the panel reopens in the same state. |

Detailed editor rules:

- Catalog browsing supports page sizes of `10`, `20`, or `50` families, with `10` as the default.
- The default language filter is `Western`.
- Grouped language filters such as `Western`, `Hebrew`, `Arabic`, `Cyrillic`, and `Other` are exposed instead of raw Google subset ids.
- Variable fonts are hidden by default while static-font flows are being debugged.
- Row metadata such as `category`, language, usage, and styles or variable state stays pinned opposite the preview so card height remains stable.
- Only the currently visible Google catalog page is preview-loaded so browsing remains responsive.

### Loading and export behavior

- The editor injects one shared Google Fonts stylesheet link for the current document font usage.
- Editor preview loading also includes document-library families so picker previews can render before those fonts are used on-canvas.
- The management panel injects a second preview stylesheet only for the currently visible catalog page and document-library families.
- Static families request only the numeric weights currently authored in the document.
- Variable families request the authored weight range from the family metadata.
- Google Fonts Developer API capability flags are sent as repeated `capability=` query parameters rather than as a comma-joined value.
- Google CSS2 family names are encoded through `URLSearchParams`; multi-word family names must not pre-replace spaces with `+` before serialization.

## Inspector Field Model

This section describes how compact editor controls author values without losing the original model shape.

### Shadow controls

- The inspector edits shadow `distance` and `angle`, but the document model continues to store `shadowOffsetX` and `shadowOffsetY`.
- `blur`, `spread`, and `distance` use compact fixed `px` suffixes.
- `angle` uses a `°` suffix and is edited on a `0..360` scale.
- When stored offsets are read back into the inspector, negative `atan2()` results are normalized into that positive range.
- Numeric fields keep a local draft while editing; clearing the field or typing an out-of-range value does not immediately commit to the model, and blur restores the last valid committed value.
- Text and link shadows render with `filter: drop-shadow(...)`.
- Wrapper, image, and button shadows render with `box-shadow`.
- A fully transparent shadow color suppresses shadow output instead of serializing a no-op declaration.
- Button shadows do not also receive a redundant filter shadow.

### Border editors

- Border color uses the shared advanced color picker.
- Border width renders as a fixed `px` field without a unit dropdown.
- Border radius uses an inline unit selector, supports `px` and `%`, and enforces a minimum of `0`.
- Border width preserves its implicit stored unit.
- Border radius preserves and edits its explicit `px` or `%` unit.
- Authored `0` border widths and `0` border radii suppress rendered border and radius CSS instead of serializing explicit zero-value declarations.
- Wrapper, image, and button border surfaces use `box-sizing: border-box`, and bordered fills are clipped to `padding-box` so the border reads as an outer stroke.

### Geometry editors

| Control | Behavior |
|---|---|
| `X`, `Y` | Fixed `px` fields with static suffixes. |
| Structural wrapper `X`, `Y` | Hidden for `section`, `header`, and `footer` because those positions are structural. |
| Wrapper padding | Exposed directly in `Layout` for `section`, `header`, `footer`, and `container` using four unit-selectable spacing inputs. |
| `Width`, `Height` | Shared composite shell with value segment plus unit-or-mode segment. |
| Width modes | Numeric `px` / `%`, plus `fit-content`, `min-content`, `max-content`. |
| Non-section height modes | Numeric `px` / `%`, plus `auto` and `aspect-ratio(...)`. |
| Section height modes | Numeric `px`, `%`, `vh`, `vmin`, `vmax`, plus `auto` and `aspect-ratio(...)` where supported by the authored model. |

Additional geometry rules:

- Wrapper padding supports `px`, `em`, and `rem`, and unit switching measures the live rendered padding edge before converting so the visible inset stays stable.
- `Height: aspect-ratio(...)` stays in the shared shell but uses a freeform value segment that accepts either a positive number or a simple ratio expression like `16/9`.
- `vw` is intentionally excluded from section-height editing because the current stage is not iframe-backed and cannot provide true stage-relative viewport semantics.
- Numeric geometry fields enforce a minimum of `0` on width and height.
- For wrapper nodes with role `section`, `header`, or `footer`, the width control is hidden in the geometry grid while its slot stays reserved so the 2x2 layout remains visually stable.

### Shared composite field behavior

- Composite numeric fields use a single shared shell rather than separate bordered sub-controls.
- Shared controlled `Input` fields keep a local draft while focused so users can temporarily clear or type an invalid value without losing the text immediately.
- Editor chrome controls use the shared compact 28px density for buttons, icon buttons, inputs, selects, searchable selects, searchable multi-selects, number/unit fields, and color swatches; non-control layout geometry and rendered site content keep their own sizing.
- If validation rejects the draft, blur restores the last committed external value.
- `ValueWithUnit` owns the continuous outer border, shared `focus-within` treatment, and mixed-selection dashed styling.
- The active inner input or unit segment gets an accent-colored inner border instead of its own separate focus ring.
- Suggestion-enabled value fields switch to a validated text input with decimal-keyboard hints so the shared popup can use one styled combobox surface.
- Suggestion-enabled value fields use a styled listbox popup instead of layering browser `datalist` UI under editor chrome.
- The font-size suggestion list uses the same hover highlight treatment as other editor menus, slightly taller rows, a `72px` preset, and an internal scrollbar.
- In higher-contrast palettes, compact numeric values render at `12px` minimum and suffixes or modes at `11px` minimum.
- Numeric field displays are capped to two decimal places and trim trailing zeroes.

### Unit conversion rules

- When switching between supported numeric units, or from a keyword sizing mode into a numeric unit, the inspector measures live rendered stage geometry and rewrites the numeric value through shared conversion helpers.
- The goal is to preserve the rendered size or position rather than merely swapping suffixes.
- Section-height viewport conversion resolves against the visible `.stage-shell` content area after editor chrome and stage padding, not the raw browser window.
- `vmin` and `vmax` conversion use the smaller or larger dimension of that editor viewport.
- Font size (`px` / `em` / `rem`), wrapper padding (`px` / `em` / `rem`), button padding (`px` / `em` / `rem`), and border radius (`px` / `%`) all use the same measured-reference conversion path.
- Font-relative units resolve from computed font size.
- Border radius uses an average-dimension approximation when converting between pixels and percentages.
- Wrapper, image, and button box-shadow controls expose `blur`, `spread`, `distance`, and `angle`; text and link shadows stay filter-based and therefore do not expose spread.
- When converting spacing back to `px`, the committed pixel value is rounded to a whole number.
- If a control cannot obtain a trustworthy live reference, the authored value stays unchanged instead of being approximated from hidden fallback sizes.
- Committed values still serialize back to the existing model strings such as `320px`, `fit-content`, `auto`, and `aspect-ratio(16/9)`.
- Width and height edits stay isolated per axis:
  - changing one axis preserves the other axis as-authored, including keywords and non-pixel units
  - `%` converts to concrete pixels when that axis itself is explicitly resized
  - untouched keyword axes stay authored as keywords

### Selection overlays and known limitation

- When a `section`, `header`, `footer`, or `container` is selected, or when any descendant inside it is selected, the stage draws a thin dashed accent-blue rectangle at the inner content boundary of that wrapper's padding box.
- The overlay is purely visual and exists to show where the `contentWrapper` padding starts and ends while editing nested content.
- Deferred limitation: child `height: %` conversion inside `section`, `header`, and `footer` wrappers remains intentionally unresolved. Those wrappers still render explicit authored height as `min-height` for editor growth behavior, so inspector conversion does not yet reinterpret that box as a reliable `%` height reference.

### Tooltip behavior

- When no tooltip is open, hovering a trigger waits `200ms` before opening.
- Leaving before that delay cancels the open.
- Entering another trigger while no tooltip is open starts a fresh `200ms` wait.
- Once a tooltip is visible, leaving its trigger closes it immediately.
- After a visible tooltip closes, the next `200ms` acts as a grace period:
  - entering the same or another trigger during that window opens immediately
  - after the grace period ends, hover-open returns to the normal `200ms` delay
- Keyboard focus opens tooltips immediately.
- Shortcut hints inside tooltips render as a secondary monospace line with lower contrast than the main label.

### Typed storage model

Internally, parsed values are stored as plain app data shaped like `CSSUnitValue`, not as browser Typed OM objects.

## Sticky Model

Sticky can be authored on leaves, wrappers, and wrapper content wrappers, but the editor exposes that capability selectively depending on node type.

### Where sticky can be applied

| Node kind | Supported target(s) | Notes |
|---|---|---|
| leaf | `self` | Leaves do not expose `contentWrapper`. |
| wrapper | `self`, `contentWrapper` | `contentWrapper` support is retained in the model even when the UI hides it. |

### Sticky definition shape

| Field | Allowed values | Notes |
|---|---|---|
| `enabled` | boolean | Master on/off toggle. |
| `target` | `self`, `contentWrapper` | Determines which box receives sticky positioning. |
| `edge` | `top`, `bottom`, `both` | Backed by `edges.top` / `edges.bottom` in the model. |
| `offsetTop`, `offsetBottom` | unit values | Express sticky inset from the viewport edge. |
| `duration` | unit value | Legacy single-duration field. |
| `durationTop`, `durationBottom` | unit values | Split duration fields for top and bottom travel. |
| `durationMode` | `auto`, `custom` | `auto` derives travel distance from available space. |
| `elevated` | boolean | Per-node elevation override; only meaningful when `siteNode.stickyElevation` is `false`. |

### Sticky elevation

Elevation controls whether sticky elements render above page content using `z-index`.

There are two levels:

- **Global elevation** (`siteNode.stickyElevation`): when `undefined` or `true`, all sticky elements are elevated. When `false`, per-node elevation controls take effect.
- **Per-node elevation** (`StickyDefinition.elevated`): only applied when global elevation is `false`. When `true`, that sticky node is individually elevated; otherwise it is not.

The inspector exposes:

- An **Elevation** toggle (global switch) available in every sticky section. Toggling it calls `setSiteNodeStickyElevation` on the document and dispatches `stickyElevation`.
- An **Elevate this node** toggle that appears below the global switch only when global elevation is off. It dispatches `stickyElevated` and sets `elevated` on the node's sticky definition.

In multi-select mode the per-node switch uses the shared mixed-state pattern (neutral weak-bordered track and dashed thumb border) when selected nodes have differing `elevated` values.

### Current editor controls

- Duration slider: `0vh` to `400vh` in `25vh` steps.
- Offset slider: `0vh` to `100vh`.
- When edge is `both`, the inspector uses a dual-knob offset range slider and separate top and bottom duration sliders.
- For wrappers, sticky `target` is hidden in the UI; wrapper sticky is presented as self-targeted even though internal `contentWrapper` support remains in the model for future enablement.
- Elevation toggle is always visible when sticky is enabled. Per-node elevation appears only when global elevation is off.

Defaults:

- edge: `top`
- offset: `0`
- duration: `50vh`
- global elevation: `true` (all stickies elevated)

## Spacer Model

Spacers are real structural elements.

### Core rules

- For `target=self`, the sticky element lives in a sticky track:
  - element first
  - spacer immediately after it
- For `target=contentWrapper`, a real flow spacer after the content wrapper extends the parent.
- Spacer visuals can be shown or hidden in the editor.
- Offset is visualized separately from duration.

### Overlap and extent resolution

- Multiple sticky spacers in one section can overlap in vertical range.
- Spacer extents do not add together.
- The final section height is determined by the spacer whose end reaches furthest down.

### Auto-duration behavior in preview

For self-target sticky guides in the editor preview, `durationMode=auto` uses the actual free space around the sticky node inside the owner's padded content box:

- top-edge auto uses the free space below the node
- bottom-edge auto uses the free space above the node
- both-edge auto renders those two guide heights independently instead of mirroring one distance to both sides

### Container-specific behavior

- `target=self` applies sticky positioning to the container wrapper itself.
- `target=contentWrapper` applies sticky positioning to the internal content wrapper.
- When nested container `contentWrapper` sticky adds extra extent, parent mesh sizing includes that extent so scroll range and sticky duration stay consistent.

## Site Rendering

`src/site/SiteRenderer.tsx` is the canonical site/runtime renderer boundary for non-editor output.

### Renderer boundary

- The site renderer is detached from editor interactions such as drag, resize, selection, and diagnostics.
- It renders semantic wrapper tags (`header`, `section`, `footer`, `div`) plus the authored leaf tags and content.
- It preserves authored width keywords and text HTML tags.
- It uses the same mesh-grid child placement baseline as the editor stage instead of falling back to absolute-position export.
- It carries the renderer's default presentation layer for text, links, buttons, and images into exported CSS, then layers authored model values on top.

### Sizing and sticky export behavior

- Authored explicit wrapper and content sizing is preserved in export:
  - `section`, `header`, and `footer` keep authored `min-height`
  - `container` keeps authored fixed `height`
  - short wrappers do not receive an extra generic height floor
- Sticky structure exports as real spacer-backed DOM:
  - `target=self`: sticky track plus edge-aware spacer ordering plus sticky node
  - `target=contentWrapper`: wrapper plus sticky content wrapper plus flow spacer
- Custom sticky durations export as authored CSS lengths.
- `durationMode=auto` exports no synthetic measured spacer extent because site export is model-driven and does not depend on runtime DOM measurement.
- `target=self` with `durationMode=auto` exports sticky directly on the node or wrapper without a synthetic track wrapper, matching the editor stage baseline.

### Multi-page export

- `renderSiteExportBundles(document, options)` generates canonical page bundles plus alias redirect stubs where needed.
- `outputStructure` option determines file naming:
  - `'directory'`: each page gets its own directory with `index.html` (e.g., `about/index.html`)
  - `'flat'`: all pages are HTML files in the root (e.g., `about.html`)
- Home page always exports as `index.html`
- Home system/manual aliases export as redirect routes to the canonical URL, with generated host configs for Netlify, Vercel, and Nginx and HTML redirect stubs as static fallback
- Nested pages include their full URL path in the filename (e.g., `parent/child/index.html`)

### Programmatic export surface

| Export | Purpose |
|---|---|
| `renderSiteBodyHtml(document)` | Renders the site `<body>` HTML. |
| `renderSiteCss(document)` | Renders the generated site CSS. |
| `renderSiteHtmlDocument(document)` | Renders a complete standalone HTML document. |
| `renderSiteExportBundle(document)` | Returns the full export bundle used by ZIP and site export. |
| `renderSiteExportBundles(document, options)` | Returns export bundles for all pages with configurable output structure. |
| `buildRouteManifest(document, options)` | Builds a manifest mapping page slugs to file paths and URLs. Respects `outputStructure` ('directory' or 'flat') from options. |
| `buildHostingConfigs(document, options)` | Returns a `Record<string, string>` of hosting config files (Netlify `_redirects`, Vercel `vercel.json`, Nginx `nginx.conf`, and a README) keyed by their ZIP path under `hosting/`. Content adapts to `outputStructure`. |

## Preview Model

The preview surface allows viewing the rendered site at full width without editor controls.

### Preview mode activation

- `?mode=preview` URL parameter opens preview mode
- Preview-mode tab label displays the current page name
- Floating "Back to Editor" button returns to the editor UI
- Preview renders the full multi-page site with navigation
- Sticky behavior is CSS-native in preview as in the editor

### Preview rendering

- Sticky movement in preview is CSS-native.
- `?mode=preview` injects the same generated site CSS and document font stylesheet that site export uses, so preview layout and typography match exported output.
- Sticky layering uses one shared low z-index baseline across the editor stage and exported site rather than renderer-specific stacks.
- Editor-only layering still prefers DOM order and local stacking contexts first; explicit layers are limited to a small named stack for selected nodes, sticky labels, and resize handles.

### Sticky preview behavior

- Bottom-edge self sticky uses inverted track spacer ordering (spacer before node) so viewport pinning remains stable during scroll.
- For `edges: both`, preview applies both sticky constraints together and uses split offsets (`offsetTop`, `offsetBottom`).
- For `edges: both`, visual guides render top and bottom offsets together, and distance guides render both top and bottom tracks together.
- Wrapper `target=self` sticky uses the same sticky-track/spacer pattern as leaf components for custom durations, including bottom-edge spacer ordering.
- Wrapper `target=self` sticky also renders `Distance: auto` indicators in preview, including top/bottom labeling in `edges: both`.
- For single-edge `target=self` auto duration, preview renders exactly one distance guide on the active travel side rather than dual top/bottom guides.
- In the editor stage only, sticky offsets are compensated against stage-shell top and bottom breathing space so authored `top` and `bottom` offsets pin to the visible stage frame rather than outer scroll-shell padding.

### Structural wrapper special cases

- Top-level wrappers (`section`, `header`, `footer`) treat `target=self` as an auto-only preview mode.
- They keep offset indicators, show `Distance: auto`, and do not render synthetic custom-distance track shells.
- In the inspector, those same wrappers treat duration as fixed auto mode:
  - `Auto` remains selected and non-changeable
  - `Custom` is hidden
  - helper copy reads `Uses the page height as the sticky distance.`

### What stays CSS-native

JavaScript is used for:

- dragging
- resizing
- rebuilding editor structure

JavaScript is not used for live sticky movement during scroll.

## Animation Model

Animations are configured hierarchically and can inherit accessibility behavior from the document, from a trigger family, or from the individual animated node.

### Scope and inheritance

- `DocumentModel.animationSettings` provides global animation defaults.
- Per-trigger settings override those global defaults for one trigger family.
- Per-animation settings override both the global defaults and the trigger-level defaults.
- `SiteNode` does not support animation.

### Supported animated node types

| Node type | Supports `animation` |
|---|---|
| `WrapperNode` (`section`, `header`, `footer`, `container`) | yes |
| `TextLeaf` | yes |
| `ImageLeaf` | yes |
| `LinkLeaf` | yes |
| `ButtonLeaf` | yes |
| `SiteNode` | no |

### Trigger families

| Trigger | Runtime meaning | Notes |
|---|---|---|
| `entrance` | view-enter animation | Plays when the element enters the viewport. |
| `ongoing` | looping in-view animation | Uses `viewEnter` with looping behavior. |
| `scroll` | scroll-progress animation | Driven by `viewProgress`. |
| `click` / `activate` | activation-driven animation | Canonicalizes to `activate` in Interact config. |
| `hover` / `interest` | hover or interest animation | Canonicalizes to `interest`; supports `outAction`. |
| `mouse` | pointer-move animation | Driven by pointer movement. |

Trigger types have preset constraints; keyframe effects bypass those preset-category constraints and work with any trigger type.

### Effect Types

- Named effects wrap `@wix/motion-presets` types with a local `kind: 'named'` discriminant.
- Keyframe effects are unrestricted CSS keyframe definitions and are not limited by preset category.

### Trigger and Target Separation

A `triggerId` field allows one node to trigger while another animates:

- `triggerId` references the node that owns the trigger gesture
- if omitted, the animated node triggers itself

### Hover Behavior

| `outAction` | Interact mode | Result |
|---|---|---|
| `reverse` | `{ type: 'alternate' }` | Enter plays forward and leave reverses. |
| `keep` | `{ type: 'state' }` | Hover behaves like play/pause. |
| `none` | `{ type: 'repeat' }` | Hover-out cancels and resets. |

Additional hover rules:

- `outAction` is supported for hover entrance, hover ongoing, and hover keyframe animations.
- Hover reverse effects emit `fill: 'both'` so alternate enter and leave hold the active state correctly.
- Hover `keep` and `none` omit `fill`, matching Interact's native `state` and `repeat` behavior.
- Hover ongoing named presets with `outAction: 'keep'` emit `iterations: Infinity` so they can resume naturally.
- When `outAction` is omitted, hover defaults to `'reverse'`.

### Sticky Requirement

`requiresSticky` marks an animation that depends on the sticky subsystem being active. Such animations do not behave correctly if sticky is disabled on the document.

### Site Export

Exported HTML includes:

- `data-interact-key` attributes on animated nodes and trigger nodes for runtime hookup
- `@wix/interact` script injection for exported playback
- `collectInteractKeys()` to gather interact keys from the document

### Development Console

In DEV mode, `window.playgroundAnimationApi` is available for testing and debugging animation state without going through the editor UI.

### Animation Editor UI

The animation inspector section appears in the behavior bucket of all animatable node types (wrappers, text, image, link, button).

**Inspector controls:**

- Enable/disable toggle with Rocket icon
- Trigger type selector (entrance, ongoing, scroll, click, hover, mouse) with smart defaults per trigger
- Searchable preset picker populated from `getPresetsForTrigger()`, with "Entrance"/"Loop" group headers for click and hover triggers
- Dynamic preset parameter controls generated from `getPresetParams()` schema (enum selects, number inputs, boolean switches)
- Timing options (duration, delay) with ms unit — visible for entrance, ongoing, click, hover triggers
- Easing selector with 28 named easings (Penner set) from `@wix/motion`, grouped by family — visible for entrance, ongoing, click, hover triggers
- Iterations and alternate controls — visible only for ongoing trigger
- Number params with defined min/max use a slider control with toggle to number input (`SliderNumberField`)
- Hover out-action selector (reverse/keep/none) — visible only for hover/interest triggers
- Requires-sticky toggle — visible only for scroll triggers, with warning when sticky is disabled
- Reduced-motion toggle (per-animation disable)

**Focused mode:** Animation has a dedicated focused mode (`'animation'`) accessible from the inspector section header, following the same pattern as sticky focused mode.

**On-stage indicators:**

- Selection frame: Rocket badge icon on selected animated nodes (alongside Pin for sticky, Layers2 for elevated)
- Layers panel: Rocket icon on animated node rows

**Preset metadata:** Human-readable labels and descriptions for all 64 presets and 6 trigger types in `src/animations/presetMetadata.ts`, accessible via `getPresetLabel()` and `getTriggerLabel()`.

### FormField Layout Modes

Inspector field layout is formalized through the `FormField` component's `layout` prop:

- `stack` (default): label above, control fills width
- `inline`: label left, control right, justify-between — used for most animation controls
- `inline-start`: label left, control immediately after
- `inline-group`: label left, group of controls right

Inspector adoption rules:

- Prefer `FormField layout=...` for true label/control rows across single-selection, multi-selection, and page inspector surfaces.
- Keep dense composite controls custom when they are not semantically one field row, including `X/Y/W/H` groups, padding matrices, reorder/alignment clusters, and border/shadow control assemblies.
- Use `inline-group` only when several controls still represent one labeled field, such as a divider width + color row.

See [EDITOR_STYLE_GUIDE.md section 13.2](./EDITOR_STYLE_GUIDE.md) for usage rules.

## Editor UX

The editor surface is organized around one stage, a small set of persistent rails and panels, and a handful of modal or popover-based global tools.

### Page switching and management

The editor supports multi-page management with three UI entry points:

1. **Dedicated Pages panel**: a draggable floating page-management panel with a persistent page tree on the left and `Page` / `Settings` view toggles for the right column
2. **Inspector no-selection state**: when no node is selected, inspector shows the current page editor with direct actions for page settings and the full pages panel
3. **Top-bar pages dropdown**: a centered page switcher in the main top bar for quick page switching and `New page`

Page switching behavior:

- `activePageId` in editor state determines which page's sections appear on the stage
- Clicking a page in the UI updates `activePageId` and re-renders the stage
- Page switching preserves undo/redo history (history is per-document, not per-page)
- Stage always shows the active page's sections plus shared header/footer

Page settings:

- The Pages panel uses a persistent two-column layout:
  - left column: page tree with expand/collapse and reorder/reparent drag behavior
  - right column: either embedded page editor content for the selected page or the site-wide page settings view
  - the panel is narrower than the general settings dialog and keeps the site-settings tab content in a constrained form column instead of stretching rows across the full panel width
- The embedded page editor handles displayName, slug, slug aliases, page language, visibility, transition, and parent-page selection
- `autoSyncSlugs` site setting controls automatic slug generation during renames
- Slug conflicts are validated; pending slug changes show a warning banner
- Pages support slug aliases for redirect support
- Creating a page with an existing name or slug auto-increments both values; alias collisions are treated as slug collisions too
- The no-selection inspector page editor supports inline slug editing, direct parent-page selection, and page language
- Inspector `Page settings` deep-links to the Pages panel `Page` tab with the current page selected
- The Pages panel `Settings` view contains only site-wide page settings; export controls are not duplicated there
- Clicking a page row or `Add page` always returns the right column to the `Page` view

Follow-link popups:

- When a link node with `linkType: 'page'` is selected, a "Follow link" popup appears
- Clicking the popup navigates to the target page in the editor
- The popup shows the target page name and target anchor (if specified)

Link validation:

- `Import / Export` contains the canonical **Validate links** action, broken-link count, per-node detail rows, and clipboard copy support
- Slug-editing surfaces also expose a contextual `Validate links` action that opens `Import / Export` and runs validation

Language behavior:

- Site settings store the default document language in `siteSettings.lang`; the default is `en-US`
- Pages may set `page.lang`, or leave it `undefined` to mean `Site language`
- Text leaves may set `lang`, or leave it `undefined` to mean `Site language`
- Text leaves do not inherit page language in this model; an unset text-leaf language always resolves to the site language
- Site, page, and text language selectors all use the standard searchable language list from `src/i18n/languages.json`
- Searchable language dropdowns clamp within the viewport and flip above their trigger when there is not enough room below

### Workspace model

- The editor presents a full-stage canvas plus an insert panel and a collapsible inspector rail.
- Focused mode is an editor-only workspace state; the first focused mode is `sticky`.
- The focused floating panel is detached from the inspector collapsed or open preference.
- That floating panel can be dragged by its title area and is clamped against the window viewport below the top bar rather than against the stage.
- Its default resting position still aligns with the pre-viewport workspace edge near the collapsed inspector.
- Focused-panel offset persists as editor UI state and does not enter undo history.
- Intentional editor scroll containers such as the stage shell, inspector lists, focused-mode scrollers, settings body, and section-template popover use one shared guttered auto-hide scrollbar treatment.

### Settings and global panels

- The settings panel is centered, scrollable, and uses sticky left anchor links for `UI`, `Pages`, `Defaults`, `Fonts`, `Import / Export`, `Advanced`, and `Shortcuts`.
- Left-rail primary entries expose Components and Pages directly below the insert tools.
- Left-rail quick actions expose hidden ghosts, sticky preview, spacer visibility, and snap-to-guides.
- `Show Hidden` is enabled by default and is also exposed in Settings → `UI`.
- The top bar uses a single-row application layout:
  - the left side uses a traditional menubar with `Settings`, `Edit`, `View`, and `Help`
  - the current-page switcher sits centered in the same row and uses the shared page-switcher select component
  - the right side keeps standalone `Undo`, `Redo`, and `Preview` actions
- Menubar behavior follows desktop application conventions:
  - the first top-level menu opens on click
  - once one top-level menu is open, hovering a sibling trigger switches to that menu
  - the open menu chain stays active until an item is chosen, `Esc` is pressed, or an outside click occurs
  - nested submenus open on hover/focus and overlap their parent menu slightly so there is no dead hover gap
- `Settings` menu routes to `Import JSON`, `Export JSON`, `Export site`, and deep-links into `UI`, `Defaults`, `Fonts`, and `Advanced`
- `Edit` menu exposes undo/redo plus placeholder copy/duplicate/paste entries and contextual delete
- `View` menu exposes grouped theme selection, preview/grid/debug toggles, snap toggle-plus-more, focus mode, and panel shortcuts for Components and Pages
- `Help` menu opens detached `Shortcuts`, documentation browsing, the design-system showcase, and a detached `About` panel
- Design system showcase section jumps from the left navigation scroll only the main showcase pane and keep the top bar/back-to-editor affordance visible.
- Preview mode button (`?mode=preview`) opens the full-width preview in a new tab/window.
- Pages panel entry toggles a dedicated panel for multi-page management.
- The main Settings panel `Pages` section reuses the same site-wide page settings content as the Pages panel `Settings` tab.
- Editor popups, panels, dialogs, and tooltips use the native CSS Popover API so they render in the browser top layer.
- Left-rail pop panels open from a shared resting position near the top-left workspace edge below the top bar rather than vertically following the trigger button.
- Section templates keep outside-click and `Esc` dismissal and stay above stage selection overlays.
- The Components panel stays open on outside click and closes only through its own close affordance, toggle action, or keyboard dismissal.

### Theme, palette, and accent controls

| Control | Values | Notes |
|---|---|---|
| Theme mode | `Light`, `Dark`, `Auto` | Global editor shell mode. |
| Light palettes | `Air`, `Paper`, `Midday`, `Clarity` | `Midday` is accent-derived; `Clarity` is higher-contrast. |
| Dark palettes | `Graphite`, `Monokai`, `Midnight`, `Ink` | `Monokai` resets accent; `Ink` is higher-contrast. |
| Accent | preset swatches + custom picker | Drives selected, focused, checked, and active editor chrome. |
| Startup focused mode | `Normal`, `Sticky` | Affects initial editor load only. |

Additional rules:

- Each palette option in the dropdown includes a one-line description.
- The design system showcase reuses the same shared theme and accent controls as the editor settings UI so palette and accent behavior stay in lockstep.
- `Midday` is the accent-derived light palette and pairs conceptually with `Midnight`.
- `Clarity` and `Ink` minimize decorative shadows and glows and use `2px` borders on form fields and interactive controls.
- Selecting `Paper` resets the shared editor accent to its warm default.
- Selecting `Monokai` resets the shared editor accent to its magenta default.
- Dark palettes keep neutral shells and use the accent on active chrome instead of tinting the full shell.
- Startup mode determines the focused mode on editor load; the previous session's transient focused-mode state does not override it.

### Help surfaces

Navigation model:

- `?` opens the detached `Shortcuts` dialog.
- `Help → Documentation` opens the documentation browser dialog with a collapsible left nav.
- `Help → About` opens a detached about dialog.
- The documentation browser root IA is `About`, `Keyboard shortcuts`, `Guides`, `Reference`, and `Developers`.
- `About` and `Keyboard shortcuts` remain top-level browseable surfaces even though they also have detached dialogs.
- Opening the documentation browser without an explicit entry target defaults to `About`.
- `Guides` is the user-facing docs root for actual editor guidance and currently starts with `Getting Started`.
- `Reference` and `Developers` render as grouped menu headings with their second-level entries visible underneath.
- `Reference` is the stable reference root and starts with `Overview` plus `API Reference`.
- `Developers` is the development-facing root and starts with `Overview`; `How to add docs?` now lives under `Developers / Workflows`.
- Help-doc hierarchy, ordering, and visibility are configurable in the help-doc registry; unlisted `docs/*.md` files fall back under `Developers / Planning` as secondary items.
- Nav buttons do not show filenames. If a title contains a spaced dash separator (`-`, `–`, `—`), the text after the separator becomes the subtitle and the separator is hidden.
- The left nav can collapse into a slim rail with a single reopen control to widen the reading pane without leaving the current document.
- The document pane shows breadcrumbs above the active entry and a right-side in-page table of contents for markdown pages.

Documentation browser sourcing and rendering:

- Markdown help entries render the source filename in a compact status bar above the document pane rather than in the nav button.
- Markdown bodies are loaded from copied static files under `assets/help-docs/` instead of being embedded inline in the main app bundle.
- Docs assets under `docs/assets/` are copied into the same help-doc public asset tree and are available through relative markdown image references.
- Help entries support in-panel `#anchor` jumps, relative `.md` navigation, and moved-link aliases defined by the registry.
- Absolute filesystem links referenced by docs are rendered inertly.
- Markdown rendering uses a lazy-loaded React markdown pipeline with GFM tables, syntax-highlighted fenced code blocks, responsive images, and heading-derived table-of-contents data; help docs are expected to stay markdown-native instead of relying on raw HTML.
- The shortcut guide also appears as the last section inside settings.

State persistence:

- Closing the documentation browser preserves the last selected document.
- Reopening the documentation browser resets transient view state such as nav collapse, tree expansion, and in-document anchor position.

### Stage interaction

- The stage is one keyboard focus scope: `Tab` walks selectable nodes in DOM order, the current primary selection scrolls into view when needed, and arrow keys nudge positioned components.
- The stage suppresses native browser drag and drop plus text-selection drag initiation so component moves always route through the editor drag system.
- Pointer selection does not commit drag or reparent work until the pointer moves beyond click jitter, so repeated clicks on auto-sized content do not trigger drag remeasurement.
- Intrinsic-height leaf nodes align to the start of their mesh slot instead of stretching to the full row span, so text selection boxes hug rendered copy.
- Auto-height wrapper sizing in the stage is measured from the inner content box so dragging or repositioning selected nodes does not inflate surrounding header or section height through wrapper borders.
- Single-selection inside a section keeps the node as the primary target but also marks the owning section border box, while the section padding guide continues to show authored padding bounds.
- Button focus states use a stronger visible ring across editor controls.
- When `Show Hidden` is enabled, hidden nodes render on stage as editor-only ghosts with reduced opacity and a faint diagonal-stripe overlay while preserving their authored layout footprint.
- When `Show Hidden` is disabled, hidden nodes stay out of normal stage navigation and pointer targeting, but selecting them from Components reveals the selected hidden chain as ghosts for context.
- Hidden nodes that are not ghost-visible still participate in editor layout with `visibility:hidden` semantics so sibling geometry stays stable.

### Multi-selection

Selection rules:

- `Cmd/Ctrl + Click` or `Shift + Click` toggles node membership.
- The first selected node remains the primary or master selection unless removed.
- A plain second click on an already-selected node in a multi-selection collapses the selection back to just that node.
- Top-level structural wrappers with role `section`, `header`, or `footer` are single-select only and are removed from any attempted multi-selection set.
- Hidden selections are also single-select only; if a hidden node enters the selection, the selection collapses to that hidden node.

Supported operations:

- Dragging any already-selected node moves the current top-level multi-selection as one group and commits as one undoable action.
- Multi-selection suppresses per-node label pills, renders the outer group box with the same treatment as the single-selection outline, and downgrades member boxes to a `1px` outline with a subtle translucent fill.
- Resize handles are hidden whenever more than one node is selected.
- Dragging from empty stage space or from non-draggable top-level structural wrappers starts marquee selection.
- Grouped drag is supported in v1.
- Grouped resize and grouped reparent are not supported in v1.
- Single-step bulk edits still undo as one action even when they update multiple nodes.

### Inspector model

No-selection state:

- When no node is selected (stage is idle), the inspector shows the page inspector
- Page inspector allows creating new pages and switching between existing pages
- Current page is highlighted; clicking a page updates `activePageId`
- Page settings action opens the Pages panel on the `Page` tab with the current page selected

Single-node inspector:

- Inspector sections can expose a small top-right `Go to mode` entry button with a tooltip for `Layout`, `Sticky`, `Content`, and `Design`.
- Sticky-capable single-node inspectors place `Sticky behavior` immediately after `Layout`.
- `Content` is the standard content-editing section title across leaf inspectors.
- Text-bearing leaves split further into `Content`, `Text style`, and `Design`, while image uses `Content` and `Design`.
- Standalone block text keeps its editable HTML tag in `Content`; `Text style` remains typography-only.
- Top-level `section`, `header`, and `footer` wrappers keep the width field visible in the inspector, but the field is disabled when authored width is locked to `100%`.
- Link-enabled standalone text nodes show a follow-link popup when `linkType: 'page'` is selected, allowing navigation to the target page.
- Hidden selections keep `Layout` editable, including visibility controls, and disable all other inspector blocks.

Multi-select inspector:

- When multiple nodes are selected, the sidebar switches to a dedicated multi-select inspector instead of reusing single-node schemas.
- Multi-select controls use indeterminate visual states instead of rendering a literal `Mixed` label.
- Indeterminate values still commit to the compatible subset only when edited.
- Mixed wrapper and leaf bulk edits are dispatched as one reducer action so history captures them as one undoable step.

| Group | Scope | Notes |
|---|---|---|
| `Layout` | compatible selections | Align uses the first selected node as the anchor; distribution uses outermost selected items as endpoints. |
| `Reorder` | same-parent movable nodes | Section wrappers never participate; reorder preserves relative order. |
| `Text Merge` | same-parent standalone text nodes | Calls `mergeTextNodesToRichDoc()` and keeps the first selected node as the surviving anchor. |
| `Typography` | text, link, button | Shared typography controls. |
| `Text Design` | text, link, button | Shared foreground color and filter-shadow controls. |
| `Surface Design` | compatible surface nodes | Shared background, border radius, and box shadow. |
| `Sticky` | sticky-capable selections | Shared enabled, edge, offset, and duration controls. |

Naming and title behavior:

- Non-site single-node inspectors do not duplicate naming inside the inspector body; the sidebar chrome title itself is the editable node name surface.
- The sidebar title is keyboard-focusable, enters edit mode on click or keyboard activation, commits on `Enter` or focus leaving the input, cancels on `Escape`, and resolves an empty commit back to the component type label.
- Inspector ordering controls remain available as icon actions with tooltips.

### Focused modes

- Focused modes are mutually exclusive editor UI states; entering one closes any other active focused mode.
- Entering focused mode collapses the inspector automatically.
- Closing focused mode restores the inspector from its hidden state.
- When the inspector is collapsed, the right-rail opener can temporarily reopen it without changing the collapsed preference; while focused mode is active that temporary inspector closes on mouseout after a short delay.
- `Sticky` uses the `Sticky focus mode` tooltip, and the other focused-mode entry buttons follow the same `X focus mode` pattern.
- The floating focused-mode panel reuses the same inspector card chrome as the source section, fills the leading slot with component name plus type, and replaces the header action with the close button.
- Focused `Design` mode combines `Text style` and `Design` into one floating card for text, link, and button nodes; wrappers and images keep their existing `Design` card only.
- Sticky focused mode can render the shared multi-select sticky card when multiple nodes are selected.
- Hidden selections are layout-only in focused modes as well; non-layout focused modes show a message directing the user to unhide the node first.

### History, persistence, and reset

- Undo and redo remain in-memory incremental history operations.
- Editor UI and session state persist in `localStorage`.
- `Reset data` restores the factory document baseline and clears undo/redo while preserving editor UI preferences.
- `Reset all` also clears persisted editor UI and session state and restores the full editor baseline.

## Architecture Boundaries

| Layer | Owns | Must not depend on |
|---|---|---|
| `src/model/*` | types, units, defaults, selectors, validation | editor UI |
| `src/sticky/resolve.ts` | sticky resolution | React, DOM APIs |
| `src/api/*` | public document/editor/site operations | panel-level UI |
| `src/render/*` | shared layout and render-plan logic | editor-only overlays |
| `src/stage/*` | editor rendering and measurement | site export concerns |
| `src/site/*` | runtime and export rendering | editor interaction state |

### Domain layer

- `src/model/*` is the domain layer and has no editor UI concerns.
- `src/sticky/resolve.ts` accepts document data plus a renderer-provided geometry snapshot and returns sticky registrations and extra extent without depending on React or DOM APIs.

### API layer

- `src/api/documentApi.ts` provides editor-agnostic document operations for non-editor contexts such as scripts.
- Text field mutations are canonical in `src/api/documentApi.ts`; the editor mutation layer delegates to the same pure `setTextNodeContentDoc()` implementation instead of maintaining separate code paths for code styling or page-link fields.
- Text subtype conversion is also API-first: `convertTextNodeDoc()` owns the conversion policy, `switchTextSubtypeDoc()` is the thin entrypoint, and editor actions only choose the target subtype plus an optional conversion mode.
- Text subtype conversion preserves compatible typography and inline content: standalone block to rich keeps node style and rich inline children, while single-block rich to standalone block keeps compatible inline marks and links.
- Rich split and multi-node merge are also API-first: `splitRichTextNodeDoc()` and `mergeTextNodesToRichDoc()` live in the pure API layer, so conversion and merge semantics do not depend on editor-only selection or stage-edit code.
- Standalone block stage edits are API-first: the stage commits canonical `TextDocumentContent` through `setTextDocumentContentDoc()`, including inline marks, inline links, soft-break newline text, and the optional `clearBlockNodeLink` transition for promoted whole-node links.
- Standalone lists are also API-first: `setListContentDoc()` normalizes `ul`, `ol`, and `dl` payloads headlessly, validation walks per-item links, and renderers consume the normalized list model without relying on inspector-only formatting state.
- Shared rendering treats link and button presentation as block-only behavior; code and rich nodes do not inherit block link/button chrome even if malformed legacy fields are present.
- Code blocks own their theme surface in the pure API layer: unsupported languages normalize to `plaintext`, the `<pre>` wrapper carries the `language-*` class for Prism theming, and switching auto/light/dark reapplies theme-owned background and text colors unless the user has explicitly overridden them. `auto` follows the viewer's system color scheme through `prefers-color-scheme` in the editor, preview, and exported site CSS.
- Shared code-block rendering keeps authored leaf width on an outer wrapper while the visible code chrome stays on the inner `<pre><code>` surface. The code surface uses `white-space: pre-wrap` plus break-word wrapping, and standalone code nodes use only `box-shadow` for authored shadows instead of stacking a duplicate `filter: drop-shadow(...)`.
- `src/api/editorApi.ts` is the editor-facing API boundary used by app and panels; editor UI avoids direct imports from `src/model/*`.
- `src/api/siteApi.ts` exposes site/runtime rendering and export helpers without coupling them to editor UI.

### Shared render layer

- `src/render/layout.ts` owns the shared non-editor layout baseline for mesh-grid placement, wrapper sizing, and sticky-structure inputs.
- `src/render/renderPlan.ts` and `src/render/renderPlanHelpers.ts` own the shared render tree and traversal helpers.
- `src/render/leafPresentation.ts` owns shared leaf-content presentation defaults used by both editor stage rendering and site export.
- `src/render/nodePresentation.tsx` owns shared leaf semantics and shared text labels. Stage overlays and site rendering both consume the same text labeling and leaf element branching from this module.

### Editor renderer

- `src/stage/Stage.tsx` is an editor renderer.
- It measures live node geometry, renders the preview, publishes geometry upward for reuse, and owns editor-only visuals such as selection chrome, drag preview, snap guides, and sticky guides.
- Selection labels for text nodes read from the shared render label helper, so stage chrome reports the generic `Text` label while layers/editor iconography carries the block/code/rich/list distinction.
- Single-selection stage pills also render the shared node icon, so stage chrome and layers use the same subtype-aware visual language.

### Site renderer

- `src/site/SiteRenderer.tsx` and `src/site/siteExport.tsx` define the site/runtime renderer boundary.
- They consume the shared render plan plus the shared leaf renderer semantics from `src/render/nodePresentation.tsx`, but not editor-only preview visuals or editor interaction state.

### Editor-only UI state

- `src/editor/editorStore.ts` owns editor session state such as selection, panel UI flags, persistence keys, and undo-related app state usage.
- Focused-mode state (`focusedMode`, `startupFocusedMode`, `inspectorCollapsed`, `temporaryInspectorOpen`, `focusedPanelOffset`) remains editor UI state only and does not affect document semantics, sticky math, stage rendering, or site export behavior.
- `showHidden` is editor-only UI state; it changes stage ghost rendering and selection affordances but does not change exported site output.
- `focus-mode` URL overrides apply to editor UI initialization only. Supported values are `layout`, `sticky`, `content`, `design`, and `normal` / `none` for no focused mode.

## Text Type Picker

Adding a text node opens a text-type picker instead of inserting immediately.

### Insertion flow

- The picker opens from the left-rail `Text` add button.
- It renders as a compact left-side pop panel at the shared top-left resting position below the top bar.
- It shows five options in a vertical list: **Heading**, **Paragraph**, **List**, **Code**, **Rich text**.
- Clicking an option inserts the corresponding node and closes the picker.
- **Known gap**: the picker does not yet close on outside-click (no `useDismissFloatingPanels` integration for this panel).

### Text type options

| Option    | Inserted node | Default `htmlTag` | `subtype` |
| --------- | ------------- | ----------------- | --------- |
| Heading   | block text    | `h2`              | `block`   |
| Paragraph | block text    | `p` (default)     | `block`   |
| List      | standalone list | —               | `list`    |
| Code      | code text     | —                 | `code`    |
| Rich text | rich text     | —                 | `rich`    |

### Inspector subtype switcher

- The Content block in the text inspector shows a **Text / Rich / Code / List** segmented control above the content fields.
- In `Text` subtype, the same block also holds the editable HTML tag row beside the other content metadata.
- Switching subtype calls `switchTextSubtypeDoc()` and only passes the target subtype plus an optional conversion mode; the pure API still owns the conversion behavior.
- The control is visible for all standalone text nodes with `subtype` in `['block', 'rich', 'code', 'list']`.
- When converting a multi-block rich node to a non-rich subtype, the inspector opens a confirmation dialog that only selects the API mode:
  - `Flatten` calls `switchTextSubtypeDoc(..., { mode: 'flatten' })`
  - `Split into nodes` calls `switchTextSubtypeDoc(..., { mode: 'split' })`
- The segmented control uses the shared editor button chrome rather than a browser-native tablist.

### Conversion modes

- `auto`: use the default pure conversion rules for the requested target subtype.
- `flatten`: explicitly collapse unsupported structure into the simplest plain-text-compatible result.
- `split`: when converting away from `rich`, split the rich node into sibling text nodes by block boundary instead of flattening all blocks into one node.

## Markdown Import And Export

Text markdown import/export is headless and API-first.

### Baseline contract

- GFM is the baseline markdown contract.
- Parsing and serialization are still constrained to the supported text model subsets; the app does not persist arbitrary markdown AST shapes.
- The canonical pure entry points are `serializeTextNodeMarkdownDoc()` and `applyMarkdownToTextNodeDoc()`.

### Supported rich markdown subset

- Rich markdown import supports:
  - headings `#` through `######`
  - paragraphs
  - blockquotes
  - fenced code blocks
  - ordered lists
  - unordered lists
  - inline external links
  - inline bold and italic
- Unsupported markdown constructs degrade deterministically into paragraphs, flat lists, or raw code content rather than persisting unsupported structure.

### Subtype-specific behavior

- Rich nodes parse markdown into the validated rich Slate subset.
- Standalone block nodes preserve a single heading or blockquote when the markdown resolves to one compatible text block; otherwise they flatten to plain text with block boundaries as hard line breaks.
- Standalone list nodes preserve a single parsed `ul` / `ol`; mixed markdown flattens into unordered list items.
- Standalone code nodes preserve a single fenced code block, including its language info string; any other markdown pasted into code becomes raw code content with language `markdown`.

## Code Language Modes

- Standalone and rich code blocks support `plaintext`, `markdown`, and explicit Prism-backed languages.
- `markdown` means syntax-highlighted markdown source code, not parsed document markdown.

## Standalone List Text Nodes

Text nodes with `subtype: 'list'` are first-class document nodes, not rich-text formatting state.

### Canonical structure

- Standalone list nodes persist one canonical top-level list block inside `TextDocumentContent.blocks`.
- Supported canonical wrappers are `ul` and `ol`; recursive nested list blocks are not part of phase 2.0 P2-C.
- Per-item writing direction is supported via `direction: 'ltr' | 'rtl'`.
- Per-item links are supported.
- Inline styling, multiple links, and newline text are supported inside list item `children`.
- Item nesting is represented by `depth?: number` on each `list-item`, clamped to `0..8` with at most a one-level increase from the previous item. Renderers show `depth` as visual indentation on the `li` without emitting recursive nested lists.

### API and validation

- `setTextDocumentContentDoc()` is the canonical pure mutation for standalone list content; `setListContentDoc()` remains as a compatibility helper layered over it.
- Model normalization repairs malformed or missing list payloads into a default unordered list block.
- `validateDocument()` reports malformed list structures and broken per-item page / anchor links.
- Text conversion is deterministic:
  - `block -> list` splits hard line breaks into unordered items.
  - `code -> list` splits hard line breaks into unordered items.
  - `list -> code` emits one plain code line per item using item text only, without ordered or unordered markers.
  - `code -> rich` emits a rich `code-block`.
  - supported `ul` / `ol` lists convert to rich list blocks instead of flattening to paragraphs.
  - legacy `dl` payloads degrade deterministically during migration because canonical list storage is `ul` / `ol` only.

### Rendering

- Shared node presentation renders standalone canonical list nodes semantically as `<ul>` or `<ol>`.
- Ordered lists honor persisted `start` and marker style values.
- Default standalone and rich list presentation keeps the browser-standard outside marker position, but reserves internal list padding so bullets and numbering do not hang outside the node bounds on stage or in site output.
- Site export uses the same shared list rendering helpers as the stage/site presentation path.

### Inspector editing

- List nodes are editable in the inspector through canonical `TextDocumentContent` mutations, not through editor-only transient formatting state or a dedicated list-only reducer action.
- Phase 1.5 inspector editing is structured for `ul` and `ol`:
  - list type
  - bullet / ordered marker controls
  - ordered-list start
  - per-item add / reorder / remove
  - one inline text field per item
- List type, marker, and ordered-list start changes preserve canonical item children, inline marks, links, direction, and depth. Per-item text and bulk-edit controls remain plain-text editing surfaces and may flatten inline item content when explicitly used.
- The line-based textarea remains as an advanced bulk-edit / paste-import helper, not the primary editing surface.
- Per-item links and per-item direction are deferred from the standalone inspector to the later on-stage editing phase.

## Headless Split And Merge

The text system supports structure-changing operations without depending on editor UI.

### Rich split

- `splitRichTextNodeDoc()` accepts a `subtype: 'rich'` text node and splits it at rich block boundaries.
- A single rich block is converted in place to the matching standalone text node.
- Multiple rich blocks keep the original node id as the first split node and append additional sibling text nodes immediately after it.
- Rich text blocks split to standalone block nodes, rich `code-block` nodes split to standalone code nodes, and rich `ul` / `ol` blocks split to standalone list nodes.
- When a rich block originated from a standalone text node merge, split restores that node's canonical block content plus its standalone metadata snapshot instead of rebuilding it from flattened text.
- `convertTextNodeDoc(..., targetSubtype, { mode: 'split' })` on multi-block rich content splits first, then flattens each resulting block into the requested simple subtype for phase 1.5.

### Multi-node merge

- `mergeTextNodesToRichDoc()` merges sibling text nodes under the same parent into one rich node.
- Content order follows parent tree order, not the caller's selection order.
- The surviving node can be chosen explicitly so later editor multi-select flows can keep the first-selected node's geometry and identity.
- Standalone text merges preserve each source node's canonical block structure and attach a standalone snapshot so merge -> split round-trips keep per-block styling and restorable standalone data.
- Mixed-parent merge requests are rejected as no-ops.
- The multi-select inspector only offers the merge action when every selected node is a standalone text node under the same parent.

## Section Templates

Adding a section opens a section-template picker instead of inserting immediately.

### Insertion flow

- The picker opens from the left-rail `Section` add button.
- It renders as a compact left-side pop panel rather than a full-screen dialog.
- Its initial resting position matches the shared top-left left-rail panel placement below the top bar.
- It closes on outside click and `Esc`.
- It shows template cards in a two-column grid.
- Clicking an active template inserts one top-level section and selects it.
- With no relevant selection, inserted sections are placed before the footer when a footer exists.
- If the current selection is a top-level structural wrapper (`header`, `section`, `footer`), or any descendant inside one, the new section is inserted relative to that wrapper.
- The new section is inserted after the selected `header` or `section`.
- If the selected wrapper is the `footer`, the new section is inserted immediately before the footer.

### Template catalog

| Template | Default height | Purpose |
|---|---:|---|
| `Blank` | `50vh` | Empty section canvas for custom layout. |
| `Post` | `50vh` | Editorial starter with image, title, body, and link. |
| `Sticky Staggered Images` | `1820px` | Four sticky images with staggered anchors and shared timing. |
| `Sticky Pinned Cards` | `1760px` | Pinned lead column with progressive narrative cards. |
| `Sticky Media Reveal` | `1840px` | Pinned media with layered reveal backdrop and narrative blocks. |
| `Sticky Edge Lab` | `2480px` | Top/both/bottom sticky comparison section. |

### Typography pairings

- Default header/footer chrome and `Post`: `Playfair Display` headings with `Inter` body and link styles.
- `Sticky Staggered Images`: `Cormorant Garamond` headings with `Proza Libre` supporting copy.
- `Sticky Pinned Cards`: `Poppins` lead heading with `Open Sans` body cards and copy.
- `Sticky Media Reveal`: `Fraunces` heading with `Open Sans` narrative blocks.
- `Sticky Edge Lab`: `Montserrat` heading/card labels with `Crimson Text` explainer copy.

### Locked layout baselines

#### `Post`

- Keeps the editorial title/body/link stack at locked anchors: image `42/57`, title `546/57`, body `548/226.5`, link `549/350.40625`.
- Uses the seeded editorial typography pairing rather than a generic default layout.

#### `Sticky Staggered Images`

- Seeds a locked staggered-gallery structure.
- Image anchors are `64/256.96875`, `332/444.46875`, `610/653.25`, and `884/898.84375`.
- Image widths are `250`, `248`, `248`, and `208`.
- Each image keeps the same sticky timing: `150vh` duration and `15vh` offset.

#### `Sticky Pinned Cards`

- Seeds the locked pinned-cards baseline.
- Pinned lead sits at `85/212.28125` with width `392`.
- Lead copy sits at `83/490`.
- Lead sticky uses `durationMode=auto`, `220vh` duration, and `12vh` offset.
- Narrative cards shift left to `x=500`, use width `468`, and keep `25vh`, `25vh`, and `50vh` durations at `15vh` offset.

#### `Sticky Media Reveal`

- Uses direct sticky image leaves rather than wrapper containers around the media.
- Pinned media sits at `x=77`, `y=165`, size `401x428`, with sticky `duration=150vh` and `offsetTop=10vh`.
- Reveal backdrop sits at `x=78`, `y=167`, size `399x426`, with sticky `duration=25vh` and `offsetTop=10vh`.
- Narrative blocks are seeded at `y=313.640625`, `1035`, and `1687`.
- Section child order is locked as `heading -> pinned media -> narrative A/B/C -> reveal backdrop`.

#### `Sticky Edge Lab`

- Seeds a three-column top/both/bottom sticky comparison.
- Only the three sticky card texts are wrapped in colored `container` wrappers.
- Sticky settings live on those card containers:
  - top: `edges.top=true`, `offsetTop=10vh`, `durationTop=140vh`
  - both: `edges.top=true`, `edges.bottom=true`, `offsetTop=10vh`, `offsetBottom=10vh`, `durationTop=80vh`, `durationBottom=80vh`
  - bottom: `edges.bottom=true`, `offsetBottom=10vh`, `durationBottom=140vh`
- Baseline alignment is locked, including:
  - section height `2480px`
  - note `y` values `972`, `1293`, `1780`
  - sticky container anchors `72/362`, `420/761`, `770/1179.9921875`
  - right-column notes at `x=770` with width `320`
  - footer note at `x=96`, `y=2604.984375`

### Deferred templates

Future-facing placeholders for scroll-driven animation templates are visible but non-insertable.

## Default Seed Content

### Current factory seed

- redesigned project-focused header
- text-only header branding with no header image
- `Post` as the initial main section
- redesigned project-focused footer
- authored `Inter` defaults for inserted text, link, and button leaves

### Legacy upgrade behavior

- When loading persisted legacy starter documents, untouched old default header/footer shells are auto-upgraded in place to the baseline described here.
- When loading the untouched original starter document, the legacy single section with placeholder text and button content is replaced with the `Post` baseline described here.

## Validation Policy

Validation remains a UI-side concern.

- Invalid input is not written into the document model.
- This applies especially to parsed unit fields.

## Debugging Aids

| Area | Controls |
|---|---|
| Visuals | spacer visuals, offset visuals, accent-derived sticky distance/offset/padding/auto guide colors |
| Quick toggles | preview sticky, show spacers (`selected` or `all`), snap toggle in the left rail |
| Diagnostics | sticky diagnostics output resolved by the shared sticky resolver from measured stage geometry |
| Recovery / history | reset stage, clear undo history, undo step retention |
| Settings exposure | import/export controls, startup focused mode settings for `Normal`, `Layout`, `Sticky`, `Content`, and `Design` |

Additional notes:

- Preview and spacer quick toggles remain in the left rail.
- The snap toggle includes tooltip guidance for `Alt` drag inversion and the `Shift + G` shortcut.

### Show debug info toggle

**Location:** Settings → Display → "Show debug info" toggle (last toggle in the Display section)

When enabled, a compact "Debug" inspector card appears above the Layout section whenever a non-site node is selected. The card displays:

- **Identity:** `dataId`, `htmlId` (null shown as `—`), `family · role`, `parentId`
- **Geometry:** authored rect (`x/y/w/h` raw values), measured DOM bounds if available (`width×height @ (left, top)`)
- **Sticky:** (only when `sticky.enabled=true`) edges, target, duration mode, elevation state
- **Animation:** (only when `animation.enabled=true`) effect, trigger, requiresSticky flag

**Console logging:** When the debug info toggle is enabled, the following are logged to the browser console with color-coded prefixes:

- `[debug:add]` (green) — when a new node is added to the document
- `[debug:remove]` (red) — when a node is removed from the document
- `[debug:select]` (blue) — when the selected node changes, with a rect + sticky/animation summary
- `[debug:change]` (amber) — when the selected node's data changes, showing only the diff

**Persistence:** The `showDebugInfo` preference is persisted as a UI setting and survives page reload.

## Rich Text Content

Text nodes now store their content as `TextDocumentContent`, an app-owned, Slate-compatible
wrapper around canonical top-level blocks:

- `TextDocumentContent = { blocks, blockGap? }`
- `TextBlockContent`, `CodeBlockContent`, and `ListBlockContent`

These canonical types stay Slate-compatible. `RichContent` remains the block-array alias used by
shared render helpers, but persisted `TextNode.content` is now the wrapper for every text subtype.

### RichContent format

```typescript
type RichContent = RichBlock[]

type RichTextBlock = {
  type: 'paragraph' | 'div' | 'blockquote' | 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6'
  direction?: 'ltr' | 'rtl'
  lineHeight?: number
  children: RichInlineNode[]
}

type RichCodeBlock = {
  type: 'code-block'
  direction?: 'ltr' | 'rtl'
  language?: string
  theme?: 'auto' | 'light' | 'dark'
  highlightedHtml?: string
  children: Array<{
    type: 'code-line'
    children: RichTextLeaf[]
  }>
}

type RichListBlock = {
  type: 'ul' | 'ol'
  direction?: 'ltr' | 'rtl'
  markerStyle?: string
  start?: number // ol only
  children: Array<{
    type: 'list-item'
    children: RichInlineNode[]
  }>
}

type RichBlock = RichTextBlock | RichCodeBlock | RichListBlock

// Plain text leaf — text plus optional mark flags
type RichTextLeaf = {
  text: string
  bold?: boolean
  italic?: boolean
  color?: string
  fontFamily?: string
  fontSize?: string
  fontWeight?: number
}

// Inline link — wraps a list of leaves
type RichTextLink = {
  type: 'link'
  children: RichTextLeaf[]
  linkType: 'external' | 'page' | 'anchor'
  href?: string
  targetPageId?: string
  pageAnchorId?: string
  anchorTargetId?: string
  openInNewTab?: boolean
}
```

Rules:

- Rich roots must be block arrays only; free inline root text is invalid.
- Supported root blocks are non-list text blocks, `code-block`, and rich `ul` / `ol`.
- Non-list text blocks may contain only text leaves and inline links.
- `code-block` may contain only `code-line` children, and code lines may contain only text leaves.
- Rich `ul` / `ol` blocks may contain only flat `list-item` children, and list items may contain only text leaves and inline links.
- Nested rich lists and description-list rich blocks are deferred.
- Inline links may contain only text leaves.
- Legacy flat inline arrays are normalized to a single `paragraph` block by migration and `setRichTextContentDoc()`.
- Rich-node block spacing lives on `content.blockGap`; per-block line height is stored on supported non-list text blocks.
- `block`, `code`, and `list` subtypes also persist `TextDocumentContent`; subtype validation constrains them to one text block, one code block, or one list block respectively.

### Rendering contract

- **Site renderer** (`SiteRenderer.tsx`): rich nodes always render inside a nonsemantic outer
  `<div>`. Non-list text blocks render as their semantic block tags, rich code blocks render as
  `<pre><code>`, rich `ul` / `ol` blocks render semantically as lists, each `RichTextLeaf`
  becomes a `<span>` only when marks are needed, and each `RichTextLink` becomes an `<a>`
  resolved via `getLinkHref()`.
- **Stage renderer** (`renderLeafContent` in `nodePresentation.tsx`): same via the shared
  `renderRichContent()` helper. The `document` option must be passed when page-link hrefs need
  to be resolved.
- Rich outer wrappers apply `content.blockGap` as inter-block spacing without changing the persisted
  inner block semantics.
- `getNodeTextContent()` flattens `RichContent` to a plain string for aria labels and layer names.

### Link validation and sync

Inline links inside `RichContent` follow the same rules as node-level links:

- `validateLinks()` in `src/model/validation.ts` walks `RichTextLink` entries and reports
  `broken-page-link` / `broken-anchor-link` errors for invalid targets.
- `syncPageHrefLinks()` in `src/api/pageApi.ts` patches matching `href` values inside
  `RichContent` when a page URL changes, returning the original document reference if nothing changed.

### Helpers (`src/model/richContent.ts`)

| Function | Purpose |
|---|---|
| `normalizeRichContent(content)` | Normalizes legacy or mixed rich content into block-rooted `RichContent`. |
| `validateRichContentStructure(content)` | Validates block-root rich invariants without relying on editor code. |
| `isEmpty(content)` | Returns `true` if all leaf text strings are empty. |
| `walkLinks(content, visitor)` | Calls visitor for every `RichTextLink`. |
| `mapLinks(content, mapper)` | Returns new array with each link replaced; identity-safe. |
| `getTextContent(content)` | Flattens `string \| RichContent` to a plain string. |

## On-Stage Rich Text Editing

Text nodes with `subtype: 'rich'` support inline editing directly on the stage canvas.

### Activation

The first plain click still selects the node. A second plain click on the already-selected rich
text node enters edit mode. The static `renderLeafContent` output is replaced by a Slate
`<Editable>` at the same position and with the same typography styles. The editor now round-trips
block-rooted `RichContent`, so existing headings, blockquotes, and paragraph blocks are preserved
during editing.

### Edit mode lifecycle

```text
Idle ──select──► Selected ──second plain click──► Editing ──outside click / Cmd+Enter──► Commit ──► Idle
                                                            └── Escape ──► Discard ──► Idle
```

- **Commit**: serialises the Slate editor state back to canonical `TextDocumentContent` and dispatches a
  `setTextDocumentContent` action, which calls `setTextDocumentContentDoc()` in `documentApi.ts`.
- **Block spacing**: rich stage editing writes spacing through `setTextDocumentBlockGap`,
  which updates `content.blockGap` directly instead of routing through field-based text actions.
- Both canonical text-document actions register normal document undo history and debounce with other text edits for the same node.
- While nested rich-edit chrome is open, outside click and `Escape` unwind only the topmost nested layer instead of immediately exiting edit mode.
- **Discard**: restores the original content; the document model is not mutated.

Slate manages its own micro-undo while editing. On commit, one entry is pushed to the document-level
undo history. Keystrokes are not propagated to the document until the editor exits.

While editing, the rich node gets visible stage chrome:

- a floating toolbar built from the shared floating panel shell plus compact shared inputs/selects and inspector-style icon buttons
- the floating toolbar is arranged as a fixed two-row editor bar rather than a wrapping chip cloud
- the floating toolbar uses shared horizontal toolbar groups: controls inside each group use tighter spacing, visible groups use wider spacing and subtle token-backed vertical dividers; font family, manage fonts, and font size are one typography group, and compact toolbar controls use a 28px height with 28px square icon buttons
- the base toolbar is a UI-flow floating panel with a slim integrated left-side drag rail, rendered outside the edited node flow
- toolbar drag is owned by the rich-edit host using the same pointer-driven lifecycle pattern as the focused panel, uses cached drag geometry instead of remeasuring on every move, clamps inside the viewport below the top bar, and remembers a session-local offset when rich edit is reopened later in the same browser session
- the stage selection outline is hidden while the rich node is actively being edited
- the node height switches to auto with a minimum height equal to the authored stage height, so
  vertical overflow grows the component instead of clipping it
- toolbar and link-popover interactions stay inside edit mode instead of being treated as outside clicks
- rich-stage chrome uses a local layer stack: nested dropdowns close before their parent link panel, and the link panel closes before outside click or `Escape` can fall through to commit or discard the whole rich-edit session
- the link panel follows the dragged toolbar position instead of staying anchored to the original text node position
- authored text remains directly mouse-selectable inside the stage edit surface
- the edit surface itself stays visually minimal: no extra padding, no rounded edit frame, and no separate boxed shell around the authored text
- the toolbar now exposes the shared family-and-weight font picker plus an adjacent manage-fonts action, bold, italic, underline, strikethrough, text color, highlight color, link, block/list/code mode buttons, and compact typography/layout controls, with a visible left grip rail for dragging
- the same grouped toolbar treatment applies to rich, standalone block, and standalone list edit modes; block and list modes show only their inline control groups and do not reserve space for unavailable rich-only controls
- text color and highlight color reuse the shared `ColorPicker` swatch control instead of a stage-local native color input
- text and highlight swatches share the same framed swatch treatment so light and dark colors read as the same visual size in the toolbar
- font size uses the shared `ValueWithUnit` contract with font-size units, resolves inherited font size into a real field value instead of gray placeholder text, and its suggestion list can overflow the panel body instead of being clipped by toolbar chrome
- font-size suggestions participate in the rich-edit layer stack, so outside click and `Escape` close that suggestion layer before they can unwind the link panel or the base toolbar
- line height uses the shared `NumberInput` contract as a compact spinnerless field with a leading `MoveVertical` icon
- block spacing uses a compact `ValueWithUnit` field with `px` / `em` support and a leading `UnfoldVertical` icon while still persisting `content.blockGap` as px
- the block-type, ordered-list marker, unordered-list marker, and code-language dropdowns render only for their active structure modes, and the code-language dropdown sits immediately after the code-mode icon
- the link popover shows an inline `Type` label beside the link-type dropdown instead of presenting that selector as a bare unlabeled row
- rich list blocks render native `ol` / `ul` containers with native `li` items in live edit mode so ordered and unordered markers remain visible despite global reset CSS
- line-height edits apply immediately in the live rich-edit surface for supported non-list text blocks, not only after commit back to idle rendering
- the live rich-edit surface reuses the authored rich-content rendering rules for block alignment, list marker styles, block gaps, and explicit inline link styling so edit mode matches idle mode instead of introducing link-preview styling
- when a non-collapsed authored selection exists and focus moves into toolbar chrome, the edit surface keeps a transient accent-blue retained highlight over that same range until the user changes selection or exits rich edit
- active icon buttons use the shared selected-control treatment rather than bespoke stage-only styling
- toolbar selects, inline inputs, and the link popover preserve the authored rich-editor selection while their chrome is used, then restore that selection before applying block/list/link mutations so focus leaving the editable surface does not retarget those actions
- rich `code-block` selections expose a language selector in the same toolbar; standalone code inspector language options include `plaintext`, `markdown`, and explicit Prism-backed languages
- block, `ol`, and `ul` controls are block-scoped rather than inline-scoped: they affect the containing block or touched blocks, never by splitting around the inline selection
- multi-block block-type conversions preserve touched top-level block boundaries and retag each touched block instead of collapsing them into one block
- converting touched blocks to `ul` / `ol` keeps one list container, preserves inline marks/links inside items, and treats touched block boundaries and hard line breaks as item boundaries

### Text inspector content panel

- The text subtype toggle is rendered as an icon-only options selector in the content card header, aligned beside the focus-mode action and using per-subtype tooltips; option selector and segmented text buttons stay 24px tall, with icon-only options staying 24px square and using a 1px segmented-shell inset. Mixed multi-select segmented states use the shared `OptionsSelector` mixed presentation instead of showcase- or panel-local overrides.
- Rich content cards no longer render a text preview under the “Edit rich text” action.
- Standalone list content cards edit canonical `ul` / `ol` list blocks and keep advanced bulk editing collapsed by default.

### Keyboard shortcuts

| Shortcut     | Effect                                                             |
| ------------ | ------------------------------------------------------------------ |
| `Cmd/Ctrl+B` | Toggle bold on the current selection                               |
| `Cmd/Ctrl+I` | Toggle italic on the current selection                             |
| `Cmd/Ctrl+K` | Insert an external link (or remove if selection is already a link) |
| `Cmd/Ctrl+Enter` | Commit changes and exit edit mode                              |
| `Escape`     | Discard changes and exit edit mode                                 |

### Shortcut precedence

- While rich-text edit mode is active, the rich-text surface owns text-editor-standard shortcuts before the global shortcut registry can act.
- Browser-native undo/redo, selection, clipboard, and caret navigation should keep falling through to the editor/browser text surface instead of being intercepted by app-global shortcuts.
- The current explicit rich-text shortcut contract is `Cmd/Ctrl+B`, `Cmd/Ctrl+I`, `Cmd/Ctrl+K`, `Cmd/Ctrl+Enter`, and `Escape`.
- Audited candidates that are not yet part of the explicit contract include `Cmd/Ctrl+U`, a strikethrough shortcut, alignment shortcuts, and other editor-style rich-text bindings that still need a product decision.

### Inline link insertion (`Cmd+K`)

Pressing `Cmd+K` on a selection with no existing link opens a small floating link popover that can
author `external`, `anchor`, or `page` links using the same link-type model as the rest of the
text system. Pressing `Cmd+K` on a selection that already contains a link removes it.

### Implementation files

| File                                               | Role                                                                              |
| -------------------------------------------------- | --------------------------------------------------------------------------------- |
| `src/stage/stageRenderers/RichTextEditOverlay.tsx` | Slate editor component, toolbar chrome, keyboard handlers, outside-click commit, link popover |
| `src/stage/useRichTextEditMode.ts`                 | `editingId` state hook                                                            |
| `src/stage/richEditContext.tsx`                    | React context threading edit state through the stage tree                         |
| `src/render/richTextEditor.ts`                     | Adapter: `createRichEditor`, `toSlateValue`/`fromSlateValue`, mark/link utilities |
| `src/api/documentApi.ts`                           | `setRichTextContentDoc()` — pure document mutation                                |

## Running the Playground

### Development

```bash
npm install
npm run dev
```

### Production preview

```bash
npm run build
npm run preview
```
