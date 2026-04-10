---
name: api-audit
description: Audit API-first compliance — find editor-only operations missing documentApi counterparts and API.md gaps
user-invocable: true
argument-hint: "[--fix to also update API.md]"
---

# API-First Compliance Audit

This skill enforces the project's API-first principle from CLAUDE.md: every feature must be achievable through the `src/api/` layer without the editor UI.

## What to check

### 1. Export parity between documentApi and editorApi

Read `src/api/editorApi.ts` and catalog every mutation function (anything that takes `EditorState` and returns `EditorState` that modifies `state.document`).

For each editor mutation, verify it has a pure `documentApi` counterpart:
- Editor `insertWrapper` -> documentApi `insertContainerDoc`
- Editor `updateTextField` -> documentApi `setTextNodeContentDoc`
- etc.

**Exceptions** (editor-only by design, no counterpart needed):
- Selection operations (`selectNode`, `clearSelection`, `toggleNodeSelection`, `selectManyNodes`)
- State lifecycle (`createInitialState`, `loadPersistedState`, `persistState`, etc.)
- Stage navigation (`getStageSelectableNodeIds`, `getAdjacentStageSelection`)
- Page switching (`setActivePage`) — this is view state, not document mutation
- Wrapper role promotion flow (`requestPromoteWrapperRole`, `confirmPromoteWrapperRole`, `cancelPromoteWrapperRole`) — editor workflow state

Flag any editor mutation that modifies `state.document` but has no documentApi equivalent.

### 2. API.md coverage

Read `docs/API.md` and cross-reference against actual exports:

```
Files to check:
- src/api/documentApi.ts
- src/api/editorApi.ts
- src/api/pageApi.ts
- src/api/fontApi.ts
- src/api/siteApi.ts
- src/api/editorViewApi.ts
- src/api/dragDropApi.ts
- src/api/animationApi.ts
- src/api/textConversion.ts
- src/api/textMerge.ts
- src/api/textMarkdown.ts
- src/model/defaultFactories.ts (public factory exports)
```

For each file, grep for `export function`, `export const`, and `export type`, then verify each appears in API.md.

### 3. Type reference completeness

Check that all exported types from `src/model/types/index.ts`, `src/model/types/site.ts`, and `src/animations/types/index.ts` have entries in the Type Reference section of API.md.

## Output format

Report as a table:

| Category | Item | Status | File |
|---|---|---|---|
| Missing documentApi counterpart | `someEditorFunction` | VIOLATION | editorApi.ts:42 |
| Missing from API.md | `someExport` | GAP | documentApi.ts:100 |
| Missing type docs | `SomeType` | GAP | types/index.ts:55 |

If `$ARGUMENTS` contains `--fix`, also update `docs/API.md` to add missing entries with correct signatures.

## When to run

- After merging a feature branch
- Before a maintenance pass
- When `/maintenance` invokes it
