# Maintenance Test Plan

This plan is for keeping the playground stable while feature work is paused.

## Scope

1. Site model integrity (`src/model/*`)
2. Sticky math and structural ranges (`src/sticky/stickyCompute.ts`)
3. Editor interactions (`src/stage/*`, `src/panels/*`, `src/app/App.tsx`)

## Cadence

1. Run smoke checks before each maintenance release.
2. Run full regression once per week while in maintenance mode.
3. Run full regression after any dependency update or refactor touching model/sticky/editor logic.

## 1) Site Model Tests

### A. Document shape and validation

1. Create/load document with one site root and valid node references.
2. Validate: no leaf has children.
3. Validate: site only contains wrappers.
4. Validate: no direct `container` child under site.
5. Validate: max one `header` and one `footer`.
6. Validate: role nesting rules (`section/header/footer` cannot nest each other; containers can only hold containers + leaves).

### B. Role promotion/demotion

1. Promote section/container wrapper to header:
   Ensure role changes to `header`, parent becomes root, wrapper is first in root children.
2. Promote to footer:
   Ensure role changes to `footer`, parent becomes root, wrapper is last in root children.
3. Replace existing header/footer:
   Ensure old node demotes to `section`, promoted node moves correctly to root ordering.

### C. Tree mutations

1. Insert wrapper/leaf from each allowed selection context.
2. Reparent wrapper into valid/invalid targets.
3. Attempt cyclic reparent and verify it is rejected.
4. Delete parent node and verify descendants are removed.
5. If selected node is deleted via ancestor removal, selected state clears.
6. After reload, inserting new wrappers/leaves does not overwrite existing nodes (ID uniqueness is preserved).
7. After reload, inserting section templates does not mutate/overwrite existing sections (ID uniqueness is preserved).

## 2) Sticky Logic Tests

### A. Registration correctness

1. Sticky disabled node creates no registration.
2. Sticky leaf `target=self` registers against nearest wrapper.
3. Sticky wrapper `target=contentWrapper` registers against itself.
4. Node without wrapper ancestor is ignored safely.

### B. Duration and range

1. Custom duration resolves from units correctly (`px`, `%`, `vh`, `vw`).
2. Auto duration uses wrapper height.
3. `startPx` follows spacer-start rules:
   Wrapper content target starts at wrapper height, leaf/self starts at `y + nodeHeight`.
4. `endPx = startPx + durationPx`.
5. Container sticky target is currently restricted to `self` (UI-hidden `contentWrapper`); normalized container sticky behavior remains stable.
6. In `edges: both` + custom mode, effective registration distance uses `durationTop + durationBottom`.

### C. Extent and overlap behavior

1. For `contentWrapper`, extent is `max(0, endPx - wrapperHeight)` in custom mode.
2. Auto content-wrapper sticky does not add extra extent.
3. Multiple sticky registrations in one wrapper:
   `totalExtraExtentPx` equals the maximum extent, not sum of extents.
4. Parent layout expands correctly for child containers whose sticky `contentWrapper` adds extra extent.

### D. Edge cases

1. Missing/invalid numeric raw values fall back without crashes.
2. Aspect-ratio and auto heights compute stable fallback heights.
3. Empty document or document with only root wrapper references returns stable result shape.
4. Bottom-edge self sticky stays viewport-pinned during preview and does not drift off-screen while its duration spacer scrolls.
5. For `edges: both`, preview applies both sticky constraints (`top` + `bottom`) and drag/resize behavior stays stable without coordinate drift.
6. For bottom-edge self sticky with custom duration, offset and distance markers stay anchored near the pinned element (not at track origin) and dragging has no hidden upper clamp.
7. For `edges: both`, top and bottom offset markers are both visible simultaneously, and top/bottom distance markers are both visible with their own values.
8. Container `target=self` sticky (custom duration) follows the same track behavior as leaf components, including bottom-edge ordering and distance indicators.
9. Container `target=self` sticky (auto duration) shows `Distance: auto` indicators (and in `edges: both`, both top/bottom auto indicators are visible).
10. While sticky preview is enabled, self-sticky nodes render above overlapping non-sticky content (deterministic stacking order).

## 3) Editor Interaction Tests

### A. Selection and editing

