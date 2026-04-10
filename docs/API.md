# API Reference

## Table of Contents

- [Architecture Overview](#architecture-overview)
- [Core Document Model](#core-document-model)
- [Node CRUD](#node-crud)
- [Geometry and Layout](#geometry-and-layout)
- [Text Content](#text-content)
- [Rich Text](#rich-text)
- [Text Conversion](#text-conversion)
- [Code Blocks](#code-blocks)
- [Pages and Site Structure](#pages-and-site-structure)
- [Top-Level Wrappers](#top-level-wrappers)
- [Fonts](#fonts)
- [Animations](#animations)
- [Drag and Drop](#drag-and-drop)
- [Editor State](#editor-state)
- [Editor Mutations](#editor-mutations)
- [Rendering and Export](#rendering-and-export)
- [Utilities](#utilities)
- [Type Reference](#type-reference)

---

## Architecture Overview

The API layer is structured as multiple modules:

| Module | Purpose | Side effects |
| --- | --- | --- |
| `documentApi` | Pure `DocumentModel -> DocumentModel` functions. Safe for scripts, tests, server-side. | None |
| `pageApi` | Pure page/site-structure mutations and queries. | None |
| `textConversion` | Pure text-subtype conversion helpers. | None |
| `textMerge` | Pure split/merge helpers for rich text. | None |
| `textMarkdown` | Markdown serialization and parsing. | None |
| `editorApi` | Wraps document APIs with editor state, selection, and history. The editor UI calls these. | Yes (state) |
| `fontApi` | Font library, Google Fonts catalog, stylesheet builders, weight utilities. | Some (fetching) |
| `siteApi` | Site renderer component and export functions. | Yes (rendering) |
| `editorViewApi` | Stage editor component. | Yes (rendering) |
| `dragDropApi` | Headless drag-and-drop session lifecycle. | None |
| `animationApi` | Animation model, presets, runtime preview, Interact config builder. | Some (preview) |

**Key principle**: every feature is achievable through the API layer without the editor UI. Core operations live in `documentApi` as pure functions; `editorApi` wraps them with selection and history concerns.

### Model note (Phase 1.7+)

The model layer defines a canonical text AST wrapper `TextDocumentContent = { blocks, blockGap? }` with Slate-compatible block variants. All text subtypes (`block`, `rich`, `code`, `list`) persist through this wrapper. Transitional fields like `htmlTag` and `code` still exist on `TextNode` for compatibility but canonical semantics live in `content.blocks`.

---

## Core Document Model

Source: `src/api/documentApi.ts`

### Document lifecycle

| Function | Signature | Description |
| --- | --- | --- |
| `createInitialDocument` | `() -> DocumentModel` | Creates a blank document with default structure |
| `cloneDocument` | `(document) -> DocumentModel` | Deep-clones a document |
| `parseDocumentJson` | `(raw: string) -> DocumentModel` | Parses and validates JSON into a `DocumentModel`; throws on invalid input |
| `serializeDocumentJson` | `(document) -> string` | Serializes a `DocumentModel` to formatted JSON |
| `validateDocument` | `(document) -> string[]` | Returns validation error messages (empty = valid) |
| `validateLinks` | `(document) -> LinkValidationError[]` | Returns link validation errors for all nodes |

### Batch commands

```typescript
applyDocumentCommands(document: DocumentModel, commands: DocumentCommand[]): DocumentModel
```

Applies a batch of typed commands in one pass. See [`DocumentCommand`](#documentcommand) in the type reference.

### Node selectors

| Function | Signature | Description |
| --- | --- | --- |
| `getNode` | `(document, nodeId) -> DocumentNode \| undefined` | Look up a single node by ID |
| `getChildren` | `(document, nodeId) -> DocumentNode[]` | Get direct children of a node |

### Type guards

| Function | Returns | Description |
| --- | --- | --- |
| `isSiteNode(node)` | `node is SiteNode` | Check if node is the site root |
| `isContainerNode(node)` | `node is ContainerNode` | Check if node is a container |
| `isTextNode(node)` | `node is TextNode` | Check if node is a text node |
| `isMediaNode(node)` | `node is MediaNode` | Check if node is a media node |
| `isLeafNode(node)` | `node is LeafNode` | Check if node is a leaf (text or media) |

---

## Node CRUD

Source: `src/api/documentApi.ts`

### Insert operations

| Function | Signature | Description |
| --- | --- | --- |
| `insertContainerDoc` | `(document, subtype: ContainerSubtype, parentId) -> DocumentModel` | Insert a container as last child of parent |
| `insertTextDoc` | `(document, parentId) -> DocumentModel` | Insert a text node as last child of parent |
| `insertMediaDoc` | `(document, parentId) -> DocumentModel` | Insert a media node as last child of parent |
| `insertSectionTemplateBeforeFooter` | `(document, templateId: SectionTemplateId) -> DocumentModel` | Insert a pre-built section template |

#### `insertContainerDoc` parameters

| Parameter | Type | Description |
| --- | --- | --- |
| `document` | `DocumentModel` | Source document |
| `subtype` | `ContainerSubtype` | `'section'`, `'header'`, `'footer'`, `'container'`, `'group'` |
| `parentId` | `NodeId` | Parent node to append into |

#### Section templates

The `SECTION_TEMPLATES` constant exports available template metadata as `SectionTemplateSummary[]`.

| Template ID | Category | Description |
| --- | --- | --- |
| `'blank'` | basic | Empty section |
| `'post'` | basic | Blog-style text section |
| `'stickyStaggeredImages'` | sticky | Staggered images with sticky scroll |
| `'stickyPinnedCards'` | sticky | Pinned cards with sticky scroll |
| `'stickyMediaReveal'` | sticky | Media reveal with sticky scroll |
| `'stickySteps'` | sticky | Step-through with sticky scroll |

#### Deprecated aliases

| Function | Use instead |
| --- | --- |
| `insertWrapperDoc` | `insertContainerDoc` |
| `insertLeafDoc(document, role, parentId)` | `insertTextDoc` / `insertMediaDoc` |

### Delete operations

| Function | Signature | Description |
| --- | --- | --- |
| `deleteNodeDoc` | `(document, nodeId) -> DocumentModel` | Delete a node and its descendants |
| `deleteNodesDoc` | `(document, nodeIds: NodeId[]) -> DocumentModel` | Delete multiple nodes; auto-filters to top-level IDs |

### Reorder and reparent

| Function | Signature | Description |
| --- | --- | --- |
| `reorderNodeDoc` | `(document, nodeId, action: NodeOrderAction) -> DocumentModel` | Reorder among siblings |
| `reparentNodeDoc` | `(document, nodeId, newParentId) -> DocumentModel` | Move to new parent; returns unchanged on invalid ops |
| `moveNodeInTreeDoc` | `(document, nodeId, targetParentId, targetIndex: number) -> DocumentModel` | Move to specific index in target parent |

`NodeOrderAction`: `'back'` | `'forward'` | `'sendToBack'` | `'bringToFront'`

---

## Geometry and Layout

Source: `src/api/documentApi.ts`

### Rect mutations

```typescript
setNodeRect(document: DocumentModel, nodeId: NodeId, field: 'x' | 'y' | 'width' | 'height', value: string): DocumentModel
```

Sets a single geometry field. The `value` is a CSS-like string (e.g. `'100px'`, `'50%'`, `'fit-content'`).

### Sticky behavior

```typescript
setNodeSticky(document: DocumentModel, nodeId: NodeId, patch: Partial<StickyDefinition>): DocumentModel
```

Merges a partial sticky definition into the node's existing sticky config. See [`StickyDefinition`](#stickydefinition) for all fields.

```typescript
setSiteNodeStickyElevation(document: DocumentModel, enabled: boolean): DocumentModel
```

Controls whether all sticky nodes are elevated (z-index boost) globally.

### Sticky resolution

| Function | Signature | Description |
| --- | --- | --- |
| `resolveStickyLayout` | `(document, snapshots: StickyGeometrySnapshot[]) -> StickyLayoutState` | Compute sticky layout for the full document given geometry snapshots |
| `resolveWrapperStickyState` | `(document, nodeId) -> ComputedWrapperStickyState` | Compute resolved sticky state for a single wrapper |

### Visibility

```typescript
setNodeVisibilityDoc(document: DocumentModel, nodeId: NodeId, visible: boolean): DocumentModel
```

---

## Text Content

Source: `src/api/documentApi.ts`, `src/api/textMarkdown.ts`

### Field-level mutations

```typescript
setTextNodeContentDoc(document: DocumentModel, nodeId: NodeId, field: EditorTextField, value: string): DocumentModel
```

Sets a single text field by name. Handles text nodes and media nodes. The `field` parameter is a wide union covering content, typography, link, border, shadow, and background properties. See [`EditorTextField`](#editortextfield) for the full list.

**Link fields** (available on block text and image nodes when `linkEnabled` is set):

| Field | Type | Description |
| --- | --- | --- |
| `linkEnabled` | `'true'` / `'false'` | Toggle link presence |
| `linkType` | `'anchor'` / `'external'` / `'page'` | Link destination type |
| `anchorTargetId` | `NodeId` | Anchor target node ID |
| `href` | `string` | External URL |
| `openInNewTab` | `'true'` / `'false'` | Open link in new tab |
| `targetPageId` | `PageId` | Internal page link target |
| `pageAnchorId` | `NodeId` | Page-relative anchor target |

**Styled link fields** (block text with `linkEnabled` and background):

| Field | Type | Description |
| --- | --- | --- |
| `background` | CSS color string | Background color for link button style |
| `paddingBlock` | CSS value string | Vertical padding |
| `paddingInline` | CSS value string | Horizontal padding |

### Document-level content mutations

| Function | Signature | Description |
| --- | --- | --- |
| `setTextDocumentContentDoc` | `(document, nodeId, content: TextDocumentContent) -> DocumentModel` | Replace entire text document content |
| `setTextDocumentBlockGapDoc` | `(document, nodeId, blockGap: number \| undefined) -> DocumentModel` | Set block gap spacing |
| `setRichTextContentDoc` | `(document, nodeId, content: RichContent) -> DocumentModel` | Replace rich content blocks (legacy array form) |
| `setListContentDoc` | `(document, nodeId, content: ListContent) -> DocumentModel` | Replace list content |
| `normalizeTextNodeDoc` | `(document, nodeId) -> DocumentModel` | Normalize text node to canonical form |

### Text direction

```typescript
setTextDirectionDoc(document: DocumentModel, nodeId: NodeId, direction: 'ltr' | 'rtl'): DocumentModel
```

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

Update the session with new pointer position; recalculates guides, snaps, and drop targets.

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
| `insertSectionTemplate` | `(state, templateId) -> EditorState` | Insert a section template |
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
