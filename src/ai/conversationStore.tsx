import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';
import { isBatchSizeAllowed, MAX_COMMANDS_PER_BATCH } from './guardrails';
import type { ConversationMessage, DraftBatch, ToolResult } from './types/index';

/**
 * React context + hook pair holding conversation session state for the AI
 * orchestration layer. This is a new top-level `src/ai/` file, so — like
 * every other file under `src/ai/` — it must never import from `src/app` or
 * `src/panels` (enforced by `scripts/check-architecture.mjs`'s `ai` scope
 * rule, added in Task 6). It only imports React itself and sibling
 * `src/ai/*`/`src/api/ai/*` modules.
 *
 * Nothing in this file can mutate the document: it only ever accumulates
 * `ToolResult`s that `routeToolCall` (Task 7's other half) already produced.
 * A `pendingDraft` is data waiting for human approval, applied elsewhere
 * (`editorApi.applyAiCommands`, called only from the Approve button in the UI
 * layer — Task 10).
 */

const STORAGE_KEY = 'editor-playground.ai-conversation.v1';

/**
 * The persisted subset of conversation state. `pendingDraft` is deliberately
 * excluded — a draft should not survive a page reload as if still valid; a
 * fresh conversation turn re-derives it. This mirrors
 * `src/editor/editorPersistenceState.ts`'s `loadPersistedState`/`persistState`
 * pattern: a versioned key (`.v1`), a `typeof window === 'undefined'` guard,
 * and JSON parse wrapped in try/catch with a safe fallback on any failure
 * (missing key, malformed JSON, or unexpected shape).
 */
export type PersistedAiConversationState = {
  messages: ConversationMessage[];
  selectedModelId: string | null;
  promptCachingEnabled: boolean;
};

function createInitialPersistedState(): PersistedAiConversationState {
  return { messages: [], selectedModelId: null, promptCachingEnabled: false };
}

function isConversationMessage(value: unknown): value is ConversationMessage {
  if (typeof value !== 'object' || value === null) {
    return false;
  }
  const candidate = value as Partial<ConversationMessage>;
  return (
    typeof candidate.id === 'string' &&
    typeof candidate.role === 'string' &&
    typeof candidate.content === 'string' &&
    typeof candidate.createdAt === 'number'
  );
}

function normalizePersistedState(parsed: unknown): PersistedAiConversationState | null {
  if (typeof parsed !== 'object' || parsed === null) {
    return null;
  }
  const candidate = parsed as Partial<PersistedAiConversationState>;
  if (!Array.isArray(candidate.messages) || !candidate.messages.every(isConversationMessage)) {
    return null;
  }
  const selectedModelId = candidate.selectedModelId;
  if (selectedModelId !== null && typeof selectedModelId !== 'string') {
    return null;
  }
  const promptCachingEnabled =
    typeof candidate.promptCachingEnabled === 'boolean' ? candidate.promptCachingEnabled : false;
  return {
    messages: candidate.messages,
    selectedModelId: selectedModelId ?? null,
    promptCachingEnabled,
  };
}

/**
 * Loads persisted `messages`/`selectedModelId` from localStorage. Falls back
 * to an empty initial state on a missing key, malformed JSON, or an
 * unexpected shape — never throws.
 */
export function loadPersistedConversationState(): PersistedAiConversationState {
  if (typeof window === 'undefined') {
    return createInitialPersistedState();
  }

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return createInitialPersistedState();
    }
    const parsed = JSON.parse(raw) as unknown;
    const normalized = normalizePersistedState(parsed);
    return normalized ?? createInitialPersistedState();
  } catch {
    return createInitialPersistedState();
  }
}

/**
 * Persists `messages`/`selectedModelId`/`promptCachingEnabled` only —
 * `pendingDraft` is never written to localStorage.
 */
export function persistConversationState(state: PersistedAiConversationState): void {
  if (typeof window === 'undefined') {
    return;
  }
  window.localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify({
      messages: state.messages,
      selectedModelId: state.selectedModelId,
      promptCachingEnabled: state.promptCachingEnabled,
    }),
  );
}

function createMessageId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `msg_${Date.now()}_${Math.random().toString(36).slice(2)}`;
}

function createDraftId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `draft_${Date.now()}_${Math.random().toString(36).slice(2)}`;
}

/**
 * Merges a routed mutation `ToolResult`'s `draftCommands` into an existing
 * (or new) `DraftBatch`, respecting `MAX_COMMANDS_PER_BATCH`.
 *
 * If accumulating the new commands would exceed the cap, the overflow is
 * dropped and `overflowed: true` is returned so the caller can flag this to
 * the user — following the same "never silent" guardrail principle as the
 * rest of this layer (see `src/ai/guardrails.ts`). The batch is never
 * silently truncated without a signal.
 */
