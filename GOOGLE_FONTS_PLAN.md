# Google Fonts Integration Plan

## Summary

Proceed in four phases, using plan defaults unless a real blocker appears.

- keep plan and progress artifacts in the repo
- do not commit `VITE_GOOGLE_FONTS_API_KEY`
- use Google Fonts Developer API for catalog data
- use Google Fonts CSS2 for runtime/export loading

## Phase 1: No-UI Google Fonts API Layer

Create `src/fonts/` as a UI-agnostic subsystem that:

- fetches the Google Fonts catalog
- normalizes API responses into app-safe types
- supports local search/filter/sort/query
- preserves subsets, variants, tags, and variable-font axes

Primary API surface:

- `fetchGoogleFontCatalog`
- `searchGoogleFontFamilies`
- `filterGoogleFontFamilies`
- `sortGoogleFontFamilies`
- `queryGoogleFontFamilies`
- `getGoogleFontFamily`

## Phase 2: Document-Level Font Store

Extend `DocumentModel` with `fontLibrary`:

- `defaults`
- `usedFamilies`
- `favorites`

Required document APIs:

- `getDocumentFontLibrary`
- `listDocumentFonts`
- `addDocumentFontFamily`
- `removeDocumentFontFamily`
- `purgeUnusedDocumentFonts`
- `toggleDocumentFontFavorite`
- `isFontFamilyUsed`
- `getFontUsage`

Default seeded families:

- `Inter`
- `Roboto`
- `Lora`
- `Playfair Display`
- `Assistant`

Rules:

- removing a used font is blocked
- purge keeps defaults and favorites
- favorites are document-level

## Phase 3: Minimal Typography Picker

Add:

- family dropdown
- numeric weight dropdown/input
- upgraded bold button
- `Manage fonts` entry point

Family picker rules:

- `System default` first
- then document font families
- sort by used frequency, then language/subset, then alpha

Weight rules:

- numeric weights `100` to `900`
- bold active at effective weight `>= 700`
- bold toggles between `400` and `800`
- unsupported static weights resolve to the nearest family-supported weight
- italic remains separate via `fontStyle`

## Phase 4: Manage Fonts UI

Build one reusable `ManageFontsPanel` for:

- standalone dialog
- embedded Settings section

Features:

- search Google catalog
- add/remove document fonts
- purge unused
- mark favorites
- show usage, subset/language, category, and variable badges

## Public Model Changes

- `DocumentModel.fontLibrary`
- `TypographyStyle.fontFamily?: string`
- `TypographyStyle.fontWeight?: number`
- text-capable editor/document APIs support `fontFamily`

## Variable Fonts

Deferred after the first four phases.

Needed later:

- authored axis values
- axis UI
- variable-axis CSS2 generation
- richer export/runtime optimization

## Subagent Plan

Use subagents only after phase 1 contracts are settled.

Recommended split:

1. Fonts data worker
2. Document store worker
3. UI worker

Do not parallelize shared type design before phase 1 stabilizes.
