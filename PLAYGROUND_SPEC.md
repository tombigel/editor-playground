# Playground Spec

This document captures the current editor and implementation model used by the sticky playground.

Related documentation:

- [Editor Style Guide](/Users/tombigel/Dev/Wix/sticky-playground/EDITOR_STYLE_GUIDE.md): visual rules and token guidance for editor chrome
- [Sticky Render Model](/Users/tombigel/Dev/Wix/sticky-playground/STICKY_RENDER_MODEL.md): rendered-site sticky data and DOM structure

## Goal

The playground exists to test:

1. the minimal data model for sticky layout behavior
2. how sticky duration should be represented structurally in the DOM
3. how an editor should expose sticky controls predictably
4. how multiple sticky elements inside one section interact

## Node Model

There are three node families:

- `site`
- `wrapper`
- `leaf`

Wrapper roles:

- `section`
- `header`
- `footer`
- `container`

Leaf roles:

- `text`
- `image`
- `link`
- `button`

Node ids are monotonic per session and synchronized against the loaded document before insertions, so newly inserted templates/components cannot overwrite existing nodes.

## Wrapper Model

All wrappers share the same structural behavior:

- outer wrapper element
- one internal `contentWrapper`
- child positioning relative to that content wrapper
- sticky can apply to the wrapper or the content wrapper

Wrapper style behavior:

- wrappers do not get an implicit visible border by default
- wrapper visual styling is applied on the inner `contentWrapper` surface, not on the outer layout shell
- only `container` wrappers expose generic surface styling controls for border, radius, and shadow
- `section` wrappers support a dedicated bottom divider style with:
  - color
  - width

### Section type

A wrapper can be promoted or demoted between:

- `section`
- `header`
- `footer`

The inspector labels this control as `Section type`, and the wrapper keeps the same id.

If a header or footer already exists, promotion asks whether to demote the current one and replace it.

Section/header/footer design controls stay minimal:

- `section`, `header`, and `footer` expose background color
- `section` also exposes a section-only bottom divider editor
- header/footer do not expose generic border, radius, or shadow controls

The section design controls also expose a section-only bottom divider editor:

- `Divider`: one row containing:
  - bottom border width
  - bottom border color
- divider width uses the inline number-with-unit control in `px` only
- single-unit inline controls do not show dropdown hover chrome or selection interactions
- inspector color fields render inline in the row:
  - alpha-aware colors use the shared advanced color picker with alpha controls enabled
  - plain solid colors such as the section divider color use the same picker with alpha controls hidden
  - the picker preserves authored CSS color strings, including extended spaces such as `oklch(...)`, `lab(...)`, and `color(display-p3 ...)`
  - reopening the picker re-initializes its active colorspace from the currently authored color string instead of carrying over the previous open session

## Nesting Rules

- `section`, `header`, and `footer` cannot contain another `section`, `header`, or `footer`
- `container` can contain other `container`s indefinitely
- wrappers can contain leaves

This keeps site sections top-level while allowing deep nested layout composition through containers.

## Layout Model

The editor uses a freeform placement model, not a predefined fixed grid.

Children are positioned with:

- `x`
- `y`
- `width`
- `height`

Children can be:

- dragged
- resized
- reparented between sections and containers

Drag behavior includes:

- snap targets for page bounds and page centers (left/right/top/bottom + horizontal/vertical center)
- snap targets for element top/center/bottom alignment
- a global snap toggle in the left rail
- `Alt` to invert current snap mode during drag
- `Shift` to lock drag movement to a single axis
- the dragged source node fades and suppresses local box/filter shadows while dragging so the drag silhouette stays clean
- snap guide colors:
  - component guides: teal
  - page guides: magenta

Resize behavior includes:

- `Shift` on corner handles to preserve the current aspect ratio
- resize start normalization to rendered box size when stored values are non-numeric (`auto`, `fit-content`, `min-content`, `max-content`, `%`, `aspect-ratio(...)`) to avoid first-frame jumps
- drag/resize coordinate commits are anchored to model-space origin so sticky-preview viewport pinning does not leak into persisted `x`/`y`

## Ordering Model

Layer/order operations are implemented via DOM order (parent `children` array), not `z-index`.

Reorderable nodes:

