# Next Stage Brief — Authoring Foundation

This is a free-form dump space for product vision, feature requests, UX ideas, and open questions for the three active workstreams of the **Authoring Foundation** stage.

**Authoring Foundation** is the stage that moves the playground from a sticky/animation prototype to a real authoring environment: animation controls and on-stage feedback, multi-page navigation, and a richer component and semantic model.

No cleanup required — write here first, promote to the roadmap or a spec once things crystallize.

Related roadmap items are listed per section. See [PLAYGROUND_ROADMAP.md](./PLAYGROUND_ROADMAP.md) for the structured view.

---

## Animation Integration

_Related: RI-01, RI-02, RI-03, RI-04, RI-05, RI-06, RI-29_

### Product Vision

This editor was built to test interesting directions in integrating the abilities of Interact with and without sticky elements in an editor environment, with different levels of ux and control for different kinds of users.

Setting and editing animations should be easy, the onstage indication of what is happening - what a single component has, what a combined set of elemtns have, what is the timeline of the animations - for both timed animations and scroll driven animations.

The ui is one side of the coin, the other side will be control through ai tools and prompting - for crating layouts ready for animations and with animations applied combined with sticky if needed, applying animations to existing layouts, and adepting and transforming layouts to be sticky and animations-ready.

All this should be done API first - The editor can define product diretions, but all the a bilities are editor independent.

### Feature Requests

* Animations can be applied individually, per group (`display: contents` group node = the answer to "what is a group"), per section, or per page.
* UX exposed in ascending levels of complexity. First stage: section-level group presets (coordinated animation across children, e.g. staggered entrance), individual component presets, sticky integration, multiselect with a single applied animation + stagger. Keyframes and CSS import deferred to later phases.
* On-stage preview and indication should be minimalist but informative — find unique ways to express what a node has, what a set has, and what the timeline looks like for both timed and scroll-driven animations.
* Sticky + scroll timeline duration is a priority: for many scroll-driven combinations, sticky changes the animation from nice to essential. Panel UI for first stage; on-stage editing and timeline miniview deferred.
* Accessibility — see UX Ideas section for the full model. Short version: keyboard triggers on by default, reduced-motion built up per animation role, content guidelines as warnings only.
* **Industry-first goal:** A layout that works without animations (reduced-motion default) and an adapted layout that works with animations, scroll-driven animations, and sticky when motion is enabled — solved through UX, not validation. See UX Ideas for the Route A/B model.
* Interact Web is the first-class runtime. CSS/static export deferred.

### UX Ideas

* **Reduced-motion / two-layout problem — UX-first, not validation:**
  Animations fall into two routes:
  * **Route A** (sprinkle): base layout is static truth. Animations are additive — ongoing motion, parallax, entrance (`from` → set layout). Reduced-motion fallback is automatic: remove animations, base layout holds.
  * **Route B** (layout-coupled): animation requires layout changes to make sense — overflow behavior, sticky structural dependency, or sticky/scroll-driven as interchangeable implementations. The editor should NOT validate or warn. Solve with UX instead.
  Two options for the UX, preference is option 1:
  1. Fold layout changes into the animation UI — only control what was explicitly set through official animation/sticky UI, ignore the rest. Feels like automatic magic.
  2. A dedicated "motion mode" where only layout and animations can be changed (no content edits, no reparenting). More explicit but heavier.

* **Scroll timeline and sticky duration:** vh units only for first stage. On-stage shows calculated px (already implemented for sticky), panel shows vh. Easy to extend later.

* **Multiselect + stagger:** Support selecting multiple components and applying one animation with stagger as an early feature. Check whether Interact already implements stagger natively. Defer the "make any random selection look good automatically" feature.

* **Interact Web as runtime:** First-class. CSS export deferred — get the authoring model right first.

