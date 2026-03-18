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
| Tight | `rounded-sm` | compact inline controls |
| Default | `rounded-md` | buttons, inputs, selects |
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
--editor-accent-shadow: 0 2px 8px rgba(22, 104, 255, 0.24);
```

Use accent for:

- selected stage nodes
- selected node labels
- checked switches
- focused fields
- active segmented buttons
- resize handles
- editor interaction emphasis

Do not use accent for:

- passive cards
- generic panel backgrounds
- large non-interactive fills

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

### 8.3 Dark Theme Tokens

Required baseline:

```css
--editor-surface-background: #1a2534;
--editor-surface-border: #47607a;
--editor-input-background: #162130;
--editor-input-border: #47607a;
--editor-input-text: #e6edf5;
--editor-select-content-background: #1a2534;
--editor-select-highlight-background: #2a3850;
--editor-switch-background: #334155;
--editor-switch-background-checked: #1668ff;
--editor-tooltip-background: #0f1722;
--editor-tooltip-border: #36495f;
--editor-tooltip-text: #d6e0ea;
--editor-tooltip-muted-text: #a5b3c2;
--editor-settings-nav-active-background: #223147;
--editor-settings-nav-active-text: #f3f7fc;
--editor-settings-nav-active-muted: #95a8bf;
```

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
- focused field border: accent blue
- checked switch track: accent blue
- selected node outline: accent blue
- selected node label fill: accent blue

Focus ring pattern:

```css
focus-visible:ring-2
focus-visible:ring-blue-500/20
```

or token-backed equivalent.

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
| default | accent blue | none | white |
| secondary | neutral subtle fill | none | strong text |
| outline | surface | subtle border | muted/strong text |
| ghost | transparent | none | muted text |
| destructive | light red tint | none | red text |

Focus:

- blue ring
- visible keyboard-only focus state

### 10.2 Inputs

Implementation reference:

- [src/components/ui/input.tsx](/Users/tombigel/Dev/Wix/sticky-playground/src/components/ui/input.tsx)

Spec:

- height: `36px`
- padding-x: `12px`
- radius: `rounded-md`
- border: `1px solid var(--editor-input-border)`
- background: `var(--editor-input-background)`
- text: `var(--editor-input-text)`
- placeholder: muted slate
- shadow: `shadow-sm`

Focus:

- border switches to accent blue
- `2px` low-alpha blue ring

### 10.3 Textareas

Implementation reference:

- [src/components/ui/textarea.tsx](/Users/tombigel/Dev/Wix/sticky-playground/src/components/ui/textarea.tsx)

Spec:

- same visual treatment as inputs
- min height: `80px`
- padding: `12px x 8px`
- radius: `rounded-md`

### 10.4 Selects

Implementation reference:

- [src/components/ui/select.tsx](/Users/tombigel/Dev/Wix/sticky-playground/src/components/ui/select.tsx)

Trigger:

- height: `36px`
- radius: `rounded-md`
- border + background same as inputs
- text: strong text
- chevron icon: muted text

Content:

- background: `--editor-select-content-background`
- border: subtle border
- radius: `rounded-md`
- shadow: medium surface shadow

Item highlight:

- background: `--editor-select-highlight-background`

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