- all leaves
- wrapper nodes with role `container`
- wrapper nodes with role `section` (root-level only, up/down between sibling sections)

Non-reorderable wrappers:

- `header`
- `footer`

Section ordering uses dedicated up/down controls in the inspector role row (DOM move between section siblings only).

Keyboard shortcuts:

`Mod` maps to `Cmd` on macOS and `Ctrl` on Windows/Linux.

- `Mod + [`: position backward (when a node is selected and no input field is focused)
- `Mod + ]`: position forward (when a node is selected and no input field is focused)
- `Mod + Shift + [`: send to back (when a node is selected and no input field is focused)
- `Mod + Shift + ]`: bring to front (when a node is selected and no input field is focused)
- `Shift + P`: toggle sticky preview from the left rail when no input field is focused
- `Shift + S`: toggle spacer visuals from the left rail between selected-only and all when no input field is focused
- `Shift + G`: toggle snap to guides when no input field is focused
- `Left` / `Right` / `Up` / `Down`: move the focused stage selection by `1px`
- `Shift + Left` / `Shift + Right` / `Shift + Up` / `Shift + Down`: move the focused stage selection by `10px`
- `Mod + ,`: open settings
- `?`: open shortcut help when no input field is focused
- `Esc`: close open panels / dialogs

## History Model

Undo/redo is implemented as an in-memory history stack.

- history is not persisted to `localStorage`
- changes are stored incrementally as per-node before/after patches
- full document snapshots are avoided for performance
- resize interactions are recorded as a single transaction on release (not per mousemove frame)
- move and non-text updates create a new transaction per action
- text field updates are debounced into grouped history entries after short idle
- `Cmd + Z` / `Cmd + Shift + Z` is handled by the app globally, including when text fields are focused (native browser undo is intercepted)

Controls:

- top bar buttons: undo / redo / shortcut help / settings
- shortcuts: `Mod + Z`, `Mod + Shift + Z` (and `Ctrl + Y` on non-mac platforms)
- settings panel: clear undo history, configurable max retained undo steps
- document import replaces the current document as a single undoable transaction

## Import / Export

The playground imports and exports document JSON, and it can also export a rendered site bundle made of separate HTML and CSS files. It does not export full editor session state.

- export lives in the settings panel under `Import / Export`
- export supports:
  - an editable base file name field in settings
  - save to file with that file name suggested when browser APIs allow it
  - fallback named download using that same file name when native save picker is unavailable
  - copy JSON to clipboard
  - save rendered site ZIP (HTML + CSS bundle)
  - separate export groupings for `Document JSON` and `Rendered Site`
- import supports:
  - choosing a `.json` file
  - pasting JSON from clipboard into the settings panel import box
  - importing pasted JSON from the textarea
- import normalizes the incoming document, validates graph integrity, replaces the current document, clears selection, and can be undone with `Cmd + Z`

Validation during import/persistence restore now checks document graph integrity in addition to role nesting:

- `rootId` must resolve to a `site` node
- non-root nodes must have a parent
- parent `children` references must resolve to existing nodes
- child `parentId` must point back to the owning parent
- duplicate child ids inside one parent are rejected
- unreachable/orphaned subtrees are rejected

Rendered site export is SSR-safe:

- `src/site/SiteRenderer.tsx` renders structural site markup without editor concerns
- `src/site/siteExport.tsx` renders:
  - body HTML
  - generated CSS
  - a complete HTML document that links to the generated CSS file
- rendered site export does not depend on browser measurement APIs

## Units

The model is breakpoint-ready, even though the current editor only exposes a base breakpoint.

Supported unit types:

- `x`, `y`: `px`, `%`, `vw`, `vh`
- `width`: unit value, `fit-content`, `min-content`, or `max-content`
- `height`: unit value, `auto`, or `aspect-ratio(...)`

Width keyword values are preserved in both the editor stage and site renderer, so text leaves keep their authored `fit-content` / `min-content` / `max-content` sizing instead of being expanded to full width.

