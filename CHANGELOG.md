# Changelog

All notable changes to Sticky Playground are documented here.

Format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).
Versioning follows the four-version scheme described in [docs/API.md](docs/API.md#versioning).

Each release heading covers the **Project** version. Subsystem version bumps are noted inline where they differ from the project bump level.

---

## [Unreleased]

### Added

- support standalone block edit commits
- enable block text editing on stage

### Changed

- skip changelog-only release notes
- record Slate table planning findings

---

## [0.7.0] — 2026-04-24
Document: 1.5.13 · API: 2.0.5 · Editor: 0.13.13

### Added

- API-first leaf insertion now supports all leaf roles through `insertLeafDoc`.
- API reference coverage checks now guard the documented public export surface.

### Changed

- Completed the split API reference for the current public API surface.
- Archived closed Text Component Phase 1.8 planning docs out of the active docs surface.
- Replaced hardcoded editor chrome colors with design tokens.
- Split oversized source files across API, editor, model, stage, app shell, panels, and design-system modules.

### Fixed

- Guarded stale editor node mutation targets so delayed drag, resize, and inspector commands return state instead of throwing.

---

## [0.6.8] — 2026-04-24
Document: 1.5.8 · API: 2.0.0 · Editor: 0.13.8

### Added

- update version to 0.6.2 and enhance version bump scripts
- add source exclusions for agents and Claude in styles.css

### Changed

- API 2.0.0 makes `insertLeafDoc` the single API-first leaf insertion surface and removes deprecated insertion aliases.
- update version to 0.6.0 and document changes in changelog
- update version to 0.6.1 in package-lock.json

### Fixed

- resolve PrismJS "Prism is not defined" error in production bundle
- guard stale node mutation targets

---

## [0.6.0] — 2026-04-12

Document: 1.5.0 · API: 1.5.0 · Editor: 0.13.0

### Added

- implement changelog update functionality and tests for commit messages

### Changed

- route ui model reads through document view api

### Fixed

- simplify range parameter handling in PresetParamControl
- allow all text node subtypes to merge into rich text
- mark owner section for selected nodes
- preserve drag preview position on release
- restrict width keywords per node type and break measurement loop for fit-content
- set previewSticky to always be true in site preview
- stabilize stage and rich content keys

---

## [0.5.1] — 2026-04-11

Document: 1.4.1 · API: 1.4.1 · Editor: 0.12.0

---

## [0.5.0] — 2026-04-11

Document: 1.4.0 · API: 1.4.0 · Editor: 0.11.0

### Added

- add commitlint and automatic changelog categorization
- add commit message guidelines and enforce Conventional Commits format
- add grouped option headers and height cap to SearchableSelect
- add timing controls, named easings, and preserve timing on preset change
- improve add-page button styling and simplify page focus logic

### Changed

- update expected titles for section:reference to include 'Changelog'
- add axe accessibility e2e check
- add Select size variants and bordered slider demos
- split editor and site axe scans
- strengthen tabs hover accent state
- make edge dropdown compact and inline
- replace toggle-pill with always-input number fields, unify RangeField
- remove slider knob focus ring and add visible pill hover state
- add inspector action button demo, update spec and roadmap

### Fixed

- initialize animation runtime in preview mode and fix grid layout
- improve editor accessibility semantics
- add interact-element display:contents and remove animation DOM indicators

---

## [0.4.1] — 2026-04-11

Document: 1.3.0 · API: 1.3.0 · Editor: 0.10.0

### Added

- FormField layout system with four modes: stack, inline, inline-start, inline-group.
- FormField layout modes added to design system showcase and menu.

### Changed

- Inspector audit: all ad-hoc inline rows replaced with FormField composites.
- Inspector row variants extended (inline-start, inline-group).
- Visibility trigger styling restored.
- Section insertion placement updated.
- FormField inspector layout rules documented.

---

## [0.4.0] — 2026-04-11

Document: 1.3.0 · API: 1.3.0 · Editor: 0.10.0

### Added

- Animation authoring Phase 1: selection model, animation reducer, node handlers, focused animation panel.
- Animation authoring Phase 2: inspector section with trigger, presets, and controls; preset picker with dynamic options; on-stage animation indicators for non-selected nodes.
- Shortcut registry expansion — Phase 1 and Phase 2 wiring and handlers.

### Changed

- Shortcut help content and key bindings refined.

### Fixed

- `outAction` read path corrected to read from `node.animation`.
- Removed unused `trigger` parameter from `PresetOptions`.

### Changed (Document 1.2.0 → 1.3.0)

- Animation settings extended for authoring triggers and presets.

### Changed (API 1.2.0 → 1.3.0)

- Animation authoring functions added to `documentApi`.

### Changed (Editor 0.9.0 → 0.10.0)

- Focused animation panel, animation inspector section, shortcut expansion.

---

## [0.3.4] — 2026-04-11

Document: 1.2.0 · API: 1.2.0 · Editor: 0.9.0

### Added

- Help browser information architecture refresh with hierarchical navigation.
- Version-bump skill and enhanced audit skills documentation.
- Archived documentation workstream docs.

---

## [0.3.3] — 2026-04-10

Document: 1.2.0 · API: 1.2.0 · Editor: 0.9.0

### Added

- Introduced four independently-tracked semver versions: Project, Document Model, API, and Editor, defined in `src/lib/version.ts`.
- `schemaVersion` field stamped on exported document JSON; mismatch warning on import.
- Pre-commit hook (via `simple-git-hooks`) that auto-bumps all four versions at patch level on every commit.
- `scripts/bump-version.mjs` for manual minor/major bumps.
- Version display in the About panel.
- `/version-bump` skill documenting when to use minor vs major for each subsystem.

### Changed

- Project version baseline moved from `0.0.1` to `0.3.3` to reflect actual development history.

---

## [0.3.2] — 2026-04-09

Document: 1.2.0 · API: 1.2.0 · Editor: 0.8.1

### Added

- Code blocks: Prism syntax highlighting, language selector, light/dark theme toggle.
- Standalone list text subtype with per-item controls.
- Headless markdown import API for text nodes.
- Text type picker and inspector subtype switcher.
- Rich stage toolbar polish and stabilization (phase 1.8 closeout).

### Changed (Document 1.1.0 → 1.2.0)

- `TextNode` gains `subtype: 'code'` and `subtype: 'list'` variants with associated fields (`codeLanguage`, `codeTheme`, list content model).

### Changed (API 1.1.0 → 1.2.0)

- Text conversion, split/merge, and markdown import functions added to `documentApi`.

---

## [0.3.1] — 2026-04-06

Document: 1.1.0 · API: 1.1.0 · Editor: 0.8.0

### Changed

- Design system convergence waves A–F: shared inspector composites, shared panel primitives, topbar and focused-panel chrome unified, help and font panels converged.
- Shortcut execution pipeline refactored; `useEscapeKey` and `useClickOutside` hooks extracted to `src/lib/`.
- Dark tooltip class deduplicated across 15 occurrences in 8 files.

---

## [0.3.0] — 2026-04-06

Document: 1.1.0 · API: 1.1.0 · Editor: 0.7.0

### Added

- Rich text content type (Slate-based) with inline link support.
- Rich content rendered in both the stage and the exported site.
- On-stage double-click to enter rich text edit mode.
- Cmd+K inline link insertion in the rich text editor.
- Draggable rich text toolbar.

### Changed (Document 1.0.0 → 1.1.0)

- `TextNode` gains `subtype: 'rich'` with a Slate-subset content model.

### Changed (API 1.0.0 → 1.1.0)

- Rich text mutation functions added to `documentApi`.

---

## [0.2.1] — 2026-04-06

Document: 1.0.0 · API: 1.0.0 · Editor: 0.6.0

### Changed (Document 0.6.0 → 1.0.0 — breaking)

- All nodes now use a `contentType` + `subtype` discriminator pair (`ContainerNode`, `TextNode`, `MediaNode`) replacing the old `type` / `role` fields. Documents saved in the old format are automatically migrated on load via `migration.ts`.

### Changed (API 0.8.0 → 1.0.0 — breaking)

- Factory functions and type names renamed to match the new node model. Old aliases removed.

---

## [0.2.0] — 2026-04-04

Document: 0.6.0 · API: 0.8.0 · Editor: 0.6.0

### Added

- Full multi-page support (MPA): page model with hierarchy, slugs, and aliases.
- Page API (CRUD) exposed through `editorApi` and `siteApi`.
- Editor page switching via four entry points (topbar switcher, pages panel, inspector, and command bar).
- Page linking with internal anchor support.
- Multi-page static export with configurable `outputStructure` (directory vs flat).
- Page visibility targeting: Hidden, Current page, All pages, Custom pages.
- Home page role and exported route handling.
- Link validation workflow in the pages panel.
- Topbar overhaul with integrated page switcher.

### Changed (Document 0.5.0 → 0.6.0)

- `DocumentModel` gains `pages`, `siteSettings`, and `sharedRegionIds` fields; new `DocumentPage` type.

### Changed (API 0.7.0 → 0.8.0)

- `pageApi` and all page mutations added to `editorApi`.

---

## [0.1.8] — 2026-03-31

Document: 0.5.0 · API: 0.7.0 · Editor: 0.5.1

### Added

- Sticky elevation control (global and per-node override).
- Animated-state on-stage indicator (simple on/off badge).
- Debug info panel for multiselect navigation.

### Changed (Document 0.4.0 → 0.5.0)

- Sticky definition gains an elevation field.

### Changed (API 0.6.0 → 0.7.0)

- Elevation get/set functions added to `documentApi`.

---

## [0.1.7] — 2026-03-29

Document: 0.4.0 · API: 0.6.0 · Editor: 0.5.0

### Added

- Unified docs-backed help browser with markdown rendering and collapsible sidebar, replacing the shortcut dialog.
- Animation presets preloaded at startup.
- Lazy-loading for the Google Fonts catalog and the Layers panel.

---

## [0.1.6] — 2026-03-28

Document: 0.4.0 · API: 0.6.0 · Editor: 0.4.1

### Added

- Animation API and runtime tests.
- Animation trigger canonicalization (hover/click aliases resolved).
- Settings panel refactored into focused section modules with shared primitives.
- Initial Playground Roadmap document.

### Changed (Document 0.3.0 → 0.4.0)

- `DocumentModel` gains `animationSettings` field.

### Changed (API 0.5.0 → 0.6.0)

- Animation API surface added to `documentApi`.

---

## [0.1.5] — 2026-03-24

Document: 0.3.0 · API: 0.5.0 · Editor: 0.4.0

### Added

- Layers panel with full drag-and-drop reordering.
- Reparent-selection API for moving nodes across containers.
- Drag-drop engine extracted into its own module.
- Snapping refactored to use structured snap settings.
- Performance-optimized drag (no React re-renders during drag).

### Changed (API 0.4.0 → 0.5.0)

- `reparentSelection` added to `editorApi`.

---

## [0.1.4] — 2026-03-21

Document: 0.3.0 · API: 0.4.0 · Editor: 0.3.1

### Added

- Design system showcase with hash routing.
- `InspectorControls` split into focused component family modules.
- Font picker refactored with chevron and side-effect extraction.

---

## [0.1.3] — 2026-03-19

Document: 0.3.0 · API: 0.4.0 · Editor: 0.3.0

### Added

- Full technical improvement sweep: API-first document mutations, accessibility improvements, performance memoization, visual regression baselines, test quality pass, component splits.
- Toolchain upgraded: Node 22, React 19, Vite 8, TypeScript 5.9, Biome.
- Draggable focused panels with configurable editor palettes and accent colors.
- Shared panel chrome extracted.

### Changed (API 0.3.0 → 0.4.0)

- API-first mutation functions added to `documentApi`.

---

## [0.1.2] — 2026-03-18

Document: 0.3.0 · API: 0.3.0 · Editor: 0.2.0

### Added

- Google Fonts catalog bundled and font management panel introduced.
- Font picker with preview loading.
- Inspector typography controls.
- Keyboard shortcut system with shortcut dialog.
- Multi-select editing workflows.
- Stage resize knob for structural wrappers.

### Changed (Document 0.2.0 → 0.3.0)

- `FontLibrary` extended with font family entries and favorite tracking.

### Changed (API 0.2.0 → 0.3.0)

- Font management functions added to `documentApi`.

---

## [0.1.1] — 2026-03-14

Document: 0.2.0 · API: 0.2.0 · Editor: 0.1.1

### Added

- Dual-edge sticky model (top + bottom simultaneously).
- Sticky preview overlays on stage.
- Inspector size and typography controls.
- Stage intrinsic sizing and auto-height measurement.
- Architecture boundary enforcement.

### Changed (Document 0.1.0 → 0.2.0)

- `StickyDefinition` extended with dual-edge semantics.

### Changed (API 0.1.0 → 0.2.0)

- Sticky API extended to support dual-edge configuration.

---

## [0.1.0] — 2026-03-13

Document: 0.1.0 · API: 0.1.0 · Editor: 0.1.0

### Added

- Initial working editor: sticky model, stage rendering, inspector, undo/redo, drag, resize, and basic static-site export.
- `DocumentModel` with sticky nodes, layout, and font library.
- `documentApi` and `editorApi` initial surfaces.
- Editor shell with inspector, settings panel, and stage.
