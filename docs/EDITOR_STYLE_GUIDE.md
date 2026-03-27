# Editor Style Guide

Technical reference for editor chrome styling and tokenization.

Scope:

- app shell
- rails
- inspector
- settings
- dialogs
- popovers
- stage chrome
- editor-only overlays and affordances

Out of scope:

- rendered site content styling
- exported site CSS

Implementation baseline:

- [src/styles.css](/Users/tombigel/Dev/Wix/sticky-playground/src/styles.css)
- [src/components/ui/button.tsx](/Users/tombigel/Dev/Wix/sticky-playground/src/components/ui/button.tsx)
- [src/components/ui/input.tsx](/Users/tombigel/Dev/Wix/sticky-playground/src/components/ui/input.tsx)
- [src/components/ui/textarea.tsx](/Users/tombigel/Dev/Wix/sticky-playground/src/components/ui/textarea.tsx)
- [src/components/ui/select.tsx](/Users/tombigel/Dev/Wix/sticky-playground/src/components/ui/select.tsx)
- [src/components/ui/switch.tsx](/Users/tombigel/Dev/Wix/sticky-playground/src/components/ui/switch.tsx)
- [src/components/ui/card.tsx](/Users/tombigel/Dev/Wix/sticky-playground/src/components/ui/card.tsx)
- [src/components/ui/dialog.tsx](/Users/tombigel/Dev/Wix/sticky-playground/src/components/ui/dialog.tsx)

## 1. Required Conventions

- Editor chrome must use CSS tokens from [src/styles.css](/Users/tombigel/Dev/Wix/sticky-playground/src/styles.css), not one-off hard-coded colors.
- Prefer token names by role, not raw color names.
- Light and dark mode must keep the same accent hue for active/selected/focused/checked state.
- Use named editor classes or token-backed utility classes for editor chrome.
- Do not style editor chrome with ad hoc `bg-blue-*`, `text-slate-*`, or `border-slate-*` classes unless they are already part of a shared primitive and mapped back to editor tokens.

## 2. Font System

Font stack:

```css
Inter, "Helvetica Neue", Arial, sans-serif
```

Rules:

- Use this stack for all editor chrome.
- Use monospaced text only for JSON, shortcuts, and raw value displays.

## 3. Type Scale

Approved sizes:

| Role | Size | Typical use |
|---|---:|---|
| Micro | `10px` | pills, suffixes, selected-node labels |
| Label | `11px` | field labels, metadata, compact inputs |
| Small | `12px` | supporting copy |
| Body | `14px` | buttons, inputs, panel body copy |
| Section title | `15px` | inspector summary heading |
| Dialog title | `18px` | larger modal titles |

Weights:

- regular: `400`
- medium: `500`
- semibold: `600`
- bold: `700`

Approved text roles:

- strong text: `--editor-utility-text-strong`
- muted text: `--editor-utility-text-muted`
- tooltip muted text: `--editor-tooltip-muted-text`

Label styling rules:

- Avoid all-caps muted eyebrow labels in editor chrome.
- Prefer sentence case or title case small labels with normal tracking.
- Use heavier weight only when the label needs hierarchy, not decorative emphasis.

## 4. Icon System

Library:

- `lucide-react`

Rules:

- default icon size: `16px`
- icon-only controls use square frames
- icons inherit text color by default
- use stroke icons only
- do not mix filled icon sets into editor chrome

## 5. Radius System

Approved radii:

| Token level | Typical class | Use |
|---|---|---|
| Tight | `rounded-sm` | compact inline controls, inputs, selects, dropdown popups |
| Default | `rounded-md` | buttons and general-purpose small surfaces |
| Section | `rounded-lg` | nav items, sub-panels |
| Panel | `rounded-xl` | cards, dialogs |
| Shell | `rounded-2xl` | settings shell, large surfaces |
| None | `0` | stage node selection outline, node labels |

Rules:

- nested controls should not have a larger radius than their parent surface
- stage selection chrome stays square

## 6. Border System

Default border width:

- `1px`

Active border style:

- accent border
- or inset accent outline for active nav items

Rules:

- borders are the default separation mechanism
- do not use heavy shadows to replace missing borders

## 7. Shadow System

Approved shadow roles:

| Role | Token / style |
|---|---|
| Surface | `--editor-surface-shadow` |
| Stage frame | `--editor-stage-frame-shadow` |
| Tooltip | `--editor-tooltip-shadow` |
| Accent micro shadow | `--editor-accent-shadow` |
| Drag preview | `--editor-drag-preview-shadow` |

Rules:

- use one of the approved roles
- do not add deep bespoke shadows to individual controls
- active nav items should not use a floating drop shadow

## 8. Color Tokens

### 8.1 Accent

Primary accent:

