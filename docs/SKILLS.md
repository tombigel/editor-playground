# Project Skills

This document describes the recurring maintenance and development skills available in this project. Each skill is a repeatable checklist that any contributor (human or AI) can follow.

Skills are available in this repo under `.agents/skills/`. Use `/skill-name` when the current agent environment exposes project skills interactively.

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

### `/ai-harness-audit` — AI Rules/API/Harness Alignment

Audits AI-facing changes across prompts, request routing, tool manifests, tool routers, provider adapters, draft approval, docs, tests, and security boundaries.

**What it catches:**

- Prompt/tool/router/API drift
- AI mutation paths that bypass draft approval or apply-time validation
- Local help/draft-control routes that accidentally call the model
- Missing docs/tests for changed AI behavior
- Provider/tool-loop risks such as malformed tool schemas or silent guardrail drops

**Source of truth:** `docs/API_AI.md`, `docs/PLAYGROUND_SPEC.md`, `src/ai/`, and `src/api/ai/`

**Run:** after changing AI rules, commands, APIs, provider adapters, request routing, or draft/apply behavior

### `/doc-triage` — Document Freshness

Audits planning documents for staleness, completed phases that should be archived, roadmap status drift, and orphaned references.

**What it catches:**

- Completed phase briefs/tasklists still in `docs/` (should be in `archive/`)
- Roadmap items whose status doesn't match git reality
- Active docs referencing archived files
- Help docs manifest listing moved files

**Source of truth:** `docs/PLAYGROUND_ROADMAP.md`, git history

**Run:** monthly, after completing milestones, or as part of `/maintenance`

### `/roadmap-entry` — Roadmap Entry Maintenance

Adds and updates `docs/PLAYGROUND_ROADMAP.md` items while keeping the summary table, raw intake, and structured roadmap entries aligned.

**What it provides:**

- Deterministic summary-table sorting
- New item creation with consistent RI ids and metadata
- Priority changes, `Next` marking, progress updates, and done closeout
- Long-description edits that keep summary notes short
- Split, merge, and grouping guidance for related roadmap tasks
- Alignment checks that pair with `/doc-triage` when roadmap status may have drifted from code or docs reality

**Source of truth:** `docs/PLAYGROUND_ROADMAP.md`

**Run:** whenever adding or changing roadmap entries, or before/after `/doc-triage --fix` changes roadmap status

### `/file-size-check` — Component Size Limits

Finds source files exceeding the line count limits in CLAUDE.md (500 = consider splitting, 800 = strong signal).

**What it catches:**

- Files over 800 lines that need splitting
- Files over 500 lines that are growing

**Source of truth:** `CLAUDE.md` (Component Size Limits section)

**Run:** after large features, during code review, or as part of `/maintenance`

## Development Skills

### `/version-bump` — Semver Version Bump

Guides manual minor or major version bumps for any of the four subsystem versions (Project, Document, API, Editor).

**What it provides:**

- What each subsystem version tracks
- When to use minor vs major for each (with concrete examples)
- The bump workflow: run `scripts/bump-version.mjs`, update CHANGELOG, commit
- Pre-commit hook behavior (expected patch bump on top of your manual bump)

**Source of truth:** `src/lib/version.ts`, `CHANGELOG.md`, `docs/API.md#versioning`

**Run:** before manually bumping a subsystem version

### `/interaction-pattern` — Interactive Component Guide

Provides the checklist and available primitives for building new interactive UI (popovers, panels, dialogs, dropdowns, draggables).

**What it provides:**

- Available shared hooks (`useEscapeKey`, `useClickOutside`)
- Available shared constants (`DARK_TOOLTIP_CLASS`)
- Available design system components (`PopoverSurface`, `Dialog`, `FloatingPanelShell`, etc.)
- Per-component-type checklist (what to use, what NOT to do)

**Run:** before building any new interactive component

### `/implementation-plan` — Clean Task Planning

Turns a medium or large request into an execution-ready plan with bounded tasks, optional clean-context subagents, parallel read-only waves, and tier-appropriate verification.

**What it provides:**

- A repeatable plan format with execution strategy, prep wave, code tasks, verification wave, and final acceptance
- Guidance for when to use `explorer` vs `worker` agents, including when not to use subagents for obvious small fixes
- Verification tiers so tiny polish can stop at diff review or a focused check while substantial work still ends with `pnpm run build`
- Sequential commit hygiene when the user or plan calls for commits

**Run:** when a request needs a detailed task list, clean commits, subagents, or parallel prep/verification. Do not use it to inflate a tiny local fix.

## Composite Skills

### `/maintenance` — Full Maintenance Pass

Composes all audit skills into a single pass with a unified report grouped by severity.

**Phases:**

1. Read-only audit (runs all 4 checks)
2. Report (grouped by Critical / High / Medium / Low)
3. Fix (only with `--fix` flag — archives docs, updates roadmap, adds API.md entries, replaces tokens)

**Run:** weekly/bi-weekly, before new development phases, after milestones

### `/design-system-first` — Design System Workflow Gate

Enforces the decision order for editor-facing UI work: reuse existing shared component > extend a primitive > add new shared component > keep specialized (with justification).

**What it provides:**

- Small-change path for obvious local polish so one-line token/class fixes do not require the full audit workflow
- Required workflow before substantial editor UI work (read style guide, check existing components)
- Decision order for reuse vs new code
- Follow-through requirements (update demos, preserve light/dark parity)
- Exception rule for justified specialization

**Relationship to other skills:**

- `/design-system-check` is the **after-the-fact audit** (finds violations)
- `/design-system-first` is the **before-you-start gate** (prevents violations)
- `/interaction-pattern` covers the **interaction behavior** side (hooks, dismiss patterns)

**Run:** automatically triggered when editing editor-facing UI, or invoke manually before starting UI work

## Adding New Skills

1. Create a directory under `.agents/skills/<skill-name>/`
2. Add a `SKILL.md` with YAML frontmatter (`name`, `description`, `user-invocable: true`)
3. Document the skill in this file
4. If the skill enforces a rule from `CLAUDE.md`, reference the specific section
