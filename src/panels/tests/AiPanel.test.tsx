import { describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { createInitialState } from "../../editor/editorPersistenceState";
import { routeToolCall } from "../../ai/toolRouter";
import type { AiConversationApi } from "../../ai/conversationStore";
import type {
	ConversationMessage,
	ProviderAdapter,
	StreamEvent,
	ToolCall,
} from "../../ai/types/index";
import { AiPanel, handleLocalAiRoute } from "../AiPanel";
import { AiMessageList } from "../ai/AiMessageList";
import {
	buildAssistantRequestHistory,
	runAssistantTurn,
	routeAssistantToolCalls,
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
		draftOverflowed: false,
		appendMessage: (message) => {
			messages.push(message);
		},
		recordToolResult: NO_OP,
		clearConversation: NO_OP,
		clearPendingDraft: NO_OP,
		setSelectedModelId: NO_OP,
		setPromptCachingEnabled: NO_OP,
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

	it("handles help routes locally by opening existing help targets and recording a transcript", () => {
		const conversation = createConversationStub();
		const openDocumentation = vi.fn();
		const openShortcuts = vi.fn();

		const handled = handleLocalAiRoute({
			conversation,
			route: { kind: "helpRequest", target: "aiApi" },
			text: "help with AI tools",
			pendingDraft: null,
			onApproveDraft: () => "applied",
			onRejectDraft: NO_OP,
			onOpenDocumentation: openDocumentation,
			onOpenShortcuts: openShortcuts,
		});

		expect(handled).toBe(true);
		expect(openDocumentation).toHaveBeenCalledWith("doc:docs/API_AI.md");
		expect(openShortcuts).not.toHaveBeenCalled();
		expect(conversation.messages.map((message) => message.role)).toEqual(["user", "assistant"]);
		expect(conversation.messages.at(-1)?.content).toContain("AI command reference");
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

});