* **Accessibility model — phased approach:**
  **Core principle — three distinct categories with different default behaviors:**
  * **Interaction accessibility (keyboard triggers):** On by default. `allowA11yTriggers: true` is the default — click/hover replaced with activate/interest globally. User can opt out, but the accessible behavior is the starting point.
  * **Content accessibility (flashing, seizure risk, motion guidelines):** Warning + opt-in only. The user's creative intent is the default. The editor surfaces warnings when authored content approaches WCAG thresholds, but never modifies or tones down what the user built without explicit consent.
  * **Reduced-motion:** Built up gradually — defaults will vary per animation role, not a blanket on/off. The right default for a scroll-driven parallax differs from an entrance animation differs from an ongoing loop. Phase 1 starts simple; per-role defaults get refined over time.

  Interact provides the building blocks (see [Interact Accessibility Discussion](./Interact%20Accessibility%20Discussion.md)):
  * **Keyboard support:** `allowA11yTriggers: true` on by default. Focus/keydown activated by default.
  * **Reduced-motion — phase 1:** A site-level "disable all animations under reduced-motion" toggle as the starting control. Per-animation and per-role granular control deferred.
  * **Reduced-motion — later phases:** Per-trigger, per-effect, per-group control. Alternative animation per effect instead of simple disable. Role-aware defaults (scroll-driven, entrance, ongoing loop each get appropriate defaults).
  * **Flashing/seizure risk:** Warn when animations approach the 3-flashes/second threshold (WCAG 2.3.1). Never block or auto-correct — always a warning the user can dismiss.
  * **Content-aware a11y (future AI scope):** AI surfaces suggestions — alternative layouts for scroll-driven galleries, sticky handling, activate-instead-of-autoplay recommendations. Never applied automatically.
  * **WCAG reference:** Pause/stop/hide for auto-moving content >5 seconds (WCAG 2.2.2); no flashing >3/second (WCAG 2.3.1); keyboard-operable (WCAG 2.1.1). These inform warnings, not hard constraints.

* **"Group" definition for animation targeting:** A `display: contents` group node (designed in the More Components workstream) is the answer to "what is a group" for animation purposes. Animations can target a group node and treat its children as a coordinated unit (e.g. stagger). This closes the loop between the grouping model and the animation model.

### Open Questions

* Does Interact Web implement stagger natively? This affects whether multiselect+stagger is a thin editor feature or requires runtime work.
* Which is the better first UX for reduced-motion Route B: fold-into-animation-UI or explicit motion mode? Preference is the former but needs a prototype to validate.

---

## Multiple Pages

_Related: RI-07_

### Product Vision

As a site, a basic requirement is to have multiple pages. We choose to go the MPA path, and support "real" server side routing and static file output for static environments.

### Feature Requests

* MPA routing: static file output for static environments (two shapes: directory-per-route `about/index.html` or flat `about.html`, selectable in export settings), server-side for deployed environments. Export produces a route manifest + server config or setup instructions for common environments.
* Each page has a display name and a URL slug (auto-generated, manually editable, real-time validated).
* Draft/published flag on the site — drives slug redirect defaults and will expand to affect export and future collaboration.
* Page slug changes: internal links auto-fixed when draft (opt-in), aliases preserved by default when published (opt-out). Manual alias management in the pages panel.
* Shared components across pages (header, footer, nav) — one definition in the model, duplicated in static export. Active link states handled via CSS variable + style query at runtime.
* Link validation: warning on component selection (extended to anchors and internal page links); site-level validation on export with auto-validate toggle and manual button. Results as a copyable list with inline editing.
* View transitions: three options — none, cross-fade, slide. `prefers-reduced-motion` defaults to none. Named transitions and custom choreography deferred to phase 2.
* Pages panel based on the layers panel — scroll, reorder, hide. "No element selected" inspector state doubles as page editor (name, slug, aliases, visibility).

### UX Ideas

* **Routing model:** Static routing is solved via SSG-style file output — no hashbang. Two configurable output shapes (set in export settings): **directory** (default) — `about/index.html`, clean URLs work on any static host without extra config; **flat** — `about.html`, simpler output but URL prettification depends on host config. Server-side: editor tracks the desired route structure and export produces a route manifest plus either generated server config or guided instructions for common environments (Nginx, Netlify, Vercel, etc.). No client-side-only MPA routing — that's SPA territory.