In the editor stage, authored sizes remain the source of truth, but editor mechanics use resolved runtime geometry selectively. Absolute and relative sizes resolve from authored values; wrapper width is authored directly. For `section`/`header`/`footer`, an authored explicit wrapper height renders as the content-wrapper minimum height so the wrapper can still grow with content and sticky extents, and stage structural-range math uses the larger of that authored minimum or the current measured inner content height. For `container`, an authored explicit height renders as the actual content-wrapper height so border/padding surfaces and edit geometry stay aligned to the authored box. Auto-height wrapper mesh layout is recalculated from the current children/sticky extents rather than preserving stale previously measured wrapper height after edits. Intrinsic sizes such as text `height: auto` and keyword widths use measured DOM layout so selection boxes, sticky tracks, snapping, and drag geometry follow the browser's real layout instead of heuristic estimates. Stage overlay layers that render guides and spacer ranges mirror the content-wrapper padding so their coordinate space stays aligned with padded wrapper content. The editor stage adds its shell inset to sticky preview positioning, while offset guides stay in authored units inside that compensated sticky preview so the indicators remain aligned to the sticky element. `aspect-ratio(...)` remains a height-side derived mode driven by resolved width.

For wrapper resizing in the stage, start-size measurement uses the inner `contentWrapper` surface so border/padding styling does not feed back into authored geometry, while the visible resize handles stay anchored to the outer wrapper shell so they align to the outer edge of bordered container surfaces.

Text leaves also store an HTML tag, editable in the inspector. Supported tags are `h1`-`h6`, `p`, `blockquote`, and `div`, and both the editor stage and site renderer use that tag when rendering the text node. Changing the tag updates semantics only; the renderer and stage styling normalize native tag defaults so browser heading/blockquote styles and stage-only paragraph selectors do not override the text node's authored styling. Seeded templates use semantic heading tags for primary titles: the default post title is `h1`, and the primary titles in the sticky demo sections are seeded as `h2`.

Text-bearing leaves split typography from presentation in the inspector:

- `text`
  - `Content`: body copy
  - `Text style`: font size, line height, bold, italic, underline, strikethrough, alignment, direction, and HTML tag
  - `Design`: text color and filter-based shadow
- `link`
  - `Content`: label and `href`
  - `Text style`: the same typography controls as text except HTML tag, plus a wrap toggle
  - `Design`: text color and filter-based shadow
  - links render as block-level leaf content with `width: 100%`, so text alignment applies across the authored leaf frame
  - the wrap toggle lives on a single `Wrap` row immediately after `Align` in the text-style section
  - link wrap defaults to `single-line`; enabling the wrap toggle switches it to multi-line wrapping
- `image`
  - `Content`: `src` and `alt`
  - `Design`: unified border width/color/radius plus box shadow
- `button`
  - `Content`: label
  - `Text style`: the same typography controls as text except HTML tag, plus a wrap toggle
  - `Design`: text color, background color, unified border color/width/radius, box shadow, and block/inline padding in that order
  - button padding is edited as `Y` and `X` fields that serialize to `paddingBlock` / `paddingInline`
  - button padding units support `px`, `em`, and `rem`
  - the wrap toggle lives on a single `Wrap` row immediately after `Align` in the text-style section
  - button wrap defaults to `single-line`; enabling the wrap toggle switches it to multi-line wrapping

Shadow controls in the inspector edit `distance` and `angle`, but the persisted document model continues to store shadow offsets as `shadowOffsetX` / `shadowOffsetY`. The blur, distance, and angle inputs currently render as plain number fields without inline unit suffix chrome so larger values fit cleanly while the control layout is in flux. Text and link shadows render via CSS `filter: drop-shadow(...)`; wrapper, image, and button shadows render via CSS `box-shadow`. Wrapper, image, and button border surfaces use `box-sizing: border-box`, and bordered fills are clipped to `padding-box` so the border reads as an outer stroke instead of painting over the background.

Unified border editors follow the same simplified treatment:

- border color uses the shared advanced color picker
- border width renders as a fixed `px` field without a unit dropdown
- border radius uses an explicit inline unit selector and supports `px` and `%`
- border width preserves its implicit stored unit, and border radius preserves/edits its explicit `px` or `%` unit

