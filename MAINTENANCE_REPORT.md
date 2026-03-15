# Maintenance Report

Date: 2026-03-15

Scope reviewed:

- Top-level config and docs: `package.json`, `README.md`, `PLAYGROUND_SPEC.md`, tsconfig/vite config, `.gitignore`
- Runtime/editor code: `src/app`, `src/api`, `src/editor`, `src/model`, `src/panels`, `src/site`, `src/stage`, `src/sticky`, `src/components/ui`
- Styles: `src/styles.css`
- Existing tests under `src/**/*.test.*`

Validation run:

- `npm run test:run`: passed, `91` tests
- `npm run check:architecture`: passed
- `npm run build`: failed

## Status Update

Completed in the hardening pass started on 2026-03-15:

- Done: fixed the build-breaking test type cast in `src/stage/Stage.test.tsx`
- Done: added explicit `lint`, `typecheck`, `test:coverage`, and `check` scripts, and wired `build` to run them before `vite build`
- Done: added ESLint with repo-local config in `eslint.config.js`
- Done: added Vitest coverage reporting and threshold checks in `vite.config.ts`
- Done: strengthened document graph validation in `src/model/validation.ts`
- Done: added graph-integrity coverage in `src/model/validation.test.ts`
- Done: documented the stricter import/persistence validation rules in `PLAYGROUND_SPEC.md`

Current post-hardening validation status:

- `npm run lint`: passes
- `npm run typecheck`: passes
- `npm run test:run`: passes, `98` tests
- `npm run test:coverage`: passes with thresholds
- `npm run check:architecture`: passes
- `npm run build`: passes

## Highest-priority findings

1. Build is currently broken by a test-only type cast.
   - `src/stage/Stage.test.tsx:401-403`
   - `npm run build` fails because the mock `classList` object is cast directly to `DOMTokenList`, which is not structurally compatible under strict TypeScript.
   - This is a real maintenance issue because the repo is not in a clean buildable state even though Vitest is green.

2. `src/styles.css` still contains a large block of dead legacy CSS.
   - Dead selector families start around `src/styles.css:380` (`.studio-*`, `.panel`, `.dialog*`, `.debug-card`).
   - None of these selectors are used by the current app tree anymore.
   - There are also duplicated resize-handle rules at `src/styles.css:1459-1480` where `.handle-w` and `.handle-nw` are defined twice.
   - This is low-signal weight in the hottest stylesheet and makes future CSS work harder than it needs to be.

3. There is confirmed dead runtime code, not just dead CSS.
   - Unused files/components:
   - `src/app/FloatingPanel.tsx`
   - `src/panels/DebugPanel.tsx`
   - `src/site/index.ts`
   - `src/components/ui/separator.tsx`
   - Unused exports:
   - `DialogTrigger` and `DialogClose` in `src/components/ui/dialog.tsx:35-42,113-121`
   - `SiteRenderer` is only referenced by its own tests, not by the app.
   - These are good cleanup candidates, but `SiteRenderer` first needs a product decision: remove it, or keep it and clearly document it as a separate renderer.

4. The document validation layer is too shallow for the model complexity.
   - `src/model/validation.ts:7-39`
   - It checks some parent/child role rules, but it does not verify:
   - `rootId` exists and points to a `site`
   - every `parent.children[]` id exists
   - parent/child links are symmetric
   - duplicate child ids
   - orphaned nodes
   - cycles outside the immediate containment checks
   - This leaves room for corrupted persisted/imported data that is “valid enough” to pass `validateDocument` and fail later in renderer/editor code.

5. Sticky diagnostics use fallback geometry that can drift from the actual stage.
   - `src/sticky/stickyCompute.ts:11,83-93,143-167`
   - `computeStickyState` uses hardcoded viewport and fallback sizes (`1440x900`, `960`, `480`, `48`, `160`) instead of the richer runtime geometry the stage already has.
   - That means sticky math in diagnostics can diverge from rendered behavior for `%`, `vh`, `auto`, `aspect-ratio(...)`, and measured intrinsic content.
   - The logic is also duplicated with similar helpers in `src/stage/Stage.tsx`.

6. The public document API has type drift.
   - `src/api/documentApi.ts:47-50,125-128`
   - `DocumentCommand['setText']` does not allow `htmlTag`, but `setNodeTextField` does.
   - Separately, the editor layer still uses broad `field: string` plumbing in places like `src/editor/editorStore.ts:771` and `src/app/App.tsx` action definitions, which weakens compile-time guarantees and makes typos easier to ship.

## File and area notes

### Top-level

- `package.json`
  - No dedicated `typecheck` or `lint` script. Right now `build` is acting as typecheck, and it failed only because tests are included in `src`.
  - `playwright` is installed but there are no Playwright tests or scripts. If end-to-end coverage is not planned soon, this is removable dependency weight.
- `README.md` and `PLAYGROUND_SPEC.md`
  - Broadly aligned with the current sticky/editor behavior from the code and tests I sampled.
  - No urgent doc drift found in this pass.

### `src/app`

