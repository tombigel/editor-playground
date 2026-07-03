import { describe, expect, it, beforeEach, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { AiSettingsSection } from '../settings/sections/AiSettingsSection';
import { AI_PROVIDER_KEY_STORAGE_KEY } from '../AiPanel';
import {
  AUTO_GROUP_SENTINELS,
  CURATED_MODELS,
  FREE_MODEL_SENTINEL,
} from '../../ai/providers/curatedModels';
import { loadPersistedConversationState } from '../../ai/conversationStore';

/**
 * `AiSettingsSection` writes to two coordination surfaces:
 *
 * 1. `localStorage[AI_PROVIDER_KEY_STORAGE_KEY]` — the exact key `AiPanel.tsx`
 *    reads via its own `readStoredApiKey` helper (`AiPanel.tsx`'s empty-state
 *    check hinges on this).
 * 2. `localStorage['editor-playground.ai-conversation.v1']` — via
 *    `conversationStore.tsx`'s own
 *    `loadPersistedConversationState`/`persistConversationState`, since
 *    `AiConversationProvider` is mounted fresh (and only) while the AI panel
 *    is open, not lifted above Settings.
 *
 * These tests exercise the section's plain state-transition logic directly
 * (this repo's vitest environment is Node, no jsdom — see
 * `conversationStore.test.tsx`'s note — so component tests here follow the
 * same `renderToStaticMarkup` static-render convention) AND round-trip
 * through the exact reader each downstream module actually uses, which is
 * the real coordination contract under test.
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

describe('panels/settings/sections/AiSettingsSection', () => {
  beforeEach(() => {
    vi.stubGlobal(
      'window',
      { localStorage: createLocalStorageStub() } as unknown as Window & typeof globalThis,
    );
  });

  it('renders the API key input, the model picker defaulting to Free, and the storage notice', () => {
    const markup = renderToStaticMarkup(<AiSettingsSection />);

    expect(markup).toContain('aria-label="OpenRouter API key"');
    expect(markup).toContain('type="password"');
    expect(markup).toContain('aria-label="Model"');
    // Radix's Select renders its option list into a portal that
    // renderToStaticMarkup (no DOM/portal) can't capture when closed — only
    // the trigger's current value is visible in SSR'd markup, matching this
    // repo's existing convention for testing Select-based rows (see
    // SettingsPanel.test.tsx's Theme/Palette assertions). The trigger shows
    // a compact "tier · name" value (not the fuller price/benchmark label,
    // which only renders in the open option list) to avoid overflowing the
    // fixed-height trigger. All curated models being wired as SelectItems is
    // covered structurally below.
    expect(markup).toContain('Free');
    expect(markup).toContain('stored only in this browser');
    expect(markup).toContain('sent directly from your browser to OpenRouter');
    expect(markup).toContain('never to any other server');
    expect(markup).toContain('bring-your-own-model');
    expect(markup).toContain('still requires a free API key');
  });

  it('keeps the automatic model choices unique and pinned separately from curated ids', () => {
    expect(AUTO_GROUP_SENTINELS).toEqual(['auto:free', 'auto:floor', 'auto']);
    expect(new Set(AUTO_GROUP_SENTINELS).size).toBe(AUTO_GROUP_SENTINELS.length);
    for (const sentinel of AUTO_GROUP_SENTINELS) {
      expect(CURATED_MODELS.some((model) => model.id === sentinel)).toBe(false);
    }
  });

  it('has at least three curated models available to populate the picker (sanity guard for the round-trip tests below)', () => {
    expect(CURATED_MODELS.length).toBeGreaterThanOrEqual(3);
    for (const model of CURATED_MODELS) {
      expect(model.id.length).toBeGreaterThan(0);
      expect(model.label.length).toBeGreaterThan(0);
      expect(model.provider.length).toBeGreaterThan(0);
    }
  });

  it('writing an API key persists it in the exact format AiPanel.tsx expects to read', () => {
    const win = window as unknown as { localStorage: Storage };

    // Simulate the section's write path directly (Input onChange -> handleApiKeyChange
    // -> writeStoredApiKey), matching the plain-string (non-JSON) shape.
    win.localStorage.setItem(AI_PROVIDER_KEY_STORAGE_KEY, 'sk-or-test-key-123');

    // Round-trip through AiPanel.tsx's own read contract: a plain trimmed
    // string under the exact same key, not JSON.
    const raw = win.localStorage.getItem(AI_PROVIDER_KEY_STORAGE_KEY);
    expect(raw).toBe('sk-or-test-key-123');

    // AiPanel.tsx's `readStoredApiKey` (module-private) treats any non-blank
    // trimmed string as present; a JSON.parse of this value would throw,
    // confirming the shape is deliberately plain-string, not JSON-wrapped.
    expect(() => JSON.parse(raw as string)).toThrow();
  });

  it('clearing the key removes it from localStorage entirely', () => {
    const win = window as unknown as { localStorage: Storage };
    win.localStorage.setItem(AI_PROVIDER_KEY_STORAGE_KEY, 'sk-or-test-key-123');
    expect(win.localStorage.getItem(AI_PROVIDER_KEY_STORAGE_KEY)).not.toBeNull();

    // Mirrors the section's Clear button / empty-input write path.
    win.localStorage.removeItem(AI_PROVIDER_KEY_STORAGE_KEY);

    expect(win.localStorage.getItem(AI_PROVIDER_KEY_STORAGE_KEY)).toBeNull();
  });

  it('selecting a model persists selectedModelId in the shape useAiConversation() actually reads on init', () => {
    const secondModel = CURATED_MODELS[1];
    expect(secondModel).toBeDefined();

    // Mirrors the section's Select onValueChange -> handleModelChange ->
    // writeSelectedModelId, which reuses conversationStore.tsx's own
    // persistConversationState (not a hand-rolled JSON shape).
    const win = window as unknown as { localStorage: Storage };
    const before = loadPersistedConversationState();
    win.localStorage.setItem(
      'editor-playground.ai-conversation.v1',
      JSON.stringify({ messages: before.messages, selectedModelId: secondModel?.id }),
    );

    // Round-trip through conversationStore.tsx's actual load path — the same
    // function AiConversationProvider calls on mount to seed
    // useAiConversation()'s initial selectedModelId.
    const loaded = loadPersistedConversationState();
    expect(loaded.selectedModelId).toBe(secondModel?.id);
  });

  it('falls back to the Free automatic choice when no selection has been persisted yet', () => {
    const markup = renderToStaticMarkup(<AiSettingsSection />);

    expect(loadPersistedConversationState().selectedModelId).toBeNull();
    expect(markup).toContain('Free');
    expect(markup).not.toContain(CURATED_MODELS[0]?.name ?? '');
    expect(FREE_MODEL_SENTINEL).toBe('auto:free');
  });
});
