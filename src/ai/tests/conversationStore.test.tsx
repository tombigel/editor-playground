import { describe, expect, it, beforeEach, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { MAX_COMMANDS_PER_BATCH } from '../guardrails';
import type { AiDocumentCommand } from '../../api/ai/types';
import type { ConversationMessage, DraftBatch, ToolResult } from '../types/index';
import {
  accumulateDraft,
  AiConversationProvider,
  clearPersistedConversationMessages,
  createToolResultMessage,
  loadPersistedConversationState,
  persistConversationState,
  useAiConversation,
  type PersistedAiConversationState,
} from '../conversationStore';

/**
 * `AiConversationProvider`/`useAiConversation` are stateful React
 * context/hook code, but this repo's vitest config runs in `environment:
 * 'node'` with no `@testing-library/react`/jsdom installed (confirmed: the
 * existing `.test.tsx` component tests — e.g. `LayersPanel.test.tsx` — all
 * use `react-dom/server`'s `renderToStaticMarkup` for a one-shot static
 * render, not interactive rendering). To stay within that established
 * pattern while still testing real state transitions, this file:
 *
 * 1. Exercises the *pure* state-transition logic (`accumulateDraft`,
 *    `loadPersistedConversationState`/`persistConversationState`) directly,
 *    with no React involved — this is where the actual accumulation/
 *    persistence behavior lives and is fully unit-testable without a DOM.
 * 2. Uses `renderToStaticMarkup` to confirm `AiConversationProvider` +
 *    `useAiConversation` wire up without throwing and that the hook's
 *    initial values reflect `loadPersistedConversationState()` — matching
 *    the repo's static-render-only testing convention for `.tsx` files.
 */

function createLocalStorageStub(): Storage {
  const store = new Map<string, string>();
  return {
    getItem: (key: string) => store.get(key) ?? null,
    setItem: (key: string, value: string) => {
      store.set(key, value);
    },
    removeItem: (key: string) => {
      store.delete(key);
    },
    clear: () => store.clear(),
    key: (index: number) => Array.from(store.keys())[index] ?? null,
    get length() {
      return store.size;
    },
  } as Storage;
}

describe('ai/conversationStore accumulateDraft', () => {
  function makeCommand(nodeId: string): AiDocumentCommand {
    return { type: 'setNodeVisibility', nodeId, visible: false };
  }

  it('accumulates commands from multiple routed tool-call results into one DraftBatch', () => {
    const first = accumulateDraft(null, [makeCommand('a')]);
    expect(first.draft.commands).toEqual([makeCommand('a')]);
    expect(first.overflowed).toBe(false);

    const second = accumulateDraft(first.draft, [makeCommand('b')]);
    expect(second.draft.id).toBe(first.draft.id);
    expect(second.draft.commands).toEqual([makeCommand('a'), makeCommand('b')]);
    expect(second.overflowed).toBe(false);
  });

  it('respects MAX_COMMANDS_PER_BATCH: stops accumulating further commands and flags overflow', () => {
    const atLimit: DraftBatch = {
      id: 'draft-1',
      commands: Array.from({ length: MAX_COMMANDS_PER_BATCH }, (_, i) => makeCommand(`n${i}`)),
    };

    const result = accumulateDraft(atLimit, [makeCommand('overflow')]);

    expect(result.overflowed).toBe(true);
    // No new command was silently appended past the cap.
    expect(result.draft.commands).toHaveLength(MAX_COMMANDS_PER_BATCH);
    expect(result.draft.commands).toEqual(atLimit.commands);
  });

  it('partially accumulates up to the cap and flags overflow when a batch of new commands would exceed it', () => {
    const nearLimit: DraftBatch = {
      id: 'draft-2',
      commands: Array.from({ length: MAX_COMMANDS_PER_BATCH - 1 }, (_, i) => makeCommand(`n${i}`)),
    };

    const result = accumulateDraft(nearLimit, [makeCommand('fits'), makeCommand('does-not-fit')]);

    expect(result.overflowed).toBe(true);
    expect(result.draft.commands).toHaveLength(MAX_COMMANDS_PER_BATCH);
    expect(result.draft.commands.at(-1)).toEqual(makeCommand('fits'));
  });
});

describe('ai/conversationStore persistence', () => {
  beforeEach(() => {
    vi.stubGlobal('window', { localStorage: createLocalStorageStub() } as unknown as Window & typeof globalThis);
  });

  it('round-trips messages and selectedModelId through localStorage', () => {
    const message: ConversationMessage = {
      id: 'm1',
      role: 'user',
      content: 'What sections are on this page?',
      createdAt: Date.now(),
    };
    const state: PersistedAiConversationState = {
      messages: [message],
      selectedModelId: 'some/model',
      promptCachingEnabled: true,
    };

    persistConversationState(state);
    const loaded = loadPersistedConversationState();

    expect(loaded).toEqual(state);
  });

  it('falls back to an empty initial state on missing/malformed localStorage content', () => {
    expect(loadPersistedConversationState()).toEqual({
      messages: [],
      selectedModelId: null,
      promptCachingEnabled: false,
    });

    (window as unknown as { localStorage: Storage }).localStorage.setItem(
      'editor-playground.ai-conversation.v1',
      'not json',
    );
    expect(loadPersistedConversationState()).toEqual({
      messages: [],
      selectedModelId: null,
      promptCachingEnabled: false,
    });

    (window as unknown as { localStorage: Storage }).localStorage.setItem(
      'editor-playground.ai-conversation.v1',
      JSON.stringify({ messages: 'not-an-array', selectedModelId: null }),
    );
    expect(loadPersistedConversationState()).toEqual({
      messages: [],
      selectedModelId: null,
      promptCachingEnabled: false,
    });
  });

  it('defaults missing/malformed promptCachingEnabled to false without wiping existing state', () => {
    const message: ConversationMessage = { id: 'm1', role: 'user', content: 'hi', createdAt: 1 };
    const win = window as unknown as { localStorage: Storage };

    win.localStorage.setItem(
      'editor-playground.ai-conversation.v1',
      JSON.stringify({ messages: [message], selectedModelId: 'legacy/model' }),
    );
    expect(loadPersistedConversationState()).toEqual({
      messages: [message],
      selectedModelId: 'legacy/model',
      promptCachingEnabled: false,
    });

    win.localStorage.setItem(
      'editor-playground.ai-conversation.v1',
      JSON.stringify({
        messages: [message],
        selectedModelId: 'legacy/model',
        promptCachingEnabled: 'yes',
      }),
    );
    expect(loadPersistedConversationState()).toEqual({
      messages: [message],
      selectedModelId: 'legacy/model',
      promptCachingEnabled: false,
    });
  });

  it('does NOT persist pendingDraft: only persisted conversation keys are ever written', () => {
    const state: PersistedAiConversationState = {
      messages: [],
      selectedModelId: 'model-x',
      promptCachingEnabled: false,
    };
    persistConversationState(state);

    const raw = (window as unknown as { localStorage: Storage }).localStorage.getItem(
      'editor-playground.ai-conversation.v1',
    );
    expect(raw).not.toBeNull();
    const parsed = JSON.parse(raw as string);
    expect(Object.keys(parsed).sort()).toEqual(['messages', 'promptCachingEnabled', 'selectedModelId']);
    expect(parsed).not.toHaveProperty('pendingDraft');
  });

  it('clears persisted messages without resetting model or prompt-caching preferences', () => {
    const message: ConversationMessage = { id: 'm1', role: 'user', content: 'hi', createdAt: 1 };
    const state: PersistedAiConversationState = {
      messages: [message],
      selectedModelId: 'model-x',
      promptCachingEnabled: true,
    };

    expect(clearPersistedConversationMessages(state)).toEqual({
      messages: [],
      selectedModelId: 'model-x',
      promptCachingEnabled: true,
    });
  });
});

describe('ai/conversationStore AiConversationProvider / useAiConversation', () => {
  beforeEach(() => {
    vi.stubGlobal('window', { localStorage: createLocalStorageStub() } as unknown as Window & typeof globalThis);
  });

  it('renders without throwing and exposes the expected API surface to a consumer', () => {
    const box: { captured: ReturnType<typeof useAiConversation> | null } = { captured: null };

    function Consumer() {
      box.captured = useAiConversation();
      return null;
    }

    expect(() =>
      renderToStaticMarkup(
        <AiConversationProvider>
          <Consumer />
        </AiConversationProvider>,
      ),
    ).not.toThrow();

    expect(box.captured).not.toBeNull();
    expect(box.captured?.messages).toEqual([]);
    expect(box.captured?.pendingDraft).toBeNull();
    expect(box.captured?.selectedModelId).toBeNull();
    expect(box.captured?.promptCachingEnabled).toBe(false);
    expect(typeof box.captured?.appendMessage).toBe('function');
    expect(typeof box.captured?.recordToolResult).toBe('function');
    expect(typeof box.captured?.clearConversation).toBe('function');
    expect(typeof box.captured?.clearPendingDraft).toBe('function');
    expect(typeof box.captured?.setSelectedModelId).toBe('function');
    expect(typeof box.captured?.setPromptCachingEnabled).toBe('function');
  });

  it('useAiConversation throws outside of a provider (no silent undefined context)', () => {
    function Consumer() {
      useAiConversation();
      return null;
    }

    expect(() => renderToStaticMarkup(<Consumer />)).toThrow(/AiConversationProvider/);
  });

  it('initializes messages/selectedModelId from persisted localStorage state', () => {
    const message: ConversationMessage = { id: 'm1', role: 'user', content: 'hi', createdAt: 1 };
    persistConversationState({
      messages: [message],
      selectedModelId: 'model-y',
      promptCachingEnabled: true,
    });

    const box: { captured: ReturnType<typeof useAiConversation> | null } = { captured: null };
    function Consumer() {
      box.captured = useAiConversation();
      return null;
    }

    renderToStaticMarkup(
      <AiConversationProvider>
        <Consumer />
      </AiConversationProvider>,
    );

    expect(box.captured?.messages).toEqual([message]);
    expect(box.captured?.selectedModelId).toBe('model-y');
    expect(box.captured?.promptCachingEnabled).toBe(true);
  });
});

describe('ai/conversationStore ToolResult routing shape sanity (documents recordToolResult contract)', () => {
  it('creates internal tool-result messages for query results only', () => {
    const queryResult: ToolResult = {
      toolCallId: 'call-1',
      kind: 'query',
      queryData: [{ id: 'node-1' }],
    };
    const mutationResult: ToolResult = {
      toolCallId: 'call-2',
      kind: 'mutation',
      draftCommands: [{ type: 'deleteNode', nodeId: 'n1' }],
    };

    expect(createToolResultMessage(queryResult, { id: 'tool-1', createdAt: 1 })).toEqual({
      id: 'tool-1',
      role: 'tool',
      content: JSON.stringify([{ id: 'node-1' }]),
      toolCallId: 'call-1',
      internal: true,
      createdAt: 1,
    });
    expect(createToolResultMessage(mutationResult)).toBeNull();
  });

  it('a mutation ToolResult carries draftCommands that accumulateDraft can consume directly', () => {
    const toolResult: ToolResult = {
      toolCallId: 'call-1',
      kind: 'mutation',
      draftCommands: [{ type: 'deleteNode', nodeId: 'n1' }],
    };

    const { draft, overflowed } = accumulateDraft(null, toolResult.draftCommands ?? []);
    expect(overflowed).toBe(false);
    expect(draft.commands).toEqual(toolResult.draftCommands);
  });
});
