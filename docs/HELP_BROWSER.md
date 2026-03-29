# How to add docs?

Use this help browser for all editor-facing documentation that should be discoverable from the top-bar `?` entry.

## Add a new document

1. Create a new top-level markdown file in `docs/`.
2. Add a first-level `#` heading. The sidebar label is derived from that heading.
3. Run `npm run sync:public` or restart `npm run dev`. The help-doc manifest is regenerated and the markdown files are copied into the generated `public/assets/help-docs/` folder.

## Control ordering

The Help browser uses an explicit preferred order for known docs and then falls back to alphabetical order for anything unlisted.

Update the order in:

- `src/panels/helpDocs.ts`

Edit the `HELP_DOC_ORDER` list there:

- listed docs appear first, in that exact order
- new docs not listed still appear automatically after the ordered ones

## Delivery

- help markdown files are served from `assets/help-docs/` instead of being embedded into the app bundle
- `scripts/sync-public-assets.mjs` regenerates the manifest at `src/panels/generated/helpDocsManifest.json` and copies the source markdown files into the generated `public/assets/help-docs/` folder
- `public/` is generated output and should not be treated as a source-of-truth location for help docs or other static assets

## Sidebar naming

- the filename is shown in the document status bar, not in the sidebar
- the sidebar label comes from the first `#` heading in the file
- if that heading contains a spaced dash separator such as `Title - Subtitle`, the left side becomes the button title and the right side becomes the subtitle
- the sidebar can collapse into a slim rail so the document pane has more reading room, while keeping a single button visible to reopen navigation
- closing and reopening the Help browser keeps the last selected document, but re-expands the sidebar and clears any in-document anchor jump

## Link behavior

- relative `.md` links navigate inside the Help browser
- `#anchor` links scroll within the current document
- absolute filesystem links render as inert text
- prefer plain markdown and GFM tables for help docs; the Help browser does not rely on raw HTML rendering
