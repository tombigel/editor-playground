---
name: ai-harness-audit
description: Audit AI rules, prompts, tools, APIs, command routing, and harness changes for alignment, missing tests/docs, and security or mutation-boundary issues
user-invocable: true
argument-hint: "[changed files, feature branch, or --fix for docs/test suggestions only]"
---

# AI Harness Audit

Use this skill after any change that touches AI-facing behavior: system prompts, tool manifests, AI query/mutation APIs, model-provider adapters, conversation state, request routing, local command handling, history controls, draft approval, help routing, or docs describing these surfaces.

## Audit Goal

Confirm the AI stack stays aligned end to end:

```
user request -> local request router -> model prompt/history -> provider adapter
  -> tool manifest -> tool router -> API validation -> draft storage
  -> explicit approve/apply path -> docs/tests
```

## What To Check

### 1. Changed Surface Inventory

Inspect the diff first. Classify each touched AI change as one or more:

- **Prompt/rules:** `src/ai/systemPrompt.ts`
- **Tool contract:** `src/api/ai/toolManifest.ts`, `src/api/ai/types/`
- **Tool routing/harness:** `src/ai/toolRouter.ts`, `src/ai/requestRouting.ts`, `src/panels/ai/useAiChat.ts`
- **Provider protocol:** `src/ai/providers/`
- **Draft/apply path:** `src/ai/conversationStore.tsx`, `src/api/ai/commands.ts`, `src/api/ai/validation.ts`, `src/api/editorApi.ts`, `src/panels/AiPanel.tsx`, `src/panels/ai/AiDraftDiffCard.tsx`
- **Help/history/local routes:** `src/panels/helpDocs.ts`, `src/panels/HelpDialog.tsx`, app-shell panel wiring, undo/redo dispatch callbacks
- **Docs/tests:** `docs/AI_CONVERSATION_GUIDE.md`, `docs/API_AI.md`, `docs/API.md`, `docs/API_EDITOR.md`, `docs/PLAYGROUND_SPEC.md`, nearby tests

Do not assume a prompt-only change is isolated; check whether the real tool/API/harness behavior still matches it.

### 2. Prompt, Tool, And Router Alignment

Verify:

- Every tool named in the system prompt comes from `AI_TOOL_MANIFEST`.
- Every manifest tool is allowlisted and implemented in `routeToolCall`.
- Tool parameter descriptions match router argument validation and `AiDocumentCommand` types.
- Query tools are read-only and mutation tools only return drafts.
- Direct-operation/context enrichment instructions match the actual request-routing behavior.
- Fuzzy/ambiguous requests have a clarification path instead of unsafe guessing.

Flag any drift as a blocker. Examples:

- Prompt says the model can move selections, but only `setRect` exists and no context is injected.
- Manifest accepts a subtype vocabulary that the router rejects.
- Router accepts an argument shape not documented in the manifest.

### 3. Mutation And Approval Security

Verify the safety boundary remains intact:

- `src/ai/` does not import from `src/app/`.
- Tool routing never calls `applyAiCommands` or `applyAiDocumentCommands`.
- Mutation tool calls are validated before being staged.
- Approved drafts are revalidated against the current document at apply time.
- Applying a draft still goes through the single UI/app-shell path and creates one undoable entry.
- Local draft-control phrases (`approve`, `make the change`, `reject`, `cancel`) cannot apply anything unless a pending draft exists.
- Local history-control phrases (`undo`, `revert`, `cancel last change`, `redo`, `undo the undo`) dispatch only the editor's existing undo/redo actions and never simulate history by inventing inverse AI mutations.
- Help/local routes do not require a provider key and do not accidentally send local-only requests to a model.

Run `pnpm run check:architecture` when any AI harness or draft/apply file changed.

### 4. Provider And Tool-Loop Risks

For provider or chat-loop changes, check:

- OpenAI-compatible message/tool shapes remain valid for OpenRouter.
- System/context messages are ordered intentionally.
- Tool-call streaming still accumulates fragmented arguments safely.
- Query tool results are recorded as tool messages, not drafts.
- Mutation tool results are staged as drafts, not exposed as raw applied state.
- Retry/fallback behavior preserves responding model provenance.
- Token/rate/batch guardrails still surface explicit errors rather than silent drops.

### 5. Docs And Tests Alignment

Required docs for important behavior changes:

- `docs/API_AI.md` for AI query/mutation/request-routing behavior.
- `docs/AI_CONVERSATION_GUIDE.md` for user-facing AI conversation capabilities, prompt guidance, local chat commands, and currently unsupported prompt examples. Update it on every AI-facing behavior change.
- `docs/API.md` when public API exports or tool surfaces change.
- `docs/API_EDITOR.md` when approval/history/editor wrapper behavior changes.
- `docs/PLAYGROUND_SPEC.md` for user-visible AI panel, help-routing, request-routing, or draft UX changes.

Required tests by change type:

- Request routing: unit tests for command/help/draft-control classification.
- Prompt/context enrichment: tests that request history contains expected context and instructions.
- Tool contract: router/query/command validation tests.
- Provider protocol: adapter tests with streamed text/tool-call fragments.
- Draft/apply: draft card or editor API tests proving no mutation before approval and one undo entry after approval.
- Help/history/local routes: tests proving help opens locally, undo/redo use app callbacks, empty history stacks are reported, and none of these routes call the model.

If e2e cannot run, record why and ensure focused unit coverage exists.

## Output Format

Start with findings, ordered by severity:

| Severity | Area | File | Issue | Required fix |
|---|---|---|---|---|
| High | Tool router | `src/ai/toolRouter.ts` | Manifest tool not implemented | Add route + validation test |

Then include:

- **Alignment summary:** prompt/tool/router/API/docs/tests agree or list gaps.
- **Security summary:** mutation boundary intact or list violations.
- **Verification run:** commands run and any blocked checks.

If there are no issues, say so plainly and mention residual risks such as skipped e2e.

## When To Run

- After editing AI prompts, request routing, tool manifests, provider adapters, conversation state, history controls, draft/apply UI, or AI docs.
- Before merging any AI command/interface layer work.
- During `/maintenance` when AI surfaces changed recently.