```css
--editor-accent: #1668ff;
--editor-accent-shadow: 0 2px 8px color-mix(in srgb, var(--editor-accent) 24%, transparent);
```

Use accent for:

- selected stage nodes
- selected node labels
- checked switches
- focused fields
- active segmented buttons
- resize handles
- drop target highlights during drag (outline + tinted background via `color-mix`)
- editor interaction emphasis

Do not use accent for:

- passive cards
- generic panel backgrounds
- large non-interactive fills

Accent customization rules:

- the active editor accent must be runtime-configurable from settings
- provide a compact set of preset accent swatches plus a custom picker so the default blue remains easy to restore
- runtime accent changes must flow through shared tokens, not one-off component overrides
- derived dark-shell tinting may mix low percentages of accent into structural surfaces, but should remain clearly darker than active controls

### 8.2 Light Theme Tokens

Required baseline:

```css
--editor-surface-background: #ffffff;
--editor-surface-border: #dbe3ee;
--editor-input-background: #ffffff;
--editor-input-border: #d3dbe7;
--editor-input-text: #172033;
--editor-select-content-background: #ffffff;
--editor-select-highlight-background: #eff6ff;
--editor-switch-background: #cbd5e1;
--editor-switch-background-checked: #3b82f6;
--editor-tooltip-background: #ffffff;
--editor-tooltip-border: #dbe5f0;
--editor-tooltip-text: #475569;
--editor-tooltip-muted-text: #7b8796;
--editor-settings-nav-active-background: color-mix(in srgb, var(--editor-accent) 7%, #ffffff);
--editor-settings-nav-active-text: #16315f;
--editor-settings-nav-active-muted: #5d7293;
```

Light palette rules:

- light mode must support multiple palettes selected from settings
- ship at least two neutral light palettes, one accent-derived light palette, and one higher-contrast light palette
- `Midday` may mix low percentages of accent into shells and panels, but passive surfaces should stay clearly lighter than selected controls
- selecting `Paper` should reset the shared editor accent to its warm default
- `Clarity` should avoid decorative glows/shadows and use `2px` borders on form fields and interactive controls
- `Clarity` should also raise compact field typography so composite numeric controls do not drop below `12px` for values and `11px` for suffixes/modes

Closeable editor panels:

- settings, section templates, keyboard shortcuts, and manage fonts should share one header structure
- use an icon chip, a title, an optional one-line description, and the same square close button treatment on the right
- do not apply this standard to the sticky floating focus header; that header remains bespoke

Dark palette rules:

- dark mode must support multiple palettes selected from settings
- ship at least two neutral dark palettes, one styled dark palette, and one higher-contrast dark palette
- `Graphite` and `Monokai` should stay restrained in saturation so the editor accent remains the primary active signal
- selecting `Monokai` should reset the shared editor accent to its magenta default
- `Ink` should avoid decorative glows/shadows and use `2px` borders on form fields and interactive controls
- `Ink` should also raise compact field typography so composite numeric controls do not drop below `12px` for values and `11px` for suffixes/modes

### 8.3 Dark Theme Tokens

Required baseline:

```css
--editor-surface-background: color-mix(in srgb, var(--editor-accent) 11%, #1a2534);
--editor-surface-border: color-mix(in srgb, var(--editor-accent) 18%, #41586f);
--editor-input-background: color-mix(in srgb, var(--editor-accent) 6%, #162130);
--editor-input-border: color-mix(in srgb, var(--editor-accent) 18%, #41586f);
--editor-input-text: #e6edf5;
--editor-select-content-background: color-mix(in srgb, var(--editor-accent) 11%, #1a2534);
--editor-select-highlight-background: color-mix(in srgb, var(--editor-accent) 22%, #2a3850);
--editor-switch-background: #334155;
--editor-switch-background-checked: var(--editor-accent);
--editor-tooltip-background: color-mix(in srgb, var(--editor-accent) 6%, #0f1722);
--editor-tooltip-border: color-mix(in srgb, var(--editor-accent) 11%, #36495f);
--editor-tooltip-text: #d6e0ea;
--editor-tooltip-muted-text: #a5b3c2;
--editor-settings-nav-active-background: color-mix(in srgb, var(--editor-accent) 11%, #223041);
--editor-settings-nav-active-text: #f3f7fc;
--editor-settings-nav-active-muted: #95a8bf;
```

Dark shell palette rules:

- dark mode must support multiple shell palettes selected from settings
- ship at least three distinct dark palettes with clearly different neutral bases
- `Monokai` should stay warm and neutral while using the accent on active/focused chrome rather than tinting the full shell
- alternate dark palettes may change the neutral base family, but active/focused/selected states still use the shared accent token
- palette differences belong in shared shell tokens, not per-component bespoke overrides

### 8.4 Utility Tokens

Shared text/surface helpers:

