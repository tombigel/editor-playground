# API Reference - Rendering and Export

## Rendering and Export

Primary sources:

- `src/api/siteApi.ts`
- `src/render/`
- `src/site/`

Responsibilities include:

- rendering site output from document data
- preparing SSR-safe HTML and CSS bundles
- packaging export output
- stage/editor presentation helpers that stay separate from document mutation APIs

## Utilities

The wider API surface also depends on utility helpers for:

- theme and accent resolution
- geometry calculations
- sticky snapshots and layout planning
- serialization and formatting support

Utilities should support the owning subsystem instead of becoming a second undocumented public API. If a helper becomes part of the supported contract, document it explicitly in the relevant reference page.
