---
name: wix-upgrade-impact-check
description: Use when upgrading @wix/interact, @wix/motion, or @wix/motion-presets and you need to decide whether this repo needs code, audit, truth, or ledger changes by comparing changelog, docs, shipped code, and rules.
user-invocable: true
---

# Wix Upgrade Impact Check

Use this skill when the task is to decide whether upgrading `@wix/interact`, `@wix/motion`, or `@wix/motion-presets` requires code or audit changes in this repo.

## Scope

Check all three projects:

1. `@wix/interact`
2. `@wix/motion`
3. `@wix/motion-presets`

For each project, compare:

1. changelog / release notes
2. docs
3. shipped code and public types
4. rules

## Trust Order

1. Shipped code/runtime behavior
2. `@wix/motion-presets` rules
3. `@wix/interact` rules
4. Docs and changelog text

## Workflow

1. Identify the currently installed versions from `package.json` and `node_modules`.
2. Identify the target upgrade version from the user request or npm.
3. Read the relevant changelog or release notes for all three projects.
4. Compare shipped exports, public types, and source-map `sourcesContent` between current and target versions.
5. Compare upstream `@wix/motion-presets` rules against installed `@wix/interact` rules.
6. Inspect this repo for code paths coupled to the changed APIs, rules, presets, params, or docs.
7. Record any required repo changes and any user-facing discrepancy.

## Repo Files To Check

- `scripts/extract-wix-library-truth.mjs`
- `src/animations/libraryTruth.generated.ts`
- `src/animations/libraryTruth.ts`
- `src/animations/animationApi.ts`
- `src/animations/animationRuntime.ts`
- `src/api/animationApi.ts`
- `src/panels/inspector/AnimationSection.tsx`
- `INTERACT_MOTION_USER_FACING_GAPS.md`

## Required Output

Produce a short upgrade-impact report with:

1. version delta per package
2. behavior or rule changes that matter here
3. exact repo files that need edits
4. required truth regeneration or ledger updates
5. validation commands to run

## Validation

- `npm run audit:libraries`
- `npm run build`
