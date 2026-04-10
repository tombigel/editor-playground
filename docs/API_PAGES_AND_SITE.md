# API Reference - Pages and Site

## Pages and Site Structure

Primary sources:

- `src/api/pageApi.ts`
- `src/model/pageRoutes.ts`
- `src/model/types/site.ts`

Common responsibilities:

- create, delete, reorder, and reparent pages
- manage page routes and hierarchy
- validate site-level navigation and link targets

## Top-Level Wrappers

Top-level wrappers such as `header`, `section`, and `footer` are modeled structurally. Their behavior belongs to the document model and related APIs rather than being inferred only by stage rendering.

## Fonts

Primary sources:

- `src/api/fontApi.ts`
- `src/fonts/`

The font surface covers:

- default families and weights
- Google Fonts catalog access
- stylesheet generation
- document font collection and export helpers

## Related Docs

- [Playground Spec](./PLAYGROUND_SPEC.md)
- [Editor Style Guide](./EDITOR_STYLE_GUIDE.md)
