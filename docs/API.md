# API Reference

This landing page now points to nested reference pages instead of keeping the entire API surface in one long document.

## Pages

- [Overview](./API_OVERVIEW.md)
- [Document Model](./API_DOCUMENT_MODEL.md)
- [Node and Layout](./API_NODE_AND_LAYOUT.md)
- [Text](./API_TEXT.md)
- [Pages and Site](./API_PAGES_AND_SITE.md)
- [Editor](./API_EDITOR.md)
- [AI](./API_AI.md)
- [Rendering and Export](./API_RENDERING_AND_EXPORT.md)
- [Types](./API_TYPES.md)

## Notes

- Old links to `docs/API.md#...` are expected to keep working inside the Help browser through alias resolution.
- The child pages are still flat markdown files in `docs/`; the hierarchy is virtual and defined by the help-doc registry.
- The stable entry point remains this file, so references to `docs/API.md` do not have to change just because the nav became nested.

### Markdown import/export

| Function | Signature | Description |
| --- | --- | --- |
| `serializeTextNodeMarkdownDoc` | `(document, nodeId) -> string` | Serialize a text node to GFM markdown |
| `applyMarkdownToTextNodeDoc` | `(document, nodeId, markdown: string) -> DocumentModel` | Apply markdown content to a text node |

Lower-level markdown utilities (from `textMarkdown.ts`):

| Function | Signature | Description |
| --- | --- | --- |
| `serializeTextNodeToMarkdown` | `(node: TextNode, document?) -> string` | Serialize a node directly |
| `serializeRichContentToMarkdown` | `(content: RichContent, document?) -> string` | Serialize rich blocks to markdown |
| `parseMarkdownToRichContent` | `(markdown: string) -> RichContent` | Parse markdown to rich content blocks |
| `parseMarkdownForTextSubtype` | `(markdown: string, targetSubtype: TextSubtype) -> ParsedMarkdownNode` | Parse markdown for a specific text subtype |

---

## Clipboard

Source: `src/api/documentApi.ts`

| Function / export | Signature | Description |
| --- | --- | --- |
| `EDITOR_NODE_CLIPBOARD_MIME` | string | Custom MIME type for editor node clipboard payloads |
| `EDITOR_NODE_CLIPBOARD_VERSION` | number | Current version for editor node clipboard payloads |
| `DuplicateNodePlacement` | type | Drag-resolved source id and destination coordinates for explicit duplicate placement |
| `DuplicateNodesOptions` | type | Paste-style duplicate options plus optional drag target, explicit placements, and parent expansion |
| `EditorNodeClipboardPayload` | type | Serializable selected-node clipboard payload |
| `ExternalClipboardData` | type | External clipboard text/html input for fallback paste |
| `PasteNodesOptions` | type | Selected node, active page, and offset options for paste/duplicate |
| `serializeNodesForClipboardDoc` | `(document, nodeIds) -> EditorNodeClipboardPayload \| null` | Serialize selected top-level nodes and descendants |
| `parseNodeClipboardPayloadDoc` | `(raw) -> EditorNodeClipboardPayload \| null` | Parse a custom editor clipboard payload |
| `createNodeClipboardJson` | `(payload) -> string` | Serialize an editor clipboard payload as JSON for custom clipboard MIME or hidden HTML fallback storage |
| `createTextDocumentContentFromClipboardHtml` | `(document, { text?, html? }) -> TextDocumentContent` | Convert clipboard HTML to the Slate-backed text document model, preserving supported styling and installed font families |
| `pasteNodesFromClipboardDoc` | `(document, payload, options?) -> PasteNodesResult` | Paste serialized nodes with remapped ids, target-parent resolution, and optional offset |
| `duplicateNodesDoc` | `(document, nodeIds, options?) -> PasteNodesResult` | Duplicate selected nodes through the same clipboard payload path, including optional explicit drag placements |
| `createNodeFromExternalClipboardDoc` | `(document, { text?, html? }, options?) -> PasteNodesResult` | Create a rich text, link, or image node from external clipboard data |

`PasteNodesResult` returns the next document and pasted root ids so editor wrappers can select the pasted nodes and track history.

---

## Rich Text

Source: `src/api/documentApi.ts`

### Block-level mutations

| Function | Parameters | Description |
| --- | --- | --- |
| `setRichBlockTypeDoc` | `(document, nodeId, blockIndex: number, blockType: RichTextBlockType)` | Change block type (paragraph, heading, blockquote, etc.) |
| `setRichBlockLineHeightDoc` | `(document, nodeId, blockIndex: number, lineHeight: number)` | Set line height for a specific block |
| `setRichBlockSpacingDoc` | `(document, nodeId, blockSpacing: number)` | Set block spacing for the entire rich text node |

`RichTextBlockType`: `'paragraph'` | `'div'` | `'blockquote'` | `'h1'` | `'h2'` | `'h3'` | `'h4'` | `'h5'` | `'h6'`

### List mutations

| Function | Parameters | Description |
| --- | --- | --- |
| `setRichListKindDoc` | `(document, nodeId, blockIndex: number, listKind: 'ul' \| 'ol')` | Switch between ordered and unordered list |
| `setRichListMarkerStyleDoc` | `(document, nodeId, blockIndex: number, markerStyle: string)` | Set list marker style |

Unordered marker styles: `'disc'` | `'circle'` | `'square'`
Ordered marker styles: `'decimal'` | `'lower-alpha'` | `'upper-alpha'` | `'lower-roman'` | `'upper-roman'`

### Table mutations

| Function | Parameters | Description |
| --- | --- | --- |
| `insertTableRowDoc` | `(document, nodeId, rowIndex: number)` | Insert a row in a standalone table text node |
| `insertTableColumnDoc` | `(document, nodeId, columnIndex: number)` | Insert a column in a standalone table text node |
| `removeTableRowDoc` | `(document, nodeId, rowIndex: number)` | Remove a row while preserving at least one row |
| `removeTableColumnDoc` | `(document, nodeId, columnIndex: number)` | Remove a column while preserving at least one column |
| `setTableHeaderRowDoc` | `(document, nodeId, enabled: boolean)` | Toggle first-row header semantics |
| `setTableColumnAlignmentDoc` | `(document, nodeId, columnIndex: number, alignment: TableColumnAlignment)` | Set per-column alignment |
| `setTableDirectionDoc` | `(document, nodeId, direction: 'ltr' \| 'rtl' \| null)` | Set or clear table structure direction |
| `setTableColumnWidthDoc` | `(document, nodeId, columnIndex: number, width: string \| null)` | Set or clear a column width |
| `setTableRowHeightDoc` | `(document, nodeId, rowIndex: number, height: string \| null)` | Set or clear a row height |
| `setTableStyleDoc` | `(document, nodeId, patch: Partial<Record<keyof RichTableStyle, string \| null>>)` | Patch table-wide style fields |
| `setTableCellStyleDoc` | `(document, nodeId, rowIndex: number, columnIndex: number, patch: TableCellStylePatch)` | Patch one Slate table cell style |
| `setTableSelectionStyleDoc` | `(document, nodeId, selection: TableSelectionDescriptor, patch: TableCellStylePatch)` | Patch cells addressed by a table selection descriptor |
| `setTableSelectionBorderDoc` | `(document, nodeId, selection: TableSelectionDescriptor, scope: TableBorderScope, patch: TableCellBorderPatch)` | Expand a border scope into per-cell edge styles |

`TableColumnAlignment`: `'left'` | `'center'` | `'right'` | `null`
`TableSelectionDescriptor`: `{ type: 'cell'; rowIndex; columnIndex }` | `{ type: 'row'; rowIndex }` | `{ type: 'column'; columnIndex }` | `{ type: 'table' }`
`TableBorderScope`: `'all'` | `'outer'` | `'inner'` | `'horizontal'` | `'vertical'` | `'top'` | `'right'` | `'bottom'` | `'left'`

### Split and merge

Source: `src/api/textMerge.ts`

```typescript
splitRichTextNodeDoc(document: DocumentModel, nodeId: NodeId): DocumentModel
```

Splits a rich text node into multiple standalone text nodes (one per block).

```typescript
mergeTextNodesToRichDoc(document: DocumentModel, nodeIds: NodeId[], options?: MergeTextNodesOptions): DocumentModel
```

Merges multiple text nodes into a single rich text node.

| Option | Type | Default | Description |
| --- | --- | --- | --- |
| `survivorNodeId` | `NodeId` | first in `nodeIds` | Which node keeps its identity (position, styles) |

---

