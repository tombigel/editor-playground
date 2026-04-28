---
name: wix-library-issues-maintainer
description: Maintain INTERACT_MOTION_USER_FACING_GAPS.md as the evidence-based discrepancy ledger for this repo's Wix animation audit. Use when adding, rewriting, or reclassifying findings from code-vs-rules drift.
user-invocable: true
---

# Wix Library Issues Maintainer

Use this skill when editing `INTERACT_MOTION_USER_FACING_GAPS.md`.

## Ledger Rules

- Every issue must have:
  - title
  - winning source
  - losing source(s)
  - discrepancy
  - user-facing impact
  - required action
- Keep the file focused on audit findings, not implementation history.
- Prefer grouped findings by discrepancy class over long narrative prose.

## Required References

- Generated truth:
  - `src/animations/libraryTruth.generated.ts`

## Do Not Do

- Do not treat docs as authoritative over code or rules.
- Do not silently drop conflicting presets; classify them.
- Do not leave stale findings unmarked once code or rules prove them wrong.
