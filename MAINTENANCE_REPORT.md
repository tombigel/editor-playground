# Maintenance Report

Status: Archived on 2026-03-17 after the 2026-03 maintenance pass.

This file remains as a historical record of the pass. Remaining work mentioned here is future product or follow-up work, not active broad maintenance debt.

Date: 2026-03-15

Scope reviewed:

- Top-level config and docs: `package.json`, `README.md`, `PLAYGROUND_SPEC.md`, tsconfig/vite config, `.gitignore`
- Runtime/editor code: `src/app`, `src/api`, `src/editor`, `src/model`, `src/panels`, `src/site`, `src/stage`, `src/sticky`, `src/components/ui`
- Styles: `src/styles.css`
- Existing tests under `src/**/*.test.*`

Validation run:

- `npm run lint`: passed
- `npm run typecheck`: passed
- `npm run test:run`: passed, `127` tests
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
   - `SiteRenderer` was initially only referenced by its own tests, not by the app.
   - Completed on 2026-03-16: it was promoted into the canonical SSR-safe site/runtime renderer boundary with a real site export path, so it is no longer a dead-code candidate.

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
  - Very large orchestration file. It owns reducer logic, history diffing, persistence, keyboard shortcuts, popover dismissal, theme sync, and layout shell rendering.
  - Completed on 2026-03-15: history diffing now uses extracted structural comparison helpers in `src/app/history.ts` instead of `JSON.stringify`.
  - Partially completed on 2026-03-15: top-bar actions, rail toggles, and the section template popover were extracted into `src/app/AppChrome.tsx`, which removed a large block of render-only duplication from `App.tsx`.
  - Partially completed on 2026-03-15: environment hooks and pure app selectors now live in `src/app/useEditorEnvironment.ts` and `src/app/appSelectors.ts`, with direct tests for the selector logic.
  - Partially completed on 2026-03-15: keyboard shortcut orchestration now lives in `src/app/useEditorKeyboardShortcuts.ts`, with the action mapping isolated in `src/app/shortcutController.ts` and covered by direct tests.
  - Partially completed on 2026-03-15: reducer and history-state orchestration now live in `src/app/editorState.ts`, with direct tests covering history-only UI toggles, resize stream coalescing, and sticky-target coercion.
  - Partially completed on 2026-03-15: the main shell render tree now lives in `src/app/AppShell.tsx`, and settings import/reset workflow helpers now live in `src/app/appSettingsActions.ts` with direct tests.
  - Completed on 2026-03-15: panel/open-state orchestration now lives in `src/app/useAppPanels.ts`, derived app view-model state lives in `src/app/useAppViewModel.ts`, and runtime effects live in `src/app/useAppRuntime.ts`. `App.tsx` is now a thin composition layer over app hooks plus `AppShell.tsx`.

### `src/editor`

- `src/editor/editorStore.ts`
  - Strong migration coverage in tests, but the file mixes persistence, migration, document mutation, and selection/history concerns.
  - Repeated object seeding for sticky defaults appears in both editor and document APIs. That should be centralized.
- Completed on 2026-03-15: `src/editor/DragController.ts` and `src/editor/ResizeController.ts` were removed.
  - Their stage-only types and helpers are now co-located under `src/stage`, which better reflects actual ownership.

### `src/stage`

- `src/stage/Stage.tsx`
  - Completed on 2026-03-15: reduced from 2,363 lines to 205 lines and now acts as a thin stage shell only.
  - It now owns geometry measurement, pointer lifecycle, and editor callback wiring, while rendering moved to `src/stage/StageScene.tsx` and pure interaction/measurement math moved to `src/stage/stageMath.ts`.
  - Partially completed on 2026-03-15: drag/snap/drop helpers now accept injected document/window adapters, which makes the interaction math directly testable without a browser test harness.
  - Partially completed on 2026-03-15: pure drag/resize/drop/measurement math now lives in `src/stage/stageMath.ts`, and `Stage.test.tsx` now imports that test surface directly instead of reaching through `Stage.tsx`.
- `src/stage/StageScene.tsx`
  - New extracted stage render/layout surface as of 2026-03-15.
  - It now owns the nested wrapper/leaf render tree, sticky/spacer visuals, and mesh layout composition.
  - Remaining issue: it is still a large renderer module and is the next logical extraction target if stage rendering needs further decomposition.