Inspector geometry controls use single composite fields instead of raw freeform text. `X` and `Y` support length units only (`px`, `vw`, `vh`, `vmin`, `vmax`). `Width` and `Height` use one shared shell with an editable numeric/value segment and a unit-or-mode segment. Numeric values edit as `number + unit`; width keywords and height `auto` render as a single full-field mode trigger; height `aspect-ratio` stays in the same shell but uses a freeform value segment that accepts either a positive number or a simple ratio expression like `16/9`. Width/height numeric modes support `px`, `%`, `vw`, `vh`, `vmin`, and `vmax`. The numeric segment uses the browser number-input keyboard behavior while hiding native steppers. The unit/mode segment uses brighter text than the numeric value, and its dropdown chevron appears only on hover/focus as a white overlay over the suffix area. Numeric field displays are capped to 2 decimal places and trim trailing zeroes. When switching from one numeric unit to another, or from keyword sizing into a numeric unit, the inspector measures the live stage geometry and rewrites the numeric value against the live parent box and live browser viewport so the node keeps the same rendered size/position in the editor instead of changing scale. For `vmin` and `vmax`, conversion uses the live smaller or larger browser viewport dimension respectively. Committed values still serialize back to the existing model strings (`320px`, `fit-content`, `auto`, `aspect-ratio(16/9)`). For wrapper nodes with role `section`, `header`, or `footer`, the width control is hidden in the geometry grid while its slot stays reserved so the 2x2 geometry layout remains visually stable.

Editor resize and width/height field edits are isolated per axis. Changing one axis preserves the untouched axis as-authored, including keywords and non-pixel units. That means `height:auto` stays `auto` when width changes, `height:aspect-ratio(...)` stays authored when width changes, and keyword widths such as `fit-content` stay authored when only height changes. When a resized axis already uses a numeric unit (`px`, `%`, `vw`, `vh`, `vmin`, `vmax`), the editor rewrites the new value back into that same unit instead of collapsing it to pixels. Keywords remain preserved only on the untouched axis; if the keyword axis itself is explicitly resized, that axis is authored as a concrete size.

Shared hover tooltips in the editor follow a delayed-open plus grace-period model:

- when no tooltip is currently open, hovering a tooltip trigger waits 200ms before opening
- if the pointer leaves before that tooltip opens, the pending open is canceled
- entering another tooltip trigger while no tooltip is open starts a fresh 200ms wait
- once a tooltip is visible, leaving its trigger closes it immediately
- after a visible tooltip closes, the next 200ms act as a grace period: entering the same or another tooltip trigger during that window opens immediately with no delay
- after the grace period ends, hover-open returns to the normal 200ms delay
- keyboard focus opens tooltips immediately

Shortcut hints inside tooltips render as a secondary monospace line with lower contrast than the main label.

Internally, values are stored as parsed data shaped like `CSSUnitValue`, but as plain app data rather than browser Typed OM objects.

## Sticky Model

Sticky can be defined on:

- any leaf
- any wrapper
- any wrapper content wrapper

Sticky properties:

- enabled
- target: `self` or `contentWrapper`
- edge: `top`, `bottom`, or `both`
- offset (`offsetTop`, `offsetBottom`)
- duration (`duration` legacy + split `durationTop`, `durationBottom`)

### Current editor controls

- duration slider: `0vh` to `400vh` in `25vh` steps
- offset slider: `0vh` to `100vh`
- when edge is `both`, inspector uses a dual-knob offset range slider (top/bottom band) and separate top/bottom duration sliders
- for wrappers, sticky `target` is hidden from the editor UI for now; the product currently presents wrapper sticky as self-targeted only, while internal `contentWrapper` support remains retained for future enablement

Defaults:

- edge: `top`
- offset: `0`
- duration: `50vh`

## Spacer Model

Spacers are real structural elements.

### Rules

- For `target = self`, the sticky element lives in a sticky track:
  - element first
  - spacer immediately after it
- For `target = contentWrapper`, a real flow spacer after the content wrapper extends the parent
- Spacer visuals can be shown or hidden in the editor
- Offset is visualized separately from duration

### Multiple sticky items in one section

Multiple sticky spacers can overlap in vertical range.

They do not add together.

The final section height is determined by the spacer whose end is furthest down.

For self-target sticky guides in the editor preview, `durationMode=auto` uses the actual free space around the sticky node. Top-edge auto uses the free space below the node, bottom-edge auto uses the free space above it, and both-edge auto renders those two guide heights independently instead of mirroring one distance to both sides.

