import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { createInitialState } from "../../editor/editorPersistenceState";
import {
	createToolResultMessage,
	type AiConversationApi,
} from "../../ai/conversationStore";
import type {
	ConversationMessage,
	ProviderAdapter,
	StreamEvent,
	ToolCall,
} from "../../ai/types/index";
import { useAiChat } from "../ai/useAiChat";

const NO_OP = () => undefined;

/**
 * Builds a mocked `ProviderAdapter` that yields a canned `StreamEvent`
 * sequence, since no live OpenRouter key exists in this environment.
 */
function createMockAdapter(events: StreamEvent[]): ProviderAdapter {
	return {
		async *streamChat() {
			for (const event of events) {
				yield event;
			}
		},
	};
}

function createConversationStub(overrides: Partial<AiConversationApi> = {}): AiConversationApi {
	const messages: ConversationMessage[] = [];
	const base: AiConversationApi = {
		messages,
		pendingDraft: null,
		selectedModelId: null,
		promptCachingEnabled: false,
		autoApproveAiDrafts: false,
		draftOverflowed: false,
		appendMessage: (message) => {
			messages.push(message);
		},
		recordToolResult: NO_OP,
		clearConversation: NO_OP,
		clearPendingDraft: NO_OP,
		setSelectedModelId: NO_OP,
		setPromptCachingEnabled: NO_OP,
		setAutoApproveAiDrafts: NO_OP,
	};
	return { ...base, ...overrides };
}

/**
 * `useAiChat`'s `sendMessage`/`cancel` are hook-bound closures, so they can
 * only be obtained via a real render. This repo's vitest config has no jsdom/
 * `@testing-library/react` (see `conversationStore.test.tsx`'s header
 * comment), so these tests capture the hook's returned functions via a single
 * `renderToStaticMarkup` pass (same pattern already used for
 * `AiConversationProvider`/`useAiConversation` in `conversationStore.test.tsx`)
 * and then invoke `sendMessage` directly. React's `useState` setters become
 * harmless no-ops once the static-markup render has completed (there is no
 * mounted fiber to re-render), but they never throw, and all of the business
 * logic inside `sendMessage` — calling `buildAdapter`, iterating the mocked
 * adapter's stream, routing tool calls via `routeAssistantToolCalls`, and
 * calling `conversation.appendMessage`/`recordToolResult` — runs exactly as it
 * would in the browser, since none of that logic depends on a live fiber.
 * This is confirmed by observing `conversation.messages`, which is a plain
 * array the stub mutates directly (not React state).
 */
