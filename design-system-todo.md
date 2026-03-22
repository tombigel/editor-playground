# Design System Showcase — Enhancement TODO

Items noted during the showcase rewrite. Do not pursue during the current implementation — these are follow-up tasks.

## Section Status

- **Design Tokens**: DONE — do not touch unless explicitly requested.
- **Base Components**: DONE — refined with parity pass (selection chrome, sticky indicators, button variants, tooltips, etc.)
- **Composites**: DONE — inspector title, shadow/border controls, text style (exact inspector rows), layout controls (XYWH/align/distribute/reorder), section layout (padding/order/type), content controls (text/link/image fields), settings controls (appearance/toggle/action/numeric groups), settings nav item (idle/hover/selected), shortcuts, focused panel (empty state).
- **Inspector Sections**: Removed from showcase — deferred to a future pass.

## Icon Cleanup

- ~~**Deduplicate AlertTriangle / TriangleAlert**~~: DONE — migrated to `TriangleAlert` everywhere, removed `AlertTriangle` from showcase icon list.
- **Audit icon list**: Verify every icon in the showcase is still actively imported somewhere in `src/` outside of the design system. Remove any that were added speculatively.

## Component Standalone Enhancements

- **SizeInlineField / SpacingField / FontSizeField**: Unit conversion (px↔%↔vh etc.) calls `convertStageMeasurementToInput()` which reads computed pixel values from DOM elements by node ID. In the showcase, these elements don't exist on the stage, so unit switching silently returns null. The fields still work for direct numeric input. Fix: mock the DOM measurement functions or provide a showcase-mode bypass.

- **FontFamilySelect / FontPickerPopover**: Showcase uses a small mock font library. The full document font loading pipeline (Google Fonts catalog, preview stylesheets, favorites, recent tracking) is not exercised. Consider a dedicated font picker demo page.

- ~~**Font picker cleanup**~~: DONE — `FontFamilySelect` and `FontWeightSelect` removed. ChevronDown added to `FontPickerPopover` trigger matching SelectTrigger styling.

- ~~**FontPickerPopover side effects**~~: DONE — Stylesheet injection extracted to `useFontPreviewStylesheet` hook. Recent-fonts persistence lifted to callers via `recentFamilyNames` / `onRecentFamiliesChange` props. Showcase demos pass explicit no-op props. ManageFontsPanel also migrated to the shared hook.

- **StickySection**: The mock node may not include all sticky sub-fields. Some controls may show default/disabled states rather than fully populated states. Consider creating richer mock sticky data.

- **Content sections (Text/Link/Button)**: NavigationFields requires a real DocumentModel with sections for the anchor target selector. In the showcase, the internal link section selector shows an empty list.

## Missing Components

- **Template items**: SectionTemplatePopover and template card variants are not yet showcased. These depend on template insertion logic and positioning.

- **Font management panel items**: Document font row, catalog font row, filter toggles, and the full browse experience are not included in the showcase.

- **Pager**: Currently using a simple prev/next pattern. The actual font management pager (CatalogPaginationControls) is internal to ManageFontsPanel and not exported. Consider extracting it.

## Refactoring

- **Text style control groups**: The typography rows in `TypographyTextStyleFields` (Font, Size, Style, Align, Color) are assembled inline. Extract each as a named group component (e.g. `FontRow`, `SizeRow`, `StyleRow`, `AlignRow`, `ColorRow`) to make them reusable across single-select, multi-select, and showcase contexts.

## Multi-Select Variants

When adding or refactoring a component in the design system showcase, check if MultiSelectInspector.tsx or other multi-select contexts apply CSS overrides or mixed-value rendering for that component. If so, add a "Multi-select" variation to the showcase. Many inspector controls render differently in multi-select context (e.g., "Mixed" labels, reduced chrome, disabled states) — these variants are part of the component's visual contract.

## Structural Improvements

- ~~**File size**~~: DONE — BaseComponentsSection split into `sections/base/` (7 demo files + barrel), CompositeSection split into `sections/composite/` (7 demo files + barrel). All files under 500 lines. InspectorControls.tsx also split into `panels/controls/` (6 component family files + barrel).

- **Section title hierarchy**: Currently using h2 for major sections and h3 for subsections. The nav tracks subsection IDs. Consider adding major section IDs to the nav as well.
