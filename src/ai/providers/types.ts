import type { ToolCall } from '../types/index';

/**
 * OpenRouter-wire-format types for the chat completions endpoint. These are
 * intentionally kept out of `src/ai/types/index.ts` (the shared
 * orchestration-layer surface) because they describe OpenRouter's specific
 * OpenAI-compatible request/response JSON shape, not a concept the rest of
 * `src/ai/` needs to know about. Only `openRouterAdapter.ts` should import
 * from this file.
 *
 * `ProviderAdapter` itself (the interface `openRouterAdapter.ts` implements)
 * is not re-exported here — it is already directly usable from
 * `src/ai/types/index.ts` and a pass-through re-export would add an import
 * hop with no benefit.
 *
 * Named exports only.
 */

/** OpenAI-compatible message shape sent in the `messages` array. */
export type OpenRouterMessage = {
  role: 'user' | 'assistant' | 'system' | 'tool';
  content: string;
  tool_calls?: OpenRouterRequestToolCall[];
  tool_call_id?: string;
};

/** OpenAI-compatible tool-call shape as sent back on an assistant message. */
export type OpenRouterRequestToolCall = {
  id: string;
  type: 'function';
  function: {
    name: string;
    arguments: string;
  };
};

/** OpenAI-compatible function/tool schema object sent in the `tools` array. */
export type OpenRouterToolDefinition = {
  type: 'function';
  function: {
    name: string;
    description: string;
    parameters: Record<string, unknown>;
  };
};

/** A single streamed tool-call delta fragment, keyed by its `index`. */
export type OpenRouterStreamToolCallDelta = {
  index: number;
  id?: string;
  type?: 'function';
  function?: {
    name?: string;
    arguments?: string;
  };
};

/** A single `data: {...}` chunk of an OpenRouter/OpenAI-compatible SSE stream. */
export type OpenRouterStreamChunk = {
  choices?: Array<{
    delta?: {
      content?: string | null;
      tool_calls?: OpenRouterStreamToolCallDelta[];
    };
    finish_reason?: string | null;
  }>;
  error?: {
    message?: string;
  };
};

/**
 * In-progress accumulation state for a single streamed tool call, keyed by
 * the stream's `index` until the tool call's real `id`/`name` arrive.
 */
export type PendingToolCallAccumulator = {
  toolCallId: string;
  name: string;
  argumentsText: string;
  startEmitted: boolean;
};

/** Narrow helper alias so adapter code can reference the shared `ToolCall` type. */
export type { ToolCall };
