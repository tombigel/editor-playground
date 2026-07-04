# AI Harness Audit Fixes: Agent Task List

Fixes the four findings from the AI harness audit of range `af24dc5..HEAD` (2026-07-03). Written to be executable by a lower-capability model: every task names exact files, functions, expected behavior, tests, and commit message. Do not improvise beyond what a task states; if the code no longer matches a task's description, stop and report instead of guessing.

## Execution Strategy

- Tasks 1-4 are sequential code tasks, one commit each. Do not combine commits.
- Before each task: run `git status --short` and confirm the worktree is clean apart from this plan file.
- After each task: run the task's focused test command, stage only the task-owned files, commit with the exact message given.
- Prep and verification waves are read-only; no commits there.
- Final gate: `pnpm run check:architecture`, the combined focused test run, and `pnpm run build` must all pass.
- Docs are updated inside the same task as the behavior change (repo Documentation And Test Gate).

## Background: The Four Findings

1. **History-before-help misroute** — in `src/ai/requestRouting.ts`, `classifyAiRequest` checks history-control phrases before help phrases, so "how do I undo something?" performs a real undo instead of opening help. (Same bug class: "how do I approve this?" with a pending draft approves it, because draft control also runs before help.)
2. **Dead fallback machinery** — `resolveModelSelection` never returns `kind: 'auto-fallback'` and always sets `applyFloorSuffix: false`, yet `useAiChat.ts` keeps a full `runAssistantTurnWithFallback` loop and `AiSettingsSection.tsx` handles the unreachable variant. Leftover from a superseded design (commit 51b8339, replaced by da3b937's auto-router plugin). `docs/PLAYGROUND_SPEC.md` still says provenance captions include "Auto fallback outcomes".
3. **Over-broad prompt caching** — `toOpenRouterMessage` in `src/ai/providers/openRouterAdapter.ts` attaches `cache_control` to every `system`-role message, including the volatile per-turn direct-operation context message. The spec says caching applies only to the transport system prompt.
4. **Over-broad draft approve/reject matching** — with a pending draft, "yes, but make it narrower" approves the draft as-is and "no, make it wider instead" rejects it, silently dropping the modification. Draft-control phrases should only match short, bare confirmations.

## Parallel Prep Wave

**Agent A: `explorer` (read-only)**

Verify these facts still hold before Task 1 starts (line numbers may have drifted; identifiers are the anchors):

- `src/ai/requestRouting.ts` — `classifyAiRequest` evaluates in this order: `classifyHistoryControl`, then draft control (gated on `options.hasPendingDraft`), then `isHelpRequest`, then direct-operation words.
- `src/ai/providers/resolveModelSelection.ts` — every return sets `applyFloorSuffix: false`; nothing returns `kind: 'auto-fallback'`; exports `withFloorSuffix`.
- Only these production files reference the fallback machinery: `src/panels/ai/useAiChat.ts` (`runAssistantTurnWithFallback`, `isRetryableStreamError`, `withFloorSuffix`, `FallbackTurnOutcome`, the `"auto-fallback"` branch in `sendMessage`) and `src/panels/settings/sections/AiSettingsSection.tsx` (`resolveConnectionCheckRequest`'s `"auto-fallback"` branch and `applyFloorSuffix` use).
- `getFloorCuratedModel` and `getModelsInAscendingPriceOrder` in `src/ai/providers/curatedModels.ts` have no callers outside `src/ai/providers/tests/curatedModels.test.ts`.
- Fallback tests live in `src/panels/tests/AiPanel.test.tsx` (imports `isRetryableStreamError` and `runAssistantTurnWithFallback` from `@/panels/ai/useAiChat`, test blocks around "stops fallback immediately on a terminal stream error").
- `src/ai/providers/tests/openRouterAdapter.test.ts` contains the test `wraps only the system message with cache_control when prompt caching is enabled`.
- `docs/API_AI.md` has a "Request routing and command-aware context" section; `docs/PLAYGROUND_SPEC.md` has AI panel bullets under "Settings: provider, model, and API key" including the sentence containing "including Auto fallback outcomes".

Report any mismatch before code tasks begin. No commits.

## Task 1: Route help questions before history controls

**Agent type**

- `worker` simple coding agent

**Scope**

- `src/ai/requestRouting.ts`
- `src/ai/tests/requestRouting.test.ts`
- `docs/API_AI.md`
- `docs/PLAYGROUND_SPEC.md`

**Implementation**

- In `classifyAiRequest` (`src/ai/requestRouting.ts`), move the `isHelpRequest(normalized, tokens)` check so it runs FIRST — before `classifyHistoryControl` and before draft control. Resulting order: help → history control → draft control (pending-draft gated) → direct operation → normal chat. Do not change any phrase list or matcher function.
- Behavior after the change:
  - `"how do I undo something?"` → `{ kind: 'helpRequest', target: 'gettingStarted' }` (starts with `how `), NOT a history control.
  - `"how do I approve this?"` with `hasPendingDraft: true` → help request, NOT draft approval.
  - Bare `"undo"`, `"revert"`, `"cancel last change"`, `"redo"`, `"undo the undo"` → unchanged history-control routing (none of them contain help tokens or start with `how `).
  - All existing draft-control and direct-operation behavior for non-help messages is unchanged.
- Tests (`src/ai/tests/requestRouting.test.ts`): add cases asserting
  - `classifyAiRequest('how do I undo something?', { hasPendingDraft: false })` → `{ kind: 'helpRequest', target: 'gettingStarted' }`
  - `classifyAiRequest('how do I redo an undo?', { hasPendingDraft: false })` → kind `helpRequest`
  - `classifyAiRequest('how do I approve this?', { hasPendingDraft: true })` → kind `helpRequest`
  - `classifyAiRequest('undo', { hasPendingDraft: false })` still → history control `undo` (keep/confirm existing case)
- Docs: in `docs/API_AI.md` "Request routing and command-aware context" section, add one sentence stating help detection takes precedence over history and draft controls so question-form phrasing ("how do I undo…") opens help instead of mutating history. In `docs/PLAYGROUND_SPEC.md`, extend the request-router bullet (the one beginning "Before sending a chat message to a model…") with the same precedence statement.

**Verify**

- `pnpm vitest run src/ai/tests/requestRouting.test.ts src/panels/tests/AiPanel.test.tsx`

**Commit**

- `fix(ai): open help for question-form undo/redo requests instead of running them`

## Task 2: Gate draft approve/reject to short confirmations

**Agent type**

- `worker` simple coding agent

**Scope**

- `src/ai/requestRouting.ts`
- `src/ai/tests/requestRouting.test.ts`
- `docs/API_AI.md`
- `docs/PLAYGROUND_SPEC.md`

**Implementation**

- In `src/ai/requestRouting.ts`, add a module constant `const MAX_DRAFT_CONTROL_TOKENS = 4;` with a short comment: draft controls only match short, bare confirmations; longer mixed-intent messages ("yes, but make it narrower") must go to the model instead of silently approving/rejecting.
- In `classifyAiRequest`, apply the gate to BOTH draft-control call sites (the `hasPendingDraft` branch and the `else if` normal-chat shortcut): only call/honor `classifyDraftControl(normalized)` when `tokens.length <= MAX_DRAFT_CONTROL_TOKENS`. Do not change `classifyDraftControl` itself or the phrase lists. History-control classification is NOT length-gated ("can you undo that please" must still undo).
- Behavior after the change (with `hasPendingDraft: true`):
  - `"yes"`, `"ok"`, `"looks good"`, `"make the change"`, `"please make the change"` (4 tokens) → `draftControl` approve.
  - `"no"`, `"reject"`, `"cancel"` → `draftControl` reject.
  - `"yes, but make it narrower"` (5 tokens) → NOT draft control; falls through (ends up `normalChat` — "make"/"narrower" are not direct-command words).
  - `"no, make it wider instead"` (5 tokens) → NOT draft control.
- Tests (`src/ai/tests/requestRouting.test.ts`): add the four bullet cases above (two approvals incl. the 4-token one, and the two 5-token fall-throughs asserting `kind` is not `draftControl`). Keep all existing draft-control tests passing.
- Docs: in `docs/PLAYGROUND_SPEC.md`, extend the pending-draft-control bullet: control phrases act locally only for short bare confirmations (up to a few words); longer mixed-intent replies are sent to the model so requested modifications are not dropped. Add the equivalent sentence to the `docs/API_AI.md` routing section's draft-control bullet.

**Verify**

- `pnpm vitest run src/ai/tests/requestRouting.test.ts src/panels/tests/AiPanel.test.tsx`

**Commit**

- `fix(ai): only treat short bare confirmations as draft approve/reject`

## Task 3: Cache only the base system prompt

**Agent type**

- `worker` simple coding agent

**Scope**

- `src/ai/providers/openRouterAdapter.ts`
- `src/ai/providers/tests/openRouterAdapter.test.ts`
- `docs/PLAYGROUND_SPEC.md`

**Implementation**

- In `streamChat` (`src/ai/providers/openRouterAdapter.ts`), the request body currently maps `messages.map((message) => toOpenRouterMessage(message, adapterOptions.cacheSystemPrompt ?? false))`. Change the map to pass a per-message flag that is true only for the first message: `messages.map((message, index) => toOpenRouterMessage(message, (adapterOptions.cacheSystemPrompt ?? false) && index === 0))`.
- Rename `toOpenRouterMessage`'s second parameter from `cacheSystemPrompt` to `applyCacheControl` (behavior inside unchanged: it still also requires `message.role === 'system'` before wrapping content in the `cache_control` text block). Net effect: only the base system prompt at index 0 gets `cache_control`; per-turn `system`-role context messages (e.g. the direct-operation context) are sent as plain strings.
- The chat history builder (`buildAssistantRequestHistory` in `src/panels/ai/useAiChat.ts`) always places the transport system prompt at index 0 — do not modify that file in this task.
- Tests (`src/ai/providers/tests/openRouterAdapter.test.ts`): extend the existing test `wraps only the system message with cache_control when prompt caching is enabled` (or add a sibling test) to stream with a history of three messages: system prompt (index 0), a user message, and a second `system`-role message (simulating direct-operation context). Assert the request body's `messages[0].content` is the cache-control array form and `messages[2].content` is a plain string.
- Docs: in `docs/PLAYGROUND_SPEC.md`, the prompt-caching bullet already says the adapter caches "the transport-only system prompt"; append a clarifying phrase that per-turn system context messages (such as direct-operation context) are never cache-marked. No `docs/API_AI.md` change (it does not describe caching).

**Verify**

- `pnpm vitest run src/ai/providers/tests/openRouterAdapter.test.ts`

**Commit**

- `fix(ai): apply prompt caching only to the base system prompt`

## Task 4: Remove dead auto-fallback and floor-suffix machinery

**Agent type**

- `worker` simple coding agent

**Scope**

- `src/ai/providers/resolveModelSelection.ts`
- `src/ai/providers/curatedModels.ts`
- `src/panels/ai/useAiChat.ts`
- `src/panels/settings/sections/AiSettingsSection.tsx`
- `src/ai/providers/tests/resolveModelSelection.test.ts`
- `src/ai/providers/tests/curatedModels.test.ts`
- `src/panels/tests/AiPanel.test.tsx`
- `src/panels/tests/AiSettingsSection.test.tsx` (only if it asserts the removed shape)
- `docs/PLAYGROUND_SPEC.md`

**Implementation**

This removes the client-side model-fallback design that commit da3b937 superseded with OpenRouter's auto-router plugin. Delete, do not deprecate. Preserve all current runtime behavior — every code path being deleted is unreachable in production.

- `src/ai/providers/resolveModelSelection.ts`:
  - Delete `withFloorSuffix`.
  - Change `ResolvedModelSelection` to a single shape: `export type ResolvedModelSelection = { modelId: string; adapterOptions?: OpenRouterAdapterOptions };` (no `kind`, no `applyFloorSuffix`, no `candidateModelIds`).
  - Update `resolveModelSelection`'s four returns to the new shape, keeping the exact same sentinel → model-id/adapter-options mapping (`auto` → `openrouter/auto`; `auto:free` → `openrouter/free`; `auto:floor` → `openrouter/auto` + `{ autoRouterCostQualityTradeoff: OPENROUTER_FLOOR_COST_QUALITY_TRADEOFF }`; anything else passes through verbatim).
  - Keep `OPENROUTER_FREE_MODEL_ID`, `OPENROUTER_AUTO_MODEL_ID`, `OPENROUTER_FLOOR_COST_QUALITY_TRADEOFF` exported unchanged (they have other consumers).
- `src/panels/ai/useAiChat.ts`:
  - Delete `runAssistantTurnWithFallback`, `isRetryableStreamError`, and the `FallbackTurnOutcome` type; remove the `withFloorSuffix` import.
  - In `sendMessage`, replace the `resolvedSelection.kind === "auto-fallback" ? … : …` conditional with the single-model path only: resolve once, call `runAssistantTurn(buildAdapter(resolved.modelId, resolved.adapterOptions), …)`, and compute `respondingModelId` as `outcome.resolvedModelId ?? resolved.modelId`. Keep everything downstream (routing, internal messages, follow-up loop, fallback text) exactly as is. Keep `runAssistantTurn` and `AssistantTurnOutcome` exported; add a local outcome type with `respondingModelId` if needed to keep types tidy.
- `src/panels/settings/sections/AiSettingsSection.tsx`:
  - Simplify `resolveConnectionCheckRequest` to: return `null` for the custom-model sentinel (unchanged), otherwise `const resolved = resolveModelSelection(modelSelection); return { modelId: resolved.modelId, adapterOptions: resolved.adapterOptions };`.
- `src/ai/providers/curatedModels.ts`:
  - Delete `getFloorCuratedModel` and `getModelsInAscendingPriceOrder` (prep wave confirmed no non-test callers). Keep everything else, including all sentinels and `isAutoGroupSentinel`.
- Tests:
  - `resolveModelSelection.test.ts`: update assertions to the new flat shape; delete `withFloorSuffix` and `auto-fallback`/`applyFloorSuffix` cases. Keep sentinel-mapping cases (free/floor/auto/custom pass-through, floor's `autoRouterCostQualityTradeoff: 10`).
  - `AiPanel.test.tsx`: remove the `isRetryableStreamError` and `runAssistantTurnWithFallback` imports and their test blocks (including "stops fallback immediately on a terminal stream error"). Do not touch other tests in the file.
  - `curatedModels.test.ts`: remove tests for the two deleted helpers.
  - `AiSettingsSection.test.tsx`: adjust only if `resolveConnectionCheckRequest` shape assertions fail.
- Docs: in `docs/PLAYGROUND_SPEC.md`, find the provenance bullet ending "including Auto fallback outcomes" and rewrite the ending to describe reality, e.g. "when the responding model id is known (for Automatic modes, the concrete model OpenRouter reports)". Then grep `docs/` for `fallback` and fix any other AI-panel mention of client-side model fallback (leave unrelated uses of the word alone).

**Verify**

- `pnpm vitest run src/ai/providers/tests src/panels/tests/AiPanel.test.tsx src/panels/tests/AiSettingsSection.test.tsx src/app/tests/aiAssistant.e2e.test.ts`
- `pnpm run check:architecture`

**Commit**

- `refactor(ai): remove superseded client-side model fallback machinery`

## Parallel Verification Wave

**Agent D: `explorer` (read-only)**

- Grep `src/` for `runAssistantTurnWithFallback`, `isRetryableStreamError`, `withFloorSuffix`, `applyFloorSuffix`, `auto-fallback`, `candidateModelIds`, `getFloorCuratedModel`, `getModelsInAscendingPriceOrder` — expect zero hits.
- Grep `docs/` for `fallback` — expect no remaining AI-panel client-fallback claims.
- Confirm `docs/API_AI.md` and `docs/PLAYGROUND_SPEC.md` both state the help-over-history precedence and the short-confirmation draft-control gate.

**Agent E: `explorer` (read-only)**

- Re-read `classifyAiRequest` and confirm final order: help → history → draft control → direct operation → normal chat, with the token-length gate applied only to draft control.
- Re-read `streamChat`'s message mapping and confirm the `index === 0` cache condition.

No commits unless findings require a follow-up task.

## Final Acceptance

- Four sequential commits exist, one per task, with the exact messages above (each becomes a `CHANGELOG.md` bullet automatically).
- `pnpm vitest run src/ai src/api/ai src/panels/tests/AiPanel.test.tsx src/panels/tests/AiSettingsSection.test.tsx` passes.
- `pnpm run check:architecture` passes.
- `pnpm run build` passes (blocker if it fails; fix before handing off).
- Final summary must state: docs updated in Tasks 1, 2, 3 (SPEC clarification), and 4; every behavior change has matching unit tests; no e2e-only behavior was introduced.
