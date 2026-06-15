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
- **Final gate**: docs/registry alignment if needed, focused tests, and the project build/check command.

## Agent Use

For this repo, `AGENTS.md` planning defaults are standing authorization to include subagents when they materially improve the plan. Use them deliberately, not reflexively.

Prefer simple agents:

- `explorer`: read-only inspection, risk discovery, test discovery, registry/nav alignment, CSS or API drift checks.
- `worker`: bounded code changes with explicit file or module ownership.

Parallelize only work that is independent:

- Good parallelism: separate read-only explorations, independent verification checks, disjoint worker file scopes.
- Avoid parallelism: commits, tightly coupled edits, tasks where one result is an immediate blocker for the next.

When assigning a worker, include:

- owned files/modules
- expected behavior
- tests to run
- instruction that other agents may be editing nearby files and they must not revert unrelated edits

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
- Focused test command or nearest test surface

**Commit**
- `type(scope): concise message`
```

Keep task scopes small enough that staging only task-owned files is natural. If a task touches shared behavior, include tests and docs in that same task.

## Sequential Commit Workflow

For each code task:

1. Check `git status --short`.
2. Apply only the task-owned change.
3. Run focused tests.
4. Stage only task-owned files.
5. Commit with a conventional commit message.
6. Continue to the next task only after the worktree is understood.

Do not bundle unrelated cleanup into a task commit. If verification finds a follow-up fix, add a new task or clearly attach it to the task that introduced the issue.

## Plan Template

```markdown
# {Project/Feature}: Agent Task List

## Execution Strategy
- Use clean-context subagents for bounded tasks when authorized.
- Prefer simple `explorer` agents for read-only checks and `worker` agents for scoped edits.
- Parallelize prep and independent verification; keep commits sequential.
- After each code task: run focused tests, stage only task files, commit, then continue.
- Final task runs `{build/check command}`.

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
- Sequential commits exist for each task.
- Focused tests and final build/check pass, or unrelated pre-existing failures are recorded.
```

## Execution Notes

When the user says to implement the plan, follow the plan but let fresh codebase facts override stale assumptions. Keep the user updated as tasks complete, and preserve clean commit boundaries even if the implementation details shift.
