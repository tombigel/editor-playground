# Google Fonts Progress

## Status

- status: in progress
- current phase: phases 1-4 implemented in first pass

## Completed

- added repo-persisted Google Fonts plan and progress docs
- moved Google Fonts API key usage into a refresh-only local env path
- created `src/fonts/` subsystem for:
  - Google catalog fetch
  - normalization
  - local search/filter/sort/query
  - document font-library helpers
  - numeric weight helpers
  - Google CSS2 request generation
- extended `DocumentModel` with `fontLibrary`
- seeded default document fonts
- normalized legacy imported bold/normal font weights into numeric weights
- added document-level font add/remove/favorite/purge APIs
- extended text/link/button typography with `fontFamily` and numeric `fontWeight`
- updated runtime preview to inject Google Fonts stylesheet links
- fixed Google Fonts Developer API requests to send repeated `capability=` params instead of an invalid comma-joined value
- updated exported HTML to emit Google Fonts preconnect and stylesheet links
- upgraded inspector font controls to show family previews, inline weight dropdowns, a manage-fonts icon button, and a suggested-size font-size field
- moved bold back into the shared style button row
- added reusable `ManageFontsPanel`
- embedded font management in Settings and added a standalone manage-fonts dialog
- bundled the Google Fonts catalog into the repo so runtime no longer fetches it from the API
- added a catalog `last updated` timestamp to the manage-fonts browser
- updated `PLAYGROUND_SPEC.md`
- added targeted tests for font catalog querying, document font-library behavior, site export, and inspector wiring

## In Progress

- stabilization pass after first full implementation
- post-integration bugfixes and regression coverage for malformed font metadata

## Next

- decide whether to clean up the unrelated `src/stage/tests/Stage.test.tsx` type baseline in this branch or separately
- add a dedicated UI test for `ManageFontsPanel` interactions if broader panel harness work resumes
- phase 2 variable-font authoring design remains deferred

## Blockers

- repo-wide `npm run typecheck` is still blocked by pre-existing `src/stage/tests/Stage.test.tsx` prop/type mismatches unrelated to the font integration

## Open Risks

- static Google weight export currently follows authored numeric weights; if later UI allows arbitrary freeform weights on static families, commit-time normalization may still need tightening
- variable-font metadata is preserved, but authored axis control is not implemented yet

## Session Log

### 2026-03-18

- created refresh-time env scaffolding for `GOOGLE_FONTS_API_KEY`
- implemented Google Fonts subsystem and document font library
- extended runtime, export, editor state, history, and inspector typography flows
- debugged live Google Fonts API 400 responses and confirmed the API key is valid
- patched the catalog request format to use repeated capability params
- upgraded the font picker UI to show per-family previews and inline font-weight selection
- added suggested font-size choices to the font size field
- added manage-fonts UI in dialog and Settings
- hardened Google/catalog and persisted document font normalization so malformed metadata cannot crash sorting or filtering paths
- fixed the manage-fonts `left.localeCompare is not a function` crash by sanitizing string fields before compare operations
- paginated the Google Fonts browse list to 20 families per page with previous/next controls
- added duplicate pagination controls at the bottom of the Google Fonts browse list
- defaulted Google catalog browsing to hide variable fonts while debugging static-font flows
- made stage/site fallback typography resolve from the document default font library instead of an editor-only fallback
- expanded variable-font weight pickers to stepped numeric options across the supported range
- moved font-size suggestions into an inline dropdown anchored to the numeric field itself
- fixed font-family dropdown mutations so selecting an existing family preserves its real catalog metadata instead of overwriting it with placeholder regular-only data
- moved Google Fonts catalog loading to a bundled generated snapshot and removed runtime API-key dependence
- added a bundled-catalog timestamp to the manage-fonts panel
- updated spec and added targeted tests
- validated targeted test suite:
  - `npx vitest run src/fonts/tests/googleFonts.test.ts src/fonts/tests/documentFonts.test.ts src/site/tests/siteExport.test.tsx src/panels/inspector/tests/schema.test.tsx src/app/tests/appSelectors.test.ts src/app/tests/AppShell.test.tsx src/panels/tests/SettingsPanel.test.tsx src/panels/tests/FocusedModePanel.test.tsx src/panels/tests/InspectorPanel.test.tsx`
  - result: passed
- validated the new malformed-metadata regression tests:
  - `npx vitest run src/fonts/tests/googleFonts.test.ts src/fonts/tests/documentFonts.test.ts`
  - result: passed
- revalidated panel wiring after the crash hardening:
  - `npx vitest run src/fonts/tests/googleFonts.test.ts src/fonts/tests/documentFonts.test.ts src/panels/tests/SettingsPanel.test.tsx`
  - result: passed
- validated pagination coverage and Settings integration:
  - `npx vitest run src/panels/fontManagement/tests/pagination.test.ts src/panels/tests/SettingsPanel.test.tsx`
  - result: passed
- validated default-font, site-export, and inspector updates:
  - `npx vitest run src/fonts/tests/documentFonts.test.ts src/site/tests/siteExport.test.tsx src/panels/fontManagement/tests/pagination.test.ts src/panels/tests/SettingsPanel.test.tsx src/panels/inspector/tests/schema.test.tsx src/panels/tests/InspectorPanel.test.tsx`
  - result: passed
- validated font-family mutation fixes through the document and editor APIs:
  - `npx vitest run src/api/tests/documentApi.test.ts src/editor/tests/editorStore.integration.test.ts src/fonts/tests/documentFonts.test.ts src/site/tests/siteExport.test.tsx`
  - result: passed
- revalidated repo-wide typecheck after pagination changes:
  - `npm run typecheck`
  - result: still blocked only by existing `src/stage/tests/Stage.test.tsx` test-harness/type issues
- validated repo-wide typecheck:
  - `npm run typecheck`
  - result: blocked only by existing `src/stage/tests/Stage.test.tsx` test-harness/type issues
