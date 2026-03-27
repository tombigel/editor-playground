# Playground Spec

This document captures the current editor and implementation model used by the sticky playground.

Related documentation:

- [Editor Style Guide](./EDITOR_STYLE_GUIDE.md): visual rules and token guidance for editor chrome
- [Sticky Render Model](./STICKY_RENDER_MODEL.md): rendered-site sticky data and DOM structure

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

## Document Model

The document persists a top-level `fontLibrary` manifest alongside `rootId` and `nodes`.

Font library fields:

- `defaults`
- `usedFamilies`
- `favorites`

New documents seed these Google-backed starter families:

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

Font library behavior:

- font management is document-level, not app-level
- text, link, and button leaves can author `fontFamily` and numeric `fontWeight`
- favorites are persisted per document
- removing a font family is blocked while any text-capable node still uses it
- purge-unused removes only unused families that are neither defaults nor favorites
- imported legacy text weights such as `'bold'` and `'normal'` are normalized to numeric weights
- document normalization resolves missing or stubbed Google-backed family names against the bundled catalog before falling back to a minimal placeholder entry

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

- `section`, `header`, and `footer` expose background color, but structural wrapper backgrounds are always opaque
- `section` also exposes a section-only bottom divider editor
- header/footer do not expose generic border, radius, or shadow controls

The section design controls also expose a section-only bottom divider editor:

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
- the drag source ghost is pointer-transparent (`pointer-events: none`) so drop target detection sees through it
- when hovering over a valid drop target (section or container), that wrapper highlights with an accent-colored outline and tinted background to confirm where the element will land
- highlighted drop targets with non-zero wrapper padding also render the padding boundary line so the drop inset is visible
- while dragging a child inside its current parent, that source parent (and its ancestors) are not highlighted as drop targets
- when dragging a `container` wrapper, its structural source parent (`section`/`header`/`footer`) may highlight
- on reparent, the element's position is clamped so it stays at least partially visible within the target container
- snap guide colors:
  - component guides: teal
  - page guides: magenta

Current implementation notes for the March 2026 drag/drop run:

- drag preview placement is resolved from the pointer grab offset captured at drag start, with an additional visual-shift correction path for sticky-shifted nodes
- snap targets are cached when drag commits so pointer-move work avoids recollecting DOM targets every frame
- grouped drag is committed as a single bulk move action, but only for the subset of the current selection that shares the clicked node's parent wrapper
- grouped reparent is not supported; only single-node drags can reparent into a new wrapper
- marquee selection started from a top-level structural wrapper (`section`, `header`, `footer`) currently filters hits to direct children of that wrapper
- drop target detection resolves from `elementFromPoint(...)` and walks ancestor `data-drop-wrapper-id` markers until it finds a valid wrapper parent
- drop target highlighting prefers the deepest valid hovered target and suppresses ancestor promotion while the pointer remains inside the current source parent during child drags
- reparent commit position is currently derived from the hovered wrapper's live DOM rect together with the captured drag grab offset, then clamped to keep the dropped node at least partially visible in the target wrapper
- valid drop targets receive a transient `drop-target` class on hover, and that class is cleared on drag end or pointer leave

Resize behavior includes:

- `Shift` on corner handles to preserve the current aspect ratio
- resize start normalization to rendered box size when stored values are non-numeric (`auto`, `fit-content`, `min-content`, `max-content`, `%`, `aspect-ratio(...)`) to avoid first-frame jumps
- drag/resize coordinate commits are anchored to model-space origin so sticky-preview viewport pinning does not leak into persisted `x`/`y`
- top-level `section`, `header`, and `footer` wrappers expose a single bottom-center stage resize knob
- structural wrapper resize is height-only and keeps root wrappers in normal DOM flow, so growing a header or section pushes later root wrappers down and shrinking pulls them up
- structural wrapper resize preserves authored height units for `px`, `vw`, `vh`, `vmin`, and `vmax`
- resizing a structural wrapper with `height: auto` or `%` converts the authored height to `px`
- structural wrappers with `height: aspect-ratio(...)` do not show the stage resize knob
- structural wrapper resize clamps to rendered content fit, including wrapper padding and child layout extents, so the knob cannot be dragged below the content minimum

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
- `Mod + B`: toggle bold on selected text-capable nodes when no input field is focused
  - bold is active at effective weight `>= 700`
  - toggle targets `400` and `800`
  - static families resolve the target to the nearest supported weight
