# Editor Playground

A working editor playground for turning product, UX, design-system, frontend, and AI-prompting ideas into inspectable site-builder experiments.

It is a real editor, not a mockup: it has a document model, an inspectable stage, page and route management, rich text, animation preview, sticky layout experiments, export paths, and a growing in-app help system. I use it to test how ideas move from product questions into interface decisions, data structures, rendering behavior, documentation, and automated checks.

The project began as a sticky-layout model exploration. That history still matters, but the broader purpose now is to keep a playground where I can try ambitious editor ideas end to end and learn from the friction.

## Guided Showcase Tour

The best way to understand the current project is the guided showcase tour. It opens as an overlay on the real editor, highlights live surfaces, and moves through the app with URL-backed navigation rather than scripted DOM clicks.

Start it from the editor Help menu, or deep link directly with `#/edit?tour=start&step=welcome`. The tour begins with a compact linear card; use the menu button in the tour header to jump non-linearly by topic.

Current tour topics cover sticky authoring, editor structure and focus mode, API/navigation surfaces, the Google Fonts explorer, Slate rich-text editing, animation preview, pages, routing, validation, and documentation.

## What This Playground Explores

- Product framing: turning loose editor ideas into concrete workflows, constraints, and tradeoffs.
- UX and interaction design: selection, inspector surfaces, focused modes, page navigation, help, and authoring feedback.
- Design systems: reusable editor chrome, theme tokens, light/dark parity, and a design-system showcase.
- Frontend architecture: model/API/editor boundaries, renderer separation, testable document operations, and exportable site output.
- Content workflows: rich text, fonts, pages, internal links, templates, preview, validation, and import/export.
- Sticky and scroll behavior: structural sticky duration, visible spacer ranges, and predictable rendered output.
- AI prompting and collaboration: using AI agents as planning, implementation, review, and documentation partners while keeping the codebase grounded in explicit architecture rules.

## Sticky Origin Story

Sticky layout is still one of the clearest examples of how this playground works. The original question was not just "can something stick?" but how sticky behavior should be modeled, authored, debugged, and exported.

The key lesson is that sticky is more than edge plus offset. It also needs duration, and that duration is easier to reason about when it is represented structurally through real spacer-backed layout. The editor exposes spacer visuals, offset visuals, sticky preview, and computed ranges so the behavior is inspectable instead of magical.

For the full sticky model, including the implementation correction that keeps content-wrapper sticky duration from accidentally compounding with section height, see [Sticky - Principles, Guidelines and Model](./docs/STICKY_RENDER_MODEL.md).

## Architecture And API Boundaries

The project keeps a strict boundary between the document model, API layer, editor state, stage renderer, and exported site renderer.

For non-UI document automation, use `src/api/documentApi.ts`. It exposes document-level operations using `DocumentModel` only, including document creation and validation, parse/serialize helpers, rect/sticky/text mutation helpers, template insertion, sticky resolution helpers, and site export helpers.

Read next:

- [Playground Spec](./docs/PLAYGROUND_SPEC.md) for the editor model, wrapper roles, nesting rules, units, persistence, UX, and implementation notes
- [API Reference](./docs/API.md) for public API surfaces and module boundaries
- [Developers](./docs/DEVELOPERS.md) for contributor workflows, build notes, skills, and deployment
- [Getting Started](./docs/GETTING_STARTED.md) for the in-editor guide entry point

## Running Locally

Enable the pinned pnpm version with Corepack, then run the app and checks with pnpm:

- `corepack enable`
- `pnpm install`
- `pnpm run dev`
- `pnpm run test:run`
- `pnpm run lint`
- `pnpm run typecheck`
- `pnpm run build`

`pnpm run build` is the full gate: lint, typecheck, coverage, architecture checks, smoke E2E, and the Vite production build.

Deployment is intentionally manual and developer-facing; see [Deployment](./docs/DEPLOYMENT.md) for the WebDAV flow.
