# API Reference - Text

## Text Content

Primary sources:

- `src/api/documentApi.ts`
- `src/api/textMarkdown.ts`
- `src/api/textConversion.ts`
- `src/api/textMerge.ts`

Core mutation helpers:

- `setTextNodeContentDoc(document, nodeId, field, value)`
- `setTextDocumentContentDoc(document, nodeId, content)`
- `setTextDocumentBlockGapDoc(document, nodeId, blockGap)`
- `setTextDirectionDoc(document, nodeId, direction)`
- `normalizeTextNodeDoc(document, nodeId)`

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