* **Page name + slug:** Each page has a display name (title) and a URL slug. Slug is auto-generated from name (slugified) but always manually editable. Both are validated in real-time in the editor UI.

* **Draft/published flag:** Add a `draft | published` flag to site data. Expose it in the settings panel near the export area. Slug alias behavior derives from this state: opt-in redirect fixing when draft, opt-out (aliases preserved by default) when published. Simple to add now, useful immediately.

* **Slug renaming and redirects:** When a slug changes, internal links can be auto-fixed silently. Opt-in/out default derived from draft/published state (see above). A dedicated place in the pages panel to manage slugs and add/remove aliases manually is needed.

* **Shared components — phase 1:** Static shared elements only (header, footer, nav). No template/slot model yet. Active link states handled per-component: link component uses a CSS variable set by the runtime based on current route, with a style query for the active visual variant. The editor just needs to support authoring the active style variant — no page-awareness logic in the editor model. Note: style queries require modern browser support, worth flagging.

* **Link validation — two levels:**
  1. Component level: warning on selection (current behavior, extended to cover internal page links and anchors). No page-panel-level warnings.
  2. Site level: validate on export. An "auto-validate on export" toggle in settings. When off, expose a manual "Validate links" button.
  Validation results: simple list popup with copy-to-clipboard. Where possible, allow inline editing of broken links directly in the panel without context switching.

* **View transitions:** Three initial options — no transition, cross-fade, and slide. If `prefers-reduced-motion` is set, default to no transition without a user override option. Named element transitions and custom choreography deferred to phase 2.

* **"Published" flag (expandable concept):** Introduced for slug redirect defaults, but will likely affect more — export behavior, link validation defaults, future collaboration. Design the flag now, expand its meaning later.

* **Pages panel:** Based on the layers panel as a starting point. Phase 1 assumes simple sites (2–10 pages). Design with scroll, reordering (feeds a future menu component), and hiding in mind. The panel should scale toward tens or hundreds of pages, dynamic pages, hidden pages, protected pages, and popups with external links — but don't over-engineer for those cases now. The "no element selected" state of the inspector panel doubles as a page editor: fields for the current page (name, slug, aliases, visibility, etc.).

### Open Questions

* **Performance across pages — resolved:** HTML shared elements (header, footer) are duplicated per page in the static export only. The model stays DRY. Browser CSS/asset caching handles the performance story for shared stylesheets and media. HTML duplication in the output is acceptable.

* **CSS across pages — resolved:** Single stylesheet for now. Architecture should be ready to split into base CSS + per-page additions when it becomes worth it. No per-page CSS isolation needed at first stage.

* **Routing in the editor preview — resolved:**
  1. On-stage: Google Docs model — clicking a link selects it; an interactive tooltip allows navigating to the target page. No routing inside the stage.
  2. Editor URL space is sacred: the editor's own hash routing (`#/design-system` etc.) must never collide with the authored site's page routing. The site uses static file output (not hash-based routing), so there is no collision risk in the editor — site routing only activates in preview/export mode.
  3. URL-based editor modes: same app, different modes driven by URL parameter (e.g. `?mode=preview`). Preview mode strips editor chrome and renders the site fullscreen — openable in a new tab.
  4. Local dev: a `/preview` route on the local server renders the site with real routing outside editor chrome.
  5. Deployed (`sticky.tombigel.com`): a `preview.html` that loads the current site from localStorage in fullscreen mode. Subdomain option deferred.

* **localStorage limits — resolved:** Sufficient for now (URL-referenced media, reasonable page counts). Known ceiling: ~5MB per origin, hard failure on quota exceeded. Plan: add a storage size warning when approaching the limit. IndexedDB migration tracked as RI-31, triggered when multi-page sites make the constraint real.

---

## More Components

_Related: RI-11, RI-12A, RI-12B_

### Product Vision

Extend the component set with enough base primitives and semantic wrappers to cover most real-world site authoring needs. Composites (menus, cards, galleries) are built from primitives — expose predefined composites first, individual building blocks for advanced use. All node families follow the unified type discriminator model (RI-32) so components within a family are interchangeable.

