# Color Picker Upstream Contribution Plan

This document records the interfaces missing from the external `hdr-color-input` component that currently force Editor Playground to rely on implementation details.

It began as a companion to the design-system convergence audit (now closed and archived at `archive/DESIGN_SYSTEM_CONVERGENCE_AUDIT.md`), focused specifically on the shared color-picker primitive.

## Current Local Usage

Our shared wrapper lives at [`src/components/ui/color-picker.tsx`](../src/components/ui/color-picker.tsx).

Current editor consumers:

- [`src/panels/controls/ColorAndEffects.tsx`](../src/panels/controls/ColorAndEffects.tsx)
- [`src/panels/settings/SettingsShared.tsx`](../src/panels/settings/SettingsShared.tsx)
- the design-system demo in [`src/design-system/sections/base/ColorAndEffectDemos.tsx`](../src/design-system/sections/base/ColorAndEffectDemos.tsx)

We use the component in two practical modes:

- compact swatch trigger for inspector color fields
- compact swatch trigger for custom accent-color selection

Both uses want the same high-level editor contract:

- square swatch trigger sized like other editor controls
- token-driven panel surface and spacing
- optional alpha support
- stable close/open behavior when used inside editor popovers and dense inspector UI

## What The Upstream Package Officially Exposes

Based on the bundled package docs in `node_modules/hdr-color-input`:

- attributes / properties:
  - `value`
  - `theme`
  - `no-alpha`
  - `colorspace`
  - readonly `gamut`
  - readonly `contrastColor`
- methods:
  - `show()`
  - `close()`
  - `setAnchor(element)`
- events:
  - `change`
  - `open`
  - `close`
- CSS parts:
  - `trigger`
  - `chip`
  - `input`
  - `error`
  - `panel`
  - `output`
  - `gamut`
  - `controls`
  - `area`

These are good baseline hooks, but they are not enough for the editor design-system level of control we need.

## Why Our Local Wrapper Is Still Fragile

Today the wrapper combines three layers:

1. public API usage
   `value`, `theme`, `noAlpha`, `close()`, `change/open/close`
2. public styling via `::part(...)`
   see [`src/styles/inspector.css`](../src/styles/inspector.css)
3. private shadow-DOM styling injection
   see `EDITOR_COLOR_PICKER_SHADOW_STYLE` in [`src/components/ui/color-picker.tsx`](../src/components/ui/color-picker.tsx)

The third layer targets internal class names such as:

- `.preview`
- `.tools`
- `.copy-btn`
- `.eyedropper-btn`
- `.copy-message`
- `.control`
- `.num-wrapper`
- `.area-thumb`

Those are not part of the documented public API. Any upstream internal refactor could break our editor styling without a semver-visible API change.

## Contributions Needed Upstream

### 1. More CSS Parts For Panel Internals

The current parts cover only the coarse regions. We need stable parts for the interactive internals we currently style through injected shadow CSS:

- preview container
- tools/actions container
- copy button
- eyedropper button
- copy confirmation message
- individual control row
- numeric input wrapper
- area thumb / slider thumb if not already styleable enough through native selectors

Suggested part names:

- `preview`
- `tools`
- `copy-button`
- `eyedropper-button`
- `copy-message`
- `control`
- `control-number`
- `area-thumb`

### 2. Stable CSS Custom Properties For Layout And Sizing

The editor needs to control density without rewriting internal structure.

Useful upstream variables would include:

- panel width
- panel padding
- controls gap
- control row column layout
- action button size
- output badge sizing
- gamut badge sizing
- preview padding / radius

Example needs from our current wrapper:

- compact panel width around `15.5rem`
- tighter control rows than the library default
- small circular tool buttons
- token-driven pill treatment for output and gamut

### 3. Explicit Feature Toggles For Optional UI

The current component always brings along UI that many design-system integrations want to control more directly.

Requested toggles:

- hide inline text input
- hide output label
- hide gamut badge
- hide copy button
- hide eyedropper button
- swatch-only trigger mode

These could be attributes, properties, or a single `ui` configuration property.

### 4. Better Compact / Embedded Mode Support

The editor is embedding the picker inside dense inspector rows, not using it as a generic standalone field.

Upstream could support a documented compact mode that guarantees:

- small trigger size
- denser panel spacing
- tighter controls layout
- reduced visual chrome suitable for design tools

### 5. Clearer Open / Trigger Lifecycle Hooks

Our wrapper currently does some defensive event work to keep value sync and close behavior stable.

Useful upstream improvements:

- a documented `toggle()` method
- clearer guarantees about when `value` is read before opening
- stable trigger behavior when the host is clicked while already open
- optional configuration for open/close anchoring and re-open behavior

## Recommended Upstream Issue / PR Sequence

1. Open an issue describing the current documented API gap:
   compact design-system integrations need more parts and more feature toggles.
2. Propose additional parts and variables first.
3. Only after those styling seams are accepted, propose compact-mode or feature-toggle additions.
4. If upstream prefers minimal API growth, at least land the extra parts so external wrappers can stop targeting private classes.

## What We Should Still Fix Locally

Even before upstream changes, there is local cleanup worth doing:

- keep all consumer sizing/shape contracts inside our `ColorPicker` wrapper
- use wrapper props/variants instead of long consumer class strings
- prefer `::part(...)` styling over injected shadow CSS wherever the public API allows it
- keep all unavoidable private styling clearly isolated in the wrapper so consumers stay clean

## Decision

Recommendation:

- do local cleanup for host variants and consumer ergonomics now
- do not fork immediately
- upstream the missing styling interfaces first
- only fork if the upstream component cannot or will not expose the needed seams
