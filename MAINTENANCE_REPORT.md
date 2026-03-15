# Maintenance Report

Date: 2026-03-15

Scope reviewed:

- Top-level config and docs: `package.json`, `README.md`, `PLAYGROUND_SPEC.md`, tsconfig/vite config, `.gitignore`
- Runtime/editor code: `src/app`, `src/api`, `src/editor`, `src/model`, `src/panels`, `src/site`, `src/stage`, `src/sticky`, `src/components/ui`
- Styles: `src/styles.css`
- Existing tests under `src/**/*.test.*`

Validation run:

- `npm run lint`: passed
- `npm run typecheck`: passed
- `npm run test:run`: passed, `118` tests
- `npm run test:coverage`: passed with thresholds
- `npm run check:architecture`: passed
- `npm run build`: passed

## Highest-priority findings

1. Completed on 2026-03-15: the build break caused by a test-only type cast was fixed.
   - `src/stage/Stage.test.tsx:401-403`
   - `npm run build` had been failing because the mock `classList` object was cast directly to `DOMTokenList`, which is not structurally compatible under strict TypeScript.
   - This is now resolved, and the repo is back to a clean buildable state.

2. Completed on 2026-03-15: `src/styles.css` contained a large block of dead legacy CSS.
   - Dead selector families start around `src/styles.css:380` (`.studio-*`, `.panel`, `.dialog*`, `.debug-card`).
   - None of these selectors were used by the current app tree anymore.
   - There were also duplicated resize-handle rules at `src/styles.css:1459-1480` where `.handle-w` and `.handle-nw` were defined twice.
   - The unused selector families and duplicate handle rules were removed.

3. Partially completed on 2026-03-15: there was confirmed dead runtime code, not just dead CSS.
   - Unused files/components:
   - `src/app/FloatingPanel.tsx` removed
   - `src/panels/DebugPanel.tsx` removed
   - `src/site/index.ts` removed
   - `src/components/ui/separator.tsx` removed
   - Unused exports:
   - `DialogTrigger` and `DialogClose` in `src/components/ui/dialog.tsx:35-42,113-121` removed
   - `SiteRenderer` is only referenced by its own tests, not by the app.
   - Remaining decision: either remove `SiteRenderer`, or keep it and clearly document it as a separate lightweight renderer.

4. Completed on 2026-03-15: the document validation layer was too shallow for the model complexity.
   - `src/model/validation.ts:7-39`
   - The original validator checked some parent/child role rules, but it did not verify:
   - `rootId` exists and points to a `site`
   - every `parent.children[]` id exists
   - parent/child links are symmetric
   - duplicate child ids
   - orphaned nodes
   - cycles outside the immediate containment checks
   - These checks are now implemented in `src/model/validation.ts`, with coverage added in `src/model/validation.test.ts`.

5. Completed on 2026-03-15: sticky diagnostics had fallback geometry that could drift from the actual stage.
   - The old `src/sticky/stickyCompute.ts` path used hardcoded viewport and fallback sizes (`1440x900`, `960`, `480`, `48`, `160`) instead of the richer runtime geometry the stage already had.
   - That meant sticky math in diagnostics could diverge from rendered behavior for `%`, `vh`, `auto`, `aspect-ratio(...)`, and measured intrinsic content.
   - Sticky resolution now lives in `src/sticky/resolve.ts` as a shared pure API, and both the stage preview and settings diagnostics consume that resolver.
   - `src/stage/Stage.tsx` now publishes measured node geometry upward so diagnostics can resolve sticky ranges against the same stage measurements.

6. Completed on 2026-03-15: the public document API had type drift.
   - `src/api/documentApi.ts:47-50,125-128`
   - `DocumentCommand['setText']` did not allow `htmlTag`, even though `setNodeTextField` did.
   - Separately, the editor layer used broad `field: string` plumbing in places like `src/editor/editorStore.ts:771` and `src/app/App.tsx` action definitions, which weakened compile-time guarantees and made typos easier to ship.
   - This is now aligned through shared field unions used by the document API, editor store, app actions, and inspector panel, with regression coverage for command-based `htmlTag` updates.

## File and area notes

### Top-level