- `Mod + I`: toggle italic on selected text-capable nodes when no input field is focused
- `Mod + U`: toggle underline on selected text-capable nodes when no input field is focused
- `Mod + Shift + X`: toggle strikethrough on selected text-capable nodes when no input field is focused
- `Mod + Alt + Left` / `Mod + Alt + H` / `Mod + Alt + Right`: align the current multi-selection left / center horizontally / right
- `Mod + Alt + Up` / `Mod + Alt + V` / `Mod + Alt + Down`: align the current multi-selection top / center vertically / bottom
- `Mod + Shift + Alt + H` / `Mod + Shift + Alt + V`: distribute the current multi-selection by horizontal / vertical gaps
- `Mod + Shift + Alt + Left` / `Right` / `Up` / `Down`: distribute the current multi-selection by left / right / top / bottom edges
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
- import normalizes the incoming document, validates graph integrity, upgrades legacy font state, replaces the current document, clears selection, and can be undone with `Cmd + Z`

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
- rendered HTML adds Google Fonts preconnect and stylesheet links when the document authors Google-backed families
- rendered site export does not depend on browser measurement APIs

## Units

The model is breakpoint-ready, even though the current editor only exposes a base breakpoint.

Supported unit types:

- `x`, `y`: `px`
- `width`: unit value, `fit-content`, `min-content`, or `max-content`
- `height`: unit value, `auto`, or `aspect-ratio(...)`

Width keyword values are preserved in both the editor stage and site renderer, so text leaves keep their authored `fit-content` / `min-content` / `max-content` sizing instead of being expanded to full width.

In the editor stage, authored sizes remain the source of truth, but editor mechanics use resolved runtime geometry selectively. Absolute and relative sizes resolve from authored values; wrapper width is authored directly. For `section`/`header`/`footer`, an authored explicit wrapper height renders as the content-wrapper minimum height so the wrapper can still grow with content and sticky extents, but stage structural-range math keeps that authored explicit height authoritative instead of feeding measured wrapper height back into layout on every rerender. When structural wrappers need to grow beyond that authored minimum, the mesh extends from child geometry and sticky extents rather than from a second-pass wrapper-box measurement. For `container`, an authored explicit height renders as the actual content-wrapper height so border/padding surfaces and edit geometry stay aligned to the authored box. Auto-height wrapper mesh layout is recalculated from the current children/sticky extents rather than preserving stale previously measured wrapper height after edits. Intrinsic sizes such as text `height: auto`, `%`-relative dimensions, and keyword widths still use measured DOM layout so selection boxes, sticky tracks, snapping, and drag geometry follow the browser's real layout instead of heuristic estimates. Component presentation in the stage comes from the same shared render style semantics as site/export output; the stage should not add component-specific visual treatment beyond editor chrome with an intentional editing role. Exposed insert-time defaults for leaves are seeded into the authored model when the node is created; the renderer should not invent additional visual defaults that are absent from node state. Wrapper visuals render on a dedicated inner surface layer, so container borders/shadows and section bottom dividers behave like visual surfaces instead of changing the measured wrapper box. Wrapper drag previews reuse that same inner surface layer, so container background, border, radius, shadow, and section dividers remain intact while dragging. Stage overlay layers that render guides and spacer ranges mirror the content-wrapper padding so their coordinate space stays aligned with padded wrapper content. The editor stage adds its shell inset to sticky preview positioning, while offset guides stay in authored units inside that compensated sticky preview so the indicators remain aligned to the sticky element. When a sticky node lives inside a padded wrapper, the offset guide appends that padding contribution as an additional owner-side segment and keeps the authored offset as the node-side segment, so the total visible guide length is `offset + padding`. The padding segment uses a muted dotted variant of the offset-guide color, and the `Padding` badge sits on the boundary between the padding and offset segments rather than at the outer end of the guide. The same additive padding treatment applies to top, bottom, and dual-edge sticky offset guides. `aspect-ratio(...)` remains a height-side derived mode driven by resolved width.

For wrapper resizing in the stage, start-size measurement uses the inner `contentWrapper` surface so border/padding styling does not feed back into authored geometry, while the visible resize handles stay anchored to the outer wrapper shell so they align to the outer edge of bordered container surfaces. Top-level structural wrapper resizing uses a single bottom knob and computes its minimum height from child layout bottoms plus wrapper padding rather than from the current authored explicit height, so explicit section heights can shrink back down to content fit instead of becoming their own minimum.

Text leaves also store an HTML tag, editable in the inspector. Supported tags are `h1`-`h6`, `p`, `blockquote`, and `div`, and both the editor stage and site renderer use that tag when rendering the text node. Changing the tag updates semantics only; the renderer and stage styling normalize native tag defaults so browser heading/blockquote styles and stage-only paragraph selectors do not override the text node's authored styling. Seeded templates use semantic heading tags for primary titles: the default post title is `h1`, and the primary titles in the sticky demo sections are seeded as `h2`.