### Feature Requests

* **Media:** Expand with video, YouTube/embed, and SVG. Each is its own component with its own capabilities, but they share a common model node and are interchangeable by switching type. Linkability is a capability, not a component — image and single-block text support it; video does not.
* **Inline SVG security:** SVG loaded as `<img>` is safe. Switching to inline mode must warn the user and sanitize the SVG (strip scripts and event handlers) before embedding. This is a hard requirement, not optional.
* **Gradients:** A color value, not a media component. Belongs in background/style controls.
* **Text:** Two levels — single block (inline styles, lists) and rich text (multi-block, multi-font, near-free editing). Linkability as a capability on text nodes. Code subtypes (inline code, code block with language + syntax highlighting). See UX Ideas for full text model.
* **Containers:** Flex, grid, and subgrid layout via a layout panel. Grouping with `display: contents` (no layout footprint, promotable to real container).
* **Semantic wrappers:** `aside`, `article`, `main`, `figure` as pure semantic container roles. `address` as a container role. `figcaption` as an auto-assigned or selectable role on a child text node inside a figure.
* **Pages menu:** A dedicated component — auto-populated from site pages, supports arbitrary and anchor links, nesting, split points, full styling, breakpoint fragmentation. Model boundaries need a design pass before implementation.
* **`lang` attribute:** Mandatory on the site node. Inheritable overrides on containers. Advanced opt-in override on individual text nodes.

### UX Ideas

* **Component model — type discriminator pattern:** All node families (text, media, container) should follow a shared model architecture: a node has a `type` discriminator and the renderer picks the right component. This decouples model from rendering and makes interchangeability a first-class model feature rather than a hack. This is a data model task of its own — see RI-32.

* **Text — two levels:**
  * **Single block:** One semantic tag, one font family, but words can carry inline styles (bold, color, size). Lists belong here — a list is still one block with uniform structure. On-stage editing via `contenteditable` is feasible.
  * **Rich text:** Multiple blocks, multiple fonts, multiple links — near-free editing. A "joker" component for content-heavy scenarios. Requires either an external editor framework (ProseMirror, Tiptap, Lexical) or an explicit decision to keep rich text editing off-stage in a panel for phase 1. The external framework route is solid but a significant dependency — rich text becomes an island in an otherwise framework-free model.
  * **Linkability as a capability:** The `link` property should be a capability on any node that supports it (text, image, media), not a separate component type. The existing link component could become a text node with a link property.
  * **Conversion between levels:**
    * Blocks → rich text: lossless or near-lossless. Stack and stitch adjacent nodes.
    * Rich text → blocks (first split): lossless — split at paragraph/block boundaries into smaller rich text chunks. No forced downgrade.
    * Rich text chunk → single block (second conversion): lossy by design. Mixed fonts collapse, inline links may break. Exact degradation behavior is a later product definition.
    * Principle: never force a full downgrade. Sections with too much complexity split into smaller rich text chunks, not plain blocks.

* **Media — separate components, shared model:**
  Each media type (image, video, SVG, embed) is its own component with its own capability surface (video is interactive and not linkable; image is linkable; etc.). But they share a common model node with a `type` discriminator and a `renderMode` property. Interchangeability in the editor means switching the `type` property — position, size, and shared style data transfer automatically; type-specific data that doesn't transfer (e.g. video captions when converting to image) is dropped with a warning.
  * SVG-as-image vs inline-SVG: same node, different `renderMode`. No separate component needed. The editor detects SVG src at authoring time and offers the inline option. SVG sanitization (strip scripts and event handlers) required before inlining.
  * Gradients: a color value, not a media component. Belongs in background/style controls.
  * Future: gif/animated webp → video conversion is server-side and deferred.