- `package.json`
  - Completed on 2026-03-15: dedicated `lint`, `typecheck`, `test:coverage`, and `check` scripts were added, and `build` now runs them before `vite build`.
  - `playwright` is installed but there are no Playwright tests or scripts. If end-to-end coverage is not planned soon, this is removable dependency weight.
- `.github/workflows/ci.yml`
  - Completed on 2026-03-15: CI now runs the full repository verification gate on pushes to `master` and on pull requests via `npm run build` (which already includes lint, typecheck, coverage, and architecture checks).
- `README.md` and `PLAYGROUND_SPEC.md`
  - Broadly aligned with the current sticky/editor behavior from the code and tests I sampled.
  - No urgent doc drift found in this pass.

### `src/app`

- `src/app/App.tsx`
  - Very large orchestration file at 1,441 lines. It owns reducer logic, history diffing, persistence, keyboard shortcuts, popover dismissal, theme sync, and layout shell rendering.
  - `buildHistoryEntry` / `nodesEqual` use `JSON.stringify` for change detection at `src/app/App.tsx:1252-1255,1347-1348`. That is simple but expensive and brittle as the document grows.

### `src/editor`

- `src/editor/editorStore.ts`
  - Strong migration coverage in tests, but the file mixes persistence, migration, document mutation, and selection/history concerns.
  - Repeated object seeding for sticky defaults appears in both editor and document APIs. That should be centralized.
- `src/editor/DragController.ts` and `src/editor/ResizeController.ts`
  - Only type holders plus `px()` in drag controller.
  - These files no longer justify being separate “controllers” and look like leftovers from an earlier design.

### `src/stage`

- `src/stage/Stage.tsx`
  - Main complexity hotspot at 2,282 lines.
  - It mixes rendering, geometry measurement, drag state, resize math, snapping, drop-target resolution, sticky visualization, and unit conversion.
  - Partially completed on 2026-03-15: drag/snap/drop helpers now accept injected document/window adapters, which makes the interaction math directly testable without a browser test harness.
  - This is the file most likely to benefit from extraction into pure helpers with injected geometry/document adapters.
- `src/stage/Stage.test.tsx`
  - Completed on 2026-03-15 for the highest-risk helper paths: stage interaction coverage now includes snap inversion, shift axis lock, drop fallback resolution, and sticky visual offset drag math.
  - Remaining gap: there is still no full browser-level drag/reparent integration coverage.

### `src/panels`

- `src/panels/InspectorPanel.tsx`
  - Another major hotspot at 1,796 lines.
  - `Field` and `InlineField` at `src/panels/InspectorPanel.tsx:604-687` are currently unused.
  - The file exports and tests several conversion helpers, which is useful, but it also confirms this component is carrying too much domain logic.
  - Strong candidate for split into smaller field modules: geometry fields, text fields, sticky fields, and unit conversion helpers.
- `src/panels/SettingsPanel.tsx`
  - Solid overall, but it still falls back to `window.prompt` for file naming at `src/panels/SettingsPanel.tsx:223-255`.
  - That is functional, but it is older UX and harder to style than an in-app dialog.
  - Completed on 2026-03-15 for testability: transfer logic now lives in a dedicated helper module with direct tests for save-picker, prompt/download fallback, and clipboard failure paths.

### `src/model` and `src/sticky`

- `src/model/defaults.ts`
  - Many seeded templates rely on hard-coded pixel coordinates and heights.
  - This is acceptable for a playground, but it makes template maintenance tedious and brittle.
  - If templates continue to grow, a builder/helper DSL would pay off.
- `src/model/validation.ts`
  - Completed on 2026-03-15: graph integrity checks were expanded to cover root validity, symmetric parent/child links, duplicate child ids, cycles, and unreachable nodes.
- `src/sticky/resolve.ts`
  - Completed on 2026-03-15: sticky range/extent resolution now lives in one shared pure module used by both stage preview and settings diagnostics.

### `src/site`

- `src/site/SiteRenderer.tsx`
  - It is not used by the app, only by its own tests.
  - It renders sticky with plain `position: sticky` only and does not represent spacer duration/content-wrapper semantics from the current spec and stage implementation.
  - If this is supposed to be a faithful site output, it is under-modeled. If not, it should be labeled as a lightweight renderer or removed.