Text-bearing leaves split typography from presentation in the inspector:

- `text`
  - `Content`: body copy
  - `Text style`: a combined font family/weight picker, bold, line height, italic, underline, strikethrough, alignment, direction, and HTML tag
  - `Design`: text color and filter-based shadow
- `link`
  - `Content`: label plus a destination type switch
  - newly inserted links default to the internal/anchor destination type
  - `Anchor` destination: a right-aligned pill-style internal/external selector followed by an internal target picker populated from top-level `Top`, section, and `Bottom` targets, with section ids shown on a muted second line and exporting a same-page `#sectionId` href
  - `External link` destination: `href` and an `Open in a new tab` toggle
  - `Text style`: the same typography controls as text except HTML tag, plus a wrap toggle
  - `Design`: text color and filter-based shadow
  - links render as block-level leaf content with `width: 100%`, so text alignment applies across the authored leaf frame
  - external links with `Open in a new tab` enabled render/export with `target="_blank"` plus `rel="noopener noreferrer"`
  - anchor links ignore the new-tab toggle and resolve against section wrapper DOM ids in site/export output
  - if an authored anchor target no longer exists, the selected link shows a compact dark-yellow `Broken anchor` annotation with a triangle-alert icon inline beside the `Section` picker label; broken links are not auto-repaired
  - the wrap toggle lives on a single `Wrap` row immediately after `Align` in the text-style section
  - link wrap defaults to `single-line`; enabling the wrap toggle switches it to multi-line wrapping
- `image`
  - `Content`: `src` and `alt`
  - `Design`: unified border width/color/radius plus box shadow
- `button`
  - `Content`: the same destination model as `link` with label, a right-aligned internal/external type switch, an internal section picker, or external `href` plus `Open in a new tab`
  - newly inserted buttons default to the external destination type
  - `Text style`: the same typography controls as text except HTML tag, plus a wrap toggle
  - `Design`: text color, background color, unified border color/width/radius, box shadow, and block/inline padding in that order
  - external buttons with `Open in a new tab` enabled render/export with `target="_blank"` plus `rel="noopener noreferrer"`
  - anchor buttons ignore the new-tab toggle, resolve against section wrapper DOM ids in site/export output, and show the same compact selected `Broken anchor` annotation inline beside the `Section` picker label when their target no longer exists
  - buttons without an `href` render/export as native `button` elements; buttons with an external or anchor destination render/export as styled anchors so navigation behavior matches links
  - button padding is edited as `Y` and `X` fields that serialize to `paddingBlock` / `paddingInline`
  - button padding units support `px`, `em`, and `rem`, and use the same inline unit-switch field treatment as wrapper padding controls
  - the wrap toggle lives on a single `Wrap` row immediately after `Align` in the text-style section
  - button wrap defaults to `single-line`; enabling the wrap toggle switches it to multi-line wrapping

Typography picker behavior:

- the family picker shows `Sans Serif` first, mapped to the browser/system sans-serif stack
- recent font selections appear next
- a divider separates recent fonts from the full document-font list
- the remaining document font families are sorted by:
  1. language/subset
  2. family name
- the family picker renders each family in its own font for preview
- family menu entries use a single larger text line; subset/category helper text is omitted
- selecting a family keeps the family menu open with the current family still focused so keyboard traversal can continue
- the font row uses a combined two-stage picker: families on the left, family-specific weights on the right
- the same combined picker is used for both single-node and multi-select typography editing
- the combined picker keeps the family list order stable while it is open
- the combined picker trigger previews the current weight directly on the family name instead of showing a separate weight label
- when multi-select typography values differ, the combined picker trigger shows `Mixed` until a new family or weight is chosen
- the open picker marks the currently selected family and weight with a left-aligned check icon
- the weight dropdown shows readable names (`Light`, `Normal`, `Bold`, etc.) while still authoring numeric values
- weight options preview in the currently selected family at their own weight
- while the combined picker is open, it injects a lightweight preview stylesheet for the visible families and all visible weights of the active family so weight previews do not wait for selection
- the family picker exposes a manage-fonts icon button next to the family/weight controls
- the weight picker authors numeric values from `100` to `900`
- variable families expose stepped weight options across their supported range
- the bold button uses the same `400`/`800` toggle behavior as `Mod + B`
- the size and line-height row uses the same total control width as the four style buttons below it

## Font Management

Google Fonts support is split between a no-UI data layer and document/editor surfaces.

Data/runtime behavior:

