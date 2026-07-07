# API Reference - Node and Layout

## Node CRUD

Primary source: `src/api/documentApi.ts`

### Insert Operations

- `insertContainerDoc(document, subtype, parentId, options?)`
- `insertLeafDoc(document, role, parentId)`
- `insertTextDoc(document, parentId)`
- `insertMediaDoc(document, parentId)`
- `insertSectionTemplateDoc(document, templateId, options?)`

`insertLeafDoc` is the API-first insertion surface for editor leaf roles:
`text`, `heading`, `list`, `richtext`, `code`, `image`, `link`, and `button`.

`InsertContainerOptions` accepts `pageId` so pure section insertion can also attach the new section to a page without going through editor state.

### Delete Operations

- `deleteNodeDoc(document, nodeId)`
- `deleteNodesDoc(document, nodeIds)`

### Reorder And Reparent

- `reorderNodeDoc(document, nodeId, action)`
- `reorderNodesDoc(document, nodeIds, action)`
- `reparentNodeDoc(document, nodeId, newParentId)`
- `reparentNodeAtDoc(document, nodeId, newParentId, { x, y }, options?)`
- `reparentNodesAtDoc(document, newParentId, moves, options?)`
- `moveNodeInTreeDoc(document, nodeId, targetParentId, targetIndex)`
- `promoteWrapperRoleDoc(document, wrapperId, targetRole, options?)`
- `demoteWrapperRoleDoc(document, wrapperId)`
- `setContainerSemanticTypeDoc(document, nodeId, subtype)`
- `setContainerAriaLabelDoc(document, nodeId, value)`
- `groupNodesDoc(document, nodeIds)`
- `ungroupNodeDoc(document, groupId)`
- `convertGroupToContainerDoc(document, groupId)`

`PromoteWrapperRoleOptions` accepts `replaceExisting` for the editor's confirm-replace flow; request/cancel UI state remains editor-only.

Semantic container subtypes are `container`, `nav`, `aside`, and `article`. They share nesting, drag/drop, snapping, ordering, and design behavior, but render with the matching semantic HTML tag where applicable. `setContainerAriaLabelDoc` trims string values and clears the field when the value is empty.

Groups are editor control wrappers, not semantic containers. `groupNodesDoc` wraps selected sibling nodes in a `group`, consolidating selected groups into the new group and preserving visual placement through authored coordinate adjustment. `ungroupNodeDoc` removes only group wrappers and preserves child placement. `convertGroupToContainerDoc` is intentionally one-way: a group can become a plain `container`, but a container cannot become a group.

Group geometry is child-bound and editor-owned: authored group height remains `auto`, grouping/ungrouping/conversion preserve descendant placement, and renderer measurements must not feed measured group height back into the document. Editor stage interaction treats a group as a selectable/draggable wrapper first, then lets a second click select a child inside the already-selected group.

## Geometry And Layout

### Rect Mutations

`setNodeRect(document, nodeId, field, value)` updates `x`, `y`, `width`, or `height` using CSS-like values.

- `moveNodeDoc(document, nodeId, { x?, y? }, options?)` updates authored `x` / `y` coordinates without editor state.
- `moveNodesDoc(document, moves, options?)` applies multiple authored `x` / `y` coordinate updates in one pure document mutation.
- `expandParentHeightDoc(document, { parentId, minHeightPx })` grows a container height without moving children. Authored `auto` height is preserved.

The move and reparent-at-position helpers accept `options.parentExpansion?: { parentId, minHeightPx }`. Drag/drop uses this to commit child placement and parent height growth together for default `anchor` / Allow overflow downward drops. When the parent height is authored as `auto`, the movement still commits and the height remains `auto`.

### Alignment And Distribution

- `alignNodesDoc(document, nodeIds, mode, rects)` aligns siblings from supplied measured rectangles.
- `distributeNodesDoc(document, nodeIds, mode, rects)` distributes sibling positions from supplied measured rectangles.

`NodeAlignmentMode` is `'left' | 'center-x' | 'right' | 'top' | 'center-y' | 'bottom'`.
`NodeDistributionMode` is `'horizontal' | 'vertical' | 'left' | 'right' | 'top' | 'bottom'`.
`SelectionRect` is the measured `{ left, top, width, height }` rectangle that editor and scripted callers pass into these pure document mutations.

### Container Child Boundaries

- `resolveContainerChildBoundary(document, containerId)` returns a wrapper's child overflow policy, defaulting missing values to `'anchor'`.
- `setContainerChildBoundaryDoc(document, containerId, childBoundary)` writes the policy for a container node.

`ContainerChildBoundary` is `'anchor' | 'box'`. The inspector labels this setting **Child overflow**: `anchor` is shown as **Allow overflow** and keeps the child origin inside the container content box while allowing the child body to overflow; `box` is shown as **Keep inside** and keeps the full child box inside the content box.

### Sticky Behavior

- `setNodeSticky(document, nodeId, patch)`
- `setSiteNodeStickyElevation(document, enabled)`
- `resolveStickyLayout(document, snapshots)`
- `resolveWrapperStickyState(document, nodeId)`

### Visibility

`setNodeVisibilityDoc(document, nodeId, visible)` keeps visibility as a document concern rather than a renderer-only toggle.

## Why This Split Exists

Tree shape, layout, sticky state, and visibility are structural behaviors. They need pure API ownership so scripts, tests, migrations, and future tooling can reuse them without the current editor shell.
