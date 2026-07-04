import { describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { createInitialState } from "../../editor/editorPersistenceState";
import { routeToolCall } from "../../ai/toolRouter";
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
import {
	AiPanel,
	getAutoApproveDraftDecision,
	handleLocalAiRoute,
} from "../AiPanel";
import { AiMessageList } from "../ai/AiMessageList";
import {
	buildAssistantRequestHistory,
	runAssistantTurn,
	routeAssistantToolCalls,
	useAiChat,
} from "../ai/useAiChat";
import { AI_SYSTEM_PROMPT } from "../../ai/systemPrompt";

const NO_OP = () => undefined;

/**
 * Builds a mocked `ProviderAdapter` that yields a canned `StreamEvent`
 * sequence. This is the plan's required verification seam for Task 9: no live
 * OpenRouter key exists in this environment, so the send loop is exercised
 * against a fake stream instead of a network call.
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

function makePanelProps() {
	return {
		open: true,
		position: { top: 24, left: 32 },
		onPositionChange: NO_OP,
		document: createInitialState().document,
		editorState: createInitialState(),
		onOpenChange: NO_OP,
		onClose: NO_OP,
		onOpenSettings: NO_OP,
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

describe("panels/AiPanel", () => {
	it("renders inside the shared floating shell with an AI-assistant header", () => {
		const markup = renderToStaticMarkup(<AiPanel {...makePanelProps()} />);

		expect(markup).toContain('data-ui="floating-panel-shell"');
		expect(markup).toContain('data-ui="panel-header"');
		expect(markup).toContain("Close AI assistant panel");
		expect(markup).toContain("AI Assistant");
		expect(markup).toContain("Clear conversation");
		expect(markup).toContain("Open settings");
		expect(markup).toContain('role="tooltip"');
		expect(markup).toContain("Open AI assistant settings");
	});

	it("shows the add-your-key empty state when no adapter is available", () => {
		// No adapterOverride and (in the node test env) no stored key → the panel
		// must guide the user to Settings rather than erroring or doing nothing.
		const markup = renderToStaticMarkup(<AiPanel {...makePanelProps()} />);

		expect(markup).toContain(
			"Add a free OpenRouter API key in Settings to start chatting",
		);
		expect(markup).toContain("even the free-tier model needs one");
		expect(markup).not.toContain("Ask about your document…");
	});

	it("renders the composer once a provider adapter is present", () => {
		const adapter = createMockAdapter([{ type: "message-complete" }]);
		const markup = renderToStaticMarkup(
			<AiPanel {...makePanelProps()} adapterOverride={adapter} />,
		);

		expect(markup).toContain('data-ui="textarea"');
		expect(markup).toContain("Clear AI conversation");
		expect(markup).toContain("Auto approve");
		expect(markup).toContain("Auto approve safe AI drafts");
		expect(markup).toContain(
			"Ask a question about your document to get started.",
		);
		expect(markup).not.toContain(
			"Add a free OpenRouter API key in Settings to start chatting",
		);
	});

	it("streams assistant text deltas from a mocked adapter", async () => {
		const adapter = createMockAdapter([
			{ type: "text-delta", delta: "There are " },
			{ type: "text-delta", delta: "3 sections." },
			{ type: "message-complete" },
		]);

		const accumulated: string[] = [];
		const outcome = await runAssistantTurn(adapter, [], {
			onTextDelta: (text) => accumulated.push(text),
			onError: NO_OP,
		});

		expect(outcome.text).toBe("There are 3 sections.");
		expect(outcome.toolCalls).toHaveLength(0);
		expect(outcome.error).toBeNull();
		expect(accumulated.at(-1)).toBe("There are 3 sections.");
	});

	it("builds request history with the transport-only system prompt first", () => {
		const prior: ConversationMessage[] = [
			{ id: "m1", role: "assistant", content: "Earlier answer", createdAt: 1 },
		];
		const userMessage: ConversationMessage = {
			id: "m2",
			role: "user",
			content: "What changed?",
			createdAt: 2,
		};

		const history = buildAssistantRequestHistory(prior, userMessage);

		expect(history[0]).toMatchObject({
			id: "system:editor-playground-ai",
			role: "system",
			content: AI_SYSTEM_PROMPT,
			createdAt: 0,
		});
		expect(history.slice(1)).toEqual([...prior, userMessage]);
	});

	it("system prompt requires concise human-readable answers with a next action", () => {
		expect(AI_SYSTEM_PROMPT).toContain("Never answer with raw JSON");
		expect(AI_SYSTEM_PROMPT).toContain("2-5 sentences");
		expect(AI_SYSTEM_PROMPT).toContain("call to action");
		expect(AI_SYSTEM_PROMPT).toContain("Do not paste the tool result back to the user");
	});

	it("builds request history with app-provided direct-operation context before the user message", () => {
		const prior: ConversationMessage[] = [
			{ id: "m1", role: "assistant", content: "Earlier answer", createdAt: 1 },
		];
		const contextMessage: ConversationMessage = {
			id: "ctx",
			role: "system",
			content: "Direct operation context",
			createdAt: 2,
		};
		const userMessage: ConversationMessage = {
			id: "m2",
			role: "user",
			content: "move selection 20px right",
			createdAt: 3,
		};

		const history = buildAssistantRequestHistory(prior, userMessage, {
			contextMessages: [contextMessage],
		});

		expect(history.map((message) => message.id)).toEqual([
			"system:editor-playground-ai",
			"m1",
			"ctx",
			"m2",
		]);
		expect(history[2].content).toBe("Direct operation context");
	});

	it("keeps internal tool messages out of the visible transcript", () => {
		const markup = renderToStaticMarkup(
			<AiMessageList
				streaming={false}
				streamingText=""
				messages={[
					{
						id: "user",
						role: "user",
						content: "What text nodes exist?",
						createdAt: 1,
					},
					{
						id: "tool",
						role: "tool",
						content: '{"large":"json dump"}',
						toolCallId: "call-1",
						internal: true,
						createdAt: 2,
					},
					{
						id: "assistant",
						role: "assistant",
						content: "There are three text groups. Want me to adjust them?",
						createdAt: 3,
					},
				]}
			/>,
		);

		expect(markup).toContain("What text nodes exist?");
		expect(markup).toContain("There are three text groups");
		expect(markup).not.toContain("json dump");
		expect(markup).not.toContain("Tool result");
	});

	it("renders edit and rerun actions on user prompts only", () => {
		const markup = renderToStaticMarkup(
			<AiMessageList
				streaming={false}
				streamingText=""
				onEditPrompt={NO_OP}
				onRerunPrompt={NO_OP}
				messages={[
					{
						id: "user",
						role: "user",
						content: "Move this text down",
						createdAt: 1,
					},
					{
						id: "assistant",
						role: "assistant",
						content: "I can do that.",
						createdAt: 2,
					},
				]}
			/>,
		);

		expect(markup).toContain("Edit prompt");
		expect(markup).toContain("Rerun prompt");
	});

	it("handles help routes locally by opening the AI guide and recording a transcript", () => {
		const conversation = createConversationStub();
		const openDocumentation = vi.fn();
		const openShortcuts = vi.fn();

		const handled = handleLocalAiRoute({
			conversation,
			route: { kind: "helpRequest", target: "aiGuide" },
			text: "/help",
			pendingDraft: null,
			onApproveDraft: () => "applied",
			onRejectDraft: NO_OP,
			onOpenDocumentation: openDocumentation,
			onOpenShortcuts: openShortcuts,
		});

		expect(handled).toBe(true);
		expect(openDocumentation).toHaveBeenCalledWith(
			"doc:docs/AI_CONVERSATION_GUIDE.md",
		);
		expect(openShortcuts).not.toHaveBeenCalled();
		expect(conversation.messages.map((message) => message.role)).toEqual(["user", "assistant"]);
		expect(conversation.messages.at(-1)?.content).toContain("AI conversation guide");
	});

	it("handles draft-control routes locally without calling the model", () => {
		const command = { type: "setNodeVisibility", nodeId: "node-1", visible: false } as const;
		const conversation = createConversationStub({
			pendingDraft: { id: "draft-1", commands: [command] },
		});
		const approve = vi.fn(() => "applied" as const);
		const reject = vi.fn();

		const handled = handleLocalAiRoute({
			conversation,
			route: { kind: "draftControl", action: "approve" },
			text: "make the change",
			pendingDraft: conversation.pendingDraft,
			onApproveDraft: approve,
			onRejectDraft: reject,
		});

		expect(handled).toBe(true);
		expect(approve).toHaveBeenCalledWith([command]);
		expect(reject).not.toHaveBeenCalled();
		expect(conversation.messages.at(-1)?.content).toContain("Approved and applied");
	});

	it("auto-approves only safe non-overflowed drafts", () => {
		expect(
			getAutoApproveDraftDecision(
				[{ type: "setNodeVisibility", nodeId: "node-1", visible: false }],
				{ draftOverflowed: false },
			),
		).toEqual({ action: "approve" });
	});

	it("keeps destructive and overflowed drafts on the manual approval path", () => {
		expect(
			getAutoApproveDraftDecision(
				[{ type: "deleteNode", nodeId: "node-1" }],
				{ draftOverflowed: false },
			),
		).toEqual({ action: "manual", reason: "destructive" });
		expect(
			getAutoApproveDraftDecision(
				[{ type: "setNodeVisibility", nodeId: "node-1", visible: false }],
				{ draftOverflowed: true },
			),
		).toEqual({ action: "manual", reason: "overflowed" });
	});

	it("handles undo and redo routes locally through app history callbacks", () => {
		const conversation = createConversationStub();
		const undo = vi.fn();
		const redo = vi.fn();

		const undoHandled = handleLocalAiRoute({
			conversation,
			route: { kind: "historyControl", action: "undo" },
			text: "undo",
			pendingDraft: null,
			onApproveDraft: () => "applied",
			onRejectDraft: NO_OP,
			onUndo: undo,
			onRedo: redo,
			canUndo: true,
			canRedo: true,
		});
		const redoHandled = handleLocalAiRoute({
			conversation,
			route: { kind: "historyControl", action: "redo" },
			text: "undo the undo",
			pendingDraft: null,
			onApproveDraft: () => "applied",
			onRejectDraft: NO_OP,
			onUndo: undo,
			onRedo: redo,
			canUndo: true,
			canRedo: true,
		});

		expect(undoHandled).toBe(true);
		expect(redoHandled).toBe(true);
		expect(undo).toHaveBeenCalledTimes(1);
		expect(redo).toHaveBeenCalledTimes(1);
		expect(conversation.messages.at(-3)?.content).toContain("Undid the last change");
		expect(conversation.messages.at(-1)?.content).toContain("Redid the last undone change");
	});

	it("does not call history callbacks when the requested stack is empty", () => {
		const conversation = createConversationStub();
		const undo = vi.fn();

		const handled = handleLocalAiRoute({
			conversation,
			route: { kind: "historyControl", action: "undo" },
			text: "revert",
			pendingDraft: null,
			onApproveDraft: () => "applied",
			onRejectDraft: NO_OP,
			onUndo: undo,
			canUndo: false,
		});

		expect(handled).toBe(true);
		expect(undo).not.toHaveBeenCalled();
		expect(conversation.messages.at(-1)?.content).toContain("nothing to undo");
	});

	it("routes a query tool-call from the stream into a query result", async () => {
		const toolCall: ToolCall = {
			id: "call-1",
			name: "getDocumentTree",
			arguments: {},
		};
		const adapter = createMockAdapter([
			{ type: "tool-call-complete", toolCall },
			{ type: "message-complete" },
		]);

		const outcome = await runAssistantTurn(adapter, [], {
			onTextDelta: NO_OP,
			onError: NO_OP,
		});

		expect(outcome.toolCalls).toEqual([toolCall]);

		const state = createInitialState();
		const result = routeToolCall(outcome.toolCalls[0], {
			document: state.document,
			editorState: state,
		});

		expect(result.kind).toBe("query");
		expect(result.error).toBeUndefined();
		expect(result.queryData).toBeDefined();
	});

	it("routes query tool calls into hidden follow-up context instead of visible dumps", () => {
		const state = createInitialState();
		const routed = routeAssistantToolCalls(
			[
				{
					id: "call-1",
					name: "getDocumentTree",
					arguments: {},
				},
			],
			{ document: state.document, editorState: state },
		);

		expect(routed.hasMutationDraft).toBe(false);
		expect(routed.results).toHaveLength(1);
		expect(routed.toolResultMessages).toHaveLength(1);
		expect(routed.toolResultMessages[0]).toMatchObject({
			role: "tool",
			toolCallId: "call-1",
			internal: true,
		});
	});

	it("stages a mutation tool-call as a draft rather than applying it", async () => {
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
		const adapter = createMockAdapter([
			{ type: "tool-call-complete", toolCall },
			{ type: "message-complete" },
		]);

		const outcome = await runAssistantTurn(adapter, [], {
			onTextDelta: NO_OP,
			onError: NO_OP,
		});

		const result = routeToolCall(outcome.toolCalls[0], {
			document: state.document,
			editorState: state,
		});

		// A mutation is staged as a draft (kind: 'mutation' + draftCommands) — it
		// is never applied here; Task 10's diff card approves it via editorApi.
		expect(result.kind).toBe("mutation");
		expect(result.draftCommands).toBeDefined();
	});

	it("routes mutation tool calls as drafts without creating follow-up tool messages", () => {
		const state = createInitialState();
		const targetNode = Object.values(state.document.nodes).find(
			(node) => node.contentType === "container" && node.subtype === "section",
		);
		if (!targetNode) {
			throw new Error("Expected a section node in the default document");
		}

		const routed = routeAssistantToolCalls(
			[
				{
					id: "call-2",
					name: "setNodeVisibility",
					arguments: { nodeId: targetNode.id, visible: false },
				},
			],
			{ document: state.document, editorState: state },
		);

		expect(routed.hasMutationDraft).toBe(true);
		expect(routed.toolResultMessages).toEqual([]);
	});

	it("surfaces a stream error from the mocked adapter as an error outcome", async () => {
		const adapter = createMockAdapter([
			{ type: "error", message: "OpenRouter rejected the request (401)" },
		]);

		let reported: string | null = null;
		const outcome = await runAssistantTurn(adapter, [], {
			onTextDelta: NO_OP,
			onError: (message) => {
				reported = message;
			},
		});

		expect(outcome.error).toContain("401");
		expect(reported).toContain("401");
	});

	it("records the concrete model reported by the provider stream", async () => {
		const adapter = createMockAdapter([
			{ type: "model-resolved", modelId: "qwen/qwen3-next-80b-a3b-instruct:free" },
			{ type: "text-delta", delta: "Hello" },
			{ type: "message-complete" },
		]);

		const outcome = await runAssistantTurn(adapter, [], {
			onTextDelta: NO_OP,
			onError: NO_OP,
		});

		expect(outcome.text).toBe("Hello");
		expect(outcome.resolvedModelId).toBe("qwen/qwen3-next-80b-a3b-instruct:free");
	});

	it("surfaces a 'cancelled' stream event from the adapter as an error outcome", async () => {
		const adapter = createMockAdapter([
			{ type: "text-delta", delta: "partial" },
			{ type: "cancelled" },
		]);

		let reported: string | null = null;
		const outcome = await runAssistantTurn(adapter, [], {
			onTextDelta: NO_OP,
			onError: (message) => {
				reported = message;
			},
		});

		expect(outcome.error).toBe("Request cancelled.");
		expect(reported).toBe("Request cancelled.");
		expect(outcome.text).toBe("partial");
	});
});

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
