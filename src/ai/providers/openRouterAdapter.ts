import type { AiToolDefinition } from '../../api/ai/types';
import type { ConversationMessage, ProviderAdapter, StreamEvent, ToolCall } from '../types/index';
import type {
  OpenRouterMessage,
  OpenRouterRequestToolCall,
  OpenRouterStreamChunk,
  OpenRouterToolDefinition,
  PendingToolCallAccumulator,
} from './types';

/**
 * The one v1 `ProviderAdapter` implementation, talking to OpenRouter's
 * OpenAI-compatible `/chat/completions` streaming endpoint directly from the
 * browser (client-direct-to-OpenRouter key model — see the plan's "Security
 * posture" section). No provider registry/plugin system: this is the only
 * implementation for v1.
 *
 * Named exports only.
 */

const OPENROUTER_CHAT_COMPLETIONS_URL = 'https://openrouter.ai/api/v1/chat/completions';
const CONNECTION_CHECK_MAX_TOKENS = 16;

export type OpenRouterAdapterOptions = {
  cacheSystemPrompt?: boolean;
  autoRouterCostQualityTradeoff?: number;
};

export type OpenRouterConnectionCheckResult =
  | { ok: true; modelId: string }
  | { ok: false; modelId: string; message: string };

/**
 * Creates a {@link ProviderAdapter} bound to a single OpenRouter API key, so
 * callers don't need to pass the key on every `streamChat` call. This is a
 * factory (not a class) to match the plain-object shape `ProviderAdapter`
 * already expects and to keep the key private to the closure rather than a
 * public instance field.
 */
export function createOpenRouterAdapter(
  apiKey: string,
  model: string,
  adapterOptions: OpenRouterAdapterOptions = {},
): ProviderAdapter {
  return {
    streamChat(messages, tools, options) {
      return streamChat(apiKey, model, messages, tools, adapterOptions, options);
    },
  };
}

export async function checkOpenRouterConnection(
  apiKey: string,
  model: string,
  options?: OpenRouterAdapterOptions & { signal?: AbortSignal },
): Promise<OpenRouterConnectionCheckResult> {
  try {
    const response = await fetch(OPENROUTER_CHAT_COMPLETIONS_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model,
        stream: false,
        max_tokens: CONNECTION_CHECK_MAX_TOKENS,
        messages: [{ role: 'user', content: 'Reply with OK only.' }],
        ...toOpenRouterRoutingOptions(options),
      }),
      signal: options?.signal,
    });

    if (!response.ok) {
      return { ok: false, modelId: model, message: await describeErrorResponse(response) };
    }

    return { ok: true, modelId: model };
  } catch (caughtError) {
    if (isAbortError(caughtError)) {
      return { ok: false, modelId: model, message: 'Connection check was cancelled.' };
    }
    return { ok: false, modelId: model, message: describeError(caughtError) };
  }
}

async function* streamChat(
  apiKey: string,
  model: string,
  messages: ConversationMessage[],
  tools: AiToolDefinition[],
  adapterOptions: OpenRouterAdapterOptions,
  options?: { signal?: AbortSignal },
): AsyncGenerator<StreamEvent> {
  let response: Response;
  try {
    response = await fetch(OPENROUTER_CHAT_COMPLETIONS_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model,
        stream: true,
        messages: messages.map((message, index) => toOpenRouterMessage(message, (adapterOptions.cacheSystemPrompt ?? false) && index === 0)),
        tools: tools.length > 0 ? tools.map(toOpenRouterTool) : undefined,
        ...toOpenRouterRoutingOptions(adapterOptions),
      }),
      signal: options?.signal,
    });
  } catch (caughtError) {
    if (isAbortError(caughtError)) {
      yield { type: 'cancelled' };
      return;
    }
    yield { type: 'error', message: describeError(caughtError) };
    return;
  }

  if (!response.ok) {
    yield { type: 'error', message: await describeErrorResponse(response) };
    return;
  }

  if (!response.body) {
    yield { type: 'error', message: 'OpenRouter response had no readable body.' };
    return;
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  const pendingToolCalls = new Map<number, PendingToolCallAccumulator>();
  let buffer = '';

  try {
    while (true) {
      if (options?.signal?.aborted) {
        yield { type: 'cancelled' };
        return;
      }

      let readResult: ReadableStreamReadResult<Uint8Array>;
      try {
        readResult = await reader.read();
      } catch (caughtError) {
        if (isAbortError(caughtError)) {
          yield { type: 'cancelled' };
          return;
        }
        throw caughtError;
      }

      const { done, value } = readResult;
      if (done) {
        break;
      }

      buffer += decoder.decode(value, { stream: true });
      const events = buffer.split('\n\n');
      // The last split segment may be an incomplete event; keep it buffered.
      buffer = events.pop() ?? '';

      for (const rawEvent of events) {
        const outcome = processSseEvent(rawEvent, pendingToolCalls);
        for (const event of outcome.events) {
          yield event;
        }
        if (outcome.done) {
          return;
        }
      }
    }

    // Process anything left in the buffer once the stream has closed. This
    // covers both a trailing `[DONE]` event with no final `\n\n` and a
    // stream that closed without ever sending an explicit `[DONE]` marker.
    const outcome = processSseEvent(buffer, pendingToolCalls);
    for (const event of outcome.events) {
      yield event;
    }
    if (outcome.done) {
      return;
    }

    for (const event of flushIncompleteToolCalls(pendingToolCalls)) {
      yield event;
    }
    yield { type: 'message-complete' };
  } catch (caughtError) {
    if (isAbortError(caughtError)) {
      yield { type: 'cancelled' };
      return;
    }
    yield { type: 'error', message: describeError(caughtError) };
  } finally {
    reader.releaseLock?.();
  }
}