export function accumulateDraft(
  existing: DraftBatch | null,
  newCommands: AiDocumentCommandLike[],
): { draft: DraftBatch; overflowed: boolean } {
  const priorCommands = existing?.commands ?? [];
  const combined = [...priorCommands, ...newCommands];

  if (isBatchSizeAllowed(combined.length)) {
    return {
      draft: { id: existing?.id ?? createDraftId(), commands: combined },
      overflowed: false,
    };
  }

  // Stop accumulating further commands into this batch once the cap would be
  // exceeded — keep everything that already fit, drop the rest, and flag it.
  const room = Math.max(0, MAX_COMMANDS_PER_BATCH - priorCommands.length);
  const truncated = [...priorCommands, ...newCommands.slice(0, room)];
  return {
    draft: { id: existing?.id ?? createDraftId(), commands: truncated },
    overflowed: true,
  };
}

// Local alias avoiding a direct `src/api/ai/types` import spread across this
// file beyond what `DraftBatch`/`ToolResult` already pull in.
type AiDocumentCommandLike = DraftBatch['commands'][number];

export type AiConversationState = {
  messages: ConversationMessage[];
  pendingDraft: DraftBatch | null;
  selectedModelId: string | null;
  promptCachingEnabled: boolean;
  /** Set when the most recent accumulation into `pendingDraft` overflowed `MAX_COMMANDS_PER_BATCH`. */
  draftOverflowed: boolean;
};

export type AiConversationApi = AiConversationState & {
  appendMessage: (message: ConversationMessage) => void;
  recordToolResult: (result: ToolResult) => void;
  clearPendingDraft: () => void;
  setSelectedModelId: (modelId: string | null) => void;
  setPromptCachingEnabled: (enabled: boolean) => void;
};

const AiConversationContext = createContext<AiConversationApi | null>(null);

/**
 * Provides AI conversation session state (`messages`, `pendingDraft`,
 * `selectedModelId`) to descendants. `messages`/`selectedModelId` are
 * persisted to localStorage on every change; `pendingDraft` never is.
 */
export function AiConversationProvider({ children }: { children: ReactNode }) {
  const [persisted, setPersisted] = useState<PersistedAiConversationState>(() => loadPersistedConversationState());
  const [pendingDraft, setPendingDraft] = useState<DraftBatch | null>(null);
  const [draftOverflowed, setDraftOverflowed] = useState(false);

  const persistAndSet = useCallback((updater: (prev: PersistedAiConversationState) => PersistedAiConversationState) => {
    setPersisted((prev) => {
      const next = updater(prev);
      persistConversationState(next);
      return next;
    });
  }, []);

  const appendMessage = useCallback(
    (message: ConversationMessage) => {
      persistAndSet((prev) => ({ ...prev, messages: [...prev.messages, message] }));
    },
    [persistAndSet],
  );

  const recordToolResult = useCallback(
    (result: ToolResult) => {
      if (result.kind === 'mutation' && result.draftCommands && result.draftCommands.length > 0) {
        setPendingDraft((prevDraft) => {
          const { draft, overflowed } = accumulateDraft(prevDraft, result.draftCommands ?? []);
          setDraftOverflowed(overflowed);
          return draft;
        });
        return;
      }

      // Query results (and rejections, which are also `kind: 'query'` with an
      // `error` set) are appended as a tool-result message rather than staged
      // as a draft — nothing here can mutate the document either way.
      const content = result.error ?? JSON.stringify(result.queryData ?? null);
      appendMessage({
        id: createMessageId(),
        role: 'tool',
        content,
        toolCallId: result.toolCallId,
        createdAt: Date.now(),
      });
    },
    [appendMessage],
  );

  const clearPendingDraft = useCallback(() => {
    setPendingDraft(null);
    setDraftOverflowed(false);
  }, []);

  const setSelectedModelId = useCallback(
    (modelId: string | null) => {
      persistAndSet((prev) => ({ ...prev, selectedModelId: modelId }));
    },
    [persistAndSet],
  );

  const setPromptCachingEnabled = useCallback(
    (enabled: boolean) => {
      persistAndSet((prev) => ({ ...prev, promptCachingEnabled: enabled }));
    },
    [persistAndSet],
  );

  const value = useMemo<AiConversationApi>(
    () => ({
      messages: persisted.messages,
      pendingDraft,
      selectedModelId: persisted.selectedModelId,
      promptCachingEnabled: persisted.promptCachingEnabled,
      draftOverflowed,
      appendMessage,
      recordToolResult,
      clearPendingDraft,
      setSelectedModelId,
      setPromptCachingEnabled,
    }),
    [
      persisted,
      pendingDraft,
      draftOverflowed,
      appendMessage,
      recordToolResult,
      clearPendingDraft,
      setSelectedModelId,
      setPromptCachingEnabled,
    ],
  );

  return <AiConversationContext.Provider value={value}>{children}</AiConversationContext.Provider>;
}

/**
 * Consumes the AI conversation context. Must be called within an
 * `AiConversationProvider`.
 */
export function useAiConversation(): AiConversationApi {
  const context = useContext(AiConversationContext);
  if (!context) {
    throw new Error('useAiConversation must be used within an AiConversationProvider');
  }
  return context;
}
