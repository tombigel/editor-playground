# API Reference

## Architecture Overview

The API layer is structured in three tiers:

- **`documentApi`** — Pure `DocumentModel → DocumentModel` functions. No side effects, no editor state. Safe to use in scripts, tests, and server-side contexts.
- **`editorApi`** — Wraps `documentApi` with editor state, selection management, and history concerns. The editor UI calls these variants.
- **`fontApi` / `siteApi` / `editorViewApi`** — Subsystem pass-throughs that re-export public surface from the `fonts/`, `site/`, and `stage/` subsystems respectively.

Every feature is achievable through the API layer without the editor UI.

---

## `src/api/documentApi.ts`

### Document lifecycle

| Function | Signature | Description |
|---|---|---|
| `createInitialDocument` | `() => DocumentModel` | Creates a blank document with default structure. |
| `cloneDocument` | `(document: DocumentModel) => DocumentModel` | Deep-clones a document. |
| `parseDocumentJson` | `(raw: string) => DocumentModel` | Parses and validates a JSON string into a `DocumentModel`; throws on invalid input. |
| `serializeDocumentJson` | `(document: DocumentModel) => string` | Serializes a `DocumentModel` to a formatted JSON string. |
| `validateDocument` | `(document: DocumentModel) => string[]` | Returns a list of validation error messages (empty = valid). |
| `applyDocumentCommands` | `(document: DocumentModel, commands: DocumentCommand[]) => DocumentModel` | Applies a batch of typed commands to a document in one pass. |

### Node mutations

| Function | Signature | Description |
|---|---|---|
| `insertWrapperDoc` | `(document, role: WrapperRole, parentId: NodeId) => DocumentModel` | Appends a new wrapper node as the last child of `parentId`. |
| `insertLeafDoc` | `(document, role: LeafRole, parentId: NodeId) => DocumentModel` | Appends a new leaf node as the last child of `parentId`. |
| `insertSectionTemplateBeforeFooter` | `(document, templateId: SectionTemplateId) => DocumentModel` | Inserts a section from a built-in template before the footer node. |
| `deleteNodeDoc` | `(document, nodeId: NodeId) => DocumentModel` | Removes a node and all its descendants. |
| `deleteNodesDoc` | `(document, nodeIds: NodeId[]) => DocumentModel` | Removes multiple nodes (and descendants); handles parent/child overlap gracefully. |
| `reorderNodeDoc` | `(document, nodeId: NodeId, action: NodeOrderAction) => DocumentModel` | Reorders a node among its siblings. |
| `reparentNodeDoc` | `(document, nodeId: NodeId, newParentId: NodeId) => DocumentModel` | Moves a node to a new parent; rejects invalid moves silently. |
| `setNodeRect` | `(document, nodeId, field: 'x'\|'y'\|'width'\|'height', value: string) => DocumentModel` | Sets a single rect dimension on a node. |
| `setNodeSticky` | `(document, nodeId, patch: Partial<StickyDefinition>) => DocumentModel` | Patches the sticky definition of a node. |
| `setNodeTextField` | `(document, nodeId, field: EditorTextField, value: string) => DocumentModel` | Sets a text or style field on a leaf node. |

### Node selectors

| Function | Signature | Description |
|---|---|---|
| `getNode` | `(document, nodeId) => DocumentNode \| undefined` | Returns the node for a given id. |
| `getChildren` | `(document, nodeId) => DocumentNode[]` | Returns the child nodes of a given node. |

### Sticky resolution

| Function | Signature | Description |
|---|---|---|
| `resolveStickyLayout` | `(document, ...) => StickyLayoutState` | Computes the full sticky layout state for a document. |
| `resolveWrapperStickyState` | `(document, nodeId) => ComputedWrapperStickyState` | Computes the resolved sticky state for a specific wrapper node. |

### Font management