For sticky containers:

- `target=self` applies sticky positioning to the container wrapper itself
- `target=contentWrapper` applies sticky positioning to the internal content wrapper
- when nested container `contentWrapper` sticky adds extra extent, parent mesh sizing includes that extent so scroll range and sticky duration stay consistent

## Site Rendering

`src/site/SiteRenderer.tsx` is now the canonical site/runtime renderer boundary for non-editor output.

- it is detached from editor interactions (`drag`, `resize`, `selection`, diagnostics)
- it renders semantic wrapper tags (`header`, `section`, `footer`, `div`) plus leaf tags/content
- it preserves authored width keywords and text HTML tags
- it uses the same mesh-grid child placement baseline as the editor stage for non-editor layout, instead of falling back to absolute-position child export
- it carries the renderer's default presentation layer for text, links, buttons, and images into the exported CSS, then layers authored model values on top
- it preserves authored explicit wrapper/content sizing in export:
  - `section`/`header`/`footer` keep authored `min-height`
  - `container` keeps authored fixed `height`
  - it does not add an extra generic height floor to short wrappers
- it renders sticky structure with real exported spacer elements:
  - `target=self`: sticky track + edge-aware spacer ordering + sticky node
  - `target=contentWrapper`: wrapper + sticky content wrapper + flow spacer
- custom sticky durations export as authored CSS lengths
- `durationMode=auto` exports no synthetic measured spacer extent because site export is model-driven and does not depend on runtime DOM measurement
- `target=self` with `durationMode=auto` exports sticky directly on the node/wrapper without a synthetic track wrapper, matching the editor stage baseline

`src/site/siteExport.tsx` exposes the programmatic export surface:

- `renderSiteBodyHtml(document)`
- `renderSiteCss(document)`
- `renderSiteHtmlDocument(document)`
- `renderSiteExportBundle(document)`

## Preview Model

Sticky preview is CSS-native.

Bottom-edge self sticky uses inverted track spacer ordering (spacer before node) so viewport pinning remains stable during scroll.
For `edges: both`, preview applies both sticky constraints together (`top` and `bottom`) and uses split offsets (`offsetTop`, `offsetBottom`).
For `edges: both`, visual guides render top and bottom offsets together, and distance guides render both top and bottom tracks together.
Wrapper `target=self` sticky uses the same sticky-track/spacer pattern as leaf components for custom durations, including bottom-edge spacer ordering.
Wrapper `target=self` sticky also renders `Distance: auto` indicators in preview (including top/bottom labeling in `edges: both`).
For single-edge `target=self` auto duration, preview renders exactly one distance guide on the active travel side rather than dual top/bottom guides.
Top-level wrappers (`section`, `header`, `footer`) treat `target=self` as an auto-only preview mode. They keep offset indicators, show `Distance: auto`, and do not render synthetic custom-distance track shells.
In the inspector, top-level wrappers with `target=self` also treat duration as fixed auto mode: the panel shows a selected non-changeable `Auto` state, hides `Custom`, and the helper copy reads `Uses the page height as the sticky distance.`
Sticky layering uses one shared low z-index baseline across the editor stage and exported site, instead of renderer-specific sticky stacking values. Editor-only layering prefers DOM order and local stacking contexts first; the remaining explicit layers are limited to a small named stack for selected nodes, sticky labels, and resize handles rather than large arbitrary z-index jumps.
In the editor stage only, sticky offsets are compensated against the stage shell top/bottom breathing space so authored `top`/`bottom` offsets pin to the visible stage frame rather than to the outer scroll-shell padding.

JavaScript is used for:

- dragging
- resizing
- rebuilding editor structure

JavaScript is not used for live sticky movement during scroll.

## Editor UX

Current UX includes:

