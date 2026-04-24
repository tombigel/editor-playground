# API Reference

This landing page now points to nested reference pages instead of keeping the entire API surface in one long document.

## Pages

- [Overview](./API_OVERVIEW.md)
- [Document Model](./API_DOCUMENT_MODEL.md)
- [Node and Layout](./API_NODE_AND_LAYOUT.md)
- [Text](./API_TEXT.md)
- [Pages and Site](./API_PAGES_AND_SITE.md)
- [Editor](./API_EDITOR.md)
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

Converts a text node to a different subtype, preserving content where possible.

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
| `setCodeBlockThemeDoc` | `(document, nodeId, theme: string) -> DocumentModel` | Set the color theme (`'light'` or `'dark'`) |

---

## Pages and Site Structure

Source: `src/api/pageApi.ts`

### Page CRUD

| Function | Signature | Description |
| --- | --- | --- |
| `addPage` | `(document, options?: Partial<Omit<DocumentPage, 'type' \| 'id'>>) -> DocumentModel` | Add a new page with optional properties |
| `deletePage` | `(document, pageId) -> DocumentModel` | Delete a page and unlink its sections |
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

Update the session with new pointer position; recalculates guides, snaps, and drop targets. Stationary updates preserve the prior snap state so a pointer-up without movement commits the same visible preview position.

```typescript
finishDragSession(session: DragSession, input: DragUpdateInput): DragCommitIntent
```

Finalize the drag and return the commit intent (what to move/reparent).

```typescript
cancelDragSession(session: DragSession | null): null
```

Cancel and clean up.

### Types

See [`DragSession`](#dragsession), [`DragStartContext`](#dragstartcontext), [`DragUpdateInput`](#dragupdateinput), [`DragCommitIntent`](#dragcommitintent) in the type reference.

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

### Movement and resize

| Function | Signature | Description |
| --- | --- | --- |
| `moveNode` | `(state, nodeId, dx, dy) -> EditorState` | Move a node by delta |
| `moveNodes` | `(state, nodeIds, dx, dy) -> EditorState` | Move multiple nodes |
| `nudgeNode` | `(state, nodeId, dx, dy) -> EditorState` | Nudge (small move, usually keyboard) |
| `resizeNode` | `(state, nodeId, dw, dh) -> EditorState` | Resize by delta |

### Reorder and reparent

| Function | Signature | Description |
| --- | --- | --- |
| `reorderNode` | `(state, nodeId, action) -> EditorState` | Reorder among siblings |
| `reorderNodes` | `(state, nodeIds, action) -> EditorState` | Reorder multiple nodes |
| `reparentNode` | `(state, nodeId, newParentId) -> EditorState` | Reparent a node |
| `reparentNodes` | `(state, nodeIds, newParentId) -> EditorState` | Reparent multiple nodes |
| `moveNodeInTree` | `(state, nodeId, targetParentId, targetIndex) -> EditorState` | Move to specific tree position |

### Alignment and distribution

| Function | Signature | Description |
| --- | --- | --- |
| `alignNodes` | `(state, nodeIds, alignment) -> EditorState` | Align selected nodes |
| `distributeNodes` | `(state, nodeIds, axis) -> EditorState` | Distribute nodes evenly |

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
  subtype: ContainerSubtype;  // 'section' | 'header' | 'footer' | 'container' | 'group'
  rect: RectModel;
  sticky?: StickyDefinition;
  animation?: AnimationDefinition;
  pageTargetIds?: PageId[];
  topLevelWrapperVisibility?: TopLevelWrapperVisibilityState;
  style?: BorderStyle & ShadowStyle & BackgroundStyle & PaddingStyle & {
    sectionBorderBottomColor?: string;
    sectionBorderBottomWidth?: ParsedValue<UnitValue>;
  };
};
```

### TextNode

```typescript
type TextNode = BaseNode & {
  contentType: 'text';
  subtype: TextSubtype;  // 'block' | 'rich' | 'code' | 'list'
  content: TextDocumentContent;
  lang?: string;
  htmlTag?: HeadingTag | 'p' | 'blockquote' | 'div';  // @deprecated transitional
  link?: LinkExtension;
  code?: { language: string; theme?: 'light' | 'dark'; highlightedHtml?: string };  // @deprecated transitional
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
  video?: { autoplay?: boolean; loop?: boolean; muted?: boolean };
  svg?: { renderMode: 'img' | 'inline' };
  rect: RectModel;
  sticky?: StickyDefinition;
  animation?: AnimationDefinition;
  style?: BorderStyle & ShadowStyle;
};
```

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
  | 'codeLanguage' | 'codeTheme'
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
  // Block gap
  | 'blockGap';
```

