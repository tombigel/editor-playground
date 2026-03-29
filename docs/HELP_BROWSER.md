# How to add docs?

Use this help browser for all editor-facing documentation that should be discoverable from the top-bar `?` entry.

## Add a new document

1. Create a new top-level markdown file in `docs/`.
2. Add a first-level `#` heading. The sidebar label is derived from that heading.
3. Reload the app or let Vite refresh. New `docs/*.md` files are discovered automatically.

## Control ordering

The Help browser uses an explicit preferred order for known docs and then falls back to alphabetical order for anything unlisted.

Update the order in:

- `src/panels/helpDocs.ts`

Edit the `HELP_DOC_ORDER` list there:

- listed docs appear first, in that exact order
- new docs not listed still appear automatically after the ordered ones

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
