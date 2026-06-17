# API Reference - Document Model

## Core Document Model

Source modules:

- `src/api/documentApi.ts`
- `src/model/types/index.ts`
- `src/model/validation.ts`

### Document Lifecycle

| Function | Description |
| --- | --- |
| `createInitialDocument()` | Creates the non-blank starter document with default site/page structure |
| `createBlankInitialDocument()` | Creates a starter document with header, footer, and one blank section |
| `cloneDocument(document)` | Deep-clones a document |
| `parseDocumentJson(raw)` | Parses and validates JSON into a `DocumentModel` |
| `serializeDocumentJson(document)` | Serializes a document to formatted JSON |
| `validateDocument(document)` | Returns validation errors |
| `validateLinks(document)` | Returns link-validation errors |

### Batch Commands

`applyDocumentCommands(document, commands)` applies multiple document commands in one pass and is the preferred route when a caller already has a prepared mutation list.

### Node Selectors And Guards

- `getNode(document, nodeId)`
- `getChildren(document, nodeId)`
- `isSiteNode(node)`
- `isContainerNode(node)`
- `isTextNode(node)`
- `isMediaNode(node)`
- `isLeafNode(node)`

## Notes

- The model is canonical JSON, not editor-local state.
- Validation and normalization rules should be enforceable headlessly.
- Link resolution belongs to model/API rules, not only to renderer behavior.
