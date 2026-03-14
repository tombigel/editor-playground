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

### C. Extent and overlap behavior

1. For `contentWrapper`, extent is `max(0, endPx - wrapperHeight)` in custom mode.
2. Auto content-wrapper sticky does not add extra extent.
3. Multiple sticky registrations in one wrapper:
   `totalExtraExtentPx` equals the maximum extent, not sum of extents.

### D. Edge cases

1. Missing/invalid numeric raw values fall back without crashes.
2. Aspect-ratio and auto heights compute stable fallback heights.
3. Empty document or document with only root wrapper references returns stable result shape.

## 3) Editor Interaction Tests

### A. Selection and editing

1. Selecting wrapper/leaf updates inspector.
2. Editing text, dimensions, and sticky fields updates model and persists.
3. Invalid unit input stays local (not written into model).

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

### C. Ordering behavior

1. Reorder actions change parent `children` DOM order (not `z-index`).
2. Reorder controls appear only for components (leaves + `container` wrappers), not `section/header/footer`.
3. Inspector icon actions perform expected movement:
   Position forward, bring to front, position backward, send to back.
4. Keyboard shortcuts (when node selected and no field focused):
   `Cmd + [`, `Cmd + ]`, `Cmd + Alt + [`, `Cmd + Alt + ]`.

### D. Sticky preview and debug UX

1. Sticky preview toggle applies/removes CSS sticky behavior.
2. Spacer visibility modes (`selected`, `all`) filter visuals correctly.
3. Grid lane toggle draws mesh guides without layout side effects.
4. Debug panel shows validation errors and sticky math for active document.
5. Debug undo controls work:
   Clear undo empties history, and undo-step limit updates cap retention.

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

## Regression Exit Criteria

Maintenance release is acceptable only if all are true:

1. `npm run build` passes.
2. Site model smoke tests pass.
3. Sticky logic smoke tests pass.
4. Editor interaction smoke tests pass.
5. No new console errors during manual interaction pass.