- `src/stage/Stage.test.tsx`
  - Completed on 2026-03-15 for the highest-risk helper paths: stage interaction coverage now includes snap inversion, shift axis lock, drop fallback resolution, and sticky visual offset drag math.
  - Remaining gap: there is still no full browser-level drag/reparent integration coverage.

### `src/panels`

- `src/panels/InspectorPanel.tsx`
  - Another major hotspot, though materially smaller now after extraction.
  - Completed on 2026-03-15: the low-level inspector controls and measurement/unit conversion helpers now live in `src/panels/InspectorControls.tsx`, and `InspectorPanel.tsx` re-exports the tested conversion API from there.
  - Partially completed on 2026-03-15: inspector sections are now split into `src/panels/inspector/CommonSections.tsx`, `src/panels/inspector/ContentSections.tsx`, and `src/panels/inspector/StickySection.tsx`, so `InspectorPanel.tsx` now composes sections instead of holding one long render body.
  - Partially completed on 2026-03-15: section resolution now goes through `src/panels/inspector/schema.tsx`, which gives the inspector an explicit configuration layer with section ids, grouping, alignment, visibility, and render hooks.
  - Partially completed on 2026-03-15: each current node type/role now has its own inspector config module (`config.site.tsx`, `config.section.tsx`, `config.container.tsx`, `config.header.tsx`, `config.footer.tsx`, `config.text.tsx`, `config.button.tsx`, `config.link.tsx`, `config.image.tsx`), and the central schema now only selects which node-owned config to use.
  - Completed on 2026-03-15: the schema layer now resolves first-class inspector blocks with titles, descriptions, layout modes, visibility, alignment, and an explicit custom-block render path. `InspectorPanel.tsx` now renders block metadata instead of a flat section list, and node configs own grouped layout composition rather than only flat section ordering.
- `src/panels/SettingsPanel.tsx`
  - Completed on 2026-03-15: export now uses an in-panel file name field instead of `window.prompt`, while still supporting the native save picker when available.
  - Completed on 2026-03-15 for testability: transfer logic now lives in a dedicated helper module with direct tests for save-picker, named download fallback, and clipboard failure paths.

### `src/model` and `src/sticky`

- `src/model/defaults.ts`
  - Many seeded templates rely on hard-coded pixel coordinates and heights.
  - This is acceptable for a playground, but it makes template maintenance tedious and brittle.
  - Partially completed on 2026-03-15: shared padding/section-shell helpers now reduce some of the repeated template setup.
  - Partially completed on 2026-03-15: template node-map and child-assignment helpers now reduce repeated wrapper child wiring and node-record boilerplate across the header/footer and seeded sections, and more sticky sections now share the same section-shell builder.
  - If templates continue to grow, a larger builder/helper DSL would still pay off.
- `src/model/validation.ts`
  - Completed on 2026-03-15: graph integrity checks were expanded to cover root validity, symmetric parent/child links, duplicate child ids, cycles, and unreachable nodes.
- `src/sticky/resolve.ts`
  - Completed on 2026-03-15: sticky range/extent resolution now lives in one shared pure module used by both stage preview and settings diagnostics.

### `src/site`

- `src/site/SiteRenderer.tsx`
  - Completed on 2026-03-16: it is now the canonical SSR-safe site/runtime renderer boundary instead of a test-only stub.
  - It now renders structural sticky DOM for both `target=self` (track + spacer) and `target=contentWrapper` (sticky content wrapper + flow spacer), and programmatic site export lives in `src/site/siteExport.tsx`.
  - The settings panel now exposes a rendered-site bundle export using that same boundary (`.html` + `.css`).
  - Follow-up completed on 2026-03-16: site export now uses the same shared mesh-grid/sticky layout baseline as the editor stage for non-editor rendering, instead of a separate absolute-position child renderer.

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
  - Completed on 2026-03-15: the export fallback now uses in-app UI instead of `window.prompt`.

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
   - named download fallback path
   - clipboard copy failures
   - clipboard paste failures

6. Dead-code regression tests only where product intent exists.
   - Example: `SiteRenderer` now has explicit product intent as the SSR-safe site export renderer, so tests should keep growing around its supported sticky/export semantics instead of revisiting removal.

## Suggested cleanup order

1. Add full browser-level stage interaction coverage for drag, snap, reparent, and drop behavior.
2. Continue improving seeded template maintainability in `src/model/defaults.ts`.
3. If site export fidelity keeps growing, extract a broader shared render/style plan so stage preview and site export share more than leaf presentation defaults.