| Function | Signature | Description |
|---|---|---|
| `addDocumentFontFamily` | `(document, family) => DocumentModel` | Adds a font family to the document font library. |
| `removeDocumentFontFamily` | `(document, familyId) => DocumentModel` | Removes a font family from the document font library. |
| `toggleDocumentFontFavorite` | `(document, familyId) => DocumentModel` | Toggles the favorite flag on a font family. |
| `purgeUnusedDocumentFonts` | `(document) => DocumentModel` | Removes font families that are not referenced by any node. |
| `getDocumentFontLibrary` | `(document) => FontLibrary` | Returns the document's font library. |
| `listDocumentFonts` | `(document) => FontFamily[]` | Lists all font families registered in the document. |
| `getFontUsage` | `(document) => FontUsage` | Returns a map of font usage across the document. |
| `isFontFamilyUsed` | `(document, familyId) => boolean` | Returns whether a font family is referenced by any node. |

### Unit utilities

| Function | Signature | Description |
|---|---|---|
| `parseUnitValue` | `(value: string) => UnitValue` | Parses a CSS unit string into a structured `UnitValue`. |
| `parseWidthValue` | `(value: string) => UnitValue` | Parses a width value string. |
| `parseHeightValue` | `(value: string) => UnitValue` | Parses a height value string. |
| `parseSpacingValue` | `(value: string) => UnitValue` | Parses a spacing value string. |
| `parseFontSizeValue` | `(value: string) => UnitValue` | Parses a font-size value string. |
| `resolveUnitValuePx` | `(value: UnitValue, context) => number` | Resolves a `UnitValue` to a pixel number given a layout context. |
| `formatValue` | `(value: UnitValue) => string` | Formats a `UnitValue` back to a CSS string. |

### Navigation helpers

| Function | Signature | Description |
|---|---|---|
| `getLinkHref` | `(node) => string` | Resolves the effective href string for a link or button node. |
| `shouldOpenNavigationInNewTab` | `(node) => boolean` | Returns whether a link should open in a new tab. |

### Section templates

| Constant | Description |
|---|---|
| `SECTION_TEMPLATES` | Array of built-in section template descriptors. |

### Exported types

| Type | Description |
|---|---|
| `DocumentModel` | The root document data structure. |
| `DocumentNode` | Union of all node types (`site`, `wrapper`, `leaf`). |
| `DocumentCommand` | Discriminated union of batch command types (`setRect`, `setSticky`, `setText`). |
| `NodeId` | Opaque string identifier for a node. |
| `NodeOrderAction` | `'back' \| 'forward' \| 'sendToBack' \| 'bringToFront'` |
| `WrapperNode` | A wrapper-type node. |
| `WrapperRole` | Union of wrapper role strings. |
| `WrapperStyleField` | Union of style field names applicable to wrappers. |
| `LeafRole` | Union of leaf role strings. |
| `EditorTextField` | Union of text/style field names settable via `setNodeTextField`. |
| `NodeTextField` | Subset of text fields for plain text nodes. |
| `StickyDefinition` | Sticky behaviour config shape. |
| `StickyGeometrySnapshot` | Snapshot of node geometry used during sticky resolution. |
| `StickyLayoutState` | Computed sticky layout state for a full document. |
| `ComputedWrapperStickyState` | Resolved sticky state for a single wrapper node. |

---

## `src/api/editorApi.ts`

Wraps `documentApi` and `editorStore` operations with editor state, selection, and history. The editor UI always calls these variants rather than `documentApi` directly.

### State lifecycle

| Function | Signature | Description |
|---|---|---|
| `createInitialState` | `() => EditorState` | Creates a blank editor state with default document. |
| `loadPersistedState` | `() => EditorState` | Loads editor state from local storage. |
| `persistState` | `(state: EditorState) => void` | Persists current editor state to local storage. |
| `persistDefaultDocument` | `(document: DocumentModel) => void` | Persists a document as the default on next load. |
| `clearSessionState` | `() => void` | Clears session-scoped storage. |
| `clearPersistedState` | `() => void` | Clears all persisted editor storage. |
| `createFactoryResetState` | `() => EditorState` | Returns a fresh state that discards all persisted data. |
| `parseImportedDocumentJson` | `(raw: string) => DocumentModel` | Parses an imported JSON string with migration applied. |
| `importDocument` | `(state, document: DocumentModel) => EditorState` | Replaces the current document, clears selection. |
| `getValidationErrors` | `(state: EditorState) => string[]` | Returns current document validation errors. |