```css
--editor-utility-text-strong
--editor-utility-text-muted
--editor-utility-bg-subtle
--editor-utility-border
```

These should drive low-level editor utility classes:

- `.editor-text-strong`
- `.editor-text-muted`
- `.editor-bg-subtle`
- `.editor-border-subtle`

## 9. Scrollbars

Use the shared `editor-scrollbar` class for intentional editor scroll surfaces only.

Rules:

- keep scrollbar styling scoped to editor chrome; do not restyle browser scrollbars globally
- reserve space with `scrollbar-gutter: stable both-edges` so the stage and panels do not reflow when the scrollbar appears
- default to auto-hide behavior: track and thumb stay transparent until the scroll surface is hovered, focused, or actively scrolled
- derive scrollbar colors from editor tokens in [src/styles.css](/Users/tombigel/Dev/Wix/sticky-playground/src/styles.css), not ad hoc values
- apply the shared scrollbar to editor scroll containers such as the stage shell, inspector scrollers, focused-mode surfaces, settings body, and editor popover lists

## 10. Interaction Tokens

Approved interaction colors:

- focus ring: accent blue at low alpha
- focused field border: accent color
- checked switch track: accent color
- selected node outline: accent color
- selected node label fill: accent color
- sticky distance / offset / padding / auto guides: accent-derived related hues, not fixed standalone hard-coded colors

### Snap Guide Visual Language

Snap guides are 1px overlay lines that appear during drag to indicate alignment. Each source role uses a distinct hue, and center/middle guides use a dashed style to distinguish from edge guides.

Snap guide color tokens:

| Role | Token | Color |
|---|---|---|
| Component (leaf) | `--editor-snap-guide-component` | Teal |
| Page bounds | `--editor-snap-guide-page` | Magenta |
| Section | `--editor-snap-guide-section` | Amber |
| Header | `--editor-snap-guide-header` | Sky blue |
| Footer | `--editor-snap-guide-footer` | Indigo |
| Container | `--editor-snap-guide-container` | Lime |

Anchor type differentiation:

- Edge guides (top/bottom/left/right): solid gradient line
- Center/middle guides: dashed line using the same source color

CSS classes:

- `.snap-guide-{source}` applies the source color (component, page, section, header, footer, container)
- `.snap-guide-center` switches from solid gradient to dashed border

Focus ring pattern:

Use a token-backed equivalent such as:

```css
outline: 2px solid var(--editor-focus-ring-strong);
outline-offset: 2px;
```

Transition timing:

- `150ms`

Approved transition properties:

- `background-color`
- `border-color`
- `color`
- `box-shadow`
- `transform`

## 10. Component Specs

### 10.1 Buttons

Implementation reference:

- [src/components/ui/button.tsx](/Users/tombigel/Dev/Wix/sticky-playground/src/components/ui/button.tsx)

Default geometry:

- height: `36px`
- radius: `rounded-md`
- font: `14px`, `500`
- icon gap: `8px`

Variants:

| Variant | Background | Border | Text |
|---|---|---|---|
| default | accent color | none | white |
| secondary | neutral subtle fill | none | strong text |
| outline | surface | subtle border | muted/strong text |
| ghost | transparent | none | muted text |
| destructive | light red tint | subtle red border | red text in light mode, near-white text in dark mode |

Focus:

- accent-derived ring
- visible keyboard-only focus state

### 10.2 Inputs

Implementation reference:

- [src/components/ui/input.tsx](/Users/tombigel/Dev/Wix/sticky-playground/src/components/ui/input.tsx)

Spec:

- height: `36px`
- padding-x: `12px`
- radius: `rounded-sm`
- border: `1px solid var(--editor-input-border)`
- background: `var(--editor-input-background)`
- text: `var(--editor-input-text)`
- placeholder: muted slate
- shadow: `shadow-sm`

Focus:

- border switches to the accent color
- low-alpha accent focus treatment
- suggestion-enabled composite inputs should render one visible suggestion surface at a time; when a styled popup is present, it owns the visible interaction instead of layering on top of the browser's native `datalist` popup

### 10.3 Textareas

Implementation reference:

- [src/components/ui/textarea.tsx](/Users/tombigel/Dev/Wix/sticky-playground/src/components/ui/textarea.tsx)

Spec:

- same visual treatment as inputs
- min height: `80px`
- padding: `12px x 8px`
- radius: `rounded-sm`

### 10.4 Selects

Implementation reference:

- [src/components/ui/select.tsx](/Users/tombigel/Dev/Wix/sticky-playground/src/components/ui/select.tsx)

Trigger:

- height: `36px`
- radius: `rounded-sm`
- border + background same as inputs
- text: strong text
- chevron icon: muted text

Content:

