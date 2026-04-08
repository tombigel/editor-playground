# API Reference

## Table of Contents

- [Architecture Overview](#architecture-overview)
- [`src/api/documentApi.ts`](#srcapidocumentapits)
- [`src/api/textConversion.ts`](#srcapitextconversionts)
- [`src/api/textMerge.ts`](#srcapitextmergets)
- [`src/api/editorApi.ts`](#srcapieditorapits)
- [`src/api/fontApi.ts`](#srcapifontapits)
- [`src/api/siteApi.ts`](#srcapisiteapits)
- [`src/api/editorViewApi.ts`](#srcapieditorviewapits)
- [`src/api/dragDropApi.ts`](#srcapidragdropapits)
- [`src/api/animationApi.ts`](#srcapianimationapits)
- [`src/api/types/index.ts`](#srcapitypesindexts)

## Architecture Overview

The API layer is structured as multiple modules:

- **`documentApi`** — Pure `DocumentModel → DocumentModel` functions. No side effects, no editor state. Safe to use in scripts, tests, and server-side contexts.
- **`textConversion`** — Pure text-subtype conversion helpers used by `documentApi` to keep conversion policy explicit and reusable.
- **`textMerge`** — Pure structure-changing text helpers used by `documentApi` for rich-text split and multi-node merge flows.
- **`editorApi`** — Wraps `documentApi` with editor state, selection management, and history concerns. The editor UI calls these variants.
- **`dragDropApi`** — Pure headless drag-and-drop session lifecycle and drag resolution utilities for editor canvases.
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
| `setTextNodeContentDoc` | `(document, nodeId, field: EditorTextField, value: string) => DocumentModel` | Canonical pure text-field mutator for text, code, link, button, and image leaves; editor flows delegate to it instead of duplicating field logic. |
| `setRichTextContentDoc` | `(document, nodeId, content: RichContent) => DocumentModel` | Canonical pure rich-text content mutation. Normalizes legacy flat inline arrays into the supported block-rooted `RichContent` subset before persisting. |
| `setListContentDoc` | `(document, nodeId, content: ListContent) => DocumentModel` | Canonical pure list-content mutation. Normalizes authored list payloads into the supported phase-1 `ul`, `ol`, or `dl` shapes before persisting. |
| `setCodeBlockLanguageDoc` | `(document, nodeId, language: string) => DocumentModel` | Dedicated pure code-language mutator layered over the canonical text mutation path. |
| `setCodeBlockThemeDoc` | `(document, nodeId, theme: string) => DocumentModel` | Dedicated pure code-theme mutator layered over the canonical text mutation path. |
| `setTextDirectionDoc` | `(document, nodeId, direction: 'ltr' \| 'rtl') => DocumentModel` | Dedicated pure text-direction mutator layered over the canonical text mutation path. |
| `normalizeTextNodeDoc` | `(document, nodeId) => DocumentModel` | Normalizes one text node according to its subtype invariants in the pure API layer. |
| `convertTextNodeDoc` | `(document, nodeId, targetSubtype: TextSubtype, options?: TextConversionOptions) => DocumentModel` | Explicit pure converter for `block`, `rich`, `code`, and `list` text nodes. |
| `switchTextSubtypeDoc` | `(document, nodeId, targetSubtype: TextSubtype, options?: TextConversionOptions) => DocumentModel` | Thin wrapper over `convertTextNodeDoc` used by editor flows that switch text subtypes. |
| `splitRichTextNodeDoc` | `(document, nodeId) => DocumentModel` | Splits one rich text node into one or more sibling text nodes using rich block boundaries. |
| `mergeTextNodesToRichDoc` | `(document, nodeIds, options?: MergeTextNodesOptions) => DocumentModel` | Merges sibling text nodes into one rich node while preserving tree order for content assembly. |

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
| `EditorTextField` | Union of text/style field names settable via `setTextNodeContentDoc`. |
| `MergeTextNodesOptions` | Optional merge options including `survivorNodeId` for choosing which existing node keeps geometry and identity. |
| `TextSubtype` | `'block' \| 'rich' \| 'code' \| 'list'` |
| `TextConversionMode` | `'auto' \| 'flatten' \| 'split'` | Explicit text conversion policy mode. `split` delegates rich multi-block content to the pure rich splitter instead of flattening. |
| `NodeTextField` | Subset of text fields for plain text nodes. |
| `StickyDefinition` | Sticky behaviour config shape. |
| `StickyGeometrySnapshot` | Snapshot of node geometry used during sticky resolution. |
| `StickyLayoutState` | Computed sticky layout state for a full document. |
| `ComputedWrapperStickyState` | Resolved sticky state for a single wrapper node. |

### Common value reference

These unions show up repeatedly across `documentApi` signatures and returned data.

| Type / field | Allowed values | Notes |
|---|---|---|
| `WrapperRole` | `'section' \| 'header' \| 'footer' \| 'container'` | Structural wrappers. |
| `LeafRole` | `'text' \| 'image' \| 'link' \| 'button'` | Leaf/content nodes. |
| `SectionTemplateId` | `'blank' \| 'post' \| 'stickyStaggeredImages' \| 'stickyPinnedCards' \| 'stickyMediaReveal' \| 'stickySteps'` | `stickySteps` is the internal id for the template labeled `Sticky Edge Lab`. |
| `NodeOrderAction` | `'back' \| 'forward' \| 'sendToBack' \| 'bringToFront'` | Used by reorder helpers in both `documentApi` and `editorApi`. |
| `setNodeRect.field` | `'x' \| 'y' \| 'width' \| 'height'` | `x`/`y` are position; `width`/`height` accept the same string formats the model stores. |
| `StickyDefinition.target` | `'self' \| 'contentWrapper'` | `contentWrapper` is meaningful for wrappers only; leaves effectively use `self`. |
| `StickyDefinition.durationMode` | `'auto' \| 'custom'` | `auto` derives distance from available space; `custom` uses authored duration values. |
| `NodeTextField` | `'name' \| 'content' \| 'htmlTag' \| 'lang' \| 'label' \| 'linkType' \| 'anchorTargetId' \| 'href' \| 'openInNewTab' \| 'targetPageId' \| 'pageAnchorId' \| 'src' \| 'alt' \| 'codeLanguage' \| 'codeTheme'` | Content / metadata fields for text-capable leaves, links, buttons, code blocks, and images. |
| `LinkKind` | `'anchor' \| 'external' \| 'page'` | Used by `linkType` on links and buttons. |
| `TextLeaf.htmlTag` | `'h1' \| 'h2' \| 'h3' \| 'h4' \| 'h5' \| 'h6' \| 'p' \| 'blockquote' \| 'div'` | Semantics for text leaves. |
| `TypographyStyle.fontStyle` | `'normal' \| 'italic'` | Text, link, and button typography. |
| `TypographyStyle.textDecorationLine` | `'none' \| 'underline' \| 'line-through' \| 'underline line-through'` | Supports combined underline + strikethrough. |
| `TypographyStyle.direction` | `'ltr' \| 'rtl'` | Writing direction. |
| `TypographyStyle.textAlign` | `'left' \| 'center' \| 'right'` | Horizontal alignment for text-bearing leaves. |
| `TextWrapMode` | `'single-line' \| 'wrap'` | Used by links and buttons. |
| `DocumentCommand.type` | `'setRect' \| 'setSticky' \| 'setText'` | Batch command discriminator for `applyDocumentCommands`. |

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

`SECTION_TEMPLATES`, `deleteNodeDoc`, `deleteNodesDoc`, `getNode`, `insertLeafDoc`, `insertWrapperDoc`, `parseUnitValue`, `reorderNodeDoc`, `reparentNodeDoc`, `resolveStickyLayout`, `resolveWrapperStickyState`, `serializeDocumentJson`, `setTextNodeContentDoc`, `setRichTextContentDoc`, `setListContentDoc`, `setCodeBlockLanguageDoc`, `setCodeBlockThemeDoc`, `setTextDirectionDoc`, `normalizeTextNodeDoc`

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

### Editor-specific value reference

| Function / type | Allowed values | Notes |
|---|---|---|
| `selectManyNodes(..., mode)` | `'replace' \| 'toggle'` | `replace` overwrites the current multi-selection; `toggle` adds/removes ids. |
| `getAdjacentStageSelection(..., direction)` | `'forward' \| 'backward'` | DOM-order stage traversal. |
| `alignNodes(..., alignment)` | `'left' \| 'center-x' \| 'right' \| 'top' \| 'center-y' \| 'bottom'` | Shared with keyboard shortcuts and reducer actions. |
| `distributeNodes(..., axis)` | `'horizontal' \| 'vertical' \| 'left' \| 'right' \| 'top' \| 'bottom'` | Gap distribution (`horizontal`/`vertical`) or edge distribution. |
| `FocusedMode` | `null \| 'layout' \| 'sticky' \| 'content' \| 'design'` | `null` means normal mode with no focused floating panel. |
| `EditorState.ui.spacerVisibility` | `'selected' \| 'all'` | Drives spacer debugging overlays. |
| `EditorState.ui.animationPreview.mode` | `'passive' \| 'interactive'` | Passive previews autoplay supported triggers; interactive previews wait for user input. |
| `EditorState.ui.animationPreview.triggers` | `entrance`, `ongoing`, `scroll`, `mouse`, `click`, `hover` keys mapped to `boolean` | Canonical editor preview trigger set. |

---

## `src/api/textConversion.ts`

Pure helper module for text subtype conversion policy. `documentApi` re-exports the public conversion functions so consumers can stay on the main API surface while the conversion rules remain isolated and testable.

### Text conversion

| Function / type | Signature / values | Description |
|---|---|---|
| `convertTextNodeDoc` | `(document, nodeId, targetSubtype: TextSubtype, options?: TextConversionOptions) => DocumentModel` | Converts a text node between `block`, `rich`, `code`, and `list`. `block -> list` splits hard line breaks into unordered items, `list -> code` emits markdown-like list text, and `list -> rich` currently flattens into paragraph blocks to preserve the rich-text block invariants. |
| `switchTextSubtypeDoc` | `(document, nodeId, targetSubtype: TextSubtype, options?: TextConversionOptions) => DocumentModel` | Alias-style wrapper for subtype switching flows. |
| `TextConversionMode` | `'auto' \| 'flatten' \| 'split'` | `auto` applies the default conversion policy, `flatten` explicitly degrades richer structures into plain text, and `split` delegates rich multi-block content to `splitRichTextNodeDoc()`. |
| `TextConversionOptions` | `{ mode?: TextConversionMode }` | Options bag for explicit conversion behavior. |
| `normalizeCodeLanguage` | `(language: string) => string` | Normalizes unsupported code languages to `plaintext` for stable highlighting. |

### List content semantics

- `ListContent` is a first-class text payload used by `subtype: 'list'`.
- Supported phase-1 wrappers are `ul`, `ol`, and `dl`.
- `ul` and `ol` items persist as second-level list items with per-item `text`, `direction`, and optional `link`.
- `ol` also persists a `start` value and a predefined marker style.
- `dl` persists `term` / `description` pairs with optional shared link metadata for the pair.
- Nested lists are rejected by normalization and validation in phase 1.

---

## `src/api/textMerge.ts`

Pure helper module for structure-changing text operations. `documentApi` re-exports these APIs so consumers can stay on the main pure API surface.

### Split and merge

| Function / type | Signature / values | Description |
|---|---|---|
| `splitRichTextNodeDoc` | `(document, nodeId) => DocumentModel` | Splits a rich node at block boundaries. A single block is converted in place; multiple blocks keep the original node as the first split node and append newly generated sibling text nodes after it. |
| `mergeTextNodesToRichDoc` | `(document, nodeIds, options?: MergeTextNodesOptions) => DocumentModel` | Merges same-parent sibling text nodes into one rich node. Content order follows parent tree order, not caller order. |
| `MergeTextNodesOptions` | `{ survivorNodeId?: NodeId }` | Optional surviving anchor node. The survivor keeps identity, geometry, and shared authored styling while absorbed siblings are removed. |

### Deterministic behavior

- `splitRichTextNodeDoc()` currently maps rich blocks to standalone block text nodes because the rich schema does not yet persist embedded list or code blocks.
- `convertTextNodeDoc(..., { mode: 'split' })` delegates rich multi-block content to `splitRichTextNodeDoc()` when converting away from `rich`.
- `mergeTextNodesToRichDoc()` rejects mixed-parent selections and leaves the document unchanged in that case.

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
| `Stage` | React component that renders the interactive stage (editor canvas) and suppresses native browser drag/drop so editor pointer-drag logic remains authoritative. |

### Exported types

| Type | Description |
|---|---|
| `StageProps` | Props for the `Stage` component. |

---

## `src/api/dragDropApi.ts`

Pure headless drag-and-drop session lifecycle and drag resolution helpers for editor canvases. This module is DOM-free and can be driven from any renderer or input adapter.

`dragDropApi` is intentionally DOM-agnostic: it only consumes a `DragStartContext` with pre-measured geometry and a `DragUpdateInput` stream. Public drag-drop types live in `src/api/types.ts` and are re-exported from `dragDropApi` for convenience.

### Session lifecycle

| Function | Signature | Description |
|---|---|---|
| `beginDragSession` | `(context: DragStartContext) => DragSession` | Starts a drag session from a document snapshot, pointer origin, and pre-measured geometry. |
| `updateDragSession` | `(session: DragSession, input: DragUpdateInput) => DragSession` | Advances a drag session with pointer and modifier updates, including thresholding, snapping, drop resolution, and bounds clamping. |
| `finishDragSession` | `(session: DragSession, input: DragUpdateInput) => DragCommitIntent` | Resolves the final drag commit as `none`, `move`, `moveSelection`, or `reparent`. |
| `cancelDragSession` | `(session: DragSession \| null) => null` | Cancels an in-flight session without producing a commit. |

### Drag resolution rules

- Multi-selection is reduced to top-level ids first.
- If a parent and child are both selected, dragging resolves to the parent only.
- Grouped dragging is allowed only when all resolved drag ids share the same parent; otherwise the session falls back to a single anchor drag.
- Coordinates are measured from wrapper content boxes, not border boxes, and move/reparent commits clamp fully inside the target content box.
- Drop highlighting resolves to the deepest valid hovered target.
- Standard in-parent child drags do not highlight the source parent wrapper, and while the pointer remains inside that source parent, ancestor wrappers are not promoted as highlights.
- Container-wrapper drags are the exception: the structural source parent (`section`/`header`/`footer`) may highlight to indicate structural reparent intent.
- `Shift` axis-locks before snapping.
- `Alt` inverts the ambient snap toggle during drag.
- Invalid hovered targets fall back to moving inside the current parent.

### Geometry and exported types

| Type | Description |
|---|---|
| `DragPreviewItem` | One visual preview item in the drag ghost, including offset and size. |
| `DragGuide` | A resolved snap guide with value and source (`component` or `page`). |
| `DragDropTarget` | A valid droppable wrapper target with measured content-box bounds and depth/order metadata. |
| `DragGeometrySnapshot` | Pre-measured drag geometry: preview items, source offsets, source content box, snap targets, and drop targets. |
| `DragStartContext` | Input required to begin a drag session: document, anchor id, current selection, start pointer, and geometry snapshot. |
| `DragUpdateInput` | Pointer coordinates plus `Shift`, `Alt`, and `snapEnabled` state for one drag update. |
| `DragSession` | Headless session state, including phase, resolved drag ids, preview position, guides, and highlighted drop target. |
| `DragCommitIntent` | Final drag outcome: `none`, `move`, `moveSelection`, or `reparent`. |
| `DocumentModel` | Re-exported document model type from `documentApi`. |
| `DocumentNode` | Re-exported node union type from `documentApi`. |
| `NodeId` | Re-exported node id type from `documentApi`. |

---

## `src/api/animationApi.ts`

Pass-through re-exports from the `src/animations/` subsystem. Built against `@wix/interact@2.1.4` and `@wix/motion-presets`.

### Version

| Export | Description |
|---|---|
| `INTERACT_VERSION` | Semver string of the `@wix/interact` version this API targets (`'2.1.4'`). |

### High-level API (preferred)

All mutating functions are pure `DocumentModel → DocumentModel`.

| Function | Signature | Description |
|---|---|---|
| `setPresetAnimation` | `(doc, target, { trigger, preset, options?, source?, outAction?, reducedMotion?, requiresSticky? }) → DocumentModel` | Sets a named preset animation on a node. Validates preset/trigger compatibility. |
| `setKeyframeAnimation` | `(doc, target, { trigger, name, keyframes, duration?, easing?, source?, outAction?, reducedMotion?, requiresSticky? }) → DocumentModel` | Sets a custom WAAPI-style keyframe animation on a node. |
| `updateAnimationOptions` | `(doc, target, { source?, outAction?, reducedMotion?, requiresSticky? }) → DocumentModel` | Merges options onto an existing animation. Throws if the node has no animation. |
| `clearAnimation` | `(doc, target) → DocumentModel` | Removes an animation from a node. Silent no-op if absent. |
| `setDocumentAnimationSettings` | `(doc, settings) → DocumentModel` | Sets document-level animation settings (a11y policy). |

### High-level option value reference

`setPresetAnimation`, `setKeyframeAnimation`, and `updateAnimationOptions` all accept a small set of shared option fields. Those fields are typed, but the signatures alone do not show the allowed values clearly:

| Option | Allowed values | Applies to | Notes |
|---|---|---|---|
| `trigger` | `'entrance' \| 'ongoing' \| 'scroll' \| 'click' \| 'activate' \| 'hover' \| 'interest' \| 'mouse'` | `setPresetAnimation`, `setKeyframeAnimation` | `click`/`activate` and `hover`/`interest` are document-model aliases; the config builder canonicalizes them to `activate` and `interest`. |
| `source` | `NodeId \| undefined` | `setPresetAnimation`, `setKeyframeAnimation`, `updateAnimationOptions` | Stored internally as `triggerId`. When omitted, the animated node triggers itself. |
| `outAction` | `'reverse' \| 'keep' \| 'none'` | Hover / interest animations only | Ignored for non-hover triggers. When omitted on hover-like triggers, defaults to `'reverse'`. |
| `reducedMotion` | `'disable' \| { alternative: NamedAnimationEffect \| KeyframeAnimationEffect }` | All animation definitions and document settings | `'disable'` suppresses playback for users who prefer reduced motion. `alternative` swaps in a reduced-motion-safe effect. |
| `requiresSticky` | `boolean \| undefined` | All animation definitions | Marks an animation as depending on sticky behavior being active for the node/document. |

### Document animation settings shape

`setDocumentAnimationSettings(doc, settings)` writes a `DocumentAnimationSettings` object of the form:

```ts
{
  a11y?: {
    reducedMotion?: 'disable' | { alternative: NamedAnimationEffect | KeyframeAnimationEffect };
    perTrigger?: Partial<Record<
      'entrance' | 'ongoing' | 'scroll' | 'click' | 'activate' | 'hover' | 'interest' | 'mouse',
      'disable' | { alternative: NamedAnimationEffect | KeyframeAnimationEffect }
    >>;
  };
}
```

Notes:

- `a11y.reducedMotion` is the global default.
- `a11y.perTrigger` lets a specific trigger family override that global default.
- Per-animation `reducedMotion` on the node still has the lowest precedence in the final resolution chain.

### Low-level API (direct data access)

| Function | Signature | Description |
|---|---|---|
| `setNodeAnimation` | `(doc, nodeId, def \| undefined) → DocumentModel` | Sets or clears a full `AnimationDefinition` on a node. |
| `getNodeAnimation` | `(doc, nodeId) → AnimationDefinition \| undefined` | Reads the animation stored on a node. |
| `getAnimatedNodes` | `(doc) → NodeId[]` | Returns IDs of all nodes that have an animation. |

### Preset catalog

| Function | Signature | Description |
|---|---|---|
| `getMotionPresets` | `() → { entrance, ongoing, scroll, mouse }` | Returns all preset names grouped by category. |
| `getPresetCategory` | `(preset) → 'entrance' \| 'ongoing' \| 'scroll' \| 'mouse' \| null` | Returns the category of a preset name. |
| `getPresetsForTrigger` | `(trigger) → PresetInfo[]` | Returns presets valid for a trigger, with parameter schemas. |
| `getPresetParams` | `(preset) → PresetParamSchema \| null` | Returns the parameter schema for a preset. |

### Config builder

| Function | Signature | Description |
|---|---|---|
| `buildDocumentInteractConfig` | `(doc) → InteractConfig` | Builds the full `@wix/interact` config for all animated nodes. |

### Animation Options vs Preset Parameters

There are two distinct layers of configuration on an animation:

- **Preset parameters** (`direction`, `blur`, `intensity`, `distance`, `depth`, etc.) are set on the named effect object and control what the animation looks like. These are preset-specific; use `getPresetParams` to discover the available parameters and their allowed values for any given preset.
- **Animation options** (`duration`, `delay`, `easing`, `iterations`, `rangeStart`/`rangeEnd`, `fill`, `alternate`) are set on the effect wrapper by the config builder and control how and when the animation plays. These are independent of which preset is used.

### Config Builder Defaults

`buildDocumentInteractConfig` applies the following defaults per trigger when building the `@wix/interact` config:

| Trigger | Interact Trigger | Duration | Easing | Iterations | Scroll Range | Interaction Params |
|---------|-----------------|----------|--------|------------|--------------|-------------------|
| `entrance` | `viewEnter` | 1000ms | browser default | 1 | n/a | `{ type: 'once' }` |
| `ongoing` | `viewEnter` | 1000ms | browser default | `Infinity` | n/a | `{ type: 'once', threshold: -0.1 }` |
| `scroll` | `viewProgress` | n/a (scrub) | `'linear'` | 1 | `entry 0%` → `exit 100%` | — |
| `hover` / `interest` | `interest` | 1000ms | browser default | 1 | n/a | `reverse -> { type: 'alternate' }`, `keep -> { type: 'state' }`, `none -> { type: 'repeat' }` |
| `click` / `activate` | `activate` | 1000ms | browser default | 1 | n/a | — |
| `mouse` | `pointerMove` | n/a | n/a | n/a | n/a | `{ hitArea: 'self' }` |

Scroll range defaults are exported as `SCROLL_DEFAULT_RANGE_START` and `SCROLL_DEFAULT_RANGE_END`.

### Duration Guidelines

From the official `@wix/motion-presets` documentation:

| Animation type | Recommended duration |
|---------------|---------------------|
| Functional UI animations | < 500ms |
| Decorative animations | up to 1200ms |
| Hero / showcase animations | up to 2000ms |

The config builder defaults to **1000ms**, which sits in the decorative range.

### Trigger Aliases

- The document model accepts both `hover` and `interest` for hover-like interactions.
- The document model accepts both `click` and `activate` for click-like interactions.
- `buildDocumentInteractConfig` always canonicalizes those aliases to Interact's accessibility-aware triggers: `interest` and `activate`.

### Trigger compatibility summary

| Trigger | Named preset categories allowed | Keyframes allowed | Notes |
|---|---|---|---|
| `entrance` | `entrance` | Yes | View-enter, one-shot style animations. |
| `ongoing` | `ongoing` | Yes | Looping in-view animations. |
| `scroll` | `scroll` | Yes | Scroll-scrubbed effects. |
| `mouse` | `mouse` | Yes | Pointer-move driven effects. |
| `click` / `activate` | `entrance`, `ongoing` | Yes | Triggered by activation, not viewport presence. |
| `hover` / `interest` | `entrance`, `ongoing` | Yes | Supports `outAction`. |

### Special Hover Behavior

The config builder applies additional rules when the trigger is `hover` or `interest`:

- `outAction: 'reverse'` maps to Interact hover mode `{ type: 'alternate' }`, so enter plays forward and leave reverses.
- `outAction: 'keep'` maps to Interact hover mode `{ type: 'state' }`, so hover behaves like play/pause instead of reset/restart.
- `outAction: 'none'` maps to Interact hover mode `{ type: 'repeat' }`, so enter restarts and leave cancels/resets.
- Hover reverse effects are emitted with `fill: 'both'` so alternate enter/leave can hold the active hover state correctly.
- Hover `keep` and `none` modes omit `fill`, following Interact's native `state` and `repeat` patterns.
- `outAction` is supported for hover entrance, hover ongoing, and hover keyframe animations.
- Hover ongoing named presets with `outAction: 'keep'` get `iterations: Infinity` so they can genuinely pause and resume.
- When omitted, `outAction` defaults to `'reverse'`.

### Reduced Motion Priority Chain

When computing the effective reduced-motion response for a given animation, the first matching rule in the following chain wins:

1. `doc.animationSettings.a11y.reducedMotion` — global document-level override
2. `doc.animationSettings.a11y.perTrigger[trigger]` — per-trigger override
3. `animationDef.reducedMotion` — per-animation override

Resolution behavior:

- When the resolved response is `'disable'`: the interaction is wrapped in a `(prefers-reduced-motion: no-preference)` media condition, so it plays only when the user has not requested reduced motion.
- When the resolved response is `{ alternative: ... }`: two conditional effects are created — the main animation under `no-preference` and the alternative animation under `reduce`.

### Official Preset Documentation

Per-preset parameter details (defaults, intensity guides, atmosphere selection, and accessibility notes) are covered in the official `@wix/motion-presets` package documentation. Individual category references document all parameters with their defaults and allowed ranges.

### Error handling

- **Throws** on: unknown node, site root, unknown preset, invalid preset/trigger combo, `updateAnimationOptions` on unanimated node.
- **Silent no-op** on: `clearAnimation` when no animation exists.

### Exported types

| Type | Description |
|---|---|
| `AnimationTriggerType` | `'entrance' \| 'ongoing' \| 'scroll' \| 'click' \| 'activate' \| 'hover' \| 'interest' \| 'mouse'` |
| `HoverOutAction` | `'keep' \| 'reverse' \| 'none'` — hover leave behavior selector. |
| `AnimationDefinition` | Discriminated union of per-trigger animation definitions. |
| `NamedAnimationEffect` | Union of all named preset effect wrappers. |
| `KeyframeAnimationEffect` | WAAPI-style keyframe effect shape. |
| `ReducedMotionResponse` | `'disable' \| { alternative: ... }` — per-animation a11y override. |
| `DocumentAnimationSettings` | Document-level a11y settings. |
| `PresetInfo` | Preset name + category + param schema (for editor UI). |
| `PresetParamSchema` | Full parameter schema for a preset. |
| `PresetParam` | Single parameter descriptor (name, type, enum, min/max). |
| `InteractConfig` | Re-exported from `@wix/interact`. |

---

## `src/api/types/index.ts`

Internal types shared across the `src/api/` subsystem.

### Exported types

| Type | Description |
|---|---|
| `DocumentCommand` | Discriminated union of batch document commands: `setRect`, `setSticky`, `setText`. |

### `DocumentCommand` variants

| Variant | Shape | Notes |
|---|---|---|
| `setRect` | `{ type: 'setRect'; nodeId; field: 'x' \| 'y' \| 'width' \| 'height'; value: string }` | Writes one rect field exactly as an authored model string. |
| `setSticky` | `{ type: 'setSticky'; nodeId; patch: Partial<StickyDefinition> }` | Partial patch over the sticky object. |
| `setText` | `{ type: 'setText'; nodeId; field: EditorTextField; value: string }` | Covers both content fields and text/style fields. |
