# Usage

This guide is the user-facing starting point for the Sticky Playground editor. It focuses on the first real session: open the editor, place content, adjust layout, manage pages, preview, and export.

![Help browser overview](./assets/help-browser-overview.svg)

## Getting Started

1. Open the editor and keep the left sidebar visible.
2. Add or select a page from the top bar page switcher.
3. Insert a section or component from the insert surfaces.
4. Select a node once to inspect it, then edit it through the relevant panel or on-stage interaction.
5. Use preview and export once the page structure looks correct.

## Core Workflow

- Build layout structure first: pages, sections, containers, groups.
- Add content second: text, media, links, and page-local detail.
- Refine sizing, sticky behavior, and visual styling last.
- Use the Help browser as the working reference surface instead of hunting through source files.

## Selecting And Editing

- Single click selects a node and exposes its controls in the inspector.
- The stage, layers tree, and page tree stay connected; use whichever is fastest for the current edit.
- For text-heavy work, expect the current editor to mix on-stage editing, inspector fields, and markdown/reference flows depending on subtype maturity.

## Pages And Site Structure

- Treat pages as the site-level navigation layer.
- Use the Pages panel for hierarchy and order.
- Use page settings for routing and export behavior.
- Use internal page and anchor links instead of hardcoded URLs whenever possible.

## Preview And Export

- Use preview to validate sticky behavior, layout flow, and interaction timing before exporting.
- Export JSON for document portability.
- Export site output when the authored structure is ready for static delivery.

```json
{
  "recommendedChecks": ["page routes", "sticky ranges", "links", "fonts", "export"]
}
```

## Learn The System

- [Reference](./REFERENCE.md) for stable technical reference docs
- [API Reference](./API.md) for headless and editor API surfaces
- [Developers](./DEVELOPERS.md) for implementation, workflow, and planning docs
- [How to add docs?](./HELP_BROWSER.md) for maintaining this documentation surface