- `src/fonts/` owns Google Fonts fetch/refresh tooling, bundled catalog loading, normalization, search/filter/sort, weight resolution, document font-library helpers, and Google CSS2 URL generation
- Google catalog filtering and sorting runs locally against a bundled repo snapshot
- runtime/editor clients do not require a Google Fonts Developer API key; the key is only needed when refreshing the bundled catalog snapshot
- language filters map to Google `subsets`, but the UI groups them into human-readable buckets
- variable-font metadata is preserved, but variable-axis authoring UI is deferred

Editor behavior:

- a reusable `ManageFontsPanel` is available both as a standalone dialog and inside Settings
- the panel can:
  - browse Google Fonts
  - paginate Google catalog results with a selectable page size of `10`, `20`, or `50` families; the default is `10`
  - search by family, subset, and tag text
  - filter by language, category, favorites, and used state
  - default the language filter to `Western`
  - expose grouped language options such as `Western`, `Hebrew`, `Arabic`, `Cyrillic`, and `Other` instead of raw Google subset ids
  - persist browse search/filter state in browser storage so reopening the panel keeps the current query
  - hide variable fonts by default while debugging static-font flows
  - show the bundled catalog `last updated` timestamp above the browse results
  - add document fonts
  - remove unused document fonts
  - mark and unmark favorites
  - purge unused non-default, non-favorite families
  - preview document-library families inline with larger family/sample text
  - preview each family with a language-appropriate sample for the active language bucket when possible
  - keep compact metadata (`category`, language, usage, styles/variable) pinned on the opposite side of each row so the card height stays stable
  - preview only the currently visible Google catalog page with a lightweight shared stylesheet so browsing stays responsive

Loading/export behavior:

- the editor injects one shared Google Fonts stylesheet link for the current document font usage
- editor preview loading also includes document-library families so family names can preview in the picker before they are used on-canvas
- the management panel injects a second preview stylesheet only for the currently visible catalog page and document-library families
- static families request only the numeric weights currently authored in the document
- variable families request the authored weight range from the family metadata
- Google Fonts Developer API capability flags are sent as repeated `capability=` params, not a comma-joined value
- Google CSS2 family names are encoded directly through `URLSearchParams`; multi-word family names must not pre-replace spaces with `+` before serialization

Shadow controls in the inspector edit `distance` and `angle`, but the persisted document model continues to store shadow offsets as `shadowOffsetX` / `shadowOffsetY`. The shadow numeric inputs use compact fixed unit suffixes with tighter padding than the geometry fields: `blur`, `spread`, and `distance` render with `px`, and `angle` renders with `°`. Shadow angle is edited and displayed on a `0..360` scale; when stored offsets are read back into the inspector, negative `atan2()` results are normalized into that positive range. Like the geometry number fields, these numeric inputs keep a local draft while editing: clearing the field or typing an out-of-range number does not immediately commit to the model, and the field restores the last valid committed value on blur. Text and link shadows render via CSS `filter: drop-shadow(...)`; wrapper, image, and button shadows render via CSS `box-shadow`. A fully transparent authored shadow color suppresses shadow output entirely instead of serializing a no-op shadow declaration. Button shadows do not also receive a redundant filter shadow. Wrapper, image, and button border surfaces use `box-sizing: border-box`, and bordered fills are clipped to `padding-box` so the border reads as an outer stroke instead of painting over the background.

Unified border editors follow the same simplified treatment:

- border color uses the shared advanced color picker
- border width renders as a fixed `px` field without a unit dropdown
- border radius uses an explicit inline unit selector, supports `px` and `%`, and enforces a minimum of `0`
- border width preserves its implicit stored unit, and border radius preserves/edits its explicit `px` or `%` unit
- authored `0` border widths and `0` border radii suppress rendered border/radius CSS instead of serializing explicit zero-value declarations

