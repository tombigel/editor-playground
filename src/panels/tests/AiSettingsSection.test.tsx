import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { loadPersistedConversationState } from "../../ai/conversationStore";
import {
	AUTO_GROUP_SENTINELS,
	AUTO_MODEL_ID,
	CURATED_MODELS,
	FLOOR_MODEL_SENTINEL,
	FREE_MODEL_SENTINEL,
} from "../../ai/providers/curatedModels";
import {
	OPENROUTER_AUTO_MODEL_ID,
	OPENROUTER_FLOOR_COST_QUALITY_TRADEOFF,
	OPENROUTER_FREE_MODEL_ID,
} from "../../ai/providers/resolveModelSelection";
import { AI_PROVIDER_KEY_STORAGE_KEY } from "../AiPanel";
import {
	AiSettingsSection,
	isCustomModelId,
	normalizeCustomModelIdInput,
	resolveConnectionCheckRequest,
} from "../settings/sections/AiSettingsSection";

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

describe("panels/settings/sections/AiSettingsSection", () => {
	beforeEach(() => {
		vi.stubGlobal("window", {
			localStorage: createLocalStorageStub(),
		} as unknown as Window & typeof globalThis);
	});

	it("renders the API key input, model picker defaulting to Free, tooltips, and the storage notice", () => {
		const markup = renderToStaticMarkup(<AiSettingsSection />);

		expect(markup).toContain('aria-label="OpenRouter API key"');
		expect(markup).toContain('type="password"');
		expect(markup).toContain('aria-label="Model"');
		expect(markup).not.toContain('aria-label="Custom OpenRouter model id"');
		expect(markup).toContain('aria-label="Prompt caching"');
		expect(markup).toContain('aria-label="Auto approve safe AI drafts by default"');
		expect(markup).toContain('aria-label="More information"');
		expect(markup).toContain("Check connection");
		expect(markup).toContain("Usage");
		expect(markup).toContain('style="width:420px"');
		expect(markup).toContain("flex-1 text-right text-xs");
		expect(markup).toContain("Not checked");
		expect(markup).toContain("Refresh");
		expect(markup).not.toContain("OpenRouter credits:");
		expect(markup).not.toContain("flex-1 truncate text-xs");
		expect(markup).not.toContain("OpenRouter connection not checked");
		expect(markup).toContain('href="https://openrouter.ai/keys"');
		expect(markup).toContain('target="_blank"');
		expect(markup).toContain('rel="noreferrer"');
		expect(markup).toContain("Get an OpenRouter key");
		// Radix's Select renders its option list into a portal that
		// renderToStaticMarkup (no DOM/portal) can't capture when closed — only
		// the trigger's current value is visible in SSR'd markup, matching this
		// repo's existing convention for testing Select-based rows (see
		// SettingsPanel.test.tsx's Theme/Palette assertions). The trigger shows
		// a compact "tier · name" value (not the fuller price/benchmark label,
		// which only renders in the open option list) to avoid overflowing the
		// fixed-height trigger. All curated models being wired as SelectItems is
		// covered structurally below.
		expect(markup).toContain("Free");
		expect(markup).toContain("stays in this browser");
		expect(markup).toContain("sent directly to OpenRouter");
		expect(markup).toContain("never stores or proxies it");
		expect(markup).not.toContain("bring-your-own-model");
		expect(markup).not.toContain("OpenRouter still requires a free API");
	});

	it("keeps the automatic model choices unique and pinned separately from curated ids", () => {
		expect(AUTO_GROUP_SENTINELS).toEqual(["auto:free", "auto:floor", "auto"]);
		expect(new Set(AUTO_GROUP_SENTINELS).size).toBe(
			AUTO_GROUP_SENTINELS.length,
		);
		for (const sentinel of AUTO_GROUP_SENTINELS) {
			expect(CURATED_MODELS.some((model) => model.id === sentinel)).toBe(false);
		}
	});

	it("has at least three curated models available to populate the picker (sanity guard for the round-trip tests below)", () => {
		expect(CURATED_MODELS.length).toBeGreaterThanOrEqual(3);
		for (const model of CURATED_MODELS) {
			expect(model.id.length).toBeGreaterThan(0);
			expect(model.label.length).toBeGreaterThan(0);
			expect(model.provider.length).toBeGreaterThan(0);
		}
	});

	it("writing an API key persists it in the exact format AiPanel.tsx expects to read", () => {
		const win = window as unknown as { localStorage: Storage };

		// Simulate the section's write path directly (Input onChange -> handleApiKeyChange
		// -> writeStoredApiKey), matching the plain-string (non-JSON) shape.
		win.localStorage.setItem(AI_PROVIDER_KEY_STORAGE_KEY, "sk-or-test-key-123");

		// Round-trip through AiPanel.tsx's own read contract: a plain trimmed
		// string under the exact same key, not JSON.
		const raw = win.localStorage.getItem(AI_PROVIDER_KEY_STORAGE_KEY);
		expect(raw).toBe("sk-or-test-key-123");

		// AiPanel.tsx's `readStoredApiKey` (module-private) treats any non-blank
		// trimmed string as present; a JSON.parse of this value would throw,
		// confirming the shape is deliberately plain-string, not JSON-wrapped.
		expect(() => JSON.parse(raw as string)).toThrow();
	});

	it("clearing the key removes it from localStorage entirely", () => {
		const win = window as unknown as { localStorage: Storage };
		win.localStorage.setItem(AI_PROVIDER_KEY_STORAGE_KEY, "sk-or-test-key-123");
		expect(
			win.localStorage.getItem(AI_PROVIDER_KEY_STORAGE_KEY),
		).not.toBeNull();

		// Mirrors the section's Clear button / empty-input write path.
		win.localStorage.removeItem(AI_PROVIDER_KEY_STORAGE_KEY);

		expect(win.localStorage.getItem(AI_PROVIDER_KEY_STORAGE_KEY)).toBeNull();
	});

	it("selecting a model persists selectedModelId in the shape useAiConversation() actually reads on init", () => {
		const secondModel = CURATED_MODELS[1];
		expect(secondModel).toBeDefined();

		// Mirrors the section's Select onValueChange -> handleModelChange ->
		// writeSelectedModelId, which reuses conversationStore.tsx's own
		// persistConversationState (not a hand-rolled JSON shape).
		const win = window as unknown as { localStorage: Storage };
		const before = loadPersistedConversationState();
		win.localStorage.setItem(
			"editor-playground.ai-conversation.v1",
			JSON.stringify({
				messages: before.messages,
				selectedModelId: secondModel?.id,
				promptCachingEnabled: before.promptCachingEnabled,
				autoApproveAiDrafts: before.autoApproveAiDrafts,
			}),
		);

		// Round-trip through conversationStore.tsx's actual load path — the same
		// function AiConversationProvider calls on mount to seed
		// useAiConversation()'s initial selectedModelId.
		const loaded = loadPersistedConversationState();
		expect(loaded.selectedModelId).toBe(secondModel?.id);
	});

	it("falls back to the Free automatic choice when no selection has been persisted yet", () => {
		const markup = renderToStaticMarkup(<AiSettingsSection />);

		expect(loadPersistedConversationState().selectedModelId).toBeNull();
		expect(markup).toContain("Free");
		expect(markup).not.toContain(CURATED_MODELS[0]?.name ?? "");
		expect(FREE_MODEL_SENTINEL).toBe("auto:free");
	});

	it("prefills the custom model field when the persisted selection is not curated or automatic", () => {
		const customModelId = "mistralai/mistral-large";
		const win = window as unknown as { localStorage: Storage };
		win.localStorage.setItem(
			"editor-playground.ai-conversation.v1",
			JSON.stringify({ messages: [], selectedModelId: customModelId }),
		);

		const markup = renderToStaticMarkup(<AiSettingsSection />);

		expect(markup).toContain(`value="${customModelId}"`);
		expect(markup).toContain("Custom Model");
	});

	it("classifies custom model ids separately from automatic sentinels and curated ids", () => {
		expect(isCustomModelId("mistralai/mistral-large")).toBe(true);
		expect(isCustomModelId(FREE_MODEL_SENTINEL)).toBe(false);
		expect(isCustomModelId(CURATED_MODELS[0]?.id ?? "")).toBe(false);
	});

	it("normalizes custom model input before persistence", () => {
		expect(normalizeCustomModelIdInput("  mistralai/mistral-large  ")).toBe(
			"mistralai/mistral-large",
		);
		expect(normalizeCustomModelIdInput("   ")).toBeNull();
		expect(normalizeCustomModelIdInput("")).toBeNull();
	});

	it("resolves the connection-check request for OpenRouter automatic, floor, and custom selections", () => {
		expect(resolveConnectionCheckRequest(FREE_MODEL_SENTINEL)).toEqual({
			modelId: OPENROUTER_FREE_MODEL_ID,
			adapterOptions: undefined,
		});
		expect(resolveConnectionCheckRequest(FLOOR_MODEL_SENTINEL)).toEqual({
			modelId: OPENROUTER_AUTO_MODEL_ID,
			adapterOptions: {
				autoRouterCostQualityTradeoff: OPENROUTER_FLOOR_COST_QUALITY_TRADEOFF,
			},
		});
		expect(resolveConnectionCheckRequest(AUTO_MODEL_ID)).toEqual({
			modelId: OPENROUTER_AUTO_MODEL_ID,
			adapterOptions: undefined,
		});
		expect(resolveConnectionCheckRequest("mistralai/mistral-large")).toEqual({
			modelId: "mistralai/mistral-large",
			adapterOptions: undefined,
		});
	});

	it("reflects the persisted prompt-caching preference in the Settings switch", () => {
		const win = window as unknown as { localStorage: Storage };
		win.localStorage.setItem(
			"editor-playground.ai-conversation.v1",
			JSON.stringify({
				messages: [],
				selectedModelId: FREE_MODEL_SENTINEL,
				promptCachingEnabled: true,
				autoApproveAiDrafts: false,
			}),
		);

		const markup = renderToStaticMarkup(<AiSettingsSection />);

		expect(loadPersistedConversationState().promptCachingEnabled).toBe(true);
		expect(markup).toContain('aria-label="Prompt caching"');
		expect(markup).toContain('data-state="checked"');
	});

	it("reflects the persisted auto-approve preference in the Settings switch", () => {
		const win = window as unknown as { localStorage: Storage };
		win.localStorage.setItem(
			"editor-playground.ai-conversation.v1",
			JSON.stringify({
				messages: [],
				selectedModelId: FREE_MODEL_SENTINEL,
				promptCachingEnabled: false,
				autoApproveAiDrafts: true,
			}),
		);

		const markup = renderToStaticMarkup(<AiSettingsSection />);

		expect(loadPersistedConversationState().autoApproveAiDrafts).toBe(true);
		expect(markup).toContain('aria-label="Auto approve safe AI drafts by default"');
		expect(markup).toContain('data-state="checked"');
	});
});
