# Showcase Tour Implementation Todo

This file is the work memory for the non-linear showcase tour implementation.
Update it after each phase, before each commit, and whenever a decision or API gap is discovered.

## Execution Rules

- Keep code changes sequential and commits phase-scoped.
- Use read-only subagents for independent research and verification where useful.
- Revalidate at the end of each implementation step before committing.
- Pause at the end of Phase 1 for Tom's verification of the proposed tour topics and steps before committing Phase 1 or starting Phase 2.
- Do not push commits at the end of the work. Wait for Tom's validation first.

## Phase Checklist

### Step 0: Work Memory Todo

- [x] Create this implementation todo.
- [x] Revalidate the Step 0 file contents.
- [x] Commit Step 0.

### Phase 1: Research And Tour Scope

- [x] Audit editor surfaces that can demonstrate UX craft, API architecture, design-system thinking, experimentation, and documentation/product depth.
- [x] Create `docs/SHOWCASE_TOUR_PHASE_1.md`.
- [x] Define first-phase topics with 3-5 steps each.
- [x] Record exact editor surface, required state, navigation intent, visual anchor, and intended URL shape for every step.
- [x] Revalidate the proposed tour map against current app surfaces.
- [x] Update this todo.
- [x] Pause for Tom's verification before committing Phase 1.

### Phase 2: Editor/API/URL Capabilities

- [x] Add or extend real editor navigation APIs.
- [x] Add URL parse/build support for editor and tour state.
- [x] Route app/editor use cases through those APIs instead of showcase-only logic.
- [x] Add API/app tests.
- [x] Update `docs/API.md` and `docs/PLAYGROUND_SPEC.md`.
- [x] Revalidate, update this todo, and commit.

### Phase 3: Showcase Tour Data And UI

- [ ] Add read-only `showcaseTourApi`.
- [ ] Add typed tour config from the verified Phase 1 brief.
- [ ] Implement the non-linear overlay menu and step navigation.
- [ ] Sync step jumps with URL state.
- [ ] Add unavailable-anchor fallback.
- [ ] Revalidate, update this todo, and commit.

### Visual System

- [ ] Reuse or extend existing design-system primitives.
- [ ] Add configurable `ShowcaseTourSkin` variables/config.
- [ ] Provide one default showcase skin with light/dark parity.
- [ ] Update design-system demos if shared primitives change.
- [ ] Revalidate design-system alignment, update this todo, and commit.

### Final Verification And Handoff

- [ ] Run focused editor navigation tests.
- [ ] Run focused showcase tour tests.
- [ ] Run relevant e2e smoke coverage.
- [ ] Run `pnpm run check:api-docs`.
- [ ] Run `pnpm run build`.
- [ ] Confirm local commit ordering.
- [ ] Stop and wait for Tom's validation before pushing.

## Subagent Notes

- Researcher: app surface and tour-topic audit.
- API architect: editor navigation and URL capability gap analysis.
- Design-system: visual-system fit and customization strategy.
- Tester: focused verification and regression checks.

## Decisions

- V1 is editor-only.
- V1 is config-driven, not authorable in-app.
- Tour navigation must be API and URL driven.
- The tour must support non-linear topic and step jumping.
- Showcase visual differentiation must be configurable enough to finalize later.

## Discovered API Gaps

- URL state currently covers preview mode and startup focused mode, not deep editor state.
- Panel state is app-local in `useAppPanels`; Phase 2 should add a typed panel state or intent surface.
- UI/view-state mutations such as focused mode, preview flags, grid/debug toggles, and spacer visibility need public editor/API coverage.
- Tour steps need node target resolution by stable query/name/category instead of generated ids.
- Design-system route steps require an intentional route navigation/return contract.
- Step setup must resolve to declarative editor navigation intents, never showcase-only DOM clicking.

## Test Commands

- Step 0: `pnpm exec prettier --check docs/SHOWCASE_TOUR_IMPLEMENTATION_TODO.md` is not configured; use content review and git diff for this docs-only step.
- Phase 1: content review and source-surface revalidation against `src/app`, `src/panels`, `src/stage`, `src/model`, `src/components/ui`, and `src/design-system`.
- Phase 2:
  - `pnpm run test:run -- src/api/tests/editorNavigationApi.test.ts src/api/tests/editorApi.test.ts`
  - `pnpm run test:run -- src/app/tests/AppShell.test.tsx src/app/tests/shortcutController.test.ts`
  - `pnpm run check:api-docs`
  - `pnpm run typecheck`
  - `pnpm run lint`
- Phase 3+: focused commands to be filled in as files are added.

## Commit Log

- Step 0: `docs(showcase-tour): add implementation work memory`
- Phase 1: `docs(showcase-tour): define phase 1 tour map`
- Phase 2: `feat(api): add editor navigation intents`

## Unresolved Questions

- Decide whether the design-system route step belongs in v1 despite leaving the editor route.
