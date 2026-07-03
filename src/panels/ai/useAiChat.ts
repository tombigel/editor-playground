import { useCallback, useRef, useState } from "react";
import { AI_TOOL_MANIFEST } from "@/api/ai/toolManifest";
import type { DocumentModel } from "@/model/types";
import type { EditorState } from "@/editor/types/index";
import { routeToolCall } from "@/ai/toolRouter";
import {
	createToolResultMessage,
	type AiConversationApi,
} from "@/ai/conversationStore";
import { AI_SYSTEM_PROMPT } from "@/ai/systemPrompt";
import {
	resolveModelSelection,
	withFloorSuffix,
} from "@/ai/providers/resolveModelSelection";
import type { OpenRouterAdapterOptions } from "@/ai/providers/openRouterAdapter";
import type {
	ConversationMessage,
	ProviderAdapter,
	ToolCall,
	ToolResult,
} from "@/ai/types/index";

/**
 * Read-only query-chat send loop for the AI assistant panel (Task 9).
 *
 * This hook owns the "type → stream → route tool calls → record results"
 * cycle. It deliberately lives under `src/panels/ai/` (the consumer/UI
 * direction) rather than `src/ai/`, because it wires together three
 * lower-layer surfaces the orchestration layer must not know about:
 *
 *   - `useAiConversation()` state mutators (`appendMessage`/`recordToolResult`),
 *   - a `ProviderAdapter`'s `streamChat` async iterable, and
 *   - `routeToolCall` for executing query tools / staging mutation drafts.
 *
 * It never applies a mutation: mutation tool-call results flow through
 * `recordToolResult`, which stores their `draftCommands` in `pendingDraft`
 * for Task 10's `AiDraftDiffCard` to render and approve. Nothing here calls
 * `editorApi.applyAiCommands`.
 */

function createMessageId(): string {
	if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
		return crypto.randomUUID();
	}
	return `msg_${Date.now()}_${Math.random().toString(36).slice(2)}`;
}

function createSystemPromptMessage(): ConversationMessage {
	return {
		id: "system:editor-playground-ai",
		role: "system",
		content: AI_SYSTEM_PROMPT,
		createdAt: 0,
	};
}

const MAX_QUERY_TOOL_FOLLOW_UP_TURNS = 2;

export function buildAssistantRequestHistory(
	priorMessages: ConversationMessage[],
	userMessage: ConversationMessage,
	options: { contextMessages?: ConversationMessage[] } = {},
): ConversationMessage[] {
	return [
		createSystemPromptMessage(),
		...priorMessages,
		...(options.contextMessages ?? []),
		userMessage,
	];
}

function createAssistantMessage({
	content,
	toolCalls,
	respondingModelId,
	internal = false,
}: {
	content: string;
	toolCalls?: ToolCall[];
	respondingModelId?: string | null;
	internal?: boolean;
}): ConversationMessage {
	return {
		id: createMessageId(),
		role: "assistant",
		content,
		toolCalls: toolCalls && toolCalls.length > 0 ? toolCalls : undefined,
		respondingModelId: respondingModelId ?? undefined,
		internal,
		createdAt: Date.now(),
	};
}

export type RoutedAssistantToolCalls = {
	results: ToolResult[];
	toolResultMessages: ConversationMessage[];
	hasMutationDraft: boolean;
};

export function routeAssistantToolCalls(
	toolCalls: ToolCall[],
	context: { document: DocumentModel; editorState: EditorState },
): RoutedAssistantToolCalls {
	const results = toolCalls.map((toolCall) => routeToolCall(toolCall, context));
	return {
		results,
		toolResultMessages: results
			.map((result) => createToolResultMessage(result))
			.filter((message): message is ConversationMessage => message !== null),
		hasMutationDraft: results.some(
			(result) =>
				result.kind === "mutation" &&
				Boolean(result.draftCommands && result.draftCommands.length > 0),
		),
	};
}

type UseAiChatOptions = {
	conversation: AiConversationApi;
	buildAdapter:
		| ((modelId: string, adapterOptions?: OpenRouterAdapterOptions) => ProviderAdapter)
		| null;
	modelSelection: string;
	document: DocumentModel;
	editorState: EditorState;
	buildContextMessages?: (userText: string) => ConversationMessage[];
};

export type AssistantTurnHandlers = {
	onTextDelta: (accumulated: string) => void;
	onError: (message: string) => void;
};

export type AssistantTurnOutcome = {
	text: string;
	toolCalls: ToolCall[];
	error: string | null;
	resolvedModelId: string | null;
};

