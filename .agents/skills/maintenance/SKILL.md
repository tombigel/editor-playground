---
name: maintenance
description: Run a full maintenance pass — composes api-audit, design-system-check, doc-triage, and file-size-check
user-invocable: true
argument-hint: "[--fix to apply all auto-fixes] [--focus=api|design|docs|files to run a single check]"
---

# Maintenance Pass

This skill runs the full project maintenance audit. It composes the individual audit skills into one pass and produces a unified report.

## Execution order

### Phase 1: Read-only audit (always runs)

Run these checks and collect findings. Do NOT make changes yet.

1. **API-first compliance** (`/api-audit`)
   - Check export parity between documentApi and editorApi
   - Check API.md coverage against actual exports
   - Check type reference completeness

2. **Design system compliance** (`/design-system-check`)
   - Find hardcoded colors bypassing tokens
   - Find duplicated class strings
   - Check for missing design system components

3. **Document triage** (`/doc-triage`)
   - Find stale documents and archive candidates
   - Check roadmap status against git reality
   - Find orphaned references

4. **File size check** (`/file-size-check`)
   - Find files exceeding 500/800 line limits
   - Suggest split points for large files

If `$ARGUMENTS` contains `--focus=X`, only run the matching check.

### Phase 2: Report

Produce a unified report with findings grouped by severity:

```
## Maintenance Report — {date}

### Critical (blocks development or breaks correctness)
- ...

### High (should fix soon — drift accumulates)
- ...

### Medium (tech debt, not urgent)
- ...

### Low (nice to have)
- ...

### Summary
- API compliance: X violations, Y doc gaps
- Design system: X token bypasses, Y duplications
- Documents: X archive candidates, Y status drifts
- File sizes: X over 800, Y over 500
```

### Phase 3: Fix (only with --fix)

If `$ARGUMENTS` contains `--fix`, apply fixes in this order:
1. Archive completed docs
2. Update roadmap statuses
3. Add missing API.md entries
4. Replace hardcoded token values
5. Extract duplicated class strings

Commit each category separately with descriptive messages.

## When to run

- Weekly or bi-weekly as a hygiene check
- Before starting a new development phase
- After completing a milestone
- When the codebase feels like it's drifting from its documented state

## Related skills

| Skill | Purpose |
|---|---|
| `/api-audit` | API-first compliance only |
| `/design-system-check` | Design tokens and CSS only |
| `/doc-triage` | Planning documents only |
| `/file-size-check` | File size limits only |
| `/interaction-pattern` | Guide for building new interactive components |