* **Container/section — layout abilities:**
  Flex, grid, and subgrid exposed via a layout panel. This is high-value and straightforward.
  * **Grouping with `display: contents`:** A lightweight selection group with no layout footprint in the model — carries identity for animation targeting, alignment, and stage drag/drop, but has no rendered box. Can be promoted to a real container (inserts a wrapper node around children) or released (removes wrapper, hoists children). Both are clean, undoable model mutations.
  * Whether a `display: contents` group has a model node or is purely an editor-layer concept: to be decided, but leaning toward giving it a model node to support animation targeting and future hide/show use cases.

* **API for complex operations:**
  All complex cross-component operations belong in `documentApi` as pure `DocumentModel → DocumentModel` functions — not per-component APIs, not editor-only logic. Candidates: `joinTextNodes`, `splitRichText`, `wrapInContainer`, `releaseGroup`, `switchMediaType`. The editor wraps these in `editorApi` with selection and history concerns. AI and external scripts can call `documentApi` directly.

* **Button:** Deferred. Currently just a styled link. Revisit when concrete interactions (dialog, form submit, state toggle) exist that need button semantics beyond navigation.

* **Semantic wrappers — two categories:**
  * **Pure semantic (just change meaning, no behavior):** `aside`, `article`, `main`, `figure`. Implemented as new container roles — same cost as existing section/header/footer. `figcaption` is a role on a child text node: auto-assigned if there is exactly one text child inside a figure, selectable from the container menu otherwise.
  * **Behavior-adding (change how children work):** `nav`, `form`, `dialog`. Higher cost, need explicit product design per wrapper.
  * `<address>`: a container with an `address` semantic role. Holds multiple contact/location pieces — treating it as a text role would force everything into one node.

* **Semantic wrappers — nav and menus:**
  `nav` alone is not enough for a real menu — a menu is `nav > ul > li > a`. A dedicated **pages menu component** is the right approach, but it must support more than just pages:
  * Auto-populated from site pages, but also supports arbitrary links and anchor links
  * Nesting if pages have nesting (sub-menus bound to their parent page, Drupal-style master menu)
  * Splittable — e.g. top-level links in header, sub-links in sidebar
  * Full styling control
  * Fragmentation across breakpoints/viewstates
  The model boundaries of this component need to be designed before implementation.

* **dialog (deferred, specced for later):**
  Container with open/close state, preset screen positions, children rendered outside the normal document flow. Connected to an opener via command API or JS. Key unresolved model question: does a dialog node live as a child of the page in the model tree, or as a sibling at document level? Related to the `display: contents` / out-of-flow node positioning problem.

* **Code components — text subtypes:**
  Both fit the text type discriminator model:
  * **Inline code:** `type: "code"`, no language property, renders as `<code>`. Supported wherever text is supported (including inside rich text/markdown).
  * **Code block:** `type: "code-block"`, `language` property, renders as `<pre><code>`. Syntax highlighted in editor (Prism or highlight.js at edit time). Flattened to pre-styled HTML on export — no JS dependency in the exported site.

* **`lang` attribute:**
  Document-level `lang` on the site node is mandatory and prominent. All other nodes inherit it. Containers can override `lang` for a subtree (a section in another language). Individual text nodes can override as an advanced/accessibility option — not a default-exposed control. The common case (a foreign-language quote inside a paragraph) is rare enough to warrant an advanced override rather than a per-text-node default.

* **LaTeX / MathML:** Deferred to a future plugins stage.

### Open Questions

* **Rich text editing surface:** `contenteditable` for single block is feasible. For rich text — external framework (ProseMirror/Tiptap/Lexical) vs off-stage panel editing for phase 1? Main implementation risk of this workstream.
* **`display: contents` group — model node or editor-only?** Leaning toward model node for animation and layout use cases, but needs a decision before implementation.
* **dialog node tree position:** Child of page (model position = DOM position) or sibling at document level (model position ≠ DOM position)? Connects to the out-of-flow node problem.
* **Pages menu model boundaries:** What exactly can be configured — page visibility, arbitrary link injection, nesting depth, split points? Needs a dedicated design pass before implementation.
* **How do we expose all these components and keep the editor feel simple?** Levels of complexity principle (from animation discussion) applies here too — predefined composites first, individual primitives and wrappers later.
