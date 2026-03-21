# Design System Showcase — Enhancement TODO

Items noted during the showcase rewrite. Do not pursue during the current implementation — these are follow-up tasks.

## Section Status

- **Design Tokens**: DONE — do not touch unless explicitly requested.
- **Base Components**: DONE — refined with parity pass (selection chrome, sticky indicators, button variants, tooltips, etc.)
- **Composites**: DONE — inspector title, shadow/border controls, text style (exact inspector rows), layout controls (XYWH/align/distribute/reorder), section layout (padding/order/type), content controls (text/link/image fields), settings controls (appearance/toggle/action/numeric groups), settings nav item (idle/hover/selected), shortcuts, focused panel (empty state).
- **Inspector Sections**: Removed from showcase — deferred to a future pass.

## Icon Cleanup

- **Deduplicate AlertTriangle / TriangleAlert**: Both are used in the app (SettingsShared vs contentSections/shared). Pick one and migrate. `TriangleAlert` is the current lucide-react name; `AlertTriangle` is the legacy alias.
- **Audit icon list**: Verify every icon in the showcase is still actively imported somewhere in `src/` outside of the design system. Remove any that were added speculatively.

## Component Standalone Enhancements

- **SizeInlineField / SpacingField / FontSizeField**: Unit conversion (px↔%↔vh etc.) calls `convertStageMeasurementToInput()` which reads computed pixel values from DOM elements by node ID. In the showcase, these elements don't exist on the stage, so unit switching silently returns null. The fields still work for direct numeric input. Fix: mock the DOM measurement functions or provide a showcase-mode bypass.

- **FontFamilySelect / FontPickerPopover**: Showcase uses a small mock font library. The full document font loading pipeline (Google Fonts catalog, preview stylesheets, favorites, recent tracking) is not exercised. Consider a dedicated font picker demo page.

- **Font picker cleanup**: `FontFamilySelect` and `FontWeightSelect` are no longer used standalone — the only entry point is `FontPickerPopover`. Consider removing or deprecating the individual pickers. Also add an "open" chevron indicator to the `FontPickerPopover` trigger button.

- **FontPickerPopover side effects**: The component injects a Google Fonts `<link>` stylesheet into `document.head` when opened (for font previews) and writes recent selections to localStorage via `writeRecentFontFamilies()`. These side effects don't belong in the picker — font loading should be the caller's responsibility. Remove the stylesheet injection and localStorage writes from `FontPickerPopover`, move them to the call sites that need them. Once fixed, update the design-system showcase demo to use real Google Font names instead of system font placeholders.

- **StickySection**: The mock node may not include all sticky sub-fields. Some controls may show default/disabled states rather than fully populated states. Consider creating richer mock sticky data.

- **Content sections (Text/Link/Button)**: NavigationFields requires a real DocumentModel with sections for the anchor target selector. In the showcase, the internal link section selector shows an empty list.

## Missing Components

- **Template items**: SectionTemplatePopover and template card variants are not yet showcased. These depend on template insertion logic and positioning.

- **Font management panel items**: Document font row, catalog font row, filter toggles, and the full browse experience are not included in the showcase.

- **Pager**: Currently using a simple prev/next pattern. The actual font management pager (CatalogPaginationControls) is internal to ManageFontsPanel and not exported. Consider extracting it.

## Refactoring

- **Text style control groups**: The typography rows in `TypographyTextStyleFields` (Font, Size, Style, Align, Color) are assembled inline. Extract each as a named group component (e.g. `FontRow`, `SizeRow`, `StyleRow`, `AlignRow`, `ColorRow`) to make them reusable across single-select, multi-select, and showcase contexts.

## Structural Improvements

- **File size**: BaseComponentsSection.tsx and CompositeSection.tsx will be large. Consider splitting into `sections/base/*.tsx` and `sections/composite/*.tsx` subdirectories with barrel re-exports per the Component Size Limits rule in CLAUDE.md.

- **Section title hierarchy**: Currently using h2 for major sections and h3 for subsections. The nav tracks subsection IDs. Consider adding major section IDs to the nav as well.
