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

- [ ] Audit editor surfaces that can demonstrate UX craft, API architecture, design-system thinking, experimentation, and documentation/product depth.
- [ ] Create `docs/SHOWCASE_TOUR_PHASE_1.md`.
- [ ] Define 4-5 first-phase topics with 3-5 steps each.
- [ ] Record exact editor surface, required state, navigation intent, visual anchor, and intended URL shape for every step.
- [ ] Revalidate the proposed tour map against current app surfaces.
- [ ] Update this todo.
- [ ] Pause for Tom's verification before committing Phase 1.

### Phase 2: Editor/API/URL Capabilities

- [ ] Add or extend real editor navigation APIs.
- [ ] Add URL parse/build support for editor and tour state.
- [ ] Route app/editor use cases through those APIs instead of showcase-only logic.
- [ ] Add API/app tests.
- [ ] Update `docs/API.md` and `docs/PLAYGROUND_SPEC.md`.
- [ ] Revalidate, update this todo, and commit.

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

- Pending Phase 1/2 research.

## Test Commands

- Step 0: `pnpm exec prettier --check docs/SHOWCASE_TOUR_IMPLEMENTATION_TODO.md` is not configured; use content review and git diff for this docs-only step.
- Phase 1: content review and source-surface revalidation.
- Phase 2+: focused commands to be filled in as files are added.

## Commit Log

- Step 0: `docs(showcase-tour): add implementation work memory`

## Unresolved Questions

- Phase 1 tour topics and steps require Tom's verification before Phase 1 commit.