## Text Conversion

Source: `src/api/textConversion.ts`

```typescript
convertTextNodeDoc(document: DocumentModel, nodeId: NodeId, targetSubtype: TextSubtype, options?: TextConversionOptions): DocumentModel
```

Converts a text node to a different subtype, preserving content where possible. The supported text subtypes are `'block'`, `'rich'`, `'code'`, `'list'`, and `'table'`.

```typescript
switchTextSubtypeDoc(document: DocumentModel, nodeId: NodeId, targetSubtype: TextSubtype, options?: TextConversionOptions): DocumentModel
```

Alias for `convertTextNodeDoc` with identical behavior.

| Option | Type | Default | Description |
| --- | --- | --- | --- |
| `mode` | `TextConversionMode` | `'auto'` | `'auto'`: best-effort, `'flatten'`: collapse to single block, `'split'`: split into multiple nodes |

```typescript
flattenTextContent(content: TextDocumentContent): string
```

Extracts plain text from a text document content structure.

### Legacy subtype switcher

```typescript
switchSubtypeDoc(document: DocumentModel, nodeId: NodeId, targetSubtype: MediaSubtype | TextSubtype): DocumentModel
```

Handles both media and text subtype switching. Media switching remains in-place; text switching delegates to conversion APIs.

---

## Code Blocks

Source: `src/api/documentApi.ts`

| Function | Signature | Description |
| --- | --- | --- |
| `setCodeBlockLanguageDoc` | `(document, nodeId, language: string) -> DocumentModel` | Set the programming language for syntax highlighting |
| `setCodeBlockThemeDoc` | `(document, nodeId, theme: string) -> DocumentModel` | Set the color theme (`'auto'`, `'light'`, or `'dark'`); `auto` follows viewer/system color scheme |
| `setCodeBlockTabSizeDoc` | `(document, nodeId, tabSize: number) -> DocumentModel` | Set visual code tab width (`1..8`) without rewriting text |
| `setCodeBlockWrapDoc` | `(document, nodeId, wrap: boolean) -> DocumentModel` | Toggle soft wrapping for code lines; disabled code scrolls horizontally |
| `resetCodeBlockStyleDoc` | `(document, nodeId) -> DocumentModel` | Reset code presentation overrides while preserving raw code and language |

---

## Pages and Site Structure

Source: `src/api/pageApi.ts`

### Page CRUD

| Function | Signature | Description |
| --- | --- | --- |
| `DuplicatePageResult` | type | Result for page duplication, including the next document and duplicate page id when created |
| `addPage` | `(document, options?: Partial<Omit<DocumentPage, 'type' \| 'id'>>) -> DocumentModel` | Add a new page with optional properties |
| `deletePage` | `(document, pageId) -> DocumentModel` | Delete a page and unlink its sections |
| `duplicatePage` | `(document, pageId) -> { document, pageId }` | Duplicate a page with unique route metadata and cloned page-owned sections |
| `reorderPage` | `(document, pageId, direction: 'back' \| 'forward') -> DocumentModel` | Move page in the page list |

### Page metadata

| Function | Signature | Description |
| --- | --- | --- |
| `setPageDisplayName` | `(document, pageId, displayName: string) -> DocumentModel` | Set page display name |
| `setPageSlug` | `(document, pageId, slug: string) -> DocumentModel` | Set URL slug |
| `setPageAsHome` | `(document, pageId) -> DocumentModel` | Designate page as home |
| `setPageParent` | `(document, pageId, newParentId: PageId \| null) -> DocumentModel` | Set parent for page hierarchy (with cycle detection) |
| `setPageLang` | `(document, pageId, lang: string \| undefined) -> DocumentModel` | Set BCP-47 locale override |
| `setPageVisibility` | `(document, pageId, visible: boolean) -> DocumentModel` | Show/hide page |
| `setPageViewTransition` | `(document, pageId, transition: 'none' \| 'crossfade' \| 'slide') -> DocumentModel` | Set view transition style |

### Slug aliases

| Function | Signature | Description |
| --- | --- | --- |
| `addPageSlugAlias` | `(document, pageId, alias: string) -> DocumentModel` | Add a slug alias for URL redirects |
| `removePageSlugAlias` | `(document, pageId, alias: string) -> DocumentModel` | Remove a slug alias |
| `validatePageSlug` | `(slug: string) -> string[]` | Validate slug format; returns error messages |

### URL resolution

| Function | Signature | Description |
| --- | --- | --- |
| `resolvePageUrl` | `(document, pageId) -> string` | Resolve the canonical URL for a page |
| `resolvePageHierarchyUrl` | `(document, pageId) -> string` | Resolve URL based on page hierarchy path |
| `resolvePageSystemAliasUrl` | `(document, pageId) -> string` | Resolve URL from system alias |
| `resolvePageManualAliasUrls` | `(document, pageId) -> string[]` | Resolve all manual alias URLs |
| `getPageRoutes` | `(document, pageId) -> PageRoute[]` | Get all routes for a page |
| `getAllPageRoutes` | `(document) -> PageRoute[]` | Get all routes for all pages |

### Page queries

| Function | Signature | Description |
| --- | --- | --- |
| `getHomePage` | `(document) -> DocumentPage \| null` | Get the home page |
| `getPageRole` | `(document, pageId) -> PageRole \| null` | Get page role (`'home'` \| `'default'`) |
| `getPageForSection` | `(document, sectionId) -> DocumentPage \| null` | Find which page owns a section |
| `getActiveSections` | `(document, pageId) -> ContainerNode[]` | Get visible sections for a page |

### Language resolution

| Function | Signature | Description |
| --- | --- | --- |
| `resolveSiteLanguage` | `(document) -> string` | Resolve the site-level language |
| `resolvePageLanguage` | `(document, pageId) -> string` | Resolve language for a page (falls back to site) |
| `resolveTextLeafLanguage` | `(document, nodeId) -> string` | Resolve language for a text leaf (page -> site fallback) |

### Section operations

| Function | Signature | Description |
| --- | --- | --- |
| `moveSectionToPage` | `(document, sectionId, fromPageId, toPageId) -> DocumentModel` | Move a section between pages |
| `syncPageHrefLinks` | `(document, oldUrl: string, newUrl: string) -> DocumentModel` | Update internal links after URL changes |

### Site settings

```typescript
setSiteSettings(document: DocumentModel, patch: Partial<SiteSettings>): DocumentModel
```

| Setting | Type | Description |
| --- | --- | --- |
| `lang` | `string` | Site-level BCP-47 locale |
| `status` | `'draft'` \| `'published'` | Publication status |
| `viewTransition` | `'none'` \| `'crossfade'` \| `'slide'` | Default page transition |
| `title` | `string?` | Site title |
| `autoSyncSlugs` | `boolean?` | Auto-sync slugs when display name changes |
| `outputStructure` | `'directory'` \| `'flat'` | Export file structure |

---

## Top-Level Wrappers

Source: `src/api/documentApi.ts`

Top-level wrappers (headers, footers, shared sections) can control their placement and visibility across pages.

```typescript
setPageTopLevelWrapperPlacement(document: DocumentModel, pageId: PageId, nodeId: NodeId, placement: TopLevelWrapperPlacement): DocumentModel
```

`TopLevelWrapperPlacement`: `'currentPage'` | `'global'`

```typescript
setTopLevelWrapperVisibility(document: DocumentModel, pageId: PageId, nodeId: NodeId, visibility: TopLevelWrapperVisibilityMode, pageIds?: PageId[]): DocumentModel
```

`TopLevelWrapperVisibilityMode`: `'hidden'` | `'currentPage'` | `'allPages'` | `'customPages'`

When `visibility` is `'customPages'`, pass `pageIds` to specify which pages show the wrapper.

```typescript
getTopLevelWrapperVisibilityState(document: DocumentModel, nodeId: NodeId): TopLevelWrapperVisibilityState
```

Returns `{ mode: TopLevelWrapperVisibilityMode, pageIds: PageId[] }`.

---

## Fonts

Source: `src/api/fontApi.ts`

### Document font library

