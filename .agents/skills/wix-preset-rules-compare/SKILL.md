---
name: wix-preset-rules-compare
description: Compare upstream @wix/motion-presets rules against installed @wix/interact rules and shipped package truth in this repo. Use when a preset exists in one source layer but not another, or when parameters or examples drift between rule sets.
user-invocable: true
---

# Wix Preset Rules Compare

Use this skill when a preset-level disagreement needs to be classified.

## Source Priority

1. Shipped code/runtime behavior
2. Upstream `@wix/motion-presets` rules
3. Installed `@wix/interact` rules
4. Docs

## Compare These Inputs

- Upstream motion preset rules:
  - `packages/motion-presets/rules/presets/*.md` via `gh`
- Installed interact rules:
  - `node_modules/@wix/interact/rules/*.md`
- Shipped truth:
  - `src/animations/libraryTruth.generated.ts`

## Classification Labels

- `code-missing-in-motion-rules`
- `motion-rules-missing-in-interact-rules`
- `rules-claim-not-in-code`
- `typed-but-not-exported`
- `stale-interact-rule-reference`
- `project-only gap`

## Expected Output

- Name the winning source.
- Name the losing source.
- State the exact mismatch.
- Add or update the corresponding entry in `INTERACT_MOTION_USER_FACING_GAPS.md`.
