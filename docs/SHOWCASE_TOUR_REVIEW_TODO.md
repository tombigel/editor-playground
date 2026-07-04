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
  - Why: the implementation work-memory doc (now `archive/SHOWCASE_TOUR_IMPLEMENTATION_TODO.md`) still marked the latest nav-highlight alignment as pending.

## Waiting For Tom

- [x] Decide whether editor URL params should open editor panels outside the tour.
  - Source: Senior Developer.
  - Decision (2026-07-04): implement boot hydration — apply parsed panel/help/settings/page targets once at app load, no continuous two-way sync outside the tour. Tracked as `RI-49` in the roadmap.
- [x] Decide whether panel request handling should be centralized around the API panel-state helper.
  - Source: Senior Developer.
  - Decision (2026-07-04): centralize — build a shared adapter over `applyEditorPanelRequest` and migrate the tour controller to it. Review of the duplicated switch found real drift: its `toggle` case sends `ai` to manage fonts. Tracked as `RI-50` in the roadmap.
- [x] Decide topic-progress framing.
  - Source: UX.
  - Decision (2026-07-05): topic-local progress — the card header shows `Topic · 2/4` via `getShowcaseTourProgress` in `showcaseTourApi`; Back/Next navigation and the Done state stay global. Implemented in the same change.
- [ ] Decide responsive support level for the tour.
  - Source: UX, QA.
  - Current state: smoke coverage is desktop-sized; small viewports may force overlap between the tour card and menu.
  - Decision: desktop-only showcase for phase 1, or add tablet/mobile layout behavior and coverage.
- [x] Decide final visual differentiator.
  - Source: UX.
  - Decision (2026-07-04): keep the subtle product-native treatment — tokenized skin with the existing distinct accent — and treat it as final. The tour itself is design-system evidence; no separate presenter layer.

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