- full-stage canvas
- insert panel
- inspector panel with a collapsible right rail in normal mode
- focused mode as editor chrome only; the first focused mode is `sticky`
- focused mode renders as a floating workspace surface and stays detached from the inspector collapsed/open state
- entering focused mode collapses the inspector automatically
- closing focused mode restores the inspector from its hidden state
- when the inspector is collapsed, the right-rail opener can temporarily reopen it without changing the collapsed preference; while focused mode is active that temporary inspector closes on mouseout after a short delay
- centered settings panel with a scrollable main body and sticky left anchor links for `UI`, `Import / Export`, `Advanced`, `Debug Info`, and `Shortcuts`
- the settings `UI` section includes editor theme mode: `Light`, `Dark`, and `Auto` (`Auto` follows the system color scheme)
- the settings `UI` section also includes a startup focused-mode selector: `Normal` or `Sticky`
- startup mode determines the focused mode on editor load; the previous session's transient focused-mode state does not override it
- left rail quick actions for sticky preview, spacer visibility, and snap-to-guides
- top bar utility actions for shortcut help and settings
- shortcut help dialog opened by `?`, generated from the shared shortcut registry
- shortcut guide also appears as the last section inside settings
- editor popups, panels, dialogs, and tooltips use the native CSS Popover API so they render in the browser top layer
- left pop panels (section templates + settings panel) close on outside click / `Esc` and stay above stage selection overlays
- the stage is a single keyboard focus scope: `Tab` walks selectable nodes in DOM order, the current selection scrolls into view when needed, and arrow keys nudge positioned components
- pointer selection does not commit drag/reparent work until the pointer moves beyond click jitter, so repeated clicks on auto-sized content do not remeasure layout as a drag
- intrinsic-height leaf nodes in the editor stage align to the start of their mesh slot instead of stretching to the full row span, so text selection boxes hug rendered copy
- auto-height wrapper sizing in the editor stage is measured from the inner content box, so dragging or repositioning selected nodes does not inflate surrounding header/section height by wrapper borders
- button focus states use a stronger visible ring across editor controls
- inspector sections that correspond to a focused mode can expose a small top-right `Go to mode` entry button; the sticky section is the first such entry point
- the floating sticky focused mode reuses the same sticky section card chrome as the inspector; it fills the shared section header leading slot with component name + type and replaces the header action with the close button
- top-level `section`, `header`, and `footer` wrappers keep the width field visible in the inspector, but the field is disabled when the authored width is locked to `100%`
- the shared `Name` field lives in its own trailing `Properties` section instead of the layout section across non-site inspectors
- `Content` is the standard content-editing section title across leaf inspectors; text-bearing leaves split further into `Content`, `Text style`, and `Design`, while image uses `Content` and `Design`
- drag, resize, reparenting, and snap guides
- inspector ordering controls with icon actions and tooltips
- in-memory incremental undo/redo
- local session persistence in `localStorage`
- `Reset data` restores the factory document baseline and clears undo/redo while preserving editor UI preferences
- `Reset all` also clears persisted editor UI/session state and restores the full editor baseline

## Architecture Boundaries

- `src/model/*` is the domain layer (types, units, defaults, selectors, validation) and has no editor UI concerns.
- `src/sticky/resolve.ts` is the shared sticky domain resolver. It accepts document data plus a renderer-provided geometry snapshot and returns sticky registrations / extra extent without depending on React or DOM APIs.
- `src/editor/editorStore.ts` owns editor session state (`selectedId`, panel UI flags, persistence keys, undo-related state usage in app).
- focused-mode state (`focusedMode`, `startupFocusedMode`, `inspectorCollapsed`, `temporaryInspectorOpen`) remains editor UI state only; it does not change document semantics, sticky math, stage rendering, or site export behavior.
- `src/api/documentApi.ts` provides editor-agnostic document API primitives so document data can be manipulated from non-editor contexts (for example CLI scripts).
- `src/api/editorApi.ts` is the editor-facing API boundary used by app/panels; editor UI avoids direct imports from `src/model/*`.
- `src/api/siteApi.ts` exposes site/runtime rendering and export helpers without coupling them to editor UI.
- `src/render/layout.ts` is the shared non-editor layout baseline for mesh-grid placement, wrapper sizing, and sticky structure inputs used by both the editor stage renderer and the site export renderer.
- `src/render/renderPlan.ts` and `src/render/renderPlanHelpers.ts` own the shared non-editor render tree and traversal helpers consumed by both the editor stage renderer and the site/runtime renderer.
- `src/render/leafPresentation.ts` is a shared presentation layer for leaf content defaults used by both the editor stage renderer and the site export renderer.
- `src/stage/Stage.tsx` is an editor renderer. It measures live node geometry, renders the preview, publishes that geometry upward so other editor surfaces can reuse the same sticky resolution inputs, and owns editor-only visuals such as selection chrome, drag preview, snap guides, and sticky guides.
- `src/site/SiteRenderer.tsx` and `src/site/siteExport.tsx` are the site/runtime renderer boundary detached from editor interactions and browser measurement requirements. They consume the shared render plan and shared render style semantics, but not editor-only preview visuals.

