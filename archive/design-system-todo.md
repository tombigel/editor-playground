# Design System Showcase — Enhancement TODO

Items noted during the showcase rewrite. Do not pursue during the current implementation — these are follow-up tasks.

For the broader editor convergence effort, use [`docs/DESIGN_SYSTEM_CONVERGENCE_AUDIT.md`](./docs/DESIGN_SYSTEM_CONVERGENCE_AUDIT.md) as the tracked backlog and migration source of truth.

## Section Status

- **Design Tokens**: DONE — do not touch unless explicitly requested.
- **Base Components**: DONE — refined with parity pass (selection chrome, sticky indicators, button variants, tooltips, etc.)
- **Composites**: DONE — inspector title, shadow/border controls, text style (exact inspector rows), layout controls (XYWH/align/distribute/reorder), section layout (padding/order/type), content controls (text/link/image fields), settings controls (appearance/toggle/action/numeric groups), settings nav item (idle/hover/selected), shortcuts, focused panel (empty state).
- **Inspector Sections**: Removed from showcase — deferred to a future pass.

## Icon Cleanup

- ~~**Deduplicate AlertTriangle / TriangleAlert**~~: DONE — migrated to `TriangleAlert` everywhere, removed `AlertTriangle` from showcase icon list.
- ~~**Audit icon list**~~: DONE — audited the design-token icon showcase against active editor-facing usage, including the design-system showcase chrome itself. Removed speculative icons that are still unused across the current editor/showcase surfaces (`Component`, `FilePlus`, `Paintbrush`) while keeping icons used by the design-system shell such as `Blocks` and `Cuboid`.

## Component Standalone Enhancements

- ~~**SizeInlineField / SpacingField / FontSizeField**~~: DONE — the shared controls now accept explicit measurement resolvers, so showcase contexts can provide stable conversion values without relying on live stage DOM nodes. The layout and typography demos use that bypass for unit switching, and `SpacingField` can use the same resolver contract when showcased in embedded contexts.

- **FontFamilySelect / FontPickerPopover**: Showcase uses a small mock font library. The full document font loading pipeline (Google Fonts catalog, preview stylesheets, favorites, recent tracking) is not exercised. Consider a dedicated font picker demo page.

- ~~**Font picker cleanup**~~: DONE — `FontFamilySelect` and `FontWeightSelect` removed. ChevronDown added to `FontPickerPopover` trigger matching SelectTrigger styling.

- ~~**FontPickerPopover side effects**~~: DONE — Stylesheet injection extracted to `useFontPreviewStylesheet` hook. Recent-fonts persistence lifted to callers via `recentFamilyNames` / `onRecentFamiliesChange` props. Showcase demos pass explicit no-op props. ManageFontsPanel also migrated to the shared hook.

- ~~**StickySection**~~: DONE — the showcase now includes both an auto-distance wrapper example and a richer custom two-edge container example, so the sticky surface demonstrates authored offsets, custom duration, and local elevation states instead of mostly defaults.

- ~~**Content sections (Text/Link/Button)**~~: DONE — `ContentDemos` now passes `mockDocument`, and the showcase seed document includes a real starter page/section so `NavigationFields` has section anchor options instead of an empty internal-link selector.

## Missing Components

- ~~**Template items**~~: DONE — the showcase now renders the live `SectionTemplatePopover`, including the real template-card variants and floating placement shell used by the editor.

- ~~**Font management panel items**~~: DONE — the showcase now includes a representative font-management surface covering site-library rows, catalog rows, filter controls, result meta, and shared pagination anatomy.

- ~~**Pager**~~: DONE — the pager was extracted to the shared [`src/components/ui/pager.tsx`](./src/components/ui/pager.tsx) primitive, is used by `ManageFontsPanel`, and is already showcased under the base components section.

## Refactoring

- **Text style control groups**: The typography rows in `TypographyTextStyleFields` (Font, Size, Style, Align, Color) are assembled inline. Extract each as a named group component (e.g. `FontRow`, `SizeRow`, `StyleRow`, `AlignRow`, `ColorRow`) to make them reusable across single-select, multi-select, and showcase contexts.

## Multi-Select Variants

When adding or refactoring a component in the design system showcase, check if MultiSelectInspector.tsx or other multi-select contexts apply CSS overrides or mixed-value rendering for that component. If so, add a "Multi-select" variation to the showcase. Many inspector controls render differently in multi-select context (e.g., "Mixed" labels, reduced chrome, disabled states) — these variants are part of the component's visual contract.

## Structural Improvements

- ~~**File size**~~: DONE — BaseComponentsSection split into `sections/base/` (7 demo files + barrel), CompositeSection split into `sections/composite/` (7 demo files + barrel). All files under 500 lines. InspectorControls.tsx also split into `panels/controls/` (6 component family files + barrel).

- **Section title hierarchy**: Currently using h2 for major sections and h3 for subsections. The nav tracks subsection IDs. Consider adding major section IDs to the nav as well.
