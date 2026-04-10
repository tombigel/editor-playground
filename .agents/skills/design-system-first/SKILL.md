---
name: design-system-first
description: Use when adding or changing editor-facing UI in this repo. Check AGENTS.md, the editor style guide, the design-system showcase, and the convergence audit before writing bespoke UI. Prefer reusing or extending src/components/ui, update shared demos when shared UI changes, and record justified exceptions instead of adding one-off editor CSS.
---

# Design System First

Use this skill for any editor-facing UI work:

- new panel or dialog UI
- new inspector or settings controls
- editor chrome styling changes
- component refactors that touch visual structure
- CSS cleanup related to shared UI contracts

## Required Workflow

1. Read [`docs/EDITOR_STYLE_GUIDE.md`](../../../docs/EDITOR_STYLE_GUIDE.md) for visual direction.
2. Read [`docs/SKILLS.md`](../../../docs/SKILLS.md) for available audit and development skills.
3. Run `/design-system-check` to find existing token violations and duplication in the area you're touching.
4. Inspect `src/components/ui` and `src/design-system` before creating local markup or CSS.

## Decision Order

Always choose the first valid option:

1. reuse an existing shared component
2. extend an existing shared primitive or composite
3. add a new shared component in `src/components/ui`
4. keep the UI specialized only when reuse would be fake

Do not add bespoke editor markup first and “share it later”.

## Required Follow-Through

- If shared UI changes, update the relevant design-system demo.
- If shared UI behavior or workflow changes, update docs/tests in the same change.
- Preserve light/dark parity and mixed-selection behavior where applicable.
- Prefer DS-owned props/variants over consumer-side class overrides.
- Prefer removing editor-only CSS overrides instead of adding new ones.

## Exception Rule

If you keep something specialized:

- make the reason explicit in a code comment and note it for the next `/maintenance` pass
- keep specialization local to the owning surface
- still reuse shared primitives where possible

## Color Picker Note

The color picker is a special case:

- prefer local wrapper cleanup only through documented wrapper props, host variants, and public `::part(...)` styling
- do not expand reliance on private shadow-DOM internals
- see [`docs/COLOR_PICKER_UPSTREAM_CONTRIBUTIONS.md`](../../../docs/COLOR_PICKER_UPSTREAM_CONTRIBUTIONS.md) before adding more picker customization
