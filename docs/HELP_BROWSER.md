# How to add docs?

Use this help browser for all editor-facing documentation that should be discoverable from the top-bar `?` entry.

## Add a new document

1. Create a new top-level markdown file in `docs/`.
2. Add a first-level `#` heading. The file can stay flat even if it should appear deep in the docs tree.
3. If the page needs images or diagrams, place them under `docs/assets/` and reference them with relative markdown paths such as `![Diagram](./assets/example.svg)`.
4. Register the page in `src/panels/helpDocRegistry.ts` so it gets a virtual parent, explicit order, and aliases when needed.
5. Run `pnpm run sync:public` or restart `pnpm run dev`. The help-doc manifest is regenerated and the markdown files plus docs assets are copied into the generated `public/assets/help-docs/` folder.

## Control hierarchy and ordering

The Help browser uses a typed registry for virtual hierarchy, top-level placement, and visibility.

Update the tree in:

- `src/panels/helpDocRegistry.ts`

The registry defines:

- root entries
- parent-child relationships
- explicit order
- primary vs secondary visibility
- aliases for moved pages or split anchors

Unregistered markdown files still appear automatically as secondary items under `Developers / Planning`, which makes missing registry work visible without hiding the document completely.

## Delivery

- help markdown files are served from `assets/help-docs/` instead of being embedded into the app bundle
- `scripts/sync-public-assets.mjs` regenerates the manifest at `src/panels/generated/helpDocsManifest.json`
- the same sync copies:
  - flat markdown files from `docs/`
  - docs assets from `docs/assets/`
- `public/` is generated output and should not be treated as a source-of-truth location for help docs or other static assets

## Navigation model

- the filename is shown in the document status bar, not in the sidebar
- the sidebar label comes from the first `#` heading in the file
- if that heading contains a spaced dash separator such as `Title - Subtitle`, the left side becomes the button title and the right side becomes the subtitle
- top-level navigation is `About`, `Keyboard shortcuts`, `Guides`, `Reference`, and `Developers`
- `Guides`, `Reference`, and `Developers` render as static group headings in the left nav
- the second-level entries under each group stay visible without selecting the group first
- the documentation browser defaults to `About` when opened without an explicit target
- section nodes can exist without moving markdown files into nested source folders
- the sidebar can collapse into a slim rail so the document pane has more reading room, while keeping a single button visible to reopen navigation
- the right rail shows an in-page table of contents for the active markdown page
- closing and reopening the Help browser keeps the last selected document, but re-expands the sidebar and clears any in-document anchor jump

## Link behavior

- relative `.md` links navigate inside the Help browser
- `#anchor` links scroll within the current document
- moved-page and split-anchor aliases can be defined in the registry so old links continue to work, including page-level moved links such as `docs/USAGE.md`
- absolute filesystem links render as inert text
- docs images resolve from relative paths under `docs/assets/`
- prefer plain markdown and GFM tables for help docs; the Help browser does not rely on raw HTML rendering