- `src/app/App.tsx`
  - Very large orchestration file at 1,441 lines. It owns reducer logic, history diffing, persistence, keyboard shortcuts, popover dismissal, theme sync, and layout shell rendering.
  - `buildHistoryEntry` / `nodesEqual` use `JSON.stringify` for change detection at `src/app/App.tsx:1252-1255,1347-1348`. That is simple but expensive and brittle as the document grows.
- `src/app/FloatingPanel.tsx`
  - Appears unused.
  - If kept, it should at least be moved out of the runtime bundle or into an explicit experimental area.

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
  - Global DOM access in helpers such as `collectVerticalSnapTargets`, `collectPageSnapTargets`, `findDropWrapper`, and `findDropWrapperElement` (`src/stage/Stage.tsx:1582-1719`) makes the hardest behavior the least testable.
  - This is the file most likely to benefit from extraction into pure helpers with injected geometry/document adapters.
- `src/stage/Stage.test.tsx`
  - Good coverage for rendering and unit-preservation helpers.
  - Missing coverage for actual drag/reparent/snap/drop behavior, which is where most regression risk now lives.

### `src/panels`

- `src/panels/InspectorPanel.tsx`
  - Another major hotspot at 1,796 lines.
  - `Field` and `InlineField` at `src/panels/InspectorPanel.tsx:604-687` are currently unused.
  - The file exports and tests several conversion helpers, which is useful, but it also confirms this component is carrying too much domain logic.
  - Strong candidate for split into smaller field modules: geometry fields, text fields, sticky fields, and unit conversion helpers.
- `src/panels/SettingsPanel.tsx`
  - Solid overall, but it still falls back to `window.prompt` for file naming at `src/panels/SettingsPanel.tsx:223-255`.
  - That is functional, but it is older UX and harder to style/test than an in-app dialog.
- `src/panels/DebugPanel.tsx`
  - Unused.

### `src/model` and `src/sticky`

- `src/model/defaults.ts`
  - Many seeded templates rely on hard-coded pixel coordinates and heights.
  - This is acceptable for a playground, but it makes template maintenance tedious and brittle.
  - If templates continue to grow, a builder/helper DSL would pay off.
- `src/model/validation.ts`
  - Needs stronger graph integrity checks.
- `src/sticky/stickyCompute.ts`
  - Logic is readable, but it is simplified enough to disagree with stage rendering under non-trivial unit cases.

### `src/site`

- `src/site/SiteRenderer.tsx`
  - It is not used by the app, only by its own tests.
  - It renders sticky with plain `position: sticky` only and does not represent spacer duration/content-wrapper semantics from the current spec and stage implementation.
  - If this is supposed to be a faithful site output, it is under-modeled. If not, it should be labeled as a lightweight renderer or removed.

### `src/components/ui`

- The shared UI primitives are generally fine and small.
- `src/components/ui/dialog.tsx`
  - `DialogTrigger` and `DialogClose` are unused.
- `src/components/ui/separator.tsx`
  - Unused.

### `src/styles.css`

- Biggest cleanup target after `Stage.tsx` and `InspectorPanel.tsx`.
- The dark-theme section at `src/styles.css:48-280` is heavily selector-driven and relies on repeated `!important`.
- This wants CSS custom properties on `[data-editor-theme]` instead:
  - shared surface/background/border/text variables
  - far fewer repeated selectors
  - less specificity fighting
- The legacy `.studio-*`, `.panel`, `.dialog*`, and `.debug-card` block should be removed unless it is intentionally retained for a hidden mode.

## Modern CSS opportunities

1. Replace most dark-theme overrides in `src/styles.css` with custom properties on `[data-editor-theme="light" | "dark"]`.
   - This is the highest-value CSS modernization in the repo.

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

1. Validation graph integrity tests.
   - Broken `rootId`
   - parent references child but child points elsewhere
   - missing child ids in `children`
   - duplicate child ids
   - orphan nodes

2. Stage interaction tests for snap/drop logic.
   - `collectPageSnapTargets`
   - `collectVerticalSnapTargets`
   - `findDropWrapper`
   - drag with sticky visual offset
   - drag with `Alt` snap inversion
   - drag with `Shift` axis lock

3. Sticky computation parity tests between diagnostics and stage behavior.
   - wrappers sized in `%`
   - `vh`/`vw` values
   - `height:auto`
   - `aspect-ratio(...)`
   - content-wrapper sticky on nested wrappers

4. Typecheck/build gate in CI.
   - Right now a green Vitest run can still hide a broken build.

5. Settings import/export behavior tests.
   - save-picker path
   - prompt/download fallback path
   - clipboard failures

6. Dead-code regression tests only where product intent exists.
   - Example: if `SiteRenderer` is supposed to stay, add tests for spacer/duration semantics; otherwise remove it instead of testing it more.

## Suggested cleanup order

1. Fix the build break in `src/stage/Stage.test.tsx`.
2. Delete dead runtime files and dead CSS blocks.
3. Strengthen `validateDocument` and add graph-integrity tests.
4. Split `Stage.tsx` and `InspectorPanel.tsx` into pure helper modules plus smaller render components.
5. Unify sticky geometry helpers between stage and diagnostics.
6. Convert theme styling to CSS variables and remove the dark-mode `!important` sprawl.