export type FallbackTurnOutcome = AssistantTurnOutcome & {
	respondingModelId: string | null;
};

/**
 * Pure, hook-free core of one assistant turn: consumes a `ProviderAdapter`'s
 * `streamChat` iterable, accumulating text and tool-call-complete events.
 * Extracted from {@link useAiChat} so the streaming loop is directly testable
 * against a mocked adapter in a `node` (no-jsdom) vitest environment, without
 * needing a React renderer. It performs no routing and touches no store — the
 * caller decides what to do with the returned text/tool calls.
 */
export async function runAssistantTurn(
	adapter: ProviderAdapter,
	history: ConversationMessage[],
	handlers: AssistantTurnHandlers,
	signal?: AbortSignal,
): Promise<AssistantTurnOutcome> {
	let text = "";
	let error: string | null = null;
	let resolvedModelId: string | null = null;
	const toolCalls: ToolCall[] = [];

	for await (const event of adapter.streamChat(history, AI_TOOL_MANIFEST, {
		signal,
	})) {
		switch (event.type) {
			case "text-delta":
				text += event.delta;
				handlers.onTextDelta(text);
				break;
			case "model-resolved":
				resolvedModelId = event.modelId;
				break;
			case "tool-call-complete":
				toolCalls.push(event.toolCall);
				break;
			case "error":
				error = event.message;
				handlers.onError(event.message);
				break;
			case "cancelled":
				error = "Request cancelled.";
				handlers.onError(error);
				break;
			default:
				break;
		}
	}

	return { text, toolCalls, error, resolvedModelId };
}

export function isRetryableStreamError(message: string): boolean {
	const normalized = message.toLowerCase();
	return (
		/\b(429|502|503|504)\b/.test(normalized) ||
		normalized.includes("rate limit") ||
		normalized.includes("rate-limit") ||
		normalized.includes("rate limited") ||
		normalized.includes("timeout") ||
		normalized.includes("timed out") ||
		normalized.includes("overload") ||
		normalized.includes("temporarily unavailable") ||
		normalized.includes("no provider available")
	);
}

export async function runAssistantTurnWithFallback(
	buildAdapter: (modelId: string) => ProviderAdapter,
	candidateModelIds: string[],
	history: ConversationMessage[],
	handlers: AssistantTurnHandlers,
	signal?: AbortSignal,
): Promise<FallbackTurnOutcome> {
	let lastTriedModelId: string | null = null;
	let lastRetryableOutcome: AssistantTurnOutcome | null = null;

	for (const candidateModelId of candidateModelIds) {
		lastTriedModelId = candidateModelId;
		let attemptError: string | null = null;
		const outcome = await runAssistantTurn(
			buildAdapter(candidateModelId),
			history,
			{
				onTextDelta: handlers.onTextDelta,
				onError: (message) => {
					attemptError = message;
				},
			},
			signal,
		);

		if (!outcome.error || !isRetryableStreamError(outcome.error) || signal?.aborted) {
			if (outcome.error) {
				handlers.onError(outcome.error);
			}
			return {
				...outcome,
				respondingModelId: outcome.resolvedModelId ?? candidateModelId,
			};
		}

		lastRetryableOutcome = outcome;
		if (candidateModelId !== candidateModelIds.at(-1)) {
			handlers.onTextDelta("");
		}

		if (attemptError && candidateModelId === candidateModelIds.at(-1)) {
			handlers.onError(attemptError);
		}
	}

	return {
		text: lastRetryableOutcome?.text ?? "",
		toolCalls: lastRetryableOutcome?.toolCalls ?? [],
		error: lastRetryableOutcome?.error ?? "No model candidates were available.",
		resolvedModelId: lastRetryableOutcome?.resolvedModelId ?? null,
		respondingModelId: lastRetryableOutcome?.resolvedModelId ?? lastTriedModelId,
	};
}

export type UseAiChatResult = {
	/** True while a `streamChat` request is in flight. */
	streaming: boolean;
	/** The assistant text accumulated so far in the in-flight turn (empty when idle). */
	streamingText: string;
	/** A transport/stream error surfaced from the last turn, if any. */
	streamError: string | null;
	/** Sends a user message and runs one assistant turn end-to-end. */
	sendMessage: (text: string) => Promise<void>;
	/** Cancels an in-flight request via the adapter's `AbortSignal`. */
	cancel: () => void;
};