Inspector geometry controls use single composite fields instead of raw freeform text. `X` and `Y` are fixed `px` fields, so they render a static suffix instead of a unit dropdown. Top-level wrappers with role `section`, `header`, or `footer` do not show `X` and `Y` at all, because their stage position is structural rather than freely authored. Wrappers with role `section`, `header`, `footer`, or `container` expose content-wrapper padding directly in the `Layout` section as four unit-selectable spacing inputs with inline directional-arrow icons. Wrapper padding supports `px`, `em`, and `rem`, and unit switching measures the live rendered padding edge before converting so the visible inset stays stable. `Width` and `Height` use one shared shell with an editable numeric/value segment and a unit-or-mode segment. Numeric values edit as `number + unit`; width keywords and height `auto` render as a single full-field mode trigger; height `aspect-ratio` stays in the same shell but uses a freeform value segment that accepts either a positive number or a simple ratio expression like `16/9`. Width numeric modes support `px` and `%`. Non-section height numeric modes support `px` and `%`. Section height is the only geometry control that also exposes viewport units, limited to `vh`, `vmin`, and `vmax`; `vw` is intentionally excluded because the current editor stage is not an iframe-backed viewport and cannot give components true stage-relative viewport semantics. Numeric geometry fields enforce a minimum of `0` on width and height. The numeric segment uses the browser number-input keyboard behavior while hiding native steppers, except for suggestion-enabled value fields that switch to a validated text input with decimal keyboard hints so the shared popup can use a single styled combobox surface. Shared controlled `Input` fields keep a local draft while focused, so users can temporarily clear or type an invalid value without losing the text immediately; when panel-level validation rejects the draft, blur restores the last committed external value. Composite numeric+unit fields such as border width/radius and font size follow the same policy instead of treating an empty draft as an immediate clear. These inspector composites now share the `ValueWithUnit` wrapper in `src/components/ui/value-with-unit.tsx`. Composite field shells keep one continuous outer border around the whole control; the shell uses the shared outer `focus-within` treatment, and the focused numeric or unit/mode segment only gets an accent-colored inner border instead of its own separate focus ring. Mixed-selection dashed styling is owned by that shared component instead of per-caller ad hoc classes. In the higher-contrast palettes, compact numeric values render at `12px` minimum and suffixes/modes render at `11px` minimum for legibility. Font size uses an inline suggestion dropdown anchored to the numeric field itself, so common sizes can be picked from the field chrome while preserving the current unit. Suggestion-enabled value fields use one styled listbox popup with combobox wiring instead of layering a browser `datalist` popup underneath editor chrome. The font-size suggestion list uses the same hover highlight treatment as other editor menus, uses slightly taller rows for easier scanning, includes a `72px` preset, and caps its height with an internal scrollbar. The unit/mode segment uses brighter text than the numeric value, and its dropdown chevron appears only on hover as a white overlay over the suffix area. Numeric field displays are capped to 2 decimal places and trim trailing zeroes. When switching between supported numeric units, or from keyword sizing into a numeric unit, the inspector measures the live rendered stage geometry and rewrites the numeric value through shared conversion helpers so the node keeps the same rendered size or position in the editor instead of only swapping suffixes. For section-height viewport conversion, editor viewport units resolve against the visible `.stage-shell` content area after editor chrome and stage padding, not the raw browser window. For `vmin` and `vmax`, conversion uses the smaller or larger dimension of that editor viewport. Font size (`px`/`em`/`rem`), wrapper padding (`px`/`em`/`rem`), button padding (`px`/`em`/`rem`), and border radius (`px`/`%`) use the same measured-reference conversion path: font-relative units resolve from computed font size, and border radius uses an average-dimension approximation when converting between pixels and percentages. Wrapper, image, and button box-shadow controls expose `blur`, `spread`, `distance`, and `angle`; text and link shadows stay filter-based and therefore do not expose spread. When converting spacing back to `px`, the committed pixel value is rounded to a whole number. If a control cannot obtain a trustworthy live reference, the authored value stays unchanged instead of being approximated from hidden fallback sizes. Committed values still serialize back to the existing model strings (`320px`, `fit-content`, `auto`, `aspect-ratio(16/9)`). For wrapper nodes with role `section`, `header`, or `footer`, the width control is hidden in the geometry grid while its slot stays reserved so the 2x2 geometry layout remains visually stable.

When a `section`, `header`, `footer`, or `container` is selected in the stage, or when any descendant inside that wrapper is selected, the editor draws a thin dashed accent-blue rectangle at the inner content boundary of that wrapper's padding box. The overlay is purely visual and exists to show where the content-wrapper padding starts and ends while editing nested content.

Deferred limitation: child `height: %` conversion inside `section` / `header` / `footer` wrappers remains intentionally unresolved in this stage. Those wrappers still render explicit authored height as `min-height` for editor growth behavior, so inspector conversion does not try to reinterpret that box as a reliable `%` height reference yet.

Editor resize and width/height field edits are isolated per axis. Changing one axis preserves the untouched axis as-authored, including keywords and non-pixel units. That means `height:auto` stays `auto` when width changes, `height:aspect-ratio(...)` stays authored when width changes, and keyword widths such as `fit-content` stay authored when only height changes. When a resized axis already uses a numeric unit, the editor preserves viewport-based units (`vw`, `vh`, `vmin`, `vmax`) and `px`, but converts `%` to concrete pixels on commit. Keywords remain preserved only on the untouched axis; if the keyword axis itself is explicitly resized, that axis is authored as a concrete size.

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