/**
 * Parses one `\n\n`-delimited SSE event block (which may contain one or more
 * `data: ...` lines, though OpenRouter/OpenAI streams send one per block) and
 * translates it into zero or more {@link StreamEvent}s.
 *
 * Returns `done: true` once a `[DONE]` marker is seen, signalling the caller
 * to stop reading and emit `message-complete`.
 */
function processSseEvent(
  rawEvent: string,
  pendingToolCalls: Map<number, PendingToolCallAccumulator>,
): { events: StreamEvent[]; done: boolean } {
  const events: StreamEvent[] = [];

  for (const line of rawEvent.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed.startsWith('data:')) {
      continue;
    }

    const payload = trimmed.slice('data:'.length).trim();
    if (payload.length === 0) {
      continue;
    }

    if (payload === '[DONE]') {
      events.push(...flushIncompleteToolCalls(pendingToolCalls));
      events.push({ type: 'message-complete' });
      return { events, done: true };
    }

    let chunk: OpenRouterStreamChunk;
    try {
      chunk = JSON.parse(payload) as OpenRouterStreamChunk;
    } catch {
      events.push({ type: 'error', message: `Failed to parse OpenRouter stream chunk: ${payload}` });
      continue;
    }

    if (chunk.error?.message) {
      events.push({ type: 'error', message: chunk.error.message });
      continue;
    }

    if (chunk.model) {
      events.push({ type: 'model-resolved', modelId: chunk.model });
    }

    const choice = chunk.choices?.[0];
    if (!choice) {
      continue;
    }

    if (typeof choice.delta?.content === 'string' && choice.delta.content.length > 0) {
      events.push({ type: 'text-delta', delta: choice.delta.content });
    }

    if (choice.delta?.tool_calls) {
      for (const toolCallDelta of choice.delta.tool_calls) {
        events.push(...applyToolCallDelta(toolCallDelta, pendingToolCalls));
      }
    }

    if (choice.finish_reason) {
      // A tool-call turn ends with finish_reason 'tool_calls' (or a provider
      // equivalent) rather than a `[DONE]` marker arriving mid-batch — flush
      // any tool calls that were still accumulating so `tool-call-complete`
      // is emitted before the stream naturally continues to `[DONE]`.
      events.push(...flushIncompleteToolCalls(pendingToolCalls));
    }
  }

  return { events, done: false };
}

/**
 * Accumulates one streamed tool-call fragment. OpenAI-compatible streaming
 * sends the function `name` (and call `id`) once, on the first delta for a
 * given `index`, then streams `arguments` as string fragments across
 * subsequent deltas keyed by that same `index`. This emits `tool-call-start`
 * the first time an index is seen and `tool-call-delta` for every fragment
 * (including the first, if it already carries an `arguments` fragment).
 */
function applyToolCallDelta(
  toolCallDelta: { index: number; id?: string; function?: { name?: string; arguments?: string } },
  pendingToolCalls: Map<number, PendingToolCallAccumulator>,
): StreamEvent[] {
  const events: StreamEvent[] = [];
  const { index } = toolCallDelta;

  let accumulator = pendingToolCalls.get(index);
  if (!accumulator) {
    accumulator = {
      toolCallId: toolCallDelta.id ?? `tool-call-${index}`,
      name: toolCallDelta.function?.name ?? '',
      argumentsText: '',
      startEmitted: false,
    };
    pendingToolCalls.set(index, accumulator);
  } else {
    // Some providers only send `id`/`name` on the very first fragment, but
    // guard against a late-arriving id/name overwrite being empty.
    if (toolCallDelta.id) {
      accumulator.toolCallId = toolCallDelta.id;
    }
    if (toolCallDelta.function?.name) {
      accumulator.name = toolCallDelta.function.name;
    }
  }

  if (!accumulator.startEmitted && accumulator.name) {
    events.push({ type: 'tool-call-start', toolCallId: accumulator.toolCallId, name: accumulator.name });
    accumulator.startEmitted = true;
  }

  const argumentsFragment = toolCallDelta.function?.arguments;
  if (argumentsFragment) {
    accumulator.argumentsText += argumentsFragment;
    if (accumulator.startEmitted) {
      events.push({
        type: 'tool-call-delta',
        toolCallId: accumulator.toolCallId,
        argumentsDelta: argumentsFragment,
      });
    }
  }

  return events;
}

