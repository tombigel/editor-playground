# API Reference - Node and Layout

## Node CRUD

Primary source: `src/api/documentApi.ts`

### Insert Operations

- `insertContainerDoc(document, subtype, parentId)`
- `insertLeafDoc(document, role, parentId)`
- `insertTextDoc(document, parentId)`
- `insertMediaDoc(document, parentId)`
- `insertSectionTemplateDoc(document, templateId, options?)`

`insertLeafDoc` is the API-first insertion surface for editor leaf roles:
`text`, `heading`, `list`, `richtext`, `code`, `image`, `link`, and `button`.

### Delete Operations

- `deleteNodeDoc(document, nodeId)`
- `deleteNodesDoc(document, nodeIds)`

### Reorder And Reparent

- `reorderNodeDoc(document, nodeId, action)`
- `reparentNodeDoc(document, nodeId, newParentId)`
- `reparentNodeAtDoc(document, nodeId, newParentId, { x, y }, options?)`
- `reparentNodesAtDoc(document, newParentId, moves, options?)`
- `moveNodeInTreeDoc(document, nodeId, targetParentId, targetIndex)`

## Geometry And Layout

### Rect Mutations

`setNodeRect(document, nodeId, field, value)` updates `x`, `y`, `width`, or `height` using CSS-like values.

- `moveNodeDoc(document, nodeId, { x?, y? }, options?)` updates authored `x` / `y` coordinates without editor state.
- `moveNodesDoc(document, moves, options?)` applies multiple authored `x` / `y` coordinate updates in one pure document mutation.
- `expandParentHeightDoc(document, { parentId, minHeightPx })` grows a container height without moving children. Authored `auto` height is preserved.

The move and reparent-at-position helpers accept `options.parentExpansion?: { parentId, minHeightPx }`. Drag/drop uses this to commit child placement and parent height growth together for default `anchor` / Allow overflow downward drops. When the parent height is authored as `auto`, the movement still commits and the height remains `auto`.

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
