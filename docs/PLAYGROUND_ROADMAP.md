# Playground Roadmap

This document is the rolling overview of future work for the editor and the generated site/runtime.

It is intentionally not a technical implementation spec. It mixes UX, product, technical product, and technical detail in one place so we can keep a shared picture of where the playground is headed.

Use this document in two passes:

- Add new ideas to `Raw intake` first so information is not lost.
- Promote items into `Structured roadmap` once they are clear enough to classify.
- Change priority, type, status, and owner over time as reality changes.
- Keep the raw intake unless an item becomes clearly obsolete or is replaced by a better-worded equivalent.

Current-state notes in the structured roadmap should stay short and point back to current truth in [PLAYGROUND_SPEC.md](./PLAYGROUND_SPEC.md), [API.md](./API.md), or the codebase when relevant.

## Table of Contents

- [Item Format](#item-format)
- [Summary Table](#summary-table)
- [Active Stage](#active-stage)
- [Raw Intake](#raw-intake)
- [Structured Roadmap](#structured-roadmap)
  - [Priority: Blocker](#priority-blocker)
  - [Priority: High](#priority-high)
  - [Priority: Low](#priority-low)
  - [Priority: Optional](#priority-optional)
- [Completed Milestones](#completed-milestones)
- [Implementation Pre-Plan](#implementation-pre-plan)
- [Cross-Cutting Themes](#cross-cutting-themes)
- [Review Cadence](#review-cadence)

## Item Format

Structured roadmap items use this compact metadata:

- `Type`: `Bug`, `UX`, `Feature`, `Platform`, `Refactor`, `Infra`, `Research`
- `Owner lane`: `Human`, `LLM`, `Shared`, `Unknown`
- `Status`: `Not started`, `Partially present`, `Needs audit`, `Blocked`, `In progress`, `Done`, `Deferred`
- `Source`: one or more raw-intake ids
- `Dependencies` (optional): one or more roadmap items or raw-intake ids that should land first

Initial priorities in this document are a draft, not a commitment.

## Summary Table

This table is a compact scan view of the roadmap. It should stay lightweight and point back to the detailed entries below rather than replace them.

Priority and status use emoji color markers so the table stays plain markdown:

- `🔴` next / active focus
- `🟠` high priority
- `🔵` low priority
- `⚪` optional or not started
- `🟤` needs audit
- `🟣` partially present
- `🟢` in progress

| Raw intake id | Status | Short name | Priority | Type | Owner lane | Notes / dependencies |
| --- | --- | --- | --- | --- | --- | --- |
| `RI-11` | `🟢 In progress` | [More components: SVG, video, gradients](#more-components-svg-video-gradients) | `🔴 Next` | Feature | Shared | Ranking pass done 2026-07-05; build order: video → inline SVG → gradients. Embed deferred |
| `RI-12A` | `🟣 Partially present` | [More semantic components](#more-semantic-components) | `🔴 Next` | Feature | Shared | - |
| `RI-12B` | `🟣 Partially present` | [Semantic wrappers and grouping](#semantic-wrappers-and-grouping) | `🔴 Next` | UX | Shared | - |
| `RI-32` | `🟢 In progress` | [Unified node type discriminator model](#unified-node-type-discriminator-model) | `🔴 Next` | Refactor | Shared | Task 1 done; migration wired into import paths, idempotency fixed. Tasks 2-3 pending. Dep: `RI-11`, `RI-28` |
| `RI-45` | `⚪ Not started` | [Form and input authoring platform](#form-and-input-authoring-platform) | `🔴 Next` | Feature | Shared | Requires behavior/backoffice/docs/a11y spec before implementation |
| `RI-01` | `✅ Done` | [Animation undo coverage](#animation-undo-coverage) | `🔴 Next` | Bug | Shared | Audited; 5 reducer actions with undo support |
| `RI-02` | `✅ Done` | [On-stage animation indicator](#on-stage-animation-indicator) | `🔴 Next` | UX | LLM | Rocket badge on selection + layers; accent dot on non-selected; dashed border on scroll |
| `RI-03` | `✅ Done` | [Animation presets UI for development phase](#animation-authoring-ui-for-development-phase) | `🔴 Next` | UX | LLM | Full inspector: trigger, preset picker, param controls, hover/sticky/a11y options |
| `RI-13` | `✅ Done` | [AI layer for conversational editor control](#ai-layer-for-conversational-editor-control) | `🔴 Next` | Feature | Shared | Umbrella for `RI-46`, `RI-47`, `RI-48` — all shipped, v1 scope cut documented |
| `RI-43` | `✅ Done` | [Guided showcase tour for editor portfolio](#guided-showcase-tour-for-editor-portfolio) | `🔴 Next` | UX | Shared | Unplanned; needed to make the editor understandable as portfolio evidence |
| `RI-46` | `✅ Done` | [AI command/interface layer over the public API](#ai-commandinterface-layer-over-the-public-api) | `🔴 Next` | Platform | Shared | `src/api/ai/`: 12-command union, 8 query tools, all-or-nothing batch apply. Dep: `RI-13` |
| `RI-47` | `✅ Done` | [Bring-your-own-model connection layer](#bring-your-own-model-connection-layer) | `🔴 Next` | Platform | Shared | OpenRouter SSE adapter, localStorage key, OpenRouter routers plus 5 direct model picks. Dep: `RI-46` |
| `RI-48` | `✅ Done` | [Conversational editor UI with assistant-ui](#conversational-editor-ui-with-assistant-ui) | `🔴 Next` | UX | Shared | Hand-rolled thread UI shipped instead of assistant-ui (test-tooling constraint). Dep: `RI-46`, `RI-47` |
| `RI-04` | `⚪ Not started` | [Animation keyframes UI for development phase](#animation-authoring-ui-for-development-phase) | `🟠 High` | UX | LLM | Deferred to next phase |
| `RI-05` | `⚪ Not started` | [Designed animation UI with product/UX intent](#animation-authoring-ui-with-real-productux-design) | `🟠 High` | UX | Human | Dep: `RI-03`, `RI-04` |
| `RI-06` | `🟣 Partially present` | [Animation + sticky UI, behaviors, a11y](#animation--sticky-ux-behaviors-and-a11y) | `🟠 High` | UX | Shared | Dep: `RI-05` |
| `RI-09` | `🟣 Partially present` | [Responsive and adaptive authoring model](#responsive-and-adaptive-authoring-model) | `🟠 High` | Feature | Shared | - |
| `RI-10` | `🟤 Needs audit` | [Editor stage responsive behavior](#editor-stage-responsive-behavior) | `🟠 High` | Feature | Shared | Dep: `RI-09` |
| `RI-25` | `🟢 In progress` | [Performance optimization program](#performance-optimization-program) | `🟠 High` | Platform | Shared | - |
| `RI-27` | `🟣 Partially present` | [Variable fonts as an authoring workflow](#variable-fonts-as-an-authoring-workflow) | `🟠 High` | UX | Shared | - |
| `RI-29` | `⚪ Not started` | [Sticky indicators: motion-aware, interactive, and sideline-capable](#sticky-indicators-motion-aware-interactive-and-sideline-capable) | `🟠 High` | UX | Shared | Dep: `RI-06` |
| `RI-33` | `🟣 Partially present` | [Copy/paste and duplication across page structure](#copypaste-and-duplication-across-page-structure) | `🟠 High` | Feature | Shared | Stage node copy/paste/duplicate v1 done; page duplication deferred |
| `RI-34` | `🟢 In progress` | [Text phase 2.0: on-stage editing](#text-phase-20-on-stage-editing) | `🟠 High` | Feature | Shared | P2-A through P2-D done; rich E2E isolated; four rich authoring cases quarantined; P2-C follow-ups, P2-E, and P2-F remain |
| `RI-38` | `🟢 In progress` | [Interaction pattern unification](#interaction-pattern-unification) | `🟠 High` | Refactor | Shared | Escape + click-outside hooks done. Positioning + drag deferred (too different). |
| `RI-40` | `⚪ Not started` | [Table component support: markdown and designable variants](#table-component-support-markdown-and-designable-variants) | `🟠 High` | Feature | Shared | Dep: `RI-11`, `RI-12B` |
| `RI-44` | `⚪ Not started` | [Parent expansion height unit policy](#parent-expansion-height-unit-policy) | `🟠 High` | Research | Shared | Decide non-px parent expansion behavior; auto preservation is already committed |
| `RI-49` | `⚪ Not started` | [Editor URL deep links outside the tour](#editor-url-deep-links-outside-the-tour) | `🟠 High` | Feature | LLM | Boot hydration decided 2026-07-04. Dep: `RI-50` |
| `RI-50` | `⚪ Not started` | [Centralized panel request adapter](#centralized-panel-request-adapter) | `🟠 High` | Refactor | LLM | Fixes latent `ai` toggle drift bug in tour controller |
| `RI-07` | `✅ Done` | [Multiple pages / MPA approach](#multiple-pages--mpa-approach) | `🟠 High` | Feature | Shared | Wave 1-2 complete. Copy/paste deferred to `RI-33` |
| `RI-35` | `✅ Done` | [Base UI primitive token migration](#base-ui-primitive-token-migration) | `🟠 High` | Refactor | LLM | All 6 components migrated; `--editor-dialog-overlay-background` token added |
| `RI-36` | `✅ Done` | [Dark tooltip deduplication](#dark-tooltip-deduplication) | `🟠 High` | Refactor | LLM | `DARK_TOOLTIP_CLASS` extracted to `src/lib/utils`, 15 occurrences replaced |
| `RI-39` | `✅ Done` | [Hidden ghost mode for hidden nodes](#hidden-ghost-mode-for-hidden-nodes) | `🟠 High` | UX | Shared | Hidden nodes render as ghosts on stage; selection, inspector, and export semantics updated |
| `RI-41` | `✅ Done` | [Document view API and architecture boundary enforcement](#document-view-api-and-architecture-boundary-enforcement) | `🟠 High` | Refactor | LLM | `documentViewApi.ts` + `check-architecture.mjs` CI check |
| `RI-42` | `✅ Done` | [Drag and drop boundary maintenance](#drag-and-drop-boundary-maintenance) | `🟠 High` | UX | Shared | Anchor/box child boundaries, deterministic drag commit, and modifier cleanup delivered |
| `RI-14` | `🟣 Partially present` | [Export surface expansion](#export-surface-expansion) | `🔵 Low` | Feature | Shared | - |
| `RI-16` | `⚪ Not started` | [User management](#user-management) | `🔵 Low` | Platform | Human | - |
| `RI-18` | `⚪ Not started` | [Project management](#project-management) | `🔵 Low` | Platform | Human | - |
| `RI-19` | `⚪ Not started` | [Assets management](#assets-management) | `🔵 Low` | Platform | Human | - |
| `RI-20` | `⚪ Not started` | [CMS](#cms) | `🔵 Low` | Platform | Human | - |
| `RI-31` | `⚪ Not started` | [Migrate persistence to IndexedDB](#migrate-persistence-to-indexeddb) | `🔵 Low` | Platform | Shared | Dep: `RI-07` |
| `RI-28` | `✅ Done` | [Rich text component with inline styling](#rich-text-component-with-inline-styling-preferably-md-backed) | `🔵 Low` | Feature | Shared | Slate-based rich editor, phases 1.x through 1.8 complete. Phase 2.0 on-stage editing → `RI-34` |
| `RI-30` | `✅ Done` | [Project versioning system](#project-versioning-system) | `🔵 Low` | Platform | Shared | Four semver versions in `src/lib/version.ts`; pre-commit patch bump; `schemaVersion` on export |
| `RI-37` | `✅ Done` | [Wave F CSS cleanup](#wave-f-css-cleanup) | `🔵 Low` | Refactor | LLM | Dead `.editor-inline-field-trigger-static` deleted from editor-chrome.css |
| `RI-08` | `⚪ Not started` | [View transitions between pages and beyond](#view-transitions-between-pages-and-beyond) | `⚪ Optional` | Feature | Human | - |
| `RI-15` | `⚪ Not started` | [Import from external sources](#import-from-external-sources) | `⚪ Optional` | Feature | Shared | - |
| `RI-17` | `⚪ Not started` | [Collaboration](#collaboration) | `⚪ Optional` | Platform | Human | - |
| `RI-21` | `⚪ Not started` | [Connect to external CMS](#connect-to-external-cms) | `⚪ Optional` | Platform | Human | - |
| `RI-22` | `⚪ Not started` | [Connect to Wix services](#connect-to-wix-services) | `⚪ Optional` | Platform | Human | - |
| `RI-23` | `⚪ Not started` | [Arbitrary code support for components](#arbitrary-code-support-for-components) | `⚪ Optional` | Research | Human | - |
| `RI-24` | `⚪ Not started` | [Arbitrary CSS support for components](#arbitrary-css-support-for-components) | `⚪ Optional` | Research | Human | - |
| `RI-26` | `🟤 Needs audit` | [Interact custom effects support](#interact-custom-effects-support) | `⚪ Optional` | Feature | Shared | Dep: `RI-02`, `RI-03`, `RI-04`, `RI-05`, `RI-06` |

## Active Stage

**Authoring Foundation** — moves the playground from a sticky/animation prototype to a real authoring environment across three workstreams: animation controls and on-stage feedback, multi-page navigation, and a richer component and semantic model.

Extended product vision, feature requests, UX ideas, and open questions for this stage live in [NEXT_STAGE_BRIEF.md](./NEXT_STAGE_BRIEF.md).

Roadmap items in scope: `RI-01`, `RI-02`, `RI-03`, `RI-11`, `RI-12A`, `RI-12B`, `RI-13`, `RI-32`, `RI-34`, `RI-35`, `RI-36`, `RI-38`, `RI-43`, `RI-45`, `RI-46`, `RI-47`, `RI-48`

## Raw Intake

The goal of this section is capture fidelity, not cleanup. The bullets below intentionally preserve the original wording and uncertainty.

- `RI-01` undo for animations, do we have it?
- `RI-02` on stage indicator for animation (like sticky)
- `RI-03` dev ui for animations - presets
- `RI-04` dev ui for animations - keyframes
- `RI-05` ux ui for animations - presets and keyframes
- `RI-06` animatons + sticky ui, behaviors, a11y
- `RI-07` support multiple pages (mpa apporach)
- `RI-08` support view transitions between pages but not only
- `RI-09` responsivity - support for media queriers - breakpoints, but not only - toch device media quesries, a11y media queries, other interesting.
- `RI-10` editor stage responsive behavior
- `RI-11` more components - svg, video, gradients
- `RI-12A` more semantic components - for example links have more types than just a web url, we need dialogs, landmarks etc.
- `RI-12B` semantic wrappers / grouping - wrapping links with nav makes them a menu, aside, article etc. changes the semantics of components and can also change the ux of handling them
- `RI-13` ai integration, preliminary integration, both for site building and for aniamtions, skills, mcps
- `RI-14` different export abilities - static site (current), react app, electron app?, pdf? image?, presentation?
- `RI-15` import from existing html, image (ai?), figma (with mcp?)?
- `RI-16` user management
- `RI-17` collaboration
- `RI-18` project managemet
- `RI-19` assets management
- `RI-20` cms
- `RI-21` connect to external cms (wordpress? others?)
- `RI-22` connect to wix services
- `RI-23` arbitrary code support for components
- `RI-24` arbitrary css support for components
- `RI-25` performance optimizations
- `RI-26` interact custom effects support
- `RI-27` support variable fonts
- `RI-28` add a text component that can be styled inline
- `RI-29` make sticky indicators more sticky motion aware, and make them interactive so stickyness can be set on stage, create another visual option for them to be on the stage sidelines and not clutter the viewport
- `RI-30` add a versioning system to the project
- `RI-31` migrate persistence from localStorage to IndexedDB to remove the 5MB storage ceiling as site data grows
- `RI-32` unified node type discriminator model — text, media, and container node families each use a type discriminator so the renderer picks the right component, and nodes within a family are interchangeable by switching type
- `RI-33` editor support for copy/paste components and sections within a page and between pages, plus page duplication flows
- `RI-34` text component phase 2.0 — on-stage editing for block text, code, lists; description lists in rich editing; unified all-text stage editing shell
- `RI-35` base UI primitive token migration — switch, slider, select, input, textarea, dialog bypass existing CSS tokens with hardcoded Tailwind slate classes
- `RI-36` dark tooltip deduplication — identical tooltip class string duplicated 15 times across 8 files; extract shared utility
- `RI-37` Wave F CSS cleanup — deferred from design-system convergence audit; delete superseded CSS after all migrations land
- `RI-38` interaction pattern unification — escape key, click-outside, pointer drag, popover positioning, and focus management each have multiple ad-hoc implementations; extract shared hooks and composite design system components
- `RI-39` hidden ghost mode — hidden nodes (and hidden-targeted top-level wrappers) should render as semi-transparent ghost overlays in the editor stage so authors can see and select hidden content without cluttering the live layout; selection, inspector, and export should handle hidden nodes consistently
- `RI-40` table component support — add two table directions under components/wrappers: a simple markdown-backed table for fast authoring/export, and a more robust designable table where each cell can host nodes and participate in wrapper/layout semantics
- `RI-41` document view API and architecture boundary enforcement — all UI model reads should route through a dedicated `documentViewApi` layer rather than reaching into editor state directly; an automated architecture check script should enforce the boundary at CI time
- `RI-42` drag and drop boundary maintenance — current drag rules confine elements into the padded content area of their container; by default authors should be able to drag elements so they stick out past container boundaries, with the boundary acting as snap/alignment guidance, plus an explicit hard-confinement option for stricter layouts
- `RI-43` unplanned showcase tour phase — add a guided, non-linear overlay that makes the editor understandable as job-search/portfolio evidence and exposes sticky, editor craft, API, design-system, text, animation, pages, validation, and docs surfaces
- `RI-44` parent expansion height unit policy — decide how API/editor parent expansion should handle authored height units beyond px and auto, especially aspect-ratio and viewport/percentage units, without silently rewriting user-authored sizing intent
- `RI-45` form and inputs require a real spec for behavior, backoffice connection, docs integration, accessibility, validation, submission, and generated-site runtime; important enough to track as very high priority before implementation
- `RI-46` AI command/interface layer over the public API — model prompts as typed tools and document/editor commands over `src/api/`, not UI automation or freeform model mutation
- `RI-47` bring-your-own-model connection layer — let users connect hosted providers, OpenRouter-style routers, local/Ollama-compatible endpoints, and future local agents with clear streaming/key/proxy boundaries
- `RI-48` conversational editor UI with assistant-ui — add the editor-facing chat/thread/composer surface, tool-call rendering, approval/apply affordances, provider/model picker entry points, and design-system alignment
- `RI-49` editor URL deep links should work outside the tour — direct `#/edit?panel=...` / settings/help/page params should hydrate panels once at app boot, not only through tour step navigation; decided in the showcase tour review follow-up
- `RI-50` centralize panel request handling — the tour controller re-implements the panel request switch against React setters and has drifted from the pure `applyEditorPanelRequest` helper (an `ai` toggle falls through to manage fonts); route all consumers through one shared adapter over the pure helper

## Structured Roadmap

### Priority: Blocker

#### Bug

None yet.

#### UX

None yet. Promote items here only when the lack of workflow blocks meaningful use of a subsystem that already exists.

#### Feature

None yet. Multi-page, responsive, and extensibility work may move here later depending on product direction.

#### Platform

None yet.

#### Refactor

None yet.

#### Infra

None yet.

#### Research

None yet.

### Priority: High

#### Bug

##### Animation undo coverage

- `Type`: `Bug`
- `Owner lane`: `Shared`
- `Status`: `Done`
- `Source`: `RI-01`
- `Dependencies`: `RI-05`
- `Why it matters`: If animation authoring actions do not create reliable undo entries, the editing workflow will feel unsafe and inconsistent with the rest of the editor.
- `Current state`: **Complete** — audited all animation mutation paths. Five new reducer actions (`animationPreset`, `animationKeyframe`, `animationOptions`, `animationClear`, `animationDocSettings`) wired through the standard `applySelectedNodeUpdate` pattern with automatic history tracking. The console API intentionally bypasses undo via `importDocument`. Delivered sha: 5dc5b2a.

#### UX

##### On-stage animation indicator

- `Type`: `UX`
- `Owner lane`: `LLM`
- `Status`: `Done`
- `Source`: `RI-02`
- `Relationship`: Landed as part of `RI-03`.
- `Why it matters`: A functional animation authoring flow needs visible stage feedback, especially if sticky already has clear stage indicators.
- `Current state`: **Complete** — Rocket badge on selection frame and layers panel rows for animated nodes. Previously had accent dot and dashed border indicators on non-selected nodes; removed as not spec'd. Delivered sha: e8dcb7e.

##### Animation authoring UI for development phase

- `Type`: `UX`
- `Owner lane`: `LLM`
- `Status`: `Done` (RI-03 presets); `Not started` (RI-04 keyframes)
- `Source`: `RI-03`, `RI-04`
- `Why it matters`: The animation subsystem needs a functional authoring surface that is good enough for development, testing, and iteration before the designed product UI is ready.
- `Current state`: **RI-03 complete** — `AnimationSection` inspector component with: enable/disable toggle, trigger type selector (6 types with smart defaults), searchable preset picker (64 presets, with grouped option headers and capped dropdown height), dynamic preset parameter controls from schema, timing controls (duration, delay) and named easing selector (preserves timing values across preset changes), hover out-action selector, requires-sticky toggle with warning, reduced-motion toggle, clear button. Wired into all 8 inspector configs. Animation focused mode. Delivered across sha: f56e9c8, 65b379e, 52b0a4b. **RI-04 (keyframes) deferred** — keyframe list editor, property editor, and CSS import are planned for the next phase.
- `Next move`: Implement RI-04 keyframe authoring UI.

##### Animation authoring UI with real product/UX design

- `Type`: `UX`
- `Owner lane`: `Human`
- `Status`: `Not started`
- `Source`: `RI-05`
- `Dependencies`: `RI-03`, `RI-04`
- `Why it matters`: Once the subsystem is proven functionally, it needs a designed authoring experience with clear product thinking, understandable UX, and intentional editing flows.
- `Current state`: Current animation affordances are model- and preview-oriented; no designed product-grade inspector or focused-mode workflow is documented yet.
- `Next review question`: What should the final user-facing animation workflow feel like once we move past the functional development UI?
- `Follow-on phase`: `RI-06` should be treated as the next phase after this item, covering animation + sticky UI, combined behaviors, and a11y.

##### Animation + sticky UX, behaviors, and a11y

- `Type`: `UX`
- `Owner lane`: `Shared`
- `Status`: `Partially present`
- `Source`: `RI-06`
- `Dependencies`: `RI-05`
- `Why it matters`: Animation and sticky can amplify each other, but they can also create confusing behavior or accessibility regressions.
- `Current state`: The animation model includes accessibility settings and a `requiresSticky` flag, while sticky already has strong editor-stage visibility; the combined authoring story is still incomplete.
- `Next move`: Treat this as the follow-on phase after the designed animation UI work, then review behavior combinations, reduced-motion policy, and authoring guardrails.

##### Sticky indicators: motion-aware, interactive, and sideline-capable

- `Type`: `UX`
- `Owner lane`: `Shared`
- `Status`: `Not started`
- `Source`: `RI-29`
- `Dependencies`: `RI-06`
- `Why it matters`: Sticky indicators are already part of the editor’s trust model, but they should better explain sticky motion over scroll, support direct manipulation on stage, and avoid obscuring the viewport when documents get dense.
- `Current state`: Sticky guides and labels are visible in the stage, but they are still mostly passive overlays inside the main viewport and are not yet described as a direct on-stage editing surface or as motion-aware representations of sticky behavior.
- `Next move`: Define a first interaction model that covers motion-aware indicator states, direct on-stage stickiness editing, and an alternate sideline presentation that keeps the viewport readable while preserving clear mapping back to the node.

##### Guided showcase tour for editor portfolio

- `Type`: `UX`
- `Owner lane`: `Shared`
- `Status`: `Done`
- `Source`: `RI-43`
- `Why it matters`: The editor had enough product depth to show, but visitors needed a guided path through live surfaces rather than a loose demo. This unplanned step became necessary to make the editor legible as portfolio evidence for job search conversations.
- `Current state`: **Complete** — shipped a non-linear showcase overlay with URL-backed topic/step state, API-first editor navigation, typed tour config, target highlights, draggable/minimizable tour surfaces, outside-click-safe overlay behavior, compact default menu, new-tab preview/design-system actions, and story steps for sticky behavior, editor structure, focus mode, Slate rich text, API docs, import/export, preview, Google Fonts, animation, pages, routing, validation, and documentation. Covered by focused API/config/component tests, smoke e2e, docs, and build validation. Delivered across the showcase-tour commit series ending at `7386f18`.

##### Conversational editor UI with assistant-ui

- `Type`: `UX`
- `Owner lane`: `Shared`
- `Status`: `Done`
- `Source`: `RI-48`
- `Dependencies`: `RI-46`, `RI-47`
- `Why it matters`: A conversational layer needs to feel like part of the editor, not a detached chatbot; authors need to see tool calls, proposed changes, and approval/apply states in the same design language as the rest of the workspace.
- `Current state`: **Complete, with a naming caveat** — the delivered UI is a hand-rolled thread UI (`src/panels/AiPanel.tsx`, `src/panels/ai/AiMessageList.tsx`, `src/panels/ai/AiDraftDiffCard.tsx`), not the `assistant-ui` library named in the item title. This repo's test infrastructure has no jsdom/testing-library (only `renderToStaticMarkup` plus node-environment vitest), which would have made `assistant-ui`'s stateful `ExternalStoreRuntime` contract untestable within existing conventions without introducing new test tooling — a judgment call authorized by the plan's own Task 9 decision-gate framing (commit `553d5f1`). The delivered surface still covers everything the item asked for: a floating/toggleable panel (like Layers/Settings, not a persistent sidebar), draft/approval/apply affordances (`AiDraftDiffCard` with destructive-command visual distinction and stale-draft handling), provider/model selection entry points (Settings → AI Assistant section), and design-system alignment (verified via `/design-system-check`, zero token violations).

##### Variable fonts as an authoring workflow

- `Type`: `UX`
- `Owner lane`: `Shared`
- `Status`: `Partially present`
- `Source`: `RI-27`
- `Why it matters`: Variable fonts affect typography quality, performance, expressive control, and future responsive typography behavior.
- `Current state`: Font metadata and stylesheet generation already carry variable-font concepts, and the spec notes variable fonts are hidden by default while static-font flows are being debugged.
- `Next move`: Decide whether the first milestone is simply exposing supported variable families, or also exposing axis-aware controls.

##### Hidden ghost mode for hidden nodes

- `Type`: `UX`
- `Owner lane`: `Shared`
- `Status`: `Done`
- `Source`: `RI-39`
- `Why it matters`: Authors need to see and edit hidden content without being blocked by its hidden state, and without hidden nodes disappearing from stage layout or accidentally affecting sibling geometry.
- `Current state`: **Complete** — hidden nodes (and top-level wrappers with `Hidden` visibility) render as semi-transparent ghosts with a diagonal-stripe overlay on stage. Selection collapses to a single hidden node and restricts the inspector to layout-only controls. `showHidden` setting is persisted and exposed in Settings → UI and the left-rail quick actions. Export omits hidden nodes entirely. Delivered sha: 1318f22.

##### Drag and drop boundary maintenance

- `Type`: `UX`
- `Owner lane`: `Shared`
- `Status`: `Done`
- `Source`: `RI-42`
- `Why it matters`: Dragging is a core authoring operation, and strict confinement to a wrapper's padded content area prevents common overlapping, offset, and breakout layouts. Container edges should guide layout by default, not silently block expressive placement.
- `Current state`: **Complete** — wrappers now resolve a `childBoundary` policy from the document model. The inspector labels it **Child overflow**: `anchor` / **Allow overflow** keeps the child origin inside the content box while allowing the body to overflow; `box` / **Keep inside** keeps the full child box inside. Drag update stores one resolved placement for preview and commit, pointer-up no longer recomputes snap/drop/bounds, keyboard nudging uses the same boundary policy, and mesh layout preserves allowed right/bottom overflow. Allow overflow downward drag and keyboard movement can grow the parent through the same resolved placement commit.
- `Target behavior`: Delivered. Default drag boundaries behave as soft origin constraints plus snap/alignment guidance, and hard confinement remains available through the explicit `box` policy.
- `Next move`: Connect the existing `Alt` / `Option` duplicate-requested drag stub to the duplicate document API, keeping drag preview and commit semantics aligned.

#### Feature

##### AI layer for conversational editor control

- `Type`: `Feature`
- `Owner lane`: `Shared`
- `Status`: `Done`
- `Source`: `RI-13`
- `Relationship`: Umbrella for `RI-46`, `RI-47`, and `RI-48` — all three shipped.
- `Why it matters`: AI-assisted generation and transformation could accelerate site authoring, animation work, and internal iteration, but only if the model operates through the same API-first boundaries as the rest of the editor.
- `Current state`: **Complete** — a conversational command layer now sits over `src/api/`: prompts produce validated tool calls that are previewed as a draft diff, approved, and committed as a single undoable editor action. See `RI-46`, `RI-47`, `RI-48` for the per-layer delivered detail.
- `V1 scope cut`: 12 of 100+ `documentApi` functions are exposed as AI tools; clipboard/paste, animation, font management, page/site structural operations, drag-drop session APIs, and code-block/rich-list-specific setters are explicitly out of scope for v1 — these are straightforward additive follow-ups, not architectural gaps. Provider support is OpenRouter-only (no local/Ollama bridge yet). There is no serverless key proxy — the OpenRouter key is client-direct only (localStorage), a documented tradeoff, not an oversight.
- `Next move`: Treat further command coverage, additional providers, and a key-proxy option as independent follow-up items rather than a re-plan of this umbrella.

##### Responsive and adaptive authoring model

- `Type`: `Feature`
- `Owner lane`: `Shared`
- `Status`: `Partially present`
- `Source`: `RI-09`
- `Why it matters`: Responsive behavior affects layout, content strategy, accessibility, and export correctness across the whole product.
- `Current state`: The spec says the model is breakpoint-ready, but the current editor only exposes a base breakpoint and does not yet cover the broader media-query space named in the raw intake.
- `Next review question`: What is the minimum first slice: classic breakpoints only, or a broader “adaptive conditions” model from day one?

##### Editor stage responsive behavior

- `Type`: `Feature`
- `Owner lane`: `Shared`
- `Status`: `Needs audit`
- `Source`: `RI-10`
- `Dependencies`: `RI-09`
- `Why it matters`: Even with a responsive model, the editor still needs an understandable stage behavior for previewing and editing those states.
- `Current state`: The stage is strong for current single-state authoring, but responsive preview/edit behavior is not yet defined as a user workflow.
- `Next move`: Decide how the stage switches, previews, and communicates alternate responsive states.

##### Multiple pages / MPA approach

- `Type`: `Feature`
- `Owner lane`: `Shared`
- `Status`: `Done`
- `Source`: `RI-07`
- `Why it matters`: Multi-page support changes the document model, navigation semantics, export shape, and future product scope.
- `Delivered (Wave 1-2)`: Page model with hierarchy, slug management, aliases, and uniqueness checks during new-page creation. Editor page switching via four UI entry points. Page linking with internal anchor support. Export with `outputStructure` selection (directory vs. flat). Preview mode with navigation. Top-level wrapper page visibility with `Hidden`, `Current page`, `All pages`, and `Custom pages`, exposed from the Components panel and Inspector.
- `Deferred to RI-33`: Copy/paste across pages, page duplication, full page templates.

##### Copy/paste and duplication across page structure

- `Type`: `Feature`
- `Owner lane`: `Shared`
- `Status`: `Partially present`
- `Source`: `RI-33`
- `Dependencies`: `RI-07`
- `Why it matters`: Once the editor supports more than one page, authors need reusable editing workflows for moving or cloning content without rebuilding it manually. Copy/paste of components and sections, cross-page paste targets, and duplicate-page actions are part of the baseline trust model for authoring at page/site scope.
- `Current state`: **Partially present** — stage node copy/paste/duplicate v1 is implemented through API-first clipboard payloads, shared shortcuts, active Edit menu entries, undoable editor actions, and docs/tests. Supported v1 transfer units are selected stage nodes, multi-selection top-level filtering, containers with descendants, section/subtree paste, in-memory/system clipboard payloads, and external text/html/link/image fallback paste.
- `Next move`: Add whole-page duplication and decide whether duplicate-drag should commit through the new duplicate document API or remain a separate follow-up interaction.

##### Form and input authoring platform

- `Type`: `Feature`
- `Owner lane`: `Shared`
- `Status`: `Not started`
- `Source`: `RI-45`
- `Why it matters`: Forms turn static authored pages into useful business workflows: contact, waitlist, signup, RSVP, quote request, survey, payment inquiry, and support intake. They also carry heavier product obligations than a visual component because submission behavior, validation, spam protection, accessibility, storage/notification/backoffice connection, and export/runtime behavior all need to agree.
- `Current state`: The editor has shared internal UI form primitives for inspector/settings chrome, but authored site forms are not part of the document model, `src/api/`, stage renderer, site renderer, export surface, or documentation.
- `Next move`: Write a dedicated form spec before implementation. The first design pass should decide the form/container model, supported field types, client/server validation split, submission connector boundary for a serverless project, spam-protection expectations, accessibility requirements, generated-site runtime behavior, docs/help integration, and whether the first slice is a third-party/action-URL form or a native submission workflow.

##### More components: SVG, video, gradients

- `Type`: `Feature`
- `Owner lane`: `Shared`
- `Status`: `In progress`
- `Source`: `RI-11`
- `Why it matters`: Richer components widen the playground from a sticky/layout lab into a broader authoring environment.
- `Current state`: The core leaf set is text, image, link, and button, but the `MediaNode` model already declares `image | video | svg | embed` subtypes with `video` playback fields (`autoplay`/`loop`/`muted`) and an `svg.renderMode` (`img`/`inline`) field, and default factories exist for all of them. What is missing for video and SVG is the editor surface only: insertion roles, stage/site renderer branches, and inspector configs. Backgrounds are plain CSS strings, so gradient support is an inspector/authoring problem, not a model migration.
- `Ranked backlog (2026-07-05)`: Candidates scored on model complexity vs export/site value:
  1. **Video** — model scaffolded; work is renderers + inspector + insertion only; high export value. Build first.
  2. **Inline SVG** — model scaffolded (`img` and `inline` render modes); high export value; the one real cost is input-time sanitization for inline markup. Build second.
  3. **Gradient backgrounds** — existing `background?: string` already accepts CSS gradient strings with zero migration; work is a design-system-aligned inspector control. Build third (parallelizable).
  4. **Extended link types** (email/tel/download) — tiny `LinkExtension` union delta, high authoring value; scheduled under `RI-12A`.
  5. **Semantic wrappers** (nav/aside/article) — tiny union + tag-map delta, high a11y/export value; scheduled under `RI-12B` and required by `RI-40`.
  6. **Divider/hr** — trivial model, modest value; unscheduled backlog.
  7. **Icon** — medium complexity (asset source and export strategy undecided), medium value; unscheduled backlog.
  8. **Audio** — needs a new media subtype, low authoring demand; unscheduled backlog.
  9. **Embed/iframe** — subtype exists in the model, but inline third-party embeds raise sandboxing/CSP/security questions that video/SVG do not. **Decision: out of the first implementation wave**; stays on the backlog until a sandboxing stance is defined.
  10. **Dialogs** — needs an interaction runtime on exported static sites; spec-first under `RI-12A` before any implementation.
- `Next move`: Implement video (insertion role, stage/site renderers, inspector config, spec, tests), then inline SVG gated on an input-time sanitization decision, then the gradient background control.

##### Table component support: markdown and designable variants

- `Type`: `Feature`
- `Owner lane`: `Shared`
- `Status`: `Not started`
- `Source`: `RI-40`
- `Dependencies`: `RI-11`, `RI-12B`
- `Why it matters`: Tables are a common authoring need, but one implementation will not cover both lightweight content tables and deeply designed layouts. The roadmap should treat quick authoring tables and fully designable table structures as related but distinct component directions.
- `Current state`: There is no dedicated table component yet, and the current component/wrapper model does not define how table rows, columns, headers, or cells should behave in export, selection, or layout authoring.
- `Slate findings`: Slate has official table references, but tables are not a first-party typed primitive. The docs and examples frame tables as a custom nested model enabled by Slate's recursive document tree. The official example defines userland `table`, `table-row`, and `table-cell` elements, renders them to semantic table markup, and adds only minimal editing guards. Richer behaviors such as keyboard navigation, headers, row/column insertion, paste/import/export normalization, and formulas would be owned by this project.
- `Simple-table direction`: Treat the simple table as part of the text system, but store it as a structured Slate block rather than as plain markdown text. Markdown pipe syntax can be an authoring/import/export format, while the canonical content should remain a typed nested table block that exports to semantic HTML table markup.
- `Designable-table boundary`: Keep the designable table separate from the simple text-table path. If cells can host document nodes such as images, buttons, wrappers, sticky targets, or animation targets, the table belongs in the document/container model rather than inside Slate-only text content.
- `Next move`: Split the first planning pass into two variants: a simple markdown-backed table optimized for fast text/data authoring and predictable export, and a more robust designable table where each cell can host nodes and inherit wrapper/layout semantics. Then decide whether they share one base model with two authoring modes or should remain separate component families.

##### More semantic components

- `Type`: `Feature`
- `Owner lane`: `Shared`
- `Status`: `Partially present`
- `Source`: `RI-12A`
- `Why it matters`: The editor needs richer semantic building blocks, not just generic visual nodes, so authored output can express more real UI and content patterns.
- `Current state`: Some semantic capability already exists through wrapper roles and text tag authoring, but there is no broader semantic component surface for cases like richer link types, dialogs, landmarks, and related semantic elements.
- `Next move`: Separate semantic component expansion from wrapper semantics and rank the first additions by authoring value, export value, and accessibility impact.

##### Semantic wrappers and grouping

- `Type`: `UX`
- `Owner lane`: `Shared`
- `Status`: `Partially present`
- `Source`: `RI-12B`
- `Why it matters`: Group-level semantics such as `nav`, `aside`, or `article` can change both exported meaning and the editor UX for how grouped content is handled.
- `Current state`: The editor already has structural wrapper roles such as `section`, `header`, `footer`, and `container`, but it does not yet expose a broader grouping semantics layer that can reinterpret child meaning or authoring behavior.
- `Next move`: Define how semantic grouping should affect export semantics, inspector controls, and editing affordances without collapsing into arbitrary wrapper complexity.

##### Editor URL deep links outside the tour

- `Type`: `Feature`
- `Owner lane`: `LLM`
- `Status`: `Not started`
- `Source`: `RI-49`
- `Why it matters`: `PLAYGROUND_SPEC.md` describes editor URLs as supporting panel, settings, help, and page targets, but outside the tour those params are parsed and never applied at boot — the spec over-claims, and shareable deep links (a URL that opens a specific help doc or settings section) are valuable for the portfolio surface.
- `Current state`: `editorNavigationApi` already parses and builds all the params, and tour step navigation applies them through panel scenes. Direct `#/edit?panel=settings&settings=transfer` without `tour` does nothing at boot.
- `Next move`: Apply parsed panel/help/settings/page targets once at app boot (no continuous two-way sync outside the tour), reusing the tour's stale-param rewriting rules. Decided in the showcase tour review follow-up (2026-07-04).
- `Dependencies`: `RI-50`

#### Platform

##### Performance optimization program

- `Type`: `Platform`
- `Owner lane`: `Shared`
- `Status`: `In progress`
- `Source`: `RI-25`
- `Why it matters`: Performance becomes a hard constraint as animation, responsiveness, assets, collaboration, and multi-page work expand the editor.
- `Current state`: The spec already contains some performance-minded decisions, but performance should be treated as a recurring maintenance track rather than a one-time pass.
- `Next move`: Re-run focused perf audits every once in a while, especially after large project advancements, covering stage rendering, history pressure, export cost, and animation/runtime overhead.

##### AI command/interface layer over the public API

- `Type`: `Platform`
- `Owner lane`: `Shared`
- `Status`: `Done`
- `Source`: `RI-46`
- `Dependencies`: `RI-13`
- `Why it matters`: AI edits must preserve the editor's API-first architecture, validation rules, and undo model. A typed command/interface layer prevents the assistant from becoming a parallel editor that mutates documents outside supported APIs.
- `Current state`: **Complete** — `src/api/ai/` ships a 12-variant curated `AiDocumentCommand` union (`setRect`, `setSticky`, `setText`, `setTextDocumentContent`, `insertText`, `insertContainer`, `insertSectionTemplate`, `deleteNode`, `setNodeVisibility`, `reparentNode`, `reorderNode`, `setContainerChildBoundary`), each a thin wrapper over an existing `documentApi` function. 8 read-only query tools (`getDocumentTree`, `getNodeById`, `getSelection`, `searchNodesByType`, `searchNodesByText`, `getPageList`, `getActivePage`, `getValidationErrors`). `applyAiDocumentCommands` re-validates every command against the current document at apply time and applies all-or-nothing, rejecting the whole batch as a stale draft if anything no longer validates. `editorApi.applyAiCommands` is the single undoable commit path, with exactly one UI call site (`AiDraftDiffCard.tsx`) — a multi-command batch yields exactly one `HistoryEntry`. Documented in `docs/API_AI.md`.

##### Bring-your-own-model connection layer

- `Type`: `Platform`
- `Owner lane`: `Shared`
- `Status`: `Done`
- `Source`: `RI-47`
- `Dependencies`: `RI-46`
- `Why it matters`: Users should be able to choose their own model provider without coupling the editor to one hosted vendor, while the app still owns streaming, tool execution, key handling, and serverless/client proxy boundaries.
- `Current state`: **Complete, v1 scope** — `src/ai/providers/openRouterAdapter.ts` is a client-direct-to-OpenRouter adapter (`fetch` + SSE streaming, `AbortSignal`-cancellable), no proxy/backend. The `ProviderAdapter` interface is designed for future multi-provider extension but ships OpenRouter-only in v1. The API key lives in `localStorage` only, entered via Settings → AI Assistant, with an inline notice documenting the client-direct key model and clarifying that even free-tier models require a free OpenRouter key. `curatedModels.ts` hardcodes a 5-model allowlist across three cost/value tiers for direct manual picks rather than the full OpenRouter catalog — `free` (`poolside/laguna-xs-2.1:free`, rate-limited), `low-cost` (`z-ai/glm-5.2`, `moonshotai/kimi-k2-thinking` — cheap models benchmarking close to frontier quality), and `good` (`openai/gpt-5.4`, `anthropic/claude-sonnet-5` — top-of-market frontier options). The Settings picker defaults to `Free` and pins an `Automatic` group above manual tier picks: `Free` sends OpenRouter's `openrouter/free` router, `Floor` sends `openrouter/auto` with the Auto Router cost/quality tradeoff set to the lowest-cost preference, and `Auto` sends `openrouter/auto` with OpenRouter's default prompt-based routing. Settings also ships a custom OpenRouter model-id field, an opt-in prompt-caching switch that marks only the system prompt with `cache_control`, and a direct `https://openrouter.ai/keys` help link.
- `Next move`: A local/Ollama-compatible bridge and a serverless key proxy remain deliberately deferred (see `RI-13`'s scope-cut note) — revisit only if the app starts handling a shared/app-owned key or other users' documents.

##### Text phase 2.0: on-stage editing

- `Type`: `Feature`
- `Owner lane`: `Shared`
- `Status`: `In progress`
- `Source`: `RI-34`
- `Dependencies`: Phase 1.8 (closed as of d5b4f66)
- `Why it matters`: On-stage text editing is the next step toward a real authoring environment. Phase 1 established the canonical text model and rich text stability; phase 2 brings direct manipulation to the stage.
- `Current state`: Phase 2.0 is in progress. P2-A standalone block text editing, P2-B standalone code editing, P2-C standalone list editing, and P2-D granular rich-to-simple split conversion are implemented/completed in the phase tasklist. Stable stage E2E and rich-text authoring E2E are split so the release gate stays clean while `pnpm run test:e2e:richtext` carries the high-risk Slate/toolbar/list regression package. Four rich authoring cases are quarantined as `richTextTodo`: mouse selection, multi-block block-type conversion, toolbar font-size persistence, and rich-list Enter behavior. Remaining work is deterministic rich-text E2E selection hooks, P2-C's carried-forward per-item direction and standalone list-linking UI, P2-E description lists in rich editing, and P2-F the unified all-text stage editing shell.
- `Scope (P2-A through P2-F)`:
  - P2-A: On-stage editing for standalone block text - done
  - P2-B: On-stage editing for standalone code blocks - done
  - P2-C: On-stage editing for standalone lists - completed; per-item direction UI and standalone list-linking UI remain as follow-ups
  - P2-D: Granular rich-to-simple split conversion - done
  - P2-E: Description lists in rich editing - planned
  - P2-F: Unified all-text stage editing shell - planned
- `Next move`: Stabilize the isolated rich-text E2E package with deterministic selection/readiness hooks, close the P2-C list UI follow-ups, then begin P2-E description-list authoring.

#### Refactor

##### Unified node type discriminator model

- `Type`: `Refactor`
- `Owner lane`: `Shared`
- `Status`: `In progress`
- `Source`: `RI-32`
- `Dependencies`: `RI-11`, `RI-28`
- `Why it matters`: As text, media, and container node families grow, each needs interchangeable subtypes (single-block vs rich text, image vs video vs inline SVG, container vs display-contents group). A shared type discriminator pattern lets the renderer pick the right component per node and lets the editor switch types by changing one property, with shared data (position, size, styles) transferring automatically.
- `Current state`: **Task 1 (model migration) complete** — `ContainerNode`/`TextNode`/`MediaNode` with `contentType`/`subtype` discriminators are the canonical types; all deprecated aliases and shims removed. `migrateDocumentModel` is wired into the document import paths (`parseDocumentJson` in `src/api/documentApi/basic.ts` and `parseImportedDocumentJson` in `src/editor/editorPersistenceState.ts`), so legacy `type`/`role` documents remain importable; its idempotency bug for already-migrated block/code/list text content is fixed. Tasks 2-3 (slate-subset rich text model, on-stage rich text editor) pending. See also `RI-34` for the related text phase 2.0 work.
- `Next move`: Task 2 — define the slate-subset rich text model for `TextNode` with `subtype: 'rich'`, then Task 3 — on-stage rich text editing.

##### Base UI primitive token migration

- `Type`: `Refactor`
- `Owner lane`: `LLM`
- `Status`: `Done`
- `Source`: `RI-35`
- `Why it matters`: Six base UI primitives use hardcoded Tailwind slate classes despite existing CSS tokens in `variables.css`, breaking light/dark theme parity.
- `Current state`: **Complete** — `--editor-dialog-overlay-background` token added to `variables.css` (light + dark). All six components migrated: `switch.tsx`, `slider.tsx`, `select.tsx`, `input.tsx`, `textarea.tsx`, `dialog.tsx`.

##### Dark tooltip deduplication

- `Type`: `Refactor`
- `Owner lane`: `LLM`
- `Status`: `Done`
- `Source`: `RI-36`
- `Why it matters`: The identical dark tooltip class string (`rounded-md border-slate-800 bg-slate-900 px-2 py-1 text-center text-[11px] text-white`) is duplicated 15 times across 8 files, making it fragile and inconsistent to update.
- `Current state`: **Complete** — `DARK_TOOLTIP_CLASS` constant extracted to `src/lib/utils` and all 15 occurrences replaced. See also `RI-38` current state.
- `Delivered sha`: 9f8f232

##### Interaction pattern unification

- `Type`: `Refactor`
- `Owner lane`: `Shared`
- `Status`: `In progress`
- `Source`: `RI-38`
- `Why it matters`: Escape key handling (6+ implementations), click-outside detection (3+ patterns), pointer drag tracking (3+ implementations), and popover positioning (4+ implementations) are each reimplemented ad-hoc in every consumer. This makes behavior inconsistent and requires re-explaining expected behavior for each new panel, dropdown, or dialog.
- `Current state`: `useEscapeKey` and `useClickOutside` hooks extracted to `src/lib/` and migrated to 4 consumers (FontControls, ValueWithUnit, TopLevelWrapperVisibilityControl, SearchableSelect). `DARK_TOOLTIP_CLASS` constant extracted and deduplicated across 15 occurrences in 8 files. Popover positioning and pointer drag hooks assessed and deferred — the positioning strategies are fundamentally different per component (tooltip side-based, select viewport-smart, menu fixed-offset) making a shared abstraction a poor fit.
- `Next move`: Evaluate whether new composite components (`DismissablePopover`, `DraggablePanel`) are worth building as more interactive panels are added. For now the hooks cover the most common duplication.

##### Centralized panel request adapter

- `Type`: `Refactor`
- `Owner lane`: `LLM`
- `Status`: `Not started`
- `Source`: `RI-50`
- `Why it matters`: `useShowcaseTourController` re-implements the panel request switch directly against nine React setters while `applyEditorPanelRequest` in `src/api/editorNavigationApi/panelState.ts` implements the same semantics purely. The two have already drifted: the pure helper's `toggle` supports `ai`, but the tour controller's copy falls through to manage fonts, so a tour step toggling the AI panel would toggle Manage Fonts instead.
- `Current state`: Duplicated switch in `src/app/showcaseTour/useShowcaseTourController.ts` (`applyPanelRequest`) with the latent `ai` toggle bug; the pure helper is correct.
- `Next move`: Build one shared adapter that runs `applyEditorPanelRequest` and diffs the resulting `EditorPanelState` onto the app's React setters; migrate the tour controller to it, removing the duplicated switch and fixing the toggle drift. Decided in the showcase tour review follow-up (2026-07-04).

#### Infra

None yet.

#### Research

##### Parent expansion height unit policy

- `Type`: `Research`
- `Owner lane`: `Shared`
- `Status`: `Not started`
- `Source`: `RI-44`
- `Dependencies`: `RI-42`
- `Why it matters`: Parent expansion is now an API-level effect used by drag/drop and keyboard nudging, so height-unit behavior must be deterministic and explainable. Silently converting authored units such as `%`, `vh`, `vmin`, `vmax`, or `aspect-ratio(...)` into pixels can surprise authors and break responsive or ratio-based intent.
- `Current state`: `px` parents can expand, and authored `auto` parent height is preserved. Other non-px height modes still need an explicit policy.
- `Recommendation to evaluate`: Current engineering recommendation is: keep `px` expansion as-is; preserve `auto`; do not auto-expand `aspect-ratio(...)` because writing a pixel height destroys the ratio contract; do not silently convert `%`, `vh`, `vmin`, or `vmax` to px. Prefer either no-op expansion for those units or an explicit API result/policy that tells the caller expansion was not applied.
- `Alternative approaches`: This does not have to be solved only by no-op expansion. Evaluate whether `min-height` / `max-height`, an authored overflow policy, a parent auto-sizing mode, or another explicit model field would better preserve user intent while still allowing drag/drop and keyboard movement to feel predictable.
- `Next move`: Decide the canonical document/API contract first, then update editor behavior, renderer parity, docs, and tests around that contract.

### Priority: Low

#### Bug

None yet.

#### UX

#### Feature

##### Export surface expansion

- `Type`: `Feature`
- `Owner lane`: `Shared`
- `Status`: `Partially present`
- `Source`: `RI-14`
- `Why it matters`: Export format breadth determines where the playground can be used and how reusable the model becomes.
- `Current state`: JSON import/export and static rendered-site export already exist; React app, Electron, PDF, image, and presentation exports do not.
- `Next move`: Rank target exports by strategic value and by how much shared render logic they can reuse.

##### Rich text component with inline styling, preferably MD-backed

- `Type`: `Feature`
- `Owner lane`: `Shared`
- `Status`: `Done`
- `Source`: `RI-28`
- `Why it matters`: A richer text surface can unlock more realistic content authoring without forcing authors to decompose every text pattern into many separate nodes.
- `Current state`: **Complete** — Slate-based rich text editor built through phases 1.x–1.8. Supports inline styling, semantic tags, code blocks, lists, links, markdown import, and a draggable on-stage toolbar. The canonical `TextNode` with `subtype: 'rich'` and the Slate-subset content model are in place. Phase 2.0 (on-stage editing for block text, lists, code) continues as `RI-34`.
- `Delivered sha`: d5b4f66 (phase 1.8 closeout)

#### Platform

##### User management

- `Type`: `Platform`
- `Owner lane`: `Human`
- `Status`: `Not started`
- `Source`: `RI-16`
- `Why it matters`: Identity and account boundaries are foundational if the tool grows beyond a local playground.
- `Current state`: The current project behaves like a local editor, not a multi-user product.
- `Next review question`: Does this belong to the playground roadmap now, or only once hosted product goals become real?

##### Project management

- `Type`: `Platform`
- `Owner lane`: `Human`
- `Status`: `Not started`
- `Source`: `RI-18`
- `Why it matters`: Project-level concepts become necessary once the tool manages more than one document or publication target.
- `Current state`: The current scope is document-centric.
- `Next review question`: What is the smallest project concept that would actually add value here?

##### Assets management

- `Type`: `Platform`
- `Owner lane`: `Human`
- `Status`: `Not started`
- `Source`: `RI-19`
- `Why it matters`: Assets become a first-class concern once the editor supports richer media and import/export workflows.
- `Current state`: There is no dedicated asset-management subsystem today.
- `Next move`: Revisit alongside video/SVG support and external import needs.

##### CMS

- `Type`: `Platform`
- `Owner lane`: `Human`
- `Status`: `Not started`
- `Source`: `RI-20`
- `Why it matters`: CMS support changes how content is modeled, previewed, exported, and potentially hosted.
- `Current state`: The document is currently fully authored in-editor rather than bound to live content collections.
- `Next review question`: Is native CMS a goal, or is connector-based external CMS support enough?

##### Project versioning system

- `Type`: `Platform`
- `Owner lane`: `Shared`
- `Status`: `Done`
- `Source`: `RI-30`
- `Why it matters`: Versioning creates safer iteration, clearer milestone management, and a path to communicate compatibility clearly — to users importing documents, to future contributors, and in the About page.
- `Current state`: **Complete** — Four independent semver versions (`PROJECT_VERSION`, `DOCUMENT_MODEL_VERSION`, `API_VERSION`, `EDITOR_VERSION`) defined in `src/lib/version.ts`. Pre-commit hook auto-bumps all four at patch level on every commit. `scripts/bump-version.mjs` handles manual minor/major bumps. `schemaVersion` stamped on document export; mismatch warning on import. Versions displayed in the About panel. `CHANGELOG.md` seeded with 15 milestones. `/version-bump` skill documents the workflow.

##### Migrate persistence to IndexedDB

- `Type`: `Platform`
- `Owner lane`: `Shared`
- `Status`: `Not started`
- `Source`: `RI-31`
- `Dependencies`: `RI-07`
- `Why it matters`: localStorage has a hard ~5MB limit per origin. As the model grows with multiple pages, shared components, animations, and richer node trees, this ceiling becomes a real constraint with no graceful failure — it throws a quota error and stops saving.
- `Current state`: All editor state is stored in localStorage. This is sufficient for single-page sites with URL-referenced media, but not a long-term solution. IndexedDB offers the same browser-local, no-server model with storage limits of 50MB+ and a path to storing larger blobs if needed.
- `Next move`: Add a storage size warning in the editor when the model approaches the localStorage limit. Plan the IndexedDB migration as a discrete platform task once multi-page sites make the constraint real. Migration is straightforward — same model, different persistence backend.

#### Refactor

##### Document view API and architecture boundary enforcement

- `Type`: `Refactor`
- `Owner lane`: `LLM`
- `Status`: `Done`
- `Source`: `RI-41`
- `Why it matters`: Panels and controls were reading directly from editor state rather than through the API layer, violating the architecture boundary and making UI code hard to replace or test independently.
- `Current state`: **Complete** — `src/api/documentViewApi.ts` introduced as the single read surface for all UI model queries. All 47 affected panel and inspector files migrated to read through this layer. `scripts/check-architecture.mjs` added to enforce the boundary at CI time. Delivered sha: 10b8d75.

##### Wave F CSS cleanup

- `Type`: `Refactor`
- `Owner lane`: `LLM`
- `Status`: `Done`
- `Source`: `RI-37`
- `Why it matters`: After the design-system convergence audit (Waves A-E, now archived), superseded CSS remains in the codebase.
- `Current state`: **Complete** — `.editor-inline-field-trigger-static` rule and its 4 `:is()` selector references deleted from `editor-chrome.css`. Note: `.editor-inline-field-invalid` was confirmed live (used in `SizeFields.tsx`) and retained. Structural relocation of `.editor-template-*` / `.editor-insert-*` to component-local CSS is deferred as a separate judgment call.

#### Infra

None yet.

#### Research

None yet.

### Priority: Optional

#### Bug

None yet.

#### UX

None yet.

#### Feature

##### View transitions between pages and beyond

- `Type`: `Feature`
- `Owner lane`: `Human`
- `Status`: `Not started`
- `Source`: `RI-08`
- `Why it matters`: Transition systems can become a major part of site feel, especially if the product expands past one page.
- `Current state`: No view-transition system is currently documented.
- `Next move`: Revisit after the first multi-page decision, while keeping room for same-page/state transitions too.

##### Import from external sources

- `Type`: `Feature`
- `Owner lane`: `Shared`
- `Status`: `Not started`
- `Source`: `RI-15`
- `Why it matters`: Import can accelerate adoption and create a bridge from existing content/design sources into the editor.
- `Current state`: Import currently focuses on the project’s own document JSON format.
- `Next review question`: Which source matters first: HTML, image-to-structure, or Figma/MCP-assisted intake?

##### Interact custom effects support

- `Type`: `Feature`
- `Owner lane`: `Shared`
- `Status`: `Needs audit`
- `Source`: `RI-26`
- `Dependencies`: `RI-02`, `RI-03`, `RI-04`, `RI-05`, `RI-06`
- `Why it matters`: Custom effects could close the gap between built-in presets and advanced animation needs.
- `Current state`: The project already supports named motion presets plus custom keyframe effects and uses `@wix/interact` for runtime wiring, but “custom effects” needs a sharper product definition.
- `Next review question`: Is this asking for richer authoring of existing keyframes, deeper Interact surface exposure, or something else?

#### Platform

##### Collaboration

- `Type`: `Platform`
- `Owner lane`: `Human`
- `Status`: `Not started`
- `Source`: `RI-17`
- `Why it matters`: Collaboration changes document ownership, state consistency, editing flows, and product positioning.
- `Current state`: No collaboration model is present in the current editor.
- `Next move`: Keep this visible, but revisit only after document/page/project boundaries are clearer.

##### Connect to external CMS

- `Type`: `Platform`
- `Owner lane`: `Human`
- `Status`: `Not started`
- `Source`: `RI-21`
- `Why it matters`: External CMS connectivity may be a faster route to real content workflows than building a full native CMS.
- `Current state`: No external CMS connector layer is present.
- `Next move`: Evaluate whether WordPress is a real first target or just a placeholder example.

##### Connect to Wix services

- `Type`: `Platform`
- `Owner lane`: `Human`
- `Status`: `Not started`
- `Source`: `RI-22`
- `Why it matters`: Service integration could align the playground with a larger ecosystem and give clearer product leverage.
- `Current state`: Current Wix-related surface is mostly animation/runtime dependency usage, not service connectivity.
- `Next review question`: Which Wix services would meaningfully improve authoring or publishing first?

#### Refactor

None yet.

#### Infra

None yet.

#### Research

##### Arbitrary code support for components

- `Type`: `Research`
- `Owner lane`: `Human`
- `Status`: `Not started`
- `Source`: `RI-23`
- `Why it matters`: Arbitrary code support can unlock power-user extensibility, but it has major security, portability, and editor-boundary implications.
- `Current state`: The current architecture is API-first and model-driven; arbitrary component code is outside the present contract.
- `Next review question`: Is this a strategic capability or a pressure valve for missing built-in components?

##### Arbitrary CSS support for components

- `Type`: `Research`
- `Owner lane`: `Human`
- `Status`: `Not started`
- `Source`: `RI-24`
- `Why it matters`: Arbitrary CSS could unlock fast experimentation, but it may weaken editor predictability and renderer parity.
- `Current state`: Styling is currently modeled and exported through the existing node/style system rather than freeform CSS injection.
- `Next review question`: Should arbitrary CSS exist at all, and if so at what scope: component, page, or project?

## Completed Milestones

These milestones are closed. Their briefs and tasklists are archived in `archive/`.

| Milestone | Completed | Summary |
| --- | --- | --- |
| Text Phase 1.5 | 2026-03 | Rich block structure APIs, GFM import/export, code language completion |
| Text Phase 1.7 | 2026-03 | Canonical `TextDocumentContent` model, normalized storage, canonical APIs. All text nodes persist one canonical wrapper. |
| Text Phase 1.8 | 2026-04 | Rich-stage editing stabilization. Closed at d5b4f66. |
| Google Fonts integration | 2026-03 | Catalog bundled, API layer, inspector UI, export. Phases 1-4 complete. |
| Animate API enhancements | 2026-03 | Interact/motion-presets integration, all defects fixed. |
| Multiple pages Wave 1-2 | 2026-04 | Page model, hierarchy, editor UI, preview mode, export with configurable output structure. |
| Help browser IA refresh | 2026-04 | Internal markdown links kept as the docs primitive; left nav regrouped into `About`, `Keyboard shortcuts`, `Guides`, `Reference`, `Developers`; `Usage` replaced by `Guides / Getting Started`; About now links into the docs surface. Closed at 1e1f49f. |
| Design-system convergence audit | 2026-04 | Waves A-E complete (29 surfaces audited, 24 done). Follow-ups tracked in `RI-35`-`RI-38`. |
| Hidden ghost mode (`RI-39`) | 2026-04 | Hidden nodes render as ghosts on stage; selection, inspector, and export semantics updated. Closed at 1318f22. |

## Implementation Pre-Plan

This section is where roadmap ideas from different priority/type buckets can be combined into plausible implementation workstreams.

It is still pre-planning, not a final technical implementation spec. The goal is to identify coherent delivery slices that cut across the roadmap without losing the original roadmap structure.

### Pre-Plan 01: Unified text system evolution

- `Related roadmap items`: `RI-11`, `RI-12A`, `RI-12B`, `RI-28`
- `May expand later`: `RI-20`
- `Intent`: Evolve text-related components into a more coherent system where simple text, links, richer text, and semantic grouping are related rather than isolated point features.
- `Working idea`: Keep the current single-style text component as the simple baseline. Let the link component derive from that model rather than feeling like completely separate logic. Add a richer text component that supports inline styling, preferably with markdown behind the scenes.
- `UI relationship`: The simple text component and the rich text component should be interchangeable in the editor UI rather than living as unrelated insertables.
- `Conversion behaviors`:
  - Selecting two text elements can combine them into one rich text component.
  - A rich text component can be demoted into a single-style text component.
  - A rich text component can be split into multiple single-style text components when needed.
- `Link behavior direction`: Link logic should become part of these text-capable components rather than a separate isolated logic path, while still being exposable as a top-level component that can later change roles.
- `Semantic direction`: Semantic wrappers/grouping should stay compatible with this system so constructs like menus, asides, articles, and future content groupings can shape the semantics and UX of text-heavy content rather than being tacked on afterward.
- `Why this pre-plan matters`: This could reduce duplication across text, link, rich text, and semantic content work while creating a more coherent authoring model before CMS/content-model work arrives.
- `Open questions`:
  - What is the canonical content model behind simple text, linked text, and rich text?
  - Which transformations should be lossless, and which are allowed to be lossy but useful?
  - How much markdown should be exposed directly versus used only as an internal representation?
  - At what point should CMS/content binding requirements start shaping this model?

## Cross-Cutting Themes

These are not standalone projects. They are lenses that should be revisited across roadmap items.

### Accessibility

- Animation work should always be reviewed with reduced motion, focus behavior, and semantic export in mind.
- Responsive/adaptive work should include accessibility-related media queries, not only layout breakpoints.

### API-First Coverage

- New capabilities should still be expressible through the document/API layers, not only through editor UI.
- Import/export, animation authoring, and future multi-page features should respect the existing architecture boundary between model, API, editor state, stage renderer, and site renderer.

### Editor and Site Parity

- The editor should preview enough truth to be trustworthy without overfitting to editor-only chrome.
- Export growth should prefer reuse of shared render/model semantics whenever possible.

### Human and LLM Suitability

- `LLM` is a good fit for bounded editor UI, docs, refactors, and audit tasks.
- `Human` is a better fit for product direction, trust boundaries, ecosystem decisions, and ambiguous cross-cutting platform bets.
- `Shared` is a good fit when a product decision and an implementation probe need to move together.

## Review Cadence

Use this document as a rolling working artifact:

- During idea capture: append to `Raw intake`.
- During roadmap review: move or map ideas into `Structured roadmap`.
- During implementation planning: update `Status`, `Owner lane`, and `Current state`.
- During milestone cleanup: merge or retire items only when it is clear that information will not be lost.
