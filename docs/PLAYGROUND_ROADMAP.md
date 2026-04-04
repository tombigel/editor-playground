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

| Raw intake id | Short name | Priority | Type | Status | Owner lane | Notes / dependencies |
| --- | --- | --- | --- | --- | --- | --- |
| `RI-01` | [Animation undo coverage](#animation-undo-coverage) | `🔴 Next` | Bug | `🟤 Needs audit` | Shared | Dep: `RI-05` |
| `RI-02` | [On-stage animation indicator](#on-stage-animation-indicator) | `🔴 Next` | UX | `⚪ Not started` | LLM | Note: standalone or can land as part of `RI-03`/`RI-04`/`RI-05` |
| `RI-03` | [Animation presets UI for development phase](#animation-authoring-ui-for-development-phase) | `🔴 Next` | UX | `🟣 Partially present` | LLM | Simple on/off animated-state indicator implemented |
| `RI-04` | [Animation keyframes UI for development phase](#animation-authoring-ui-for-development-phase) | `🔴 Next` | UX | `⚪ Not started` | LLM | - |
| `RI-05` | [Designed animation UI with product/UX intent](#animation-authoring-ui-with-real-productux-design) | `🔴 Next` | UX | `⚪ Not started` | Human | Dep: `RI-03`, `RI-04` |
| `RI-06` | [Animation + sticky UI, behaviors, a11y](#animation--sticky-ux-behaviors-and-a11y) | `🔴 Next` | UX | `🟣 Partially present` | Shared | Dep: `RI-05` |
| `RI-29` | [Sticky indicators: motion-aware, interactive, and sideline-capable](#sticky-indicators-motion-aware-interactive-and-sideline-capable) | `🔴 Next` | UX | `⚪ Not started` | Shared | Dep: `RI-06` |
| `RI-07` | [Multiple pages / MPA approach](#multiple-pages--mpa-approach) | `🟠 High` | Feature | `🟣 Partially present` | Shared | Wave 1-2: page model, editor UI, preview mode, export |
| `RI-33` | [Copy/paste and duplication across page structure](#copypaste-and-duplication-across-page-structure) | `🟠 High` | Feature | `⚪ Not started` | Shared | Dep: `RI-07` |
| `RI-11` | [More components: SVG, video, gradients](#more-components-svg-video-gradients) | `🔴 Next` | Feature | `⚪ Not started` | Shared | - |
| `RI-12A` | [More semantic components](#more-semantic-components) | `🔴 Next` | Feature | `🟣 Partially present` | Shared | - |
| `RI-12B` | [Semantic wrappers and grouping](#semantic-wrappers-and-grouping) | `🔴 Next` | UX | `🟣 Partially present` | Shared | - |
| `RI-09` | [Responsive and adaptive authoring model](#responsive-and-adaptive-authoring-model) | `🟠 High` | Feature | `🟣 Partially present` | Shared | - |
| `RI-10` | [Editor stage responsive behavior](#editor-stage-responsive-behavior) | `🟠 High` | Feature | `🟤 Needs audit` | Shared | Dep: `RI-09` |
| `RI-25` | [Performance optimization program](#performance-optimization-program) | `🟠 High` | Platform | `🟢 In progress` | Shared | - |
| `RI-27` | [Variable fonts as an authoring workflow](#variable-fonts-as-an-authoring-workflow) | `🟠 High` | UX | `🟣 Partially present` | Shared | - |
| `RI-13` | [AI integration for site building, animations, skills, MCPs](#ai-integration-for-site-building-animations-skills-and-mcps) | `🔵 Low` | Feature | `⚪ Not started` | Human | - |
| `RI-14` | [Export surface expansion](#export-surface-expansion) | `🔵 Low` | Feature | `🟣 Partially present` | Shared | - |
| `RI-16` | [User management](#user-management) | `🔵 Low` | Platform | `⚪ Not started` | Human | - |
| `RI-18` | [Project management](#project-management) | `🔵 Low` | Platform | `⚪ Not started` | Human | - |
| `RI-19` | [Assets management](#assets-management) | `🔵 Low` | Platform | `⚪ Not started` | Human | - |
| `RI-20` | [CMS](#cms) | `🔵 Low` | Platform | `⚪ Not started` | Human | - |
| `RI-28` | [Rich text component with inline styling](#rich-text-component-with-inline-styling-preferably-md-backed) | `🔵 Low` | Feature | `⚪ Not started` | Shared | - |
| `RI-30` | [Project versioning system](#project-versioning-system) | `🔵 Low` | Platform | `⚪ Not started` | Shared | - |
| `RI-31` | [Migrate persistence to IndexedDB](#migrate-persistence-to-indexeddb) | `🔵 Low` | Platform | `⚪ Not started` | Shared | Dep: `RI-07` |
| `RI-32` | [Unified node type discriminator model](#unified-node-type-discriminator-model) | `🔴 Next` | Refactor | `⚪ Not started` | Shared | Dep: `RI-11`, `RI-28` |
| `RI-08` | [View transitions between pages and beyond](#view-transitions-between-pages-and-beyond) | `⚪ Optional` | Feature | `⚪ Not started` | Human | - |
| `RI-15` | [Import from external sources](#import-from-external-sources) | `⚪ Optional` | Feature | `⚪ Not started` | Shared | - |
| `RI-17` | [Collaboration](#collaboration) | `⚪ Optional` | Platform | `⚪ Not started` | Human | - |
| `RI-21` | [Connect to external CMS](#connect-to-external-cms) | `⚪ Optional` | Platform | `⚪ Not started` | Human | - |
| `RI-22` | [Connect to Wix services](#connect-to-wix-services) | `⚪ Optional` | Platform | `⚪ Not started` | Human | - |
| `RI-23` | [Arbitrary code support for components](#arbitrary-code-support-for-components) | `⚪ Optional` | Research | `⚪ Not started` | Human | - |
| `RI-24` | [Arbitrary CSS support for components](#arbitrary-css-support-for-components) | `⚪ Optional` | Research | `⚪ Not started` | Human | - |
| `RI-26` | [Interact custom effects support](#interact-custom-effects-support) | `⚪ Optional` | Feature | `🟤 Needs audit` | Shared | Dep: `RI-02`, `RI-03`, `RI-04`, `RI-05`, `RI-06` |

## Active Stage

**Authoring Foundation** — moves the playground from a sticky/animation prototype to a real authoring environment across three workstreams: animation controls and on-stage feedback, multi-page navigation, and a richer component and semantic model.

Extended product vision, feature requests, UX ideas, and open questions for this stage live in [NEXT_STAGE_BRIEF.md](./NEXT_STAGE_BRIEF.md).

Roadmap items in scope: `RI-01`, `RI-02`, `RI-03`, `RI-04`, `RI-05`, `RI-06`, `RI-07`, `RI-11`, `RI-12A`, `RI-12B`, `RI-29`, `RI-32`

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
- `Status`: `Needs audit`
- `Source`: `RI-01`
- `Dependencies`: `RI-05`
- `Why it matters`: If animation authoring actions do not create reliable undo entries, the editing workflow will feel unsafe and inconsistent with the rest of the editor.
- `Current state`: The app has document undo/redo and animation APIs, but this item now depends on the designed animation UI because the real risk is missing history coverage in user-facing authoring flows rather than raw data mutations alone.
- `Next review question`: Once `RI-05` lands, which animation interactions create correct undo/redo history entries, and which editor-facing flows still bypass or fragment history?

#### UX

##### On-stage animation indicator

- `Type`: `UX`
- `Owner lane`: `LLM`
- `Status`: `Not started`
- `Source`: `RI-02`
- `Relationship`: Standalone task, or it can land as part of `RI-03`, `RI-04`, or `RI-05`.
- `Why it matters`: A functional animation authoring flow needs visible stage feedback, especially if sticky already has clear stage indicators.
- `Current state`: Sticky preview and guides are well defined in the stage; animation preview exists globally, but an equivalent node-level on-stage indicator is not documented.
- `Next move`: Decide whether the first indicator is a badge, outline, trigger hint, or a richer overlay model.

##### Animation authoring UI for development phase

- `Type`: `UX`
- `Owner lane`: `LLM`
- `Status`: `Partially present`
- `Source`: `RI-03`, `RI-04`
- `Why it matters`: The animation subsystem needs a functional authoring surface that is good enough for development, testing, and iteration before the designed product UI is ready.
- `Current state`: The animation model, preview runtime, and console API exist, and the editor now has a simple on/off indicator showing when a node is animated. Preset and keyframe authoring UI are still not documented.
- `Next move`: Extend the current basic indicator into a minimal development authoring surface for preset selection, keyframe editing, and state inspection without over-investing in final UX.

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

##### Variable fonts as an authoring workflow

- `Type`: `UX`
- `Owner lane`: `Shared`
- `Status`: `Partially present`
- `Source`: `RI-27`
- `Why it matters`: Variable fonts affect typography quality, performance, expressive control, and future responsive typography behavior.
- `Current state`: Font metadata and stylesheet generation already carry variable-font concepts, and the spec notes variable fonts are hidden by default while static-font flows are being debugged.
- `Next move`: Decide whether the first milestone is simply exposing supported variable families, or also exposing axis-aware controls.

#### Feature

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
- `Status`: `Partially present`
- `Source`: `RI-07`
- `Why it matters`: Multi-page support changes the document model, navigation semantics, export shape, and future product scope.
- `Current state`: **Wave 1-2 complete**: Page model with hierarchy, slug management, aliases, and uniqueness checks during new-page creation. Editor page switching via four UI entry points. Page linking with internal anchor support. Export with `outputStructure` selection (directory vs. flat). Preview mode with navigation. Missing: copy/paste, full page templates, and the planned link-validation workflow.
- `Implemented features`: Page model with displayName, slug, sectionIds, slugAliases, parentPageId. Page hierarchy validation (cycle detection). URL resolution with nested paths. Editor UI (pages tab in layers, dedicated panel, inspector no-selection, topbar dropdown). New-page auto-increment for duplicate names/slugs with alias-aware slug collision handling. Follow-link popup for page navigation. Preview mode (`?mode=preview`). Multi-page export with configurable output structure. Route manifest building.
- `Next review question`: Are the deferred features (copy/paste, page templates) blocking real-world authoring workflows, or can they land in a follow-up wave?

##### Copy/paste and duplication across page structure

- `Type`: `Feature`
- `Owner lane`: `Shared`
- `Status`: `Not started`
- `Source`: `RI-33`
- `Dependencies`: `RI-07`
- `Why it matters`: Once the editor supports more than one page, authors need reusable editing workflows for moving or cloning content without rebuilding it manually. Copy/paste of components and sections, cross-page paste targets, and duplicate-page actions are part of the baseline trust model for authoring at page/site scope.
- `Current state`: The roadmap identifies multi-page support as a core workstream, but there is no explicit task yet for clipboard-style editing flows across page boundaries or for whole-page duplication semantics.
- `Next move`: Define the first supported transfer units and behaviors: single component, subtree/section, same-page paste, cross-page paste, and duplicate page. Clarify whether these flows are backed by an internal clipboard model, browser clipboard integration, or both, and how IDs, links, selection, and history behave after duplication.

##### More components: SVG, video, gradients

- `Type`: `Feature`
- `Owner lane`: `Shared`
- `Status`: `Not started`
- `Source`: `RI-11`
- `Why it matters`: Richer components widen the playground from a sticky/layout lab into a broader authoring environment.
- `Current state`: The current core leaf set is text, image, link, and button.
- `Next move`: Rank candidate components by model complexity and export/site value rather than by visual novelty alone.

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

#### Platform

##### Performance optimization program

- `Type`: `Platform`
- `Owner lane`: `Shared`
- `Status`: `In progress`
- `Source`: `RI-25`
- `Why it matters`: Performance becomes a hard constraint as animation, responsiveness, assets, collaboration, and multi-page work expand the editor.
- `Current state`: The spec already contains some performance-minded decisions, but performance should be treated as a recurring maintenance track rather than a one-time pass.
- `Next move`: Re-run focused perf audits every once in a while, especially after large project advancements, covering stage rendering, history pressure, export cost, and animation/runtime overhead.

#### Refactor

##### Unified node type discriminator model

- `Type`: `Refactor`
- `Owner lane`: `Shared`
- `Status`: `Not started`
- `Source`: `RI-32`
- `Dependencies`: `RI-11`, `RI-28`
- `Why it matters`: As text, media, and container node families grow, each needs interchangeable subtypes (single-block vs rich text, image vs video vs inline SVG, container vs display-contents group). A shared type discriminator pattern lets the renderer pick the right component per node and lets the editor switch types by changing one property, with shared data (position, size, styles) transferring automatically.
- `Current state`: Nodes currently use a `NodeType` (`wrapper` | `leaf`) and a role string. There is no discriminated subtype model within a family, so interchangeability requires ad-hoc logic.
- `Next move`: Define the discriminator model for the media family first (image/video/SVG/embed) as it has the clearest interchangeability need, then apply the same pattern to text (single-block/rich-text) and container (container/display-contents group). Keep backward compatibility with existing role strings during migration.

#### Infra

None yet.

#### Research

None yet.

### Priority: Low

#### Bug
None yet.

#### UX

#### Feature

##### AI integration for site building, animations, skills, and MCPs

- `Type`: `Feature`
- `Owner lane`: `Human`
- `Status`: `Not started`
- `Source`: `RI-13`
- `Why it matters`: AI-assisted generation and tooling could accelerate both site authoring and internal iteration velocity.
- `Current state`: There is no productized AI layer in the current editor flow.
- `Next review question`: Which role comes first: generation, transformation, animation help, or operator tooling?

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
- `Status`: `Not started`
- `Source`: `RI-28`
- `Why it matters`: A richer text surface can unlock more realistic content authoring without forcing authors to decompose every text pattern into many separate nodes.
- `Current state`: The current text model supports text content, semantic tags, and typography/design controls, but not a richer inline-styled text authoring surface.
- `Next review question`: Should the first version optimize for markdown-backed authoring, rich inline editing UX, or a model that can support both? if we want fonts we need html support, md is simple but doesn't cover all the bases.

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
- `Status`: `Not started`
- `Source`: `RI-30`
- `Why it matters`: Versioning creates safer iteration, clearer milestone management, and a path to compare, restore, branch, or publish project states without relying only on local undo history.
- `Current state`: The project has document undo/redo and import/export flows, but there is no project-level version history or named snapshot model described in the roadmap.
- `Next review question`: Should the first versioning milestone be simple named snapshots, linear history, or a richer branch/restore workflow tied to import/export and future collaboration?

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

None yet.

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
