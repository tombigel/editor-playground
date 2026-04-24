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
- `moveNodeInTreeDoc(document, nodeId, targetParentId, targetIndex)`

## Geometry And Layout

### Rect Mutations

`setNodeRect(document, nodeId, field, value)` updates `x`, `y`, `width`, or `height` using CSS-like values.

### Sticky Behavior

- `setNodeSticky(document, nodeId, patch)`
- `setSiteNodeStickyElevation(document, enabled)`
- `resolveStickyLayout(document, snapshots)`
- `resolveWrapperStickyState(document, nodeId)`

### Visibility

`setNodeVisibilityDoc(document, nodeId, visible)` keeps visibility as a document concern rather than a renderer-only toggle.

## Why This Split Exists

Tree shape, layout, sticky state, and visibility are structural behaviors. They need pure API ownership so scripts, tests, migrations, and future tooling can reuse them without the current editor shell.