## Section Templates

Adding a section now opens a section-template picker instead of inserting immediately.

Template picker behavior:

- opens from the left-rail `Section` add button
- renders as a compact left-side pop panel (non-modal), not full-screen dialog
- closes on outside click and `Esc`
- shows template cards in a 2-column grid
- clicking an active template inserts one top-level section and selects it
- section insertion places the new section before footer when footer exists

Current templates:

- `Blank` with default section height `50vh`
- `Post` (image + title + text) with default section height `50vh`
- `Sticky Staggered Images`
- `Sticky Pinned Cards`
- `Sticky Media Reveal`
- `Sticky Edge Lab`

`Sticky Media Reveal` uses direct sticky image leaves (not wrapper containers around the media) seeded from a locked baseline: pinned media at `x=77`, `y=165`, size `401x428`, sticky `duration=150vh`, `offsetTop=10vh`; reveal backdrop at `x=78`, `y=167`, size `399x426`, sticky `duration=25vh`, `offsetTop=10vh`; narrative blocks at `y=313.640625`, `1035`, `1687` with updated copy, and section child order `heading -> pinned media -> narrative A/B/C -> reveal backdrop`.
`Sticky Staggered Images` is seeded from the locked staggered-gallery structure (fixed image coordinates and `150vh` duration / `15vh` offset per image).
`Sticky Pinned Cards` is seeded from the locked pinned-cards baseline (pinned lead at `85/212.28125`, lead sticky `durationMode=auto` + `220vh` duration + `12vh` offset; narrative cards keep fixed coordinates with sticky `25vh/25vh/50vh` durations at `15vh` offset).
`Sticky Edge Lab` is seeded as a 3-column top/both/bottom comparison. Only the three sticky card texts are wrapped in colored `container` wrappers, and sticky settings live on those card containers: top (`edges.top=true`, `offsetTop=10vh`, `durationTop=140vh`), both (`edges.top=true`, `edges.bottom=true`, `offsetTop=10vh`, `offsetBottom=10vh`, `durationTop=80vh`, `durationBottom=80vh`), and bottom (`edges.bottom=true`, `offsetBottom=10vh`, `durationBottom=140vh`). Baseline alignment is locked, including section height `2480px`, notes `y` values (`972`, `1293`, `1780`), sticky container anchors (`72/362`, `473/761`, `864/1179.9921875`), and footer note at `x=96`, `y=2604.984375`.

Future-facing placeholders for scroll-driven animation templates are visible but non-insertable.

## Default Seed Content

Factory seed now uses:

- redesigned project-focused header
- text-only header branding (no header image)
- `Post` section template as the initial main section
- redesigned project-focused footer

When loading persisted legacy starter documents, untouched old default header/footer shells are auto-upgraded in place to the current baseline.
When loading the untouched original starter document, the legacy single section with placeholder text/button content is replaced with the current `Post` template baseline.

## Validation Policy

Validation stays in the UI.

Invalid input is not written into the document model.

This applies especially to parsed unit fields.

## Debugging Aids

The playground exposes:

- spacer visuals
- offset visuals
- sticky focused mode
- preview sticky toggle
- show spacers toggle (`selected` or `all`)
- preview and spacer quick toggles remain in the left rail
- snap toggle remains in the left rail with tooltip guidance for `Alt` drag inversion and a `Shift + G` shortcut
- sticky diagnostics output resolved by the shared sticky resolver using the same measured stage geometry the editor preview publishes
- reset stage action
- clear undo history action
- undo step retention control
- import / export controls in settings

## Running the Playground

```bash
npm install
npm run dev
```

For a production build:

```bash
npm run build
npm run preview
```