### Selection

| Function | Signature | Description |
|---|---|---|
| `selectNode` | `(state, nodeId: NodeId \| null) => EditorState` | Sets the selection to a single node (or clears it). |
| `clearSelection` | `(state) => EditorState` | Clears the current selection. |
| `toggleNodeSelection` | `(state, nodeId: NodeId) => EditorState` | Adds or removes a node from the multi-selection. |
| `selectManyNodes` | `(state, nodeIds: NodeId[], mode: 'replace'\|'toggle') => EditorState` | Sets or toggles a multi-node selection. |

### Stage navigation

| Function | Signature | Description |
|---|---|---|
| `getStageSelectableNodeIds` | `(document: DocumentModel) => NodeId[]` | Returns all node ids that are selectable in the stage. |
| `getAdjacentStageSelection` | `(document, currentId, direction: 'forward'\|'backward') => NodeId \| null` | Returns the next/previous selectable node id for keyboard navigation. |

### Node mutations (editor-state variants)

| Function | Signature | Description |
|---|---|---|
| `insertWrapper` | `(state, role: WrapperRole) => EditorState` | Inserts a wrapper under the current selection context. |
| `insertLeaf` | `(state, role: LeafRole) => EditorState` | Inserts a leaf under the current selection context. |
| `insertSectionTemplate` | `(state, templateId: SectionTemplateId) => EditorState` | Inserts a section template before the footer. |
| `deleteNode` | `(state, nodeId: NodeId) => EditorState` | Deletes a node and updates selection. |
| `deleteNodes` | `(state, nodeIds: NodeId[]) => EditorState` | Deletes multiple nodes and updates selection. |
| `moveNode` | `(state, nodeId, dx: number, dy: number) => EditorState` | Moves a single node by a pixel delta. |
| `moveNodes` | `(state, nodeIds, dx: number, dy: number) => EditorState` | Moves multiple nodes by a pixel delta. |
| `nudgeNode` | `(state, nodeId, dx: number, dy: number) => EditorState` | Nudges a node (single-pixel keyboard move). |
| `resizeNode` | `(state, nodeId, dw: number, dh: number) => EditorState` | Resizes a node by a pixel delta. |
| `reorderNode` | `(state, nodeId, action: NodeOrderAction) => EditorState` | Reorders a node among its siblings. |
| `reorderNodes` | `(state, nodeIds, action: NodeOrderAction) => EditorState` | Reorders multiple nodes among their siblings. |
| `reparentNode` | `(state, nodeId, newParentId: NodeId) => EditorState` | Moves a node to a new parent. |
| `alignNodes` | `(state, nodeIds, alignment) => EditorState` | Aligns multiple nodes to a common edge or axis. |
| `distributeNodes` | `(state, nodeIds, axis) => EditorState` | Distributes multiple nodes with equal spacing. |
| `updateTextField` | `(state, nodeId, field: EditorTextField, value: string) => EditorState` | Sets a text or style field on a leaf node. |
| `updateRectField` | `(state, nodeId, field, value: string) => EditorState` | Sets a single rect dimension on a node. |
| `updateStickyField` | `(state, nodeId, patch) => EditorState` | Patches the sticky definition of a node. |
| `updateWrapperStyleField` | `(state, nodeId, field: WrapperStyleField, value) => EditorState` | Sets a style field on a wrapper node. |
| `requestPromoteWrapperRole` | `(state, nodeId) => EditorState` | Initiates a wrapper role promotion flow. |
| `confirmPromoteWrapperRole` | `(state) => EditorState` | Confirms a pending role promotion. |
| `cancelPromoteWrapperRole` | `(state) => EditorState` | Cancels a pending role promotion. |
| `demoteWrapperRole` | `(state, nodeId) => EditorState` | Demotes a wrapper to a plain container role. |