For self-target sticky guides in the editor preview, `durationMode=auto` uses the actual free space around the sticky node inside the owner's padded content box. Top-edge auto uses the free space below the node, bottom-edge auto uses the free space above the node, and both-edge auto renders those two guide heights independently instead of mirroring one distance to both sides.

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

## Animation Model

Animations are configured hierarchically with three levels of accessibility settings:

- `DocumentModel.animationSettings`: global defaults applied to all animations
- per-trigger settings: override global defaults for a specific trigger type
- per-animation settings: override both global and trigger-level defaults for an individual animation

All non-site nodes support a singular `animation?: AnimationDefinition` property:

- `WrapperNode` (section, header, footer, container)
- `TextLeaf`
- `ImageLeaf`
- `LinkLeaf`
- `ButtonLeaf`

`SiteNode` does not support animation.

### Trigger Types

Six trigger types are supported, each with preset effect constraints:

- `entrance` (viewEnter): animation plays when element enters viewport
- `ongoing` (viewEnter with loop): animation loops continuously while element is in viewport
- `scroll` (viewProgress): animation progresses with scroll position
- `click`: animation plays on click
- `hover`: animation plays on hover; entrance animations reverse on hover-out (alternate), ongoing animations obey `ongoingOnOut: 'reset' | 'keep'`
- `mouse` (pointerMove): animation progresses with pointer movement

Trigger types have inherent preset constraints; `keyframe` effects bypass trigger constraints and work with any trigger.

### Effect Types

Two effect types are supported:

- **Named effects**: wrap @wix/motion-presets types with a `kind: 'named'` discriminant. Named effects are constrained by trigger type.
- **Keyframe effects**: unrestricted CSS keyframe definitions that work with any trigger type.

### Trigger and Target Separation

A `triggerId` field enables one element to trigger while another animates. The `triggerId` references a node id that owns the trigger gesture; if omitted, the animated node triggers itself.

### Hover Behavior

For `hover` trigger:
- entrance animations reverse on hover-out using alternate playback
- ongoing animations can be configured with `ongoingOnOut: 'reset'` (stop and reset to start) or `ongoingOnOut: 'keep'` (continue from current position)

### Sticky Requirement

The `requiresSticky` flag marks an animation that depends on the sticky subsystem being active. Animations with this flag do not function correctly if sticky is disabled on the document.

### Site Export

Exported HTML includes:

- `data-interact-key` attributes on animated nodes and trigger nodes for runtime animation hookup
- @wix/interact script injection to enable animation playback in the exported site
- `collectInteractKeys()` helper function to gather all interact keys from the document

### Development Console

In DEV mode, `window.playgroundAnimationApi` is available for testing and debugging animation state without going through the editor UI.

## Editor UX

Current UX includes:

- full-stage canvas
- insert panel
- inspector panel with a collapsible right rail in normal mode
- focused mode as editor chrome only; the first focused mode is `sticky`
- focused mode renders as a floating workspace surface and stays detached from the inspector collapsed/open state
- the focused floating panel can be dragged from its title area and is clamped against the window viewport below the top bar rather than against the stage; its default resting position still aligns with the pre-viewport workspace edge near the collapsed inspector, and its offset persists as editor UI state and does not enter undo history
- entering focused mode collapses the inspector automatically
- closing focused mode restores the inspector from its hidden state
- when the inspector is collapsed, the right-rail opener can temporarily reopen it without changing the collapsed preference; while focused mode is active that temporary inspector closes on mouseout after a short delay
- centered settings panel with a scrollable main body and sticky left anchor links for `UI`, `Import / Export`, `Advanced`, `Debug Info`, and `Shortcuts`
- intentional editor scroll containers such as the stage shell, inspector lists, focused-mode scrollers, settings body, and section-template popover use one shared guttered auto-hide scrollbar treatment; scrollbar gutter space stays reserved and the thumb only becomes visible on hover, focus-within, or active scroll interaction
- the settings `UI` section includes a compact editor theme mode control: `Light`, `Dark`, and `Auto`
- the settings `UI` section includes a compact palette selector for the currently active light or dark editor mode
- each palette option in the dropdown includes a one-line description
- light editor palettes are `Air`, `Paper`, `Midday`, and `Clarity`
- dark editor palettes are `Graphite`, `Monokai`, `Midnight`, and `Ink`
- the settings `UI` section includes an editor accent control with preset swatches plus a custom picker; the accent drives selected, focused, checked, and active editor chrome across light and dark mode
- the design system showcase reuses the same shared theme and accent controls as the editor settings UI so palette and accent behavior stay in lockstep
- `Midday` is the accent-derived light palette and pairs conceptually with `Midnight`
- `Clarity` and `Ink` are the higher-contrast light and dark palette options
- `Clarity` and `Ink` minimize decorative shadows/glows and use `2px` borders on form fields and interactive controls
- selecting `Paper` resets the shared editor accent to its warm default
- selecting `Monokai` resets the shared editor accent to its magenta default
- dark palettes keep neutral shells and use the accent on active chrome instead of tinting the full shell
- the settings `UI` section also includes a startup focused-mode selector: `Normal` or `Sticky`
- startup mode determines the focused mode on editor load; the previous session's transient focused-mode state does not override it
- left rail quick actions for sticky preview, spacer visibility, and snap-to-guides
- top bar utility actions for shortcut help and settings
- shortcut help dialog opened by `?`, generated from the shared shortcut registry and shared pointer-modifier gesture list
- shortcut guide also appears as the last section inside settings
- editor popups, panels, dialogs, and tooltips use the native CSS Popover API so they render in the browser top layer
- left pop panels (section templates + settings panel) close on outside click / `Esc` and stay above stage selection overlays
- the stage is a single keyboard focus scope: `Tab` walks selectable nodes in DOM order, the current primary selection scrolls into view when needed, and arrow keys nudge positioned components
- the stage suppresses native browser drag/drop and text-selection drag initiation inside the canvas so component moves always route through the editor drag system rather than the browser's HTML drag preview
- pointer selection does not commit drag/reparent work until the pointer moves beyond click jitter, so repeated clicks on auto-sized content do not remeasure layout as a drag
- intrinsic-height leaf nodes in the editor stage align to the start of their mesh slot instead of stretching to the full row span, so text selection boxes hug rendered copy
- the editor supports multi-selection:
  - `Cmd/Ctrl + Click` or `Shift + Click` toggles node membership
  - the first selected node remains the primary/master selection unless removed
  - a plain second click on any already-selected node in a multi-selection collapses the selection back to just that node
  - top-level structural wrappers with role `section`, `header`, or `footer` are single-select only and are removed from any attempted multi-selection set
  - dragging any already-selected node moves the current top-level multi-selection as one group and commits as one undoable action
  - multi-selection suppresses per-node label pills, renders the outer group box with the same treatment as the single-selection outline, and downgrades member boxes to a 1px outline with a subtle translucent fill
  - resize handles are hidden whenever more than one node is selected
  - dragging from empty stage space or from non-draggable top-level structural wrappers (`section`, `header`, `footer`) starts marquee selection
  - grouped drag is supported in v1; grouped resize and grouped reparent are not
  - single-step bulk edits still undo as one action even when they update multiple nodes
- auto-height wrapper sizing in the editor stage is measured from the inner content box, so dragging or repositioning selected nodes does not inflate surrounding header/section height by wrapper borders
- button focus states use a stronger visible ring across editor controls
- inspector sections that correspond to a focused mode can expose a small top-right `Go to mode` entry button with a tooltip; supported entry points are `Layout`, `Sticky`, `Content`, and `Design`
- `Sticky` uses the `Sticky focus mode` tooltip, and the other focused-mode entry buttons follow the same `X focus mode` pattern
- the floating focused-mode panel reuses the same inspector card chrome as the source section; it fills the shared section header leading slot with component name + type and replaces the header action with the close button
- focused modes are mutually exclusive editor UI states; entering one closes any other active focused mode
- top-level `section`, `header`, and `footer` wrappers keep the width field visible in the inspector, but the field is disabled when the authored width is locked to `100%`
- non-site single-node inspectors do not duplicate naming inside the inspector body; the sidebar chrome title itself is the editable node name surface
- the sidebar title is keyboard-focusable, enters edit mode on click or keyboard activation, commits on `Enter` or focus leaving the input, cancels on `Escape`, and resolves an empty commit back to the component type label
- sticky-capable single-node inspectors place `Sticky behavior` immediately after `Layout`; the multi-select inspector places `Sticky` immediately after `Layout`
- `Content` is the standard content-editing section title across leaf inspectors; text-bearing leaves split further into `Content`, `Text style`, and `Design`, while image uses `Content` and `Design`
- focused `Design` mode combines `Text style` + `Design` into one floating card for text/link/button nodes; wrappers and images render their existing `Design` card only
- when multiple nodes are selected, the sidebar switches to a dedicated multi-select inspector instead of reusing single-node inspector schemas
- multi-select controls use indeterminate visual states instead of rendering a literal `Mixed` label
- multi-select v1 groups are:
  - `Layout`: align left/center/right/top/middle/bottom using the first selected node as the alignment anchor, and distribute using horizontal/vertical gap spacing or left/right/top/bottom edge spacing with the outermost selected items on that axis as the fixed endpoints
  - `Reorder`: enabled only when all selected movable nodes share the same parent; section wrappers never participate in multi-selection, and reorder moves the selected set as one block while preserving relative order
  - `Typography`: shared text/link/button typography controls
  - `Text Design`: shared foreground color for text/link/button plus filter-shadow controls for text/link selections
  - `Surface Design`: shared background, border radius, and box-shadow controls for compatible surface nodes
  - `Sticky`: shared sticky enabled / edge / offset / duration controls for sticky-capable selections