| Function | Signature | Description |
| --- | --- | --- |
| `addDocumentFontFamily` | `(document, family: DocumentFontFamily) -> DocumentModel` | Add a font family to the document |
| `removeDocumentFontFamily` | `(document, familyId: string) -> DocumentModel` | Remove a font family |
| `toggleDocumentFontFavorite` | `(document, familyId: string) -> DocumentModel` | Toggle favorite status |
| `purgeUnusedDocumentFonts` | `(document) -> DocumentModel` | Remove fonts not used by any node |
| `getDocumentFontLibrary` | `(document) -> FontLibrary` | Get the full font library |
| `listDocumentFonts` | `(document) -> DocumentFontFamily[]` | List all document fonts |
| `listDocumentFontsForPicker` | `(document) -> DocumentFontFamily[]` | List fonts formatted for the picker UI |
| `getFontUsage` | `(document) -> FontUsage` | Get usage statistics |
| `isFontFamilyUsed` | `(document, familyId: string) -> boolean` | Check if a font is used |
| `ensureDocumentFontFamily` | `(document, family: DocumentFontFamily) -> DocumentModel` | Add font if not already present |
| `ensureDocumentFontFamilyByName` | `(document, familyName: string) -> DocumentModel` | Add font by name if not present |
| `getDocumentFontFamily` | `(document, familyId: string) -> DocumentFontFamily \| undefined` | Look up a font |

### Google Fonts catalog

| Function | Signature | Description |
| --- | --- | --- |
| `getBundledGoogleFontsCatalog` | `() -> GoogleFontsCatalog` | Get the bundled catalog (offline) |
| `fetchGoogleFontCatalog` | `(options?) -> Promise<GoogleFontsCatalog>` | Fetch fresh catalog from Google |
| `loadGoogleFontsCatalog` | `() -> Promise<GoogleFontsCatalog>` | Load catalog (bundled or fetched) |
| `getCachedGoogleFontsCatalog` | `() -> GoogleFontsCatalog \| null` | Get cached catalog if available |
| `queryGoogleFontFamilies` | `(query: GoogleFontsQuery) -> GoogleFontFamily[]` | Query fonts with filters |
| `searchGoogleFontFamilies` | `(catalog, query: string) -> GoogleFontFamily[]` | Search fonts by name |
| `filterGoogleFontFamilies` | `(catalog, filter) -> GoogleFontFamily[]` | Filter catalog |
| `sortGoogleFontFamilies` | `(families, sort: GoogleFontSort) -> GoogleFontFamily[]` | Sort font results |
| `getGoogleFontFamily` | `(catalog, familyName: string) -> GoogleFontFamily \| undefined` | Look up a specific font |
| `useGoogleFontsCatalog` | `() -> GoogleFontsCatalog \| null` | React hook for catalog state |

### Stylesheet builders

| Function | Signature | Description |
| --- | --- | --- |
| `buildDocumentGoogleFontsStylesheetHref` | `(document) -> string` | Build Google Fonts URL for all document fonts |
| `buildEditorGoogleFontsStylesheetHref` | `(document) -> string` | Build Google Fonts URL for editor preview |
| `buildFontFamilyStack` | `(family: string, category: string) -> string` | Build CSS font-family stack |
| `buildFontPickerPreviewStylesheetHref` | `(families) -> string` | Build URL for font picker previews |
| `buildFontPreviewStylesheetHref` | `(family: string) -> string` | Build URL for single font preview |
| `buildGoogleFontsStylesheetHref` | `(requests) -> string` | Build custom Google Fonts URL |
| `collectDocumentFontRequests` | `(document) -> FontRequest[]` | Collect all font requests from document |

### Font weight utilities

| Function | Signature | Description |
| --- | --- | --- |
| `getSupportedFontWeights` | `(family: DocumentFontFamily) -> number[]` | Get available weights |
| `resolveNearestSupportedFontWeight` | `(family, targetWeight: number) -> number` | Find closest available weight |
| `isBoldFontWeight` | `(weight: number) -> boolean` | Check if weight is bold (>= 600) |
| `toggleBoldFontWeight` | `(weight: number) -> number` | Toggle between normal and bold |
| `getFontWeightLabel` | `(weight: number) -> string` | Human-readable weight name |
| `listFontWeightOptions` | `(family) -> WeightOption[]` | List weight options for UI |
| `parseFontWeightInput` | `(input: string) -> number` | Parse weight from string |

Constants: `DEFAULT_FONT_WEIGHT` (400), `BOLD_FONT_WEIGHT` (700), `BOLD_ACTIVE_WEIGHT` (600).

---

## Animations

Source: `src/api/animationApi.ts`

### Setting animations

```typescript
setPresetAnimation(document: DocumentModel, nodeId: NodeId, trigger: AnimationTriggerType, preset: string, options?: Record<string, unknown>): DocumentModel
```

Apply a named preset animation to a node.

```typescript
setKeyframeAnimation(document: DocumentModel, nodeId: NodeId, trigger: AnimationTriggerType, keyframes: Keyframe[], options?: { duration?: number; easing?: string; name?: string }): DocumentModel
```

Apply a custom keyframe animation.

```typescript
updateAnimationOptions(document: DocumentModel, nodeId: NodeId, options: Partial<AnimationDefinition>): DocumentModel
```

Update options on an existing animation without replacing the effect.

```typescript
clearAnimation(document: DocumentModel, nodeId: NodeId): DocumentModel
```

Remove the animation from a node.

```typescript
setNodeAnimation(document: DocumentModel, nodeId: NodeId, animation: AnimationDefinition | undefined): DocumentModel
```

Set or clear the raw animation definition.

### Document animation settings

```typescript
setDocumentAnimationSettings(document: DocumentModel, settings: Partial<DocumentAnimationSettings>): DocumentModel
```

Set document-level animation accessibility policy (reduced motion behavior).

### Animation queries

| Function | Signature | Description |
| --- | --- | --- |
| `getNodeAnimation` | `(document, nodeId) -> AnimationDefinition \| undefined` | Get animation for a node |
| `getAnimatedNodes` | `(document) -> NodeId[]` | Get all nodes with animations |

### Animation selectors

Source: `src/animations/selectors.ts`

| Function | Signature | Description |
| --- | --- | --- |
| `hasAnimation` | `(node) -> boolean` | Whether the node has any animation definition |
| `getAnimationSummary` | `(node) -> { trigger, effectName, effectKind } \| null` | Display summary of a node's animation |
| `isScrollAnimation` | `(node) -> boolean` | Whether the node has a scroll-triggered animation |
| `requiresStickyForAnimation` | `(node) -> boolean` | Whether the node's animation requires sticky |
| `getAnimatedNodeIds` | `(document) -> NodeId[]` | All node IDs with animations |

### Preset metadata

Source: `src/animations/presetMetadata.ts`

| Function | Signature | Description |
| --- | --- | --- |
| `getPresetLabel` | `(preset: string) -> string` | Human-readable label for a preset (fallback: split PascalCase) |
| `getPresetMetadata` | `(preset: string) -> PresetMetadata \| null` | Full metadata (label, description, category) |
| `getTriggerLabel` | `(trigger: string) -> string` | Human-readable label for a trigger type |

Constants: `PRESET_METADATA` (64 entries), `TRIGGER_METADATA` (6 entries).

### Preset catalog

| Function | Signature | Description |
| --- | --- | --- |
| `getMotionPresets` | `() -> PresetInfo[]` | Get all available motion presets |
| `getPresetCategory` | `(preset: string) -> string \| undefined` | Get category for a preset |
| `getPresetsForTrigger` | `(trigger: AnimationTriggerType) -> PresetInfo[]` | Get presets available for a trigger type |
| `getPresetParams` | `(preset: string) -> PresetParam[]` | Get configurable parameters for a preset |

### Interact config builder

```typescript
buildDocumentInteractConfig(document: DocumentModel): InteractConfig
```

Builds a complete `@wix/interact` configuration object from the document's animation definitions.

### Animation preview runtime

| Function | Signature | Description |
| --- | --- | --- |
| `createAnimationPreview` | `(container: HTMLElement, config: InteractConfig) -> AnimationPreviewHandle` | Create a live animation preview instance |
| `filterInteractConfig` | `(config, nodeIds: string[]) -> InteractConfig` | Filter config to specific nodes |
| `buildPreviewConfig` | `(document, options?) -> InteractConfig` | Build preview-ready config |
| `preloadMotionPresets` | `() -> Promise<void>` | Preload motion preset assets |

The `AnimationPreviewHandle` returned by `createAnimationPreview`:

| Method | Description |
| --- | --- |
| `updateConfig(config)` | Swap the running config (no-ops if deep-equal) |
| `invoke(nodeId, action)` | Play click/hoverIn/hoverOut animation |
| `destroy()` | Tear down and clean up |
| `isActive()` | Whether the Interact instance is running |

Constants: `INTERACT_VERSION`, `SCROLL_DEFAULT_RANGE_START`, `SCROLL_DEFAULT_RANGE_END`.