### Re-exported `documentApi` utilities

`editorApi` also re-exports these for convenience:

`SECTION_TEMPLATES`, `deleteNodeDoc`, `deleteNodesDoc`, `getNode`, `insertLeafDoc`, `insertWrapperDoc`, `parseUnitValue`, `reorderNodeDoc`, `reparentNodeDoc`, `resolveStickyLayout`, `resolveWrapperStickyState`, `serializeDocumentJson`

### Exported types

| Type | Description |
|---|---|
| `EditorState` | Full editor state shape (document + selection + UI flags). |
| `FocusedMode` | Union of editor focus mode strings. |
| `DocumentModel` | Re-exported from `documentApi`. |
| `DocumentNode` | Re-exported from `documentApi`. |
| `EditorTextField` | Re-exported from `documentApi`. |
| `NodeId` | Re-exported from `documentApi`. |
| `NodeOrderAction` | Re-exported from `documentApi`. |
| `StickyGeometrySnapshot` | Re-exported from `documentApi`. |
| `StickyLayoutState` | Re-exported from `documentApi`. |
| `SectionTemplateId` | Identifier for a built-in section template. |

---

## `src/api/fontApi.ts`

Pass-through re-exports from the `src/fonts/` subsystem.

### Font library management

| Export | Description |
|---|---|
| `addDocumentFontFamily` | Adds a font family to a document's font library. |
| `removeDocumentFontFamily` | Removes a font family from the document font library. |
| `toggleDocumentFontFavorite` | Toggles the favorite flag on a font family. |
| `purgeUnusedDocumentFonts` | Removes font families not referenced by any node. |
| `ensureDocumentFontFamily` | Ensures a font family entry exists by id. |
| `ensureDocumentFontFamilyByName` | Ensures a font family entry exists by name, adding it if absent. |
| `normalizeDocumentFontState` | Normalizes the font library state of a document (migration/repair). |
| `getDocumentFontLibrary` | Returns the document's font library object. |
| `getDocumentFontFamily` | Returns a specific font family from the document. |
| `getDocumentDefaultFontFamily` | Returns the document's default font family. |
| `getDocumentFontUsageMap` | Returns a map of font family id to usage count. |
| `getFontUsage` | Returns a summary of font usage across a document. |
| `isFontFamilyUsed` | Returns whether a font family is used by any node. |
| `listDocumentFonts` | Lists all font families in the document. |
| `listDocumentFontsForPicker` | Lists document fonts formatted for a font picker UI. |
| `createDefaultFontLibrary` | Creates a default font library object. |
| `getDefaultDocumentFontFamily` | Returns the default font family descriptor. |

### Google Fonts integration

| Export | Description |
|---|---|
| `fetchGoogleFontCatalog` | Fetches the full Google Fonts catalog from the API. |
| `loadGoogleFontsCatalog` | Loads the Google Fonts catalog (cached after first load). |
| `getCachedGoogleFontsCatalog` | Returns the in-memory cached catalog if available. |
| `getBundledGoogleFontsCatalog` | Returns the bundled (build-time) Google Fonts catalog. |
| `queryGoogleFontFamilies` | Queries font families by a structured `GoogleFontsQuery`. |
| `filterGoogleFontFamilies` | Filters a catalog by category, subset, or other criteria. |
| `searchGoogleFontFamilies` | Full-text searches font families by name. |
| `sortGoogleFontFamilies` | Sorts font families by a `GoogleFontSort` criterion. |
| `getGoogleFontFamily` | Looks up a single Google Font family by name. |
| `useGoogleFontsCatalog` | React hook — returns the catalog and loading state. |
| `buildGoogleFontsStylesheetHref` | Builds a Google Fonts stylesheet URL for arbitrary families. |
| `buildEditorGoogleFontsStylesheetHref` | Builds a Google Fonts stylesheet URL for editor-loaded fonts. |
| `buildDocumentGoogleFontsStylesheetHref` | Builds a Google Fonts stylesheet URL for fonts used in a document. |
| `buildFontPreviewStylesheetHref` | Builds a stylesheet URL for previewing a single font family. |
| `buildFontPickerPreviewStylesheetHref` | Builds a stylesheet URL for font picker preview rows. |
| `collectDocumentFontRequests` | Collects all font load requests needed for a document. |