1. Selecting wrapper/leaf updates inspector.
2. Editing text, dimensions, and sticky fields updates model and persists.
3. Invalid unit input stays local (not written into model).
4. For `edges: both`, editing top/bottom offsets and top/bottom durations updates the corresponding sticky fields (`offsetTop`, `offsetBottom`, `durationTop`, `durationBottom`).
5. For `edges: both`, dual-knob offset range slider keeps handles ordered (non-crossing) and maps correctly to `offsetTop` / `offsetBottom`.
6. For `container` wrappers, sticky target control exposes only `self` and does not allow selecting `contentWrapper`.
7. Non-sticky nodes remain selectable when they overlap with sticky track spacer regions (empty spacer area does not capture pointer events).

### B. Drag, resize, and drop

1. Drag leaf within same wrapper updates x/y.
2. Drag leaf to another wrapper reparents and updates local x/y.
3. Drag wrapper (non-top-level) repositions/reparents correctly.
4. Resize from all handles (`n`, `ne`, `e`, `se`, `s`, `sw`, `w`, `nw`) updates dimensions.
5. North/west resize also adjusts x/y anchor behavior.
6. Shift + drag locks to one axis (horizontal or vertical based on dominant delta).
7. Shift + corner resize preserves current aspect ratio.
8. Resize start on non-numeric size values (`auto`, `fit-content`, `%`, `aspect-ratio(...)`) does not jump on first pointer move.
9. Dropping a container over invalid targets never makes it disappear; if reparent is invalid, position updates in current parent.
10. While sticky preview is enabled, dragging/resizing sticky nodes does not introduce unintended `x`/`y` drift from sticky viewport offsets.
11. Repeated drag-start/drag-end cycles on bottom-edge sticky nodes do not accumulate extra Y offset (no per-drag `+distance` feedback loop).

### C. Ordering behavior

1. Reorder actions change parent `children` DOM order (not `z-index`).
2. Component reorder controls appear only for components (leaves + `container` wrappers), not `section/header/footer`.
3. Section wrappers expose dedicated DOM up/down controls in the role row and only swap with sibling sections (never across header/footer).
4. Section DOM up/down buttons are disabled at section bounds (no previous/next section sibling).
5. Inspector icon actions perform expected movement:
   Position forward, bring to front, position backward, send to back.
6. Keyboard shortcuts (when node selected and no field focused):
   `Cmd + [`, `Cmd + ]`, `Cmd + Alt + [`, `Cmd + Alt + ]`.

### D. Sticky preview and debug UX

1. Sticky preview toggle applies/removes CSS sticky behavior.
2. Spacer visibility modes (`selected`, `all`) filter visuals correctly.
3. Grid lane toggle draws mesh guides without layout side effects.
4. Debug panel shows validation errors and sticky math for active document.
5. Debug undo controls work:
   Clear undo empties history, and undo-step limit updates cap retention.
6. Left-side pop panels close on outside click and `Esc`:
   section templates panel and debug tools panel.
7. Left-side pop panels render above selected stage overlays.

### E. Snap behavior

1. With snap enabled, drag snaps to page bounds and centers:
   left/right/top/bottom and page horizontal/vertical center.
2. With snap enabled, drag also snaps to nearby element top/center/bottom anchors.
3. Guide colors match source:
   component guides are teal, page guides are magenta.
4. With snap disabled, no snap guides are shown and drag is free.
5. Holding `Alt` during drag reverses current snap behavior (temporary invert).

### F. Persistence and reset

1. Reload restores persisted state.
2. Default document seeding is stable when no stored defaults exist.
3. Reset stage clears persisted state and returns to factory baseline.

### G. Undo / Redo History

1. With canvas/non-interactive focus, `Cmd + Z` performs app undo.
2. With canvas/non-interactive focus, `Cmd + Shift + Z` performs app redo.
3. Top-bar undo/redo buttons match shortcut behavior and disabled states.
4. Undo/redo restores:
   node properties, parent-child order, selection, and pending role-swap state.
5. Resize interactions create a single undo transaction on release (mouse up/leave), not on every resize frame.
6. Move and non-text data updates create a new undo transaction per action (no same-type transaction merging).
7. Text field editing is history-debounced:
   typing continuous characters should not create one undo step per keypress.
