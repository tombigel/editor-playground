---
name: implementation-plan
description: Use whenever the user asks for a plan, implementation plan, task list, roadmap, phased breakdown, prep wave, verification wave, clean-context subagents, parallelized work, or commit-by-task workflow. Produces repo-aware plans with bounded tasks, agent types, verification gates, and clean commit boundaries.
user-invocable: true
argument-hint: "[feature or fix request]"
---

# Implementation Plan

Use this skill to turn a medium or large request into an execution plan that can be implemented cleanly, especially when the user wants subagents, parallelism, or commits after each task.

## Core Shape

Every plan should be concrete enough to execute without re-planning:

- **Execution strategy**: state how work is split, what runs in parallel, and what commits stay sequential.
- **Prep wave**: read-only exploration tasks, parallelized where independent.
- **Code tasks**: one bounded change per task, with clear scope, implementation notes, verification, and commit message.
- **Verification wave**: read-only checks that can happen in parallel after the main changes.
- **Final gate**: docs/registry alignment if needed, focused tests, and the verification tier from `AGENTS.md`.

## Agent Use

For this repo, `AGENTS.md` planning defaults are standing authorization to include subagents when they materially improve the plan. Use them deliberately, not reflexively.

Prefer simple agents:

- `explorer`: read-only inspection, risk discovery, test discovery, registry/nav alignment, CSS or API drift checks.
- `worker`: bounded code changes with explicit file or module ownership.

Skip subagents for obvious Tier 0/Tier 1 fixes unless uncertainty is the main cost. A tiny local polish task should usually be handled by direct inspection, a small patch, and a focused check.

Parallelize only work that is independent:

- Good parallelism: separate read-only explorations, independent verification checks, disjoint worker file scopes.
- Avoid parallelism: commits, tightly coupled edits, tasks where one result is an immediate blocker for the next.

When assigning a worker, include:

- owned files/modules
- expected behavior
- tests to run
- instruction that other agents may be editing nearby files and they must not revert unrelated edits

## Verification Tiers

Classify each task using the `AGENTS.md` change tiers before selecting commands:

- **Tier 0**: trivial/local polish. Use diff review plus the narrowest cheap check that applies; no new tests, e2e, subagents, or full build by default.
- **Tier 1**: focused local behavior. Use nearby focused tests and lint touched source files; add tests only for changed behavior or reusable contracts.
- **Tier 2**: important functional change. Include docs/tests with focused suites plus typecheck or API/architecture checks as relevant.
- **Tier 3**: substantial or release-facing. End with `pnpm run build`.

Do not promote a task just because it touches multiple files when the extra file is a focused test or documentation note. Promote based on risk, subsystem breadth, and public behavior.

## Commit Budget

Include commits when the user requests them, when the plan is explicitly a commit-by-task workflow, or when the change series benefits from clean history. For tiny fixes, avoid requiring a commit in the plan unless requested; commit hooks bump versions and amend changelog, which is useful but not free.

## Task Contract

Each code task should include:

```markdown
## Task N: Short Name

**Agent type**
- `worker` simple coding agent

**Scope**
- `path/or/module`

**Implementation**
- Specific behavior changes
- Compatibility constraints
- Styling/API/docs expectations

**Verify**
- Verification tier and the focused command(s), if any

**Commit**
- `type(scope): concise message`, or `none unless requested` for tiny fixes
```

Keep task scopes small enough that staging only task-owned files is natural. If a task touches shared behavior, include tests and docs in that same task.

## Sequential Commit Workflow

For each code task in a commit-by-task workflow:

1. Check `git status --short`.
2. Apply only the task-owned change.
3. Run the tier-appropriate verification.
4. Stage only task-owned files.
5. Commit with a conventional commit message.
6. Continue to the next task only after the worktree is understood.

Do not bundle unrelated cleanup into a task commit. If verification finds a follow-up fix, add a new task or clearly attach it to the task that introduced the issue.

## Plan Template

```markdown
# {Project/Feature}: Agent Task List

## Execution Strategy
- Use clean-context subagents for bounded tasks when they materially reduce uncertainty.
- Prefer simple `explorer` agents for read-only checks and `worker` agents for scoped edits.
- Parallelize prep and independent verification; keep commits sequential.
- After each code task: run tier-appropriate verification; stage and commit only when the plan calls for commits.
- Final task runs `{focused check/build command for the selected tier}`.

## Parallel Prep Wave

**Agent A: `explorer`**
- Inspect ...
- Report exact files, contracts, and risks.

No commits in this wave.

## Task 1: ...

**Agent type**
- `worker` simple coding agent

**Scope**
- ...

**Implementation**
- ...

**Verify**
- ...

**Commit**
- `...`

## Parallel Verification Wave

**Agent D: `explorer`**
- Read-only check ...

No commits unless findings require a follow-up task.

## Final Acceptance
- Sequential commits exist for each task when the plan called for commits.
- Tier-appropriate focused tests/checks and any required final build pass, or unrelated pre-existing failures are recorded.
```

## Execution Notes

When the user says to implement the plan, follow the plan but let fresh codebase facts override stale assumptions. Keep the user updated as tasks complete, and preserve clean commit boundaries even if the implementation details shift.
