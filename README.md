# Sticky Playground

This project is a local playground for defining and testing a sticky layout model.

It started from a conceptual sticky document and evolved into a more robust structural spec. This README keeps only the sticky behavior itself. The editor, data model, and playground implementation details are documented separately in [PLAYGROUND_SPEC.md](./PLAYGROUND_SPEC.md).

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

- [PLAYGROUND_SPEC.md](./PLAYGROUND_SPEC.md) for the editor model, wrapper roles, nesting rules, units, persistence, and implementation notes

## API Boundaries

For non-UI document automation (for example CLI scripts), use `src/api/documentApi.ts`.

It exposes document-level operations using `DocumentModel` only (no editor session state), including:

- document creation/validation
- parse/serialize helpers
- rect/sticky/text mutation helpers
- template insertion into the document tree
- shared sticky resolution helpers (`resolveStickyLayout`, `resolveWrapperStickyState`) that accept document data plus renderer-provided geometry

## Testing

Run tests with:

- `npm run test` for watch mode
- `npm run test:run` for a single full run
- `npm run test:coverage` for a single run with coverage thresholds
- `npm run lint` for static lint checks
- `npm run typecheck` for TypeScript checks
- `npm run build` to run lint, typecheck, coverage, architecture checks, and the Vite production build

Current automated suites:

- `src/model/units.test.ts`
- `src/model/validation.test.ts`
- `src/sticky/resolve.test.ts`
- `src/api/documentApi.test.ts`
- `src/editor/editorStore.integration.test.ts`