/**
 * Emits `tool-call-complete` for every tool call still accumulating, parsing
 * their accumulated `arguments` JSON text. Called once a `finish_reason` or
 * `[DONE]`/stream-end signal indicates no further deltas will arrive. Clears
 * `pendingToolCalls` so a subsequent call is a no-op.
 */
function flushIncompleteToolCalls(pendingToolCalls: Map<number, PendingToolCallAccumulator>): StreamEvent[] {
  const events: StreamEvent[] = [];

  for (const accumulator of pendingToolCalls.values()) {
    if (!accumulator.startEmitted) {
      // Never got a name; nothing meaningful to complete.
      continue;
    }
    const toolCall: ToolCall = {
      id: accumulator.toolCallId,
      name: accumulator.name,
      arguments: parseToolCallArguments(accumulator.argumentsText),
    };
    events.push({ type: 'tool-call-complete', toolCall });
  }

  pendingToolCalls.clear();
  return events;
}

function parseToolCallArguments(argumentsText: string): Record<string, unknown> {
  if (argumentsText.trim().length === 0) {
    return {};
  }
  try {
    const parsed = JSON.parse(argumentsText);
    return typeof parsed === 'object' && parsed !== null ? (parsed as Record<string, unknown>) : {};
  } catch {
    return {};
  }
}

function toOpenRouterMessage(message: ConversationMessage, applyCacheControl: boolean): OpenRouterMessage {
  const base: OpenRouterMessage = {
    role: message.role,
    content:
      applyCacheControl && message.role === 'system'
        ? [{ type: 'text', text: message.content, cache_control: { type: 'ephemeral' } }]
        : message.content,
  };

  if (message.role === 'tool' && message.toolCallId) {
    base.tool_call_id = message.toolCallId;
  }

  if (message.role === 'assistant' && message.toolCalls && message.toolCalls.length > 0) {
    base.tool_calls = message.toolCalls.map(toOpenRouterRequestToolCall);
  }

  return base;
}

function toOpenRouterRequestToolCall(toolCall: ToolCall): OpenRouterRequestToolCall {
  return {
    id: toolCall.id,
    type: 'function',
    function: {
      name: toolCall.name,
      arguments: JSON.stringify(toolCall.arguments),
    },
  };
}

function toOpenRouterTool(tool: AiToolDefinition): OpenRouterToolDefinition {
  return {
    type: 'function',
    function: {
      name: tool.name,
      description: tool.description,
      parameters: tool.parameters,
    },
  };
}

function toOpenRouterRoutingOptions(options: OpenRouterAdapterOptions = {}): { plugins?: Array<Record<string, unknown>> } {
  if (typeof options.autoRouterCostQualityTradeoff !== 'number') {
    return {};
  }
  return {
    plugins: [
      {
        id: 'auto-router',
        cost_quality_tradeoff: options.autoRouterCostQualityTradeoff,
      },
    ],
  };
}

async function describeErrorResponse(response: Response): Promise<string> {
  let bodyText = '';
  try {
    bodyText = await response.text();
  } catch {
    // Ignore; fall back to status-only message below.
  }

  const parsedMessage = extractErrorMessage(bodyText);
  const suffix = parsedMessage ? `: ${parsedMessage}` : bodyText ? `: ${bodyText}` : '';

  if (response.status === 401) {
    return `OpenRouter rejected the request (401 Unauthorized) — check that the API key is present and valid${suffix}`;
  }
  if (response.status === 402) {
    return `OpenRouter rejected the request (402 Payment Required) — check that the selected model is allowed by your OpenRouter account or switch to a free/cheaper model${suffix}`;
  }
  if (response.status === 429 || response.status === 439) {
    return `OpenRouter or the upstream provider is currently rate-limiting this model (${response.status} ${response.statusText})${suffix}`;
  }
  return `OpenRouter request failed with status ${response.status} ${response.statusText}${suffix}`;
}

function extractErrorMessage(bodyText: string): string | undefined {
  if (!bodyText) {
    return undefined;
  }
  try {
    const parsed = JSON.parse(bodyText) as { error?: { message?: string } };
    return parsed.error?.message;
  } catch {
    return undefined;
  }
}

function describeError(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  return String(error);
}

function isAbortError(error: unknown): boolean {
  return error instanceof DOMException && error.name === 'AbortError';
}
