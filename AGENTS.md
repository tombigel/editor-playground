# Project Rules

These rules apply to all AI assistants and human contributors working on this codebase.

## Planning Extension

These project rules extend any global planning defaults.

When planning work in this repo:

- Use the `implementation-plan` skill when a plan, task list, phased breakdown, or implementation roadmap is requested.
- Include API-first boundaries in the plan: model/document API work before editor API work, and editor UI only after the core operation is available through `src/api/`.
- For editor-facing UI changes, include design-system/style-guide review and prefer the `design-system-first` skill when available.
- For important functional changes, include the matching `docs/PLAYGROUND_SPEC.md` and automated test updates in the same task.
- Keep tasks scoped so each implementation task can be verified and committed independently.
- End substantial or multi-file implementation plans with `pnpm run build` as the final gate.

## Architecture Boundary

Maintain strict separation between the model, API, editor state, stage renderer, and site renderer so each layer can be replaced independently without requiring changes to the others.

## API-First Principle

Every feature must be achievable through the `src/api/` layer without the editor UI. When adding new functionality:

1. Implement the core operation as a pure `DocumentModel → DocumentModel` function in `src/api/documentApi.ts`
2. Then wrap it in `src/api/editorApi.ts` with selection/history concerns
3. The editor UI calls the `editorApi` version; scripts and tests can use `documentApi` directly

Nothing should be only possible through the editor.

## Export Style

Prefer named exports over default exports.

## Component Size Limits

Keep source files focused. As a guideline:

- Files exceeding 500 lines should be considered for splitting
- Files exceeding 800 lines are a strong signal to split

When a file grows beyond these limits, split it into focused submodules with a barrel re-export for backward compatibility.

## Editor Style Guide

Use [EDITOR_STYLE_GUIDE.md](./docs/EDITOR_STYLE_GUIDE.md) as the source of truth for editor chrome visual language and token direction.

When changing editor-facing UI styling, align the change to the style guide first:

- colors and accent usage
- light/dark parity
- borders, radii, and shadows
- typography and control sizing
- interaction states and focus treatment

Do not introduce one-off editor styling that conflicts with the guide when an existing token or role can be reused.

## Subsystem Structure

Keep subsystem structure explicit and consistent:

- tests belong in a `tests/` subfolder inside their subsystem
- shared subsystem types belong in a `types/` subfolder inside their subsystem
- prefer a unified `types/index.ts` per subsystem unless there is a real subdomain split

Do not scatter shared tests beside runtime files when they belong to one subsystem test surface.
Do not keep shared exported subsystem types inline in implementation files when they can live in the subsystem `types/` surface.

## Documentation And Test Gate

For every important functional change or addition, update documentation in the same change set.

Required files:

- `docs/PLAYGROUND_SPEC.md`: update behavior/model/UX descriptions.
- automated tests: every testable behavior change must update existing tests or add new ones in the same change set.

Important functional change includes (non-exhaustive):

- interaction behavior changes (drag, resize, snap, undo/redo, keyboard shortcuts)
- model/state semantics changes
- sticky computation or rendering behavior changes
- inspector/debug controls that affect workflow or state

When no doc change is needed, explicitly confirm why in the final summary.
When a change is not reasonably testable, explicitly confirm why in the final summary.

## Build Gate

For every substantial or multi-file task, run `pnpm run build` before finishing the task.

- treat build failures as blockers for completion
- fix build issues introduced by the change before handing off
- if a pre-existing unrelated build failure prevents completion, call it out explicitly in the final summary with the failing area

## Project Skills

Recurring audit and development skills are defined in `.agents/skills/` and documented in [docs/SKILLS.md](./docs/SKILLS.md).

Key skills:

- `/maintenance` — full maintenance pass (composes all audit skills)
- `/api-audit` — API-first compliance check
- `/design-system-check` — design token and CSS audit
- `/design-system-first` — design-system workflow gate before building editor UI
- `/doc-triage` — planning document freshness check
- `/file-size-check` — component size limit enforcement
- `/implementation-plan` — execution-ready plans with bounded tasks and clean commits
- `/interaction-pattern` — guide for building new interactive components
- `/roadmap-entry` — roadmap item creation, status, priority, and sorting
- `/version-bump` — manual minor/major version bump workflow

Run `/maintenance` periodically to catch drift. Run `/interaction-pattern <type>` before building new interactive UI.

## Commit Messages

All commits must follow [Conventional Commits](https://www.conventionalcommits.org/) format. Commitlint enforces this via a `commit-msg` hook.

Format: `type(optional-scope): description`

Allowed types:

| Type | Changelog section | When to use |
| --- | --- | --- |
| `feat` | Added | New feature or capability |
| `fix` | Fixed | Bug fix |
| `refactor` | Changed | Code restructuring, no behavior change |
| `style` | Changed | Formatting, CSS, visual polish |
| `perf` | Changed | Performance improvement |
| `docs` | Changed | Documentation only |
| `test` | Changed | Adding or updating tests |
| `build` | Changed | Build system or dependency changes |
| `ci` | Changed | CI/CD changes |
| `chore` | Changed | Maintenance, tooling, config |

The first line of each commit message becomes a bullet in `CHANGELOG.md` under `[Unreleased]`, categorized automatically by prefix. Write the description as a user-facing change note, not a code-level detail.

When a minor or major version bump is run (`/version-bump`), the `[Unreleased]` section is converted to a versioned entry.

## Archived Documents

Files under `archive/` are historical records only. Do not read, reference, or act on them unless explicitly asked. They reflect past state and may contradict current code or active plans.
