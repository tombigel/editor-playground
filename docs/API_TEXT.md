# API Reference - Text

## Text Content

Primary sources:

- `src/api/documentApi.ts`
- `src/api/textMarkdown.ts`
- `src/api/textConversion.ts`
- `src/api/textMerge.ts`

Core mutation helpers:

- `setTextNodeContentDoc(document, nodeId, field, value)`
- `setTextDocumentContentDoc(document, nodeId, content, options?)`
- `SetTextDocumentContentOptions`
- `setTextDocumentBlockGapDoc(document, nodeId, blockGap)`
- `setTextDirectionDoc(document, nodeId, direction)`
- `normalizeTextNodeDoc(document, nodeId)`

Standalone block text also uses the canonical text-document wrapper. A block node accepts exactly one text block in `content.blocks`, and that block may contain marked leaves and multiple inline links.

Soft breaks inside a standalone block are persisted as newline text in a `RichTextLeaf`, not as a separate `<br>` node. The stage and site renderers preserve those line breaks with `white-space: pre-wrap`.

When stage editing promotes a legacy whole-node block link to inline content, callers pass `{ clearBlockNodeLink: true }` to `setTextDocumentContentDoc()` so the node-level `link` is cleared atomically with the content update.

Node-level typography writes such as `fontSize`, `fontFamily`, `fontWeight`, `fontStyle`, `textDecorationLine`, and `color` clear matching inline rich-text overrides in the same text node. This lets inspector-level controls intentionally reset inline selections of the same style type while preserving unrelated inline marks and links.

Subtype conversion preserves compatible typography and inline structure. Converting a standalone block to rich text carries node style and rich inline children forward; converting a single rich text block to standalone block text preserves compatible inline marks and links instead of flattening them.

Standalone list text also uses the canonical text-document wrapper. A list node accepts exactly one `ul` or `ol` block in `content.blocks`, and that block may contain marked leaves, multiple inline links, and newline text inside each list item.

List item nesting is represented by `depth?: number` on the item, not by recursive nested list blocks. Depth is normalized to an integer from `0` to `8` and cannot increase by more than one level from the previous item.

Stage list editing and rich-text list editing share keyboard semantics: `Enter` creates a same-depth item, `Shift+Enter` inserts newline text in the same item, `Backspace` at item offset `0` merges into the previous item with a newline separator, and `Tab` / `Shift+Tab` adjust item depth only at item offset `0`.

Standalone table text uses the same wrapper with exactly one `table` block in `content.blocks`. Rows contain `table-cell` children, cells contain rich inline nodes only, `direction` controls table structure direction, `columnAlignments` is normalized to the column count when any explicit alignment is present, `columnWidths` / `rowHeights` store optional CSS lengths, and `style` stores table-wide design fields.

Table structure helpers are pure document mutations:

- `insertTableRowDoc(document, nodeId, rowIndex)`
- `insertTableColumnDoc(document, nodeId, columnIndex)`
- `removeTableRowDoc(document, nodeId, rowIndex)`
- `removeTableColumnDoc(document, nodeId, columnIndex)`
- `setTableHeaderRowDoc(document, nodeId, enabled)`
- `setTableColumnAlignmentDoc(document, nodeId, columnIndex, alignment)`

They no-op for missing or non-table nodes, preserve at least one row and one column, preserve table direction, sizing, and table-wide style metadata, and normalize the table after mutation.

## Rich Text

Rich text persists through the canonical text-document wrapper and should remain convertible through pure APIs. Editor UI is a consumer of that model, not the owner of it.

Useful helpers:

- `setRichTextContentDoc(document, nodeId, content)`
- `mergeTextNodesToRichDoc(document, nodeIds)`
- rich-text markdown parsing and serialization helpers in `textMarkdown`

## Text Conversion

Conversion policy belongs in API helpers rather than view code.

Examples:

- `convertTextNodeDoc(document, nodeId, subtype, options)`
- `switchTextSubtypeDoc(document, nodeId, subtype, options)`

Converting to `table` splits text into rows by line, then cells by tabs or unescaped pipes. List-to-table creates one row per list item while preserving compatible inline children. Table-to-text/list/code/rich flattens rows with newlines and cells with tab-separated text.

## Code Blocks

Code block handling stays text-model aware but uses syntax highlighting and language normalization helpers from `src/render/codeHighlight.ts`.

Examples:

- `setCodeBlockLanguageDoc(document, nodeId, language)`
- `setCodeBlockThemeDoc(document, nodeId, theme)` where `theme` is `auto`, `light`, or `dark`; `auto` follows the viewer's system color scheme via `prefers-color-scheme`
- `setCodeBlockTabSizeDoc(document, nodeId, tabSize)` stores visual tab width as CSS `tab-size` metadata
- `setCodeBlockWrapDoc(document, nodeId, wrap)` toggles soft wrapping; unwrapped code keeps literal text and scrolls horizontally
- `resetCodeBlockStyleDoc(document, nodeId)` preserves raw code text and language while clearing presentation overrides and returning theme to `auto`
- markdown import/export support for fenced code

On-stage code editing commits raw text back as exactly one `code-block`. `Enter` and `Shift+Enter` store `\n`; `Tab` and `Shift+Tab` store or remove literal `\t` indentation on the current or selected lines. Tab width and wrap changes do not rewrite text. The code edit surface mirrors user-facing `auto` theme behavior and is not coupled to the editor chrome theme.

## Read Next

- [Editor](./API_EDITOR.md) for editor-state wrappers
- [Types](./API_TYPES.md) for the text and document type surfaces
