# Showcase Tour Phase 1 Research

This document defines the proposed first-phase content map for the non-linear showcase tour.
It is intentionally written before implementation so Tom can verify the story and step choices before Phase 2 starts.

## Goal

The tour should help a job-search visitor understand Sticky Playground as portfolio evidence for a Design Engineer / Creative Technologist:

- UX and editor craft: direct manipulation, progressive disclosure, useful chrome, and workflow ergonomics.
- API and architecture: model/API/editor/stage/site separation, import/export, and documented contracts.
- Design-system thinking: reusable primitives, tokens, light/dark parity, and documented visual governance.
- Visual experimentation: sticky behavior, motion, preview modes, and scroll-driven layout research.
- Product depth: pages, routing, docs, validation, and a product-shaped roadmap rather than a loose demo.

The tour is non-linear. Visitors should be able to start from a topic menu, jump between steps, copy/share a deep link, and return to the menu at any point.

## Current Surface Audit

These current app surfaces are suitable for Phase 1 anchors:

| Surface | Existing anchor or state source | Notes |
| --- | --- | --- |
| Section templates | `[data-panel-trigger="section-templates"]`, `.editor-section-templates` | Lists sticky templates by name/category. |
| Components panel | `[data-panel-trigger="components"]`, `.editor-layers-panel`, `[data-layers-row-id]` | Shows hierarchy, visibility, ordering, and selection sync. |
| Pages panel | `[data-panel-trigger="pages"]`, `.editor-pages-panel`, `[data-page-row-id]` | Shows page system and routing controls. |
| Settings panel | `role="dialog"[aria-label="Settings"]`, `[data-settings-nav]`, `[data-settings-section]` | Supports UI, pages, fonts, transfer, advanced, shortcuts sections. |
| Help/About docs | `[data-help-entry]`, `[data-help-entry-target]` | Already exposes API docs, spec, style guide, changelog. |
| Stage nodes | `[data-node-id]`, `.stage-single-selection-overlay`, `[data-stage-resize-handle]` | Stable enough for visual anchoring; Phase 2 should add API-level target resolution by node role/name/category. |
| Inspector blocks | `[data-inspector-block]`, `[data-inspector-section]` | Useful for sticky, layout, design, animation, debug information. |
| Focused mode panel | `aria-label="<Mode> focus mode"`, `[data-focused-panel-drag-zone]` | Strong progressive-disclosure story. |
| Topbar menus/actions | `[data-ui="menubar-trigger"][data-menu-id]`, preview button `aria-label="Preview site"` | Good for View/Help/Settings entry points. |
| Design-system route | `#/design-system`, registry section ids | Good surface, but Phase 2 must decide whether editor URL navigation can intentionally leave the editor route. |

## Proposed Topic Map

Status: proposed locked map, pending Tom verification.

### Global Entry: Start Here

Purpose: orient a visitor quickly and frame the app as a solo-built editor/product, not just a canvas experiment.

| Step | Title | Surface | Required editor state | Visual anchor | Proposed URL |
| --- | --- | --- | --- | --- | --- |
| `welcome` | This is the product, not a mockup | Initial editor shell and stage | Home page active, no selection, all default panels closed | Centered fallback panel, stage shell behind it | `?tour=start&step=welcome` |
| `seeded-model` | The stage starts from a real document model | Seeded Post section | Home page active, select the initial "Post Title" text node by API target query | `[data-node-id="<resolved-post-title>"]` | `?tour=start&step=seeded-model` |
| `menu-is-nonlinear` | Jump by topic, follow your curiosity | Tour topic/step menu | Tour open, menu expanded | Tour menu itself | `?tour=start&step=menu-is-nonlinear` |

### Topic 1: Sticky And Scroll Prototyping

Purpose: show the original technical/product problem: making sticky behavior authorable, inspectable, and testable.