export function useAiChat({
	conversation,
	buildAdapter,
	modelSelection,
	document,
	editorState,
	buildContextMessages,
}: UseAiChatOptions): UseAiChatResult {
	const [streaming, setStreaming] = useState(false);
	const [streamingText, setStreamingText] = useState("");
	const [streamError, setStreamError] = useState<string | null>(null);
	const abortRef = useRef<AbortController | null>(null);

	const cancel = useCallback(() => {
		abortRef.current?.abort();
	}, []);

	const sendMessage = useCallback(
		async (text: string) => {
			const trimmed = text.trim();
			if (!trimmed || !buildAdapter || streaming) {
				return;
			}

			setStreamError(null);
			setStreamingText("");

			const userMessage: ConversationMessage = {
				id: createMessageId(),
				role: "user",
				content: trimmed,
				createdAt: Date.now(),
			};
			conversation.appendMessage(userMessage);

			// The adapter reads prior turns from the store; include the just-sent
			// user message since `appendMessage`'s state update is async.
			const requestHistory = buildAssistantRequestHistory(
				conversation.messages,
				userMessage,
				{ contextMessages: buildContextMessages?.(trimmed) ?? [] },
			);

			const controller = new AbortController();
			abortRef.current = controller;
			setStreaming(true);

			let activeRequestHistory = requestHistory;
			let producedVisibleAssistantMessage = false;

			try {
				for (
					let followUpTurn = 0;
					followUpTurn <= MAX_QUERY_TOOL_FOLLOW_UP_TURNS;
					followUpTurn += 1
				) {
					const resolvedSelection = resolveModelSelection(modelSelection);
					const outcome =
						resolvedSelection.kind === "auto-fallback"
							? await runAssistantTurnWithFallback(
									buildAdapter,
									resolvedSelection.candidateModelIds,
									activeRequestHistory,
									{
										onTextDelta: setStreamingText,
										onError: setStreamError,
									},
									controller.signal,
								)
							: await (async (): Promise<FallbackTurnOutcome> => {
									const modelId = resolvedSelection.applyFloorSuffix
										? withFloorSuffix(resolvedSelection.modelId)
										: resolvedSelection.modelId;
									const singleOutcome = await runAssistantTurn(
										buildAdapter(modelId, resolvedSelection.adapterOptions),
										activeRequestHistory,
										{
											onTextDelta: setStreamingText,
											onError: setStreamError,
										},
										controller.signal,
									);
									return {
										...singleOutcome,
										respondingModelId: singleOutcome.resolvedModelId ?? modelId,
									};
								})();

					const routed = routeAssistantToolCalls(outcome.toolCalls, {
						document,
						editorState,
					});
					const hasToolResultsForFollowUp =
						routed.toolResultMessages.length > 0 && !routed.hasMutationDraft;
					const shouldFollowUp =
						hasToolResultsForFollowUp &&
						!outcome.error &&
						!controller.signal.aborted &&
						followUpTurn < MAX_QUERY_TOOL_FOLLOW_UP_TURNS;

					const providerAssistantMessage =
						outcome.text.length > 0 || outcome.toolCalls.length > 0
							? createAssistantMessage({
									content: outcome.text,
									toolCalls: outcome.toolCalls,
									respondingModelId: outcome.respondingModelId,
									internal: shouldFollowUp || hasToolResultsForFollowUp,
								})
							: null;

					if (providerAssistantMessage) {
						if (providerAssistantMessage.internal) {
							conversation.appendMessage(providerAssistantMessage);
						} else {
							conversation.appendMessage({
								...providerAssistantMessage,
								toolCalls: undefined,
							});
							producedVisibleAssistantMessage = true;
						}
					}

					for (const result of routed.results) {
						conversation.recordToolResult(result);
					}

					if (shouldFollowUp && providerAssistantMessage) {
						activeRequestHistory = [
							...activeRequestHistory,
							providerAssistantMessage,
							...routed.toolResultMessages,
						];
						setStreamingText("");
						continue;
					}

					if (
						hasToolResultsForFollowUp &&
						!routed.hasMutationDraft &&
						!producedVisibleAssistantMessage
					) {
						conversation.appendMessage(
							createAssistantMessage({
								content:
									"I gathered the document details, but I couldn't turn them into a clear final answer in this turn. Tell me whether you want a short summary or a specific edit.",
								respondingModelId: outcome.respondingModelId,
							}),
						);
						producedVisibleAssistantMessage = true;
					}

					break;
				}
			} catch (error) {
				setStreamError(error instanceof Error ? error.message : String(error));
			} finally {
				abortRef.current = null;
				setStreaming(false);
				setStreamingText("");
			}

		},
		[buildAdapter, buildContextMessages, conversation, document, editorState, modelSelection, streaming],
	);

	return { streaming, streamingText, streamError, sendMessage, cancel };
}