---

## Node and Layout Document APIs

Source: `src/api/documentApi.ts`

| Function | Signature | Description |
| --- | --- | --- |
| `moveNodeDoc` | `(document, nodeId, { x?, y? }, options?) -> DocumentModel` | Move a node to authored coordinates, optionally growing a parent |
| `moveNodesDoc` | `(document, moves, options?) -> DocumentModel` | Move multiple nodes to authored coordinates, optionally growing a parent |
| `alignNodesDoc` | `(document, nodeIds, mode, rects) -> DocumentModel` | Align sibling nodes from supplied measured rectangles |
| `distributeNodesDoc` | `(document, nodeIds, mode, rects) -> DocumentModel` | Distribute sibling node positions from supplied measured rectangles |
| `reorderNodesDoc` | `(document, nodeIds, action) -> DocumentModel` | Reorder multiple sibling nodes in one pure mutation |
| `reparentNodeAtDoc` | `(document, nodeId, parentId, { x, y }, options?) -> DocumentModel` | Reparent a node and set local authored coordinates, optionally growing the target parent |
| `reparentNodesAtDoc` | `(document, parentId, moves, options?) -> DocumentModel` | Reparent multiple nodes and set local authored coordinates, optionally growing the target parent |
| `expandParentHeightDoc` | `(document, { parentId, minHeightPx }) -> DocumentModel` | Grow a container height to at least the requested px size, preserving authored `auto` height |
| `resolveContainerChildBoundary` | `(document, containerId) -> ContainerChildBoundary` | Resolve a wrapper policy, defaulting to `anchor` |
| `setContainerChildBoundaryDoc` | `(document, containerId, childBoundary) -> DocumentModel` | Set wrapper child overflow policy |
| `setContainerSemanticTypeDoc` | `(document, nodeId, subtype) -> DocumentModel` | Change a semantic container between `container`, `nav`, `aside`, and `article` |
| `setContainerAriaLabelDoc` | `(document, nodeId, value) -> DocumentModel` | Set or clear a semantic container accessible label |
| `groupNodesDoc` | `(document, nodeIds) -> DocumentModel` | Create or consolidate an editor group around selected sibling nodes while preserving visual placement |
| `ungroupNodeDoc` | `(document, groupId) -> DocumentModel` | Remove a group wrapper and reparent its children without visual movement |
| `convertGroupToContainerDoc` | `(document, groupId) -> DocumentModel` | Convert a group into a plain container; conversion is one-way |

These helpers are the API-first surface used by editor drag/drop and keyboard movement. They keep movement and reparent placement deterministic without depending on stage DOM state. Movement and reparent helpers accept `options.parentExpansion?: { parentId, minHeightPx }` so an `anchor` / Allow overflow drag commit can move the child and grow the parent in one model mutation. Parents with authored `auto` height ignore expansion requests and keep their authored height value.

---

## Drag and Drop

Source: `src/api/dragDropApi.ts`

Headless drag-and-drop session lifecycle for editor canvases.

### Session lifecycle

```typescript
beginDragSession(context: DragStartContext): DragSession
```

Start a new drag session from a pointer-down event.

```typescript
updateDragSession(session: DragSession, input: DragUpdateInput): DragSession
```

Update the session with new pointer position; resolves the target parent, local placement, preview placement, guides, drop highlight, axis lock, snap-bypass state, parent-expansion request, and duplicate-drag intent. The resolved placement on the session is the single source of truth for both preview and commit.

```typescript
finishDragSession(session: DragSession, input: DragUpdateInput): DragCommitIntent
```

Finalize the drag and return the commit intent (what to move/reparent/duplicate, plus optional parent expansion). Finish uses the already-resolved session placement and does not re-run snapping, drop-target detection, or boundary resolution on pointer-up.

```typescript
cancelDragSession(session: DragSession | null): null
```

Cancel and clean up.

### Types