### WrapperStyleField

```typescript
type WrapperStyleField =
  | 'background'
  | BorderColorField | BorderWidthField | BorderRadiusField | ShadowStyleField
  | 'paddingTop' | 'paddingRight' | 'paddingBottom' | 'paddingLeft'
  | 'sectionBorderBottomColor' | 'sectionBorderBottomWidth';
```

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

Sticky Playground tracks four independent semver versions, all defined in `src/lib/version.ts`.

| Constant | Tracks |
| --- | --- |
| `PROJECT_VERSION` | Umbrella version — mirrors `package.json "version"` |
| `DOCUMENT_MODEL_VERSION` | The `DocumentModel` serialized JSON schema |
| `API_VERSION` | The `documentApi` / `editorApi` contract |
| `EDITOR_VERSION` | The editor UI / shell |

### Bump rules

| Level | Trigger | How |
| --- | --- | --- |
| **Patch** | Every commit | Automatic — pre-commit hook runs `node scripts/bump-version.mjs all patch`; that script updates `package.json`, refreshes `package-lock.json` via `npm install --package-lock-only --ignore-scripts`, and stages `src/lib/version.ts`, `package.json`, `package-lock.json`, and `CHANGELOG.md` as part of the same commit |
| **Minor** | Small migratable breaking change, significant new feature | Manual — `node scripts/bump-version.mjs [subsystem] minor` |
| **Major** | Unrecoverable breaking change, project-wide feature shift | Manual — `node scripts/bump-version.mjs [subsystem] major` |

Run `/version-bump` for guidance on which level to use for each subsystem.

### API 2.0.0 breaking insertion cleanup

`insertLeafDoc(document, role, parentId)` is now the single API-first leaf insertion surface for all editor leaf roles. Deprecated insertion aliases were removed instead of retained as compatibility shims.

---

## Export Coverage Index

This index keeps the split API reference synchronized with the public export surface. Narrative usage details live in the topic pages above; names listed here are intentionally terse so `npm run check:api-docs` can catch undocumented public exports.

### Document and Editor API

- `SECTION_TEMPLATES`, `SectionTemplateId`, `SectionTemplateSummary`, `SectionTemplateInsertionOptions`, `createSectionFromTemplate`
- `LeafInsertionRole`, `insertLeafDoc`, `setListContentDoc`, `NodeOrderAction`, `NodeTextField`
- `StickyGeometrySnapshot`, `StickyLayoutState`, `ComputedStickyRegistration`, `ComputedWrapperStickyState`
- `setPageAsHomeDoc`, `normalizeSlug`
- `FocusedMode`, `LinkValidationError`, `StageProps`, `SiteRendererProps`, `SiteExportOptions`

### Font API

- `DEFAULT_DOCUMENT_FONT_FAMILIES`, `createDefaultFontLibrary`, `getDefaultDocumentFontFamily`, `getDocumentDefaultFontFamily`
- `getDocumentFontUsageMap`, `GoogleFontsFetchOptions`, `normalizeDocumentFontState`

### Drag and Drop API Types

- `DragDropTarget`, `DragGeometrySnapshot`, `DragGuide`, `DragMotion`, `DragMotionSample`, `DragPreviewItem`

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
- `LeafTypographyField`, `TextWrapField`, `TextStyleField`, `LinkStyleField`, `ImageStyleField`, `ButtonStyleField`
- `LinkKind`, `ListDirection`, `ListContentType`, `StickyEdges`, `StickyTarget`, `ViewportMeasurement`
- `RichTextLeaf`, `RichTextLink`, `RichInlineNode`, `RichBlockStyle`, `StandaloneTextNodeSnapshot`
- `RichCodeLine`, `RichCodeBlock`, `RichListItem`, `RichUnorderedListBlock`, `RichOrderedListBlock`, `RichListBlock`
- `TextDocumentBlocks`, `TemplateBuild`, `TemplateNode`, `TextStyleOptions`, `BoxPadding`
- `RectConfig`, `TextNodeConfig`, `LinkNodeConfig`, `ImageNodeConfig`

### `schemaVersion` in exported documents

`serializeDocumentJson()` stamps the current `DOCUMENT_MODEL_VERSION` into the top-level `schemaVersion` field of the serialized JSON. On import, `parseImportedDocumentJson()` emits a `console.warn` if the stored version differs from the current one, but still attempts to load the document through the normal normalization and validation pipeline. A version mismatch is informational — structural invalidity is the hard-error condition.
