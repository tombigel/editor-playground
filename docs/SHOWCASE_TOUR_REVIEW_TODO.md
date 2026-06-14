# Showcase Tour Review Todo

Review date: 2026-06-14

Scope: recent non-linear showcase tour commits through `8052fa8 fix(showcase-tour): highlight settings nav workflow routes`.

Reviewers:

- UX designer agent: story clarity, visitor experience, wayfinding, visual polish.
- QA engineer agent: regression coverage, URL/deep-link coverage, browser risks.
- Senior developer agent: API-first alignment, URL sync, panel/navigation architecture.

## Fixed In This Follow-Up

- [x] Auto-open and highlight the tour topic menu for `start / menu-is-nonlinear`.
  - Source: UX, QA, Senior Developer.
  - Why: the step sells non-linear navigation, so the route target must be visible without relying on visitor inference.
- [x] Make later sticky story steps self-contained deep links.
  - Source: UX.
  - Why: `sticky-node`, `sticky-guides`, and `edge-lab` depend on Sticky Edge Lab nodes; direct links should create the lab idempotently.
- [x] Prevent stale editor-navigation URL params from leaking across tour steps.
  - Source: Senior Developer.
  - Why: moving from a panel step to a close-panels step should not leave `panel=settings` / `settings=transfer` in a shareable URL.
- [x] Keep highlight labels visible for top-edge targets.
  - Source: UX.
  - Why: labels above top-bar targets could render offscreen.
- [x] Strengthen direct smoke coverage for settings workflow tour steps.
  - Source: QA.
  - Why: tests should prove tour step navigation opens Settings instead of pre-seeding `panel=settings`.
- [x] Add focused unit coverage for outside-click exemption and tour drag clamping.
  - Source: QA.
  - Why: smoke coverage existed, but helper-level regressions were weakly covered.
- [x] Refresh implementation work-memory status.
  - Source: local review.
  - Why: `docs/SHOWCASE_TOUR_IMPLEMENTATION_TODO.md` still marked the latest nav-highlight alignment as pending.

## Waiting For Tom

- [ ] Decide whether editor URL params should open editor panels outside the tour.
  - Source: Senior Developer.
  - Current state: tour URLs apply panel scenes through tour step navigation, but direct `?panel=settings&settings=transfer` without `tour` does not currently open Settings.
  - Decision: either implement full app boot hydration for panel/help/page params, or narrow the docs to tour/editor-navigation API parse-build support only.
- [ ] Decide whether panel request handling should be centralized around the API panel-state helper.
  - Source: Senior Developer.
  - Current state: `useShowcaseTourController` adapts `EditorPanelRequest` directly to React setters while `applyEditorPanelRequest` handles the pure state shape.
  - Decision: keep the shell adapter as-is for now, or create a shared callback adapter to reduce drift.
- [ ] Decide topic-progress framing.
  - Source: UX.
  - Current state: the card header shows global progress like `18/23`.
  - Decision: keep global progress, switch to topic-local progress like `2/4`, or show both.
- [ ] Decide responsive support level for the tour.
  - Source: UX, QA.
  - Current state: smoke coverage is desktop-sized; small viewports may force overlap between the tour card and menu.
  - Decision: desktop-only showcase for phase 1, or add tablet/mobile layout behavior and coverage.
- [ ] Decide final visual differentiator.
  - Source: UX.
  - Current state: the default skin has a distinct accent and tokenized styling, but final portfolio-layer expression is still intentionally unresolved.
  - Decision: subtle product-native overlay vs stronger portfolio/presenter treatment.

## Additional QA Backlog

- [ ] Add browser top-layer assertion using `document.elementFromPoint()` over the tour card/menu after opening a later editor popover.
  - Source: QA.
  - Why: current tests cover helper behavior and interactions, but not a direct browser top-layer overlap assertion.
- [ ] Add small-viewport drag/menu smoke coverage if responsive support is in scope.
  - Source: QA.
  - Depends on Tom's responsive-support decision.

## Notes

- Outside-click behavior looks sound in current smoke coverage: tour interactions preserve Settings and Pages language list popovers.
- Settings workflow anchors now intentionally target left nav items (`display`, `fonts`, `transfer`) for wayfinding instead of scrollable body sections.
- The design-system audit for recent tour changes found only pre-existing token exceptions/test string assertions; no new local styling was introduced in the nav-highlight follow-up.