See [`DragSession`](#dragsession), [`DragResolvedPlacement`](#dragresolvedplacement), [`DragStartContext`](#dragstartcontext), [`DragUpdateInput`](#dragupdateinput), [`DragCommitIntent`](#dragcommitintent) in the type reference.

---

## Editor State

Source: `src/api/editorApi.ts`

### State lifecycle

| Function | Signature | Description |
| --- | --- | --- |
| `createInitialState` | `() -> EditorState` | Create a fresh editor state |
| `loadPersistedState` | `() -> EditorState` | Load from localStorage |
| `persistState` | `(state) -> void` | Save to localStorage |
| `persistDefaultDocument` | `(document) -> void` | Save a document as the default |
| `clearSessionState` | `() -> void` | Clear session-only state |
| `clearPersistedState` | `() -> void` | Clear all persisted state |
| `createFactoryResetState` | `() -> EditorState` | Create a clean factory-reset state |

### Import and validation

| Function | Signature | Description |
| --- | --- | --- |
| `parseImportedDocumentJson` | `(raw: string) -> DocumentModel` | Parse imported JSON with migration |
| `importDocument` | `(state, document) -> EditorState` | Import a document into editor state |
| `getValidationErrors` | `(state) -> string[]` | Get validation errors for the current state |

### Selection

| Function | Signature | Description |
| --- | --- | --- |
| `selectNode` | `(state, nodeId: NodeId \| null) -> EditorState` | Select a single node (null to clear) |
| `clearSelection` | `(state) -> EditorState` | Clear all selection |
| `toggleNodeSelection` | `(state, nodeId) -> EditorState` | Toggle a node in/out of selection |
| `selectManyNodes` | `(state, nodeIds, mode: 'replace' \| 'toggle') -> EditorState` | Select multiple nodes |

### Stage navigation

| Function | Signature | Description |
| --- | --- | --- |
| `getStageSelectableNodeIds` | `(document) -> NodeId[]` | Get IDs of all selectable nodes on stage |
| `getAdjacentStageSelection` | `(document, currentId, direction: 'forward' \| 'backward') -> NodeId \| null` | Get next/previous selectable node |

### Page switching

```typescript
setActivePage(state: EditorState, pageId: PageId): EditorState
```

Switch the active page in the editor. This is editor-only state (no documentApi counterpart needed).

### Editor navigation and deep-link state

| Function | Signature | Description |
| --- | --- | --- |
| `parseEditorNavigationSearch` | `(search) -> EditorNavigationUrlState` | Parse editor URL query state for active page, selection, focused mode, panel targets, tour topic/step, and view flags |
| `buildEditorNavigationSearch` | `(state, baseSearch?) -> string` | Serialize editor navigation state back into a query string |
| `applyEditorNavigationState` | `(state, navigation, options?) -> EditorState` | Apply URL/navigation state through editor state helpers |
| `applyEditorViewFlags` | `(state, flags) -> EditorState` | Apply headless editor UI flags such as focused mode, debug, grid, sticky preview, and spacer visibility |
| `resolveEditorNodeTarget` | `(document, target, options?) -> NodeId \| null` | Resolve a stable node target query without relying on generated node IDs |
| `createDefaultEditorPanelState` | `(options?) -> EditorPanelState` | Create typed transient editor panel state |
| `applyEditorPanelRequest` | `(state, request) -> EditorPanelState` | Apply typed panel open/close/toggle/target requests |

Navigation types:

- `EditorNavigationUrlState`
- `EditorNodeTarget`
- `EditorViewFlags`
- `ApplyEditorNavigationOptions`
- `EditorPanelState`
- `EditorPanelRequest`
- `EditorPanelId`
- `EditorPanelPosition`
- `EditorSettingsSectionId`
- `EditorPagesPanelTab`

Supported editor URL query params:

| Param | State field | Notes |
| --- | --- | --- |
| `page` | `activePageId` | Active editor page id |
| `select` | `selectedNodeId` | Selected node id |
| `focus-mode` | `focusedMode` | Active focused mode id; `none` or `normal` clears focused mode |
| `panel` | `panel` | One of `settings`, `manageFonts`, `help`, `shortcuts`, `about`, `components`, `pages`, `sectionTemplates`, `textTypes`, `mediaTypes` |
| `settings` | `settingsSection` | One of `display`, `pages`, `defaults`, `fonts`, `transfer`, `advanced`, `shortcuts` |
| `help` | `helpEntryId` | Help/documentation entry id |
| `page-target` | `pageTargetId` | Target page id for page panel flows |
| `pages-tab` | `pagesTab` | `page` or `settings` |
| `tour` | `tourTopic` | Showcase tour topic id |
| `step` | `tourStep` | Showcase tour step id |
| `show-hidden` | `showHidden` | Boolean: `1`, `true`, `yes`, `on`; or `0`, `false`, `no`, `off` |
| `sticky-preview` | `previewSticky` | Boolean |
| `animation-preview` | `animationPreviewEnabled` | Boolean |
| `grid` | `showGridLanes` | Boolean |
| `debug` | `showDebugInfo` | Boolean |
| `spacers` | `spacerVisibility` | `all` or `selected` |

### Showcase tour API

Source: `src/api/showcaseTourApi.ts`

`showcaseTourApi` is a read-only helper surface for validating non-linear tour configuration and resolving topic/step state. It does not mutate the editor directly; each `ShowcaseTourStep` carries typed editor navigation and panel requests that consumers pass through `editorNavigationApi` and the app shell.

| Function | Signature | Description |
| --- | --- | --- |
| `validateShowcaseTourConfig` | `(config) -> ShowcaseTourValidationIssue[]` | Validate duplicate ids, missing topic/step references, and topic-step mismatches |
| `resolveShowcaseTourLocation` | `(config, location?) -> ShowcaseTourLocation` | Resolve URL-derived or partial tour state with entry/topic/step fallbacks |
| `getShowcaseTourPanelRequests` | `(navigation) -> EditorPanelRequest[]` | Resolve the complete transient panel scene for a step; explicit `panels` win, legacy singular `panel` requests are prefixed with `closeAll`, and empty navigation closes all panels |
| `getShowcaseTourTopic` | `(config, topicId) -> ShowcaseTourTopic \| null` | Lookup a tour topic |
| `getShowcaseTourStep` | `(config, stepId) -> ShowcaseTourStep \| null` | Lookup a tour step |
| `getShowcaseTourStepsForTopic` | `(config, topicId) -> ShowcaseTourStep[]` | Return the ordered steps for a topic |
| `getAdjacentShowcaseTourStep` | `(config, location, direction) -> ShowcaseTourLocation` | Resolve previous/next linear movement across the non-linear topic map |
| `isLastShowcaseTourStep` | `(config, location) -> boolean` | Detect whether the current location is the final ordered step |
| `getShowcaseTourProgress` | `(config, location) -> { index, total, topicIndex, topicTotal }` | Report global and topic-local step progress for a tour location |

Showcase tour types:

- `ShowcaseTourAnchor`
- `ShowcaseTourStepNavigation`
- `ShowcaseTourStepAction`
- `ShowcaseTourStep`
- `ShowcaseTourTopic`
- `ShowcaseTourConfig`
- `ShowcaseTourLocation`
- `ShowcaseTourValidationIssue`

### Wrapper role promotion

| Function | Signature | Description |
| --- | --- | --- |
| `requestPromoteWrapperRole` | `(state, nodeId) -> EditorState` | Request promotion (triggers confirmation) |
| `confirmPromoteWrapperRole` | `(state) -> EditorState` | Confirm pending promotion |
| `cancelPromoteWrapperRole` | `(state) -> EditorState` | Cancel pending promotion |
| `demoteWrapperRole` | `(state, nodeId) -> EditorState` | Demote wrapper to simpler role |

---

## Editor Mutations

Source: `src/api/editorApi.ts`

These wrap `documentApi` functions with editor state, selection, and history management.

### Node insert/delete

| Function | Signature | Description |
| --- | --- | --- |
| `insertWrapper` | `(state, role: WrapperRole) -> EditorState` | Insert a container with role |
| `insertLeaf` | `(state, role: LeafRole) -> EditorState` | Insert a leaf with role |
| `insertSectionTemplate` | `(state, templateId) -> EditorState` | Insert a section template relative to the selected top-level wrapper when present |
| `deleteNode` | `(state, nodeId) -> EditorState` | Delete a node |
| `deleteNodes` | `(state, nodeIds) -> EditorState` | Delete multiple nodes |
| `createNodeClipboardJson` | `(payload) -> string` | Re-exported clipboard JSON helper for editor consumers |
| `createTextDocumentContentFromClipboardHtml` | `(document, data) -> TextDocumentContent` | Re-exported styled HTML clipboard converter for editor paste surfaces |
| `duplicateDraggedNodes` | `(state, nodeIds, targetParentId, placements, options?) -> EditorState` | Duplicate dragged nodes into a resolved target parent and placement, then select the duplicates |
| `duplicateSelection` | `(state, nodeIds?) -> EditorState` | Duplicate the current selection and select the duplicated roots |
| `pasteClipboardNodes` | `(state, payload) -> EditorState` | Paste editor clipboard nodes and select pasted roots |
| `pasteExternalClipboard` | `(state, data) -> EditorState` | Paste external text/html/link/image clipboard data as a new node |

### Movement and resize

| Function | Signature | Description |
| --- | --- | --- |
| `moveNode` | `(state, nodeId, { x?, y? }) -> EditorState` | Move a node to absolute authored coordinates |
| `moveNodes` | `(state, moves) -> EditorState` | Move multiple nodes to absolute authored coordinates |
| `nudgeNode` | `(state, nodeId, { x, y }) -> EditorState` | Nudge by keyboard delta through the same child overflow and parent-expansion policy as drag/drop |
| `resizeNode` | `(state, nodeId, { width?, height? }) -> EditorState` | Resize by authored size patch |
| `setContainerChildBoundary` | `(state, nodeId, childBoundary) -> EditorState` | Set wrapper child overflow policy |

### Reorder and reparent

| Function | Signature | Description |
| --- | --- | --- |
| `reorderNode` | `(state, nodeId, action) -> EditorState` | Reorder among siblings |
| `reorderNodes` | `(state, nodeIds, action) -> EditorState` | Reorder multiple nodes |
| `reparentNode` | `(state, nodeId, newParentId, x, y) -> EditorState` | Reparent a node at a local position |
| `reparentNodes` | `(state, moves, newParentId) -> EditorState` | Reparent multiple nodes at local positions |
| `moveNodeInTree` | `(state, nodeId, targetParentId, targetIndex) -> EditorState` | Move to specific tree position |

### Alignment and distribution

| Function | Signature | Description |
| --- | --- | --- |
| `alignNodes` | `(state, nodeIds, alignment) -> EditorState` | Align selected nodes |
| `distributeNodes` | `(state, nodeIds, axis) -> EditorState` | Distribute nodes evenly |

Editor alignment and distribution delegate to `alignNodesDoc` and `distributeNodesDoc`; callers provide `SelectionRect` measurements because the document model does not own DOM geometry.

### Field updates

| Function | Signature | Description |
| --- | --- | --- |
| `updateTextField` | `(state, nodeId, field: EditorTextField, value: string) -> EditorState` | Update text/style field |
| `updateRectField` | `(state, nodeId, field, value: string) -> EditorState` | Update geometry field |
| `updateStickyField` | `(state, nodeId, patch) -> EditorState` | Update sticky config |
| `updateWrapperStyleField` | `(state, nodeId, field: WrapperStyleField, value) -> EditorState` | Update wrapper style |
| `setNodeVisibility` | `(state, nodeId, visible: boolean) -> EditorState` | Set visibility |

### Text operations

```typescript
applyTextNodeMarkdown(state: EditorState, nodeId: NodeId, markdown: string): EditorState
```

Apply markdown to a text node with history tracking.

---

## Rendering and Export

Source: `src/api/siteApi.ts`

### Components

| Export | Type | Description |
| --- | --- | --- |
| `SiteRenderer` | React component | Renders the site from a `DocumentModel` |
| `Stage` | React component | Editor canvas (from `editorViewApi`) |

### Export functions

| Function | Signature | Description |
| --- | --- | --- |
| `renderSiteBodyHtml` | `(document, options?) -> string` | Render site body as HTML string |
| `renderSiteCss` | `(document, options?) -> string` | Render site CSS |
| `renderSiteHtmlDocument` | `(document, options?) -> string` | Render complete HTML document |
| `renderPageHtmlDocument` | `(document, pageId, options?) -> string` | Render a single page HTML document |
| `renderSiteExportBundle` | `(document, options?) -> SiteExportBundle` | Generate export bundle (HTML + CSS + assets) |
| `renderSiteExportBundles` | `(document, options?) -> SitePageExportBundle[]` | Generate per-page export bundles |
| `buildRouteManifest` | `(document) -> RouteManifest` | Build route manifest for all pages |
| `buildHostingConfigs` | `(document) -> HostingConfig[]` | Build hosting platform configs (redirects, etc.) |

### Constants

`DEFAULT_SITE_CSS_FILE_NAME`, `DEFAULT_SITE_HTML_FILE_NAME`

---

## Utilities

Source: `src/api/documentApi.ts`

### Unit parsing

| Function | Signature | Description |
| --- | --- | --- |
| `parseUnitValue` | `(value: string) -> UnitValue` | Parse `'100px'` -> `{ value: 100, unit: 'px' }` |
| `parseWidthValue` | `(value: string) -> WidthValue` | Parse width (supports keywords like `'fit-content'`) |
| `parseHeightValue` | `(value: string) -> HeightValue` | Parse height (supports `'auto'`, `'aspect-ratio:16/9'`) |
| `parseSpacingValue` | `(value: string) -> SpacingValue` | Parse spacing values |
| `parseFontSizeValue` | `(value: string) -> FontSizeValue` | Parse font size values |
| `resolveUnitValuePx` | `(value: UnitValue, context) -> number` | Resolve to absolute pixels given viewport context |
| `formatValue` | `(value: UnitValue) -> string` | Format back to CSS string |

### Link helpers

| Function | Signature | Description |
| --- | --- | --- |
| `getLinkHref` | `(node) -> string` | Resolve the href for a linked node |
| `shouldOpenNavigationInNewTab` | `(node) -> boolean` | Check if a link should open in new tab |

### Default factories

Source: `src/model/defaultFactories.ts`

| Function | Signature | Description |
| --- | --- | --- |
| `createDefaultLinkExtension` | `() -> LinkExtension` | Create a default link extension (`{ linkType: 'anchor', href: '#' }`) |
| `createDefaultRect` | `(x?, y?, width?, height?) -> RectModel` | Create a default rect |
| `createDefaultSticky` | `() -> StickyDefinition` | Create a default sticky definition |
| `createContainerNode` | `(subtype, parentId) -> ContainerNode` | Create a container node |
| `createTextNode` | `(subtype, parentId) -> TextNode` | Create a text node |
| `createMediaNode` | `(subtype, parentId) -> MediaNode` | Create a media node |
| `createLinkTextNode` | `(parentId) -> TextNode` | Create a text node preconfigured as a link |
| `createButtonTextNode` | `(parentId) -> TextNode` | Create a text node preconfigured as a button |
| `DEFAULT_SVG_VIEW_BOX` | string | Default viewBox for new inline svg nodes |
| `DEFAULT_SVG_INNER_MARKUP` | string | Default star-shape markup for new inline svg nodes |

---

## Type Reference

### DocumentModel

```typescript
type DocumentModel = {
  rootId: NodeId;
  nodes: Record<NodeId, DocumentNode>;
  fontLibrary: FontLibrary;
  animationSettings?: DocumentAnimationSettings;
  pages?: DocumentPage[];
  siteSettings?: SiteSettings;
  sharedRegionIds?: NodeId[];
};
```

### DocumentNode

```typescript
type DocumentNode = SiteNode | ContainerNode | MediaNode | TextNode;
type LeafNode = MediaNode | TextNode;
```

### ContainerNode

```typescript
type ContainerNode = BaseNode & {
  contentType: 'container';
  subtype: ContainerSubtype;  // 'section' | 'header' | 'footer' | 'container' | 'group' | 'nav' | 'aside' | 'article'
  rect: RectModel;
  layout?: ContainerLayout;
  ariaLabel?: string;
  sticky?: StickyDefinition;
  animation?: AnimationDefinition;
  pageTargetIds?: PageId[];
  topLevelWrapperVisibility?: TopLevelWrapperVisibilityState;
  style?: BorderStyle & ShadowStyle & BackgroundStyle & PaddingStyle & {
    sectionBorderBottomColor?: string;
    sectionBorderBottomWidth?: ParsedValue<UnitValue>;
  };
};

type ContainerLayout = {
  childBoundary?: ContainerChildBoundary;
};

type ContainerChildBoundary = 'anchor' | 'box';
```

Missing `childBoundary` resolves to `'anchor'`. The inspector labels this policy as **Child overflow**: `anchor` is shown as **Allow overflow** and keeps a child's `x`,`y` origin inside the wrapper content box while allowing the child body to overflow; `box` is shown as **Keep inside** and keeps the full child box inside the content box.

Drag/drop may also request parent height growth through:

```typescript
type ParentExpansionRequest = {
  parentId: NodeId;
  minHeightPx: number;
};
```

`auto` parent heights are preserved when expansion is requested; the child placement still commits, but the parent height stays authored as `auto`.

### TextNode

```typescript
type TextNode = BaseNode & {
  contentType: 'text';
  subtype: TextSubtype;  // 'block' | 'rich' | 'code' | 'list' | 'table'
  content: TextDocumentContent;
  lang?: string;
  htmlTag?: HeadingTag | 'p' | 'blockquote' | 'div';  // @deprecated transitional
  link?: LinkExtension;
  code?: { language: string; theme?: 'auto' | 'light' | 'dark'; highlightedHtml?: string };  // @deprecated derived cache; ignored on import/render
  rect: RectModel;
  sticky?: StickyDefinition;
  animation?: AnimationDefinition;
  style?: ShadowStyle & TypographyStyle & BorderStyle & {
    textWrap?: TextWrapMode;
    background?: string;
    paddingBlock?: ParsedValue<SpacingValue>;
    paddingInline?: ParsedValue<SpacingValue>;
  };
};
```

### MediaNode

```typescript
type MediaNode = BaseNode & {
  contentType: 'media';
  subtype: MediaSubtype;  // 'image' | 'video' | 'svg' | 'embed'
  src?: string;
  alt?: string;
  link?: LinkExtension;
  video?: {
    autoplay?: boolean;
    loop?: boolean;
    muted?: boolean;
    controls?: boolean;          // always rendered on preview/export for a11y
    poster?: string;
    preload?: VideoPreload;      // 'auto' | 'metadata' | 'none'
    title?: string;
    titleHidden?: boolean;
    titleTag?: HeadingTag;       // h1-h6 for visible title overlays
    description?: string;        // aria-describedby text, preserves authored whitespace
    captions?: {
      src?: string;              // WebVTT (.vtt)
      label?: string;
      srclang?: string;
      default?: boolean;
    };
    transcriptSrc?: string;
    intrinsicRatio?: number;     // measured from loaded metadata
  };
  svg?: SvgExtension;
  rect: RectModel;
  sticky?: StickyDefinition;
  animation?: AnimationDefinition;
  style?: BorderStyle & ShadowStyle & {
    objectFit?: MediaObjectFit;  // 'cover' | 'contain' | 'fill' | 'none' | 'scale-down'
    objectPosition?: string;
  };
};
```

`adoptVideoIntrinsicRatioDoc(document, nodeId, ratio)` records a video's measured intrinsic aspect ratio and adopts it as the layout aspect only while the node height still follows the default or previously adopted intrinsic ratio; user-authored aspects and fixed heights are never overwritten.

### SvgExtension

```typescript
type SvgStrokeCap = 'butt' | 'round' | 'square';
type SvgStrokeJoin = 'miter' | 'round' | 'bevel';
type SvgStrokePaintOrder = 'normal' | 'fill' | 'stroke';

type SvgStrokeStyle = {
  enabled: boolean;
  color?: string;
  width?: string | number;
  cap?: SvgStrokeCap;
  join?: SvgStrokeJoin;
  dashArray?: string;
  dashOffset?: string;
  nonScaling?: boolean;
  paintOrder?: SvgStrokePaintOrder;
};

type SvgExtension = {
  renderMode: 'img' | 'inline';
  innerMarkup?: string;       // sanitized inner markup of the root <svg> (callers MUST sanitize via src/lib/svgSanitize.ts)
  originalViewBox?: string;   // parsed from the imported markup
  viewBox?: string;           // author override (e.g. fitted to content bbox)
  overflow?: 'visible';       // hidden/default is omitted; visible exports overflow: visible !important on the root <svg>
  a11y?: SvgA11y;             // hidden | title (aria-label) | desc (aria-describedby)
  monochrome?: { enabled: boolean; fill?: string };  // alpha rides on the color; explicit no-paint SVG fills remain untouched
  stroke?: SvgStrokeStyle;
};
```

SVG document operations:

| Function | Parameters | Description |
| --- | --- | --- |
| `setSvgMarkupDoc` | `(document, nodeId, payload: SvgMarkupPayload)` | Replace inline markup; resets the author viewBox override |
| `convertImageToInlineSvgDoc` | `(document, nodeId, payload: SvgMarkupPayload)` | Convert an image node into an inline svg node in place |
| `setSvgViewBoxDoc` | `(document, nodeId, viewBox: string)` | Set or clear the author viewBox override (validated) |

`SvgMarkupPayload` carries `innerMarkup` (sanitized) and the extracted `originalViewBox`. Sanitization happens at input time in the editor layer (`sanitizeSvgMarkupWithCleanup` in `src/lib/svgSanitize.ts`, which lazy-loads SVGO for conservative cleanup before the final DOMPurify pass); the document API stores what it is given and documents the sanitized-input contract. `sanitizeSvgMarkup` remains the synchronous DOMPurify-only guard for stored document ingestion.

### StickyDefinition

```typescript
type StickyDefinition = {
  enabled: boolean;
  target: 'self' | 'contentWrapper';
  edges: { top?: boolean; bottom?: boolean };
  offsetTop?: ParsedValue<UnitValue>;
  offsetBottom?: ParsedValue<UnitValue>;
  durationMode?: 'auto' | 'custom';
  duration: ParsedValue<UnitValue>;
  durationTop?: ParsedValue<UnitValue>;
  durationBottom?: ParsedValue<UnitValue>;
  elevated?: boolean;
};
```

### LinkExtension

```typescript
type LinkExtension = {
  linkType: 'external' | 'page' | 'anchor';
  href?: string;
  openInNewTab?: boolean;
  targetPageId?: PageId;
  pageAnchorId?: NodeId;
  anchorTargetId?: NodeId;
};
```

### TextDocumentContent

```typescript
type TextDocumentContent = {
  blocks: TextDocumentBlock[];
  blockGap?: number;
};

type TextDocumentBlock = TextBlockContent | CodeBlockContent | ListBlockContent;
```

### ListContent

```typescript
type ListContent = UnorderedListContent | OrderedListContent | DescriptionListContent;

type UnorderedListContent = { type: 'ul'; markerStyle?: UnorderedListMarkerStyle; items: ListTextItem[] };
type OrderedListContent = { type: 'ol'; start?: number; markerStyle?: OrderedListMarkerStyle; items: ListTextItem[] };
type DescriptionListContent = { type: 'dl'; items: DescriptionListItem[] };
type ListTextItem = { text: string; direction?: 'ltr' | 'rtl'; link?: LinkExtension };
type DescriptionListItem = { term: string; description: string; direction?: 'ltr' | 'rtl'; link?: LinkExtension };
```

### DocumentCommand

```typescript
type DocumentCommand =
  | { type: 'setRect'; nodeId: NodeId; field: 'x' | 'y' | 'width' | 'height'; value: string }
  | { type: 'setSticky'; nodeId: NodeId; patch: Partial<StickyDefinition> }
  | { type: 'setText'; nodeId: NodeId; field: EditorTextField; value: string };
```

### EditorTextField

Wide union of all text/style field names:

```typescript
type EditorTextField =
  // Node content fields
  | 'name' | 'content' | 'htmlTag' | 'lang' | 'label'
  // Link fields
  | 'linkEnabled' | 'linkType' | 'anchorTargetId' | 'href' | 'openInNewTab' | 'src' | 'alt' | 'targetPageId' | 'pageAnchorId'
  // Code fields
  | 'codeLanguage' | 'codeTheme' | 'tabSize'
  // Typography
  | 'color' | 'backgroundColor' | 'fontFamily' | 'fontSize' | 'fontWeight' | 'fontStyle'
  | 'textDecorationLine' | 'lineHeight' | 'direction' | 'textAlign'
  // Text wrap
  | 'textWrap'
  // Background and padding (link/button)
  | 'background' | 'paddingBlock' | 'paddingInline'
  // Border
  | 'borderColor' | 'borderTopColor' | 'borderRightColor' | 'borderBottomColor' | 'borderLeftColor'
  | 'borderWidth' | 'borderTopWidth' | 'borderRightWidth' | 'borderBottomWidth' | 'borderLeftWidth'
  | 'borderRadius' | 'borderTopLeftRadius' | 'borderTopRightRadius' | 'borderBottomRightRadius' | 'borderBottomLeftRadius'
  // Shadow
  | 'shadowColor' | 'shadowBlur' | 'shadowSpread' | 'shadowOffsetX' | 'shadowOffsetY'
  // Media fit (MediaFitField)
  | 'objectFit' | 'objectPosition'
  // Video settings (VideoSettingField)
  | 'videoAutoplay' | 'videoMuted' | 'videoControls' | 'videoLoop' | 'videoPoster' | 'videoPreload'
  | 'videoTitle' | 'videoTitleHidden' | 'videoTitleTag' | 'videoDescription'
  | 'videoCaptionsSrc' | 'videoCaptionsLabel' | 'videoCaptionsLang' | 'videoCaptionsDefault'
  | 'videoTranscriptSrc'
  // SVG settings (SvgSettingField)
  | 'svgHidden' | 'svgTitle' | 'svgDesc' | 'svgOverflow'
  | 'svgMonochrome' | 'svgFill'
  | 'svgStrokeEnabled' | 'svgStrokeColor' | 'svgStrokeWidth'
  | 'svgStrokeCap' | 'svgStrokeJoin' | 'svgStrokeDashArray' | 'svgStrokeDashOffset'
  | 'svgStrokeNonScaling' | 'svgStrokePaintOrder' | 'svgViewBox'
  // Block gap
  | 'blockGap';
```

### WrapperStyleField

```typescript
type WrapperStyleField =
  | 'background'
  | 'backgroundGradient'   // CSS gradient text, validated via isGradientText
  | 'backgroundSize'       // background-size for a repeating gradient
  | 'backgroundClipText'   // 'true' to clip the background to descendant text
  | BorderColorField | BorderWidthField | BorderRadiusField | ShadowStyleField
  | 'paddingTop' | 'paddingRight' | 'paddingBottom' | 'paddingLeft'
  | 'sectionBorderBottomColor' | 'sectionBorderBottomWidth';
```

`setWrapperStyleFieldDoc(document, nodeId, field, value)` applies the same wrapper style contract at the document API layer: structural wrapper background colors are forced opaque, gradient text is validated and stored verbatim, repeating gradients seed `backgroundSize`, and unit-backed spacing/border fields are parsed before storage.

### Gradient parser

`src/model/gradient.ts` (re-exported from `documentViewApi`) provides the two-way CSS gradient parser used by the wrapper Design inspector.

| Function | Signature | Description |
| --- | --- | --- |
| `parseGradient` | `(css: string) -> ParsedGradient \| null` | Parse a supported gradient string; null when not round-trippable |
| `serializeGradient` | `(gradient: ParsedGradient) -> string` | Serialize the structured form back to CSS text |
| `createDefaultGradient` | `() -> ParsedGradient` | Starter linear gradient for newly enabled backgrounds |
| `isGradientText` | `(value: string) -> boolean` | Quick syntactic gradient check used by validation |

`ParsedGradient` covers `type` (`linear`/`radial`/`conic`), `repeating`, `angle`, `position`, radial `shape`/`extent`/`sizes`, and `stops` (opaque color token + optional px/% position). Color values are never reinterpreted, so `var()`/`color-mix()` pass through.

### AnimationDefinition

```typescript
type AnimationDefinition =
  | EntranceAnimationDefinition   // trigger: 'entrance'
  | OngoingAnimationDefinition    // trigger: 'ongoing'
  | ScrollAnimationDefinition     // trigger: 'scroll'
  | MouseAnimationDefinition      // trigger: 'mouse'
  | ClickAnimationDefinition      // trigger: 'click' | 'activate'
  | HoverAnimationDefinition;     // trigger: 'hover' | 'interest'
```

Each variant has:

| Field | Type | Description |
| --- | --- | --- |
| `trigger` | `AnimationTriggerType` | The trigger kind |
| `triggerId` | `NodeId?` | Optional trigger source node |
| `effect` | Named or keyframe effect | The animation effect |
| `reducedMotion` | `ReducedMotionResponse?` | Accessibility policy |
| `requiresSticky` | `boolean?` | Whether the animation requires sticky |

`HoverAnimationDefinition` additionally has `outAction?: 'keep' | 'reverse' | 'none'`.

### AnimationTriggerType

```typescript
type AnimationTriggerType = 'entrance' | 'ongoing' | 'scroll' | 'click' | 'activate' | 'hover' | 'interest' | 'mouse';
```

### DocumentPage

```typescript
type DocumentPage = {
  type: 'page';
  id: PageId;
  slug: string;
  displayName: string;
  pageRole?: 'default' | 'home';
  sectionIds: NodeId[];
  parentPageId?: PageId;
  slugAliases?: string[];
  lang?: string;
  visible: boolean;
  viewTransition?: 'none' | 'crossfade' | 'slide';
};
```

### SiteSettings

```typescript
type SiteSettings = {
  lang: string;
  status: 'draft' | 'published';
  viewTransition: 'none' | 'crossfade' | 'slide';
  title?: string;
  autoSyncSlugs?: boolean;
  outputStructure?: 'directory' | 'flat';
};
```

### Value Types

```typescript
type UnitValue = { value: number; unit: 'px' | '%' | 'vw' | 'vh' | 'vmin' | 'vmax' };
type FontSizeValue = { value: number; unit: 'px' | 'em' | 'rem' };
type SpacingValue = { value: number; unit: 'px' | 'em' | 'rem' };
type WidthValue = UnitValue | { keyword: 'fit-content' | 'min-content' | 'max-content' };
type HeightValue = UnitValue | { keyword: 'auto' } | { keyword: 'aspect-ratio'; ratio: number };
type ParsedValue<T> = { raw: string; parsed: T };

type RectModel = {
  x: ResponsiveValue<ParsedValue<UnitValue>>;
  y: ResponsiveValue<ParsedValue<UnitValue>>;
  width: ResponsiveValue<ParsedValue<WidthValue>>;
  height: ResponsiveValue<ParsedValue<HeightValue>>;
};

type ResponsiveValue<T> = { base: T; tablet?: T; mobile?: T };
```

---

## Versioning

Editor Playground tracks four independent semver versions, all defined in `src/lib/version.ts`.

| Constant | Tracks |
| --- | --- |
| `PROJECT_VERSION` | Umbrella version — mirrors `package.json "version"` |
| `DOCUMENT_MODEL_VERSION` | The `DocumentModel` serialized JSON schema |
| `API_VERSION` | The `documentApi` / `editorApi` contract |
| `EDITOR_VERSION` | The editor UI / shell |

### Bump rules

| Level | Trigger | How |
| --- | --- | --- |
| **Patch** | Every commit | Automatic — pre-commit hook runs `node scripts/bump-version.mjs all patch`; that script updates `package.json`, refreshes `pnpm-lock.yaml` via `corepack pnpm install --lockfile-only --ignore-scripts`, and stages `src/lib/version.ts`, `package.json`, `pnpm-lock.yaml`, and `CHANGELOG.md` as part of the same commit |
| **Minor** | Small migratable breaking change, significant new feature | Manual — `node scripts/bump-version.mjs [subsystem] minor` |
| **Major** | Unrecoverable breaking change, project-wide feature shift | Manual — `node scripts/bump-version.mjs [subsystem] major` |

Run `/version-bump` for guidance on which level to use for each subsystem.

### API 2.0.0 breaking insertion cleanup

`insertLeafDoc(document, role, parentId)` is now the single API-first leaf insertion surface for all editor leaf roles, including `table`. Deprecated insertion aliases were removed instead of retained as compatibility shims.

---

## Export Coverage Index

This index keeps the split API reference synchronized with the public export surface. Narrative usage details live in the topic pages above; names listed here are intentionally terse so `pnpm run check:api-docs` can catch undocumented public exports.

### Document and Editor API

- `SECTION_TEMPLATES`, `SectionTemplateId`, `SectionTemplateSummary`, `SectionTemplateInsertionOptions`, `createBlankInitialDocument`, `createSectionFromTemplate`
- `LeafInsertionRole`, `InsertContainerOptions`, `insertLeafDoc`, `setListContentDoc`, `insertTableRowDoc`, `insertTableColumnDoc`, `removeTableRowDoc`, `removeTableColumnDoc`, `setTableHeaderRowDoc`, `setTableColumnAlignmentDoc`, `setTableDirectionDoc`, `setTableColumnWidthDoc`, `setTableRowHeightDoc`, `setTableStyleDoc`, `setTableCellStyleDoc`, `setTableSelectionStyleDoc`, `setTableSelectionBorderDoc`, `TableSelectionDescriptor`, `TableBorderScope`, `TableCellStylePatch`, `TableCellBorderPatch`, `NodeOrderAction`, `NodeAlignmentMode`, `NodeDistributionMode`, `NodeTextField`, `SelectionRect`, `alignNodesDoc`, `distributeNodesDoc`, `reorderNodesDoc`, `promoteWrapperRoleDoc`, `demoteWrapperRoleDoc`, `PromoteWrapperRoleOptions`, `SemanticContainerSubtype`, `setContainerSemanticTypeDoc`, `setContainerAriaLabelDoc`, `groupNodesDoc`, `ungroupNodeDoc`, `convertGroupToContainerDoc`, `expandParentHeightDoc`, `ParentExpansionRequest`, `ParentExpansionOptions`
- `adoptVideoIntrinsicRatioDoc`, `MediaFitField`, `MediaObjectFit`, `VideoPreload`, `VideoSettingField`
- `setSvgMarkupDoc`, `convertImageToInlineSvgDoc`, `setSvgViewBoxDoc`, `SvgMarkupPayload`, `SvgExtension`, `SvgA11y`, `SvgStrokeCap`, `SvgStrokeJoin`, `SvgStrokePaintOrder`, `SvgStrokeStyle`, `SvgSettingField`
- `StickyGeometrySnapshot`, `StickyLayoutState`, `ComputedStickyRegistration`, `ComputedWrapperStickyState`
- `setPageAsHomeDoc`, `normalizeSlug`
- `FocusedMode`, `LinkValidationError`, `StageProps`, `SiteRendererProps`, `SiteExportOptions`

### Font API

- `DEFAULT_DOCUMENT_FONT_FAMILIES`, `createDefaultFontLibrary`, `getDefaultDocumentFontFamily`, `getDocumentDefaultFontFamily`
- `getDocumentFontUsageMap`, `GoogleFontsFetchOptions`, `normalizeDocumentFontState`

### Drag and Drop API Types

- `DragDropTarget`, `DragGeometrySnapshot`, `DragGuide`, `DragMotion`, `DragMotionSample`, `DragParentExpansion`, `DragPreviewItem`, `DragResolvedPlacement`

### Animation API Types and Constants

- `NAMED_EASINGS`, `TriggerMetadata`
- `AnimationInvokeAction`, `AnimationTimingOptions`, `OngoingTimingOptions`
- `NamedEntranceEffect`, `NamedOngoingEffect`, `NamedScrollEffect`, `NamedMouseEffect`, `NamedAnimationEffect`, `KeyframeAnimationEffect`
- `HoverOutAction`, `DocumentAnimationA11y`, `PerTriggerReducedMotionSettings`
- `PresetParamType`, `PresetParamSchema`

### Model Factory Exports

- `nextId`, `syncIdCountersWithDocument`

### Model Type Exports

- `BreakpointId`, `FontSizeUnit`, `SpacingUnit`, `FontSource`, `DocumentFontOrigin`, `FontAxis`
- `CodeTheme`
- `LeafTypographyField`, `TextWrapField`, `TextStyleField`, `LinkStyleField`, `ImageStyleField`, `ButtonStyleField`
- `LinkKind`, `ListDirection`, `ListContentType`, `StickyEdges`, `StickyTarget`, `ViewportMeasurement`
- `RichTextLeaf`, `RichTextLink`, `RichInlineNode`, `RichBlockStyle`, `StandaloneTextNodeSnapshot`
- `RichCodeLine`, `RichCodeBlock`, `RichListItem`, `RichUnorderedListBlock`, `RichOrderedListBlock`, `RichListBlock`
- `TableColumnAlignment`, `RichTableStyle`, `RichTableCellStyle`, `RichTableCell`, `RichTableRow`, `RichTableBlock`, `TableBlockContent`
- `TextDocumentBlocks`, `TemplateBuild`, `TemplateNode`, `TextStyleOptions`, `BoxPadding`
- `ContainerSubtype`, `ContainerLayout`, `ContainerChildBoundary`, `RectConfig`, `TextNodeConfig`, `LinkNodeConfig`, `ImageNodeConfig`

### `schemaVersion` in exported documents

`serializeDocumentJson()` stamps the current `DOCUMENT_MODEL_VERSION` into the top-level `schemaVersion` field of the serialized JSON. On import, `parseImportedDocumentJson()` emits a `console.warn` if the stored version differs from the current one, but still attempts to load the document through the normal normalization and validation pipeline. A version mismatch is informational — structural invalidity is the hard-error condition.