### `src/components/ui`

- The shared UI primitives are generally fine and small.
- `src/components/ui/dialog.tsx`
  - Completed on 2026-03-15: unused `DialogTrigger` and `DialogClose` exports were removed.

### `src/styles.css`

- Biggest cleanup target after `Stage.tsx` and `InspectorPanel.tsx`.
- Completed on 2026-03-15: the editor theme now uses shared CSS custom properties plus editor-owned semantic classes for body/editor backgrounds, shared surfaces, controls, stage frame/canvas, selection accent, drag preview, resize handles, settings navigation, template cards, and inspector inline fields.
- Completed on 2026-03-15: the remaining dark-theme utility remap block and the last CSS `!important` overrides used for theme patching were removed.
- Completed on 2026-03-15: the legacy `.studio-*`, `.panel`, `.dialog*`, and `.debug-card` block was removed, along with duplicate resize-handle rules.

## Modern CSS opportunities

1. Completed on 2026-03-15: replace dark-theme overrides in `src/styles.css` with custom properties on `[data-editor-theme="light" | "dark"]` plus editor-owned semantic classes.
   - Shared theme variables now cover core surfaces, controls, stage chrome, interaction accents, and the remaining panel-specific visual treatments that had still depended on utility remaps.

2. Replace repeated layout-specific background/border/color overrides with semantic tokens.
   - Example token groups: `--surface-1`, `--surface-2`, `--border-subtle`, `--text-muted`, `--accent`.

3. Remove duplicated handle rules and dead legacy selector families before further CSS refactors.
   - The current stylesheet carries too much obsolete surface area.

4. Consider using `min()` / `max()` / `clamp()` and CSS vars more consistently in panel sizing instead of more inline Tailwind arbitrary values plus stylesheet overrides.
   - The codebase already mixes both styles; it would be cleaner to pick clearer ownership per area.

## JS doing CSS or platform work

These are not all “wrong”, but they are worth revisiting:

- `src/stage/Stage.tsx`
  - Mesh layout is computed in JS. That is probably justified because the editor model is absolute-position based, but the geometry helpers should be isolated from JSX.
- `src/components/ui/popover.tsx`
  - Tooltip positioning is entirely manual. This is reasonable for now, but it is custom infrastructure that will need careful testing as the app grows.
- `src/panels/SettingsPanel.tsx`
  - `window.prompt` fallback is doing UI work the app can handle itself.

## Tests that would pay for themselves

1. Completed on 2026-03-15: validation graph integrity tests were added.
   - Covered cases now include broken `rootId`, parent/child asymmetry, missing child ids, duplicate child ids, orphan nodes, and cycles.

2. Partially completed on 2026-03-15: stage interaction tests now cover the highest-risk drag/snap/drop helper behavior.
   - Covered now:
   - `findDropWrapper` fallback behavior
   - drag with sticky visual offset
   - drag with `Alt` snap inversion
   - drag with `Shift` axis lock
   - Remaining gap: full browser-level reparent/drop interaction coverage is still open.

3. Completed on 2026-03-15: additional shared sticky resolver tests were added.
   - Covered now:
   - layout-level measured geometry handoff
   - nested container `contentWrapper` sticky extent
   - wrappers sized in `%`
   - `vh` values
   - `aspect-ratio(...)`

4. Completed on 2026-03-15: CI now runs the full typecheck/build gate instead of relying on local scripts only.
   - Implemented in `.github/workflows/ci.yml` using `npm run build`.

5. Completed on 2026-03-15: settings import/export behavior tests were added.
   - Covered now:
   - save-picker path
   - prompt/download fallback path
   - clipboard copy failures
   - clipboard paste failures

6. Dead-code regression tests only where product intent exists.
   - Example: if `SiteRenderer` is supposed to stay, add tests for spacer/duration semantics; otherwise remove it instead of testing it more.

## Suggested cleanup order

1. Decide the fate of `src/site/SiteRenderer.tsx`: remove it, or keep and document it as a separate lightweight renderer.
2. Split `Stage.tsx` and `InspectorPanel.tsx` into pure helper modules plus smaller render components.
3. Add stage interaction coverage for drag, snap, reparent, and drop behavior.
