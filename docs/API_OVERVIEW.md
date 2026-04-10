# API Reference - Overview

## Architecture Overview

The API layer is intentionally split so the editor is not the only way to perform meaningful document work.

| Module | Purpose | Side effects |
| --- | --- | --- |
| `documentApi` | Pure `DocumentModel -> DocumentModel` operations | None |
| `pageApi` | Pure page and route mutations | None |
| `textMarkdown` / `textConversion` / `textMerge` | Markdown, conversion, and text-structure helpers | None |
| `editorApi` | Editor-state wrappers over pure document APIs | Editor state/history |
| `editorViewApi` | Stage/editor rendering entry points | Rendering |
| `siteApi` | Site rendering and export helpers | Rendering/export |
| `dragDropApi` | Headless drag-and-drop lifecycle | None |
| `animationApi` | Animation model and runtime preview helpers | Some preview/runtime behavior |
| `fontApi` | Font catalog and stylesheet helpers | Some fetching |

**Key rule:** important functionality should remain achievable through pure document or page APIs without the editor UI.

## Read Next

- [Document Model](./API_DOCUMENT_MODEL.md)
- [Node and Layout](./API_NODE_AND_LAYOUT.md)
- [Text](./API_TEXT.md)
- [Pages and Site](./API_PAGES_AND_SITE.md)
- [Editor](./API_EDITOR.md)
- [Rendering and Export](./API_RENDERING_AND_EXPORT.md)
- [Types](./API_TYPES.md)