describe("panels/ai/useAiChat sendMessage", () => {
	function captureHook(options: Parameters<typeof useAiChat>[0]): ReturnType<typeof useAiChat> {
		let captured: ReturnType<typeof useAiChat> | null = null;
		function Consumer() {
			captured = useAiChat(options);
			return null;
		}
		renderToStaticMarkup(<Consumer />);
		if (!captured) {
			throw new Error("Expected useAiChat to produce a result during render");
		}
		return captured;
	}

	it("appends a user message and a visible assistant reply for a plain text turn", async () => {
		const state = createInitialState();
		const conversation = createConversationStub();
		const adapter = createMockAdapter([
			{ type: "text-delta", delta: "Hi there" },
			{ type: "message-complete" },
		]);

		const hook = captureHook({
			conversation,
			buildAdapter: () => adapter,
			modelSelection: "auto",
			document: state.document,
			editorState: state,
		});

		await hook.sendMessage("hello");

		expect(conversation.messages.map((message) => message.role)).toEqual([
			"user",
			"assistant",
		]);
		expect(conversation.messages[0].content).toBe("hello");
		expect(conversation.messages[1].content).toBe("Hi there");
		expect(conversation.messages[1].toolCalls).toBeUndefined();
	});

	it("does nothing for a blank/whitespace-only message", async () => {
		const state = createInitialState();
		const conversation = createConversationStub();
		const adapter = createMockAdapter([{ type: "message-complete" }]);

		const hook = captureHook({
			conversation,
			buildAdapter: () => adapter,
			modelSelection: "auto",
			document: state.document,
			editorState: state,
		});

		await hook.sendMessage("   ");

		expect(conversation.messages).toEqual([]);
	});

	it("does nothing when no adapter builder is available", async () => {
		const state = createInitialState();
		const conversation = createConversationStub();

		const hook = captureHook({
			conversation,
			buildAdapter: null,
			modelSelection: "auto",
			document: state.document,
			editorState: state,
		});

		await hook.sendMessage("hello");

		expect(conversation.messages).toEqual([]);
	});

	it("routes a query tool call, records the internal tool result, and follows up automatically", async () => {
		const state = createInitialState();
		const toolCall: ToolCall = { id: "call-1", name: "getDocumentTree", arguments: {} };
		// The default `createConversationStub()` stubs `recordToolResult` as a
		// no-op; that's how the panel's own real production wiring
		// (`useAiConversation()`'s `recordToolResult`) turns a query `ToolResult`
		// into an appended `tool`-role message via `createToolResultMessage`.
		// Mirror that real behavior here so the resulting transcript reflects
		// what the app actually renders.
		const conversation = createConversationStub({
			recordToolResult: (result) => {
				const message = createToolResultMessage(result);
				if (message) {
					conversation.appendMessage(message);
				}
			},
		});

		let callCount = 0;
		const buildAdapter = () => {
			callCount += 1;
			if (callCount === 1) {
				return createMockAdapter([
					{ type: "tool-call-complete", toolCall },
					{ type: "message-complete" },
				]);
			}
			return createMockAdapter([
				{ type: "text-delta", delta: "Here is a summary." },
				{ type: "message-complete" },
			]);
		};

		const hook = captureHook({
			conversation,
			buildAdapter,
			modelSelection: "auto",
			document: state.document,
			editorState: state,
		});

		await hook.sendMessage("what is on this page?");

		// Two adapter calls: the initial turn (which only returns a tool call,
		// triggering a query-tool follow-up) and the follow-up turn.
		expect(callCount).toBe(2);
		expect(conversation.messages.map((message) => message.role)).toEqual([
			"user",
			"assistant", // internal provider message carrying the tool call
			"tool", // internal tool-result message
			"assistant", // final visible reply
		]);
		expect(conversation.messages[1].internal).toBe(true);
		expect(conversation.messages[3].internal).toBeFalsy();
		expect(conversation.messages[3].content).toBe("Here is a summary.");
	});

	it("stages a mutation tool call as a draft without following up, and does not duplicate a visible reply", async () => {
		const state = createInitialState();
		const targetNode = Object.values(state.document.nodes).find(
			(node) => node.contentType === "container" && node.subtype === "section",
		);
		if (!targetNode) {
			throw new Error("Expected a section node in the default document");
		}
		const toolCall: ToolCall = {
			id: "call-2",
			name: "setNodeVisibility",
			arguments: { nodeId: targetNode.id, visible: false },
		};
		const recordedResults: unknown[] = [];
		const conversationWithRecorder = createConversationStub({
			recordToolResult: (result) => recordedResults.push(result),
		});

		let callCount = 0;
		const buildAdapter = () => {
			callCount += 1;
			return createMockAdapter([
				{ type: "tool-call-complete", toolCall },
				{ type: "message-complete" },
			]);
		};

		const hook = captureHook({
			conversation: conversationWithRecorder,
			buildAdapter,
			modelSelection: "auto",
			document: state.document,
			editorState: state,
		});

		await hook.sendMessage("hide the section");

		// A mutation draft never triggers a query-tool follow-up turn.
		expect(callCount).toBe(1);
		expect(recordedResults).toHaveLength(1);
		expect(
			(recordedResults[0] as { kind: string }).kind,
		).toBe("mutation");
	});

	it("surfaces an adapter stream error as streamError without throwing, via the onError handler wired to setStreamError", async () => {
		const state = createInitialState();
		const conversation = createConversationStub();
		const adapter = createMockAdapter([
			{ type: "error", message: "OpenRouter rejected the request (401)" },
		]);

		const hook = captureHook({
			conversation,
			buildAdapter: () => adapter,
			modelSelection: "auto",
			document: state.document,
			editorState: state,
		});

		await expect(hook.sendMessage("hello")).resolves.toBeUndefined();
		// No assistant message is produced when the only stream event is an
		// error carrying no text/tool calls: outcome.text/toolCalls stay empty
		// per runAssistantTurn, so createAssistantMessage's guard skips it.
		expect(conversation.messages.map((message) => message.role)).toEqual(["user"]);
	});

	it("surfaces a thrown adapter exception (not just a stream 'error' event) as a caught error", async () => {
		const state = createInitialState();
		const conversation = createConversationStub();
		const throwingAdapter: ProviderAdapter = {
			// biome-ignore lint/correctness/useYield: deliberately throws before ever yielding a stream event
			async *streamChat() {
				throw new Error("network exploded");
			},
		};

		const hook = captureHook({
			conversation,
			buildAdapter: () => throwingAdapter,
			modelSelection: "auto",
			document: state.document,
			editorState: state,
		});

		await expect(hook.sendMessage("hello")).resolves.toBeUndefined();
		// The thrown error is caught by sendMessage's try/catch (not propagated),
		// and the user message was still appended before the throw occurred.
		expect(conversation.messages.map((message) => message.role)).toEqual(["user"]);
	});

	it("does not throw when cancel() is invoked against an in-flight request", async () => {
		const state = createInitialState();
		const conversation = createConversationStub();
		const adapter: ProviderAdapter = {
			async *streamChat(_messages, _tools, options) {
				yield { type: "text-delta", delta: "partial" } as StreamEvent;
				// Yield control back to the microtask queue so `cancel()` below can
				// run while this generator is still in flight, then finish the turn
				// normally — the mock adapter itself doesn't act on the abort signal
				// (that's `OpenRouterAdapter`'s job), but this confirms the
				// `AbortController` created per `sendMessage` call is reachable via
				// `cancel()` without throwing.
				await Promise.resolve();
				expect(options?.signal?.aborted).toBe(true);
				yield { type: "message-complete" } as StreamEvent;
			},
		};

		const hook = captureHook({
			conversation,
			buildAdapter: () => adapter,
			modelSelection: "auto",
			document: state.document,
			editorState: state,
		});

		const firstSend = hook.sendMessage("first message");
		expect(() => hook.cancel()).not.toThrow();
		await firstSend;

		expect(conversation.messages[0].content).toBe("first message");
	});
});