8. History limit is enforced: past stack length never exceeds configured max.
9. While focused in input/textarea fields, `Cmd + Z` / `Cmd + Shift + Z` still uses app history:
   native browser text undo/redo is intercepted and does not run.
10. History remains in memory only:
   reloading the app clears undo/redo stacks while persisted document state remains.

### H. Section templates

1. Clicking `Section` in the add rail opens template picker; it does not insert immediately.
2. Picker displays template cards in a 2-column layout.
3. Picker is a compact left-side panel and remains visually above selected stage overlays.
4. Clicking an active template inserts exactly one section and selects it.
5. Inserted section is placed before footer in root ordering when footer exists.
6. Placeholder/coming-soon templates are visible but cannot be inserted.
7. All shipped templates load without validation errors:
   `Blank`, `Post`, `Sticky Staggered Images`, `Sticky Pinned Cards`, `Sticky Media Reveal`, `Sticky Edge Lab`.
8. `Sticky Media Reveal` template uses direct sticky image leaves (no container wrappers around the media) and matches the locked baseline:
   pinned media at `x=77`, `y=165`, size `401x428` with sticky `duration=150vh`, `offsetTop=10vh`;
   reveal backdrop at `x=78`, `y=167`, size `399x426` with sticky `duration=25vh`, `offsetTop=10vh`;
   narrative blocks match `y=313.640625`, `1035`, and `1687` with updated copy; section child order is
   heading, pinned media, narrative A/B/C, then reveal backdrop.
9. `Sticky Staggered Images` template matches the locked gallery baseline:
   heading/copy/image coordinates plus per-image sticky `duration=150vh`, `offsetTop=15vh`.
10. `Sticky Pinned Cards` template matches the locked pinned-cards baseline:
   pinned lead coordinates `x=85`, `y=212.28125`, lead sticky `durationMode=auto`, `duration=220vh`, `offsetTop=12vh`,
   and narrative cards use sticky durations `25vh`, `25vh`, `50vh` with `offsetTop=15vh`.
11. `Sticky Edge Lab` template demonstrates side-by-side edge comparison in one section:
   only the three sticky card texts are wrapped by colored `container` wrappers, and sticky lives on those three card containers:
   top (`edges.top=true`, `offsetTop=10vh`, `durationTop=140vh`), both
   (`edges.top=true`, `edges.bottom=true`, `offsetTop=10vh`, `offsetBottom=10vh`, `durationTop=80vh`, `durationBottom=80vh`),
   bottom (`edges.bottom=true`, `offsetBottom=10vh`, `durationBottom=140vh`).
   Baseline geometry/order is locked: section height `2480px`; non-sticky text order starts with `Both Column Notes`, then heading/intro/notes; sticky containers follow in order top/both/bottom; footer note is last.
   Locked coordinates include: top notes `y=972`, both notes `y=1293`, bottom notes `y=1780`, footer note `x=96`, `y=2604.984375`, and sticky containers at `x/y` top `72/362`, both `473/761`, bottom `864/1179.9921875`.

### I. Factory baseline shell

1. Factory default includes one project-focused header, one main section, and one project-focused footer.
2. Factory default main section is seeded from `Post` template.
3. Header/footer seed text relates to Sticky Playground (not generic business placeholder copy).
4. Legacy untouched default shell (old header/footer seed) auto-migrates to the new baseline on load.
5. Header is text-only (no brand image) and primary text is inset from header edges.
6. Footer title/body/repository-link blocks keep vertical separation and never overlap at default stage width.

### J. Architecture boundaries

1. `src/model/*` compiles without importing from `src/app/*`, `src/panels/*`, `src/stage/*`, or `src/editor/*`.
2. Editor UI surfaces (`src/app/*`, `src/panels/*`) use API facade imports (`src/api/*`) and do not import model/stage modules directly.
3. `src/site/SiteRenderer.tsx` has no editor interaction dependencies (`DragController`, `ResizeController`, selection overlays, panel state).
4. `src/api/documentApi.ts` supports document-level mutation/validation utilities using `DocumentModel` only (no `EditorState` requirement), enabling CLI/non-UI usage.

## Regression Exit Criteria

Maintenance release is acceptable only if all are true:

1. `npm run build` passes.
2. Site model smoke tests pass.
3. Sticky logic smoke tests pass.
4. Editor interaction smoke tests pass.
5. No new console errors during manual interaction pass.