- sticky focused mode can render the shared multi-select sticky card when multiple nodes are selected
- indeterminate multi-select values still commit to the compatible subset only when edited
- mixed wrapper/leaf bulk edits are dispatched as one reducer action so history captures them as one undoable step
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
- focused-mode state (`focusedMode`, `startupFocusedMode`, `inspectorCollapsed`, `temporaryInspectorOpen`, `focusedPanelOffset`) remains editor UI state only; it does not change document semantics, sticky math, stage rendering, or site export behavior.
- `focus-mode` URL overrides apply to editor UI initialization only. Supported values are `layout`, `sticky`, `content`, `design`, and `normal`/`none` for no focused mode.
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

Typography pairings:

- default header/footer chrome and `Post`: `Playfair Display` headings with `Inter` body/link styles
- `Sticky Staggered Images`: `Cormorant Garamond` headings with `Proza Libre` supporting copy
- `Sticky Pinned Cards`: `Poppins` lead heading with `Open Sans` body cards/copy
- `Sticky Media Reveal`: `Fraunces` heading with `Open Sans` narrative blocks
- `Sticky Edge Lab`: `Montserrat` heading/card labels with `Crimson Text` explainer copy

`Sticky Media Reveal` uses direct sticky image leaves (not wrapper containers around the media) seeded from a locked baseline: pinned media at `x=77`, `y=165`, size `401x428`, sticky `duration=150vh`, `offsetTop=10vh`; reveal backdrop at `x=78`, `y=167`, size `399x426`, sticky `duration=25vh`, `offsetTop=10vh`; narrative blocks at `y=313.640625`, `1035`, `1687` with updated copy, and section child order `heading -> pinned media -> narrative A/B/C -> reveal backdrop`.
`Post` keeps the editorial title/body/link stack clear with image/title/body/link anchors at `42/57`, `546/57`, `548/226.5`, and `549/350.40625`.
`Sticky Staggered Images` is seeded from the locked staggered-gallery structure. The image anchors are `64/256.96875`, `332/444.46875`, `610/653.25`, and `884/898.84375` with widths `250`, `248`, `248`, and `208`, and each image keeps the same `150vh` duration / `15vh` offset.
`Sticky Pinned Cards` is seeded from the locked pinned-cards baseline (pinned lead at `85/212.28125` with width `392`, lead copy at `83/490`, lead sticky `durationMode=auto` + `220vh` duration + `12vh` offset; narrative cards shift left to `x=500`, use width `468`, and keep sticky `25vh/25vh/50vh` durations at `15vh` offset).
`Sticky Edge Lab` is seeded as a 3-column top/both/bottom comparison. Only the three sticky card texts are wrapped in colored `container` wrappers, and sticky settings live on those card containers: top (`edges.top=true`, `offsetTop=10vh`, `durationTop=140vh`), both (`edges.top=true`, `edges.bottom=true`, `offsetTop=10vh`, `offsetBottom=10vh`, `durationTop=80vh`, `durationBottom=80vh`), and bottom (`edges.bottom=true`, `offsetBottom=10vh`, `durationBottom=140vh`). Baseline alignment is locked, including section height `2480px`, notes `y` values (`972`, `1293`, `1780`), sticky container anchors (`72/362`, `420/761`, `770/1179.9921875`), right-column notes at `x=770` with width `320`, and footer note at `x=96`, `y=2604.984375`.

Future-facing placeholders for scroll-driven animation templates are visible but non-insertable.

## Default Seed Content

Factory seed now uses:

- redesigned project-focused header
- text-only header branding (no header image)
- `Post` section template as the initial main section
- redesigned project-focused footer
- authored `Inter` defaults for inserted text, link, and button leaves

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
- sticky distance, offset, padding, and auto spacer guide colors are derived from the current editor accent instead of using fixed standalone hues
- snap toggle remains in the left rail with tooltip guidance for `Alt` drag inversion and a `Shift + G` shortcut
- sticky diagnostics output resolved by the shared sticky resolver using the same measured stage geometry the editor preview publishes
- reset stage action
- clear undo history action
- undo step retention control
- import / export controls in settings
- startup focused mode settings for `Normal`, `Layout`, `Sticky`, `Content`, and `Design`

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