| Step | Title | Surface | Required editor state | Visual anchor | Proposed URL |
| --- | --- | --- | --- | --- | --- |
| `sticky-templates` | Sticky patterns are reusable authoring primitives | Section Templates panel | Open section templates panel | `[data-panel-trigger="section-templates"]`, `.editor-section-templates` | `?tour=sticky&step=sticky-templates` |
| `sticky-node` | Sticky controls are model-backed, not visual-only | Stage + Inspector sticky block | Insert or load a sticky template, select a sticky card/image, inspector open | `[data-node-id="<resolved-sticky-node>"]`, `[data-inspector-block="sticky"]` | `?tour=sticky&step=sticky-node` |
| `sticky-guides` | Invisible scroll physics become visible guides | Stage overlays | Sticky node selected, sticky preview on, spacer visibility `all` | `.stage-single-selection-overlay`, sticky/spacer visual classes | `?tour=sticky&step=sticky-guides` |
| `edge-lab` | Edge cases are first-class test material | Sticky Edge Lab template | Active document contains Sticky Edge Lab, select top/both/bottom card by target query | `[data-node-id="<resolved-edge-card>"]` | `?tour=sticky&step=edge-lab` |

### Topic 2: Editor Craft

Purpose: show hands-on UX craft: structure, selection, focused work, and direct manipulation.

| Step | Title | Surface | Required editor state | Visual anchor | Proposed URL |
| --- | --- | --- | --- | --- | --- |
| `components-panel` | Structure stays visible while editing visually | Components panel | Components panel open, current page active | `[data-panel-trigger="components"]`, `.editor-layers-panel` | `?tour=editor&step=components-panel` |
| `selection-sync` | Stage selection and tree selection stay in sync | Stage + Components row | Select a visible stage node by target query, Components panel open | `[data-node-id="<resolved-node>"]`, `[data-layers-row-id="<resolved-node>"]` | `?tour=editor&step=selection-sync` |
| `direct-manipulation` | Selection chrome is an editor surface | Stage selection overlay | Single node selected, inspector visible | `.stage-single-selection-overlay`, `[data-stage-resize-handle]` | `?tour=editor&step=direct-manipulation` |
| `slate-text-editor` | Rich text editing | Text type picker + rich text workflows | Open text type panel through typed panel request | `[data-text-type-role="richtext"]` | `?tour=editor&step=slate-text-editor` |
| `focused-mode` | Focus mode | Focused mode panel | Select node, set focused mode to `design` | `[role="dialog"][aria-label="Design focus mode"]`, `[data-focused-panel-drag-zone]` | `?tour=editor&step=focused-mode` |

### Topic 3: API And Product Architecture

Purpose: show API-first thinking and the architecture boundary behind the editor UI.

| Step | Title | Surface | Required editor state | Visual anchor | Proposed URL |
| --- | --- | --- | --- | --- | --- |
| `api-docs` | The UI is not the only way to use the product | Help dialog API docs | Help open to `doc:docs/API.md` or a specific API child doc | `[data-help-entry="doc:docs/API.md"]` | `?tour=api&step=api-docs` |
| `model-transfer` | The document can move through import/export | Settings Transfer section | Settings open to `transfer` section | `[data-settings-nav="transfer"]` | `?tour=api&step=model-transfer` |
| `site-preview-export` | The editor model renders as a site | Preview/export controls | Topbar visible, optionally Settings menu opened to export | `[aria-label="Preview site"]`, `[data-menu-id="settings"]` | `?tour=api&step=site-preview-export` |
| `debug-info` | Debug state is exposed as product tooling | Inspector debug block | Show debug info on, select a node | `[data-inspector-block="debug-info"]` | `?tour=api&step=debug-info` |

### Topic 4: Design System And Visual Experimentation

Purpose: show that the editor UI is governed by a design system while still allowing visual experiments.

