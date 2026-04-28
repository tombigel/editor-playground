---
name: wix-library-truth-audit
description: Generate and verify the canonical audit model for this repo's Wix animation libraries. Use when auditing shipped @wix/interact, @wix/motion, and @wix/motion-presets behavior, exports, types, source-map evidence, or upstream motion-preset rules.
user-invocable: true
---

# Wix Library Truth Audit

Use this skill when the task is to determine what the Wix animation libraries actually support.

## Workflow

1. Start from shipped code truth.
2. Use upstream `@wix/motion-presets` rules only as the next layer.
3. Use installed `@wix/interact` rules after that.
4. Treat docs as lowest priority.

## Commands

- Generate the canonical truth artifact:
  - `npm run audit:libraries`
- Main generator:
  - `scripts/extract-wix-library-truth.mjs`

## Canonical Outputs

- Generated truth:
  - `src/animations/libraryTruth.generated.ts`
- Thin helpers:
  - `src/animations/libraryTruth.ts`
- Discrepancy ledger:
  - `INTERACT_MOTION_USER_FACING_GAPS.md`

## Mandatory Audit Checks

- Mouse preset conflicts: `BounceMouse`, `SpinMouse`, `CustomMouse`
- Typed/exported split: `DVD`, `Blink`
- Missing code param in rules: `TurnScroll.rotation`
- Ongoing delay semantics vs `iterationDelay`
- `viewProgress` ignored params: `threshold`, `inset`
- Stale interact rule references: `GrowIn`, `GlitchIn`

## Output Rules

- If code and rules disagree, code wins and the discrepancy belongs in `INTERACT_MOTION_USER_FACING_GAPS.md`.
- If motion-preset rules and interact rules disagree on presets, motion-preset rules win unless shipped code disagrees.
- Do not infer support from docs alone.
