import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { createInitialState } from "../../editor/editorPersistenceState";
import { routeToolCall } from "../../ai/toolRouter";
import type {
	ConversationMessage,
	ProviderAdapter,
	StreamEvent,
	ToolCall,
} from "../../ai/types/index";
import { AiPanel } from "../AiPanel";
import {
	buildAssistantRequestHistory,
	isRetryableStreamError,
	runAssistantTurn,
	runAssistantTurnWithFallback,
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

describe("panels/AiPanel", () => {
	it("renders inside the shared floating shell with an AI-assistant header", () => {
		const markup = renderToStaticMarkup(<AiPanel {...makePanelProps()} />);

		expect(markup).toContain('data-ui="floating-panel-shell"');
		expect(markup).toContain('data-ui="panel-header"');
		expect(markup).toContain("Close AI assistant panel");
		expect(markup).toContain("AI Assistant");
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

	it("classifies retryable stream errors conservatively", () => {
		expect(isRetryableStreamError("OpenRouter rejected the request (429)")).toBe(true);
		expect(isRetryableStreamError("No provider available for this model")).toBe(true);
		expect(isRetryableStreamError("Provider timed out while overloaded")).toBe(true);
		expect(isRetryableStreamError("OpenRouter rejected the request (401)")).toBe(false);
		expect(isRetryableStreamError("Malformed request body")).toBe(false);
	});

	it("falls through to the next model on a retryable stream error and records provenance", async () => {
		const calls: string[] = [];
		const adapters: Record<string, ProviderAdapter> = {
			"first/model": createMockAdapter([{ type: "error", message: "OpenRouter rejected the request (429)" }]),
			"second/model": createMockAdapter([
				{ type: "text-delta", delta: "Recovered" },
				{ type: "message-complete" },
			]),
		};

		const outcome = await runAssistantTurnWithFallback(
			(modelId) => {
				calls.push(modelId);
				return adapters[modelId];
			},
			["first/model", "second/model"],
			[],
			{ onTextDelta: NO_OP, onError: NO_OP },
		);

		expect(calls).toEqual(["first/model", "second/model"]);
		expect(outcome.text).toBe("Recovered");
		expect(outcome.error).toBeNull();
		expect(outcome.respondingModelId).toBe("second/model");
	});

	it("stops fallback immediately on a terminal stream error", async () => {
		const calls: string[] = [];
		const outcome = await runAssistantTurnWithFallback(
			(modelId) => {
				calls.push(modelId);
				return createMockAdapter([{ type: "error", message: "OpenRouter rejected the request (401)" }]);
			},
			["first/model", "second/model"],
			[],
			{ onTextDelta: NO_OP, onError: NO_OP },
		);

		expect(calls).toEqual(["first/model"]);
		expect(outcome.error).toContain("401");
		expect(outcome.respondingModelId).toBe("first/model");
	});

	it("keeps the last tried model id when every fallback candidate has a retryable error", async () => {
		const outcome = await runAssistantTurnWithFallback(
			(modelId) =>
				createMockAdapter([{ type: "error", message: `${modelId} returned 503` }]),
			["first/model", "second/model"],
			[],
			{ onTextDelta: NO_OP, onError: NO_OP },
		);

		expect(outcome.error).toContain("503");
		expect(outcome.respondingModelId).toBe("second/model");
	});
});