| Step | Title | Surface | Required editor state | Visual anchor | Proposed URL |
| --- | --- | --- | --- | --- | --- |
| `ui-settings` | Theme and guide controls are productized | Settings UI section | Settings open to `display` section | `[data-settings-nav="display"]` | `?tour=design&step=ui-settings` |
| `font-system` | Choose document fonts | Settings Fonts | Settings open to `fonts`; Google Fonts explorer available from document font workflow | `[data-settings-nav="fonts"]` | `?tour=design&step=font-system` |
| `design-system-route` | The design system has its own verification surface | Design-system showcase | Navigate to `#/design-system`, target tokens or panels section | `#tokens-colors`, `#composite-focused-panel`, `#composite-floating-panel-shell` | `?tour=design&step=design-system-route` |
| `animation-preview` | Explore animations | Animation inspector + preview toggle | Select animatable node, inspector animation block visible, animation preview enabled | `[data-inspector-block="animation-behavior"]`, rail animation toggle | `?tour=design&step=animation-preview` |

### Topic 5: Pages, Routing, And Documentation Depth

Purpose: show product maturity: pages, URL semantics, validation, documentation, and changelog history.

| Step | Title | Surface | Required editor state | Visual anchor | Proposed URL |
| --- | --- | --- | --- | --- | --- |
| `pages-panel` | This is a multi-page site editor | Pages panel | Pages panel open on active page | `[data-panel-trigger="pages"]`, `.editor-pages-panel` | `?tour=product&step=pages-panel` |
| `page-routing` | Routing details are explicit UX | Page settings tab | Pages panel open to page settings for Home | `[data-page-row-id="page-home"]`, page settings fields | `?tour=product&step=page-routing` |
| `link-validation` | Maintenance workflows are built in | Settings Transfer or Pages validation action | Settings transfer section open after link validation, or Pages panel validation entry | `[data-settings-nav="transfer"]` | `?tour=product&step=link-validation` |
| `docs-history` | The work is documented as carefully as the UI | Help/About docs | Help open to Playground Spec, Style Guide, or Changelog | `[data-help-entry="doc:docs/PLAYGROUND_SPEC.md"]`, `[data-help-entry="doc:CHANGELOG.md"]` | `?tour=product&step=docs-history` |

## Step Navigation Intents

These are the API-backed intents Phase 2 must be able to express before showcase UI implementation.

| Step | Required navigation intent |
| --- | --- |
| `welcome` | `resetEditorView({ activePage: "home", selection: "none", panels: "closed" })` |
| `seeded-model` | `setActivePage("home")` + `selectNodeTarget({ name: "Post Title", contentType: "text" })` |
| `menu-is-nonlinear` | `openTourMenu()` without changing editor selection |
| `sticky-templates` | `openPanel("sectionTemplates")` |
| `sticky-node` | `ensureSectionTemplate("stickyPinnedCards" | "stickyEdgeLab")` + `selectNodeTarget({ sticky: true })` + `openInspectorBlock("sticky")` |
| `sticky-guides` | `selectNodeTarget({ sticky: true })` + `setEditorViewFlags({ previewSticky: true, spacerVisibility: "all" })` |
| `edge-lab` | `ensureSectionTemplate("stickySteps")` + `selectNodeTarget({ nameIncludes: "Edge Card" })` |
| `components-panel` | `openPanel("components")` |
| `selection-sync` | `openPanel("components")` + `selectNodeTarget({ visible: true, selectable: true })` |
| `direct-manipulation` | `selectNodeTarget({ visible: true, selectable: true })` |
| `slate-text-editor` | `openPanel("textTypes")` + anchor `data-text-type-role="richtext"` |
| `focused-mode` | `selectNodeTarget({ visible: true, selectable: true })` + `setFocusedMode("design")` |
| `api-docs` | `openHelpEntry("doc:docs/API.md")` |
| `model-transfer` | `openSettingsSection("transfer")` |
| `site-preview-export` | `focusTopbarAction("preview")` or `openMenu("settings")` |
| `debug-info` | `selectNodeTarget({ visible: true, selectable: true })` + `setEditorViewFlags({ showDebugInfo: true })` |
| `ui-settings` | `openSettingsSection("display")` |
| `font-system` | `openSettingsSection("fonts")` |
| `design-system-route` | `openDesignSystemSection("tokens-colors" | "composite-focused-panel")` + preserve return route |
| `animation-preview` | `selectNodeTarget({ animatable: true })` + `openInspectorBlock("animation-behavior")` + `setEditorViewFlags({ animationPreview: true })` |
| `pages-panel` | `openPanel("pages")` |
| `page-routing` | `openPanel("pages", { tab: "page", pageId: "home" })` |
| `link-validation` | `runLinkValidation()` + `openSettingsSection("transfer")` |
| `docs-history` | `openHelpEntry("doc:docs/PLAYGROUND_SPEC.md" | "doc:docs/EDITOR_STYLE_GUIDE.md" | "doc:CHANGELOG.md")` |

