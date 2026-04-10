---
name: doc-triage
description: Audit planning documents — find stale briefs, completed tasks, roadmap drift, and archive candidates
user-invocable: true
argument-hint: "[--fix to archive and update roadmap]"
---

# Document Triage

This skill audits the project's planning documents for freshness, completeness, and roadmap alignment.

## What to check

### 1. Stale documents in docs/

For each `.md` file in `docs/` (excluding the style guide and spec):
- Check `git log -1 --format="%ci" -- <file>` for last modification date
- If last modified > 30 days ago and contains task items, flag for review
- Check if the document references files/functions that no longer exist

### 2. Completed phases still in docs/

Briefs and tasklists for completed phases should be in `archive/`, not `docs/`. Check:
- Any `TEXT_COMPONENT_PHASE_*` file where the phase is closed (check git log for "Close" or "closeout" commits)
- Any `*_PLAN.md` where all tasks are marked done
- Any `*_TASKLIST.md` where all items are checked

### 3. Roadmap status drift

Read `docs/PLAYGROUND_ROADMAP.md` summary table. For each item:
- If status is `Not started` or `Partially present`, check `git log --since="30 days ago" --grep="<item keyword>"` for recent work
- If status is `In progress`, check if there's been any commit activity in the last 14 days
- If status is `Done`, verify the detailed entry below matches

Flag items where git reality doesn't match roadmap status.

### 4. Orphaned references

Check that active docs don't reference archived files:
```
grep -rn "TEXT_COMPONENT_PHASE_1_5\|TEXT_COMPONENT_PHASE_1_7\|design-system-todo\|DESIGN_SYSTEM_CONVERGENCE_AUDIT" docs/
```

Check that the help docs manifest (`src/panels/generated/helpDocsManifest.json`) doesn't reference files that were moved to `archive/`.

### 5. Raw intake backlog

Check `docs/PLAYGROUND_ROADMAP.md` Raw Intake section for items that have been sitting unpromoted for a long time. Flag any that now have enough clarity to promote to Structured Roadmap.

## Output format

| Category | Document | Issue | Recommendation |
|---|---|---|---|
| Archive candidate | TEXT_COMPONENT_PHASE_X | Phase complete | Move to archive/ |
| Status drift | RI-07 | Says "Partially present" but Wave 1-2 done | Mark Done |
| Stale | SOME_PLAN.md | No commits in 60 days | Review or archive |
| Orphaned ref | PLAYGROUND_SPEC.md:42 | References archived file | Update reference |
| Manifest stale | helpDocsManifest.json | Lists archived file | Regenerate manifest |

If `$ARGUMENTS` contains `--fix`:
- Move completed phase docs to `archive/`
- Update roadmap statuses
- Fix orphaned references
- Regenerate help docs manifest if needed

## When to run

- After completing a phase or milestone
- Monthly as part of planning hygiene
- When `/maintenance` invokes it