- background: `--editor-select-content-background`
- border: subtle border
- radius: `rounded-sm`
- shadow: medium surface shadow

Item highlight:

- background: `--editor-select-highlight-background`

### 10.5 Composite Value Fields

Implementation reference:

- `src/components/ui/value-with-unit.tsx`

Spec:

- one continuous outer shell owned by the composite wrapper
- the shared shell keeps the outer `focus-within` treatment, while the active inner input or trigger only gets an accent-colored inner border
- mixed-selection styling belongs to the shared component, not per-caller overrides
- suggestion-enabled variants should use the shared styled popup with combobox/listbox semantics by default; do not bind `list`/`datalist` at the same time because native autosuggest chrome cannot be styled or coordinated with the editor popup

### 10.5 Switches

Implementation reference:

- [src/components/ui/switch.tsx](/Users/tombigel/Dev/Wix/sticky-playground/src/components/ui/switch.tsx)

Spec:

- track size: `20px x 36px`
- track radius: full
- unchecked track: `--editor-switch-background`
- checked track: accent blue
- thumb: white, circular, small shadow

### 10.6 Cards

Implementation reference:

- [src/components/ui/card.tsx](/Users/tombigel/Dev/Wix/sticky-playground/src/components/ui/card.tsx)

Spec:

- background: `--editor-surface-background`
- border: `--editor-surface-border`
- radius: `rounded-xl`
- shadow: `shadow-sm`

Header:

- padding: `16px`
- title: `14px`, semibold
- description: `12px`, muted

### 10.7 Dialogs

Implementation reference:

- [src/components/ui/dialog.tsx](/Users/tombigel/Dev/Wix/sticky-playground/src/components/ui/dialog.tsx)

Spec:

- outer container centers content
- backdrop uses low-opacity dark scrim plus slight blur
- panel uses editor surface background, subtle border, `rounded-xl`, padded content
- close button uses icon-button subtle style

### 10.8 Rail Controls

Implementation references:

- [src/panels/InsertPanel.tsx](/Users/tombigel/Dev/Wix/sticky-playground/src/panels/InsertPanel.tsx)
- [src/app/AppChrome.tsx](/Users/tombigel/Dev/Wix/sticky-playground/src/app/AppChrome.tsx)

Spec:

- left-rail section labels use strong text, `14px`, semibold
- insert buttons are `40px` square with `rounded-lg`
- lower rail toggle buttons are `40px` square with `rounded-lg`
- icon size stays `16px`
- use border separation and shared surface tokens instead of wrapping the add-button cluster in an extra framed card

## 11. Settings Navigation

Implementation reference:

- [src/panels/SettingsPanel.tsx](/Users/tombigel/Dev/Wix/sticky-playground/src/panels/SettingsPanel.tsx)

Spec:

- item radius: `rounded-lg`
- item padding: `12px x 10px`
- label: `14px`, medium
- description: `12px`, muted

Light active state:

- background: `color-mix(in srgb, var(--editor-accent) 7%, #ffffff)`
- text: `#16315f`
- inset outline only
- no floating drop shadow

Dark active state:

- background: `#223147`
- text: `#f3f7fc`
- inset accent outline

## 12. Inspector Compact Controls

Implementation reference:

- [src/panels/InspectorControls.tsx](/Users/tombigel/Dev/Wix/sticky-playground/src/panels/InspectorControls.tsx)

Spec:

- compact field height: `32px`
- compact field radius: `rounded-sm`
- labels: `11px`, medium
- inline unit triggers: `10px`
- compact pills: `10px`, medium

Rules:

- compact controls may be tighter than shared primitives
- they must still use the same token-backed border/background/focus language

## 13. Stage Chrome

Spec:

- stage frame uses dedicated frame background, border, and shadow tokens
- stage canvas uses dedicated canvas background token
- selected node outline uses accent blue, square corners, `2px` border
- selected node label uses accent blue fill, white text, `10px` bold type
- marquee selection uses the same accent blue with square corners and a low-opacity fill
- resize handles use accent blue

Do not:

- round the editor selection box
- use a second dark-mode selection color

## 14. Z-Index

Rules:

- prefer DOM order and local stacking contexts first
- only use explicit layers for editor chrome where unavoidable
- do not introduce a new z-index without a named editor role

## 15. Token Authoring Rules

When adding a new editor token:

1. name it by role
2. add light and dark values together
3. update this guide in the same change

Good:

- `--editor-tooltip-muted-text`
- `--editor-settings-nav-active-background`
- `--editor-stage-frame-border`

Bad:

- `--light-blue-2`
- `--panel-special-border`
- hard-coded `#3b82f6` in a component file

## 16. Source Of Truth

This guide is normative for editor chrome.

If implementation drifts:

- update tokens and components to match this document
- or update this document in the same change set if the system standard changed intentionally
