# Project Skills

This document describes the recurring maintenance and development skills available in this project. Each skill is a repeatable checklist that any contributor (human or AI) can follow.

Skills are also available as Claude Code slash commands via `.claude/skills/`. Use `/skill-name` in Claude Code to run them interactively.

## Audit Skills

### `/api-audit` — API-First Compliance

Checks that every editor mutation has a pure `documentApi` counterpart and that `docs/API.md` covers all public exports.

**What it catches:**
- Editor-only operations that violate the API-first principle
- Exports missing from API.md
- Types missing from the Type Reference

**Source of truth:** `CLAUDE.md` (API-First Principle section)

**Run:** after merging features, before releases, or as part of `/maintenance`

### `/design-system-check` — Design Token Usage

Audits editor UI for hardcoded colors bypassing the CSS token system, duplicated class strings, and missing design system components.

**What it catches:**
- Tailwind `slate-*` classes in components that should use `--editor-*` tokens
- Hardcoded `rgba()` or `#hex` in stylesheets
- Class strings duplicated 3+ times (like the tooltip pattern)
- UI patterns that should use existing design system components

**Source of truth:** `docs/EDITOR_STYLE_GUIDE.md`, `src/styles/variables.css`

**Run:** after touching editor UI, before releases, or as part of `/maintenance`

### `/doc-triage` — Document Freshness

Audits planning documents for staleness, completed phases that should be archived, roadmap status drift, and orphaned references.

**What it catches:**
- Completed phase briefs/tasklists still in `docs/` (should be in `archive/`)
- Roadmap items whose status doesn't match git reality
- Active docs referencing archived files
- Help docs manifest listing moved files

**Source of truth:** `docs/PLAYGROUND_ROADMAP.md`, git history

**Run:** monthly, after completing milestones, or as part of `/maintenance`

### `/file-size-check` — Component Size Limits

Finds source files exceeding the line count limits in CLAUDE.md (500 = consider splitting, 800 = strong signal).

**What it catches:**
- Files over 800 lines that need splitting
- Files over 500 lines that are growing

**Source of truth:** `CLAUDE.md` (Component Size Limits section)

**Run:** after large features, during code review, or as part of `/maintenance`

## Development Skills

### `/interaction-pattern` — Interactive Component Guide

Provides the checklist and available primitives for building new interactive UI (popovers, panels, dialogs, dropdowns, draggables).

**What it provides:**
- Available shared hooks (`useEscapeKey`, `useClickOutside`)
- Available shared constants (`DARK_TOOLTIP_CLASS`)
- Available design system components (`PopoverSurface`, `Dialog`, `FloatingPanelShell`, etc.)
- Per-component-type checklist (what to use, what NOT to do)

**Run:** before building any new interactive component

## Composite Skills

### `/maintenance` — Full Maintenance Pass

Composes all audit skills into a single pass with a unified report grouped by severity.

**Phases:**
1. Read-only audit (runs all 4 checks)
2. Report (grouped by Critical / High / Medium / Low)
3. Fix (only with `--fix` flag — archives docs, updates roadmap, adds API.md entries, replaces tokens)

**Run:** weekly/bi-weekly, before new development phases, after milestones

## External / Extension Skills

These skills are provided by the Claude Code VS Code extension or personal configuration, not by the project repo. They may reference project conventions but aren't version-controlled here.

### `design-system-first` (VS Code extension)

Triggers proactively when adding or changing editor-facing UI. Checks the editor style guide, design-system showcase, and shared components before allowing bespoke UI.

**Relationship to project skills:**
- Overlaps with `/design-system-check` (which is an on-demand audit) and `/interaction-pattern` (which is a build guide)
- `design-system-first` fires automatically during editing; the project skills are invoked manually
- If `design-system-first` references stale files (e.g. archived convergence audit), the project skills are the authoritative source

## Adding New Skills

1. Create a directory under `.claude/skills/<skill-name>/`
2. Add a `SKILL.md` with YAML frontmatter (`name`, `description`, `user-invocable: true`)
3. Document the skill in this file
4. If the skill enforces a rule from `CLAUDE.md`, reference the specific section
