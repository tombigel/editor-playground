---
name: roadmap-entry
description: Add or update docs/PLAYGROUND_ROADMAP.md entries with deterministic summary-table sorting, item creation, priority changes, Next marking, progress/done updates, long-description edits, split/merge/group handling, and doc-triage alignment checks.
user-invocable: true
argument-hint: "[add|update|sort|next|progress|done|split|merge|group] [RI id or title]"
---

# Roadmap Entry

Use this skill for focused edits to `docs/PLAYGROUND_ROADMAP.md`: adding items, updating metadata, changing priority, marking work next/in progress/done, editing long descriptions, and restructuring related tasks.

For broad planning cleanup, combine with `/doc-triage`. Do not read or rely on `archive/` unless the user explicitly asks.

## Roadmap Invariants

Every active roadmap item should stay aligned across three places:

1. `Summary Table`: one row with the RI id, status, short linked name, priority marker, type, owner lane, and short notes.
2. `Raw Intake`: the source idea, preserving user wording when possible.
3. `Structured Roadmap`: the full item under the matching priority and type section.

Keep these fields consistent between the table and structured item:

- `Type`: `Bug`, `UX`, `Feature`, `Platform`, `Refactor`, `Infra`, or `Research`
- `Owner lane`: `Human`, `LLM`, `Shared`, or `Unknown`
- `Status`: `Not started`, `Partially present`, `Needs audit`, `Blocked`, `In progress`, `Done`, or `Deferred`
- `Source`: one or more RI ids
- `Dependencies`: optional, but use when order matters

The table link anchor must match the structured item heading.

## Deterministic Workflow

1. Read the relevant roadmap section before editing.
2. Check for an existing RI that should be updated instead of creating a duplicate:
   ```sh
   rg -n "keyword|RI-[0-9]+" docs/PLAYGROUND_ROADMAP.md
   ```
3. Apply the smallest edit that keeps all three roadmap surfaces aligned.
4. Sort the summary table:
   ```sh
   node .agents/skills/roadmap-entry/scripts/sort-summary-table.mjs
   ```
5. Review the diff and verify links/status/priority/type/source still line up.

Use `--check` in review or CI-style passes:

```sh
node .agents/skills/roadmap-entry/scripts/sort-summary-table.mjs --check
```

## Adding An Item

- Allocate the next unused `RI-NN` by scanning all roadmap ids.
- Add the source idea to `Raw Intake`.
- Add a summary-table row with a concise linked name.
- Add the structured entry under the chosen priority and type.
- Include `Why it matters`, `Current state`, and `Next move` unless the item is already done.
- Keep `Current state` short and grounded in `PLAYGROUND_SPEC.md`, `API.md`, or code reality.

For a user-reported maintenance task, prefer `Type: UX` when the issue is about authoring behavior, `Bug` when current behavior contradicts expected existing behavior, and `Refactor` only when the work is primarily internal cleanup.

## Updating Priority Or Next

- `Mark as next`: set the summary priority to `🔴 Next`; add or keep the item in `Active Stage` if it is part of the current active workstream; keep the structured entry in the appropriate priority section unless the roadmap has an explicit `Priority: Next` section.
- `Update priority`: update the summary priority marker and move the structured entry to the matching priority section.
- Priority order for sorting is: `🔴 Next`, `🟠 High`, `🔵 Low`, `⚪ Optional`, then unknown markers.
- If an item becomes blocked, set `Status: Blocked` and add the blocker in `Current state` or `Dependencies`.

## Marking Progress Or Done

- `In progress`: update summary status, structured `Status`, and `Current state` with the current scope. Keep `Next move` focused on the next concrete action.
- `Partially present`: use when meaningful pieces exist but the planned behavior is incomplete.
- `Needs audit`: use when the roadmap may be stale and code reality must be checked.
- `Done`: update summary status and structured `Status`; replace or amend `Current state` with the delivered behavior, tests/docs if relevant, and delivered sha when available.
- Do not delete raw intake just because an item is done.

## Updating Long Descriptions

- Edit the structured item, not only the summary table.
- Keep the summary note short; put nuance in `Why it matters`, `Current state`, `Target behavior`, `Next move`, or a small custom field.
- Prefer present-tense facts for `Current state` and action language for `Next move`.
- If the description changes functional scope, check whether `docs/PLAYGROUND_SPEC.md` or API docs also need a follow-up note.

## Split, Merge, Or Group

- `Split`: keep the original RI as the source/umbrella when useful, then create child items with new ids or letter suffixes only when the relationship is obvious. Add `Relationship` or `Dependencies` fields so the split is traceable.
- `Merge`: choose one canonical RI, update its `Source` to include merged ids, and mark duplicates as merged/deferred instead of deleting history.
- `Group`: create or update an umbrella item only when it helps planning. Keep actionable child rows in the summary table if they can progress independently.
- After restructuring, sort the table and scan for stale anchors.

## Alignment With Doc Triage

When the user asks whether the roadmap matches reality, or when changing status based on completed work:

- Use `/doc-triage` behavior: inspect git history, active docs, and code paths.
- Check recent activity with `git log --oneline --grep="<keyword>"` and targeted `rg`.
- Verify `Done` items have a detailed entry that reflects delivered behavior.
- Verify `In progress` items have recent activity or a clear next move.
- Flag stale docs, orphaned references, or status drift instead of guessing.