### Font weight utilities

| Export | Description |
|---|---|
| `getSupportedFontWeights` | Returns supported weight values for a font family. |
| `resolveNearestSupportedFontWeight` | Resolves the nearest available weight to a target value. |
| `getFontWeightLabel` | Returns a human-readable label for a numeric font weight. |
| `listFontWeightOptions` | Lists all weight options for a font family. |
| `isBoldFontWeight` | Returns whether a weight value is considered bold. |
| `toggleBoldFontWeight` | Toggles between bold and normal weight values. |
| `parseFontWeightInput` | Parses a user-entered font weight string. |
| `buildFontFamilyStack` | Builds a CSS font-family stack string from a font family descriptor. |
| `DEFAULT_FONT_WEIGHT` | Default font weight constant. |
| `BOLD_FONT_WEIGHT` | Bold font weight constant. |
| `BOLD_ACTIVE_WEIGHT` | Active bold weight constant used by the editor. |

### Default fonts

| Export | Description |
|---|---|
| `DEFAULT_DOCUMENT_FONT_FAMILIES` | Array of font family names included in a new document by default. |

### Exported types

| Type | Description |
|---|---|
| `GoogleFontFamily` | Descriptor for a single Google Fonts family. |
| `GoogleFontSort` | Sort criterion for Google Fonts queries. |
| `GoogleFontsCatalog` | Full catalog shape returned by the Google Fonts API. |
| `GoogleFontsFetchOptions` | Options for `fetchGoogleFontCatalog`. |
| `GoogleFontsQuery` | Query shape for `queryGoogleFontFamilies`. |

---

## `src/api/siteApi.ts`

Pass-through re-exports from the `src/site/` subsystem.

### Site renderer component

| Export | Description |
|---|---|
| `SiteRenderer` | React component that renders a full site from a `DocumentModel`. |

### Site export / rendering

| Export | Description |
|---|---|
| `renderSiteBodyHtml` | Renders the `<body>` HTML string for a document. |
| `renderSiteCss` | Renders the CSS string for a document. |
| `renderSiteHtmlDocument` | Renders a complete standalone HTML document string. |
| `renderSiteExportBundle` | Returns a `SiteExportBundle` with all files needed to export a site. |
| `DEFAULT_SITE_HTML_FILE_NAME` | Default file name for the exported HTML file. |
| `DEFAULT_SITE_CSS_FILE_NAME` | Default file name for the exported CSS file. |

### Exported types

| Type | Description |
|---|---|
| `SiteRendererProps` | Props for the `SiteRenderer` component. |
| `SiteExportBundle` | Shape of the export bundle (map of file name → content). |
| `SiteExportOptions` | Options passed to `renderSiteExportBundle`. |

---

## `src/api/editorViewApi.ts`

Pass-through re-export from the `src/stage/` subsystem.

### Stage renderer component

| Export | Description |
|---|---|
| `Stage` | React component that renders the interactive stage (editor canvas). |

### Exported types

| Type | Description |
|---|---|
| `StageProps` | Props for the `Stage` component. |

---

## `src/api/types/index.ts`

Internal types shared across the `src/api/` subsystem.

### Exported types

| Type | Description |
|---|---|
| `DocumentCommand` | Discriminated union of batch document commands: `setRect`, `setSticky`, `setText`. |
