# Playground Spec

This document captures the current editor and implementation model used by the sticky playground.

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

### Role promotion

A wrapper can be promoted or demoted between:

- `section`
- `header`
- `footer`

The wrapper keeps the same id.

If a header or footer already exists, promotion asks whether to demote the current one and replace it.

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
- snap guide colors:
  - component guides: teal
  - page guides: magenta

Resize behavior includes:

- `Shift` on corner handles to preserve the current aspect ratio
- resize start normalization to rendered box size when stored values are non-numeric (`auto`, `fit-content`, `%`, `aspect-ratio(...)`) to avoid first-frame jumps
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

Keyboard shortcuts (active only when a node is selected and no input field is focused):

- `Cmd + [`: position backward
- `Cmd + ]`: position forward
- `Cmd + Alt + [`: send to back
- `Cmd + Alt + ]`: bring to front

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

- top bar buttons: undo / redo
- shortcuts: `Cmd + Z`, `Cmd + Shift + Z`
- debug panel: clear undo history, configurable max retained undo steps

## Units

The model is breakpoint-ready, even though the current editor only exposes a base breakpoint.

Supported unit types:

- `x`, `y`: `px`, `%`, `vw`, `vh`
- `width`: unit value or `fit-content`
- `height`: unit value, `auto`, or `aspect-ratio(...)`

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
- for `container` wrappers, sticky `target` is temporarily fixed to `self` in the UI; `contentWrapper` target is hidden (implementation retained for future enablement)

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

For sticky containers:

- `target=self` applies sticky positioning to the container wrapper itself
- `target=contentWrapper` applies sticky positioning to the internal content wrapper
- when nested container `contentWrapper` sticky adds extra extent, parent mesh sizing includes that extent so scroll range and sticky duration stay consistent

## Preview Model

Sticky preview is CSS-native.

Bottom-edge self sticky uses inverted track spacer ordering (spacer before node) so viewport pinning remains stable during scroll.
For `edges: both`, preview applies both sticky constraints together (`top` and `bottom`) and uses split offsets (`offsetTop`, `offsetBottom`).
For `edges: both`, visual guides render top and bottom offsets together, and distance guides render both top and bottom tracks together.
Wrapper `target=self` sticky uses the same sticky-track/spacer pattern as leaf components for custom durations, including bottom-edge spacer ordering.
Wrapper `target=self` sticky also renders `Distance: auto` indicators in preview (including top/bottom labeling in `edges: both`).

JavaScript is used for:

- dragging
- resizing
- rebuilding editor structure

JavaScript is not used for live sticky movement during scroll.

## Editor UX

Current UX includes:

- full-stage canvas
- floating draggable/collapsible panels
- insert panel
- inspector panel
- debug panel
- left pop panels (section templates + debug tools) that close on outside click / `Esc` and stay above stage selection overlays
- drag, resize, reparenting, and snap guides
- inspector ordering controls with icon actions and tooltips
- in-memory incremental undo/redo
- local session persistence in `localStorage`

## Architecture Boundaries

- `src/model/*` is the domain layer (types, units, defaults, selectors, validation) and has no editor UI concerns.
- `src/editor/editorStore.ts` owns editor session state (`selectedId`, panel UI flags, persistence keys, undo-related state usage in app).
- `src/api/documentApi.ts` provides editor-agnostic document API primitives so document data can be manipulated from non-editor contexts (for example CLI scripts).
- `src/api/editorApi.ts` is the editor-facing API boundary used by app/panels; editor UI avoids direct imports from `src/model/*`.
- `src/site/SiteRenderer.tsx` is a site/runtime renderer detached from editor interactions (no drag/resize/selection logic).

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

- `Blank`
- `Post` (image + title + text)
- `Sticky Staggered Images`
- `Sticky Pinned Cards`
- `Sticky Media Reveal`
- `Sticky Edge Lab`

`Sticky Media Reveal` uses a direct sticky image leaf (not a wrapper container around the image) seeded from a locked baseline (image position/size and sticky `duration=100vh`, `offsetTop=10vh`).
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

## Validation Policy

Validation stays in the UI.

Invalid input is not written into the document model.

This applies especially to parsed unit fields.

## Debugging Aids

The playground exposes:

- spacer visuals
- offset visuals
- preview sticky toggle
- show spacers toggle
- sticky computation output
- reset stage action
- clear undo history action
- undo step retention control

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
