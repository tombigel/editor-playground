# Changelog

All notable changes to Sticky Playground are documented here.

Format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).
Versioning follows the four-version scheme described in [docs/API.md](docs/API.md#versioning).

Each release heading covers the **Project** version. Subsystem version bumps are noted inline where they differ from the project bump level.

---

## [Unreleased]

### Added

- add overflow control
- default radial size to manual
- refine media control panels
- group media inserts in picker
- add semantic wrappers and grouping

### Changed

- remove radial radii label
- semantic wrappers, link types, and slate table task list
- align editor panels with document api

### Fixed

- move overflow control after shadow
- tighten semantic container select
- hide text merge for mixed selections
- match standard group selection behavior
- clarify group actions
- complete group action integration
- keep group wrappers boxed in editor
- detach group height measurement
- keep group height snug to children
- render wrapper contents in drag preview
- pause video drag previews
- size grouped video drag previews

---

## [0.13.0] — 2026-07-05
Document: 1.8.0 · API: 2.6.0 · Editor: 0.20.0

### Added

- improve assistant panel responses
- add Qwen free model option
- improve assistant settings controls
- add AI conversation guide and shortcut
- show local dev badge in topbar
- show topic-local step progress in tour card header
- video leaf component with playback, fit, and aspect controls
- inline SVG leaf component with sanitized markup and a11y
- warn when local storage nears quota
- duplicate whole pages
- duplicate nodes with option drag
- duplicate nodes with option drag
- gradient backgrounds for containers and sections
- split viewbox controls
- split viewbox controls
- debounce markup sanitization
- expand stroke controls
- add accessible video defaults and API fields
- render accessible titles and tracks
- refine inspector accessibility controls

### Changed

- remove superseded client-side model fallback machinery
- remove no-value export-check tests
- extract pure control logic from title editor and value-with-unit for testability
- cover text field normalization directly at the document API layer
- reduce editorMutations tests to wrapper concerns
- add legacy document migration fixture suite
- cover snap and measure math
- add direct tests for document tree operations
- cover document normalization and panel state helpers
- cover list content and text conversion edge branches
- cover conversation store, tool routing, and chat error paths
- replace brittle utility-class assertions with semantic contracts
- tighten coverage config and raise thresholds
- split useAiChat sendMessage suite out of AiPanel.test.tsx
- strengthen swallowed and observability-weak assertions
- cover editor state reducer action branches
- add AI assistant rail glow
- improve light mode AI button glow
- catalog imported lucide icons
- align showcase sections and AI warning badge
- remove duplicate alert icon alias
- archive completed tasklists and fix archived-doc references
- add RI-49 URL boot hydration and RI-50 panel request adapter
- rank RI-11 component candidates and set build order
- centralize panel requests through shared adapter
- allow preview dev server to use an auto-assigned port
- mark inline SVG shipped under RI-11
- refine gradient control and clip-text behavior notes
- tidy gradient panel sizes and alignments
- centralize wrapper style updates
- simplify video render props
- tidy gradient controls
- separate playback controls
- clarify markup sanitization
- scale verification process by change risk
- document dependency policy

### Fixed

- open help for question-form undo/redo requests instead of running them
- only treat short bare confirmations as draft approve/reject
- apply prompt caching only to the base system prompt
- label settings dialog controls and update stale e2e assertions
- migrate legacy documents on import and make migration idempotent
- darken active settings nav description text to meet WCAG AA contrast
- keep AI panel actions reachable
- keep AI panel resize within viewport
- make AI rail shine trigger on hover
- label video nodes correctly and remove link support from video
- refine SVG a11y pattern and color controls
- refine gradient controls, background-size, and clip-text edit mode
- use background-color longhand for button and code leaves
- make gradient repeat produce visible tiling
- harden viewbox handling
- keep clip text with gradients
- refine stroke inspector controls
- simplify stroke inspector layout
- polish dash and paint order controls
- preserve transparent monochrome fills
- align scale label styling
- lazily optimize svg sources

---

## [0.12.0] — 2026-07-03
Document: 1.7.28 · API: 2.5.28 · Editor: 0.19.28

### Added

- feature tour on empty welcome page
- sync WebDAV deploys incrementally
- added link to tombigel.com
- scaffold AI command types and tool manifest
- add AI read-only document query tools
- add AI mutation command batch apply and validation
- add single-undo AI command batch commit path
- add orchestration types, system prompt, guardrails, and architecture boundary check
- add tool router and conversation session state
- add OpenRouter provider adapter with curated model list
- add lazy-loaded AI assistant panel with read-only chat
- add AI draft diff card with approve/reject and showcase entry
- add AI provider, model, and API key settings
- add AI assistant MVP step to the welcome tour
- restructure curated models into 3 data-driven cost/value tiers
- add structured model pricing and automatic sentinels
- clarify OpenRouter routing and model status
- route assistant control requests locally

### Changed

- update project tagline to emphasize AI-assisted development
- relax brittle copy assertions
- document AI command layer and draft/apply flow
- regenerate help docs manifest for AI command layer page
- add end-to-end draft/approve/undo smoke test and a11y coverage
- remove undefined AI markdown/bubble CSS class markers
- mark RI-13/46/47/48 done for agentic interface v1

### Fixed

- update curated OpenRouter models to current generation
- preserve native clipboard in panels

---

## [0.11.0] — 2026-06-23
Document: 1.7.0 · API: 2.5.0 · Editor: 0.19.0

### Added

- add stage copy paste duplicate
- preserve rich html paste content
- create styled rich nodes from html paste
- insert styled html in text edit mode

### Changed

- describe styled html paste behavior
- add component roadmap recommendations
- update roadmap priorities and sorting
- move sync-public-assets out of pre* hooks and into Vite/vitest lifecycle
- reconcile AGENTS.md and CONTRIBUTING_AI.md rule sets
- reframe project positioning

### Fixed

- keep editor payload out of plain text
- cover html paste edge cases
- keep html paste scope modern
- commit font size changes on blur
- route design system back button by origin

---

## [0.10.8] — 2026-06-18
Document: 1.6.8 · API: 2.4.0 · Editor: 0.18.0

### Added

- refine onboarding welcome flow
- add stage node copy, paste, and duplicate commands with API-first clipboard payloads, Edit menu actions, shortcuts, and external text/link/image paste fallback

### Changed

- archive hash routing implementation plan
- document blank starter export
- document stage clipboard API, shortcuts, and RI-33 roadmap progress

### Fixed

- satisfy hash routing build checks
- sync tour state from hash route search
- avoid resetting active tour steps
- clear tour sync lint warning

---

## [0.10.0] — 2026-06-17
Document: 1.6.0 · API: 2.3.0 · Editor: 0.17.0

### Added

- revise stage drag placement model
- add svg logo variants
- add blank starter document factory
- route app modes through hash paths
- update preview and tour hash URLs
- add onboarding home for app modes
- add start fresh menu action

### Changed

- wrap showcase tour phase
- set up pnpm before node cache
- install playwright chromium
- refine manage fonts usage metadata
- skip listener re-registration on every pointermove
- skip listener re-registration on every pointermove
- skip structuredClone for unchanged metadata fields
- short-circuit node deep-compare on reference equality
- restore drag listener dep arrays in LayersPanel and PageTreeContent
- clarify child overflow naming
- rename to editor playground
- document hash-routed app modes

### Fixed

- inert hidden inspector layers
- avoid panel drag listener churn
- preserve auto parent height expansion
- skip mac metadata files
- keep local server rooted at slash
- clean up tour state and layout

---

## [0.9.0] — 2026-06-14
Document: 1.5.142 · API: 2.2.0 · Editor: 0.16.0

### Added

- Guided showcase tour overlay for portfolio/job-search demos, with non-linear topic navigation, URL-backed `tour` / `step` state, typed tour config, target highlighting, draggable/minimizable tour surfaces, compact default menu, and new-tab preview/design-system actions.
- Showcase story steps for sticky authoring, editor structure, focus mode, Slate rich-text merge/split workflows, API docs, import/export, rendered preview, Google Fonts selection, animation preview, pages, routing, validation, and documentation.
- Editor navigation intents and URL state for active page, selection, focused mode, panel targets, settings/help/page targets, tour topic/step, sticky/debug/grid/animation preview flags, and spacer visibility.
- Configurable showcase tour skin and highlight styling that stay aligned with editor tokens.
- @wix/interact 2.2.1 alignment for the interaction runtime.

### Changed

- Made pnpm the canonical package manager and hardened the server harness / smoke gate.
- Isolated the rich-text stage package to keep the Slate authoring bundle boundary explicit.
- Added and maintained showcase-tour implementation memory, phase brief, review todo, API docs, playground spec notes, README guidance, and roadmap status.
- Refined showcase copy for Focus Mode and the Google Fonts explorer to be more descriptive and less marketing-led.
- Made the tour highlight movement a simple CSS-only transition.

### Fixed

- Restored interact type compatibility and removed stale code escaping helpers.
- Sanitized imported code highlight HTML and added coverage for malicious document imports.
- Stabilized Settings panel workflows and tour-driven panel navigation.
- Fixed showcase tour render-loop, popover ordering, target highlight opacity, topic-menu wrapping, icon-button tooltips, and stale URL parameter drift between steps.
- Kept tour surfaces above editor popovers and made tour clicks/drags neutral to outside-click dismissal.
- Anchored Settings, transfer, validation, text, and animation story highlights to stable UI targets.

---

## [0.8.18] — 2026-05-03
Document: 1.5.102 · API: 2.1.0 · Editor: 0.15.18

### Added

- add rich text split action

### Changed

- collapse small-chunk fragmentation
- split heavy vendors into dedicated chunks
- align Vite output to es2022 and trim build cost
- lazy-load rich text edit overlay
- add ANALYZE=1 visualizer and build:fast script
- drop dead experimentalMinChunkSize option
- consolidate src/components/ui into ui-shared chunk
- document granular rich split conversion
- document rich split preservation
- add drag boundary maintenance item
- add roadmap entry skill
- sorted roadmap
- Merge branch 'master' of https://github.com/tombigel/sticky-playground
- add placeholder for low priority bug section
- update status of Text phase 2.0 to in progress and refine execution details

### Fixed

- update skills path to relative reference
- preserve unsupported rich split blocks
- preserve rich split styling

---

## [0.8.0] — 2026-04-25

Document: 1.5.84 · API: 2.0.76 · Editor: 0.15.0

Design refresh release. Project and Editor received minor version bumps; Document and API remain patch-level because this work did not change document schema or public API contracts.

### Added

- Compact editor control density across shared primitives and panel chrome, including compact switches and compact segmented tabs.
- Notice surface icon defaults, custom icon support, no-icon rendering, a warning surface tone, inline notice tone coverage, and separate neutral `message` vs green `info` treatments.
- Missing design-system showcase coverage for hidden selection chrome, searchable selects, compact/large switch lineups, notice variants, and URL-addressable showcase sections.
- Showcase navigation anchors that keep the left menu aligned with rendered sections and update the URL when a section is selected.
- A reusable implementation-planning skill for clean task lists, simple subagent roles, parallel prep/verification waves, and sequential task commits.

### Changed

- Reworked switch styling so size, tone, mixed-state chrome, and thumb offsets are owned by the shared `Switch` component instead of layered stylesheet overrides.
- Moved `Searchable Select` directly after `Dropdown (Select)` in the showcase and menu order, keeping searchable variants discoverable without duplicating them inside the regular select demo.
- Updated the editor style guide and playground spec for the refreshed switch, notice, dropdown, selection chrome, tabs, and showcase navigation contracts.
- Tightened compact tab presentation in floating panels with intrinsic label widths and a small internal gap between selected and hovered tab triggers.
- Released the focused text editing updates accumulated before this refresh.

### Fixed

- Fine-tuned compact and large switch thumb offsets for unchecked, checked, and mixed states.
- Kept mixed switch tracks transparent while preserving the dashed thumb indicator and token-backed border.
- Removed duplicate switch state overrides from `editor-chrome.css` to avoid override-on-override styling.
- Aligned idle code theme surfaces and wrapping behavior from the focused text editing work.

---

## [0.7.47] — 2026-04-24
Document: 1.5.60 · API: 2.0.52 · Editor: 0.14.0

### Added

- support standalone block edit commits
- enable block text editing on stage
- add list item depth
- preserve rich list item content
- add shared list editing helpers
- edit standalone lists on stage
- draft shared list editing helpers
- render inline standalone lists
- preserve list item depth in controls
- add grouped text editing toolbar
- support auto code theme and tab size
- add code style reset and tab size controls
- activate focused code editing
- support code editor indentation keys
- add focused code editor toolbar
- add code tab width and reset controls
- add code-focused mono font workflow
- add wrap presentation control

### Changed

- skip changelog-only release notes
- record Slate table planning findings
- cover on-stage block text editing
- document on-stage block text editing
- cover on-stage list editing
- document on-stage list editing
- document focused code editing

### Fixed

- preserve inline typography controls
- address list editing verification issues
- preserve list inline styles on subtype conversion
- preserve inline styles when converting to lists
- preserve rich list styles across conversions
- update code auto theme test expectations
- document code theme type export
- keep code inspector on API type surface
- keep manage fonts constants lightweight
- compact code tab width control
- make code toolbar responsive
- remove code styling reset button
- align code toolbar interactions
- clean up code toolbar interactions
- align code toolbar interactions
- make auto code theme follow system

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
