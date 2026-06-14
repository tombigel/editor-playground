# Sticky Playground

This project is a local playground for defining and testing a sticky layout model.

It started from a conceptual sticky document and evolved into a more robust structural spec. This README keeps only the sticky behavior itself. The editor, data model, and playground implementation details are documented separately in [PLAYGROUND_SPEC.md](./docs/PLAYGROUND_SPEC.md).

## Guided Showcase Tour

The editor includes a guided showcase tour for portfolio and job-search demos. It opens as an overlay on the real editor, highlights live surfaces, and moves through the app with URL-backed navigation rather than scripted DOM clicks.

Start it from the editor Help menu, or deep link directly with `?tour=start&step=welcome`. The tour begins with a compact linear card; use the menu button in the tour header to jump non-linearly by topic.

Current tour topics cover sticky authoring, editor structure and focus mode, API/navigation surfaces, the Google Fonts explorer, Slate rich-text editing, animation preview, pages, routing, validation, and documentation.

## Core Principles

1. Sticky is used for both layout and scroll experience.
2. Sticky always implies duration.
3. Sticky should be modeled structurally, not only visually.
4. One sticky container plus scroll effects is often better than many separate sticky elements.
5. Multiple sticky ranges in one section do not sum. The range that ends furthest down determines the final section height.

## Sticky = pinning + duration

Sticky is defined by four properties:

- target
- edge
- offset
- duration

Target answers what is sticky.
Edge answers where it sticks.
Offset answers how far from the edge.
Duration answers for how long.

## Duration must be structural

The key design decision in this playground is that sticky duration is represented structurally through spacers.

Users should not need to manually increase section height just to make sticky work. The containing area should gain the required scroll range automatically.

## Spacers as the duration mechanism

Sticky duration is implemented by adding real space to the relevant container.

- If an element becomes sticky, its duration is represented by a spacer associated with that element.
- If a content wrapper becomes sticky, its duration is represented by space added after that wrapper inside the section or container.
- If multiple sticky elements exist inside the same section, their spacer ranges may overlap, but they do not add together.

The final section height is determined by the spacer whose end is furthest down.

## Current structural resolution

The model validated in this playground is:

- `target = self`
  - the sticky element lives in a sticky track
  - the element comes first
  - the spacer comes immediately after it
- `target = contentWrapper`
  - the content wrapper keeps its own intrinsic size
  - a real flow spacer after it extends the parent

This makes duration inspectable and predictable.

## Important correction

One important thing we learned during implementation:

If the content wrapper fills the entire section and the section grows because of sticky duration, then the content wrapper grows too. That makes sticky last for section height plus spacer instead of spacer duration.

The fix was:

- keep the content wrapper intrinsic in normal flow
- let the section or container remain `height: auto`
- add a real flow spacer only where the extra sticky range is needed

This preserves the intended behavior:

- wrapper keeps its own size
- parent gets extra scroll range
- sticky duration corresponds to the spacer duration

## Debuggability

Because sticky is structural, the playground exposes:

- spacer visuals
- offset visuals
- sticky preview
- computed sticky ranges

This is intentional. Sticky behavior is easier to reason about when its range is visible.

## Related Docs

- [PLAYGROUND_SPEC.md](./docs/PLAYGROUND_SPEC.md) for the editor model, wrapper roles, nesting rules, units, persistence, and implementation notes

## API Boundaries

For non-UI document automation (for example CLI scripts), use `src/api/documentApi.ts`.

It exposes document-level operations using `DocumentModel` only (no editor session state), including:

- document creation/validation
- parse/serialize helpers
- rect/sticky/text mutation helpers
- template insertion into the document tree
- shared sticky resolution helpers (`resolveStickyLayout`, `resolveWrapperStickyState`) that accept document data plus renderer-provided geometry
- site export helpers that render SSR-safe site HTML and generated CSS bundles from the document model, including ZIP export packaging

## Testing

Enable the pinned pnpm version with Corepack, then run checks with pnpm:

- `corepack enable` to use the `pnpm` version pinned in `package.json`
- `pnpm run test` for watch mode
- `pnpm run test:run` for a single full run
- `pnpm run test:coverage` for a single run with coverage thresholds
- `pnpm run lint` for static lint checks
- `pnpm run typecheck` for TypeScript checks
- `pnpm run test:e2e` for the stable end-to-end suite
- `pnpm run test:e2e:richtext` for the isolated rich-text authoring end-to-end package
- `pnpm run build` to run lint, typecheck, coverage, architecture checks, and the Vite production build

Current automated suites:

- `src/model/units.test.ts`
- `src/model/validation.test.ts`
- `src/sticky/resolve.test.ts`
- `src/api/documentApi.test.ts`
- `src/editor/editorStore.integration.test.ts`

## Manual WebDAV Deploy

This project includes a manual deploy command for replacing the contents of a WebDAV-backed static hosting folder.

Required environment variables:

- `WEBDAV_URL`: the full WebDAV URL of the deployed site directory
- `WEBDAV_USER`: the WebDAV username
- `WEBDAV_PASS`: the WebDAV password
- `WEBDAV_BUILD_DIR`: optional, defaults to `dist`

You can export them in your shell or add them to `.env.local`.

Deploy with:

- `pnpm run deploy`

The deploy flow:

1. runs the normal production build
2. deletes existing files and folders under `WEBDAV_URL`
3. uploads the fresh build output

Point `WEBDAV_URL` at the exact directory you want to replace. The root directory itself is preserved; its contents are replaced.
