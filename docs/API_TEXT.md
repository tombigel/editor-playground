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

## Code Blocks

Code block handling stays text-model aware but uses syntax highlighting and language normalization helpers from `src/render/codeHighlight.ts`.

Examples:

- `setCodeBlockLanguageDoc(document, nodeId, language)`
- `setCodeBlockThemeDoc(document, nodeId, theme)`
- markdown import/export support for fenced code

## Read Next

- [Editor](./API_EDITOR.md) for editor-state wrappers
- [Types](./API_TYPES.md) for the text and document type surfaces
