import type { AiDocumentCommand, AiToolDefinition } from '../../api/ai/types';

/**
 * Orchestration-layer types for the conversational AI interface. This module
 * lives in `src/ai/` (sibling to `src/api/`), the routing/conversation layer
 * that holds conversation state and routing logic — never `DocumentModel`
 * mutation logic. It is allowed to *read* API-layer types (like
 * `AiDocumentCommand`) but must never import from `src/app` (the dispatcher).
 *
 * Named exports only.
 */

/**
 * A model's request to invoke a tool (query or mutation), before it has been
 * routed or validated. The router that consumes this is Task 7 —
 * this file only defines the shape.
 */
export type ToolCall = {
  id: string;
  name: string;
  arguments: Record<string, unknown>;
};

/**
 * The outcome of routing a {@link ToolCall}.
 *
 * - For a `query` tool, `queryData` carries the read-only projection result.
 * - For a `mutation` tool, `draftCommands` carries a *staged draft* — commands
 *   that have been validated but NOT applied. Nothing mutates the document
 *   until the human user explicitly approves.
 */
export type ToolResult = {
  toolCallId: string;
  kind: 'query' | 'mutation';
  queryData?: unknown;
  draftCommands?: AiDocumentCommand[];
};

/**
 * A single chat message in a conversation.
 *
 * - `role: 'tool'` messages carry the result of a tool call and reference the
 *   originating call via `toolCallId`.
 * - `role: 'assistant'` messages may carry `toolCalls` the model requested.
 */
export type ConversationMessage = {
  id: string;
  role: 'user' | 'assistant' | 'system' | 'tool';
  content: string;
  toolCalls?: ToolCall[];
  toolCallId?: string;
  createdAt: number;
};

/**
 * A mutation proposal awaiting explicit user approval.
 *
 * NOTE ON STALENESS: this type intentionally does not solve stale-draft
 * detection itself. `applyAiDocumentCommands` (Task 3) re-validates every
 * command against the *current* document at apply time and rejects the whole
 * batch all-or-nothing if anything has drifted. `createdAgainstDocumentVersion`
 * is a purely informational record of the document version the draft was
 * generated against — it is not the enforcement mechanism.
 */
export type DraftBatch = {
  id: string;
  commands: AiDocumentCommand[];
  createdAgainstDocumentVersion?: string;
};

/**
 * Closed discriminated union of events a chat UI needs to render a streaming
 * assistant response. The `'cancelled'` variant exists because Task 8's
 * provider adapter supports request cancellation via `AbortSignal`.
 */
export type StreamEvent =
  | { type: 'text-delta'; delta: string }
  | { type: 'tool-call-start'; toolCallId: string; name: string }
  | { type: 'tool-call-delta'; toolCallId: string; argumentsDelta: string }
  | { type: 'tool-call-complete'; toolCall: ToolCall }
  | { type: 'message-complete' }
  | { type: 'error'; message: string }
  | { type: 'cancelled' };

/**
 * The contract a model provider (Task 8: OpenRouter) must satisfy. This file
 * only defines the interface; implementations live under `src/ai/providers/`.
 */
export type ProviderAdapter = {
  streamChat(
    messages: ConversationMessage[],
    tools: AiToolDefinition[],
    options?: { signal?: AbortSignal },
  ): AsyncIterable<StreamEvent>;
};