## Phase 2 Capability Gaps

These must be solved as real editor/API/URL capabilities before showcase UI implementation.

1. URL state is too narrow today.
   - Current support is essentially preview mode and startup focused mode.
   - Phase 2 should add parse/build helpers for active page, selected node target, focused mode, open panel, settings/help target, tour topic, and tour step.

2. Panel state is app-local and fragmented.
   - `useAppPanels` owns open/close state for Settings, Help, About, Layers, Pages, Fonts, Shortcuts, and positions.
   - Phase 2 should introduce a typed panel state/intention surface that normal editor code and the future tour both use.

3. UI/view-state mutations are reducer actions, not public API operations.
   - Focused mode, preview flags, spacer visibility, grid/debug toggles, and inspector state should be expressible through editor API functions or a headless editor-view API.

4. Node selection by stable target needs an API.
   - Tour config should not hard-code generated node ids.
   - Phase 2 should support target queries such as node name, content type/subtype, sticky capability, first visible selectable node, or current selection.

5. Design-system route navigation crosses app routing.
   - If Phase 1 keeps the `design-system-route` step, Phase 2 must decide how URL-driven editor navigation intentionally opens `#/design-system` and how the tour returns to the editor.

6. Step setup must be declarative.
   - Each step should resolve to editor navigation intents such as `openPanel`, `openHelpEntry`, `openSettingsSection`, `selectNodeTarget`, `setFocusedMode`, `setPreviewFlag`, or `openDesignSystemSection`.
   - The showcase overlay must not imperatively click buttons or query DOM as a navigation workaround.

## Visual Direction For Later Phases

The overlay should be visibly distinct from editor chrome but still design-system-based.

- Use existing primitives: `PopoverSurface`, `FloatingPanelShell`, `EditorPanelHeader`, `Button`, and shared nav/list controls.
- Add a configurable `ShowcaseTourSkin` with CSS variables for panel background, scrim, spotlight border, step accent, typography slot, and backdrop intensity.
- Prefer differentiation by composition: scrim, spotlight, progress marker, and guided panel anatomy.
- Avoid a separate one-off palette. Derive default skin values from existing editor tokens and `--editor-accent`.
- Add design-system showcase coverage for the tour visual contract if shared primitives or visible tour components are added.

## Validation Performed

- Confirmed candidate anchors and state surfaces in `src/app`, `src/panels`, `src/stage`, `src/model`, `src/components/ui`, and `src/design-system`.
- Confirmed existing docs and tests expose Help, Settings, Components, Pages, Focused Mode, and Stage selection surfaces.
- Confirmed `archive/` was not used for this research.

## Pending Tom Verification

Before committing Phase 1 or starting Phase 2, Tom should verify:

- whether the topic labels match the job-search story;
- whether any step feels too internal, too generic, or not representative enough;
- whether the design-system route should be part of v1 despite crossing out of the editor route.
