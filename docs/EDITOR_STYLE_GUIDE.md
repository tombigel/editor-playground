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

Table of contents:

- [Implementation Baseline](#implementation-baseline)
- [Design System Correspondence](#design-system-correspondence)
- [1. Required Conventions](#1-required-conventions)
- [2. Font System](#2-font-system)
- [3. Type Scale](#3-type-scale)
- [4. Icon System](#4-icon-system)
- [5. Radius System](#5-radius-system)
- [6. Border System](#6-border-system)
- [7. Shadow System](#7-shadow-system)
- [8. Color Tokens](#8-color-tokens)
- [9. Scrollbars](#9-scrollbars)
- [10. Interaction Tokens](#10-interaction-tokens)
- [11. Component Specs](#11-component-specs)
- [12. Settings Navigation](#12-settings-navigation)
- [13. Inspector Compact Controls](#13-inspector-compact-controls)
- [14. Stage Chrome](#14-stage-chrome)
- [15. Z-Index](#15-z-index)
- [16. Token Authoring Rules](#16-token-authoring-rules)
- [17. Source Of Truth](#17-source-of-truth)

## Implementation Baseline

Implementation baseline:

- [src/styles.css](../src/styles.css)
- [src/lib/theme.ts](../src/lib/theme.ts)
- [src/design-system/registry.ts](../src/design-system/registry.ts)
- [src/design-system/DesignSystemApp.tsx](../src/design-system/DesignSystemApp.tsx)
- [src/components/ui/button.tsx](../src/components/ui/button.tsx)
- [src/components/ui/input.tsx](../src/components/ui/input.tsx)
- [src/components/ui/textarea.tsx](../src/components/ui/textarea.tsx)
- [src/components/ui/select.tsx](../src/components/ui/select.tsx)
- [src/components/ui/searchable-select.tsx](../src/components/ui/searchable-select.tsx)
- [src/components/ui/switch.tsx](../src/components/ui/switch.tsx)
- [src/components/ui/card.tsx](../src/components/ui/card.tsx)
- [src/components/ui/dialog.tsx](../src/components/ui/dialog.tsx)
- [src/components/ui/tabs.tsx](../src/components/ui/tabs.tsx)

## Design System Correspondence

The design system showcase is the visual verification surface for this guide. It is organized into three top-level sections, and this document should map cleanly onto them:

| Showcase section | Showcase source | What this guide covers |
|---|---|---|
| `Design Tokens` | `src/design-system/registry.ts` → `tokens` | Sections `2` through `10`: typography, radii, borders, shadows, color tokens, scrollbars, and interaction tokens. |
| `Base Components` | `src/design-system/registry.ts` → `base` | Section `11`: primitive controls such as buttons, inputs, selects, switches, dialogs, and value fields. |
| `Composites` | `src/design-system/registry.ts` → `composite` | Sections `12` through `14`: settings nav, inspector controls, and stage/editor chrome patterns. |

Rules:

- if a token, primitive, or composite is visible in the showcase, this guide should describe the intended styling rule behind it
- if this guide changes a normative rule, the design system showcase should be updated in the same change set so the visual surface stays representative
- the showcase is not a second style guide; it is the fastest place to confirm that the guide is reflected in implementation

## 1. Required Conventions

- Editor chrome must use CSS tokens from [src/styles.css](../src/styles.css), not one-off hard-coded colors.
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
- the supported light palettes are `Air`, `Paper`, `Midday`, and `Clarity`
- `Air` is the default light palette
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
- the supported dark palettes are `Graphite`, `Monokai`, `Midnight`, and `Ink`
- `Monokai` is the default dark palette
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
- derive scrollbar colors from editor tokens in [src/styles.css](../src/styles.css), not ad hoc values
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

## 11. Component Specs

### 11.1 Buttons

Implementation reference:

- [src/components/ui/button.tsx](../src/components/ui/button.tsx)

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

### 11.2 Inputs

Implementation reference:

- [src/components/ui/input.tsx](../src/components/ui/input.tsx)

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

### 11.3 Textareas

Implementation reference:

- [src/components/ui/textarea.tsx](../src/components/ui/textarea.tsx)

Spec:

- same visual treatment as inputs
- min height: `80px`
- padding: `12px x 8px`
- radius: `rounded-sm`

### 11.4 Selects

Implementation reference:

- [src/components/ui/select.tsx](../src/components/ui/select.tsx)

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

### 11.5 Composite Value Fields

Implementation reference:

- `src/components/ui/value-with-unit.tsx`

Spec:

- one continuous outer shell owned by the composite wrapper
- the shared shell keeps the outer `focus-within` treatment, while the active inner input or trigger only gets an accent-colored inner border
- mixed-selection styling belongs to the shared component, not per-caller overrides
- suggestion-enabled variants should use the shared styled popup with combobox/listbox semantics by default; do not bind `list`/`datalist` at the same time because native autosuggest chrome cannot be styled or coordinated with the editor popup

### 11.6 Switches

Implementation reference:

- [src/components/ui/switch.tsx](../src/components/ui/switch.tsx)

Spec:

- track size: `20px x 36px`
- track radius: full
- unchecked track: `--editor-switch-background`
- checked track: accent blue
- thumb: white, circular, small shadow

### 11.7 Cards

Implementation reference:

- [src/components/ui/card.tsx](../src/components/ui/card.tsx)

Spec:

- background: `--editor-surface-background`
- border: `--editor-surface-border`
- radius: `rounded-xl`
- shadow: `shadow-sm`

Header:

- padding: `16px`
- title: `14px`, semibold
- description: `12px`, muted

### 11.8 Dialogs

Implementation reference:

- [src/components/ui/dialog.tsx](../src/components/ui/dialog.tsx)

Spec:

- outer container centers content
- backdrop uses low-opacity dark scrim plus slight blur
- panel uses editor surface background, subtle border, `rounded-xl`, padded content
- close button uses icon-button subtle style

### 11.9 Rail Controls

Implementation references:

- [src/panels/InsertPanel.tsx](../src/panels/InsertPanel.tsx)
- [src/app/AppChrome.tsx](../src/app/AppChrome.tsx)

Spec:

- left-rail section labels use strong text, `14px`, semibold
- insert buttons are `40px` square with `rounded-lg`
- lower rail toggle buttons are `40px` square with `rounded-lg`
- icon size stays `16px`
- use border separation and shared surface tokens instead of wrapping the add-button cluster in an extra framed card

### 11.10 Menubar

Implementation references:

- [src/components/ui/menubar.tsx](../src/components/ui/menubar.tsx)
- [src/components/ui/page-switcher-select.tsx](../src/components/ui/page-switcher-select.tsx)
- [src/app/EditorTopbar.tsx](../src/app/EditorTopbar.tsx)

Spec:

- menubar triggers use the top-bar token set, not generic surface tokens
- trigger height: `28px`
- trigger radius: `rounded-sm`
- trigger label: `12px`, semibold
- trigger hover/open state reuses the same border/background language as other top-bar controls without extra glow
- menu surfaces use editor surface tokens with `rounded-md` geometry and compact `4px`-scale internal padding
- menu rows are compact, text-first rows sized for dense application menus rather than panel forms
- row labels are `12px`; shortcut hints are monospace `9-10px` and right-aligned
- optional row icons and selection checks share one tight leading marker slot so the text gutter stays close to the left edge
- submenu rows end with a right chevron affordance; panel-link rows use a distinct `ChevronsRight` affordance
- optgroup labels use muted uppercase helper text and visually separate light/dark theme groups
- combo rows such as toggle-plus-more split the primary toggle and the trailing “more” affordance into adjacent hit targets that still read as one row
- the centered page switcher should reuse the shared page-switcher select component rather than custom top-bar popover wiring
- the centered page switcher uses a brighter filled surface and dark text so it reads as the current-page control rather than another passive menu trigger
- the page-switcher trigger does not show the page-status dot; status dots stay inside the option list where they help scanning without duplicating the selected-state checkmark

Rules:

- if a top-bar menu pattern is needed elsewhere, reuse the shared menubar primitives before adding app-specific menu markup
- all visible shortcut hints must map to real registered shortcuts
- top-level menu triggers should stay text-led; icons are optional and should be rare
- menu rows should avoid one-off color utilities and instead inherit editor-surface and accent tokens
- top-level menus open on click first, then switch on hover while the menubar is active
- submenu surfaces should overlap their parent menu slightly to avoid hover gaps

### 11.11 Searchable Select

Implementation references:

- [src/components/ui/searchable-select.tsx](../src/components/ui/searchable-select.tsx)
- [src/i18n/languages.ts](../src/i18n/languages.ts)

Spec:

- trigger height: `32px`
- trigger radius: `rounded-sm`
- trigger typography: `12-14px` depending on host surface
- content surface uses editor surface tokens with compact list density
- popup width tracks the trigger but clamps to the viewport and flips above when needed
- option rows reserve one tight leading slot for the selected-state check
- search input sits in a bordered header row above the options list
- option rows may show a secondary muted description line for codes or native names

Rules:

- use for fixed option sets that benefit from free-text filtering
- do not use for arbitrary value entry
- page and text language selectors prepend a `Site language` option that stores `undefined`
- language options are sourced from `src/i18n/languages.json`, sorted by `order` first and then alphabetically

### 11.12 Tabs

Implementation references:

- [src/components/ui/tabs.tsx](../src/components/ui/tabs.tsx)
- [src/panels/PagesPanel.tsx](../src/panels/PagesPanel.tsx)

Spec:

- tabs list uses a subtle token-backed background with a `rounded-md` shell
- floating panel tab shells may reuse the subtle pill surface with the same radius and token set
- when a floating panel has only 2 short tabs, place the tab shell in the header actions area before introducing a second row
- triggers use compact `12px` medium text with `rounded-[6px]`
- active trigger swaps to the surface background and strong text with a small surface shadow
- tab content spacing should come from the host panel, not from the primitive itself

Rules:

- use shared tabs for embedded editor panel views before adding panel-specific segmented controls
- keep tab count low and labels short
- Pages panel uses this primitive for `Page` and `Settings`

## 12. Settings Navigation

Implementation reference:

- [src/panels/SettingsPanel.tsx](../src/panels/SettingsPanel.tsx)

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

## 13. Inspector Compact Controls

Implementation reference:

- [src/panels/InspectorControls.tsx](../src/panels/InspectorControls.tsx)

Spec:

- compact field height: `32px`
- compact field radius: `rounded-sm`
- labels: `11px`, medium
- inline unit triggers: `10px`
- compact pills: `10px`, medium

Rules:

- compact controls may be tighter than shared primitives
- they must still use the same token-backed border/background/focus language

## 14. Stage Chrome

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

### Sticky Indicators

Sticky guide overlays use dedicated CSS tokens so they stay readable across accent colors and both light/dark themes.

| Token | Role |
|---|---|
| `--editor-sticky-offset-guide-color` | border/line color for offset guide band |
| `--editor-sticky-offset-label-background` | pill background for offset labels |
| `--editor-sticky-offset-label-text` | text inside offset label pills |
| `--editor-sticky-padding-guide-color` | padding guide band color |
| `--editor-sticky-auto-guide-color` | auto-duration guide band color |
| `--editor-sticky-auto-label-background` | pill background for auto-duration labels |
| `--editor-sticky-auto-label-text` | text inside auto-duration label pills |
| `--editor-sticky-distance-label-text` | text inside distance/duration label pills |

Rules:

- do not hard-code guide colors in stage components; always use the tokens above
- token values are resolved by `resolveStickyGuideColors` and `resolveAccentSurfaceColors` in `src/lib/theme.ts` and injected as CSS custom properties on the root shell element
- the elevation inspector controls (Elevation toggle, Elevate this node toggle) follow the same Switch styling as all other boolean inspector controls — no custom accent or one-off color treatment

### Follow-link Popup

Implementation reference:

- [src/panels/FollowLinkPopup.tsx](../src/panels/FollowLinkPopup.tsx)

A compact action popup that appears directly below the selected link node's edit box. It is rendered with `position: absolute` inside the `stage-frame` container and anchored using `singleSelectionOverlay.bounds` — the same coordinate system as the selection overlay.

Spec:

- height: `40px`
- offset below node bottom edge: `8px`
- radius: `rounded-md`
- background: `editor-bg-surface`
- border: `editor-border-subtle`
- shadow: `shadow-md`
- button text: `editor-text-strong`, `12px`, `500`, `hover:underline`
- `pointer-events: auto` — required because the parent overlay layer disables pointer events

Label variants by link type:

| Link type | Label |
| --- | --- |
| Page link (resolved) | `→ Go to {page display name}` |
| Page link (broken) | `→ Broken page link` |
| External link | `↗ {href, truncated to 40 chars}` |
| Anchor / section | `↓ Jump to section` |

Behavior rules:

- visible only when a link node is selected and the popup is toggled on
- re-clicking the already-selected link node toggles the popup off
- hidden on drag start (`onMove`) to avoid stale positioning
- rendered inside `StageScene` alongside `SingleSelectionOverlay`; do not render it in the app shell

## 15. Z-Index

Rules:

- prefer DOM order and local stacking contexts first
- only use explicit layers for editor chrome where unavoidable
- do not introduce a new z-index without a named editor role

## 16. Token Authoring Rules

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

## 17. Source Of Truth

This guide is normative for editor chrome.

If implementation drifts:

- update tokens and components to match this document
- or update this document in the same change set if the system standard changed intentionally
- keep the design system showcase aligned in the same change set so the visual verification surface matches the written rule
