---
name: design-system-first
description: Use when adding or changing editor-facing UI in this repo. Check AGENTS.md, the editor style guide, the design-system showcase, and the convergence audit before writing bespoke UI. Prefer reusing or extending src/components/ui, update shared demos when shared UI changes, and record justified exceptions instead of adding one-off editor CSS.
---

# Design System First

Use this skill for editor-facing UI work that changes structure, shared components, interaction patterns, or visual contracts:

- new panel or dialog UI
- new inspector or settings controls
- editor chrome styling changes
- component refactors that touch visual structure
- CSS cleanup related to shared UI contracts

For Tier 0 local polish from `AGENTS.md` (for example a one-line token/class swap to match an adjacent label), use the small-change path below instead of the full workflow.

## Small-Change Path

For obvious Tier 0/Tier 1 visual fixes:

1. Inspect the nearby component and existing style pattern.
2. Reuse the existing token/class/component path.
3. Verify with diff review plus file-scoped lint or the nearest focused test only if behavior changed.
4. Do not run `/design-system-check`, update demos, add tests, spawn agents, or run a full build unless the local diff reveals shared-contract risk.

## Required Workflow

Use this full workflow for new UI, shared UI changes, repeated patterns, or uncertain visual decisions:

1. Read [`docs/EDITOR_STYLE_GUIDE.md`](../../../docs/EDITOR_STYLE_GUIDE.md) for visual direction.
2. Read [`docs/SKILLS.md`](../../../docs/SKILLS.md) for available audit and development skills.
3. Run `/design-system-check` to find existing token violations and duplication in the area you're touching when the change is shared, repeated, or broader than Tier 0 local polish.
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
- Treat the design-system showcase as the canonical representation of public design options, not a place for local one-off overrides. If a showcase needs a visual state such as mixed, compact, selected, disabled, icon-only, or density-specific styling, fold that state into the shared component API or documented shared component contract first, then render that public option in the showcase.
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
