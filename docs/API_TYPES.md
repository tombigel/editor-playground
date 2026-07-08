# API Reference - Types

## Type Reference

The canonical exported type surfaces live in:

- `src/api/types.ts`
- `src/api/types/index.ts`
- subsystem `types/index.ts` files under `src/model`, `src/editor`, `src/fonts`, and related areas

## Important Families

- `DocumentModel`, `DocumentNode`, and node subtype families
- `DocumentCommand`
- `TextDocumentContent` and text block variants, including standalone `table` blocks
- `TableColumnAlignment`, `RichTableStyle`, `RichTableCellStyle`, `RichTableCell`, `RichTableRow`, `RichTableBlock` with optional `direction`, `columnWidths`, `rowHeights`, table-wide `style`, and Slate-compatible cell `style`, and `TableBlockContent`
- page/site route types
- sticky geometry and layout result types
- editor-state wrappers exposed through `editorApi`

## Guidance

- Prefer the subsystem `types/index.ts` surfaces when importing shared types.
- Keep public API docs synchronized with the exported type surface.
- When a new public helper or type is added, document it in the relevant reference page instead of relying on source discovery alone.
